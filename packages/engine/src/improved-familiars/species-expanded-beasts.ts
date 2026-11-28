/**
 * The expanded Improved Familiar table's magical beasts: 22 species drawn from
 * Bestiary 3, 4, 5, and 6, the Adventure Paths, Gallows of Madness, Familiar
 * Folio, Inner Sea Bestiary, Monster Codex, and Occult Bestiary. Hand-authored
 * clean-room from the published stat blocks (aonprd.com / d20pfsrd.com); see
 * `types.ts` for the modeling rules and `species-crb-outsiders.ts` for the imp
 * precedent. Each entry's `prereq` comes from the published expanded table
 * (caster level, plus the familiar's alignment or the master's alignment where
 * the row names it), not from the creature's own alignment line.
 *
 * Shard-wide choices, applied consistently:
 *   - Feat skill bonuses (Skill Focus, Alertness, Stealthy, Deceitful) are
 *     folded into `skillRacialMods` so they survive a master with more ranks.
 *   - Feat save bonuses (Iron Will) are folded into `baseSaves`, matching
 *     `familiar.ts`'s pig/Great Fortitude precedent.
 *   - A printed Dodge or innate dodge AC bonus has no field here and stays out
 *     of `naturalArmor`; each affected entry says so in `specialNotes`.
 *   - A shared spell pool (psychic magic's PE) cannot be split into separate
 *     per-day defs without overstating its uses, so those spells stay in
 *     `specialNotes`, the same posture as the faerie dragon's shared slots.
 *   - A printed skill total that cannot reconcile under this module's formula
 *     is left at the closest rank count and called out in the entry comment
 *     and `specialNotes`.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_EXPANDED_BEASTS: Readonly<Record<string, ImprovedFamiliar>> = {
  // Bestiary 4 p.8. baseSaves: Fort 4-1, Ref 5-2, Will 0-0 (Con 12/Dex 15/Wis
  // 11). Acrobatics +6 is Dex +2, 1 rank, class +3; Perception +4 is the
  // printed +4 racial at 0 ranks; Stealth +14 is Dex +2, Small +4, 1 rank,
  // class +3, and the same +4 racial. The +8 Acrobatics when jumping and the
  // -2 save vs. witch hexes are situational and stay out of the derived totals.
  almiraj: {
    name: "Almiraj",
    size: "sm",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 2,
    abilities: { str: 6, dex: 15, con: 12, wis: 11, cha: 6 },
    ownInt: 5,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Gore", count: 1, damageDice: "2d4", note: "plus magic horn" }],
    speeds: { land: 30, burrow: 10 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillRacialMods: { per: 4, ste: 4 },
    ownSkillRanks: { acr: 1, ste: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    languages: ["Sylvan (can't speak)"],
    specialNotes: [
      "Magic horn: its gore is a +1 weapon; a living creature slain by the gore turns to stone (the +1 attack and damage are not in the derived numbers)",
      "Saves: -2 against harmful witch hexes; beneficial hexes lasting longer than 1 round last 50% longer",
      "+8 Acrobatics when jumping (situational, not in the derived total)",
      "Own feats: Weapon Finesse",
    ],
    prereq: { casterLevel: 5 },
    source: "Bestiary 4 p.8 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.46. baseSaves: Fort 4-1, Ref 5-2, Will 2-2 (Con 13/Dex 14/Wis
  // 15). Stealth +18 is Dex +2, Tiny +8, 2 ranks, class +3, and Skill Focus's
  // +3 folded into skillRacialMods; Perception +2 is Wis alone.
  "brain-mole": {
    name: "Brain Mole",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 2,
    abilities: { str: 4, dex: 14, con: 13, wis: 15, cha: 11 },
    ownInt: 2,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus attach" }],
    speeds: { land: 20, burrow: 20 },
    senses: [
      "darkvision 60 ft.",
      "low-light vision",
      "scent",
      "second sight 60 ft.",
      "tremorsense 15 ft.",
    ],
    skillRacialMods: { ste: 3 },
    ownSkillRanks: { ste: 2 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    specialNotes: [
      "Psychic magic (PE 12, CL 2nd): expeditious retreat (1 PE), mind thrust I (1 PE, DC 11), silent image (1 PE, DC 11)",
      "Second sight: senses spellcasters within 60 ft. as blindsight",
      "Shrouded mind: immune to detect spells and spells that read or examine auras",
      "Attach: a bite hit starts a grapple and deals bite damage each round; brain drain then takes a prepared spell or unused slot, or deals 1 Int, Wis, and Cha damage to a non-spellcaster",
      "Own feats: Skill Focus (Stealth, folded into its Stealth total), Weapon Finesse",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary 5 p.46 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.44. baseSaves: Fort 4-1, Ref 1-(-2), Will 3-1, with Iron
  // Will's +2 folded into the Will base. Stealth +10 is Dex -2, Tiny +8, 1
  // rank, class +3; Survival +2 is Wis +1 and 1 rank without the class bonus.
  carbuncle: {
    name: "Carbuncle",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 2,
    abilities: { str: 5, dex: 7, con: 12, wis: 13, cha: 10 },
    ownInt: 6,
    baseSaves: { fort: 3, ref: 3, will: 2 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 20 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    ownSkillRanks: { ste: 1, sur: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { weaknesses: ["vulnerability to suggestion"] },
    slas: [
      { slug: "daze", name: "Daze", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "jump", name: "Jump", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "levitate",
        name: "Levitate",
        frequency: { uses: 3, per: "day" },
        cl: 3,
        note: "self only, up to 10 feet",
      },
    ],
    languages: ["empath 30 ft."],
    specialNotes: [
      "Empath 30 ft. (crude telepathy: impressions and sensations only)",
      "Fatal faker (3/day): teleport up to 30 ft. as dimension door, leaving a dead replica behind",
      "Specious suggestion (3/day): DC 11 Will, then 1d6 for +2 AC, suggestion, or -2 on Will saves for 1 minute",
      "Vulnerability to suggestion: mind-affecting spells affect it regardless of creature type",
      "-4 Acrobatics when jumping and +4 Stealth in grass or brush (situational, not in the derived totals)",
      "Own feats: Iron Will (folded into its Will base save)",
    ],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Bestiary 3 p.44 (expanded Improved Familiar table)",
  },

  // Familiar Folio p.28. baseSaves: Fort 4-1, Ref 6-3, Will 2-1 (Con 12/Dex
  // 16/Wis 13). Bluff and Escape Artist are not class skills; Stealthy's +2
  // Escape Artist and +2 Stealth are folded into skillRacialMods, and the
  // printed Stealth +18 is Dex +3, Tiny +8, 2 ranks, class +3, and those +2.
  "cat-sith": {
    name: "Cat Sith",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 8, dex: 16, con: 12, wis: 13, cha: 15 },
    ownInt: 11,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [
      { name: "Claw", count: 2, damageDice: "1d2", note: "plus no luck" },
      { name: "Bite", count: 1, damageDice: "1d3" },
    ],
    speeds: { land: 30 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillRacialMods: { esc: 2, ste: 2 },
    ownSkillRanks: { blf: 2, per: 2, ste: 2 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "see-invisibility", name: "See Invisibility", frequency: "constant", cl: 3 },
      { slug: "ghost-sound", name: "Ghost Sound", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "hypnotism", name: "Hypnotism", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "magic-aura", name: "Magic Aura", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "rest-eternal", name: "Rest Eternal", frequency: { uses: 1, per: "week" }, cl: 3 },
    ],
    languages: ["Common"],
    specialNotes: [
      "Speak with animals",
      "False curse (1/day): Will DC 15, -4 on attack rolls, saves, ability checks, and skill checks (new save each day)",
      "No luck (claw): DC 13 Will, 1d4 rounds, the target can't benefit from luck bonuses",
      "Own feats: Ability Focus (false curse, folded into the DC), Stealthy (+2 Escape Artist and Stealth folded into the totals)",
    ],
    prereq: { casterLevel: 7, alignment: "CN" },
    source: "Familiar Folio p.28 (expanded Improved Familiar table)",
  },

  // Inner Sea Bestiary p.9. baseSaves: Fort 5-2, Ref 5-2, Will 2-1 (Con 14/Dex
  // 15/Wis 12). Diplomacy is Cha +2 and 2 ranks without the class bonus;
  // Stealth and Perception both use 2 ranks plus the class +3.
  ceru: {
    name: "Ceru",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 8, dex: 15, con: 14, wis: 12, cha: 15 },
    ownInt: 13,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 2,
    attacks: [{ name: "Gore", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 20 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    ownSkillRanks: { dip: 2, per: 2, ste: 2 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { sr: 13, fastHealing: 2, resist: ["acid 5", "electricity 5"], immune: ["poison"] },
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "mage-hand", name: "Mage Hand", frequency: "atWill", cl: 6 },
    ],
    languages: ["Common (can't speak)"],
    specialNotes: [
      "Luckbringer (1/day at 3 HD, once per creature per 24 hours): DC 13 Will, one roll takes the better or worse result for 1 round",
      "Poison (gore): Fort DC 13, 1/round for 6 rounds, 1d2 Con damage, cure 2 consecutive saves",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "NG" },
    source: "Inner Sea Bestiary p.9 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.56. baseSaves: Fort 4-1, Ref 6-3, Will 0-(-1) (Con 12/Dex
  // 17/Wis 9). Acrobatics, Perception, and Stealth reconcile at their printed
  // ranks. Fly +13 cannot: Dex +3, Tiny +4, and perfect +8 already total +15,
  // so the printed block is off by 2; the derived sheet shows 15.
  chuspiki: {
    name: "Chuspiki",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast (air)",
    hd: 3,
    abilities: { str: 6, dex: 17, con: 12, wis: 9, cha: 13 },
    ownInt: 12,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Tail fan", count: 1, damageDice: "1d4", note: "×3 crit" }],
    speeds: { land: 30, fly: 60 },
    senses: ["darkvision 60 ft.", "low-light vision", "scent"],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 3, per: 1, ste: 2 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [{ slug: "feather-fall", name: "Feather Fall", frequency: "constant", cl: 3 }],
    languages: ["Auran", "Common"],
    specialNotes: [
      "Psychic magic (PE 5, CL 3rd): alter winds (1 PE, DC 12), gust of wind (2 PE, DC 13), whispering wind (2 PE)",
      "Air blast (Sp): +8 ranged, 2d6+3, using its Hit Dice as its kineticist level",
      "Basic aerokinesis (Sp): as the kineticist wild talent",
      "Wind form (3/day, immediate action): 1 round, DR 10/magic, immune to poison, sneak attacks, and critical hits; can't attack or use spell-like abilities except basic aerokinesis",
      "Wind blessed: treated as a Large creature for the effects of wind",
      "Printed Fly +13 does not reconcile (Dex +3, Tiny +4, perfect +8 already total +15); the derived sheet shows 15",
      "Own feats: Point-Blank Shot, Precise Shot, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, masterAlignment: { law: ["C"], label: "any chaotic" } },
    source: "Bestiary 5 p.56 (expanded Improved Familiar table)",
  },

  // Bestiary 6 p.66. baseSaves: Fort 4-1, Ref 6-3, Will 1-1 (Con 12/Dex 17/Wis
  // 13). Climb +6 is Str -2 plus the climb-speed +8 (the printed block keeps
  // Str, hence the ability override); Fly +11 is Dex +3, Tiny +4, good +4 at 0
  // ranks. The +4 Sleight of Hand racial bonus is carried even though the
  // block prints no total.
  "coral-capuchin": {
    name: "Coral Capuchin",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast (aquatic)",
    hd: 2,
    abilities: { str: 6, dex: 17, con: 12, wis: 13, cha: 7 },
    ownInt: 6,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus cursed bite" }],
    speeds: { land: 30, climb: 30, fly: 40, swim: 30 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "good",
    skillRacialMods: { slt: 4 },
    skillAbilityOverrides: { clm: "str" },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { weaknesses: ["moisture dependency"] },
    languages: ["Common (generally knows only a dozen or so words)"],
    specialNotes: [
      "Amphibious",
      "Cursed bite (Su): DC 12 Con check or cursed for 1d6 hours (can hold breath twice as long, then takes 1d6 damage per 10 minutes out of water); once per creature per 24 hours",
      "Moisture dependency: can stay out of water for a number of hours equal to its Constitution score, then takes 1d6 damage per hour until wetted",
      "+4 Stealth in coral reefs (situational, not in the derived total)",
      "Own feats: Weapon Finesse",
    ],
    prereq: { casterLevel: 3, alignment: "N" },
    source: "Bestiary 6 p.66 (expanded Improved Familiar table)",
  },

  // Pathfinder #133 p.82. baseSaves: Fort 4-1, Ref 6-3, Will 4-1, with Iron
  // Will's +2 folded into the Will base. Acrobatics +15 is Dex +3, 1 rank,
  // class +3, and the printed +8 racial; Fly +15 is Dex +3, Tiny +4, good +4,
  // 1 rank, class +3. Perception +5 uses 1 rank plus class.
  cyphergull: {
    name: "Cyphergull",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 6, dex: 17, con: 13, wis: 13, cha: 8 },
    ownInt: 6,
    baseSaves: { fort: 3, ref: 3, will: 3 },
    naturalArmor: 0,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Talon", count: 2, damageDice: "1d3" },
    ],
    speeds: { land: 10, fly: 50, swim: 10 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "good",
    skillRacialMods: { acr: 8 },
    ownSkillRanks: { acr: 1, fly: 1, per: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "arcane-sight", name: "Arcane Sight", frequency: "constant", cl: 3 },
      { slug: "read-magic", name: "Read Magic", frequency: "constant", cl: 3 },
      { slug: "arcane-mark", name: "Arcane Mark", frequency: "atWill", cl: 3 },
    ],
    languages: ["Common (can't speak)"],
    specialNotes: [
      "Arcane attacks: its natural weapons deal +1 damage (not in the derived damage) and count as magic for overcoming damage reduction",
      "Devour scroll (Su): eats a scroll, stores up to 3 spell levels, and casts them as a wizard of half its Hit Dice",
      "Cypher synergy: if its master is a cyphermage, it gains the analyze scroll, bypass symbol, defensive scrollcaster, and glyph finder discoveries that its master has",
      "Natural thief: a successful Acrobatics check to avoid an attack of opportunity also protects its steal attempt",
      "Own feats: Flyby Attack, Iron Will (folded into its Will base save)",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Pathfinder #133 p.82 (expanded Improved Familiar table)",
  },

  // Pathfinder #36 p.83. baseSaves: Fort 3-0, Ref 5-2, Will 2-1 (Con 10/Dex
  // 15/Wis 12). Climb +3 is Str -1 plus the printed +4 racial; Knowledge
  // (arcana) +0 is Int -1 and 1 rank without class. Stealth +4 cannot
  // reconcile: Dex +2 and Tiny +8 already total +10, so the printed block is
  // off; the derived sheet shows 10. AC's +1 dodge stays unmodeled.
  "dweomercat-cub": {
    name: "Dweomercat Cub",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 9, dex: 15, con: 10, wis: 12, cha: 14 },
    ownInt: 9,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 1,
    attacks: [
      { name: "Claw", count: 2, damageDice: "1d2" },
      { name: "Bite", count: 1, damageDice: "1d3" },
    ],
    speeds: { land: 20 },
    senses: ["darkvision 60 ft.", "scent"],
    skillRacialMods: { clm: 4 },
    ownSkillRanks: { kar: 1, per: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { dr: "5/magic", sr: 14 },
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 4 },
      {
        slug: "dimension-door",
        name: "Dimension Door",
        frequency: { uses: 1, per: "week" },
        cl: 4,
        note: "self only",
      },
    ],
    languages: ["Common", "Sylvan"],
    specialNotes: [
      "Pounce",
      "Rake (2 claws +6, 1d2-1)",
      "Dweomer leap (Su): when targeted by a spell, a swift-action teleport beside the caster and a full attack as pounce",
      "AC includes an unmodeled +1 dodge bonus",
      "Printed Stealth +4 does not reconcile (Dex +2 and Tiny +8 already total +10); the derived sheet shows 10",
      "Own feats: Dodge, Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "CN" },
    source: "Pathfinder #36 p.83 (expanded Improved Familiar table)",
  },

  // Pathfinder #128 p.84. baseSaves: Fort 3-0, Ref 5-2, Will 1-0 (Con 11/Dex
  // 14/Wis 10). Bluff and Disguise each use 3 ranks plus Deceitful's +2, with
  // no class bonus; Stealth is Dex +2, Tiny +8, 3 ranks, class +3, and
  // Stealthy's +2. Perception +5 uses 2 ranks plus class.
  galluvix: {
    name: "Galluvix",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 7, dex: 14, con: 11, wis: 10, cha: 12 },
    ownInt: 15,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
    speeds: { land: 30, fly: 20 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "clumsy",
    skillRacialMods: { blf: 2, dis: 2, esc: 2, ste: 2 },
    ownSkillRanks: { blf: 3, dis: 3, per: 2, ste: 3 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "ghost-sound", name: "Ghost Sound", frequency: "atWill", cl: 3 },
      { slug: "mage-hand", name: "Mage Hand", frequency: "atWill", cl: 3 },
      { slug: "open-close", name: "Open/Close", frequency: "atWill", cl: 3 },
      {
        slug: "blurred-movement",
        name: "Blurred Movement",
        frequency: { uses: 3, per: "day" },
        cl: 3,
      },
      { slug: "calm-animals", name: "Calm Animals", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "sonic-scream", name: "Sonic Scream", frequency: { uses: 3, per: "day" }, cl: 3 },
    ],
    languages: ["Common", "Sylvan", "Undercommon"],
    specialNotes: [
      "Change shape (chicken or fox; beast shape II)",
      "Trickster's egg (1/week): fetches a wooden egg that functions as a potion of cure light wounds, delay poison, lesser restoration, or remove paralysis for the galluvix or one chosen creature; as a familiar it can return beside its master",
      "Drift: can't hover; must land or perch at the end of a move",
      "Unlikely form: counts as both a chicken and a fox for effects that target creatures by type; +4 Survival to follow tracks by scent",
      "Own feats: Deceitful (+2 Bluff and Disguise folded into the totals), Stealthy (+2 Escape Artist and Stealth folded into the totals)",
    ],
    prereq: { casterLevel: 7 },
    source: "Pathfinder #128 p.84 (expanded Improved Familiar table)",
  },

  // Gallows of Madness p.62. baseSaves: Fort 3-0, Ref 5-2, Will 2-0, with Iron
  // Will's +2 folded into the Will base. Climb +10 is Dex +2 plus the
  // climb-speed +8 at 0 ranks. Acrobatics +5 cannot reconcile: Dex +2, 1 rank,
  // and class +3 total +6, so the printed block is off by 1; the derived sheet
  // shows 6.
  katroome: {
    name: "Katroome",
    size: "sm",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 2,
    abilities: { str: 6, dex: 15, con: 10, wis: 11, cha: 13 },
    ownInt: 14,
    baseSaves: { fort: 3, ref: 3, will: 2 },
    naturalArmor: 0,
    attacks: [{ name: "Slam", count: 1, damageDice: "1d3" }],
    speeds: { land: 20, climb: 20 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillRacialMods: { sen: 4 },
    ownSkillRanks: { acr: 1, blf: 1, kar: 1, per: 2, sen: 2, spl: 2, ste: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "command", name: "Command", frequency: { uses: 3, per: "day" }, cl: 5 },
      { slug: "detect-magic", name: "Detect Magic", frequency: { uses: 3, per: "day" }, cl: 5 },
      { slug: "invisibility", name: "Invisibility", frequency: { uses: 1, per: "day" }, cl: 5 },
      { slug: "suggestion", name: "Suggestion", frequency: { uses: 1, per: "day" }, cl: 5 },
    ],
    languages: ["Common", "Goblin", "Sylvan"],
    specialNotes: [
      "Web (+5 ranged, DC 11, 2 hp)",
      "+4 Stealth in forested environments (situational, not in the derived total)",
      "Printed Acrobatics +5 does not reconcile (Dex +2, 1 rank, class +3 = +6); the derived sheet shows 6",
      "Own feats: Iron Will (folded into its Will base save)",
    ],
    prereq: { casterLevel: 5 },
    source: "Gallows of Madness p.62 (expanded Improved Familiar table)",
  },

  // Pathfinder #107 p.87. baseSaves: Fort 4-1, Ref 6-3, Will 3-2 (Con 12/Dex
  // 17/Wis 15). Climb +11 is Dex +3 plus the climb-speed +8 at 0 ranks;
  // Perception and Stealth use 3 ranks plus class. Acrobatics +6 cannot
  // reconcile: Dex +3, 1 rank, and class +3 total +7, so the printed block is
  // off by 1; the derived sheet shows 7. AC's +1 dodge stays unmodeled.
  nehushtan: {
    name: "Nehushtan",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 7, dex: 17, con: 12, wis: 15, cha: 12 },
    ownInt: 10,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 30, climb: 15 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    ownSkillRanks: { acr: 1, per: 3, ste: 3 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { immune: ["disease", "poison"] },
    slas: [
      { slug: "diagnose-disease", name: "Diagnose Disease", frequency: "atWill", cl: 3 },
      {
        slug: "speak-with-animals",
        name: "Speak with Animals",
        frequency: "atWill",
        cl: 3,
        note: "snakes only",
      },
      { slug: "hypnotism", name: "Hypnotism", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "remove-sickness",
        name: "Remove Sickness",
        frequency: { uses: 3, per: "day" },
        cl: 3,
      },
      { slug: "sanctuary", name: "Sanctuary", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "neutralize-poison",
        name: "Neutralize Poison",
        frequency: { uses: 1, per: "day" },
        cl: 3,
      },
      { slug: "remove-disease", name: "Remove Disease", frequency: { uses: 1, per: "day" }, cl: 3 },
    ],
    languages: ["Common (can't speak)"],
    specialNotes: [
      "Curative skin (Su): treats disease and poison as the Heal skill without a check; its master gains +2 on saves against disease and poison within 1 mile; shed skin can make a remove disease or neutralize poison draught",
      "Poison (bite): Fort DC 12, 1/round for 6 rounds, 1d4 fire damage, cure 1 save",
      "AC includes an unmodeled +1 dodge bonus",
      "Printed Acrobatics +6 does not reconcile (Dex +3, 1 rank, class +3 = +7); the derived sheet shows 7",
      "Own feats: Dodge, Mobility",
    ],
    prereq: { casterLevel: 7, masterAlignment: { moral: ["G"], label: "any good" } },
    source: "Pathfinder #107 p.87 (expanded Improved Familiar table)",
  },

  // Bestiary 4 p.215. baseSaves: Fort 2-(-1), Ref 6-3, Will 1-0 (Con 9/Dex
  // 16/Wis 11). Climb +7 is Str -5, 1 rank, class +3, and the climb-speed +8
  // (the printed block keeps Str, hence the ability override); Stealth +19 is
  // Dex +3, Diminutive +12, 1 rank, class +3.
  pipefox: {
    name: "Pipefox",
    size: "dim",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 1, dex: 16, con: 9, wis: 11, cha: 14 },
    ownInt: 14,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d2" }],
    speeds: { land: 30, climb: 20 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillAbilityOverrides: { clm: "str" },
    ownSkillRanks: { clm: 1, kar: 3, per: 2, sen: 2, ste: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "comprehend-languages", name: "Comprehend Languages", frequency: "constant", cl: 3 },
      { slug: "augury", name: "Augury", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "vanish", name: "Vanish", frequency: { uses: 3, per: "day" }, cl: 3 },
      {
        slug: "detect-thoughts",
        name: "Detect Thoughts",
        frequency: { uses: 1, per: "day" },
        cl: 3,
      },
      { slug: "divination", name: "Divination", frequency: { uses: 1, per: "day" }, cl: 3 },
      {
        slug: "greater-invisibility",
        name: "Greater Invisibility",
        frequency: { uses: 1, per: "day" },
        cl: 3,
        spell: "Invisibility, Greater",
        note: "self only",
      },
    ],
    languages: ["Common", "Draconic"],
    specialNotes: [
      "Compression (moves through narrow spaces without squeezing penalties)",
      "Serves only a spellcaster it has agreed to serve",
      "Own feats: Improved Initiative, Weapon Finesse",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 4 p.215 (expanded Improved Familiar table)",
  },

  // Familiar Folio p.29. baseSaves: Fort 3-0, Ref 5-2, Will 6-3, with Iron
  // Will's +2 folded into the Will base. Fly +6 is Dex +2, Tiny +4, average +0
  // at 0 ranks. Alertness's +2 Perception and +2 Sense Motive are folded into
  // skillRacialMods; Perception adds 3 ranks and class, Sense Motive none.
  pseudosphinx: {
    name: "Pseudosphinx",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 5, dex: 14, con: 11, wis: 16, cha: 12 },
    ownInt: 9,
    baseSaves: { fort: 3, ref: 3, will: 3 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d3" },
      { name: "Claw", count: 2, damageDice: "1d2" },
    ],
    speeds: { land: 20, fly: 30 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "average",
    skillRacialMods: { per: 2, sen: 2 },
    ownSkillRanks: { per: 3 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { dr: "5/magic", sr: 13 },
    slas: [
      { slug: "comprehend-languages", name: "Comprehend Languages", frequency: "constant", cl: 5 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "atWill", cl: 5 },
      { slug: "detect-secret-doors", name: "Detect Secret Doors", frequency: "atWill", cl: 5 },
      { slug: "burning-hands", name: "Burning Hands", frequency: { uses: 3, per: "day" }, cl: 5 },
      { slug: "cause-fear", name: "Cause Fear", frequency: { uses: 3, per: "day" }, cl: 5 },
      { slug: "identify", name: "Identify", frequency: { uses: 3, per: "day" }, cl: 5 },
      { slug: "vanish", name: "Vanish", frequency: { uses: 3, per: "day" }, cl: 5 },
    ],
    languages: ["Common", "Sphinx"],
    specialNotes: [
      "Aided insight (1/day): a Wisdom check with a bonus equal to the querent's level, treated as a Knowledge check; must be touching the querent",
      "Own feats: Alertness (+2 Perception and Sense Motive folded into the totals), Iron Will (folded into its Will base save)",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Familiar Folio p.29 (expanded Improved Familiar table)",
  },

  // Occult Bestiary p.44. baseSaves: Fort 4-1, Ref 6-3, Will 2-1 (Con 13/Dex
  // 16/Wis 13). Diplomacy +12 is Cha +2, 3 ranks, and a +7 skillRacialMods
  // entry combining the printed +4 racial bonus with Skill Focus's +3; Sense
  // Motive and Perception each use 3 ranks, Perception with class.
  "psyche-serpent": {
    name: "Psyche Serpent",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 6, dex: 16, con: 13, wis: 13, cha: 14 },
    ownInt: 13,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 40 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillRacialMods: { dip: 7 },
    ownSkillRanks: { dip: 3, per: 3, sen: 3 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    languages: ["Common"],
    specialNotes: [
      "Psychic magic (PE 5, CL 6th): charm person (1 PE, DC 13), detect thoughts (2 PE, DC 13), invisibility (2 PE, self only)",
      "Hypnotic hood: can use the hypnotism occult skill unlock as a full-round action, unlimited times per day",
      "Painless bite: the bite and its poison are unnoticed, and a successful save goes unnoticed",
      "Poison (bite): Fort DC 14 (includes a +2 racial bonus), 1/round for 6 rounds, 1d3 Wis damage, cure 2 consecutive saves; Wis damage makes the victim willing for its hypnotism",
      "Own feats: Skill Focus (Diplomacy, folded into its Diplomacy total), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "N" },
    source: "Occult Bestiary p.44 (expanded Improved Familiar table)",
  },

  // Bestiary 4 p.226. baseSaves: Fort 4-1, Ref 5-2, Will 1-0 (Con 13/Dex
  // 15/Wis 10). Climb +6 is Str -2 plus the climb-speed +8 at 0 ranks (the
  // printed block keeps Str, hence the ability override); Perception +6 is 3
  // ranks plus class. AC's +1 dodge stays unmodeled. Commune is the
  // familiar-only 1/week ability at CL 12.
  ratling: {
    name: "Ratling",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 6, dex: 15, con: 13, wis: 10, cha: 13 },
    ownInt: 12,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus bleed 1" }],
    speeds: { land: 30, burrow: 10, climb: 20, swim: 30 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    skillAbilityOverrides: { clm: "str" },
    ownSkillRanks: { per: 3 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: { immune: ["disease", "poison"] },
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      { slug: "read-magic", name: "Read Magic", frequency: "constant", cl: 6 },
      {
        slug: "speak-with-animals",
        name: "Speak with Animals",
        frequency: "constant",
        cl: 6,
        note: "rodents only",
      },
      { slug: "spider-climb", name: "Spider Climb", frequency: "constant", cl: 6 },
      { slug: "tongues", name: "Tongues", frequency: "constant", cl: 6 },
      { slug: "cause-fear", name: "Cause Fear", frequency: { uses: 3, per: "day" }, cl: 6 },
      { slug: "dimension-door", name: "Dimension Door", frequency: { uses: 3, per: "day" }, cl: 6 },
      {
        slug: "invisibility",
        name: "Invisibility",
        frequency: { uses: 3, per: "day" },
        cl: 6,
        note: "self only",
      },
      {
        slug: "summon-swarm",
        name: "Summon Swarm",
        frequency: { uses: 1, per: "day" },
        cl: 6,
        note: "rat swarm only",
      },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Aklo"],
    specialNotes: [
      "Evasion",
      "Sneak attack +1d6",
      "Scroll use: can cast spells from any magic scroll as if the spell were on its spell list",
      "AC includes an unmodeled +1 dodge bonus",
      "Own feats: Dodge, Mobility",
    ],
    prereq: { casterLevel: 7, alignment: "CE" },
    source: "Bestiary 4 p.226 (expanded Improved Familiar table)",
  },

  // Monster Codex p.208. baseSaves: Fort 5-2, Ref 5-2, Will 2-1 (Con 14/Dex
  // 15/Wis 13). Bluff +7 is Cha 0, 3 ranks, and the printed +4 racial;
  // Perception +10 is Wis +1, 2 ranks, class +3, and the same +4. Fly +4 is
  // Dex +2, Small +2, average +0 at 0 ranks. AC's +1 dodge stays unmodeled.
  seru: {
    name: "Seru",
    size: "sm",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 6, dex: 15, con: 14, wis: 13, cha: 10 },
    ownInt: 11,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4", note: "plus poison" }],
    speeds: { land: 20, fly: 40 },
    senses: ["darkvision 60 ft.", "low-light vision", "scent"],
    flyManeuverability: "average",
    skillRacialMods: { blf: 4, per: 4 },
    ownSkillRanks: { blf: 3, per: 2, ste: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    languages: ["Aklo (can't speak)", "Common (can't speak)"],
    specialNotes: [
      "Telepathy 60 ft.",
      "Spit venom (Ex): +6 ranged touch up to 30 ft., exposes the target to its poison",
      "Poison (bite or spit): Fort DC 15, 1/minute for 6 minutes, 1 Con damage and blindness for 1 minute, cure 1 save",
      "AC includes an unmodeled +1 dodge bonus",
      "+4 Stealth in rocky areas (situational, not in the derived total)",
      "Own feats: Dodge, Flyby Attack (bonus), Improved Initiative, Weapon Finesse (bonus)",
    ],
    prereq: { casterLevel: 7, masterAlignment: { moral: ["E"], label: "any evil" } },
    source: "Monster Codex p.208 (expanded Improved Familiar table)",
  },

  // Pathfinder #73 p.89. baseSaves: Fort 3-0, Ref 5-2, Will 3-2 (Con 10/Dex
  // 15/Wis 15). Fly +10 is Dex +2, Tiny +4, average +0, 1 rank, class +3.
  // Perception +9 is Wis +2, 2 ranks, class +3, and Alertness's +2; Sense
  // Motive's +5 racial entry is Alertness +2 plus Skill Focus +3.
  "sin-seeker": {
    name: "Sin Seeker",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 7, dex: 15, con: 10, wis: 15, cha: 8 },
    ownInt: 12,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 20, fly: 50 },
    senses: ["blindsight 50 ft.", "low-light vision", "scent"],
    flyManeuverability: "average",
    skillRacialMods: { per: 2, sen: 5 },
    ownSkillRanks: { fly: 1, per: 2 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    defenses: {
      immune: ["gaze attacks", "visual effects and illusions", "attacks that rely on sight"],
    },
    slas: [
      {
        slug: "detect-alignment",
        name: "Detect Alignment",
        frequency: "constant",
        cl: 3,
        dcAbility: "wis",
        note: "one of detect chaos, detect evil, detect good, or detect law",
      },
      {
        slug: "comprehend-languages",
        name: "Comprehend Languages",
        frequency: "atWill",
        cl: 3,
        dcAbility: "wis",
      },
      {
        slug: "confess",
        name: "Confess",
        frequency: { uses: 3, per: "day" },
        cl: 3,
        dcAbility: "wis",
      },
      {
        slug: "zone-of-truth",
        name: "Zone of Truth",
        frequency: { uses: 3, per: "day" },
        cl: 3,
        dcAbility: "wis",
      },
      {
        slug: "follow-aura",
        name: "Follow Aura",
        frequency: { uses: 1, per: "day" },
        cl: 3,
        dcAbility: "wis",
      },
      {
        slug: "seek-thoughts",
        name: "Seek Thoughts",
        frequency: { uses: 1, per: "day" },
        cl: 3,
        dcAbility: "wis",
      },
    ],
    languages: ["Common"],
    specialNotes: [
      "Telepathy 30 ft.",
      "Aura of honesty (Su): 10 ft., -2 on Bluff, Sleight of Hand, and Escape Artist checks; DC 13 Will each time",
      "Eyeless: immune to gaze attacks, visual effects and illusions, and attacks that rely on sight",
      "Own feats: Alertness (+2 Perception and Sense Motive folded into the totals), Skill Focus (Sense Motive, folded into its Sense Motive total)",
    ],
    prereq: { casterLevel: 5 },
    source: "Pathfinder #73 p.89 (expanded Improved Familiar table)",
  },

  // Pathfinder #61 p.86. baseSaves: Fort 3-1, Ref 4-2, Will 1-1 (Con 13/Dex
  // 15/Wis 13). Stealth +14 is Dex +2, Tiny +8, 1 rank, class +3; Perception
  // +1 is Wis alone at 0 ranks.
  skvader: {
    name: "Skvader",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 1,
    abilities: { str: 8, dex: 15, con: 13, wis: 13, cha: 6 },
    ownInt: 4,
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus attach" }],
    speeds: { land: 40, fly: 40 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "poor",
    ownSkillRanks: { ste: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    specialNotes: [
      "Attach (Ex): a bite hit automatically grapples and deals bite damage each round; an attached skvader loses its Dex bonus to AC and has AC 12",
      "Own feats: Weapon Finesse",
    ],
    prereq: { casterLevel: 3, alignment: "N" },
    source: "Pathfinder #61 p.86 (expanded Improved Familiar table)",
  },

  // Pathfinder #61 p.87. baseSaves: Fort 5-2, Ref 5-2, Will 1-1 (Con 15/Dex
  // 14/Wis 13). Fly +6 is Dex +2, Tiny +4, average +0 at 0 ranks; Perception
  // and Stealth each use 1 rank plus class.
  wolpertinger: {
    name: "Wolpertinger",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 2,
    abilities: { str: 9, dex: 14, con: 15, wis: 13, cha: 6 },
    ownInt: 4,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 0,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d3", note: "plus bleed 1d4" },
      { name: "Gore", count: 1, damageDice: "1d3" },
    ],
    speeds: { land: 40, fly: 40 },
    senses: ["darkvision 60 ft.", "low-light vision"],
    flyManeuverability: "average",
    ownSkillRanks: { per: 1, ste: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    specialNotes: ["Bleed 1d4 on a bite hit", "Own feats: Weapon Finesse"],
    prereq: { casterLevel: 5, alignment: "N" },
    source: "Pathfinder #61 p.87 (expanded Improved Familiar table)",
  },

  // Bestiary 5 p.284. baseSaves: Fort 5-2, Ref 6-3, Will 1-0 (Con 14/Dex
  // 16/Wis 11). Acrobatics +11 is Dex +3 plus the printed +8 racial at 0
  // ranks; Disable Device and Sleight of Hand each add 1 rank and a +4 racial;
  // Escape Artist and Stealth carry Stealthy's +2. Perception +4 is 1 rank
  // plus class.
  xiao: {
    name: "Xiao",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 3,
    abilities: { str: 4, dex: 16, con: 14, wis: 11, cha: 13 },
    ownInt: 7,
    baseSaves: { fort: 3, ref: 3, will: 1 },
    naturalArmor: 0,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Slam", count: 2, damageDice: "1d3" },
    ],
    speeds: { land: 30, fly: 30 },
    senses: ["darkvision 60 ft.", "low-light vision", "scent"],
    flyManeuverability: "good",
    skillRacialMods: { acr: 8, dev: 4, slt: 4, esc: 2, ste: 2 },
    ownSkillRanks: { dev: 1, per: 1, slt: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "burning-hands", name: "Burning Hands", frequency: { uses: 3, per: "day" }, cl: 3 },
      { slug: "spark", name: "Spark", frequency: { uses: 3, per: "day" }, cl: 3 },
    ],
    languages: ["Common (can't speak)"],
    specialNotes: [
      "Sneak attack +1d6",
      "Own feats: Stealthy (+2 Escape Artist and Stealth folded into the totals), Weapon Finesse",
    ],
    prereq: { casterLevel: 7 },
    source: "Bestiary 5 p.284 (expanded Improved Familiar table)",
  },

  // Bestiary 3 p.288. baseSaves: Fort 3-0, Ref 5-2, Will 1-1 (Con 10/Dex
  // 15/Wis 12). Acrobatics +12 is Dex +2, 1 rank, class +3, and the printed +6
  // racial; Climb +16 is Dex +2 plus the climb-speed +8 and the same +6 at 0
  // ranks. Perception +5 is 1 rank plus class.
  zoog: {
    name: "Zoog",
    size: "tiny",
    typeKind: "magical beast",
    creatureType: "Magical beast",
    hd: 2,
    abilities: { str: 6, dex: 15, con: 10, wis: 12, cha: 5 },
    ownInt: 5,
    baseSaves: { fort: 3, ref: 3, will: 0 },
    naturalArmor: 0,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d3", note: "plus bleed 1" },
      { name: "Claw", count: 2, damageDice: "1d2" },
    ],
    speeds: { land: 30, climb: 30 },
    senses: ["darkvision 60 ft.", "low-light vision", "scent", "spell sight"],
    skillRacialMods: { acr: 6, clm: 6 },
    ownSkillRanks: { acr: 1, per: 1 },
    classSkills: ["acr", "clm", "fly", "per", "ste", "swm"],
    slas: [
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 1 },
      { slug: "speak-with-animals", name: "Speak with Animals", frequency: "constant", cl: 1 },
    ],
    languages: ["Aklo"],
    specialNotes: [
      "Bleed 1 on a bite hit",
      "Otherworldly touch: its natural attacks can strike incorporeal creatures as ghost touch weapons",
      "Spell sight: its eyes shed light in a 15 ft. cone and reveal magic auras",
      "Own feats: Weapon Finesse",
    ],
    prereq: { casterLevel: 5, alignment: "CE" },
    source: "Bestiary 3 p.288 (expanded Improved Familiar table)",
  },
};
