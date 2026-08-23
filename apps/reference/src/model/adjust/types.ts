/**
 * Statblock adjustment: the shared contract for applying templates and
 * feat-style modifiers (Augment Summoning) to a vendored `Monster` client-side.
 *
 * Vendored statblocks are mostly printed display strings, so an adjustment is
 * applied at three tiers of fidelity, and the result is honest about which tier
 * each field got: numeric fields are recomputed, semi-structured strings
 * (saves, attack lines, CMB/CMD) are parsed and shifted, and everything else is
 * either string-appended or left alone with a `manual` note telling the reader
 * what to adjust by hand. A field that fails to parse NEVER gets a fabricated
 * value — the original text stays, flagged with a note.
 *
 * Effects are declarative ops (not functions) so template definitions read like
 * the published rules text they were authored from and can be audited row by
 * row against it.
 */

import type { Monster } from "@pf1/schema";

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type AbilityDeltas = Partial<Record<AbilityKey, number>>;

/** Pick the entry with the highest `minHd` that is <= the creature's HD count. */
export interface HdTier<T> {
  minHd: number;
  value: T;
}

/**
 * Text ops may embed `{hd}` (hit-dice count) and `{chaMod}` (signed Cha
 * modifier, "+2"/"-1"); the applier substitutes them, or downgrades the op to a
 * `manual` note when the statblock lacks the needed value.
 */
export type AdjustOp =
  | {
      kind: "ability";
      deltas: AbilityDeltas;
      /** Published carve-out: skip one ability's delta when its base score is at most this ("except Int scores of 2 or less"). */
      except?: { ability: AbilityKey; atMost: number };
    }
  | { kind: "naturalArmor"; delta: number }
  /** One size-category step (+1 grows, -1 shrinks): AC/attack/CMB/CMD size mods, damage dice, space/reach. */
  | { kind: "sizeStep"; delta: 1 | -1 }
  /** `value` is the printed DR text ("5/magic"); null = no DR at that tier. Merges with existing DR by keeping both, noted. */
  | { kind: "drTiers"; tiers: Array<HdTier<string | null>> }
  /** Grants `resist <energy> N` for each listed energy; merges highest-wins with existing resist entries. */
  | { kind: "resistTiers"; energies: string[]; tiers: Array<HdTier<number>> }
  /** SR = numeric CR + delta; skipped with a note when CR is fractional-weird or SR already higher. */
  | { kind: "srFromCr"; delta: number }
  /** CR adjustment by HD tier; delta applies to the printed CR (fractions step along the CR ladder). */
  | { kind: "crTiers"; tiers: Array<HdTier<number>> }
  /** Flat shift to printed attack bonuses; "melee" scope leaves the ranged line alone (prone). Never touches CMB (mirrors the engine's separate `attack`/`cmb` targets). */
  | { kind: "attackShift"; delta: number; scope: "all" | "melee" }
  /** Flat shift to every parsed weapon-damage bonus on the melee and ranged lines (sickened). */
  | { kind: "damageShift"; delta: number }
  /** Flat shift to AC, touch, and flat-footed together (an untyped penalty hits all three). */
  | { kind: "acShift"; delta: number }
  /** Flat shift to all three saves, or to just the named one. */
  | { kind: "saveShift"; delta: number; save?: "fort" | "ref" | "will" }
  | { kind: "initShift"; delta: number }
  /** Flat shift to printed skill bonuses: every one, or just the named skill. Perception inside the senses line shifts too. */
  | { kind: "skillShift"; delta: number; skill?: string }
  | {
      kind: "appendLine";
      field:
        | "senses"
        | "aura"
        | "defensiveAbilities"
        | "specialAttacks"
        | "sq"
        | "speed"
        | "immune"
        | "weaknesses"
        | "feats";
      text: string;
      /** Skip the append when the field already contains this substring (case-insensitive). */
      skipIfPresent?: string;
    }
  | { kind: "subtypes"; add: string[] }
  /**
   * Bonus damage rider appended to each qualifying attack's damage
   * parenthetical ("plus 1d6 fire"), the amount picked by HD tier. Only
   * natural attacks can be told apart on a printed line; a "metal weapons"
   * clause in the rules is noted, never guessed at.
   */
  | { kind: "attackRider"; scope: "natural"; tiers: Array<HdTier<string>> }
  /**
   * Grants a movement mode derived from the creature's highest printed speed:
   * `floor(highest * multiplier) + plus`, optionally capped at `maxPerHd` x HD.
   * An existing speed of that mode is kept when it is already higher.
   */
  | {
      kind: "speedGrant";
      movement: "fly" | "swim" | "burrow";
      multiplier: number;
      plus: number;
      maxPerHd?: number;
      maneuverability?: "clumsy" | "poor" | "average" | "good" | "perfect";
    }
  /** Flat bonus to every printed speed on the line ("+10-ft. bonus to all speeds"). */
  | { kind: "speedShift"; delta: number }
  /**
   * Spell-like abilities by HD tier, cumulative (a higher tier also gets every
   * lower tier's entries), each 1/day. Tier text may embed `{dcN}`, which
   * substitutes 10 + N + the creature's Cha modifier.
   */
  | { kind: "slaTiers"; tiers: Array<HdTier<string>> }
  /**
   * Steps the damage dice of ONE primary natural weapon: the creature's only
   * natural attack when it has just one, else the first it has from the
   * published priority order (bite, claw, slam, gore, talon, sting).
   */
  | { kind: "primaryNaturalDiceStep"; steps: number };

/** One named source of ops: a template, or a feat-style modifier. */
export interface StatblockAdjustment {
  /** Stable slug; for templates it matches the `monster-templates.json` id when one exists. Used in URLs. */
  key: string;
  label: string;
  ops: AdjustOp[];
  /** Honest limits always shown alongside an applied result ("does not adjust skill modifiers"). */
  notes?: string[];
}

export type FieldChangeKind = "recomputed" | "shifted" | "appended";

export interface FieldChange {
  field: keyof Monster;
  kind: FieldChangeKind;
}

export interface AdjustNote {
  text: string;
  /** `manual` = the reader must finish this adjustment by hand; `info` = context only. */
  severity: "info" | "manual";
}

export interface AdjustResult {
  monster: Monster;
  changes: FieldChange[];
  notes: AdjustNote[];
}
