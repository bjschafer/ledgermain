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
 * by `expectedFeatCount`. Some class features are named DIFFERENTLY than the
 * specific feat they grant (Monk's "Unarmed Strike" grants "Improved Unarmed
 * Strike" — see `FEATURE_NAME_OVERRIDES` below); those are resolved through
 * the override map before the by-name lookup.
 *
 * Only "Human" by race name grants the racial bonus feat here. Half-Elves receive
 * Skill Focus as a specific racial feat (Adaptability), which is not a free feat
 * selection, so they are not counted. Half-Orcs have no bonus feat trait.
 */

import type { CharacterDoc, Feat, RefData } from "@pf1/schema";
import {
  activeArchetypeSwaps,
  buildRollData,
  featNameSlug,
  resolveArchetypeFeatureEffect,
  resolveFeatEffect,
  tryEvaluateFormula,
  type RollData,
} from "@pf1/engine";

import { SKILL_NAMES } from "./names.js";
import { effectiveCombatStyleId } from "./ranger.js";
import { suppressedRaceTargets } from "./racialTraits.js";

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

/**
 * Class feature name (lowercased, trimmed) -> the actual granted feat's name
 * (lowercased, trimmed), for the handful of cases where Foundry names the
 * class feature differently than the specific feat it auto-grants. Monk's
 * "Unarmed Strike" class feature carries a vendored `{formula: "1", target:
 * "bonusFeats", type: "untyped"}` change representing the automatic grant of
 * "Improved Unarmed Strike" (confirmed via the class feature's description
 * text and the vendored `links.supplements` UUID pointing at that feat) —
 * but "unarmed strike" doesn't match "improved unarmed strike" by name, so
 * without this override it falls through to being counted as a floating
 * bonus-feat slot instead of the specific fixed grant it actually is.
 */
const FEATURE_NAME_OVERRIDES: Record<string, string> = {
  "unarmed strike": "improved unarmed strike",
};

/** The feat name (lowercased, trimmed) a class feature name resolves to. */
function resolvedFeatureName(featureName: string): string {
  const key = featureName.trim().toLowerCase();
  return FEATURE_NAME_OVERRIDES[key] ?? key;
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
  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  const out: GrantedFeat[] = [];
  const seen = new Set<string>();
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      // Swapped out by an active archetype — no longer granted (mirrors collect.ts).
      if (archetypeSwaps.has(grant.uuid)) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      if (!(feature.changes ?? []).some((ch) => ch.target === "bonusFeats")) continue;
      const featId = byName.get(resolvedFeatureName(feature.name));
      if (!featId || seen.has(featId)) continue;
      seen.add(featId);
      const featName = refData.feats[featId]?.name ?? feature.name;
      out.push({ featId, featName, classTag: cls.tag, featureName: feature.name });
    }
  }
  return out;
}

/**
 * A typed restriction on which feats may fill a class-granted bonus-feat
 * slot (issue #54: Fighter combat feats, Wizard metamagic/item creation/Spell
 * Mastery, etc; issue #57: Ranger combat style / Sorcerer bloodline / Monk
 * limited lists). `"generic"` means unrestricted — the pre-#54 behavior, and
 * the fallback for any `bonusFeats`-granting feature this module doesn't yet
 * recognize (never regresses an unrecognized feature to *zero* slots).
 */
export type FeatSlotType =
  | { kind: "generic" }
  | { kind: "combat" }
  | { kind: "wizardBonus" }
  | { kind: "magusBonus" }
  | { kind: "combatStyle"; style: string }
  | { kind: "bloodline"; bloodline: string }
  | { kind: "monkList" };

export const GENERIC_SLOT: FeatSlotType = { kind: "generic" };

/** A typed, class-granted bonus-feat slot contribution — see `classBonusFeatSlots`. */
export interface ClassFeatSlot {
  type: FeatSlotType;
  count: number;
  /** Display source, e.g. "Fighter", "Ranger combat style". */
  source: string;
}

/**
 * Base-class `bonusFeats`-granting feature name (trimmed/lowercased) -> the
 * slot type its free slots restrict to (issue #54), plus a display source
 * label. Ranger's combat style and Sorcerer's bloodline resolve against the
 * character's own choice (`doc.build.combatStyle` / `sorcererBloodline`);
 * absent either choice, the slots stay generic (unrestricted) rather than
 * inventing a restriction the player hasn't picked yet.
 */
