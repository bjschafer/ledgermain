/**
 * Pure transitions + derivation wrapper for a tracked eidolon
 * (`doc.build.eidolon` / `doc.live.eidolon` — see the schema doc comments on
 * those fields, and `@pf1/engine` `eidolon.ts` for the derivation rules).
 * Mirrors `model/phantom.ts`'s shape closely; the differences are the base
 * form in place of an Emotional Focus, the evolution-pool spend in place of
 * automatic ability-score-increase slots, and the summoned/dismissed toggle
 * in place of a manifestation-state toggle.
 */

import {
  buildRollData,
  CONDITION_LADDERS,
  deriveEidolon,
  EIDOLON_BASE_FORMS,
  EIDOLON_EVOLUTIONS,
  eidolonEvolutionPoolAvailable,
  eidolonSummonerLevel,
  eidolonVariant,
  EIDOLON_SUBTYPES,
  featNameSlug,
  type DerivedEidolon,
} from "@pf1/engine";
import type { AbilityId, CharacterDoc, EidolonEvolutionPick, RefData } from "@pf1/schema";

import { toggleConditionIn } from "./conditions.js";
import { ABILITY_IDS } from "./doc.js";
import { normalizeAlignmentCode } from "./names.js";
import type { PrereqContext } from "./prereqs.js";

/** Set (or replace) the tracked eidolon's base form + name. Trims blank names to "Eidolon". */
export function setEidolon(doc: CharacterDoc, baseForm: string, name: string): CharacterDoc {
  const trimmedName = name.trim() || "Eidolon";
  const current = doc.build.eidolon;
  const build = { ...current, baseForm, name: trimmedName, evolutions: current?.evolutions ?? [] };
  return { ...doc, build: { ...doc.build, eidolon: build } };
}

/**
 * Set (or clear) the tracked eidolon's Pathfinder Unchained subtype (key
 * into `EIDOLON_SUBTYPES`) — meaningful only once `eidolonVariant(doc)` is
 * `"unchained"`; a chained eidolon just carries the field unused (see
 * `EidolonBuild.subtype`'s doc comment). No-ops if there's no eidolon yet.
 */
export function setEidolonSubtype(doc: CharacterDoc, subtypeId: string | undefined): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  if (subtypeId === undefined) {
    const { subtype: _subtype, ...rest } = current;
    return { ...doc, build: { ...doc.build, eidolon: rest } };
  }
  return { ...doc, build: { ...doc.build, eidolon: { ...current, subtype: subtypeId } } };
}

/**
 * Set the ability the player has assigned to the automatic Ability Score
 * Increase slot at `slotIndex` (0 = unchained summoner 5th, 1 = 10th, 2 =
 * 15th — see `EidolonBuild.abilityIncreases`'s doc comment). Extends the
 * array with `"str"` defaults for any earlier unset slot so indices stay
 * stable, mirroring `model/phantom.ts`'s `setPhantomAbilityIncrease` exactly
 * (just Str-defaulted instead of Cha, matching this module's existing
 * Str-default convention). No-ops if there's no eidolon yet.
 */
export function setEidolonAbilityIncrease(
  doc: CharacterDoc,
  slotIndex: number,
  ability: AbilityId,
): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const existing = current.abilityIncreases ?? [];
  const next = [...existing];
  while (next.length <= slotIndex) next.push("str");
  next[slotIndex] = ability;
  return { ...doc, build: { ...doc.build, eidolon: { ...current, abilityIncreases: next } } };
}

/**
 * Set the target ability for the subtype's free +2 Ability Increase grant at
 * `level` (e.g. Archon 8th, Demon 12th — see `EidolonSubtypeGrant.abilityIncrease`),
 * keyed by the grant's milestone level as a string. No-ops if there's no
 * eidolon yet.
 */
export function setEidolonSubtypeGrantChoice(
  doc: CharacterDoc,
  level: number,
  ability: AbilityId,
): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const subtypeGrantChoices = {
    ...current.subtypeGrantChoices,
    [String(level)]: ability,
  };
  return { ...doc, build: { ...doc.build, eidolon: { ...current, subtypeGrantChoices } } };
}

/** Update the tracked eidolon's free-text notes. No-ops if there's no eidolon yet. */
export function setEidolonNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  if (!doc.build.eidolon) return doc;
  const trimmed = notes.trim();
  return {
    ...doc,
    build: {
      ...doc.build,
      eidolon: { ...doc.build.eidolon, notes: trimmed.length > 0 ? trimmed : undefined },
    },
  };
}

/** Remove the tracked eidolon entirely (build choice + live state both clear). */
export function clearEidolon(doc: CharacterDoc): CharacterDoc {
  const build = { ...doc.build };
  delete build.eidolon;
  const live = { ...doc.live };
  delete live.eidolon;
  return { ...doc, build, live };
}

