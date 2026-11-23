import type { OracleSpec } from "../specs.js";

/** Wizards, sorcerers, bards, magi and other arcane casters. */
export const ARCANE_SPECS: OracleSpec[] = [
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
];
