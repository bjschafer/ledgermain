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
  {
    id: "human-fighter-3-rogue-4",
    race: "Human",
    flexibleAbility: "str",
    alignment: "cn",
    abilities: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 8 },
    classes: [
      { name: "Fighter", level: 3, hp: 22 },
      { name: "Rogue", level: 4, hp: 20 },
    ],
    feats: [
      "Toughness",
      "Iron Will",
      "Great Fortitude",
      "Lightning Reflexes",
      "Dodge",
      "Mobility",
      "Weapon Finesse",
    ],
    skills: {
      acrobatics: 7,
      climb: 7,
      disableDevice: 7,
      perception: 7,
      stealth: 7,
      intimidate: 3,
    },
    items: [
      {
        pack: "pf1.armors-and-shields",
        name: "Chain Shirt",
        equipped: true,
        material: { id: "mithral", maxDex: 6, acp: 0, spellFailure: 10 },
      },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
    ],
    // ARG p. 72: Heart of the Streets replaces Skilled, the human's extra
    // skill rank per level, and adds a +1 racial bonus on Reflex saves.
    racialTraits: {
      names: ["Heart of the Streets"],
      replacesRaceChanges: ["bonusSkillRanks"],
    },
    scenarios: {
      base: {},
      grappled: { conditions: ["grappled"] },
      haste: { buffs: [{ name: "Haste", level: 7 }] },
      enlarged: { buffs: [{ name: "Enlarge Person", level: 7 }] },
    },
  },
  {
    id: "elf-wizard-7",
    race: "Elf",
    alignment: "n",
    abilities: { str: 8, dex: 16, con: 14, int: 16, wis: 12, cha: 10 },
    classes: [{ name: "Wizard", level: 7, hp: 30 }],
    feats: ["Toughness", "Iron Will", "Great Fortitude", "Lightning Reflexes"],
    skills: {
      "knowledge.arcana": 7,
      spellcraft: 7,
      fly: 7,
      "knowledge.planes": 7,
      perception: 7,
    },
    items: [
      { pack: "pf1.items", name: "Bracers of Armor +1", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Mage Armor", level: 7 },
          { name: "Shield", level: 7 },
        ],
      },
      drained: { drain: { con: 2 } },
    },
  },
  {
    id: "half-orc-paladin-5-sorcerer-2",
    race: "Half-Orc",
    flexibleAbility: "cha",
    alignment: "lg",
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 15 },
    classes: [
      { name: "Paladin", level: 5, hp: 34 },
      { name: "Sorcerer", level: 2, hp: 8 },
    ],
    feats: ["Toughness", "Iron Will", "Great Fortitude", "Lightning Reflexes"],
    skills: {
      diplomacy: 6,
      "knowledge.religion": 5,
      "knowledge.local": 1,
      senseMotive: 1,
    },
    items: [
      { pack: "pf1.armors-and-shields", name: "Breastplate", equipped: true },
      { pack: "pf1.armors-and-shields", name: "Heavy Steel Shield", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
      { pack: "pf1.items", name: "Amulet of Natural Armor +1", equipped: true },
    ],
    // ARG p. 52: City-Raised replaces weapon familiarity (which the half-orc
    // race item doesn't carry as a change) and adds +2 on Knowledge (local).
    racialTraits: {
      names: ["City-Raised"],
      replacesRaceChanges: [],
    },
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Bless", level: 5 },
          { name: "Divine Favor", level: 5 },
        ],
      },
      shaken: { conditions: ["shaken"] },
    },
  },
  {
    id: "halfling-bard-7-archaeologist",
    race: "Halfling",
    alignment: "ng",
    abilities: { str: 10, dex: 16, con: 14, int: 10, wis: 10, cha: 16 },
    classes: [{ name: "Bard", level: 7, hp: 38 }],
    feats: ["Toughness", "Iron Will", "Great Fortitude", "Lightning Reflexes"],
    skills: {
      perception: 7,
      bluff: 7,
      diplomacy: 7,
      acrobatics: 7,
      useMagicDevice: 6,
      disableDevice: 4,
    },
    items: [{ pack: "pf1.armors-and-shields", name: "Leather Armor", equipped: true }],
    // Ultimate Combat p. 32: Archaeologist's Luck replaces bardic performance
    // (and its performance types), Clever Explorer replaces versatile
    // performance, Uncanny Dodge replaces well-versed, Trap Sense replaces
    // inspire competence, and Evasion replaces suggestion.
    archetype: {
      name: "Bard (Archaeologist)",
      features: [
        "Archaeologist's Luck (Archaeologist)",
        "Clever Explorer (Archaeologist)",
        "Uncanny Dodge (Archaeologist)",
        "Trap Sense (Archaeologist)",
        "Rogue Talents (Archaeologist)",
        "Evasion (Archaeologist)",
      ],
      replaces: [
        "Bardic Performance",
        "Inspire Courage",
        "Fascinate",
        "Countersong",
        "Distraction",
        "Versatile Performance",
        "Well-Versed",
        "Inspire Competence",
        "Suggestion",
      ],
    },
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Heroism", level: 7 },
          { name: "Shield of Faith", level: 7 },
        ],
      },
      sickened: { conditions: ["sickened"] },
    },
  },
  {
    id: "elf-fighter-7-lore-warden",
    race: "Elf",
    alignment: "ln",
    abilities: { str: 16, dex: 14, con: 14, int: 13, wis: 12, cha: 10 },
    classes: [{ name: "Fighter", level: 7, hp: 46 }],
    feats: [
      "Toughness",
      "Iron Will",
      "Great Fortitude",
      "Lightning Reflexes",
      "Dodge",
      "Mobility",
      "Blind-Fight",
      "Step Up",
      "Combat Expertise",
    ],
    skills: {
      ride: 7,
      climb: 7,
      swim: 7,
      "knowledge.dungeoneering": 7,
      "knowledge.engineering": 7,
    },
    items: [
      { pack: "pf1.armors-and-shields", name: "Chainmail", equipped: true },
      { pack: "pf1.armors-and-shields", name: "Heavy Steel Shield", equipped: true },
      { pack: "pf1.items", name: "Belt of Giant Strength +2", equipped: true },
    ],
    // Adventurer's Guide p. 144: Scholastic replaces bravery; Skill Over
    // Strength and Swords Secret replace armor training (and armor mastery).
    archetype: {
      name: "Fighter (Lore Warden)",
      features: [
        "Scholastic (Lore Warden)",
        "Skill Over Strength (Lore Warden)",
        "Swords Secret (Lore Warden)",
      ],
      replaces: ["Bravery", "Armor Training"],
    },
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Bull's Strength", level: 7 },
          { name: "Barkskin", level: 7 },
        ],
      },
      shaken: { conditions: ["shaken"] },
    },
  },
  {
    id: "dwarf-fighter-4-rogue-4-wizard-4",
    race: "Dwarf",
    alignment: "ln",
    abilities: { str: 16, dex: 14, con: 14, int: 14, wis: 12, cha: 8 },
    classes: [
      { name: "Fighter", level: 4, hp: 28 },
      { name: "Rogue", level: 4, hp: 20 },
      { name: "Wizard", level: 4, hp: 16 },
    ],
    feats: [
      "Toughness",
      "Iron Will",
      "Great Fortitude",
      "Lightning Reflexes",
      "Dodge",
      "Mobility",
      "Combat Casting",
      "Blind-Fight",
      "Step Up",
    ],
    skills: {
      acrobatics: 12,
      climb: 12,
      disableDevice: 12,
      perception: 12,
      stealth: 12,
      "knowledge.arcana": 12,
    },
    items: [
      { pack: "pf1.armors-and-shields", name: "Chain Shirt", equipped: true },
      { pack: "pf1.armors-and-shields", name: "Light Steel Shield", equipped: true },
      { pack: "pf1.items", name: "Belt of Giant Strength +2", equipped: true },
      { pack: "pf1.items", name: "Cloak of Resistance +1", equipped: true },
    ],
    scenarios: {
      base: {},
      buffs: {
        buffs: [
          { name: "Haste", level: 12 },
          { name: "Heroism", level: 12 },
        ],
      },
      drained: { drain: { str: 2 } },
      shaken: { conditions: ["shaken"] },
    },
  },
];
