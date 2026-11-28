/**
 * The expanded Improved Familiar table's remaining species: undead (sootwing
 * bat, beheaded, isitoq), constructs (clockwork familiar, familiar automaton),
 * a plant (mandragora), and an aberration (smokeshade). Hand-authored
 * clean-room from the published stat blocks (Monster Codex, Bestiary 2/4/5,
 * Construct Handbook, Nidal) — see `types.ts` for the modeling rules.
 *
 * Shard-wide choices:
 *   - Undead have no Constitution score; `fortAbility: "cha"` with a Con 10
 *     placeholder keeps the save formula honest.
 *   - Feat skill bonuses (Alertness, Skill Focus, ...) are folded into
 *     `skillRacialMods`, so they survive a master with more ranks, mirroring
 *     the save-feat precedent in `familiar.ts`.
 *   - Printed dodge/deflection AC bonuses have no field here and are called
 *     out per entry instead of being baked into `naturalArmor`.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_EXPANDED_OTHERS: Readonly<Record<string, ImprovedFamiliar>> = {
  // Monster Codex p.88. baseSaves: Fort -1 - (-1) Cha, Ref 1 - 1 Dex, Will 4
  // - 1 Wis. naturalArmor 1 solves AC 14 (10 + 1 Dex + 2 size + 1). Fly +9
  // is Dex 1 + size 4 + good 4 at 0 ranks; Perception +5 is 1 rank + Wis 1 +
  // class 3, and the printed (+9 while using blindsense) is the +4 racial
  // bonus noted on the sheet.
  "sootwing-bat": {
    name: "Sootwing Bat",
    size: "tiny",
    typeKind: "undead",
    creatureType: "Undead",
    hd: 2,
    abilities: { str: 5, dex: 12, con: 10, wis: 13, cha: 8 },
    ownInt: 2,
    fortAbility: "cha",
    baseSaves: { fort: 0, ref: 0, will: 3 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus disease and paralysis" }],
    speeds: { land: 5, fly: 40 },
    senses: ["blindsense 20 ft."],
    flyManeuverability: "good",
    ownSkillRanks: { per: 1 },
    classSkills: ["clm", "dis", "fly", "int", "kar", "kre", "per", "sen", "spl", "ste"],
    defenses: { immune: ["undead traits"] },
    specialNotes: [
      "Undead: has no Constitution score; its Fortitude save uses Charisma",
      "Channel resistance +2",
      "A sootwing bat familiar grants its master +1 channel resistance (if the master has any)",
      "Paralysis (bite): DC 10, 1d4+1 rounds; elves are immune",
      "Disease (bite): ghoul fever, Fort DC 10, onset 1 day, 1/day, 1d3 Con and 1d3 Dex, cure 2 consecutive saves",
      "Perception +9 while using blindsense (a +4 racial bonus)",
      "Own feats: Weapon Finesse",
    ],
    prereq: { casterLevel: 5, masterAlignment: { moral: ["E"], label: "any evil" } },
    source: "Monster Codex p.88 (expanded Improved Familiar table)",
  },

  // Bestiary 4 p.17. baseSaves: Fort 0 - 0 Cha, Ref 2 - 2 Dex, Will 2 - 0
  // Wis. naturalArmor 0 (AC 14 = 10 + 2 Dex + 2 size). Fly +14 is Dex 2 +
  // size 4 + perfect 8 at 0 ranks. Mindless in the wild, so no ownInt: the
  // familiar takes the Int its master's level grants.
  beheaded: {
    name: "Beheaded",
    size: "tiny",
    typeKind: "undead",
    creatureType: "Undead",
    hd: 1,
    abilities: { str: 11, dex: 15, con: 10, wis: 11, cha: 10 },
    fortAbility: "cha",
    baseSaves: { fort: 0, ref: 0, will: 2 },
    naturalArmor: 0,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d2" }],
    speeds: { fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    classSkills: ["clm", "dis", "fly", "int", "kar", "kre", "per", "sen", "spl", "ste"],
    defenses: { immune: ["undead traits"] },
    specialNotes: [
      "Undead: has no Constitution score; its Fortitude save uses Charisma",
      "Mindless in the wild; as a familiar it gains the Intelligence its master's level grants",
      "Cannot be tripped",
    ],
    prereq: { casterLevel: 3, alignment: "NE" },
    source: "Bestiary 4 p.17 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.57. baseSaves: Fort 1 - 0 Con, Ref 5 - 2 Dex (Lightning
  // Reflexes +2 folded in, so 3), Will 2 - 1 Wis. naturalArmor 2 solves AC 18
  // after the +2 dodge from swift reactions, which this module does not model.
  // Fly +19 is Dex 2 + size 4 + perfect 8 + 2 ranks + class 3; Perception +5
  // is 2 ranks + Wis 1 + the folded Alertness +2, and Sense Motive +3 is the
  // Alertness bonus alone. Fly is its only class skill: constructs have none,
  // but a fly speed makes Fly one.
  "clockwork-familiar": {
    name: "Clockwork Familiar",
    size: "tiny",
    typeKind: "construct",
    creatureType: "Construct (clockwork)",
    hd: 3,
    abilities: { str: 10, dex: 14, con: 10, wis: 13, cha: 11 },
    ownInt: 11,
    baseSaves: { fort: 1, ref: 3, will: 1 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus 1d6 electricity" }],
    speeds: { land: 30, fly: 50 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "perfect",
    skillRacialMods: { per: 2, sen: 2 },
    ownSkillRanks: { fly: 2, per: 2, ste: 2 },
    classSkills: ["fly"],
    defenses: {
      dr: "5/adamantine",
      resist: ["cold 10", "fire 10"],
      immune: ["construct traits"],
      weaknesses: ["vulnerability to electricity"],
    },
    languages: ["Common"],
    specialNotes: [
      "Construct: has no Constitution score, so its Fortitude save uses no ability modifier",
      "Advice: grants its master +2 on Craft and Use Magic Device checks",
      "Swift reactions: gains Improved Initiative and Lightning Reflexes as bonus feats and a +2 dodge bonus to AC; the dodge bonus is not folded into the derived AC",
      "Winding: must be wound with a key and stays active for 1 day per Hit Die",
      "Item installation: carries one magic item in its body and can drain it for effects (see source)",
      "Must be crafted by its master from clockwork pieces worth 500 gp",
      "Own feats: Alertness, Improved Initiative, Lightning Reflexes, Weapon Finesse",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.57 (expanded Improved Familiar table)",
  },

  // Construct Handbook p.24. baseSaves: Fort 1 - 0 Con, Ref 3 - 2 Dex, Will 1
  // - 0 Wis. naturalArmor 2 solves AC 14 only with the Tiny size bonus left
  // out; the printed AC and Stealth both omit it (derived AC +2, Stealth +8),
  // while CMB/CMD do include it. Intelligent construct supplies the automaton
  // class skills (all Knowledge skills, Stealth, and more). Skills: 2 ranks
  // each in Diplomacy, Spellcraft, and Use Magic Device; 3 each in Perception,
  // Stealth, and Knowledge (arcana), the last standing in for the printed
  // "any one"; Climb +7 is Str -1 + the climb-speed +8 at 0 ranks.
  "familiar-automaton": {
    name: "Familiar Automaton",
    size: "tiny",
    typeKind: "construct",
    creatureType: "Construct (automaton, extraplanar)",
    hd: 3,
    abilities: { str: 8, dex: 15, con: 10, wis: 10, cha: 14 },
    ownInt: 14,
    baseSaves: { fort: 1, ref: 1, will: 1 },
    naturalArmor: 2,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d3", note: "plus disease" },
      { name: "Claw", count: 2, damageDice: "1d2" },
    ],
    speeds: { land: 20, climb: 30 },
    senses: ["darkvision 120 ft.", "low-light vision"],
    skillAbilityOverrides: { clm: "str" },
    ownSkillRanks: { dip: 2, kar: 3, per: 3, spl: 2, ste: 3, umd: 2 },
    classSkills: [
      "clm",
      "crf",
      "dip",
      "fly",
      "int",
      "kar",
      "kdu",
      "ken",
      "kge",
      "khi",
      "klo",
      "kna",
      "kno",
      "kpl",
      "kre",
      "per",
      "sen",
      "spl",
      "ste",
      "umd",
    ],
    defenses: {
      dr: "5/adamantine",
      fastHealing: 2,
      resist: ["cold 10", "sonic 10"],
      immune: ["construct traits", "electricity"],
      weaknesses: ["vulnerable mind"],
    },
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "atWill", cl: 3 },
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 3, note: "self only" },
      { slug: "magic-missile", name: "Magic Missile", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "plane-shift",
        name: "Plane Shift",
        frequency: { uses: 1, per: "week" },
        cl: 3,
        note: "self plus 5 lbs. of objects only",
      },
    ],
    languages: ["Common"],
    specialNotes: [
      "Construct: has no Constitution score, so its Fortitude save uses no ability modifier",
      "Telepathy (touch)",
      "Automaton core: a destroyed automaton leaves a core that can be harvested with a Spellcraft check",
      "Intelligent construct: gains the automaton class skills, including all Knowledge skills and Stealth",
      "Vulnerable mind: not immune to mind-affecting effects",
      "Disease (bite): arcane fever, Fort DC 13, onset 1d3 days, 1/day, 1d3 Dex and 1d3 Int, cure 2 consecutive saves",
      "Printed AC (14) and Stealth (+8) omit the Tiny size bonus; the derived sheet adds it (+2 AC, +8 Stealth)",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, masterAlignment: { law: ["L"], label: "any lawful" } },
    source: "Construct Handbook p.24 (expanded Improved Familiar table)",
  },

  // Bestiary 4 p.159. baseSaves: Fort 0 - 0 Cha, Ref 1 - 1 Dex, Will 5 - 2
  // Wis. naturalArmor 0 (AC 15 = 10 + 1 Dex + 4 size). Fly +15 is Dex 1 +
  // size 6 + perfect 8 at 0 ranks; Perception +7 and Stealth +18 both
  // reconcile at 2 ranks with the class-skill bonus.
  isitoq: {
    name: "Isitoq",
    size: "dim",
    typeKind: "undead",
    creatureType: "Undead",
    hd: 2,
    abilities: { str: 4, dex: 13, con: 10, wis: 14, cha: 11 },
    ownInt: 7,
    fortAbility: "cha",
    baseSaves: { fort: 0, ref: 0, will: 3 },
    naturalArmor: 0,
    attacks: [
      { name: "Slam", count: 1, damageDice: "1d2" },
      { name: "Wing", count: 2, damageDice: "1d1", note: "plus daze" },
    ],
    speeds: { land: 5, fly: 60 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { per: 2, ste: 2 },
    classSkills: ["clm", "dis", "fly", "int", "kar", "kre", "per", "sen", "spl", "ste"],
    defenses: { immune: ["undead traits"] },
    languages: ["Common (can't speak)"],
    specialNotes: [
      "Undead: has no Constitution score; its Fortitude save uses Charisma",
      "Cannot be tripped",
      "Daze (wing): DC 11 Will or dazed for 1 round; mind-affecting fear",
      "Tears of anguish: full-round ranged touch within 30 ft., DC 11, same effect as daze",
      "Visual sensor: its master can see through its eye out to 60 ft.; some detection spells have a 5% chance per caster level of working through it",
      "Own feats: Weapon Finesse",
    ],
    prereq: { casterLevel: 5, masterAlignment: { moral: ["E"], label: "any evil" } },
    source: "Bestiary 4 p.159 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.185. baseSaves: Fort 7 - 3 Con, Ref 7 - 4 Dex (Lightning
  // Reflexes +2 folded in, so 3), Will 2 - 1 Wis. naturalArmor 2 solves AC 17
  // (10 + 4 Dex + 1 size + 2). Climb +10 is Str 2 + the climb-speed +8 at 0
  // ranks; Perception +9 is 2 ranks + Wis 1 + class 3 + the folded Skill
  // Focus +3; Stealth +14 is 3 ranks + Dex 4 + size 4 + class 3.
  mandragora: {
    name: "Mandragora",
    size: "sm",
    typeKind: "plant",
    creatureType: "Plant",
    hd: 5,
    abilities: { str: 15, dex: 18, con: 17, wis: 13, cha: 10 },
    ownInt: 8,
    baseSaves: { fort: 4, ref: 3, will: 1 },
    naturalArmor: 2,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d6", note: "plus grab" },
      { name: "Slam", count: 2, damageDice: "1d4", note: "plus poison" },
    ],
    speeds: { land: 40, burrow: 10, climb: 40 },
    senses: ["low-light vision"],
    skillRacialMods: { per: 3 },
    skillAbilityOverrides: { clm: "str" },
    ownSkillRanks: { per: 2, ste: 3 },
    classSkills: ["per", "ste"],
    defenses: {
      resist: ["acid 5", "cold 5", "electricity 10"],
      immune: ["plant traits"],
      weaknesses: ["vulnerable to supernatural darkness"],
    },
    languages: ["Abyssal", "Common"],
    specialNotes: [
      "Poison (slam): Fort DC 15, 1/round for 4 rounds, confusion and fatigue, cure: no saves, but an 'act normally' result on the confusion behavior table ends the effect",
      "Blood drain: 1d2 Con at the end of its turn while grappling a foe",
      "Shriek: once per day, 30-ft. spread, DC 15 Will or nauseated for 1d4 rounds; sonic, mind-affecting",
      "Vulnerable to supernatural darkness: slowed as the slow spell",
      "Stealth +22 in vegetation (a +8 racial bonus)",
      "Own feats: Lightning Reflexes, Skill Focus (Perception), Weapon Finesse",
    ],
    prereq: { casterLevel: 9, alignment: "CE" },
    source: "Bestiary 2 p.185 (expanded Improved Familiar table)",
  },

  // Nidal, Land of Shadows p.64. baseSaves: Fort 2 - 1 Con, Ref 5 - 2 Dex
  // (Lightning Reflexes +2 folded in, so 3), Will 5 - 1 Wis. naturalArmor 0:
  // AC 15 is 10 + 2 Dex + 2 size + the incorporeal +1 deflection, which this
  // module does not model. Every skill reconciles at 2-4 ranks with the
  // class-skill bonus; the aberration type's "Knowledge (pick one)" class
  // skill is modeled as planes.
  smokeshade: {
    name: "Smokeshade",
    size: "tiny",
    typeKind: "aberration",
    creatureType: "Aberration (extraplanar, incorporeal)",
    hd: 4,
    abilities: { str: 10, dex: 15, con: 12, wis: 13, cha: 11 },
    ownInt: 8,
    baseSaves: { fort: 1, ref: 3, will: 4 },
    naturalArmor: 0,
    attacks: [
      { name: "Tendril", count: 1, damageDice: "2d6", note: "negative energy plus cloying shade" },
    ],
    speeds: { land: 10, fly: 60 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "good",
    ownSkillRanks: { acr: 4, fly: 2, per: 4, ste: 2 },
    classSkills: ["acr", "clm", "esc", "fly", "int", "kpl", "per", "spl", "ste", "sur", "swm"],
    defenses: { sr: 13 },
    languages: ["Aklo (can't speak)"],
    specialNotes: [
      "Incorporeal: has no Strength score, takes half damage from corporeal sources, can pass through solid objects, and cannot trip or grapple",
      "Printed AC includes a +1 deflection bonus, not folded into the derived AC",
      "Amorphous: immune to precision damage and critical hits",
      "Cloying shade (tendril): the target takes a -2 penalty on attack rolls and Perception checks and gains concealment from nonadjacent attackers for 1 round",
      "Hide in plain sight: can use Stealth while observed within 10 ft. of dim light",
      "Misty form: cannot speak or enter water, and is treated as Tiny for wind effects",
      "Telepathy 60 ft.",
      "Own feats: Improved Initiative, Lightning Reflexes",
    ],
    prereq: { casterLevel: 7, alignment: "NE" },
    source: "Nidal, Land of Shadows p.64 (expanded Improved Familiar table)",
  },
};