function baseFeatureSlotType(
  featureName: string,
  doc: CharacterDoc,
): { type: FeatSlotType; source: string } {
  switch (featureName) {
    case "bonus feats (fgt)":
      return { type: { kind: "combat" }, source: "Fighter" };
    case "bonus feats (wiz)":
      return { type: { kind: "wizardBonus" }, source: "Wizard" };
    case "bonus feats (mag)":
      return { type: { kind: "magusBonus" }, source: "Magus" };
    case "bonus feat (mnk)":
      return { type: { kind: "monkList" }, source: "Monk" };
    case "bloodline feat (sor)": {
      const bloodline = doc.build.sorcererBloodline;
      return bloodline
        ? { type: { kind: "bloodline", bloodline }, source: "Sorcerer bloodline" }
        : { type: GENERIC_SLOT, source: "Sorcerer bloodline (choose a bloodline to restrict)" };
    }
    case "combat style feat": {
      // `effectiveCombatStyleId` (not the raw `doc.build.combatStyle` field)
      // so an archetype-locked style is honored even if the stored field is
      // stale — see `rangerStyleRestriction` (issue #59). In practice this
      // base-feature case is only reached for a ranger with NO style-locking
      // archetype: every archetype in `RANGER_ARCHETYPE_STYLE_RULES` that
      // locks or suppresses the style also reflavors this exact class
      // feature, which suppresses its base grant via the normal
      // paired-swap mechanism (`activeArchetypeSwaps`) before this function
      // ever runs.
      const style = effectiveCombatStyleId(doc);
      return style
        ? { type: { kind: "combatStyle", style }, source: "Ranger combat style" }
        : { type: GENERIC_SLOT, source: "Ranger combat style (choose a style to restrict)" };
    }
    default:
      return { type: GENERIC_SLOT, source: "Class bonus feat" };
  }
}

/**
 * Hand-authored archetype-feature-id (`ArchetypeFeature.id`) -> slot type for
 * the archetype-granted `bonusFeats` reflavors in `ARCHETYPE_FEATURE_EFFECTS`
 * (`archetype-effects.ts`) that this module can type more precisely than
 * "generic". Each ranger combat-style archetype here is locked to one exact
 * style (issue #59 — see `RANGER_ARCHETYPE_STYLE_RULES` in `model/ranger.ts`
 * for the authoritative rule each of these mirrors, and `@pf1/engine`
 * `ranger.ts`'s `COMBAT_STYLES` for the "elemental"/"aquatic-prowess"
 * archetype-exclusive style trees authored for Elemental Envoy/Wave Warden).
 * Crusader's restricted armor/shield/weapon list is approximated with the
 * broad `combat` type (unrelated to ranger styles).
 *
 * NOT listed here (by design, not oversight):
 *  - `ranger:toxophilite:combat-style-feat:2` — Toxophilite offers a real
 *    choice between two styles (archery or crossbow), so it can't be a
 *    static entry; see `toxophiliteSlotType` below, consulted first in the
 *    walk.
 *  - Trophy Hunter / Poison Darter — both fully replace the combat-style
 *    bonus-feat mechanism with an unrelated subsystem (gunslinger grit/deeds,
 *    rogue talents/alchemist discoveries) this project doesn't model as a
 *    feat list; their `bonusFeats` grant (if `archetype-effects.ts` models
 *    one) correctly falls back to `GENERIC_SLOT`, matching
 *    `RANGER_ARCHETYPE_STYLE_RULES`'s `suppressed` rule for them.
 *  - Sword-Devil's "Second Combat Style" (11th level) — additive, not
 *    restrictive (see `model/ranger.ts` doc comment); out of scope.
 *
 * Any archetype `bonusFeats` grant NOT listed here (and not resolved by
 * `toxophiliteSlotType`) falls back to `GENERIC_SLOT` in the walk below.
 */
