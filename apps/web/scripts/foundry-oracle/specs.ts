/**
 * Characters the Foundry oracle builds and dumps (see `dump.ts`). Each spec is
 * plain data handed to `oracle.browser.js` inside the Foundry tab, so names
 * are exact compendium entry names and skill keys are Foundry's long ids.
 *
 * Class `hp` is the class item's stored hit point total. Foundry's automatic
 * HP is off by default, so the spec writes the PF1 average (max at 1st, then
 * half the die plus one) and the diff compares what Con, Toughness and the
 * rest add on top of it.
 */
import { ARCANE_SPECS } from "./specs/arcane.js";
import { DIVINE_SPECS } from "./specs/divine.js";
import { HYBRID_SPECS } from "./specs/hybrid.js";
import { MARTIAL_SPECS } from "./specs/martial.js";

export type FoundryAbility = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface OracleItem {
  pack: string;
  name: string;
  equipped?: boolean;
  /** Armor, shield or weapon enhancement bonus. */
  enh?: number;
  masterwork?: boolean;
  quantity?: number;
  /**
   * Special material, plus the adjusted stats that go with it: Foundry stores
   * the tag but leaves max Dex and armor check penalty at the base armor's
   * values, so a mithral suit has to carry its own.
   */
  material?: { id: string; maxDex?: number; acp?: number; spellFailure?: number };
  /** A composite bow's Strength rating. */
  strRating?: number;
  /**
   * Attack-dialog settings to roll a weapon with besides the plain attack
   * (no Power Attack, held as the weapon's own handedness), which every
   * weapon gets.
   */
  attacks?: OracleAttack[];
}

/** One way of using a weapon, as the options Foundry's attack dialog takes. */
export interface OracleAttack {
  /** Appended to the weapon's name in the stat key. */
  id: string;
  powerAttack?: boolean;
  held?: "2h" | "oh";
}

export interface OracleScenario {
  /** Buffs switched on, by `pf1.buffs` name, at the given caster level. */
  buffs?: { name: string; level: number }[];
  /** Foundry condition ids (`pf1.registry.conditions`). */
  conditions?: string[];
  drain?: Partial<Record<FoundryAbility, number>>;
  negativeLevels?: number;
}

export interface OracleSpec {
  id: string;
  race: string;
  /** Flexible-race +2: Foundry's race item carries no ability change for it. */
  flexibleAbility?: FoundryAbility;
  alignment: string;
  abilities: Record<FoundryAbility, number>;
  /** In the order the classes were taken; the first gets max HP at 1st. */
  classes: { name: string; level: number; hp: number }[];
  feats: string[];
  skills: Record<string, number>;
  items: OracleItem[];
  /**
   * Picks the Foundry items have no field or automation for. Applied only
   * after import on the Ledgermain side; missing Foundry bonuses must be
   * listed as divergences, not supplied to Foundry as hand-entered numbers.
   */
  choices?: { feats?: Record<string, string>; weaponTrainingGroups?: string[] };
  /**
   * An archetype from `pf1e-archetypes`. Foundry doesn't apply one: the item
   * pulls in none of its features and removes nothing, so the spec names the
   * archetype features gained by this level and the base class features they
   * replace, both read off the archetype's rules text.
   */
  archetype?: { name: string; features: string[]; replaces: string[] };
  /**
   * Alternate racial traits, by `pf-content.pf-racial-traits` name, and the
   * race item changes (by Foundry target) of the standard traits they
   * replace. As with archetypes, Foundry leaves the replaced trait in place.
   */
  racialTraits?: { names: string[]; replacesRaceChanges: string[] };
  scenarios: Record<string, OracleScenario>;
}

export const ORACLE_SPECS: OracleSpec[] = [
  ...MARTIAL_SPECS,
  ...ARCANE_SPECS,
  ...DIVINE_SPECS,
  ...HYBRID_SPECS,
];
