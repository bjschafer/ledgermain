import type { OracleSpec } from "../specs.js";

/** Multiclass builds, archetypes and alternate racial traits. */
export const HYBRID_SPECS: OracleSpec[] = [
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
