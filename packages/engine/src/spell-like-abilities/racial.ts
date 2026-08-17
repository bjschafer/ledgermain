/**
 * Spell-like abilities granted by races and racial traits. Two tables:
 *
 * - `RACE_SLA_GRANTS`, keyed by `Race.name` — SLAs the race's own
 *   description grants (the vendored `races.json` records these only in the
 *   description HTML, never as changes/uses/actions, so every entry here is
 *   authored from the published racial-trait text and checked against that
 *   description). Subject to standard-trait suppression via
 *   `standardTraitName` — see `types.ts`.
 * - `RACIAL_TRAIT_SLA_GRANTS`, keyed by a racial-trait id — either a
 *   vendored `RefData.racialTraits` id or a hand-authored
 *   `RACIAL_TRAITS` id (`racial-traits.ts`; the two stores' ids never
 *   collide). The heritage "Spell-Like Ability (…)" traits carry a vendored
 *   `uses` block that already derives a pool row, so their defs attach to it
 *   (`attachToSourcePool`) rather than minting a second counter.
 */

import type { RaceSlaGrantDef, SlaGrantDef } from "./types.js";

export const RACE_SLA_GRANTS: Readonly<Record<string, readonly RaceSlaGrantDef[]>> = {
  // CRB p.23, Gnome Magic: "Gnomes with Charisma scores of 11 or higher also
  // gain the following spell-like abilities: 1/day — dancing lights, ghost
  // sound, prestidigitation, and speak with animals. The caster level for
  // these effects is equal to the gnome's level." (The +1 illusion save DC
  // half of Gnome Magic is a separate spellDC concern, not modeled here.)
  Gnome: [
    {
      slug: "dancing-lights",
      spell: "Dancing Lights",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
    {
      slug: "ghost-sound",
      spell: "Ghost Sound",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
    {
      slug: "prestidigitation",
      spell: "Prestidigitation",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
  ],
  // ARG p.168 / Bestiary tiefling: "Tieflings can use darkness once per day
  // as a spell-like ability. The caster level for this ability equals the
  // tiefling's class level." (Matches the vendored race description.)
  Tiefling: [
    {
      slug: "darkness",
      spell: "Darkness",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Aasimar, Spell-Like Ability (Sp): "Aasimars can use Daylight once per
  // day as a spell-like ability (caster level equal to the aasimar's class
  // level)." The vendored alternates that swap this out (Variant Aasimar
  // Abilities, Heavenborn, Incorruptible, ...) all replace the singular
  // "Spell-Like Ability", so the trait's real published name is singular
  // even though the description groups it under a plural header.
  Aasimar: [
    {
      slug: "daylight",
      spell: "Daylight",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Aphorite, Spell-Like Abilities: "Aphorites can use Protection From
  // Chaos once per day as a spell-like ability (caster level equal to the
  // aphorite's class level)." The vendored alternates (Eternal Smith, Urban
  // Memories) replace singular "Spell-Like Ability", so that's the name used
  // here despite the description's plural header.
  Aphorite: [
    {
      slug: "protection-from-chaos",
      spell: "Protection from Chaos",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Dhampir, Spell-Like Abilities (Su): "A dhampir can use Detect Undead
  // three times per day as a spell-like ability. The caster level for this
  // ability equals the dhampir's class level." The vendored heritage
  // alternates (Ancient-Born, Ru-Shi, Svetocher, Ajibachana, Fangs, Dayborn,
  // Heir to Undying Nobility) all replace the singular "Spell-Like Ability
  // (Dhampir)", so the standard-trait name is singular despite the
  // description's plural header.
  Dhampir: [
    {
      slug: "detect-undead",
      spell: "Detect Undead",
      uses: { formula: "3", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Drow, Spell-Like Abilities (Su): "Drow can cast Dancing Lights,
  // Darkness, and Faerie Fire, once each per day, using their total
  // character level as caster level." (The Drow Noble variant below is a
  // separate, larger suite.)
  Drow: [
    {
      slug: "dancing-lights",
      spell: "Dancing Lights",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Abilities",
    },
    {
      slug: "darkness",
      spell: "Darkness",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Abilities",
    },
    {
      slug: "faerie-fire",
      spell: "Faerie Fire",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Abilities",
    },
  ],
  // ARG Drow Noble, Spell-Like Abilities (Su): "Drow Nobles can cast Dancing
  // Lights, Deeper Darkness, Faerie Fire, Feather Fall and Levitate each at
  // will, and have Detect Magic as a constant spell-like ability. A drow
  // noble can also cast divine favor, dispel magic, and suggestion once per
  // day each. ... A drow noble's caster level for her spell-like abilities
  // is equal to her character level."
  "Drow Noble": [
    { slug: "dancing-lights", spell: "Dancing Lights", frequency: "atWill" },
    { slug: "deeper-darkness", spell: "Deeper Darkness", frequency: "atWill" },
    { slug: "faerie-fire", spell: "Faerie Fire", frequency: "atWill" },
    { slug: "feather-fall", spell: "Feather Fall", frequency: "atWill" },
    { slug: "levitate", spell: "Levitate", frequency: "atWill" },
    { slug: "detect-magic", spell: "Detect Magic", frequency: "constant" },
    { slug: "divine-favor", spell: "Divine Favor", uses: { formula: "1", per: "day" } },
    { slug: "dispel-magic", spell: "Dispel Magic", uses: { formula: "1", per: "day" } },
    { slug: "suggestion", spell: "Suggestion", uses: { formula: "1", per: "day" } },
  ],
  // ARG Duergar, Spell-Like Abilities: "A duergar can use Enlarge Person and
  // Invisibility once per day, using its character level as its caster level
  // and affecting itself only." The vendored alternates split the two:
  // Ironskinned replaces only "Enlarge Person Spell-Like Ability" while
  // Blood Enmity / Magical Taskmaster / Twilight-Touched replace only
  // "Invisibility Spell-Like Ability", so each grant carries its own
  // sub-trait name rather than the umbrella header.
  Duergar: [
    {
      slug: "enlarge-person",
      spell: "Enlarge Person",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Enlarge Person Spell-Like Ability",
      note: "self only",
    },
    {
      slug: "invisibility",
      spell: "Invisibility",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Invisibility Spell-Like Ability",
      note: "self only",
    },
  ],
  // ARG Fetchling, Spell-Like Abilities (Sp): "A fetchling can use Disguise
  // Self once per day as a spell-like ability. ... When a fetchling reaches
  // 9th level in any combination of classes, he gains Shadow Walk (self
  // only) ... When a fetchling reaches 13th level ..., he gains Plane
  // Shift(self only, to the Shadow Plane or the Material Plane only)."
  // Caster level is the fetchling's total Hit Dice (character level) for
  // all three tiers.
  Fetchling: [
    {
      slug: "disguise-self",
      spell: "Disguise Self",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Abilities",
    },
    {
      slug: "shadow-walk",
      spell: "Shadow Walk",
      uses: { formula: "1", per: "day" },
      minLevel: 9,
      standardTraitName: "Spell-Like Abilities",
      note: "self only",
    },
    {
      slug: "plane-shift",
      spell: "Plane Shift",
      uses: { formula: "1", per: "day" },
      minLevel: 13,
      standardTraitName: "Spell-Like Abilities",
      note: "self only, to the Shadow Plane or the Material Plane only",
    },
  ],
  // ARG Gathlain, Spell-Like Abilities: "1/day—entangle, feather step
  // (caster level equals the gathlain's character level)." Most vendored
  // alternates replace the plural "Spell-Like Abilities", but Natural
  // Bounty (the one this content wave also wires) replaces it under the
  // singular "Spell-Like Ability" instead; the singular is used here so
  // that specific, tested interaction suppresses correctly, at the cost of
  // the plural-named alternates not suppressing this grant.
  Gathlain: [
    {
      slug: "entangle",
      spell: "Entangle",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
    {
      slug: "feather-step",
      spell: "Feather Step",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Ghoran, Natural Magic (Sp): "Ghorans with a Charisma score of 11 or
  // higher gain the following spell-like abilities: 1/day—detect poison,
  // goodberry ..., and purify food and drink. The caster level is equal to
  // the ghoran's level." (The vendored alternates that replace this trait
  // misname it "Nature Magic" rather than "Natural Magic" — a vendor typo
  // this entry can't correct — except Intoxicating Aroma, which uses the
  // correct name and so is the one alternate that actually suppresses this.)
  Ghoran: [
    {
      slug: "detect-poison",
      spell: "Detect Poison",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Natural Magic",
    },
    {
      slug: "goodberry",
      spell: "Goodberry",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Natural Magic",
    },
    {
      slug: "purify-food-and-drink",
      spell: "Purify Food and Drink",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Natural Magic",
    },
  ],
  // ARG Green Martian, Detect Thoughts: "they can use detect thoughts as a
  // constant spell-like ability. The caster level of the spell-like ability
  // is equal to the user's character level."
  "Green Martian": [{ slug: "detect-thoughts", spell: "Detect Thoughts", frequency: "constant" }],
  // ARG Ifrit, Spell-Like Ability (Sp): "Ifrits can use Burning Hands 1/day
  // as a spell-like ability (caster level equals the ifrit's level; DC 11 +
  // Charisma modifier)." DC 11 matches the default (Burning Hands is
  // sor/wiz 1), so no override.
  Ifrit: [
    {
      slug: "burning-hands",
      spell: "Burning Hands",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Kitsune, Kitsune Magic (Ex/Sp): "Kitsune with a Charisma score of 11
  // or higher gain the following spell-like ability: 3/day—Dancing Lights
  // (caster level equals the kitsune's level)."
  Kitsune: [
    {
      slug: "dancing-lights",
      spell: "Dancing Lights",
      uses: { formula: "3", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Kitsune Magic",
    },
  ],
  // ARG Oread, Spell-Like Ability (Sp): "Oread can use Magic Stone 1/day
  // (caster level equals the oread's total level; DC 11 + Charisma
  // modifier)." DC 11 matches the default (Magic Stone has no sor/wiz
  // listing; the lowest of its other class-list levels is 1st).
  Oread: [
    {
      slug: "magic-stone",
      spell: "Magic Stone",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // Samsaran Magic (Sp): "Samsarans with a Charisma score of 11 or higher
  // gain the following spell-like abilities: 1/day—comprehend languages,
  // deathwatch, and stabilize. The caster level for these effects is equal
  // to the samsaran's level."
  Samsaran: [
    {
      slug: "comprehend-languages",
      spell: "Comprehend Languages",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Samsaran Magic",
    },
    {
      slug: "deathwatch",
      spell: "Deathwatch",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Samsaran Magic",
    },
    {
      slug: "stabilize",
      spell: "Stabilize",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Samsaran Magic",
    },
  ],
  // ARG Skinwalker, Spell-Like Ability: "Skinwalkers with a Wisdom score of
  // 11 or higher can use speak with animals once per day as a spell-like
  // ability. The caster level for this ability is equal to the skinwalker's
  // character level." (Heritage-specific SLAs mentioned in the same
  // paragraph are separate, unwired alternate racial traits.)
  Skinwalker: [
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "wis", score: 11 },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Svirfneblin, Svirfneblin Magic: "Svirfneblin also gain the following
  // spell-like abilities: Constant—Nondetection; 1/day—Blindness/Deafness
  // (DC 12 + Charisma modifier), Blur, Disguise Self; caster level equals
  // the svirfneblin's class levels." DC 12 matches the default
  // (Blindness/Deafness is sor/wiz 2).
  Svirfneblin: [
    { slug: "nondetection", spell: "Nondetection", frequency: "constant" },
    {
      slug: "blindness-deafness",
      spell: "Blindness/Deafness",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Svirfneblin Magic",
    },
    {
      slug: "blur",
      spell: "Blur",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Svirfneblin Magic",
    },
    {
      slug: "disguise-self",
      spell: "Disguise Self",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Svirfneblin Magic",
    },
  ],
  // ARG Sylph, Spell-Like Ability (Sp): "Sylphs can use Feather Fall 1/day
  // (caster level equals the sylph's total level)."
  Sylph: [
    {
      slug: "feather-fall",
      spell: "Feather Fall",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Triton, Spell-Like Ability: "Tritons can cast summon nature's ally
  // II once per day to summon either a small water elemental or 1d3
  // dolphins only." No caster level is stated in the vendored slice, so
  // this rides the racial default (total character level).
  Triton: [
    {
      slug: "summon-natures-ally-ii",
      spell: "Summon Nature's Ally II",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
      note: "small water elemental or 1d3 dolphins only",
    },
  ],
  // Vine Leshy, Pass without Trace: "Vine leshys have pass without trace as
  // a constant spell-like ability (caster level 2nd)." A fixed CL, not the
  // usual character-level default.
  "Vine Leshy": [
    {
      slug: "pass-without-trace",
      spell: "Pass without Trace",
      frequency: "constant",
      cl: "2",
      standardTraitName: "Pass Without Trace",
    },
  ],
  // ARG Undine, Spell-Like Ability (Sp): "Undines can use Hydraulic Push
  // 1/day (caster level equals the undine's level)."
  Undine: [
    {
      slug: "hydraulic-push",
      spell: "Hydraulic Push",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
  // ARG Wayang, Shadow Magic: "Wayangs with a Charisma score of 11 or
  // higher also gain the following spell-like abilities: 1/day—ghost
  // sound, pass without trace, and ventriloquism. The caster level for
  // these effects is equal to the wayang's level."
  Wayang: [
    {
      slug: "ghost-sound",
      spell: "Ghost Sound",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Shadow Magic",
    },
    {
      slug: "pass-without-trace",
      spell: "Pass without Trace",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Shadow Magic",
    },
    {
      slug: "ventriloquism",
      spell: "Ventriloquism",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Shadow Magic",
    },
  ],
};

export const RACIAL_TRAIT_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  // The ten Blood of Fiends tiefling heritage variants — each vendored entry
  // reads "<Heritage> can use <Spell> once per day as a spell-like ability
  // (with a caster level equal to their character level)" and carries a
  // 1/day uses block, so each def attaches to that pool. Spell names below
  // are verbatim from the vendored descriptions.
  // Beastbrood: Detect Thoughts.
  ETapFH3D6SF1WwVn: [
    { slug: "detect-thoughts", spell: "Detect Thoughts", attachToSourcePool: true },
  ],
  // Faultspawn: Hideous Laughter.
  v6eFa2pTphzZzFDP: [
    { slug: "hideous-laughter", spell: "Hideous Laughter", attachToSourcePool: true },
  ],
  // Foulspawn: Bear's Endurance.
  fLfQPOGCnNhp6Q5A: [
    { slug: "bears-endurance", spell: "Bear's Endurance", attachToSourcePool: true },
  ],
  // Grimspawn: Death Knell.
  dagWgGQYv20usVZW: [{ slug: "death-knell", spell: "Death Knell", attachToSourcePool: true }],
  // Hellspawn: Pyrotechnics.
  OayRgLPHanjzhdK0: [{ slug: "pyrotechnics", spell: "Pyrotechnics", attachToSourcePool: true }],
  // Hungerseed: Alter Self.
  gDO7etqF3QCXKyWZ: [{ slug: "alter-self", spell: "Alter Self", attachToSourcePool: true }],
  // The Motherless: Blur.
  n98kLjKTeMEM5rdx: [{ slug: "blur", spell: "Blur", attachToSourcePool: true }],
  // Pitborn: Shatter.
  TNbX1iRPplCIvhdO: [{ slug: "shatter", spell: "Shatter", attachToSourcePool: true }],
  // Shackleborn: Web.
  "93KXq6n1wiX0ifEy": [{ slug: "web", spell: "Web", attachToSourcePool: true }],
  // Spitespawn: Misdirection.
  eNSivYdOXqQpPe52: [{ slug: "misdirection", spell: "Misdirection", attachToSourcePool: true }],
  // Dhampir Ancient-Born (Blood of the Night): "Ancient-Born gain Doom as a
  // spell-like ability" — vendored uses block meters it at 3/day.
  "09c76EsW9zGXAEZ0": [{ slug: "doom", spell: "Doom", attachToSourcePool: true }],
  // Elf, Fey-Sighted (ARG, replaces Elven Magic): "These elves have detect
  // magic as a constant spell-like ability, with a caster level equal to
  // their character level."
  zgkOFWDlY1YksSel: [{ slug: "detect-magic", spell: "Detect Magic", frequency: "constant" }],
  // Elf, Frostmelding (ARG, replaces Elven Magic): "Elves with this
  // alternate racial trait can use meld into stone as a spell-like ability
  // once per day, with a caster level equal to their character level,
  // except that they instead meld with snow and ice and the spell duration
  // is 1 round per level." Vendored uses.maxFormula (1/day) derives the pool.
  MQnZG0JAiMqtO91T: [
    {
      slug: "meld-into-stone",
      spell: "Meld into Stone",
      attachToSourcePool: true,
      note: "melds with snow and ice instead of stone",
    },
  ],
  // Elf, Sense Thoughts (ARG, replaces Elven Immunities and Keen Senses):
  // "Elves with this alternate racial trait can use detect thoughts as a
  // spell-like ability once per day, with a caster level equal to their
  // character level." Vendored uses.maxFormula (1/day) derives the pool.
  agovSwSID6zOPIDN: [
    { slug: "detect-thoughts", spell: "Detect Thoughts", attachToSourcePool: true },
  ],
  // Gathlain, Natural Bounty (ARG, replaces Natural Armor and Spell-Like
  // Ability): "Once per day, a gathlain with this racial trait can cast
  // Goodberry as a spell-like ability. When the gathlain's character level
  // reaches 9th, he can cast Plant Growth (overgrowth only) ... and at
  // 13th level, he can cast Heroes' Feast ..." All three ride the trait's
  // own uses pool, whose vendored maxFormula grows from 1 to 3 at those
  // same levels (1 + gte(hd,9) + gte(hd,13)).
  b8mD388daeaoKidm: [
    { slug: "goodberry", spell: "Goodberry", attachToSourcePool: true },
    {
      slug: "plant-growth",
      spell: "Plant Growth",
      attachToSourcePool: true,
      minLevel: 9,
      note: "overgrowth only",
    },
    { slug: "heroes-feast", spell: "Heroes' Feast", attachToSourcePool: true, minLevel: 13 },
  ],
  // Ghoran, Spelleater (ARG, replaces Past-Life Knowledge and Nature/Natural
  // Magic): "Once per day, the ghoran can cast dispel magic as a spell-like
  // ability, with a caster level equal to the ghoran's character level."
  // No vendored uses block, so this meters through a synthetic pool.
  v5W731SKm6CeoMO4: [
    { slug: "dispel-magic", spell: "Dispel Magic", uses: { formula: "1", per: "day" } },
  ],
  // Sylph, Sky Speaker (ARG, replaces Spell-Like Ability): "Sylphs with this
  // racial trait ... can use speak with animals once per day to speak to
  // birds or other flying animals. Her caster level for these effects is
  // equal to her level." No vendored uses block, so this meters through a
  // synthetic pool.
  zd8EJDQt5XGFNXV1: [
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      uses: { formula: "1", per: "day" },
      note: "birds and other flying animals only",
    },
  ],
  // Aasimar, Halo (ARG, replaces Darkvision): "An aasimar with this racial
  // trait can create light centered on her head at will as a spell-like
  // ability." At-will, unmetered.
  "2NXp8S2ZZ2Lh5LS3": [{ slug: "light", spell: "Light", frequency: "atWill" }],
  // Vine Leshy, Grapevine (replaces Pass Without Trace): "She can cast
  // Goodberry once per day as a spell-like ability, with a caster level
  // equal to her character level." Vendored uses.maxFormula (1/day) derives
  // the pool.
  xmVIIWMr8jcAFnhw: [{ slug: "goodberry", spell: "Goodberry", attachToSourcePool: true }],
  // Wyrwood, Experimental Body: Blessed (replaces Darkvision and Low-Light
  // Vision): "Wyrwoods with this trait can use Divine Favor once per day as
  // a spell-like ability with a caster level equal to their Hit Dice" — the
  // racial default caster level (total character level) already equals Hit
  // Dice for this table. Vendored uses.maxFormula (1/day) derives the pool.
  P32v41a5IFStjrX2: [{ slug: "divine-favor", spell: "Divine Favor", attachToSourcePool: true }],
  // Wyrwood, Experimental Body: Fey-Touched (replaces Darkvision and
  // Low-Light Vision): "Wyrwoods with this trait can use Charm Animal once
  // per day as a spell-like ability with a caster level equal to their Hit
  // Dice." Vendored uses.maxFormula (1/day) derives the pool.
  WJO1PMH4T8qWg9wK: [{ slug: "charm-animal", spell: "Charm Animal", attachToSourcePool: true }],
};