const ARCHETYPE_SLOT_TYPES: Readonly<Record<string, { type: FeatSlotType; source: string }>> = {
  "ranger:bow-nomad:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "archery" },
    source: "Bow Nomad (archery)",
  },
  "ranger:hooded-champion:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "archery" },
    source: "Hooded Champion (archery)",
  },
  "ranger:horse-lord:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "mounted-combat" },
    source: "Horse Lord (mounted combat)",
  },
  "ranger:ilsurian-archer:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "archery" },
    source: "Ilsurian Archer (archery)",
  },
  "ranger:shapeshifter:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "natural-weapon" },
    source: "Shapeshifter (natural weapon)",
  },
  "ranger:stormwalker:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "archery" },
    source: "Stormwalker (archery)",
  },
  "ranger:elemental-envoy:combat-style-feat:2": {
    type: { kind: "combatStyle", style: "elemental" },
    source: "Elemental Envoy (elemental)",
  },
  "ranger:wave-warden:aquatic-prowess-feat:2": {
    type: { kind: "combatStyle", style: "aquatic-prowess" },
    source: "Wave Warden (aquatic prowess)",
  },
  "cleric:crusader:bonus-feat:1": {
    type: { kind: "combat" },
    source: "Crusader (armor/shield/weapon list)",
  },
};

/**
 * Toxophilite's slot type follows the player's own `doc.build.combatStyle`
 * pick (narrowed to `archery`/`crossbow` by `RangerPicker` — issue #59)
 * rather than a static constant, since the archetype offers a real choice
 * between the two rather than locking to one. Returns `undefined` (falling
 * back to `GENERIC_SLOT` in the walk below) for any other feature id, or
 * when the stored style isn't one of the two allowed ids yet.
 */
function toxophiliteSlotType(
  featureId: string,
  doc: CharacterDoc,
): { type: FeatSlotType; source: string } | undefined {
  if (featureId !== "ranger:toxophilite:combat-style-feat:2") return undefined;
  const styleId = doc.build.combatStyle;
  if (styleId !== "archery" && styleId !== "crossbow") return undefined;
  return { type: { kind: "combatStyle", style: styleId }, source: `Toxophilite (${styleId})` };
}

/**
 * Typed decomposition of every "bonusFeats"-targeting change from the
 * character's granted, resolved class features (and archetype reflavors) —
 * the free SLOTS a class hands out (issue #54/#57). Fixed feat grants (name
 * matches a feat; see `grantedFeats`) are skipped, since the specific feat is
 * auto-applied rather than budgeted. Mirrors the granted-feature walk in
 * `collect.ts`: each class feature's formula is evaluated with
 * `@class.unlevel`/`@class.level` bound to *that* class's level.
 *
 * Archetype-aware (issue #40), matching `collect.ts`'s two adjustments:
 *   1. A base-class feature swapped out by an active archetype (e.g. a ranger
 *      archetype that trades Combat Style Feat for a companion) no longer
 *      contributes its `bonusFeats` slots — the swap is gated on the
 *      character's current level in that class via `activeArchetypeSwaps`.
 *   2. Archetype features carrying a hand-authored `bonusFeats` effect in
 *      `ARCHETYPE_FEATURE_EFFECTS` (e.g. the six ranger combat-style reflavors
 *      that re-grant an identical count) DO contribute — so an archetype that
 *      replaces a slot-granting feature with an equivalent one nets zero, and
 *      one that replaces it with nothing correctly loses the slots.
 *
 * `classBonusFeats` (the plain count used by `expectedFeatCount`) is just the
 * sum of this list's `count`s, clamped to zero.
 */
export function classBonusFeatSlots(doc: CharacterDoc, refData: RefData): ClassFeatSlot[] {
  const rollData = buildRollData(doc, refData);
  const byName = featIdByName(refData);
  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  const out: ClassFeatSlot[] = [];

  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    const featureRollData: RollData = {
      ...rollData,
      class: { level: cls.level, unlevel: cls.level },
    };
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      // Swapped out by an active archetype — its slots no longer count.
      if (archetypeSwaps.has(grant.uuid)) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      // Fixed feat grant, not a slot — handled by grantedFeats().
      if (byName.has(resolvedFeatureName(feature.name))) continue;
      for (const ch of feature.changes ?? []) {
        if (ch.target !== "bonusFeats") continue;
        let value: number | null;
        try {
          value = tryEvaluateFormula(ch.formula, featureRollData);
        } catch {
          continue;
        }
        if (value === null || Number.isNaN(value)) continue;
        const count = Math.trunc(value);
        if (count === 0) continue;
        const { type, source } = baseFeatureSlotType(feature.name.trim().toLowerCase(), doc);
        out.push({ type, count, source });
      }
    }
  }

  // Archetype-granted bonus-feat slots (issue #40, extended by issue #45's
  // machine-extracted table via `resolveArchetypeFeatureEffect`) — gated the
  // same way as the base features above: the granting class's level must
  // reach the archetype feature's `level`.
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    const archRollData: RollData = { ...rollData, class: { level: clsLevel, unlevel: clsLevel } };
    for (const f of Object.values(refData.archetypeFeatures)) {
      if (f.archetypeId !== archetypeId || f.level > clsLevel) continue;
      const entry = resolveArchetypeFeatureEffect(f.id)?.effect;
      if (!entry) continue;
      for (const ch of entry.changes) {
        if (ch.target !== "bonusFeats") continue;
        let value: number | null;
        try {
          value = tryEvaluateFormula(ch.formula, archRollData);
        } catch {
          continue;
        }
        if (value === null || Number.isNaN(value)) continue;
        const count = Math.trunc(value);
        if (count === 0) continue;
        const known = ARCHETYPE_SLOT_TYPES[f.id] ?? toxophiliteSlotType(f.id, doc);
        out.push(known ? { ...known, count } : { type: GENERIC_SLOT, count, source: f.name });
      }
    }
  }

  return out;
}