/** Append one evolution pick (`{ id, choice? }`) to the eidolon's evolution list. No-ops if there's no eidolon yet. */
export function addEidolonEvolution(doc: CharacterDoc, id: string, choice?: string): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const evolutions: EidolonEvolutionPick[] = [...current.evolutions, { id, choice }];
  return { ...doc, build: { ...doc.build, eidolon: { ...current, evolutions } } };
}

/**
 * Remove one occurrence of an evolution pick at `index` (not by id — a
 * repeatable evolution like "Ability Increase" may appear more than once
 * with different `choice`s, so index-based removal is the only unambiguous
 * one, mirroring `occultistImplements.ts`'s multiset-removal posture). No-ops
 * if there's no eidolon yet or the index is out of range.
 */
export function removeEidolonEvolution(doc: CharacterDoc, index: number): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  if (index < 0 || index >= current.evolutions.length) return doc;
  const evolutions = current.evolutions.filter((_, i) => i !== index);
  return { ...doc, build: { ...doc.build, eidolon: { ...current, evolutions } } };
}

/**
 * Set the `choice` on an already-chosen evolution pick at `index` (e.g.
 * retargeting an "Ability Increase" pick to a different ability after the
 * fact). No-ops if there's no eidolon yet or the index is out of range.
 */
export function setEidolonEvolutionChoice(
  doc: CharacterDoc,
  index: number,
  choice: string,
): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  if (index < 0 || index >= current.evolutions.length) return doc;
  const evolutions = current.evolutions.map((p, i) => (i === index ? { ...p, choice } : p));
  return { ...doc, build: { ...doc.build, eidolon: { ...current, evolutions } } };
}

/**
 * Remove the LAST occurrence of evolution `id` from the pick list (the
 * builder's "−" stepper button on a repeatable evolution — mirrors
 * `occultistImplements.ts`'s `removeOccultistImplement`'s "remove one copy"
 * shape, just index-derived here instead of count-keyed). No-ops if there's
 * no eidolon yet or `id` isn't currently picked.
 */
export function removeLastEidolonEvolution(doc: CharacterDoc, id: string): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const lastIndex = current.evolutions.map((p) => p.id).lastIndexOf(id);
  if (lastIndex < 0) return doc;
  return removeEidolonEvolution(doc, lastIndex);
}

/** How many times evolution `id` currently appears in the eidolon's pick list. */
export function eidolonEvolutionCount(doc: CharacterDoc, id: string): number {
  return (doc.build.eidolon?.evolutions ?? []).filter((p) => p.id === id).length;
}

/**
 * Toggle a feat pick for the eidolon itself (`build.eidolon.feats`).
 * Free-choice, soft-capped against `DerivedEidolon.bonusFeats` by the UI
 * (never blocked here). No-ops if there's no eidolon yet.
 */
export function toggleEidolonFeat(doc: CharacterDoc, featId: string): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const existing = current.feats ?? [];
  const feats = existing.includes(featId)
    ? existing.filter((id) => id !== featId)
    : [...existing, featId];
  return { ...doc, build: { ...doc.build, eidolon: { ...current, feats } } };
}

function withEidolonLive(
  doc: CharacterDoc,
  patch: Partial<NonNullable<CharacterDoc["live"]["eidolon"]>>,
): CharacterDoc {
  return { ...doc, live: { ...doc.live, eidolon: { ...doc.live.eidolon, ...patch } } };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply lethal damage to the eidolon's HP pool. */
export function applyEidolonDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const current = doc.live.eidolon?.damage ?? 0;
  return withEidolonLive(doc, { damage: current + dmg });
}

/** Heal the eidolon's HP, floored at 0 damage (never below full health). */
export function healEidolon(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.eidolon?.damage ?? 0;
  return withEidolonLive(doc, { damage: nonNeg(current - heal) });
}

/** Add nonlethal damage to the eidolon. */
export function addEidolonNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  const current = doc.live.eidolon?.nonlethal ?? 0;
  return withEidolonLive(doc, { nonlethal: current + add });
}

/** Heal nonlethal damage on the eidolon, floored at 0. */
export function healEidolonNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.eidolon?.nonlethal ?? 0;
  return withEidolonLive(doc, { nonlethal: nonNeg(current - heal) });
}

/** Fully heal the eidolon (e.g. alongside the master's own Rest action). */
export function restEidolon(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.eidolon && !doc.build.eidolon) return doc;
  return withEidolonLive(doc, { damage: 0, nonlethal: 0 });
}

/** Whether the eidolon's OWN condition `id` is currently active (independent of the summoner's `live.conditions`). */
export function hasEidolonCondition(doc: CharacterDoc, id: string): boolean {
  return (doc.live.eidolon?.conditions ?? []).includes(id);
}

