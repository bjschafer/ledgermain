/**
 * The expanded Improved Familiar table's outsiders not covered by the CRB
 * and splat shards: the five Bestiary 5 wysps, plus the augur, caypup,
 * cythnigot, doru, esipil, harbinger, impundulu, mamiwa, raktavarna,
 * shikigami, spirit oni, tripurasura, and typhilipede. Hand-authored
 * clean-room from the published Bestiary 2/3/5, Familiar Folio, Ire of the
 * Storm, and Pathfinder #40/#103 stat blocks.
 *
 * Shard-wide modeling choices, mirroring the earlier shards:
 *   - Feat skill bonuses (Alertness, Skill Focus) are folded into
 *     `skillRacialMods` so they survive a master with more ranks; feat save
 *     bonuses (Lightning Reflexes, Iron Will) are folded into `baseSaves`.
 *   - Dodge, insight, and deflection AC bonuses have no field here and stay
 *     out of `naturalArmor`, called out per entry in `specialNotes`.
 *   - A printed skill the vendored sidecar omits is restored when it
 *     reconciles against the published block; a situational bonus (jump,
 *     weather, a conditional save) stays a note.
 *   - Impundulu models the familiar form its Familiar Service ability
 *     actually grants, not the CR 11 bird; see the entry.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_EXPANDED_OUTSIDERS: Readonly<Record<string, ImprovedFamiliar>> = {
  // Bestiary 5 p.282: baseSaves subtract the ability mods back out (Fort +5,
  // Ref +6, Will +2 - Con 2/Dex 3/Wis 1); AC 15 is Dex 3 + Tiny size 2 with
  // no natural armor. Every printed skill reconciles at its listed rank count
  // with the class-skill +3; Fly +15 includes Tiny +4 and good +4. The eight
  // totals need 19 ranks, one more than a 3-HD outsider's 18 skill points, so
  // the printed totals are kept as-is. The printed tendril attack and damage
  // include the wysp's own resonance +2.
  "aether-wysp": {
    name: "Aether Wysp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (aether, elemental)",
    hd: 3,
    abilities: { str: 10, dex: 17, con: 14, wis: 13, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Tendril", count: 2, damageDice: "1d3" }],
    speeds: { fly: 60 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "good",
    ownSkillRanks: { blf: 3, dev: 3, fly: 1, kpl: 1, per: 3, sen: 2, slt: 3, ste: 3 },
    classSkills: ["blf", "crf", "dev", "fly", "kpl", "per", "sen", "slt", "ste"],
    defenses: { immune: ["elemental traits"] },
    languages: ["Aquan", "Auran", "Ignan", "Terran"],
    specialNotes: [
      "Resonance (30 ft.): +2 competence on attack, damage, and racial ability DCs for creatures sharing its element (kineticists +1); the printed stats include it, the derived attack does not",
      "Living Battery (Ex): immediate action, kills itself to heal a creature benefiting from its resonance 2 HP per HD; Servitor (Ex): aid another grants +4 instead of +2",
      "Lesser Telekinesis (Su): move objects weighing up to 10 pounds at a distance, as mage hand but supernatural and able to move magical objects",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.282 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.282: baseSaves subtract the ability mods back out (Fort +4,
  // Ref +7, Will +2 - Con 1/Dex 4/Wis 1); AC 16 is Dex 4 + Tiny size 2, no
  // natural armor. Fly +20 is Dex 4 + Tiny 4 + perfect 8 + 1 rank + class 3.
  // The sidecar drops the printed Knowledge (religion) +4, restored here at
  // 1 rank with class +3.
  "air-wysp": {
    name: "Air Wysp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (air, elemental)",
    hd: 3,
    abilities: { str: 10, dex: 19, con: 12, wis: 13, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Tendril", count: 2, damageDice: "1d3" }],
    speeds: { fly: 100 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { blf: 3, fly: 1, kar: 1, kpl: 3, kre: 1, per: 3, sen: 3, ste: 3 },
    classSkills: ["blf", "crf", "fly", "kar", "kpl", "kre", "per", "sen", "ste"],
    defenses: { immune: ["elemental traits"] },
    languages: ["Auran"],
    specialNotes: [
      "Resonance (30 ft.): +2 competence on attack, damage, and racial ability DCs for creatures sharing its element (kineticists +1); the printed stats include it, the derived attack does not",
      "Living Battery (Ex): immediate action, kills itself to heal a creature benefiting from its resonance 2 HP per HD; Servitor (Ex): aid another grants +4 instead of +2",
      "Own feats: Flyby Attack, Weapon Finesse",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.282 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.282: baseSaves subtract the ability mods back out (Fort +5,
  // Ref +4, Will +2 - Con 2/Dex 1/Wis 1); AC 14 includes +1 natural armor.
  // Climb +8 is Str 2 + 3 ranks + class 3 (a burrow speed grants no Climb
  // bonus), and the three Knowledge totals are Int 0 + 2 ranks + class 3.
  "earth-wysp": {
    name: "Earth Wysp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (earth, elemental)",
    hd: 3,
    abilities: { str: 14, dex: 13, con: 14, wis: 13, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 1,
    attacks: [{ name: "Tendril", count: 2, damageDice: "1d3" }],
    speeds: { land: 20, burrow: 20 },
    senses: ["darkvision 60 ft.", "tremorsense 30 ft."],
    ownSkillRanks: { blf: 3, clm: 3, kdu: 2, ken: 2, kpl: 2, per: 3, sen: 3 },
    classSkills: ["blf", "clm", "crf", "kdu", "ken", "kpl", "per", "sen", "ste"],
    defenses: { dr: "1/-", immune: ["elemental traits"] },
    languages: ["Terran"],
    specialNotes: [
      "Resonance (30 ft.): +2 competence on attack, damage, and racial ability DCs for creatures sharing its element (kineticists +1); the printed stats include it, the derived attack does not",
      "Living Battery (Ex): immediate action, kills itself to heal a creature benefiting from its resonance 2 HP per HD; Servitor (Ex): aid another grants +4 instead of +2",
      "Own feats: Power Attack, Toughness",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.282 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.283: baseSaves subtract the ability mods back out (Fort +4,
  // Ref +5, Will +2 - Con 1/Dex 2/Wis 1); AC 14 is Dex 2 + Tiny size 2, no
  // natural armor. Every printed skill reconciles at 3 ranks with class +3;
  // the printed burn DC (14) is 2 above the Con-based formula.
  "fire-wysp": {
    name: "Fire Wysp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (elemental, fire)",
    hd: 3,
    abilities: { str: 10, dex: 15, con: 12, wis: 13, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Tendril", count: 2, damageDice: "1d3", note: "plus burn" }],
    speeds: { land: 60, fly: 20 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "poor",
    ownSkillRanks: { blf: 3, int: 3, kpl: 3, per: 3, sen: 3, ste: 3 },
    classSkills: ["blf", "crf", "int", "kpl", "per", "sen", "ste"],
    defenses: { immune: ["elemental traits", "fire"], weaknesses: ["vulnerability to cold"] },
    languages: ["Ignan"],
    specialNotes: [
      "Resonance (30 ft.): +2 competence on attack, damage, and racial ability DCs for creatures sharing its element (kineticists +1); the printed stats include it, the derived attack does not",
      "Living Battery (Ex): immediate action, kills itself to heal a creature benefiting from its resonance 2 HP per HD; Servitor (Ex): aid another grants +4 instead of +2",
      "Burn (1d6 fire, DC 14) on a tendril hit",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.283 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.283: baseSaves subtract the ability mods back out (Fort +5,
  // Ref +4, Will +2 - Con 2/Dex 1/Wis 1); AC 13 is Dex 1 + Tiny size 2, no
  // natural armor. The sidecar drops four printed skills; Knowledge (planes)
  // +5, Sense Motive +7, Stealth +14, and Swim +15 all reconcile here (Swim
  // uses Dex + 8 for its swim speed + 3 ranks + class 3).
  "water-wysp": {
    name: "Water Wysp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (elemental, water)",
    hd: 3,
    abilities: { str: 13, dex: 12, con: 14, wis: 13, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Tendril", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, swim: 90 },
    senses: ["darkvision 60 ft."],
    ownSkillRanks: { blf: 3, hea: 2, kpl: 2, per: 3, sen: 3, ste: 2, swm: 3 },
    classSkills: ["blf", "crf", "hea", "kpl", "per", "sen", "ste", "swm"],
    defenses: { immune: ["elemental traits"] },
    languages: ["Aquan"],
    specialNotes: [
      "Resonance (30 ft.): +2 competence on attack, damage, and racial ability DCs for creatures sharing its element (kineticists +1); the printed stats include it, the derived attack does not",
      "Living Battery (Ex): immediate action, kills itself to heal a creature benefiting from its resonance 2 HP per HD; Servitor (Ex): aid another grants +4 instead of +2",
      "Drench (Ex): a touch puts out Large or smaller nonmagical flames; it can dispel magical fire it touches as dispel magic (CL = its HD)",
      "Own feats: Power Attack, Weapon Focus (tendril)",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.283 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.171: baseSaves subtract the ability mods back out (Fort +2,
  // Ref +8, Will +4 - Con 1/Dex 3/Wis 1); the Ref base carries Lightning
  // Reflexes' +2 (folded, as elsewhere). AC 17 includes +2 natural armor; Fly
  // +15 is Dex 3 + Tiny 4 + perfect 8 at 0 ranks. The printed gore +4 uses
  // Str rather than the Dex its Weapon Finesse would suggest.
  augur: {
    name: "Augur",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (evil, extraplanar, kyton, lawful)",
    hd: 3,
    abilities: { str: 8, dex: 17, con: 12, wis: 12, cha: 7 },
    ownInt: 13,
    baseSaves: { fort: 1, ref: 5, will: 3 },
    naturalArmor: 2,
    attacks: [{ name: "Gore", count: 1, damageDice: "1d4", note: "plus bleed" }],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { blf: 3, esc: 3, int: 3, per: 3, sen: 3, slt: 3, ste: 3 },
    classSkills: ["blf", "crf", "esc", "int", "kpl", "per", "sen", "slt", "ste"],
    defenses: { dr: "5/good or silver", immune: ["cold"] },
    slas: [
      { slug: "deathwatch", name: "Deathwatch", frequency: "constant", cl: 6 },
      { slug: "bleed", name: "Bleed", frequency: "atWill", cl: 6 },
      { slug: "mage-hand", name: "Mage Hand", frequency: "atWill", cl: 6 },
      { slug: "open-close", name: "Open/Close", frequency: "atWill", cl: 6 },
      {
        slug: "inflict-light-wounds",
        name: "Inflict Light Wounds",
        frequency: { uses: 3, per: "day" },
        cl: 6,
      },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common", "Infernal (can't speak)"],
    specialNotes: [
      "Regeneration 2 (good weapons and spells, silver weapons)",
      "Bleed (1d2) on a gore hit",
      "Unnerving gaze (30 ft., DC 9): shaken for 1 round",
      "Own feats: Improved Initiative, Lightning Reflexes",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Bestiary 3 p.171 (expanded Improved Familiar table)",
  },

  // Familiar Folio p.29: baseSaves subtract the ability mods back out (Fort
  // +3, Ref +3, Will +2 - Con 2/Dex 0/Wis -1); AC 14 is +3 natural armor and
  // Small size +1. Acrobatics, Intimidate, Perception, and Sense Motive all
  // reconcile at 3 ranks with class +3.
  caypup: {
    name: "Caypup",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (native)",
    hd: 3,
    abilities: { str: 15, dex: 11, con: 14, wis: 9, cha: 12 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4" }],
    speeds: { land: 30 },
    senses: ["darkvision 60 ft.", "scent"],
    ownSkillRanks: { acr: 3, int: 3, per: 3, sen: 3 },
    classSkills: ["acr", "blf", "crf", "int", "kpl", "per", "sen", "ste"],
    defenses: { dr: "5/cold iron" },
    slas: [
      { slug: "knock", name: "Knock", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "open-close", name: "Open/Close", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "stabilize", name: "Stabilize", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "dimension-door",
        name: "Dimension Door",
        frequency: { uses: 1, per: "day" },
        cl: 3,
        note: "self plus 5 lbs. of objects only",
      },
    ],
    languages: ["Celestial (can't speak)"],
    specialNotes: [
      "Thunderous Growl (Su): 3/day, 15 ft., DC 12 Will or the target cannot attack the caypup (as sanctuary) for 3 rounds; can also shield an adjacent ally; 1d6-round cooldown",
      "Own feats: Dimensional Agility, Improved Initiative",
    ],
    prereq: { casterLevel: 7, alignment: "CG" },
    source: "Familiar Folio p.29 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.221: baseSaves subtract the ability mods back out (Fort +1,
  // Ref +6, Will +2 - Con 0/Dex 1/Wis -1); the Ref base carries Lightning
  // Reflexes' +2. AC 14 includes +1 natural armor. The sidecar drops Knowledge
  // (planes) +6, restored here at 3 ranks; Acrobatics +11 when jumping is a
  // +4 racial bonus this module cannot scope to jump checks.
  cythnigot: {
    name: "Cythnigot",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (chaotic, evil, extraplanar, qlippoth)",
    hd: 3,
    abilities: { str: 12, dex: 12, con: 11, wis: 8, cha: 7 },
    ownInt: 11,
    baseSaves: { fort: 1, ref: 5, will: 3 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d6", note: "plus spores" }],
    speeds: { land: 40, fly: 60 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "good",
    ownSkillRanks: { acr: 3, fly: 3, kna: 3, kpl: 3, per: 3, ste: 3 },
    classSkills: ["acr", "blf", "crf", "fly", "kna", "kpl", "per", "sen", "ste"],
    defenses: {
      dr: "5/cold iron or lawful",
      resist: ["acid 10", "electricity 10", "fire 10"],
      immune: ["cold", "poison", "mind-affecting effects"],
    },
    slas: [
      { slug: "detect-law", name: "Detect Law", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "fly", name: "Fly", frequency: "constant", cl: 6 },
      {
        slug: "soften-earth-and-stone",
        name: "Soften Earth and Stone",
        frequency: { uses: 1, per: "day" },
        cl: 6,
      },
      { slug: "warp-wood", name: "Warp Wood", frequency: { uses: 1, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 6,
        note: "six questions",
      },
    ],
    languages: ["Abyssal"],
    specialNotes: [
      "Horrific appearance (10 ft., DC 9): sickened for 1 round; a creature that saves is immune to all cythnigots' horrific appearance for 24 hours",
      "Spores (Su): bite, Fort DC 11 or entangled (disease effect); a new DC 11 Fort save as a standard action ends it; plant creatures take -4",
      "Master: immune to all cythnigots' horrific appearance and gains +4 on saves against any qlippoth's horrific appearance",
      "Must already have a Tiny animal familiar to gain a cythnigot familiar",
      "Acrobatics +11 when jumping (+4 racial bonus, not folded into the derived skill)",
      "Telepathy (touch)",
      "Own feats: Lightning Reflexes, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "CE" },
    source: "Bestiary 2 p.221 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.86: baseSaves subtract the ability mods back out (Fort +3,
  // Ref +4, Will +4 - Con 0/Dex 3/Wis 1); AC 18 includes +3 natural armor. The
  // sidecar drops Knowledge (planes) +6, restored here at 3 ranks; see in
  // darkness is a div-subtype sense the sidecar also omits.
  doru: {
    name: "Doru",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (div, evil, extraplanar)",
    hd: 3,
    abilities: { str: 8, dex: 17, con: 10, wis: 12, cha: 14 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 1, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4", note: "plus poison" }],
    speeds: { land: 20, fly: 40 },
    senses: ["darkvision 60 ft.", "see in darkness"],
    flyManeuverability: "perfect",
    ownSkillRanks: { blf: 3, kar: 3, kpl: 3, per: 3, spl: 3, ste: 3 },
    classSkills: ["blf", "crf", "kar", "kpl", "per", "sen", "spl", "ste"],
    defenses: {
      dr: "10/cold iron or good",
      sr: 13,
      resist: ["acid 10", "electricity 10"],
      immune: ["fire", "poison"],
    },
    slas: [
      { slug: "detect-good", name: "Detect Good", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 6, note: "self only" },
      { slug: "charm-person", name: "Charm Person", frequency: { uses: 3, per: "day" }, cl: 6 },
      { slug: "minor-image", name: "Minor Image", frequency: { uses: 3, per: "day" }, cl: 6 },
      { slug: "suggestion", name: "Suggestion", frequency: { uses: 1, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Abyssal", "Celestial", "Infernal"],
    specialNotes: [
      "Poison (bite): Fort DC 11, 1/round for 6 rounds, 1d2 Wis, cure 2 consecutive saves",
      "Telepathy 100 ft.",
      "Own feats: Weapon Finesse, Weapon Focus (bite)",
    ],
    prereq: { casterLevel: 7, alignment: "NE" },
    source: "Bestiary 3 p.86 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.213: baseSaves subtract the ability mods back out (Fort +4,
  // Ref +4, Will +4 - Con 1/Dex 3/Wis 1); AC 16 includes +1 natural armor.
  // Intimidate +10 folds Skill Focus (Intimidate)'s +3 into skillRacialMods so
  // it survives a master with more ranks.
  esipil: {
    name: "Esipil",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (evil, extraplanar, sahkil)",
    hd: 3,
    abilities: { str: 8, dex: 16, con: 13, wis: 12, cha: 12 },
    ownInt: 9,
    baseSaves: { fort: 3, ref: 1, will: 3 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4", note: "plus grab" },
      { name: "Claw", count: 2, damageDice: "1d3" },
    ],
    speeds: { land: 30 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillRacialMods: { int: 3 },
    ownSkillRanks: { acr: 3, int: 3, kpl: 3, per: 3, ste: 3 },
    classSkills: ["acr", "blf", "crf", "int", "kpl", "per", "sen", "ste"],
    defenses: {
      dr: "5/good",
      resist: ["cold 10", "electricity 10", "sonic 10"],
      immune: ["death effects", "disease", "fear effects", "poison"],
    },
    slas: [
      { slug: "cause-fear", name: "Cause Fear", frequency: "atWill", cl: 3 },
      { slug: "mage-hand", name: "Mage Hand", frequency: "atWill", cl: 3 },
      { slug: "mirror-image", name: "Mirror Image", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "contact-other-plane",
        name: "Contact Other Plane",
        frequency: { uses: 1, per: "week" },
        cl: 3,
      },
    ],
    languages: ["Abyssal", "Celestial", "Common", "Infernal"],
    specialNotes: [
      "Bewildering Assault (Su): a critical hit with a natural attack confuses the target for 1 round",
      "Look of Fear (Su): gaze, 30 ft., DC 14, shaken for 1 round (DC includes emotional focus)",
      "Grab (Small); change shape (Tiny cat or dog; beast shape II)",
      "Sahkil traits: spirit touch (natural weapons count as ghost touch), easy to call (counts as 4 fewer HD for calling effects), emotional focus (+2 DC on fear and emotion effects)",
      "Telepathy (touch)",
      "Own feats: Improved Initiative, Skill Focus (Intimidate)",
    ],
    prereq: { casterLevel: 7, alignment: "NE" },
    source: "Bestiary 5 p.213 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.18: baseSaves subtract the ability mods back out (Fort +1,
  // Ref +5, Will +4 - Con 0/Dex 2/Wis 1); AC 16 includes +1 natural armor and
  // the Dodge feat's +1 dodge, which is not folded into the derived AC. The
  // sidecar drops Fly +20, Knowledge (planes) +6, and Knowledge (religion) +6;
  // all three reconcile here at 3 ranks with class +3.
  harbinger: {
    name: "Harbinger",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (archon, extraplanar, good, lawful)",
    hd: 3,
    abilities: { str: 6, dex: 15, con: 11, wis: 13, cha: 12 },
    ownInt: 10,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 1,
    attacks: [{ name: "Blade", count: 3, damageDice: "1d4" }],
    speeds: { fly: 50 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "perfect",
    ownSkillRanks: { dip: 3, fly: 3, kpl: 3, kre: 3, per: 3, sen: 3 },
    classSkills: ["blf", "crf", "dip", "fly", "kpl", "kre", "per", "sen", "ste"],
    defenses: { dr: "5/evil", immune: ["electricity", "petrification"] },
    slas: [
      { slug: "detect-evil", name: "Detect Evil", frequency: "constant", cl: 6 },
      {
        slug: "dancing-lights",
        name: "Dancing Lights",
        frequency: "atWill",
        cl: 6,
        note: "duration lasts until dismissed",
      },
      {
        slug: "cure-light-wounds",
        name: "Cure Light Wounds",
        frequency: { uses: 3, per: "day" },
        cl: 6,
      },
      {
        slug: "protection-from-evil",
        name: "Protection from Evil",
        frequency: { uses: 3, per: "day" },
        cl: 6,
      },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Celestial", "Draconic", "Infernal"],
    specialNotes: [
      "Blades (Ex): three primary natural attacks with a +1 enhancement bonus, treated as magic and good-aligned",
      "Wrath (Su): once per minute, 2d6 force damage to adjacent creatures, DC 12 Reflex halves, may omit any target",
      "Disassemble (Su): as a move action, becomes gaseous but keeps its fly speed and DR; cannot fit through gaps under 1 inch",
      "Minor Archon (Ex): lacks the aura of menace and teleport of greater archons; truespeech (understands and is understood by any creature with a language)",
      "+4 racial bonus on saves against poison",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative",
    ],
    prereq: { casterLevel: 7, alignment: "LG" },
    source: "Bestiary 3 p.18 (expanded Improved Familiar table)",
  },

  // Pathfinder #40 p.81: Familiar Service turns the CR 11 bird into a familiar
  // with "the normal statistics of an imp or quasit," keeping only the
  // impundulu's subtypes, NE alignment, and DR. This entry uses the imp
  // chassis (Bestiary p.78) with that DR; the quasit chassis is the other
  // legal reading. Base saves, AC, and skills are therefore the imp's, and
  // Witchcraft is the master-facing addition.
  impundulu: {
    name: "Impundulu",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (evil, extraplanar, shapechanger)",
    hd: 3,
    abilities: { str: 10, dex: 17, con: 10, wis: 12, cha: 14 },
    ownInt: 13,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 1,
    attacks: [{ name: "Sting", count: 1, damageDice: "1d4", note: "plus poison (Fort DC 13)" }],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft.", "see in darkness"],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 3, blf: 3, fly: 3, kar: 3, kpl: 3, per: 3, spl: 3 },
    classSkills: ["acr", "blf", "fly", "kar", "kpl", "per", "spl"],
    defenses: {
      dr: "10/magic and cold iron",
      fastHealing: 2,
      resist: ["acid 10", "cold 10"],
      immune: ["fire", "poison"],
    },
    slas: [
      { slug: "detect-good", name: "Detect Good", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 6, note: "self only" },
      { slug: "augury", name: "Augury", frequency: { uses: 1, per: "day" }, cl: 6 },
      { slug: "suggestion", name: "Suggestion", frequency: { uses: 1, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common", "Infernal"],
    specialNotes: [
      "Familiar Service (Su): uses the normal statistics of an imp or quasit, keeping only the impundulu's subtypes, NE alignment, and DR 10/magic and cold iron",
      "This entry uses imp statistics; a quasit-stat impundulu is the other legal option",
      "Witchcraft (Su): as a witch's familiar, the master adds the patron spells of Agility, Elements, or Transformation (chosen at binding) to spells known",
      "Poison (sting): Fort DC 13, 1/round for 6 rounds, 1d2 Dex, cure 1 save",
      "Change shape (boar, giant spider, rat, or raven; beast shape I)",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "NE" },
    source: "Pathfinder #40 p.81 (Familiar Service); Bestiary p.78 (imp chassis)",
  },

  // Ire of the Storm p.63: baseSaves subtract the ability mods back out (Fort
  // +4, Ref +5, Will +2 - Con 1/Dex 2/Wis 1); AC 15 includes the Dodge feat's
  // +1 dodge, not folded into the derived AC. Acrobatics +8 and Fly +20 both
  // reconcile at 3 ranks; the printed jump and weather bonuses are situational
  // and stay notes.
  mamiwa: {
    name: "Mamiwa",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (air, elemental, native, water)",
    hd: 3,
    abilities: { str: 7, dex: 15, con: 12, wis: 12, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 20, fly: 50, swim: 50 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 3, fly: 3, per: 3 },
    classSkills: ["acr", "blf", "crf", "fly", "kpl", "per", "sen", "ste"],
    defenses: {
      resist: ["cold or electricity 5"],
      immune: ["elemental traits"],
      weaknesses: ["vulnerability to fire"],
    },
    languages: ["Common"],
    specialNotes: [
      "Elemental Alignment (Su): each day at sunrise, choose air (electricity resistance 5, electricity damage with its blast and infusion, Auran) or water (cold resistance 5, cold damage with its blast and infusion, Aquan)",
      "Elemental Blast (Su): ranged touch attack, 2d6 cold or electricity damage depending on today's alignment",
      "Elemental Infusion (Su): merge with one weapon or armor; an infused weapon deals +1d6 energy damage, infused armor grants its wearer resistance 5; 1 minute per HD per day in 1-minute increments",
      "Rain Speaker (Ex): telepathy 100 ft. in precipitation, but only with creatures also being rained on; also speaks with animals",
      "Acrobatics +0 when jumping (-8 racial) and +4 Survival to predict the weather, both situational and not folded into the derived skills",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Ire of the Storm p.63 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.229: baseSaves subtract the ability mods back out (Fort +3,
  // Ref +6, Will +4 - Con 2/Dex 3/Wis 1); AC 17 includes +2 natural armor. The
  // sidecar's skill line keeps only Bluff and Climb (Perception is in its
  // senses line); the other printed skills are restored here: Disguise +16,
  // Escape Artist +6, Sense Motive +9, Stealth +17, Swim +11. Alertness' +2
  // Perception/Sense Motive is folded into skillRacialMods; Climb and Swim use
  // Dex plus the +8 climb/swim racial.
  raktavarna: {
    name: "Raktavarna",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (native, rakshasa, shapechanger)",
    hd: 3,
    abilities: { str: 7, dex: 16, con: 15, wis: 13, cha: 14 },
    ownInt: 12,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4", note: "plus poison" }],
    speeds: { land: 20, climb: 20, swim: 20 },
    senses: ["darkvision 60 ft.", "detect magic"],
    skillRacialMods: { blf: 4, dis: 8, per: 2, sen: 2 },
    ownSkillRanks: { blf: 3, clm: 3, dis: 3, esc: 3, per: 3, sen: 3, ste: 3 },
    classSkills: ["blf", "crf", "dis", "kpl", "per", "sen", "ste"],
    defenses: { dr: "5/good or piercing", sr: 17 },
    slas: [
      { slug: "comprehend-languages", name: "Comprehend Languages", frequency: "constant", cl: 6 },
      { slug: "charm-person", name: "Charm Person", frequency: { uses: 1, per: "day" }, cl: 6 },
      { slug: "suggestion", name: "Suggestion", frequency: { uses: 1, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common", "Infernal", "Undercommon"],
    specialNotes: [
      "Detect thoughts (Su): rakshasa trait, CL 18th, DC 13, always as if 3 rounds of concentration; can suppress or resume as a free action",
      "Change shape (Su): full-round action to become a Tiny living object; can attempt Stealth while observed if it stays motionless",
      "Master's Eyes (Su): the master can observe through the raktavarna's darkvision and detect magic at any range, including across planes, while concentrating and with its own sight suppressed; it is stunned for 1d4 rounds if the raktavarna is slain while linked",
      "Poison (Su, bite): Fort DC 13, 1/round for 6 rounds, 1d2 Wis plus modify memory, cure 1 save",
      "Own feats: Alertness (its +2 Perception and Sense Motive are folded into the derived skills), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Bestiary 3 p.229 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.163: baseSaves subtract the ability mods back out (Fort +4,
  // Ref +2, Will +8 - Con 1/Dex 1/Wis 3); the Will base carries Iron Will's +2.
  // AC 15 includes +2 natural armor. The sidecar drops Sense Motive +11,
  // Stealth +15, and Survival +9, restored here at 3 ranks; Alertness' +2
  // Perception/Sense Motive is folded into skillRacialMods.
  shikigami: {
    name: "Shikigami",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (kami, native)",
    hd: 3,
    abilities: { str: 8, dex: 13, con: 12, wis: 17, cha: 14 },
    ownInt: 11,
    baseSaves: { fort: 3, ref: 1, will: 5 },
    naturalArmor: 2,
    attacks: [{ name: "Improvised weapon", count: 1, damageDice: "1d4" }],
    speeds: { land: 30 },
    senses: ["darkvision 60 ft."],
    skillRacialMods: { per: 2, sen: 2 },
    ownSkillRanks: { hea: 3, kna: 3, per: 3, sen: 3, ste: 3, sur: 3 },
    classSkills: ["blf", "crf", "hea", "kna", "kpl", "per", "sen", "ste", "sur"],
    defenses: {
      dr: "5/cold iron",
      fastHealing: 2,
      resist: ["acid 10", "electricity 10", "fire 10"],
      immune: ["bleed", "mind-affecting effects", "petrification", "polymorph"],
    },
    slas: [
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 6, note: "self only" },
      { slug: "statue", name: "Statue", frequency: "atWill", cl: 6, note: "self only" },
      {
        slug: "hide-from-animals",
        name: "Hide from Animals",
        frequency: { uses: 3, per: "day" },
        cl: 6,
      },
      {
        slug: "purify-food-and-drink",
        name: "Purify Food and Drink",
        frequency: { uses: 3, per: "day" },
        cl: 6,
      },
      {
        slug: "commune-with-nature",
        name: "Commune with Nature",
        frequency: { uses: 1, per: "week" },
        cl: 12,
      },
    ],
    languages: ["Common"],
    specialNotes: [
      "Improvised Weapon Mastery (Ex): adds Cha instead of Str to damage with improvised weapons, never provokes attacks of opportunity with a melee improvised weapon, and deals ×3 damage on a critical hit",
      "Ranged improvised weapon: +6 (1d3+2, ×3)",
      "Ward (Su): treats its master as its ward, so its fast healing 2 works only within 120 ft. of the master; it can merge with the master and emerge mounted on it",
      "If its ward (the master) is destroyed while merged, the shikigami dies; if not merged, it loses merge with ward and fast healing and becomes permanently sickened",
      "Own feats: Alertness (its +2 Perception and Sense Motive are folded into the derived skills), Catch Off-Guard (bonus), Iron Will, Throw Anything (bonus)",
    ],
    prereq: { casterLevel: 7, alignment: "LN" },
    source: "Bestiary 3 p.163 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.209: baseSaves subtract the ability mods back out (Fort +2,
  // Ref +7, Will +4 - Con 1/Dex 4/Wis 1); AC 17 includes +1 natural armor. All
  // eight printed skills reconcile at their listed ranks (Acrobatics and
  // Spellcraft have no class-skill +3).
  "spirit-oni": {
    name: "Spirit Oni",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (native, oni)",
    hd: 3,
    abilities: { str: 6, dex: 19, con: 12, wis: 12, cha: 15 },
    ownInt: 13,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Gore", count: 1, damageDice: "1d4", note: "plus poison" },
    ],
    speeds: { land: 10, fly: 30 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "good",
    ownSkillRanks: { acr: 3, blf: 3, fly: 1, kar: 3, per: 3, sen: 3, spl: 3, ste: 2 },
    classSkills: ["blf", "crf", "fly", "kar", "kpl", "per", "sen", "ste"],
    defenses: { fastHealing: 2 },
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 6, note: "self only" },
      { slug: "mage-hand", name: "Mage Hand", frequency: "atWill", cl: 6 },
      { slug: "command", name: "Command", frequency: { uses: 1, per: "day" }, cl: 6 },
      { slug: "sleep", name: "Sleep", frequency: { uses: 1, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common"],
    specialNotes: [
      "Mask Symbiosis (Ex): can be worn as a mask by a willing Small or Medium creature; the wearer sees through its eyes and speaks through its mouth, and gains +2 insight on Perception; the oni must detach to act",
      "Poison (gore): Fort DC 12, 1/round for 6 rounds, 1d2 Cha, cure 2 consecutive saves",
      "Gaining a spirit oni familiar requires crafting an oni mask as part of the ritual (no Craft check or gold cost)",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Bestiary 3 p.209 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.26: baseSaves subtract the ability mods back out (Fort +4,
  // Ref +3, Will +5 - Con 1/Dex 2/Wis 2); AC 16 includes the Dodge feat's +1
  // dodge and a +1 insight bonus, neither folded into the derived AC. The
  // sidecar drops Knowledge (planes) +7, restored here at 3 ranks. The printed
  // poison says "tongue-injury" although the attack is a sting; the note uses
  // the attack.
  tripurasura: {
    name: "Tripurasura",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (asura, evil, extraplanar, lawful)",
    hd: 3,
    abilities: { str: 8, dex: 14, con: 12, wis: 15, cha: 13 },
    ownInt: 13,
    baseSaves: { fort: 3, ref: 1, will: 3 },
    naturalArmor: 0,
    attacks: [{ name: "Sting", count: 1, damageDice: "1d4", note: "plus poison" }],
    speeds: { land: 20 },
    senses: ["darkvision 60 ft."],
    skillRacialMods: { esc: 6, per: 4 },
    ownSkillRanks: { acr: 3, apr: 3, blf: 3, kar: 3, kpl: 3, per: 1, prf: 1, spl: 3, ste: 1 },
    classSkills: ["acr", "blf", "crf", "kpl", "per", "prf", "sen", "ste"],
    defenses: {
      dr: "5/cold iron or good",
      fastHealing: 2,
      resist: ["acid 10", "electricity 10"],
      immune: ["curse effects", "disease", "poison"],
    },
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "feather-fall", name: "Feather Fall", frequency: "atWill", cl: 6 },
      { slug: "levitate", name: "Levitate", frequency: { uses: 3, per: "day" }, cl: 6 },
      { slug: "locate-object", name: "Locate Object", frequency: { uses: 3, per: "day" }, cl: 6 },
      { slug: "spider-climb", name: "Spider Climb", frequency: { uses: 3, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common", "Infernal"],
    specialNotes: [
      "Change shape (Su): always the same Small humanoid form (usually a gnome or human child)",
      "Elusive (Su): under a constant nondetection effect; a caster must succeed at a DC 14 caster level check to overcome it",
      "Poison (sting): Fort DC 12, 1/round for 6 rounds, 1d2 Wis, cure 1 save (the printed block says tongue-injury; the attack is a sting)",
      "+2 racial bonus on saves against enchantment spells",
      "Acrobatics +4 when jumping (-4 racial), situational and not folded into the derived skill",
      "Printed AC also includes a +1 insight bonus, not folded into the derived AC",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Bestiary 3 p.26 (expanded Improved Familiar table)",
  },

  // Pathfinder #103 p.88: baseSaves subtract the ability mods back out (Fort
  // +4, Ref +5, Will +2 - Con 1/Dex 2/Wis 1); AC 14 is Dex 2 + Tiny size 2, no
  // natural armor. Fly +8 is Dex 2 + Tiny 4 + poor -4 + 3 ranks + class 3.
  typhilipede: {
    name: "Typhilipede",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (evil, extraplanar, lawful)",
    hd: 3,
    abilities: { str: 12, dex: 15, con: 12, wis: 13, cha: 8 },
    ownInt: 5,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 30, fly: 30 },
    senses: ["darkvision 120 ft."],
    flyManeuverability: "poor",
    ownSkillRanks: { fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "crf", "fly", "kpl", "per", "sen", "ste"],
    defenses: { immune: ["fire", "poison"], weaknesses: ["light blindness"] },
    languages: ["Infernal (can't speak)"],
    specialNotes: [
      "Aura of Shadow (Su): 10 ft. radius of shadowy darkness; creatures in it, including the typhilipede, have concealment against attackers without low-light vision or darkvision; suppress or reactivate as a swift action",
      "Lumivore (Ex): as a standard action, snuffs out all mundane light sources within 15 ft. (magical light is unaffected)",
      "Poison (bite): Fort DC 12, 1/round for 6 rounds, 1d4 Con, cure 2 consecutive saves",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Pathfinder #103 p.88 (expanded Improved Familiar table)",
  },
};
