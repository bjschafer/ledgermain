/**
 * Shared primitive types used across reference data, character documents, and
 * derived sheets. These mirror the vocabulary used by the Foundry PF1 data
 * (ability/skill abbreviations, BAB/save tiers) so the data pipeline can map
 * 1:1 without a translation layer.
 */

/** Six ability scores, by their three-letter abbreviation. */
export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITY_IDS: readonly AbilityId[] = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
];

/**
 * Base-attack-bonus progression tier. PF1 has exactly three; the numeric table
 * per tier is fixed by the rules and lives in the engine (Stage 2), not here.
 */
export type BabTier = "high" | "med" | "low";

/** Saving-throw progression tier. PF1 has exactly two ("good"/"poor"). */
export type SaveTier = "high" | "low";

/**
 * Skill identifiers are the Foundry abbreviations (e.g. "acr", "per", "kna").
 * Kept as a string for forward-compatibility with subskills (e.g. "crf.alchemy")
 * and homebrew; a closed union can be introduced later if needed.
 */
export type SkillId = string;

/** Creature size category abbreviations as used by the PF1 data. */
export type SizeId =
  | "fine"
  | "dim"
  | "tiny"
  | "sm"
  | "med"
  | "lg"
  | "huge"
  | "grg"
  | "col";

/** A reference to a published source book + page(s). */
export interface SourceRef {
  id: string;
  pages?: string;
}

/**
 * A single typed modifier — the atom of the PF1 stacking engine. Foundry stores
 * these as `system.changes` on races, buffs, items, and class features.
 *
 * - `formula` is a Foundry roll-formula-dialect string (may reference `@data`
 *   paths and functions like `if`, `gte`, `min`); evaluated by the engine.
 * - `target` is what it modifies (e.g. "attack", "ac", "str", "skill.per",
 *   "bonusFeats").
 * - `type` is the stacking category (e.g. "untyped", "dodge", "morale",
 *   "enhancement", "racial", "deflection"). Same-type bonuses don't stack
 *   (highest wins); "dodge" and "untyped" always stack; penalties always stack.
 */
export interface Change {
  formula: string;
  target: string;
  type: string;
  /**
   * Foundry's change operator. Absent (or "add") means the formula's value is
   * added to the target like any other typed modifier. "set" means the
   * formula's *result* replaces the target's value outright rather than
   * adding to it (e.g. Slow halves speed via a set-change, not a penalty).
   * We deliberately do NOT carry Foundry's `priority` field — in the vendored
   * slice, every "set" change targets a speed/sense value, and the engine
   * resolves set-vs-set ordering itself (lowest value wins) rather than
   * relying on authored priority.
   */
  operator?: "add" | "set";
}

/**
 * Free-text note attached to a target (e.g. "+2 vs Enchantment"). These are not
 * mechanically applied by the engine; they surface as reminders on the sheet.
 */
export interface ContextNote {
  target: string;
  text: string;
}

/** Base fields shared by every reference-data entity. */
export interface RefEntity {
  /** Foundry document id (the `_id` field / filename suffix). */
  id: string;
  name: string;
  /** Full Foundry UUID: `Compendium.pf1.<pack>.Item.<id>`. */
  uuid: string;
  /** HTML description text, retained verbatim from the source. */
  description?: string;
  sources?: SourceRef[];
}