/** The eidolon's active condition id, if any, that supersedes `id` on its `CONDITION_LADDERS` ladder (mirrors `model/conditions.ts`'s `supersedingCondition`, scoped to the eidolon's own list). */
export function eidolonSupersedingCondition(doc: CharacterDoc, id: string): string | undefined {
  const pos = CONDITION_LADDERS.find((ladder) => ladder.includes(id));
  if (!pos) return undefined;
  const index = pos.indexOf(id);
  const conditions = doc.live.eidolon?.conditions ?? [];
  return pos.slice(index + 1).find((sibling) => conditions.includes(sibling));
}

/** True when the eidolon's condition `id` is implied by a stricter active sibling (see `eidolonSupersedingCondition`) — the UI shows it as covered rather than independently toggleable. */
export function isEidolonConditionImplied(doc: CharacterDoc, id: string): boolean {
  return eidolonSupersedingCondition(doc, id) !== undefined;
}

/**
 * Toggle one of the eidolon's OWN active conditions (`live.eidolon.conditions`)
 * — reuses `model/conditions.ts`'s `toggleConditionIn` for the same
 * ladder-aware auto-upgrade/implied-condition behavior the summoner's own
 * `live.conditions` gets, just scoped to the eidolon's separate array.
 * No-ops if there's no eidolon yet.
 */
export function toggleEidolonCondition(doc: CharacterDoc, id: string): CharacterDoc {
  if (!doc.build.eidolon) return doc;
  const conditions = toggleConditionIn(doc.live.eidolon?.conditions ?? [], id);
  return withEidolonLive(doc, { conditions });
}

/** Whether one of the master's active buffs (by instance id) is currently shared onto the eidolon. */
export function isSharedWithEidolon(doc: CharacterDoc, instanceId: string): boolean {
  return (doc.live.eidolon?.sharedBuffIds ?? []).includes(instanceId);
}

/** Toggle whether a master buff instance also applies to the eidolon's derived sheet (Share Spells). */
export function toggleSharedBuffEidolon(doc: CharacterDoc, instanceId: string): CharacterDoc {
  const current = doc.live.eidolon?.sharedBuffIds ?? [];
  const sharedBuffIds = current.includes(instanceId)
    ? current.filter((id) => id !== instanceId)
    : [...current, instanceId];
  return withEidolonLive(doc, { sharedBuffIds });
}

/** Whether the eidolon is currently summoned (materially present) — `live.eidolon.summoned`, defaulting to `true`. */
export function isEidolonSummoned(doc: CharacterDoc): boolean {
  return doc.live.eidolon?.summoned ?? true;
}

/** Toggle the eidolon's summoned/dismissed state. Display-only bookkeeping — see `EidolonLiveState.summoned`'s schema doc comment. No-ops if there's no eidolon yet. */
export function toggleEidolonSummoned(doc: CharacterDoc): CharacterDoc {
  if (!doc.build.eidolon) return doc;
  return withEidolonLive(doc, { summoned: !isEidolonSummoned(doc) });
}

/**
 * Total evolution points currently spent (sum of `build.eidolon.evolutions`'
 * resolved costs — unresolved ids contribute 0, matching `deriveEidolon`'s
 * own soft-skip posture).
 */
export function eidolonEvolutionPointsSpent(doc: CharacterDoc): number {
  const picks = doc.build.eidolon?.evolutions ?? [];
  return picks.reduce((sum, p) => sum + (EIDOLON_EVOLUTIONS[p.id]?.cost ?? 0), 0);
}

/**
 * The evolution pool available at the eidolon's current summoner level,
 * variant-aware (0 if there's no eidolon/no summoner levels — see `@pf1/engine`
 * `eidolonEvolutionPoolAvailable`'s doc comment for the chained/unchained
 * split and how an unchained subtype's `poolBonus` grants factor in).
 */
export function eidolonEvolutionPointsAvailable(doc: CharacterDoc): number {
  return eidolonEvolutionPoolAvailable(doc);
}

/** True when spent evolution points exceed the available pool — soft warning only, never blocks a pick (same posture as `traits`/`racialTraits`). */
export function eidolonEvolutionPoolNeedsWarning(doc: CharacterDoc): boolean {
  return eidolonEvolutionPointsSpent(doc) > eidolonEvolutionPointsAvailable(doc);
}

/**
 * Soft warning when the eidolon's chosen Unchained subtype doesn't model its
 * current base form (e.g. an Azata biped has no serpentine entry) —
 * `deriveEidolon` still derives a full stat block either way, falling back
 * to the chained form's own attacks (see `@pf1/engine` `eidolon-unchained.ts`'s
 * module doc comment), so this is advisory only, never a block. Returns
 * `undefined` when there's no eidolon, no subtype set, an unrecognized
 * subtype id, the subtype DOES model the current form, or the eidolon isn't
 * unchained (subtype is meaningless for a chained eidolon — see
 * `EidolonBuild.subtype`'s doc comment).
 */
