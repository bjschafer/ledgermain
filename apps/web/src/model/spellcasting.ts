/**
 * Pure spellcasting model for the builder UI. Keeps caster-class knowledge in
 * one place so the registry can be extended when more spell lists are vendored.
 *
 * Only the wizard is in the data slice today; the UI falls back gracefully for
 * any caster tag not in CASTER_MODELS.
 */

import { baseSpellsPerDay, type SpellProgression } from "@pf1/engine";
import type { AbilityId } from "@pf1/schema";

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
  /** What the "known" list represents in the UI (e.g. "Spellbook"). */
  knownLabel: string;
  /** One-line guidance on how many spells this caster learns per level. */
  learnGuidance: string;
  /** One-line explanation of prepared-vs-spontaneous for the UI hint. */
  blurb: string;
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
      "Prepared caster: spells live in your spellbook, then you prepare a subset each day. Your spellbook is your “known” list here.",
  },
};

/** Returns the CasterModel for `tag`, or `undefined` if it is not in the registry. */
export function casterModelFor(tag: string): CasterModel | undefined {
  return CASTER_MODELS[tag];
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
