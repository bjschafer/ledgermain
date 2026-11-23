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

export type FoundryAbility = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface OracleItem {
  pack: string;
  name: string;
  equipped?: boolean;
  /** Armor/shield enhancement bonus. */
  enh?: number;
  /**
   * Special material, plus the adjusted stats that go with it: Foundry stores
   * the tag but leaves max Dex and armor check penalty at the base armor's
   * values, so a mithral suit has to carry its own.
   */
  material?: { id: string; maxDex?: number; acp?: number; spellFailure?: number };
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
  {
    id: "human-fighter-6",
    race: "Human",
    flexibleAbility: "str",
    alignment: "ln",
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    classes: [{ name: "Fighter", level: 6, hp: 40 }],
    feats: [
      "Power Attack",
      "Toughness",
      "Dodge",
      "Iron Will",
      "Improved Initiative",
      "Lightning Reflexes",
    ],
    skills: { climb: 6, intimidate: 6, perception: 6 },
    items: [
      {
        pack: "pf1.armors-and-shields",
        name: "Breastplate",
        equipped: true,
        enh: 1,
        material: { id: "mithral", maxDex: 5, acp: 1, spellFailure: 15 },
      },
      { pack: "pf1.armors-and-shields", name: "Heavy Steel Shield", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Bless", level: 1 },
          { name: "Haste", level: 5 },
          { name: "Enlarge Person", level: 5 },
        ],
      },
      conditions: { conditions: ["shaken", "fatigued"] },
    },
  },
  {
    id: "elf-wizard-6",
    race: "Elf",
    alignment: "cg",
    abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
    classes: [{ name: "Wizard", level: 6, hp: 26 }],
    feats: ["Improved Initiative", "Great Fortitude", "Alertness", "Combat Casting"],
    skills: {
      spellcraft: 6,
      "knowledge.arcana": 6,
      "knowledge.planes": 6,
      perception: 6,
      linguistics: 6,
      fly: 6,
    },
    items: [
      { pack: "pf1.items", name: "Headband of Vast Intelligence +2", equipped: true },
      { pack: "pf1.items", name: "Ring of Protection +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Mage Armor", level: 6 },
          { name: "Shield", level: 6 },
          { name: "Bull's Strength", level: 6 },
        ],
      },
      conditions: { conditions: ["grappled"], drain: { con: 2 }, negativeLevels: 1 },
    },
  },
  {
    id: "dwarf-cleric-3-barbarian-2",
    race: "Dwarf",
    alignment: "cn",
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 14, cha: 10 },
    classes: [
      { name: "Cleric", level: 3, hp: 18 },
      { name: "Barbarian", level: 2, hp: 14 },
    ],
    feats: ["Power Attack", "Toughness", "Iron Will"],
    skills: { heal: 3, "knowledge.religion": 3, climb: 2, perception: 2 },
    items: [
      { pack: "pf1.armors-and-shields", name: "Scale Mail", equipped: true },
      { pack: "pf1.items", name: "Belt of Giant Strength +2", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Rage", level: 2 },
          { name: "Bless", level: 3 },
        ],
      },
      conditions: { conditions: ["sickened", "entangled"] },
    },
  },
  {
    id: "half-orc-two-handed-fighter-5",
    race: "Half-Orc",
    flexibleAbility: "str",
    alignment: "cn",
    abilities: { str: 16, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    classes: [{ name: "Fighter", level: 5, hp: 34 }],
    feats: [
      "Power Attack",
      "Cleave",
      "Toughness",
      "Iron Will",
      "Great Fortitude",
      "Improved Initiative",
    ],
    skills: { climb: 5, acrobatics: 5, intimidate: 5 },
    items: [{ pack: "pf1.armors-and-shields", name: "Breastplate", equipped: true }],
    // APG p. 108: Shattering Strike replaces bravery, Overhand Chop replaces
    // armor training 1, and the archetype's weapon training replaces the base one.
    archetype: {
      name: "Fighter (Two-Handed Fighter)",
      features: [
        "Shattering Strike (Two-Handed Fighter)",
        "Overhand Chop (Two-Handed Fighter)",
        "Weapon Training (Two-Handed Fighter)",
      ],
      replaces: ["Bravery", "Armor Training", "Weapon Training"],
    },
    // ARG p. 52: Rock Climber replaces Intimidating, the race's +2 Intimidate.
    racialTraits: {
      names: ["Sacred Tattoo", "Rock Climber"],
      replacesRaceChanges: ["skill.intimidate"],
    },
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Heroism", level: 5 },
          { name: "Shield of Faith", level: 5 },
        ],
      },
      conditions: { conditions: ["frightened"] },
    },
  },
];
