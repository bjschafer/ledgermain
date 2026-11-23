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
    // A low-Strength penalty reaches a plain longbow's damage but not a
    // crossbow's (CRB p. 144). Elves are proficient with the longbow.
    items: [
      { pack: "pf1.items", name: "Headband of Vast Intelligence +2", equipped: true },
      { pack: "pf1.items", name: "Ring of Protection +1", equipped: true },
      { pack: "pf1.weapons-and-ammo", name: "Longbow", equipped: true },
      { pack: "pf1.weapons-and-ammo", name: "Arrow", quantity: 20 },
      { pack: "pf1.weapons-and-ammo", name: "Light Crossbow", equipped: true },
      { pack: "pf1.weapons-and-ammo", name: "Crossbow Bolt", quantity: 10 },
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
    // Small race: +1 size AC and attack, -1 CMB/CMD, +4 Stealth (CRB p. 195).
    // Enlarge Person steps the size up to Medium and adds Str/Dex size changes.
    id: "gnome-wizard-1",
    race: "Gnome",
    alignment: "ng",
    abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 10, cha: 10 },
    classes: [{ name: "Wizard", level: 1, hp: 6 }],
    feats: ["Toughness"],
    skills: { spellcraft: 1, "knowledge.arcana": 1, perception: 1, fly: 1 },
    // Small weapons: their dice step down from the Medium table, and back up
    // under Enlarge Person. A sling takes the full Strength penalty (CRB
    // p. 144); wizards aren't proficient with it. Carrying more tips Foundry
    // into a medium load once enlarged.
    items: [
      { pack: "pf1.weapons-and-ammo", name: "Quarterstaff", equipped: true },
      { pack: "pf1.weapons-and-ammo", name: "Sling", equipped: true },
      { pack: "pf1.weapons-and-ammo", name: "Sling Bullet", quantity: 1 },
    ],
    scenarios: {
      base: {},
      enlarge: { buffs: [{ name: "Enlarge Person", level: 1 }] },
    },
  },
  {
    id: "elf-wizard-17",
    race: "Elf",
    alignment: "cg",
    abilities: { str: 8, dex: 12, con: 14, int: 18, wis: 10, cha: 8 },
    classes: [{ name: "Wizard", level: 17, hp: 70 }],
    feats: [
      "Toughness",
      "Improved Initiative",
      "Combat Casting",
      "Iron Will",
      "Great Fortitude",
      "Lightning Reflexes",
      "Spell Penetration",
      "Greater Spell Penetration",
      "Arcane Strike",
    ],
    skills: {
      spellcraft: 17,
      "knowledge.arcana": 17,
      "knowledge.planes": 10,
      perception: 10,
      fly: 10,
      linguistics: 5,
    },
    items: [
      { pack: "pf1.items", name: "Headband of Vast Intelligence +4", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +3", equipped: true },
      { pack: "pf1.items", name: "Ring of Protection +2", equipped: true },
      { pack: "pf1.items", name: "Amulet of Natural Armor +2", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Mage Armor", level: 17 },
          { name: "Shield", level: 17 },
          { name: "Haste", level: 17 },
          { name: "Fox's Cunning", level: 17 },
        ],
      },
      // CRB p. 555: drain lowers the score, negative levels stack -1 on checks,
      // attacks, saves, CMB/CMD and skills plus -5 HP each (CRB p. 562).
      conditions: { drain: { int: 4 }, negativeLevels: 2 },
    },
  },
  {
    // The Arcane Bloodline item is a class feature (no Changes), so it only
    // records the choice; its powers don't touch the compared numbers.
    id: "human-sorcerer-12",
    race: "Human",
    flexibleAbility: "cha",
    alignment: "cg",
    abilities: { str: 8, dex: 12, con: 14, int: 10, wis: 10, cha: 16 },
    classes: [{ name: "Sorcerer", level: 12, hp: 50 }],
    feats: [
      "Toughness",
      "Improved Initiative",
      "Combat Casting",
      "Spell Penetration",
      "Greater Spell Penetration",
      "Iron Will",
      "Lightning Reflexes",
    ],
    skills: {
      spellcraft: 12,
      "knowledge.arcana": 12,
      bluff: 6,
      perception: 6,
    },
    items: [
      { pack: "pf1.class-abilities", name: "Arcane Bloodline" },
      { pack: "pf1.items", name: "Cloak of Resistance +2", equipped: true },
      { pack: "pf1.items", name: "Ring of Protection +1", equipped: true },
      // Bracers of armor and Mage Armor are both armor bonuses; only the
      // better one counts (CRB p. 460).
      { pack: "pf1.items", name: "Bracers of Armor +2", equipped: true },
      { pack: "pf1.items", name: "Belt of Incredible Dexterity +2", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Mage Armor", level: 12 },
          { name: "Shield", level: 12 },
          { name: "Haste", level: 12 },
        ],
      },
      conditions: { drain: { dex: 4 } },
    },
  },
  {
    id: "halfling-bard-6",
    race: "Halfling",
    alignment: "cg",
    abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
    classes: [{ name: "Bard", level: 6, hp: 33 }],
    feats: ["Toughness", "Lingering Performance", "Extra Performance"],
    skills: {
      acrobatics: 6,
      bluff: 6,
      diplomacy: 6,
      perception: 6,
      spellcraft: 6,
      stealth: 6,
    },
    items: [
      { pack: "pf1.armors-and-shields", name: "Leather Armor", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
    ],
    scenarios: {
      base: {},
      // Inspire Courage at bard 6 is +2 competence on attack and weapon
      // damage (CRB p. 35); Haste adds its own +1 attack/AC/Reflex.
      performance: {
        buffs: [
          { name: "Inspire Courage", level: 6 },
          { name: "Haste", level: 6 },
        ],
      },
      conditions: { conditions: ["shaken"] },
    },
  },
  {
    id: "human-magus-12",
    race: "Human",
    flexibleAbility: "str",
    alignment: "ng",
    abilities: { str: 16, dex: 14, con: 12, int: 14, wis: 10, cha: 8 },
    classes: [{ name: "Magus", level: 12, hp: 63 }],
    feats: [
      "Toughness",
      "Improved Initiative",
      "Combat Casting",
      "Power Attack",
      "Arcane Strike",
      "Dodge",
      "Iron Will",
    ],
    skills: {
      spellcraft: 12,
      "knowledge.arcana": 12,
      acrobatics: 6,
      perception: 6,
      climb: 6,
    },
    items: [
      { pack: "pf1.armors-and-shields", name: "Leather Armor", equipped: true, enh: 1 },
      { pack: "pf1.items", name: "Ring of Protection +1", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +2", equipped: true },
      { pack: "pf1.items", name: "Amulet of Natural Armor +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Mage Armor", level: 12 },
          { name: "Shield", level: 12 },
          { name: "Haste", level: 12 },
          { name: "Enlarge Person", level: 12 },
        ],
      },
    },
  },
  {
    id: "human-witch-6",
    race: "Human",
    flexibleAbility: "int",
    alignment: "n",
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
    classes: [{ name: "Witch", level: 6, hp: 26 }],
    feats: ["Improved Initiative", "Toughness", "Iron Will", "Combat Casting"],
    skills: {
      spellcraft: 6,
      "knowledge.arcana": 6,
      "knowledge.nature": 6,
      heal: 6,
      perception: 6,
    },
    items: [
      { pack: "pf1.items", name: "Headband of Vast Intelligence +2", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
      { pack: "pf1.items", name: "Bracers of Armor +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Mage Armor", level: 6 },
          { name: "Shield", level: 6 },
          { name: "Fox's Cunning", level: 6 },
        ],
      },
    },
  },
];
