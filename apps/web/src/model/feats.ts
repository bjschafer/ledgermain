/**
 * Pure feat-related computations and transitions. No DOM, no React — testable as
 * plain functions.
 *
 * Expected feat count formula (PF1 CRB):
 *   1 at character level 1
 *   + 1 per odd character level beyond 1 (i.e. at levels 3, 5, 7, ...)
 *   + 1 if the character's race is Human (bonus feat at 1st level)
 *   + Class bonus feats: every granted, resolved class feature whose `changes`
 *     include a `target === "bonusFeats"` entry contributes its evaluated
 *     formula value (e.g. Fighter's "1 + floor(@class.unlevel / 2)", Wizard's
 *     "floor(@class.unlevel / 5)" Arcane School feats, Sorcerer's
 *     "floor((@class.unlevel - 1) / 6)" bloodline feats — plus any other
 *     vendored class features that grant a bonus feat slot).
 *
 * Fixed feat grants vs. bonus feat SLOTS: a `bonusFeats` feature whose name
 * matches a real feat in RefData (Wizard's "Scribe Scroll", Sorcerer's
 * "Eschew Materials") is a *specific* feat the class hands the character —
 * not a free slot the player fills. Those are surfaced via `grantedFeats()`
 * (the UI shows them as read-only "granted" entries) and are EXCLUDED from
 * the expected-count budget; features with no matching feat name ("Bonus
 * Feats (FGT)", "Bloodline Feat (SOR)") remain player-choice slots counted
 * by `expectedFeatCount`.
 *
 * Only "Human" by race name grants the racial bonus feat here. Half-Elves receive
 * Skill Focus as a specific racial feat (Adaptability), which is not a free feat
 * selection, so they are not counted. Half-Orcs have no bonus feat trait.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";
import {
  FEAT_EFFECTS,
  buildRollData,
  featNameSlug,
  tryEvaluateFormula,
  type ChoiceFeatEntry,
  type RollData,
} from "@pf1/engine";

import { SKILL_NAMES } from "./names.js";

/** Total character level (sum of all class levels). */
function totalLevel(doc: CharacterDoc): number {
  return doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
}

/** feat name (lowercased, trimmed) -> feat id, for fixed-grant detection. */
function featIdByName(refData: RefData): Map<string, string> {
  const map = new Map<string, string>();
  for (const feat of Object.values(refData.feats)) {
    map.set(feat.name.trim().toLowerCase(), feat.id);
  }
  return map;
}

/** A specific feat handed to the character by a class feature (no slot used). */
export interface GrantedFeat {
  /** Id into RefData.feats. */
  featId: string;
  featName: string;
  /** Class that granted it (tag) and the granting feature's name, for display. */
  classTag: string;
  featureName: string;
}

/**
 * Specific feats granted outright by class features: any granted, resolved
 * feature carrying a `bonusFeats` change whose *name* matches a feat in
 * RefData (Wizard "Scribe Scroll", Sorcerer "Eschew Materials"). These are
 * auto-applied — the player never spends a slot or adds them manually.
 * Deduped by feat id (first grant wins).
 */
export function grantedFeats(doc: CharacterDoc, refData: RefData): GrantedFeat[] {
  const byName = featIdByName(refData);
  const out: GrantedFeat[] = [];
  const seen = new Set<string>();
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      if (!(feature.changes ?? []).some((ch) => ch.target === "bonusFeats")) continue;
      const featId = byName.get(feature.name.trim().toLowerCase());
      if (!featId || seen.has(featId)) continue;
      seen.add(featId);
      out.push({ featId, featName: feature.name, classTag: cls.tag, featureName: feature.name });
    }
  }
  return out;
}

/**
 * Sum of "bonusFeats"-targeting changes from every granted, resolved class
 * feature across all of the character's classes — free SLOTS only: features
 * that are fixed feat grants (name matches a feat; see `grantedFeats`) are
 * skipped, since the specific feat is auto-applied rather than budgeted.
 * Mirrors the granted-feature walk in `collect.ts`: each class feature's
 * formula is evaluated with `@class.unlevel`/`@class.level` bound to *that*
 * class's level.
 */
