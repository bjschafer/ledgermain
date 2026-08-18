/**
 * The CRB Improved Familiar table's CL 7 rows other than the mephits: imp,
 * quasit, homunculus, pseudodragon. Hand-authored clean-room from the
 * published Bestiary stat blocks (aonprd.com / d20pfsrd.com) — see
 * `types.ts` for the authoring rules (reverse-derived `baseSaves`/
 * `ownSkillRanks`, printed prereqs, defenses as display strings, SLA slugs
 * frozen once shipped).
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_CRB_OUTSIDERS: Readonly<Record<string, ImprovedFamiliar>> = {
  // The imp is the coordinator-authored pattern entry — every reverse
  // derivation below was solved against the printed stat block (Bestiary
  // p.78 via d20pfsrd.com): baseSaves subtract the ability mods back out
  // (Fort +1/Ref +6/Will +4 − Con 0/Dex 3/Wis 1), ownSkillRanks solve each
  // printed skill total (e.g. Fly +21 = Dex 3 + size 4 + perfect 8 + 3
  // ranks + class 3), and every reconciling skill is listed in classSkills.
  imp: {
    name: "Imp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (devil, evil, extraplanar, lawful)",
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
      dr: "5/good or silver",
      fastHealing: 2,
      resist: ["acid 10", "cold 10"],
      immune: ["fire", "poison"],
    },
    slas: [
      { slug: "detect-good", name: "Detect Good", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      {
        slug: "invisibility",
        name: "Invisibility",
        frequency: "atWill",
        cl: 6,
        note: "self only",
      },
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
      "Poison (sting): Fort DC 13, 1/round for 6 rounds, 1d2 Dex, cure 1 save",
      "Change shape (boar, giant spider, rat, or raven; beast shape I)",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Bestiary p.78 (CRB Improved Familiar table)",
  },

  // Bestiary p.66 (verified against aonprd.com / d20pfsrd.com): baseSaves
  // subtract the ability mods back out (Fort +1/Ref +5/Will +4 − Con 0/Dex
  // 2/Wis 1), naturalArmor solves the printed AC (16 = 10 + 2 Dex + 2 size +
  // 2 natural), and every printed skill total reconciles with 3 ranks (= its
  // HD) plus the class-skill +3: Bluff/Intimidate/Knowledge (planes) = ranks
  // 3 + class 3 + Cha/Int 0 = 6; Perception = 3 + 3 + Wis 1 = 7; Fly = Dex 2
  // + size 4 + perfect 8 + 3 + 3 = 20; Stealth = Dex 2 + size 8 + 3 + 3 = 16.
  // The printed cause-fear DC (11) and Commune's CL (6th, not the imp's
  // elevated 12th) both come straight off the stat block.
  quasit: {
    name: "Quasit",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (chaotic, demon, evil, extraplanar)",
    hd: 3,
    abilities: { str: 8, dex: 14, con: 11, wis: 12, cha: 11 },
    ownInt: 11,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 2,
    attacks: [
      { name: "Claw", count: 2, damageDice: "1d3", note: "plus poison" },
      { name: "Bite", count: 1, damageDice: "1d4" },
    ],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { blf: 3, fly: 3, int: 3, kpl: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "int", "kpl", "per", "ste"],
    defenses: {
      dr: "5/cold iron or good",
      fastHealing: 2,
      resist: ["acid 10", "cold 10", "fire 10"],
      immune: ["electricity", "poison"],
    },
    slas: [
      { slug: "detect-good", name: "Detect Good", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      {
        slug: "invisibility",
        name: "Invisibility",
        frequency: "atWill",
        cl: 6,
        note: "self only",
      },
      {
        slug: "cause-fear",
        name: "Cause Fear",
        frequency: { uses: 1, per: "day" },
        cl: 6,
        note: "30 foot radius, DC 11",
      },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 6,
        note: "6 questions",
      },
    ],
    languages: ["Abyssal", "Common", "Telepathy (touch)"],
    specialNotes: [
      "Poison (claw): Fort DC 13, 1/round for 6 rounds, 1d2 Dex, cure 2 consecutive saves",
      "Change shape (bat, Small centipede, toad, or wolf; polymorph)",
    ],
    prereq: { casterLevel: 7, alignment: "CE" },
    source: "Bestiary p.66 (CRB Improved Familiar table)",
  },

  // Bestiary p.176: baseSaves subtract the ability mods back out (Fort
  // +0/Ref +4/Will +1 − Con 0/Dex 2/Wis 1); naturalArmor is 0 (printed AC 14
  // = 10 + 2 Dex + 2 size, no natural component). Fly +10 reconciles from
  // Dex 2 + size 4 + good 4 alone, at 0 ranks; Perception +3 and Stealth +12
  // both reconcile from 2 ranks (its HD) with NO class-skill +3 (Dex 2 +
  // size 8 + 2 ranks = 12; Wis 1 + 2 ranks = 3) — a homunculus has no
  // printed class skills, unlike every other species in this file.
  homunculus: {
    name: "Homunculus",
    size: "tiny",
    typeKind: "construct",
    creatureType: "Construct",
    hd: 2,
    // A construct has no Constitution score; 10 (mod +0) stands in as the
    // neutral no-modifier placeholder the `abilities` field requires — see
    // the specialNotes entry below.
    abilities: { str: 8, dex: 15, con: 10, wis: 12, cha: 7 },
    ownInt: 10,
    baseSaves: { fort: 0, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4", note: "plus poison" }],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "good",
    ownSkillRanks: { per: 2, ste: 2 },
    defenses: {
      immune: [
        "construct traits",
        "mind-affecting effects",
        "poison",
        "sleep",
        "paralysis",
        "stunning",
        "disease",
        "death effects",
        "energy drain",
        "ability drain",
        "exhaustion",
        "fatigue",
        "nonlethal damage",
        "ability damage",
        "bleed damage",
      ],
    },
    specialNotes: [
      "Construct: has no Constitution score, so its Fortitude save uses no ability modifier",
      "Poison (bite): Fort DC 13 (includes a +2 racial bonus), 1/minute for 60 minutes, sleep for 1 minute, cure 1 save",
      "Telepathic link with its creator out to 1,500 feet; can convey everything it sees and hears",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary p.176 (CRB Improved Familiar table)",
  },

  // Bestiary p.229: baseSaves subtract the ability mods back out (Fort
  // +4/Ref +5/Will +4 − Con 1/Dex 2/Wis 1, all resolving to the flat 3 that
  // is the good-save value at 2 HD); naturalArmor solves the printed AC (16
  // = 10 + 2 Dex + 2 size + 2 natural). Every printed skill total reconciles
  // with 2 ranks (its HD) plus the class-skill +3: Diplomacy = 2 + 3 + Cha 0
  // = 5; Fly = Dex 2 + size 4 + good 4 + 2 + 3 = 15; Perception/Sense Motive
  // = 2 + 3 + Wis 1 = 6; Survival = 2 + 3 + Wis 1 = 6; Stealth = Dex 2 +
  // size 8 + 2 + 3 + a printed +4 racial bonus = 19 (the further "+23 in
  // forests" is a situational +4 this module deliberately does not bake in,
  // same posture as the rabbit/hawk/owl conditional-bonus notes elsewhere).
  // The printed SR is 12, not the higher value the feat's own progression
  // grants from master level 11 on — {@link deriveFamiliar} takes the max of
  // the two, so this species' own SR only ever matters below that level.
  pseudodragon: {
    name: "Pseudodragon",
    size: "tiny",
    typeKind: "dragon",
    creatureType: "Dragon",
    hd: 2,
    abilities: { str: 7, dex: 15, con: 13, wis: 12, cha: 10 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 3 },
    naturalArmor: 2,
    attacks: [
      { name: "Sting", count: 1, damageDice: "1d3", note: "plus poison" },
      { name: "Bite", count: 1, damageDice: "1d2" },
    ],
    speeds: { land: 15, fly: 60 },
    senses: ["blindsense 60 ft.", "darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "good",
    ownSkillRanks: { dip: 2, fly: 2, per: 2, sen: 2, ste: 2, sur: 2 },
    classSkills: ["dip", "fly", "per", "sen", "ste", "sur"],
    skillRacialMods: { ste: 4 },
    defenses: {
      sr: 12,
      immune: ["paralysis", "sleep"],
    },
    languages: ["Draconic", "Telepathy (60 ft.)"],
    specialNotes: [
      "Poison (sting): Fort DC 14, 1/minute for 10 minutes, sleep for 1 minute, cure 1 save",
      "Racial bonus on Stealth checks improves to +8 in forests",
    ],
    prereq: { casterLevel: 7, alignment: "NG" },
    source: "Bestiary p.229 (CRB Improved Familiar table)",
  },
};
