/**
 * The CRB Improved Familiar table's non-templated CL 3/CL 5 rows: dire rat,
 * stirge, and the four Small elementals (air/earth/fire/water). Hand-authored
 * clean-room from the published Bestiary stat blocks (aonprd.com /
 * d20pfsrd.com) — see `types.ts` for the authoring rules (reverse-derived
 * `baseSaves`/`ownSkillRanks`, printed prereqs, defenses as display strings).
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_BASICS: Readonly<Record<string, ImprovedFamiliar>> = {
  // Dire Rat (Bestiary "Dire Rat"): still an ANIMAL, so the animal
  // class-skill set applies automatically (no classSkills field needed) and
  // baseSaves reproduces the standard 1-HD animal progression (2/2/0).
  // AC 14 = 10 + Dex 3 + size 1, no natural armor. Skill Focus (Perception)'s
  // +3 (the printed stat block's only feat) is folded into skillRacialMods
  // since this module has no separate per-species feat-bonus field for
  // skills — same posture as pig's Great Fortitude baked into baseSaves.fort
  // in familiar.ts's BASE_FAMILIARS doc comment. Stealth +11 = Dex 3 + size 4
  // + 1 own rank + class 3.
  "dire-rat": {
    name: "Dire Rat",
    size: "sm",
    typeKind: "animal",
    creatureType: "Animal",
    hd: 1,
    abilities: { str: 10, dex: 17, con: 13, wis: 13, cha: 4 },
    ownInt: 2,
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4", note: "plus disease" }],
    speeds: { land: 40, climb: 20, swim: 20 },
    senses: ["low-light vision", "scent"],
    skillRacialMods: { per: 3 },
    ownSkillRanks: { ste: 1 },
    specialNotes: [
      "Disease (bite): filth fever, Fort DC 11, onset 1d3 days, 1/day, 1d3 Dex and 1d3 Con damage, cure 2 consecutive saves",
    ],
    prereq: { casterLevel: 3, alignment: "N" },
    source: "Bestiary (Dire Rat); CRB Improved Familiar table",
  },
  // Stirge (Bestiary "Stirge"): a MAGICAL BEAST, so classSkills carries its
  // own printed list rather than the animal set. AC 16 = 10 + Dex 4 + size 2,
  // no natural armor; baseSaves reproduces the same 2/2/0 shape as a 1-HD
  // animal (coincidental — this is the creature's own printed total minus its
  // own ability mods, not derived from a type table). The proboscis attack
  // deals no direct hit-point damage on its own (RAW it just attaches); this
  // module always adds the familiar's Str modifier to every attack's damage
  // regardless (see familiar.ts's deriveFamiliar), so the derived sheet will
  // show a small Str-mod addend alongside the "0" placeholder die that this
  // stat block doesn't actually have — a documented display quirk, not
  // something this data file can suppress. Fly +8 = Dex 4 + size 4 + average
  // 0, no ranks needed; Stealth +16 = Dex 4 + size 8 + 1 own rank + class 3.
  stirge: {
    name: "Stirge",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical Beast",
    hd: 1,
    abilities: { str: 3, dex: 19, con: 10, wis: 12, cha: 6 },
    ownInt: 1,
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [
      {
        name: "Proboscis",
        count: 1,
        damageDice: "0",
        note: "touch attack, attaches instead of dealing damage; see blood drain",
      },
    ],
    speeds: { land: 10, fly: 40 },
    senses: ["darkvision 60 ft.", "low-light vision", "scent"],
    flyManeuverability: "average",
    classSkills: ["ste"],
    ownSkillRanks: { ste: 1 },
    specialNotes: [
      "Attach: a successful proboscis touch attack attaches the stirge instead of dealing damage",
      "Blood drain: an attached stirge automatically drains 1 point of Constitution each round, detaching once it has drained 4 points; each blood drain carries a 10% chance of exposing the victim to a random disease",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary (Stirge); CRB Improved Familiar table",
  },
  // Small Air Elemental (Bestiary "Elemental, Air"): typeKind "elemental" so
  // "elemental traits" (bleed/paralysis/poison/sleep/stun/crit/flank
  // immunity) is the printed immunity string. AC 17 = 10 + Dex 3 + natural 3
  // + size 1. baseSaves is this creature's OWN printed total minus its OWN
  // ability mods (good Fort/Ref, poor Will) — verified per-element, not
  // assumed from a shared "elemental" save table (see earth, which differs).
  // Every listed skill reconciles with exactly 1 own rank + class skill +3:
  // Fly +17 = Dex 3 + size 2 + perfect 8 + 1 rank + class 3; Stealth +11 =
  // Dex 3 + size 4 + 1 rank + class 3; the rest are ability mod + 1 + 3.
  "air-elemental": {
    name: "Small Air Elemental",
    size: "sm",
    typeKind: "elemental",
    creatureType: "Outsider (air, elemental, extraplanar)",
    hd: 2,
    abilities: { str: 12, dex: 17, con: 12, wis: 11, cha: 11 },
    ownInt: 4,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 3,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d4" }],
    speeds: { fly: 100 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    classSkills: ["acr", "esc", "fly", "kpl", "per", "ste"],
    ownSkillRanks: { acr: 1, esc: 1, fly: 1, kpl: 1, per: 1, ste: 1 },
    defenses: { immune: ["elemental traits"] },
    languages: ["Auran"],
    specialNotes: [
      "Whirlwind (DC 12, 10 to 20 ft. tall)",
      "Air mastery: airborne creatures take a -1 penalty on attack and damage rolls against it",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary (Small Air Elemental); CRB Improved Familiar table",
  },
  // Small Earth Elemental: AC 17 = 10 + Dex (-1) + natural 7 + size 1. Its
  // baseSaves is the one surprise of this shard: good Fort AND Will but poor
  // Ref (3/0/3), the mirror image of air/fire/water's good Fort/Ref, poor
  // Will — verified against three independent source pulls since it looked
  // like a transcription error at first and wasn't. Burrow speed means Climb
  // stays Str-based (no climb speed on this creature to trigger the
  // Dex-override/+8 rule). Every listed skill again reconciles with exactly
  // 1 own rank + class skill +3.
  "earth-elemental": {
    name: "Small Earth Elemental",
    size: "sm",
    typeKind: "elemental",
    creatureType: "Outsider (earth, elemental, extraplanar)",
    hd: 2,
    abilities: { str: 16, dex: 8, con: 13, wis: 11, cha: 11 },
    ownInt: 4,
    baseSaves: { fort: 3, ref: 0, will: 3 },
    naturalArmor: 7,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d6" }],
    speeds: { land: 20, burrow: 20 },
    senses: ["darkvision 60 ft.", "tremorsense 60 ft."],
    classSkills: ["apr", "clm", "kdu", "kpl", "per", "ste"],
    ownSkillRanks: { apr: 1, clm: 1, kdu: 1, kpl: 1, per: 1, ste: 1 },
    defenses: { immune: ["elemental traits"] },
    languages: ["Terran"],
    specialNotes: [
      "Earth glide: burrows through stone, dirt, or almost any other sort of earth (except metal) leaving no tunnel or hole",
      "Earth mastery: +1 bonus on attack and damage rolls if both it and its foe are touching the ground, -4 penalty if the foe is airborne or waterborne",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary (Small Earth Elemental); CRB Improved Familiar table",
  },
  // Small Fire Elemental: printed AC 16 includes a +1 dodge bonus from its
  // own Dodge feat (10 + Dex 1 + dodge 1 + natural 3 + size 1); this module
  // has no per-source AC field beyond base/dex/natural/size, so the dodge
  // point is dropped from the derived AC and called out in specialNotes —
  // same accepted-gap posture as the imp's own Dodge feat in
  // species-crb-outsiders.ts. Immune to fire, vulnerable to cold, on top of
  // the shared "elemental traits" immunity. Every listed skill reconciles
  // with exactly 1 own rank + class skill +3.
  "fire-elemental": {
    name: "Small Fire Elemental",
    size: "sm",
    typeKind: "elemental",
    creatureType: "Outsider (elemental, extraplanar, fire)",
    hd: 2,
    abilities: { str: 10, dex: 13, con: 10, wis: 11, cha: 11 },
    ownInt: 4,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 3,
    attacks: [
      {
        name: "Slam",
        count: 1,
        damageDice: "1d4",
        note: "plus burn (1d4 fire, DC 11 Reflex negates catching fire)",
      },
    ],
    speeds: { land: 50 },
    senses: ["darkvision 60 ft."],
    classSkills: ["acr", "clm", "esc", "int", "kpl", "per"],
    ownSkillRanks: { acr: 1, clm: 1, esc: 1, int: 1, kpl: 1, per: 1 },
    defenses: { immune: ["elemental traits", "fire"], weaknesses: ["vulnerability to cold"] },
    languages: ["Ignan"],
    specialNotes: [
      "Burn (DC 11): a creature struck by its slam must succeed at a Reflex save or catch fire, taking 1d4 fire damage each round for 1d4 rounds unless the flames are put out",
      "Own feat: Dodge (its +1 dodge AC is not folded into the derived AC)",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary (Small Fire Elemental); CRB Improved Familiar table",
  },
  // Small Water Elemental: AC 17 = 10 + Dex 0 + natural 6 + size 1. Swim +14
  // is the one skill needing more than 1 rank: swim speed auto-grants the
  // universal +8 racial bonus and the Dex-override (Dex 0 here), so
  // Swim = 0 (Dex) + 8 (auto racial) + 3 own ranks + class 3 = 14. The rest
  // reconcile with 1 own rank + class skill +3, same as the other elementals.
  "water-elemental": {
    name: "Small Water Elemental",
    size: "sm",
    typeKind: "elemental",
    creatureType: "Outsider (elemental, extraplanar, water)",
    hd: 2,
    abilities: { str: 14, dex: 10, con: 13, wis: 11, cha: 11 },
    ownInt: 4,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 6,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d6" }],
    speeds: { land: 20, swim: 90 },
    senses: ["darkvision 60 ft."],
    classSkills: ["acr", "esc", "kpl", "per", "ste", "swm"],
    ownSkillRanks: { acr: 1, esc: 1, kpl: 1, per: 1, ste: 1, swm: 3 },
    defenses: { immune: ["elemental traits"] },
    languages: ["Aquan"],
    specialNotes: [
      "Drench: its touch extinguishes torches, campfires, and other small non-magical fires",
      "Vortex (DC 13, 10 to 20 ft. tall): functions like a whirlwind attack, but only while underwater",
      "Water mastery: +1 bonus on attack and damage rolls if both it and its foe are touching water, -4 penalty if the foe is not touching water",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary (Small Water Elemental); CRB Improved Familiar table",
  },
};
