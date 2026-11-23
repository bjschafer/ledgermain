import type { OracleSpec } from "../specs.js";

/** Clerics, druids, oracles, inquisitors and other divine casters. */
export const DIVINE_SPECS: OracleSpec[] = [
  {
    id: "human-cleric-1",
    race: "Human",
    flexibleAbility: "wis",
    alignment: "lg",
    abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 16, cha: 10 },
    classes: [{ name: "Cleric", level: 1, hp: 8 }],
    feats: ["Toughness", "Iron Will"],
    skills: { heal: 1, "knowledge.religion": 1 },
    items: [
      { pack: "pf1.armors-and-shields", name: "Chainmail", equipped: true },
      { pack: "pf1.armors-and-shields", name: "Heavy Wooden Shield", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Bless", level: 1 },
          { name: "Shield of Faith", level: 1 },
        ],
      },
      conditions: { conditions: ["shaken"] },
    },
  },
  {
    id: "human-cleric-12",
    race: "Human",
    flexibleAbility: "wis",
    alignment: "lg",
    abilities: { str: 16, dex: 14, con: 12, int: 8, wis: 14, cha: 10 },
    classes: [{ name: "Cleric", level: 12, hp: 63 }],
    feats: [
      "Toughness",
      "Iron Will",
      "Great Fortitude",
      "Lightning Reflexes",
      "Improved Initiative",
      "Combat Casting",
      "Channel Smite",
    ],
    skills: { heal: 12, "knowledge.religion": 12 },
    items: [
      { pack: "pf1.armors-and-shields", name: "Full Plate", equipped: true, enh: 2 },
      { pack: "pf1.armors-and-shields", name: "Heavy Steel Shield", equipped: true, enh: 1 },
      { pack: "pf1.items", name: "Cloak of Resistance +2", equipped: true },
      { pack: "pf1.items", name: "Headband of Inspired Wisdom +4", equipped: true },
      { pack: "pf1.items", name: "Ring of Protection +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Prayer (Positive)", level: 12 },
          { name: "Divine Power", level: 12 },
          { name: "Magic Vestment", level: 12 },
        ],
      },
      conditions: { conditions: ["sickened"] },
      negativeLevels: { negativeLevels: 2 },
    },
  },
  {
    id: "dwarf-cleric-17",
    race: "Dwarf",
    alignment: "lg",
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 14, cha: 10 },
    classes: [{ name: "Cleric", level: 17, hp: 88 }],
    feats: [
      "Toughness",
      "Iron Will",
      "Great Fortitude",
      "Lightning Reflexes",
      "Improved Initiative",
      "Combat Casting",
      "Channel Smite",
      "Turn Undead",
      "Improved Channel",
      "Extra Channel",
    ],
    skills: { heal: 17, "knowledge.religion": 17 },
    items: [
      {
        pack: "pf1.armors-and-shields",
        name: "Full Plate",
        equipped: true,
        enh: 2,
        // Mithral: +2 max Dex, ACP reduced by 3, ASF reduced by 10%.
        material: { id: "mithral", maxDex: 3, acp: 3, spellFailure: 25 },
      },
      { pack: "pf1.armors-and-shields", name: "Heavy Steel Shield", equipped: true, enh: 2 },
      { pack: "pf1.items", name: "Cloak of Resistance +3", equipped: true },
      { pack: "pf1.items", name: "Headband of Inspired Wisdom +6", equipped: true },
      { pack: "pf1.items", name: "Ring of Protection +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Bless", level: 17 },
          { name: "Prayer (Positive)", level: 17 },
          { name: "Divine Power", level: 17 },
        ],
      },
      conditions: { conditions: ["shaken"], drain: { wis: 4 } },
    },
  },
  {
    id: "human-druid-6",
    race: "Human",
    flexibleAbility: "wis",
    alignment: "n",
    abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 16, cha: 8 },
    classes: [{ name: "Druid", level: 6, hp: 33 }],
    feats: ["Toughness", "Iron Will", "Great Fortitude", "Natural Spell"],
    skills: { climb: 6, survival: 6, "knowledge.nature": 6, perception: 6 },
    items: [
      { pack: "pf1.armors-and-shields", name: "Hide Armor", equipped: true },
      { pack: "pf1.armors-and-shields", name: "Light Wooden Shield", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Barkskin", level: 6 },
          { name: "Owl's Wisdom", level: 6 },
          { name: "Longstrider", level: 6 },
        ],
      },
      conditions: { conditions: ["fatigued"] },
    },
  },
  {
    id: "human-oracle-6",
    race: "Human",
    flexibleAbility: "cha",
    alignment: "cg",
    abilities: { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    classes: [{ name: "Oracle", level: 6, hp: 33 }],
    feats: ["Toughness", "Iron Will", "Great Fortitude", "Lightning Reflexes"],
    skills: { diplomacy: 6, heal: 6, "knowledge.religion": 6, spellcraft: 6 },
    items: [
      { pack: "pf1.armors-and-shields", name: "Chain Shirt", equipped: true, enh: 1 },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
      { pack: "pf1.items", name: "Headband of Alluring Charisma +2", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Divine Favor", level: 6 },
          { name: "Shield of Faith", level: 6 },
          { name: "Eagle's Splendor", level: 6 },
        ],
      },
      conditions: { conditions: ["shaken"] },
      negativeLevels: { negativeLevels: 1 },
    },
  },
  {
    id: "human-inquisitor-6",
    race: "Human",
    flexibleAbility: "wis",
    alignment: "ln",
    abilities: { str: 14, dex: 14, con: 14, int: 10, wis: 15, cha: 8 },
    classes: [{ name: "Inquisitor", level: 6, hp: 33 }],
    feats: ["Toughness", "Iron Will", "Great Fortitude", "Lightning Reflexes"],
    skills: {
      perception: 6,
      intimidate: 6,
      spellcraft: 6,
      stealth: 6,
      "knowledge.religion": 6,
      survival: 6,
    },
    items: [
      { pack: "pf1.armors-and-shields", name: "Breastplate", equipped: true, enh: 1 },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
      { pack: "pf1.items", name: "Headband of Inspired Wisdom +2", equipped: true },
    ],
    scenarios: {
      base: {},
      judgments: {
        buffs: [
          { name: "Justice", level: 6 },
          { name: "Destruction", level: 6 },
        ],
      },
      conditions: { conditions: ["sickened"] },
    },
  },
];