function classBonusFeats(doc: CharacterDoc, refData: RefData): number {
  const total = classBonusFeatSlots(doc, refData).reduce((sum, slot) => sum + slot.count, 0);
  return Math.max(0, total);
}

/**
 * The number of feats a character is expected to have, given their level,
 * race, and class composition.
 */
export function expectedFeatCount(doc: CharacterDoc, refData: RefData): number {
  return baseFeatSlotCount(doc, refData) + classBonusFeats(doc, refData);
}

/**
 * The unrestricted ("generic") portion of the feat budget: the base level
 * progression, the Human racial bonus feat, and the GM/homebrew addend.
 * Split out from `expectedFeatCount` for `model/featSlots.ts` (issue #54/#57),
 * which needs this figure separately from the typed class-bonus slots.
 */
export function baseFeatSlotCount(doc: CharacterDoc, refData: RefData): number {
  const charLevel = totalLevel(doc);
  if (charLevel <= 0) return 0;

  // 1 feat at level 1, then +1 every odd level (3, 5, 7, …).
  // Equivalently: ceil(charLevel / 2).
  const baseFeatCount = Math.ceil(charLevel / 2);

  // +1 bonus feat for Human race — unless an alternate racial trait swapped out
  // the Human bonus feat (e.g. Focused Study, which suppresses `bonusFeats`;
  // issue #35).
  const race = refData.races[doc.identity.race];
  const humanBonus =
    race?.name === "Human" && !suppressedRaceTargets(doc, refData).has("bonusFeats") ? 1 : 0;

  // GM/homebrew addend (see build.gmGrants). Omitted/absent = 0; may be
  // negative (a GM can claw back slots). Added after rules-derived totals so
  // the over-budget check in the builder sees the loosened budget.
  return baseFeatCount + humanBonus + (doc.build.gmGrants?.featSlots ?? 0);
}

/**
 * One taken instance of a feat — the primary (`build.feats`) or a
 * `build.extraFeats` entry (issue #58: RAW-repeatable feats). `instanceId`
 * is the feat id itself for the primary instance (stable, one primary per
 * `featId`) or the `extraFeats` entry's own id for an extra one.
 */
export interface FeatInstance {
  instanceId: string;
  featId: string;
  choiceId?: string;
  /** False for the primary instance (`build.feats`); true for `build.extraFeats` entries. */
  isExtra: boolean;
}

/**
 * Every feat instance the character has chosen — the primary instance of
 * each `build.feats` entry, followed by every `build.extraFeats` entry
 * (issue #58) — in stable order. Used wherever budget/slot logic or the UI
 * needs to walk instances rather than distinct feat ids (a repeatable feat
 * taken twice counts, and is assignable, as two separate instances).
 */
export function featInstances(doc: CharacterDoc): FeatInstance[] {
  const primary: FeatInstance[] = doc.build.feats.map((featId) => ({
    instanceId: featId,
    featId,
    choiceId: doc.build.featChoices?.[featId],
    isExtra: false,
  }));
  const extra: FeatInstance[] = (doc.build.extraFeats ?? []).map((e) => ({
    instanceId: e.instanceId,
    featId: e.featId,
    choiceId: e.choiceId,
    isExtra: true,
  }));
  return [...primary, ...extra];
}

