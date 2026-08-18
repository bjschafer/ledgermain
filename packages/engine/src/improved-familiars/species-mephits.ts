/**
 * The ten mephits (air/dust/earth/fire/ice/magma/ooze/salt/steam/water) —
 * the CRB Improved Familiar table's "Mephit (any type)" CL 7 row. Hand
 * authored clean room from the published Bestiary stat blocks (verified via
 * d20pfsrd.com's raw page text, not its AI-summarized extraction, after a
 * mismatch surfaced during authoring; see the Fly-skill note below) — see
 * `types.ts` for the authoring rules. The ten share one chassis: Small
 * outsider, 3 HD (3d10+3), Str 13/Dex 15/Con 12/Int 6/Wis 11/Cha 14, AC
 * breakdown +2 Dex/+3 natural/+1 size (+1 dodge on nine of the ten, see
 * magma below), Fort +2/Ref +5/Will +3, 2 claws +5 (1d3+1), a breath weapon
 * every 4 rounds (Reflex DC 13), Bluff +8/Fly +10/Perception +6/Stealth +12,
 * a 1/day summon (level 2, 1 mephit of the same type 25%), and darkvision 60
 * ft. Author each entry in full rather than factoring a helper, so every
 * per-element departure (subtype, speed, defenses, SLA) stays visible next
 * to its citation.
 *
 * Reverse-derivation, solved once against the shared chassis and reused
 * verbatim across all ten (every printed number below is identical entry to
 * entry unless called out): `baseSaves` subtracts the ability mods back out
 * (Fort 2 - Con 1 = 1, Ref 5 - Dex 2 = 3, Will 3 - Wis 0 = 3) giving a
 * poor-Fort/good-Ref/good-Will array, not the all-good array a native
 * outsider would normally carry; `naturalArmor` is 3 (the printed AC's "+3
 * natural"); and `classSkills: ["blf", "fly", "per", "ste"]` with 3 ranks
 * each reproduces every printed skill total (e.g. Stealth 12 = Dex 2 + size
 * 4 + 3 ranks + class 3) except Fly on the two perfect fliers, below.
 *
 * Fly skill gap (air, dust only): both fly at "perfect" maneuverability,
 * whose RAW +8 skill bonus alone (plus Dex 2, size 2) already totals 12 at
 * ZERO ranks, exceeding the printed Fly +10 with no way to subtract back
 * down to it. This is a printed-book inconsistency, not an authoring error
 * (confirmed against the raw stat block text, not just an AI summary) —
 * `fly` is left out of these two entries' `ownSkillRanks` since any rank
 * count only widens the gap, and the resulting sheet reads Fly +12 for
 * both, a documented departure from the printed +10.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_MEPHITS: Readonly<Record<string, ImprovedFamiliar>> = {
  "air-mephit": {
    name: "Air Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (air)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 60 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    // Fly omitted: perfect maneuverability alone overshoots the printed Fly
    // +10 at zero ranks — see the module doc comment.
    ownSkillRanks: { blf: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
    },
    slas: [
      // "1/hour" printed frequencies have no per-hour meter in this schema
      // (only "day"/"week"); modeled as an unmetered `atWill` with a
      // `note` reminder, an accepted v1 simplification for an
      // effectively-per-encounter ability.
      { slug: "blur", name: "Blur", frequency: "atWill", cl: 6, note: "1/hour" },
      { slug: "gust-of-wind", name: "Gust of Wind", frequency: { uses: 1, per: "day" }, cl: 6 },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in gusty or windy areas.",
      "Breath weapon (Su): 15-ft. cone of sand and grit, 1d8 slashing damage, Reflex DC 13 half, usable every 4 rounds as a standard action.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "dust-mephit": {
    name: "Dust Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (air)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 50 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    // Fly omitted: same perfect-maneuverability overshoot as the air mephit.
    ownSkillRanks: { blf: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
    },
    slas: [
      { slug: "blur", name: "Blur", frequency: "atWill", cl: 6, note: "1/hour" },
      { slug: "wind-wall", name: "Wind Wall", frequency: { uses: 1, per: "day" }, cl: 6 },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in dusty environments.",
      "Breath weapon (Su): 15-ft. cone of dust, 1d4 slashing damage plus sickened 3 rounds, Reflex DC 13 negates sickened and halves damage, usable every 4 rounds as a standard action.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "earth-mephit": {
    name: "Earth Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (earth)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "average",
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
    },
    slas: [
      {
        slug: "soften-earth-and-stone",
        name: "Soften Earth and Stone",
        frequency: { uses: 1, per: "day" },
        cl: 6,
      },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only while underground.",
      "Breath weapon (Su): 15-ft. cone of rocks, 1d8 bludgeoning damage, Reflex DC 13 half, usable every 4 rounds as a standard action.",
      "Change size (Su): 1/day, as enlarge person but works only on itself (a 2nd-level spell equivalent). Not modeled.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "fire-mephit": {
    name: "Fire Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (fire)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "average",
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
      immune: ["fire"],
      weaknesses: ["vulnerability to cold"],
    },
    slas: [
      {
        slug: "scorching-ray",
        name: "Scorching Ray",
        frequency: "atWill",
        cl: 6,
        note: "1/hour",
      },
      { slug: "heat-metal", name: "Heat Metal", frequency: { uses: 1, per: "day" }, cl: 6 },
    ],
    languages: ["Common", "Ignan"],
    specialNotes: [
      "Fast healing 2 works only while touching fire.",
      "Breath weapon (Su): 15-ft. cone of flames, 1d8 fire damage, Reflex DC 13 half, usable every 4 rounds as a standard action.",
      "Summon: 1/day, 25% chance to summon 1 fire mephit. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "ice-mephit": {
    name: "Ice Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (cold)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "average",
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
      immune: ["cold"],
      weaknesses: ["vulnerability to fire"],
    },
    slas: [
      {
        slug: "magic-missile",
        name: "Magic Missile",
        frequency: "atWill",
        cl: 6,
        note: "1/hour",
      },
      { slug: "chill-metal", name: "Chill Metal", frequency: { uses: 1, per: "day" }, cl: 6 },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in areas below freezing.",
      "Breath weapon (Su): 15-ft. cone of ice, 1d4 cold damage plus sickened 3 rounds, Reflex DC 13 negates sickened and halves damage, usable every 4 rounds as a standard action.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "magma-mephit": {
    name: "Magma Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (fire)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "average",
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
      immune: ["fire"],
      weaknesses: ["vulnerability to cold"],
    },
    slas: [
      { slug: "pyrotechnics", name: "Pyrotechnics", frequency: { uses: 1, per: "day" }, cl: 6 },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in contact with magma or lava.",
      "Breath weapon (Su): 15-ft. cone of fire, 1d8 fire damage, Reflex DC 13 half, usable every 4 rounds as a standard action.",
      "Magma form (Su): 1/hour, becomes a 3-foot pool of lava for up to 10 minutes: DR rises to 20/magic, it cannot attack, it moves 10 ft. per round through small openings and cracks, and anything touching it takes 1d6 fire damage. Not modeled.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      // The printed AC (16, touch 13) omits the dodge bonus its own Feats
      // line lists (a book inconsistency the other nine mephits don't
      // share, confirmed against the raw stat block text); kept as printed
      // rather than corrected, and it happens to match this module's own
      // unmodeled-dodge posture exactly, so no AC adjustment was needed.
      "Own feats: Dodge (the printed AC does not include a dodge bonus despite the feat being listed, kept as printed), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "ooze-mephit": {
    name: "Ooze Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (water)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, swim: 30 },
    senses: ["darkvision 60 ft."],
    // No fly speed; the printed Fly +10 is size (2) + Dex (2) + 3 ranks + 3
    // class, same reconciliation as the other non-perfect fliers.
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
    },
    slas: [
      { slug: "acid-arrow", name: "Acid Arrow", frequency: "atWill", cl: 6, note: "1/hour" },
      {
        slug: "stinking-cloud",
        name: "Stinking Cloud",
        frequency: { uses: 1, per: "day" },
        cl: 6,
      },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in wet or muddy environments.",
      "Breath weapon (Su): 15-ft. cone of slime, 1d4 acid damage plus sickened 3 rounds, Reflex DC 13 negates sickened and halves damage, usable every 4 rounds as a standard action.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "salt-mephit": {
    name: "Salt Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (earth)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "average",
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
    },
    slas: [
      // Printed as "1/hour" (unlike this table's other glitterdust-alike
      // entries elsewhere, which are 1/day) — verified against the raw
      // stat block text, not assumed from the usual frequency.
      { slug: "glitterdust", name: "Glitterdust", frequency: "atWill", cl: 6, note: "1/hour" },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in arid environments.",
      "Breath weapon (Su): 15-ft. cone of salt crystals, 1d4 slashing damage plus sickened 3 rounds, Reflex DC 13 negates sickened and halves damage, usable every 4 rounds as a standard action.",
      "Dehydrate (Su): 1/day, drains moisture in a 20-foot radius centered on itself for 2d8 damage (Fortitude DC 14 half, caster level 6th); plants and aquatic creatures take a -2 penalty on the save (a 2nd-level spell equivalent). Not modeled.",
      "Summon: 1/day, 25% chance to summon 1 salt mephit. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "steam-mephit": {
    name: "Steam Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (fire)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "average",
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
      immune: ["fire"],
      weaknesses: ["vulnerability to cold"],
    },
    slas: [{ slug: "blur", name: "Blur", frequency: "atWill", cl: 6, note: "1/hour" }],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only in boiling water or steam.",
      "Breath weapon (Su): 15-ft. cone of steam, 1d4 fire damage plus sickened 3 rounds, Reflex DC 13 negates sickened and halves damage, usable every 4 rounds as a standard action.",
      "Boiling rain (Su): 1/day, creates a rainstorm of boiling water in a 20-foot square for 2d6 fire damage (Fortitude DC 14 half, caster level 6th; a 2nd-level spell equivalent). Not modeled.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },

  "water-mephit": {
    name: "Water Mephit",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (water)",
    hd: 3,
    abilities: { str: 13, dex: 15, con: 12, wis: 11, cha: 14 },
    ownInt: 6,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 3,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d3" }],
    speeds: { land: 30, swim: 30 },
    senses: ["darkvision 60 ft."],
    ownSkillRanks: { blf: 3, fly: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "per", "ste"],
    defenses: {
      dr: "5/magic",
      fastHealing: 2,
    },
    slas: [
      { slug: "acid-arrow", name: "Acid Arrow", frequency: "atWill", cl: 6, note: "1/hour" },
      {
        slug: "stinking-cloud",
        name: "Stinking Cloud",
        frequency: { uses: 1, per: "day" },
        cl: 6,
      },
    ],
    languages: ["Common", "one appropriate elemental language (Aquan, Auran, Ignan, or Terran)"],
    specialNotes: [
      "Fast healing 2 works only while underwater.",
      "Breath weapon (Su): 15-ft. cone of acid, 1d8 acid damage, Reflex DC 13 half, usable every 4 rounds as a standard action.",
      "Summon: 1/day, 25% chance to summon 1 mephit of the same type. Not modeled.",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative (its own +4 initiative bonus is not modeled).",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary p.202 (CRB Improved Familiar table)",
  },
};
