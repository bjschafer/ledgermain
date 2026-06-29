import type { AbilityId, SkillId } from "./primitives.js";

/**
 * STUB (Stage 1). The character document is the single source of truth: it holds
 * build choices and live session state, but NEVER derived values. The full
 * definition lands in Stage 3 (builder); this stub captures the agreed shape from
 * DESIGN.md §3.1 so the schema package compiles and downstream code can import it.
 */
export interface CharacterDoc {
  schemaVersion: number;
  id: string;
  identity: {
    name: string;
    /** Race id (key into RefData.races). */
    race: string;
    /** Class tag + level pairs (multiclass-capable). */
    classes: { tag: string; level: number }[];
    alignment?: string;
    deity?: string;
  };
  /** Base ability scores only — no racial/item adjustments baked in. */
  abilities: Record<AbilityId, number>;
  build: {
    /** Feat ids chosen. (Choice/option refs expand in Stage 3.) */
    feats: string[];
    skillRanks: Record<SkillId, number>;
    /** Archetypes, bonus-feat picks, etc. — typed in Stage 3. */
    classFeatureChoices: unknown[];
    spells: { known: string[]; prepared: unknown[] };
    gear: unknown[];
  };
  live: {
    hp: { current: number; temp: number; nonlethal: number };
    conditions: string[];
    /** Active buffs with remaining duration + the changes they apply. */
    activeBuffs: unknown[];
    /** Resource pools: spell slots, ki, rounds/day, charges. */
    resources: Record<string, { used: number; max: number }>;
  };
}

/**
 * STUB (Stage 1). The derived sheet is the output of `compute(doc, refData)` —
 * every displayed number (AC, attack lines, saves, skills, CMB/CMD, ...). It is
 * fully specified in Stage 2 (rules engine). Kept intentionally open here.
 */
export interface DerivedSheet {
  schemaVersion: number;
  /** Placeholder until Stage 2 defines the concrete derived fields. */
  [key: string]: unknown;
}