export function eidolonSubtypeFormWarning(doc: CharacterDoc): string | undefined {
  if (eidolonVariant(doc) !== "unchained") return undefined;
  const current = doc.build.eidolon;
  const subtypeId = current?.subtype;
  if (!current || !subtypeId) return undefined;
  const subtype = EIDOLON_SUBTYPES[subtypeId];
  if (!subtype) return undefined;
  if (subtype.baseForms[current.baseForm]) return undefined;
  const formName = EIDOLON_BASE_FORMS[current.baseForm]?.name ?? current.baseForm;
  const allowedForms = Object.keys(subtype.baseForms)
    .map((id) => EIDOLON_BASE_FORMS[id]?.name ?? id)
    .join(", ");
  return `${subtype.name} doesn't model a ${formName} base form (only ${allowedForms}) — falling back to the base form's own attacks.`;
}

/**
 * Soft warning when the summoner's alignment doesn't match the chosen
 * Unchained subtype's required alignment(s) — same never-block posture as
 * `alignment.ts`'s `classAlignmentWarnings`. Returns `undefined` when
 * there's no eidolon, no subtype set, no alignment recorded, the alignment
 * text doesn't normalize to a recognized code (nothing structured to compare
 * against — see `model/alignment.ts`'s `normalizeAlignmentCode`), or the
 * eidolon isn't unchained (subtype is meaningless for a chained eidolon).
 */
export function eidolonSubtypeAlignmentWarning(doc: CharacterDoc): string | undefined {
  if (eidolonVariant(doc) !== "unchained") return undefined;
  const subtypeId = doc.build.eidolon?.subtype;
  const subtype = subtypeId ? EIDOLON_SUBTYPES[subtypeId] : undefined;
  if (!subtype) return undefined;
  const raw = doc.identity.alignment;
  if (!raw) return undefined;
  const code = normalizeAlignmentCode(raw);
  if (!code) return undefined;
  if (subtype.alignments.includes(code)) return undefined;
  return `${subtype.name} eidolons require ${subtype.alignmentText}; the summoner's alignment doesn't match.`;
}

/**
 * The eidolon's own feat-prerequisite context — reuses `model/prereqs.ts`'s
 * `evaluatePrereqs`/`PrereqContext`, but built from the EIDOLON's own derived
 * ability scores/BAB (not the summoner's), the eidolon's own chosen feats
 * (`doc.build.eidolon.feats`, not the summoner's `build.feats`), and
 * `casterLevel: 0` (no eidolon casts). Mirrors `model/companion.ts`'s
 * `companionFeatPrereqContext`.
 */
export function eidolonFeatPrereqContext(
  doc: CharacterDoc,
  eidolon: DerivedEidolon,
  refData: RefData,
): PrereqContext {
  const abilityTotals = {} as Record<AbilityId, number>;
  for (const id of ABILITY_IDS) abilityTotals[id] = eidolon.abilities[id].score;
  return {
    abilityTotals,
    bab: eidolon.bab,
    casterLevel: 0,
    selectedFeats: new Set(doc.build.eidolon?.feats ?? []),
    refData,
  };
}

/**
 * Whether the EIDOLON itself (not the summoner) has picked Weapon Finesse
 * from its own feat list (`build.eidolon.feats`) — the RAW way an eidolon's
 * natural-attack roll uses Dex instead of Str (natural weapons are light
 * weapons for this purpose; see `@pf1/engine` `eidolon.ts`'s module doc
 * comment). Same slug-matching technique as `model/companion.ts`'s
 * `companionHasWeaponFinesse`.
 */
export function eidolonHasWeaponFinesse(doc: CharacterDoc, refData: RefData): boolean {
  return (doc.build.eidolon?.feats ?? []).some((id) => {
    const feat = refData.feats[id];
    return feat != null && featNameSlug(feat.name) === "weapon-finesse";
  });
}

/**
 * Derive the tracked eidolon's full stat block from the character document,
 * or `undefined` if there's no eidolon (no `build.eidolon`, an unknown base
 * form id, or 0 summoner levels — see `@pf1/engine` `deriveEidolon`'s doc
 * comment). Like a companion or phantom, the eidolon has its own HD/BAB/
 * saves, so it needs no master `DerivedSheet` inputs — only enough roll-data
 * context to evaluate any shared buffs' formulas.
 */
export function deriveEidolonSheet(
  doc: CharacterDoc,
  refData: RefData,
): DerivedEidolon | undefined {
  if (!doc.build.eidolon) return undefined;
  const rollData = buildRollData(doc, refData);
  return deriveEidolon(doc, rollData, eidolonHasWeaponFinesse(doc, refData));
}

export { EIDOLON_BASE_FORMS, EIDOLON_EVOLUTIONS, eidolonSummonerLevel };