function classBonusFeats(doc: CharacterDoc, refData: RefData): number {
  const rollData = buildRollData(doc, refData);
  const byName = featIdByName(refData);
  let total = 0;
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    const featureRollData: RollData = {
      ...rollData,
      class: { level: cls.level, unlevel: cls.level },
    };
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      // Fixed feat grant, not a slot — handled by grantedFeats().
      if (byName.has(feature.name.trim().toLowerCase())) continue;
      for (const ch of feature.changes ?? []) {
        if (ch.target !== "bonusFeats") continue;
        let value: number | null;
        try {
          value = tryEvaluateFormula(ch.formula, featureRollData);
        } catch {
          continue;
        }
        if (value === null || Number.isNaN(value)) continue;
        total += Math.trunc(value);
      }
    }
  }
  return Math.max(0, total);
}

/**
 * The number of feats a character is expected to have, given their level,
 * race, and class composition.
 */
export function expectedFeatCount(doc: CharacterDoc, refData: RefData): number {
  const charLevel = totalLevel(doc);
  if (charLevel <= 0) return 0;

  // 1 feat at level 1, then +1 every odd level (3, 5, 7, …).
  // Equivalently: ceil(charLevel / 2).
  const baseFeatCount = Math.ceil(charLevel / 2);

  // +1 bonus feat for Human race.
  const race = refData.races[doc.identity.race];
  const humanBonus = race?.name === "Human" ? 1 : 0;

  // Class bonus feats (Fighter combat feats, Wizard Arcane School feats,
  // Sorcerer bloodline feats, etc.) — see classBonusFeats() doc comment.
  const classBonus = classBonusFeats(doc, refData);

  // GM/homebrew addend (see build.gmGrants). Omitted/absent = 0; may be
  // negative (a GM can claw back slots). Added after rules-derived totals so
  // the over-budget check in the builder sees the loosened budget.
  return (
    baseFeatCount + humanBonus + classBonus + (doc.build.gmGrants?.featSlots ?? 0)
  );
}

/** The number of feats the character has currently chosen. */
export function chosenFeatCount(doc: CharacterDoc): number {
  return doc.build.feats.length;
}

/**
 * Chosen feats that count against the slot budget: manually-added duplicates
 * of class-granted feats (e.g. a wizard who added Scribe Scroll by hand before
 * auto-granting existed) are excluded, so they never eat a slot. Compare this
 * — not `chosenFeatCount` — against `expectedFeatCount`.
 */
export function chosenFeatCountExcludingGranted(
  doc: CharacterDoc,
  refData: RefData,
): number {
  const granted = new Set(grantedFeats(doc, refData).map((g) => g.featId));
  return doc.build.feats.filter((id) => !granted.has(id)).length;
}

/**
 * Set or clear the player's choice for a choice-based feat.
 * Pass `null` to clear the choice (e.g. resetting after a mistake).
 * Does not validate that `featId` is present in `doc.build.feats`.
 */
export function setFeatChoice(
  doc: CharacterDoc,
  featId: string,
  choiceId: string | null,
): CharacterDoc {
  const current = doc.build.featChoices ?? {};
  let next: Record<string, string>;
  if (choiceId === null) {
    next = { ...current };
    delete next[featId];
  } else {
    next = { ...current, [featId]: choiceId };
  }
  return { ...doc, build: { ...doc.build, featChoices: next } };
}

/**
 * Returns the choice descriptor for the feat with the given name slug, or `null`
 * if the feat has no player choice (i.e. it is static or not in FEAT_EFFECTS).
 * The descriptor drives the UI picker rendered in FeatsSection.
 */
export function featChoiceDescriptor(
  featName: string,
): ChoiceFeatEntry["choice"] | null {
  const entry = FEAT_EFFECTS[featNameSlug(featName)];
  if (!entry || entry.type !== "choice") return null;
  return entry.choice;
}

/**
 * Returns the list of selectable options for a given choice type.
 *
 * - "skill": the full skill list sorted alphabetically by display name.
 *   `refData` and `doc` are unused; the list is static.
 * - "weapon": the distinct non-empty `group` labels present on `doc.build.weapons`,
 *   sorted alphabetically. Returns empty when `doc` is not provided or the character
 *   has no weapons with a group set — the UI renders a soft hint in that case.
 */
export function featChoiceOptions(
  choiceType: string,
  _refData: RefData,
  doc?: CharacterDoc,
): { id: string; name: string }[] {
  if (choiceType === "skill") {
    return Object.entries(SKILL_NAMES)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  if (choiceType === "weapon" && doc) {
    const seen = new Set<string>();
    for (const w of doc.build.weapons ?? []) {
      if (w.group) seen.add(w.group);
    }
    return [...seen]
      .sort()
      .map((g) => ({ id: g, name: g }));
  }
  return [];
}
