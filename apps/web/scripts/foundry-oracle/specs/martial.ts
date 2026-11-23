import type { OracleSpec } from "../specs.js";

/** Fighters, barbarians, rangers, paladins, monks, rogues and other martial classes. */
export const MARTIAL_SPECS: OracleSpec[] = [
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
];
