/**
 * The commonly-picked splatbook Improved Familiar species beyond the CRB
 * table: silvanshee agathion, lyrakien azata, cassisian angel, nosoi
 * psychopomp, cacodaemon, arbiter inevitable, paracletus aeon, voidworm
 * protean, brownie, and faerie dragon. Hand-authored clean-room from the
 * published Bestiary 2/3/4 stat blocks (aonprd.com / d20pfsrd.com) — see
 * `types.ts` for the authoring rules. Each entry's `prereq` comes from the
 * published expanded Improved Familiar table (alignment + caster level),
 * not guessed from the creature's own alignment line — the brownie is the
 * one surprise: the table lists it at 5th level, not the 7th its own book
 * placement (Bestiary 2, alongside the CL-7 outsiders) might suggest.
 *
 * Recurring departures across this shard, all deliberate and all mirroring
 * the imp's own precedent in `species-crb-outsiders.ts`:
 *   - A printed flat AC bonus this module has no field for (a Dodge feat's
 *     +1, or an innate dodge-type bonus) is dropped from the derived AC and
 *     called out in `specialNotes`, exactly like the imp's own Dodge feat.
 *   - A feat bonus baked into a single printed skill total (no separate
 *     feat-bonus field exists here) is folded into that skill's
 *     `ownSkillRanks` entry, mirroring `familiar.ts`'s pig/Great Fortitude
 *     precedent for saves.
 *   - Two skill totals on the silvanshee (Climb, Fly) do not reconcile
 *     under this module's skill formula for ANY nonnegative rank count —
 *     verified against the exact Archives of Nethys text, not a
 *     transcription slip. Left unset (0 ranks) as the closest-fit posture;
 *     see the entry's comment.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_SPLAT: Readonly<Record<string, ImprovedFamiliar>> = {
  // Bestiary 2 p.20. baseSaves reverse-derived: Fort 5-1, Ref 6-2, Will 2-1
  // (Con 12/Dex 15/Wis 12 mods). Acrobatics/Stealth/Perception/both
  // Knowledges all reconcile cleanly at 2 ranks + the printed +4 racial
  // (Acrobatics/Perception/Stealth only) + class +3. Climb (+7, Str -4) and
  // Fly (+6, Dex +2 + Tiny size +4 + good maneuverability +4 = +10 with ZERO
  // ranks already) cannot reconcile under this formula at any rank count —
  // confirmed against the AoN stat block verbatim, so this is the printed
  // block's own math, not a transcription error. Both left at 0 ranks/out of
  // classSkills; the derived sheet will show a different total than print.
  silvanshee: {
    name: "Silvanshee",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (agathion, extraplanar, good)",
    hd: 2,
    abilities: { str: 3, dex: 15, con: 12, wis: 12, cha: 13 },
    ownInt: 10,
    baseSaves: { fort: 4, ref: 4, will: 1 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d3" },
      { name: "Claw", count: 2, damageDice: "1d2" },
    ],
    speeds: { land: 30, fly: 90 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "good",
    ownSkillRanks: { acr: 2, kar: 2, kpl: 2, per: 2, ste: 2 },
    classSkills: ["acr", "kar", "kpl", "per", "ste"],
    defenses: {
      dr: "5/evil or silver",
      resist: ["cold 10", "sonic 10"],
      immune: ["electricity", "petrification"],
      sr: 13,
    },
    slas: [
      { slug: "know-direction", name: "Know Direction", frequency: "constant", cl: 2 },
      { slug: "speak-with-animals", name: "Speak with Animals", frequency: "constant", cl: 2 },
      { slug: "dancing-lights", name: "Dancing Lights", frequency: "atWill", cl: 2 },
      { slug: "prestidigitation", name: "Prestidigitation", frequency: "atWill", cl: 2 },
      { slug: "stabilize", name: "Stabilize", frequency: "atWill", cl: 2 },
      {
        slug: "dimension-door",
        name: "Dimension Door",
        frequency: { uses: 1, per: "day" },
        cl: 2,
        note: "self plus 5 lbs. of objects only",
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
      "Truespeech (understands and is understood by any creature with a language)",
      "+4 racial bonus on saves against poison",
      "Cat's luck, flight, spectral mist (special qualities, see source)",
      "Lay on hands (1d6, 1 per day, always as a 2nd-level paladin)",
      "Heroic strength and pounce (special attacks, not modeled)",
      "Printed Climb (+7) and Fly (+6) totals do not reconcile under this app's skill formula at any rank count; the derived sheet shows a different number for both",
    ],
    prereq: { casterLevel: 7, alignment: "NG" },
    source: "Bestiary 2 p.20 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.38. baseSaves: Fort 2-1, Ref 7-4, Will 6-3 (Con 12/Dex
  // 19/Wis 17). Fly (+16) reconciles at ZERO ranks: Dex +4, Tiny size +4,
  // perfect maneuverability +8 already sums to +16. Spellcraft (+5)
  // reconciles at 3 ranks with NO class-skill bonus (Int +2 + 3 ranks, no
  // +3); every other skill reconciles at 3 ranks WITH the class-skill
  // bonus. "Knowledge (any one)" and "Perform (any one)" are printed as
  // player's choice; arcana and Perform's bare id stand in as the
  // authored picks.
  lyrakien: {
    name: "Lyrakien",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (azata, chaotic, extraplanar, good)",
    hd: 3,
    abilities: { str: 5, dex: 19, con: 12, wis: 17, cha: 20 },
    ownInt: 14,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 0,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d2" }],
    speeds: { land: 30, fly: 80 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 3, blf: 3, dip: 3, kar: 3, per: 3, prf: 3, spl: 3, ste: 3 },
    classSkills: ["acr", "blf", "dip", "kar", "per", "prf", "ste"],
    defenses: {
      dr: "5/evil",
      resist: ["cold 10", "fire 10"],
      immune: ["electricity", "petrification"],
    },
    slas: [
      { slug: "detect-evil", name: "Detect Evil", frequency: "constant", cl: 3 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 3 },
      { slug: "freedom-of-movement", name: "Freedom of Movement", frequency: "constant", cl: 3 },
      { slug: "dancing-lights", name: "Dancing Lights", frequency: "atWill", cl: 3 },
      { slug: "daze", name: "Daze", frequency: "atWill", cl: 3 },
      { slug: "summon-instrument", name: "Summon Instrument", frequency: "atWill", cl: 3 },
      { slug: "ventriloquism", name: "Ventriloquism", frequency: "atWill", cl: 3 },
      {
        slug: "cure-light-wounds",
        name: "Cure Light Wounds",
        frequency: { uses: 1, per: "day" },
        cl: 3,
      },
      {
        slug: "lesser-confusion",
        name: "Lesser Confusion",
        spell: "Confusion, Lesser",
        frequency: { uses: 1, per: "day" },
        cl: 3,
      },
      { slug: "silent-image", name: "Silent Image", frequency: { uses: 1, per: "day" }, cl: 3 },
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
      "Truespeech (understands and is understood by any creature with a language)",
      "Traveler's friend (special quality, see source)",
      "Starlight blast (special attack, not modeled)",
    ],
    prereq: { casterLevel: 7, alignment: "CG" },
    source: "Bestiary 2 p.38 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.26. baseSaves: Fort 4-1, Ref 3-0, Will 2-0 (Con 12/Dex
  // 11/Wis 11). Diplomacy (+2, no class bonus) and Fly (+10, zero ranks:
  // Dex +0, Small size +2, perfect maneuverability +8) both reconcile
  // without a class-skill bonus; the other five skills reconcile at 1-2
  // ranks WITH the class-skill bonus. The printed "+2 deflection vs. evil"
  // AC and "+2 resistance vs. evil" save bonuses are situational (evil
  // attackers only) and have no home in this module's flat AC/save model —
  // called out in specialNotes instead of folded into the headline numbers.
  cassisian: {
    name: "Cassisian",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (angel, extraplanar, good)",
    hd: 2,
    abilities: { str: 3, dex: 11, con: 12, wis: 11, cha: 10 },
    ownInt: 6,
    baseSaves: { fort: 3, ref: 3, will: 2 },
    naturalArmor: 3,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d3" }],
    speeds: { fly: 60 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "perfect",
    ownSkillRanks: { dip: 2, kpl: 1, kre: 1, per: 2, sen: 1, ste: 1 },
    classSkills: ["kpl", "kre", "per", "sen", "ste"],
    defenses: {
      dr: "5/cold iron or evil",
      resist: ["electricity 10", "fire 10"],
      immune: ["acid", "cold", "petrification"],
    },
    slas: [
      { slug: "detect-evil", name: "Detect Evil", frequency: "constant", cl: 3 },
      { slug: "know-direction", name: "Know Direction", frequency: "constant", cl: 3 },
      { slug: "aid", name: "Aid", frequency: { uses: 1, per: "day" }, cl: 3 },
      { slug: "daylight", name: "Daylight", frequency: { uses: 1, per: "day" }, cl: 3 },
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
      "Truespeech (understands and is understood by any creature with a language)",
      "AC includes an unmodeled +2 deflection bonus against attacks made by evil creatures",
      "Saves include an unmodeled +2 resistance bonus against effects created by evil creatures, plus +4 against poison",
      "Change shape (2 of: Small human-like angel, dove, dog, or Tiny fish; polymorph)",
      "Perfect memory (special quality, not modeled)",
      "Breath weapon (15-foot line, 1d6 cold or 1d6 fire, Reflex DC 12 half, usable every 1d4 rounds)",
    ],
    prereq: { casterLevel: 7, alignment: "LG" },
    source: "Bestiary 2 p.26 (expanded Improved Familiar table)",
  },

  // Bestiary 4 p.220. baseSaves: Fort 2-1, Ref 6-3, Will 4-1 (Con 12/Dex
  // 16/Wis 13). Every reconciling skill lands at 3 ranks with the
  // class-skill bonus except Perception (5 ranks) and Sense Motive (2
  // ranks, NOT a class skill: 3 = Wis +1 + 2 ranks, no +3 fits).
  // Profession is printed as "(scribe)"; the bare `pro` id stands in.
  nosoi: {
    name: "Nosoi",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (extraplanar, psychopomp)",
    hd: 3,
    abilities: { str: 8, dex: 16, con: 12, wis: 13, cha: 16 },
    ownInt: 11,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft.", "low-light vision", "spiritsense"],
    flyManeuverability: "good",
    ownSkillRanks: { fly: 3, khi: 3, kpl: 3, per: 5, pro: 3, sen: 2, ste: 3 },
    classSkills: ["fly", "khi", "kpl", "per", "pro", "ste"],
    defenses: {
      dr: "2/adamantine",
      resist: ["cold 10", "electricity 10"],
      immune: ["death effects", "disease", "poison"],
    },
    slas: [
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 3, note: "self only" },
      {
        slug: "speak-with-dead",
        name: "Speak with Dead",
        frequency: { uses: 3, per: "day" },
        cl: 12,
        note: "6 questions",
      },
      {
        slug: "hide-from-undead",
        name: "Hide from Undead",
        frequency: { uses: 1, per: "day" },
        cl: 3,
      },
      { slug: "sound-burst", name: "Sound Burst", frequency: { uses: 1, per: "day" }, cl: 3 },
    ],
    languages: ["Abyssal", "Celestial", "Infernal"],
    specialNotes: [
      "Change shape (raven or songbird, same statistics; beast shape)",
      "Spirit touch (its natural weapons and wielded weapons affect incorporeal creatures as though they had ghost touch)",
      "Haunting melody (DC 14 Will negates fascinate; 60-ft. spread, affects living and undead; usable 6 rounds per day, not modeled)",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary 4 p.220 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.64. baseSaves: Fort 2-1, Ref 5-0, Will 4-1 (Con 13/Dex
  // 11/Wis 13) — Dex 11's +0 mod is why Ref's base looks unusually high.
  // Every skill reconciles cleanly at 3 ranks plus the class-skill bonus,
  // including Fly (+18 = Dex +0, Tiny size +4, perfect maneuverability +8,
  // 3 ranks, class +3).
  cacodaemon: {
    name: "Cacodaemon",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (daemon, evil, extraplanar)",
    hd: 3,
    abilities: { str: 12, dex: 11, con: 13, wis: 13, cha: 12 },
    ownInt: 8,
    baseSaves: { fort: 1, ref: 5, will: 3 },
    naturalArmor: 4,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4", note: "plus disease" }],
    speeds: { land: 5, fly: 50 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { blf: 3, fly: 3, kpl: 3, per: 3, ste: 3 },
    classSkills: ["blf", "fly", "kpl", "per", "ste"],
    defenses: {
      dr: "5/good or silver",
      fastHealing: 2,
      resist: ["cold 10", "electricity 10", "fire 10"],
      immune: ["acid", "death effects", "disease", "poison"],
    },
    slas: [
      { slug: "detect-good", name: "Detect Good", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "invisibility", name: "Invisibility", frequency: "atWill", cl: 6, note: "self only" },
      {
        slug: "lesser-confusion",
        name: "Lesser Confusion",
        spell: "Confusion, Lesser",
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
    languages: ["Abyssal", "Common", "Infernal"],
    specialNotes: [
      "Telepathy 100 ft.",
      "Change shape (2 of: lizard, octopus, small scorpion, venomous snake; polymorph)",
      "Soul lock, disease (special attacks, not modeled)",
    ],
    prereq: { casterLevel: 7, alignment: "NE" },
    source: "Bestiary 2 p.64 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.162. baseSaves: Fort 5-2, Ref 3-3, Will 3-0 (Con 14/Dex
  // 16/Wis 11). Every skill reconciles at 2 ranks plus the class-skill
  // bonus. No printed DR/resist/immune beyond SR; "constructed" and
  // "constant vigilance" are qualitative special qualities this module has
  // no numeric surface for.
  arbiter: {
    name: "Arbiter",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (extraplanar, inevitable, lawful)",
    hd: 2,
    abilities: { str: 11, dex: 16, con: 14, wis: 11, cha: 14 },
    ownInt: 11,
    baseSaves: { fort: 3, ref: 0, will: 3 },
    naturalArmor: 1,
    attacks: [{ name: "Short sword", count: 1, damageDice: "1d3", note: "19-20 crit" }],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "average",
    ownSkillRanks: { dip: 2, fly: 2, kpl: 2, per: 2, sen: 2, ste: 2 },
    classSkills: ["dip", "fly", "kpl", "per", "sen", "ste"],
    defenses: { sr: 13 },
    slas: [
      { slug: "detect-chaos", name: "Detect Chaos", frequency: "constant", cl: 2 },
      { slug: "command", name: "Command", frequency: { uses: 3, per: "day" }, cl: 2 },
      { slug: "make-whole", name: "Make Whole", frequency: { uses: 3, per: "day" }, cl: 2 },
      {
        slug: "protection-from-chaos",
        name: "Protection from Chaos",
        frequency: { uses: 3, per: "day" },
        cl: 2,
      },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    specialNotes: [
      "Truespeech (understands and is understood by any creature with a language)",
      "Regeneration 2 (chaotic; not modeled as fast healing since chaotic damage bypasses it)",
      "Constant vigilance, constructed (special qualities, see source)",
      "Locate inevitable (special quality, not modeled)",
      "Electrical burst (3d6 electricity in a 10-ft. radius, Reflex DC 13 half; arbiter is stunned for 24 hours afterward, not modeled)",
    ],
    prereq: { casterLevel: 7, alignment: "LN" },
    source: "Bestiary 2 p.162 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.11. baseSaves: Fort 4-(-1), Ref 3-2, Will 5-1 (Con 9/Dex
  // 14/Wis 13). Fly (+8) reconciles at zero ranks (Dex +2, Small size +2,
  // good maneuverability +4). The aeon subtype's own racial bonus to
  // Knowledge checks (half racial HD, rounded down: 3 HD -> +1) is what
  // makes both Knowledge totals reconcile at the same 3 ranks as every
  // other trained skill here, instead of 4.
  paracletus: {
    name: "Paracletus",
    size: "sm",
    typeKind: "outsider",
    creatureType: "Outsider (aeon, extraplanar)",
    hd: 3,
    abilities: { str: 8, dex: 14, con: 9, wis: 13, cha: 12 },
    ownInt: 11,
    baseSaves: { fort: 5, ref: 1, will: 5 },
    naturalArmor: 1,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d3", note: "plus 1d6 electricity" }],
    speeds: { fly: 40 },
    senses: ["darkvision 60 ft."],
    flyManeuverability: "good",
    skillRacialMods: { kar: 1, kpl: 1 },
    ownSkillRanks: { int: 3, kar: 3, kpl: 3, per: 3, sen: 3, ste: 3 },
    classSkills: ["int", "kar", "kpl", "per", "sen", "ste"],
    defenses: {
      resist: ["electricity 10", "fire 10"],
      immune: ["cold", "critical hits", "poison"],
      sr: 7,
    },
    slas: [
      { slug: "sanctuary", name: "Sanctuary", frequency: "atWill", cl: 3 },
      { slug: "calm-emotions", name: "Calm Emotions", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    specialNotes: [
      "Envisaging (a telepathic-like communication unique to aeons)",
      "Can't be tripped",
      "Extension of all, void form (special qualities, see source)",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Bestiary 2 p.11 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.217. baseSaves: Fort 1-0, Ref 6-3, Will 2-(-1) (Con 10/Dex
  // 17/Wis 8). Escape Artist, Fly, and Stealth all reconcile at only 1 rank
  // (plus class); Acrobatics/Bluff/Knowledge (arcana) at 3. Perception's
  // printed +8 only reconciles at 6 ranks with the class bonus — the
  // creature's own Skill Focus (Perception) feat's +3 has no separate field
  // in this module, so it's folded straight into the rank count (same
  // posture as `familiar.ts`'s pig/Great Fortitude fold-in for saves).
  voidworm: {
    name: "Voidworm",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (chaotic, extraplanar, protean, shapechanger)",
    hd: 3,
    abilities: { str: 7, dex: 17, con: 10, wis: 8, cha: 13 },
    ownInt: 8,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 0,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d3" },
      { name: "Tail slap", count: 1, damageDice: "1d3", note: "plus confusion" },
    ],
    speeds: { land: 20, fly: 50 },
    senses: ["blindsense 30 ft.", "darkvision 30 ft."],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 3, blf: 3, esc: 1, fly: 1, kar: 3, per: 6, ste: 1 },
    classSkills: ["acr", "blf", "esc", "fly", "kar", "per", "ste"],
    defenses: {
      fastHealing: 2,
      resist: ["electricity 10", "sonic 10"],
      immune: ["acid"],
    },
    slas: [
      { slug: "detect-law", name: "Detect Law", frequency: "constant", cl: 6 },
      { slug: "dancing-lights", name: "Dancing Lights", frequency: "atWill", cl: 6 },
      { slug: "ghost-sound", name: "Ghost Sound", frequency: "atWill", cl: 6 },
      { slug: "prestidigitation", name: "Prestidigitation", frequency: "atWill", cl: 6 },
      { slug: "blur", name: "Blur", frequency: { uses: 3, per: "day" }, cl: 6, note: "self only" },
      { slug: "obscuring-mist", name: "Obscuring Mist", frequency: { uses: 3, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common", "Protean"],
    specialNotes: [
      "Amorphous anatomy, freedom of movement (special qualities, see source)",
      "Can't be tripped",
      "Change shape (2 Tiny animal forms; beast shape II)",
      "Own feats: Skill Focus (Perception, folded into its Perception ranks above), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "CN" },
    source: "Bestiary 2 p.217 (expanded Improved Familiar table)",
  },

  // Bestiary 2 p.49. The published Improved Familiar table lists the
  // brownie at 5th level, not the 7th its neighbors in this shard use.
  // baseSaves: Fort 1-1, Ref 6-4, Will 4-2 (Con 12/Dex 18/Wis 15). Every
  // skill reconciles at 1 rank plus class, except Perception (3 ranks) and
  // Handle Animal (1 rank, not a class skill). AC's printed +1 dodge (from
  // its own Dodge feat) has no field here — same accepted gap as the imp's
  // own Dodge feat.
  brownie: {
    name: "Brownie",
    size: "tiny",
    typeKind: "fey",
    creatureType: "Fey",
    hd: 1,
    abilities: { str: 7, dex: 18, con: 12, wis: 15, cha: 17 },
    ownInt: 14,
    baseSaves: { fort: 0, ref: 2, will: 2 },
    naturalArmor: 0,
    attacks: [{ name: "Short sword", count: 1, damageDice: "1d2", note: "19-20 crit" }],
    speeds: { land: 20 },
    senses: ["low-light vision"],
    ownSkillRanks: { acr: 1, blf: 1, crf: 1, esc: 1, han: 1, per: 3, sen: 1, ste: 1 },
    classSkills: ["acr", "blf", "crf", "esc", "per", "sen", "ste"],
    defenses: { dr: "5/cold iron" },
    slas: [
      { slug: "dancing-lights", name: "Dancing Lights", frequency: "atWill", cl: 7 },
      { slug: "mending", name: "Mending", frequency: "atWill", cl: 7 },
      { slug: "prestidigitation", name: "Prestidigitation", frequency: "atWill", cl: 7 },
      {
        slug: "lesser-confusion",
        name: "Lesser Confusion",
        spell: "Confusion, Lesser",
        frequency: { uses: 1, per: "day" },
        cl: 7,
      },
      {
        slug: "dimension-door",
        name: "Dimension Door",
        frequency: { uses: 1, per: "day" },
        cl: 7,
        note: "self only",
      },
      { slug: "mirror-image", name: "Mirror Image", frequency: { uses: 1, per: "day" }, cl: 7 },
      { slug: "ventriloquism", name: "Ventriloquism", frequency: { uses: 1, per: "day" }, cl: 7 },
    ],
    languages: ["Common", "Elven", "Gnome", "Sylvan"],
    specialNotes: [
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Improved Initiative, Weapon Finesse",
      "+2 racial bonus on saves against illusions",
      "+4 racial bonus on Stealth checks made in forests, on top of the total shown here",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary 2 p.49 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.91. baseSaves: Fort 4-1, Ref 6-3, Will 5-2 (Con 13/Dex
  // 17/Wis 14). Swim (+13) only reconciles WITHOUT the class-skill bonus (2
  // ranks + Dex +3 + the universal swim-speed +8); every other skill
  // reconciles at 2-5 ranks WITH it. The dragon's "Spells Known" block (six
  // 1st-level slots per day shared across grease/silent image/sleep) is a
  // shared-pool caster progression, not a set of independently-metered
  // spell-like abilities — `FamiliarSlaDef.frequency` has no shape for a
  // pool split across several spells, so those three are named in
  // `specialNotes` instead of authored as three separate 6/day defs (which
  // would let a player spend 18 uses instead of the printed 6). The 0-level
  // spells (genuinely at-will, no pool) and the 3/day greater invisibility
  // are authored normally. AC's printed +1 dodge has no field here, same
  // gap as the imp/brownie entries.
  "faerie-dragon": {
    name: "Faerie Dragon",
    size: "tiny",
    typeKind: "dragon",
    creatureType: "Dragon",
    hd: 3,
    abilities: { str: 9, dex: 17, con: 13, wis: 14, cha: 16 },
    ownInt: 16,
    baseSaves: { fort: 3, ref: 3, will: 3 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 10, fly: 60, swim: 30 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 2, blf: 3, dip: 3, fly: 5, per: 3, sen: 3, ste: 3, swm: 2, umd: 3 },
    classSkills: ["acr", "blf", "dip", "fly", "per", "sen", "ste", "umd"],
    defenses: { immune: ["paralysis", "sleep"], sr: 13 },
    slas: [
      { slug: "dancing-lights", name: "Dancing Lights", frequency: "atWill", cl: 3 },
      { slug: "flare", name: "Flare", frequency: "atWill", cl: 3 },
      { slug: "ghost-sound", name: "Ghost Sound", frequency: "atWill", cl: 3 },
      { slug: "mage-hand", name: "Mage Hand", frequency: "atWill", cl: 3 },
      { slug: "open-close", name: "Open/Close", frequency: "atWill", cl: 3 },
      {
        slug: "greater-invisibility",
        name: "Greater Invisibility",
        spell: "Invisibility, Greater",
        frequency: { uses: 3, per: "day" },
        cl: 3,
        note: "self only",
      },
    ],
    languages: ["Common", "Draconic", "Elven", "Sylvan"],
    specialNotes: [
      "Telepathy 100 ft.",
      "AC includes an unmodeled +1 dodge bonus not present in the derived AC",
      "Casts as a 3rd-level sorcerer-like caster: 6 first-level spell slots per day shared among grease, silent image, and sleep (not individually metered here)",
      "Breath weapon (5-ft. cone, euphoria for 1d6 rounds, Fort DC 12 negates, usable every 1d4 rounds; affected creatures are staggered, sickened, and immune to fear for the duration)",
    ],
    prereq: { casterLevel: 7, alignment: "CG" },
    source: "Bestiary 3 p.91 (expanded Improved Familiar table)",
  },
};
