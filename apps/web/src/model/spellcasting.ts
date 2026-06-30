/**
 * Pure spellcasting model for the builder UI. Keeps caster-class knowledge in
 * one place so the registry can be extended when more spell lists are vendored.
 *
 * Only the wizard is in the data slice today; the UI falls back gracefully for
 * any caster tag not in CASTER_MODELS.
 */

import { baseSpellsKnown, baseSpellsPerDay, type SpellKnownProgression, type SpellProgression } from "@pf1/engine";
import type { AbilityId, RefData } from "@pf1/schema";

// ---------------------------------------------------------------------------
// Bonus spells per day
// ---------------------------------------------------------------------------

/**
 * PF1 bonus-spells-per-day granted by a high casting-ability score.
 *
 * Formula: a caster with modifier M gains bonus spell(s) for spell level L
 * when M >= L, counted as floor((M - L) / 4) + 1.
 * Cantrips (spell level 0) never grant bonus spells.
 *
 * @example
 *   bonusSpellsForLevel(3, 1) // → 1  (Int +3: qualifies, (3-1)/4 = 0, +1)
 *   bonusSpellsForLevel(5, 1) // → 2  (Int +5: (5-1)/4 = 1, +1 = 2)
 *   bonusSpellsForLevel(5, 5) // → 1  (Int +5: (5-5)/4 = 0, +1 = 1)
 *   bonusSpellsForLevel(0, 1) // → 0  (modifier too low)
 *   bonusSpellsForLevel(3, 0) // → 0  (cantrips: always 0)
 */
export function bonusSpellsForLevel(abilityMod: number, spellLevel: number): number {
  if (spellLevel === 0) return 0;
  if (abilityMod < spellLevel) return 0;
  return Math.floor((abilityMod - spellLevel) / 4) + 1;
}

// ---------------------------------------------------------------------------
// Caster-model registry
// ---------------------------------------------------------------------------

export interface CasterModel {
  preparation: "prepared" | "spontaneous";
  /** The ability score that governs spellcasting for this class. */
  ability: AbilityId;
  /** Spells-per-day progression table this class uses (engine `tables.ts`). */
  progression: SpellProgression;
  /**
   * Spells-known progression (spontaneous casters only). When set, the builder
   * shows the known-limit advisory and the tracker uses it to cap additions.
   */
  knownProgression?: SpellKnownProgression;
  /** What the "known" list represents in the UI (e.g. "Spellbook"). */
  knownLabel: string;
  /** One-line guidance on how many spells this caster learns per level. */
  learnGuidance: string;
  /** One-line explanation of prepared-vs-spontaneous for the UI hint. */
  blurb: string;
  /**
   * True if this caster knows every cantrip on its class list for free (no
   * selection needed). Prepared casters (wizard) and some spontaneous ones
   * (sorcerer) grant all; others (bard) learn a limited set. When true the
   * builder excludes cantrips from the spellbook and the tracker sources them
   * from the class list as read-only at-will spells.
   */
  grantsAllCantrips: boolean;
}

export const CASTER_MODELS: Record<string, CasterModel> = {
  wizard: {
    preparation: "prepared",
    ability: "int",
    progression: "wizard",
    knownLabel: "Spellbook",
    learnGuidance:
      "Wizards add 2 spells to their spellbook at each new level (more can be scribed from scrolls).",
    blurb:
      "Prepared caster: spells live in your spellbook, then you prepare a subset each day. Your spellbook is your \u201cknown\u201d list here.",
    grantsAllCantrips: true,
  },
  sorcerer: {
    preparation: "spontaneous",
    ability: "cha",
    progression: "sorcerer",
    knownProgression: "sorcerer",
    knownLabel: "Spells Known",
    learnGuidance:
      "Sorcerers learn a fixed set of spells known at each level (see spells-known table). You can cast any spell you know by spending a slot of that level.",
    blurb:
      "Spontaneous caster: you know a limited set of spells and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: true,
  },
};

/** Returns the CasterModel for `tag`, or `undefined` if it is not in the registry. */
export function casterModelFor(tag: string): CasterModel | undefined {
  return CASTER_MODELS[tag];
}

// ---------------------------------------------------------------------------
// Granted cantrips
// ---------------------------------------------------------------------------

/**
 * The cantrips (level-0 spells) a caster with `grantsAllCantrips` knows for
 * free, derived from the class spell list. Sorted by name. Empty when the
 * class has no vendored spell list. Callers should only invoke this for models
 * whose `grantsAllCantrips` is true; the grant semantics are the caller's
 * responsibility (this just reads the level-0 slice of the class list).
 */
export function grantedCantrips(
  refData: RefData,
  casterTag: string,
): { id: string; name: string }[] {
  const ids = refData.spellLists[casterTag]?.[0];
  if (!ids) return [];
  const out: { id: string; name: string }[] = [];
  for (const id of ids) {
    const sp = refData.spells[id];
    out.push({ id, name: sp?.name ?? id });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Spell slots per day
// ---------------------------------------------------------------------------

/** Slot capacity at one spell level: base (table) + bonus (ability) = total. */
export interface SpellSlotLevel {
  /** Spell level, 0–9. */
  level: number;
  /** Base slots from the class progression table. */
  base: number;
  /** Bonus slots from a high casting ability (0 for cantrips). */
  bonus: number;
  /** Slots available to prepare at this level. */
  total: number;
}

/**
 * Slots-per-day for every spell level the caster can access at `classLevel`,
 * combining the engine's base table with ability bonus spells. Levels with no
 * access (base `null`) are omitted. `abilityMod` is the final casting-ability
 * modifier from the computed sheet.
 */
export function spellSlotsByLevel(
  model: CasterModel,
  classLevel: number,
  abilityMod: number,
): SpellSlotLevel[] {
  const out: SpellSlotLevel[] = [];
  for (let level = 0; level <= 9; level++) {
    const base = baseSpellsPerDay(model.progression, classLevel, level);
    if (base === null) continue;
    const bonus = bonusSpellsForLevel(abilityMod, level);
    out.push({ level, base, bonus, total: base + bonus });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spells-known limits (spontaneous casters)
// ---------------------------------------------------------------------------

/**
 * Maximum spells known at each accessible spell level for a spontaneous caster.
 * Levels with no access (null) are omitted. Only meaningful when the model has
 * a `knownProgression`. Returns empty array for prepared casters.
 */
export function spellsKnownLimitsByLevel(
  model: CasterModel,
  classLevel: number,
): { level: number; limit: number }[] {
  if (!model.knownProgression) return [];
  const out: { level: number; limit: number }[] = [];
  for (let level = 0; level <= 9; level++) {
    const limit = baseSpellsKnown(model.knownProgression, classLevel, level);
    if (limit === null) continue;
    out.push({ level, limit });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spell detail helpers (Task 2)
// ---------------------------------------------------------------------------

/**
 * Save DC for a spell: 10 + spell level + casting-ability modifier.
 * Only meaningful when the spell actually allows a saving throw.
 *
 * @example
 *   spellSaveDC(3, 4) // → 17  (10 + 3 + 4)
 */
export function spellSaveDC(spellLevel: number, abilityMod: number): number {
  return 10 + spellLevel + abilityMod;
}

/**
 * Concentration check DC to cast defensively (to avoid provoking an AoO):
 * 15 + 2 × spell level. This is the standard PF1 defensive-casting DC.
 *
 * @example
 *   concentrationDC(3) // → 21  (15 + 6)
 *   concentrationDC(0) // → 15  (cantrips)
 */
export function concentrationDC(spellLevel: number): number {
  return 15 + 2 * spellLevel;
}