/** The number of feat instances the character has currently chosen (primary + extra, issue #58). */
export function chosenFeatCount(doc: CharacterDoc): number {
  return doc.build.feats.length + (doc.build.extraFeats?.length ?? 0);
}

/**
 * Chosen feat INSTANCES that count against the slot budget (issue #58: every
 * extra instance of a repeatable feat consumes a slot too): manually-added
 * duplicates of class-granted feats (e.g. a wizard who added Scribe Scroll by
 * hand before auto-granting existed) are excluded, so they never eat a slot.
 * Compare this — not `chosenFeatCount` — against `expectedFeatCount`.
 */
export function chosenFeatCountExcludingGranted(doc: CharacterDoc, refData: RefData): number {
  const granted = new Set(grantedFeats(doc, refData).map((g) => g.featId));
  return featInstances(doc).filter((inst) => !granted.has(inst.featId)).length;
}

/**
 * Set or clear the player's choice for a choice-based feat's PRIMARY instance.
 * Pass `null` to clear the choice (e.g. resetting after a mistake).
 * Does not validate that `featId` is present in `doc.build.feats`. For a 2nd+
 * instance (issue #58), use `setExtraFeatChoice` instead.
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
 * Set or clear the player's choice for one `build.extraFeats` instance
 * (issue #58 — a 2nd+ instance of a repeatable feat, e.g. the second Weapon
 * Focus taken for a different weapon). Pass `null` to clear. A no-op if
 * `instanceId` doesn't match any extra instance.
 */
export function setExtraFeatChoice(
  doc: CharacterDoc,
  instanceId: string,
  choiceId: string | null,
): CharacterDoc {
  const extras = doc.build.extraFeats ?? [];
  const next = extras.map((e) => {
    if (e.instanceId !== instanceId) return e;
    if (choiceId === null) return { instanceId: e.instanceId, featId: e.featId };
    return { ...e, choiceId };
  });
  return { ...doc, build: { ...doc.build, extraFeats: next } };
}

/**
 * Choice-picker kinds the FeatsSection/FeatsPanel UI knows how to render.
 * "skill"/"weapon" also drive a real engine effect for feats registered in
 * FEAT_EFFECTS/FEAT_EFFECTS_EXTRACTED (Weapon Focus, Skill Focus, Greater
 * Weapon Focus, ...); "school" only ever appears via `DISPLAY_ONLY_FEAT_CHOICES`
 * below, since no engine target exists for a per-school spell save DC.
 */
export type FeatChoiceType = "skill" | "weapon" | "school";

export interface FeatChoiceDescriptor {
  type: FeatChoiceType;
  label: string;
}

/**
 * The 8 schools of magic (PF1 CRB) — clean-room list of standard rules
 * category names, not vendored content. Used only as picker options for
 * Spell Focus/Greater Spell Focus (`DISPLAY_ONLY_FEAT_CHOICES`).
 */
const SCHOOLS_OF_MAGIC: readonly { id: string; name: string }[] = [
  { id: "abjuration", name: "Abjuration" },
  { id: "conjuration", name: "Conjuration" },
  { id: "divination", name: "Divination" },
  { id: "enchantment", name: "Enchantment" },
  { id: "evocation", name: "Evocation" },
  { id: "illusion", name: "Illusion" },
  { id: "necromancy", name: "Necromancy" },
  { id: "transmutation", name: "Transmutation" },
];

/**
 * Feats that need a player-chosen target for DISPLAY purposes only — no
 * entry exists (or should ever be added) for these slugs in the engine's
 * FEAT_EFFECTS/FEAT_EFFECTS_EXTRACTED tables, so `resolveFeatEffect` never
 * resolves them and no Change is emitted (issue #55, following the "don't
 * invent a target" guidance from feat-classification.ts):
 *
 *  - Spell Focus / Greater Spell Focus: a per-school spell save DC bonus has
 *    no engine target anywhere in targets.ts (see feat-classification.ts's
 *    "blocked" entries for both) — the school is recorded and shown, but
 *    never flows into a DC.
 *  - Improved Critical: doubling a weapon's threat range is stacking-suspect
 *    against a player-entered `WeaponInstance.critRange` that may already
 *    reflect Keen or another range-doubling source, and there's no "base"
 *    range to double against (see feat-classification.ts's "subsystem" note)
 *    — same posture as Improved Natural Armor's "blocked" classification.
 *    The chosen weapon is recorded and shown, but the sheet's crit column
 *    isn't touched.
 *
 * `setFeatChoice`/`doc.build.featChoices` (the storage) and the "one choice
 * per feat id" limitation (see `toggleFeat` in doc.ts — `build.feats` is a
 * de-duped array, so a feat legally takable multiple times, like Weapon
 * Focus or Improved Critical, only ever tracks ONE choice) are unchanged by
 * this map; it only widens what `featChoiceDescriptor` recognizes.
 */
const DISPLAY_ONLY_FEAT_CHOICES: Readonly<Record<string, FeatChoiceDescriptor>> = {
  "spell-focus": { type: "school", label: "School" },
  "greater-spell-focus": { type: "school", label: "School" },
  "improved-critical": { type: "weapon", label: "Weapon Type" },
};

/**
 * Returns the choice descriptor for the feat with the given name, or `null`
 * if the feat has no player choice. Two sources, checked in order:
 *  1. An engine-wired choice (Weapon Focus, Skill Focus, Greater Weapon
 *     Focus, Master Craftsman, ...) via `resolveFeatEffect` — its `build()`
 *     emits a real Change once a choice is stored.
 *  2. `DISPLAY_ONLY_FEAT_CHOICES` — a choice with no engine effect at all
 *     (Spell Focus's school, Improved Critical's weapon).
 * The descriptor drives the UI picker rendered in FeatsSection/FeatsPanel.
 */
export function featChoiceDescriptor(featName: string): FeatChoiceDescriptor | null {
  const resolved = resolveFeatEffect(featNameSlug(featName));
  if (resolved && resolved.entry.type === "choice") return resolved.entry.choice;
  return DISPLAY_ONLY_FEAT_CHOICES[featNameSlug(featName)] ?? null;
}

/**
 * Returns the list of selectable options for a given choice type.
 *
 * - "skill": the full skill list sorted alphabetically by display name.
 *   `refData` and `doc` are unused; the list is static.
 * - "weapon": the distinct non-empty `group` labels present on `doc.build.weapons`,
 *   sorted alphabetically. Returns empty when `doc` is not provided or the character
 *   has no weapons with a group set — the UI renders a soft hint in that case.
 * - "school": the 8 schools of magic, in a fixed traditional order (not
 *   alphabetical — matches how they're conventionally listed in the rules).
 *   `refData` and `doc` are unused; the list is static.
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
    return [...seen].sort().map((g) => ({ id: g, name: g }));
  }
  if (choiceType === "school") {
    return SCHOOLS_OF_MAGIC.map((s) => ({ ...s }));
  }
  return [];
}

/**
 * The feat's display name, with its chosen target appended when one is set
 * (e.g. "Weapon Focus: Longsword", "Improved Critical: Falchion", "Spell
 * Focus: Evocation") — issue #55's rendering requirement, shared by the
 * builder's FeatsSection and the Play-tab FeatsPanel so the two never drift.
 * Falls back to the bare feat name when the feat has no choice descriptor or
 * no choice has been stored yet.
 */
export function featDisplayName(feat: Feat, doc: CharacterDoc, refData: RefData): string {
  return featInstanceDisplayName(feat, doc.build.featChoices?.[feat.id], doc, refData);
}

/**
 * Display name for ONE feat instance (issue #58), given that instance's own
 * `choiceId` (the primary instance's `featChoices[featId]`, or a
 * `build.extraFeats` entry's `choiceId`) — the same "<name>: <choice>"
 * rendering as `featDisplayName`, generalized to per-instance choices so
 * `FeatsSection`/`FeatsPanel` can render each of a repeatable feat's
 * instances (e.g. "Weapon Focus: Falchion", "Weapon Focus: Longbow")
 * distinctly. `featDisplayName` is a thin wrapper over this for the primary
 * instance.
 */
export function featInstanceDisplayName(
  feat: Feat,
  choiceId: string | undefined,
  doc: CharacterDoc,
  refData: RefData,
): string {
  if (!choiceId) return feat.name;
  const descriptor = featChoiceDescriptor(feat.name);
  if (!descriptor) return feat.name;
  const label =
    featChoiceOptions(descriptor.type, refData, doc).find((o) => o.id === choiceId)?.name ??
    choiceId;
  return `${feat.name}: ${label}`;
}
