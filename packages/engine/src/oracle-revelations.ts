/**
 * Clean-room PF1 oracle revelation table (DESIGN §6, issue #61): hand-authored
 * from the published Advanced Player's Guide rules (verified against public
 * SRD text/AoN), mirroring `arcanist-exploits.ts`'s posture. As
 * `oracle-mysteries.ts`'s doc comment already notes, revelations (unlike a
 * mystery's class skills/bonus spells) are NOT structured data anywhere in
 * the vendored Foundry pack — the Oracle class def only links a single
 * generic "Revelation"/"Final Revelation" stub `ClassFeature` (confirmed:
 * `class-features.json` carries no per-revelation entries at all, only the
 * two stubs), so there is no upstream JSON to normalize.
 *
 * Scope: revelations for the 10 Advanced Player's Guide "core" mysteries
 * (Battle, Bones, Flame, Heavens, Life, Lore, Nature, Stone, Waves, Wind —
 * same 10 as `ORACLE_MYSTERY_TAGS`), 10 revelations apiece plus that
 * mystery's 20th-level Final Revelation. Revelations from 3rd-party/later
 * mysteries (Ancestor, Apocalypse, Dragon, Lunar, ...) are OUT OF SCOPE,
 * matching `oracle-mysteries.ts`'s own scope note.
 *
 * IDs are mystery-scoped (`<mysteryTag>:<camelCaseName>`) because a handful
 * of revelations share a name across mysteries with identical text (e.g.
 * "Combat Healer" is offered by both Battle and Life) — the prefix keeps
 * `ORACLE_REVELATIONS` keys unique without inventing a synthetic suffix.
 *
 * Level gating (PF1 RAW: an oracle gains a revelation at 1st level and every
 * 4 levels thereafter — 1st/3rd/7th/11th/15th/19th, six total by 19th — see
 * `model/oracleRevelations.ts` for the budget math): `minLevel` is the
 * earliest oracle level a given revelation itself can be selected at — 1 for
 * most, or the revelation's own stated higher minimum (3rd/7th/11th) for the
 * handful the APG restricts further. Soft availability filtering only (see
 * `magus-arcana.ts`'s identical convention) — never blocks selection.
 *
 * Modelling posture (mirrors arcanist-exploits.ts/magus-arcana.ts): every
 * revelation here is a situational, activated, scaling, or mechanic-
 * substitution ability with no flat always-on number the engine tracks (a
 * few — Sidestep Secret's Cha-for-Dex AC/Reflex swap, Lore Keeper's Cha-for-
 * Int Knowledge swap, Mental Acuity's inherent Int bonus that scales by WHEN
 * it was taken — come close, but each requires either a structural
 * ability-substitution the compute pipeline doesn't support outside its one
 * hardcoded Cleric Wisdom house rule, or per-character "which level did you
 * take this" state this table doesn't carry; see `traits.ts`'s honesty bar).
 * So EVERY entry here is `displayOnly: true` with `changes: []`; a handful
 * carry a `contextNotes` reminder when the ability requires a nested pick
 * this table doesn't model (which weapon, which combat maneuver, ...) or
 * points at an existing tracked feature (a companion, a bonus feat).
 *
 * The Final Revelation (20th level, automatic — NOT one of the six budgeted
 * picks) is tracked separately in `ORACLE_MYSTERY_FINAL_REVELATIONS`,
 * informational only; it is never added to `doc.build.oracleRevelations`.
 */

import type { Change, ContextNote } from "@pf1/schema";

export interface OracleRevelationDef {
  /** `<mysteryTag>:<camelCaseName>` — unique across every mystery. */
  id: string;
  /** Matches `ORACLE_MYSTERY_TAGS` / `doc.build.oracleMystery`. */
  mysteryTag: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /**
   * Earliest oracle level this revelation can be selected at — 1 unless the
   * APG states a higher minimum. Soft-filtered only (see file doc comment);
   * never blocks selection.
   */
  minLevel: number;
  /** Typed modifiers granted by the revelation (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (nested choice, resource cost, pointer to another tracked feature, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no revelation has a flat always-on numeric effect. */
  displayOnly: true;
}

export interface OracleMysteryFinalRevelation {
  mysteryTag: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawRevelation {
  id: string;
  name: string;
  summary: string;
  minLevel?: number;
  contextNotes?: ContextNote[];
}

/** Builds a mystery's revelation defs from a terse per-mystery list, prefixing every id with its mystery tag. */
function forMystery(mysteryTag: string, entries: RawRevelation[]): OracleRevelationDef[] {
  return entries.map((e) => ({
    id: `${mysteryTag}:${e.id}`,
    mysteryTag,
    name: e.name,
    summary: e.summary,
    minLevel: e.minLevel ?? 1,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

const REVELATION_LIST: OracleRevelationDef[] = [
  ...forMystery("battle", [
    {
      id: "battlecry",
      name: "Battlecry",
      summary:
        "Swift action: allies within 100 ft. who can hear you gain a scaling morale bonus to attack rolls, skill checks, and saving throws for 1 round.",
    },
    {
      id: "battlefieldClarity",
      name: "Battlefield Clarity",
      summary:
        "Once per day, reroll a failed save against blinded, deafened, frightened, panicked, paralyzed, shaken, or stunned with a +4 bonus on the reroll.",
    },
    {
      id: "combatHealer",
      name: "Combat Healer",
      minLevel: 7,
      summary:
        "Cast a cure spell as a swift action by expending two spell slots of the spell's level, a limited number of times per day.",
    },
    {
      id: "ironSkin",
      name: "Iron Skin",
      minLevel: 11,
      summary:
        "Once per day, harden your skin for DR 10/adamantine for 1 day, as stoneskin at your oracle level.",
    },
    {
      id: "maneuverMastery",
      name: "Maneuver Mastery",
      summary:
        "Choose one type of combat maneuver; use your oracle level in place of your base attack bonus for its CMB. Can be selected more than once for different maneuvers.",
      contextNotes: [
        note("Which combat maneuver you chose is a separate pick — record it in a note.", "cmb"),
      ],
    },
    {
      id: "resiliency",
      name: "Resiliency",
      summary:
        "Once per day, ignore the disabled/staggered condition at 0 hit points for 1 round per oracle level; gains Diehard-like benefits at higher levels.",
    },
    {
      id: "skillAtArms",
      name: "Skill at Arms",
      summary: "Gain proficiency with all martial weapons and with heavy armor.",
      contextNotes: [note("Proficiency grant — no numeric sheet effect to model.")],
    },
    {
      id: "surprisingCharge",
      name: "Surprising Charge",
      summary: "Once per day, move up to your speed as an immediate action.",
    },
    {
      id: "warSight",
      name: "War Sight",
      summary:
        "Roll initiative twice and take either result; gain the ability to act during a surprise round at higher levels.",
    },
    {
      id: "weaponMastery",
      name: "Weapon Mastery",
      summary:
        "Gain Weapon Focus with one chosen weapon, adding Improved Critical and Greater Weapon Focus with it at higher levels.",
      contextNotes: [
        note(
          "Which weapon you chose is a separate pick — add the matching feat(s) in the Feats section.",
        ),
      ],
    },
  ]),
  ...forMystery("bones", [
    {
      id: "armorOfBones",
      name: "Armor of Bones",
      summary:
        "Conjure bone armor for a scaling armor bonus, plus damage reduction at higher levels.",
    },
    {
      id: "bleedingWounds",
      name: "Bleeding Wounds",
      summary:
        "Creatures hurt by your negative-energy effects bleed for ongoing damage each round until healed.",
    },
    {
      id: "deathsTouch",
      name: "Death's Touch",
      summary:
        "Melee touch attack deals negative energy damage to the living, or heals undead instead, with a channel resistance bonus.",
    },
    {
      id: "nearDeath",
      name: "Near Death",
      summary:
        "Gain an insight bonus on saves against disease, mind-affecting effects, and poison, extending to death and sleep effects at higher levels.",
    },
    {
      id: "raiseTheDead",
      name: "Raise the Dead",
      summary:
        "Standard action: summon a single skeleton or zombie to serve you, upgrading to stronger undead at higher levels.",
    },
    {
      id: "resistLife",
      name: "Resist Life",
      summary:
        "Treated as undead for positive/negative energy effects; gain channel resistance at 7th level.",
    },
    {
      id: "soulSiphon",
      name: "Soul Siphon",
      minLevel: 7,
      summary:
        "Ranged ray attack: inflicts a negative level on the target and heals you for the damage dealt.",
    },
    {
      id: "spiritWalk",
      name: "Spirit Walk",
      minLevel: 11,
      summary:
        "Become incorporeal and invisible, moving through objects, for a number of rounds per day equal to your oracle level.",
    },
    {
      id: "undeadServitude",
      name: "Undead Servitude",
      summary:
        "Gain Command Undead as a bonus feat; your channeled negative energy can only be used to command undead.",
      contextNotes: [
        note("Grants a specific bonus feat — add it to doc.build.feats separately.", "bonusFeats"),
      ],
    },
    {
      id: "voiceOfTheGrave",
      name: "Voice of the Grave",
      summary:
        "Cast speak with dead for a number of rounds per day equal to your oracle level, with the corpse-age penalty shrinking at higher levels.",
    },
  ]),
  ...forMystery("flame", [
    {
      id: "burningMagic",
      name: "Burning Magic",
      summary: "A creature that fails a save against one of your fire spells catches fire.",
    },
    {
      id: "cinderDance",
      name: "Cinder Dance",
      summary: "Gain a scaling bonus to speed and mobility-related bonus feats.",
    },
    {
      id: "fireBreath",
      name: "Fire Breath",
      summary:
        "Standard action: exhale a 15-ft. cone of flame dealing damage that scales with oracle level, a limited number of times per day.",
    },
    {
      id: "firestorm",
      name: "Firestorm",
      minLevel: 11,
      summary:
        "Conjure cubes of flame around you that persist for several rounds, forcing Reflex saves each round.",
    },
    {
      id: "formOfFlame",
      name: "Form of Flame",
      minLevel: 7,
      summary: "Assume a fire elemental's form, able to grow larger at higher levels.",
    },
    {
      id: "gazeOfFlames",
      name: "Gaze of Flames",
      summary:
        "See through fire and smoke without penalty; gaze through flame at range at higher levels.",
    },
    {
      id: "heatAura",
      name: "Heat Aura",
      summary:
        "Swift action: radiate damaging heat in a 10-ft. radius, granting yourself concealment.",
    },
    {
      id: "moltenSkin",
      name: "Molten Skin",
      summary: "Gain scaling fire resistance, reaching immunity at 17th level.",
    },
    {
      id: "touchOfFlame",
      name: "Touch of Flame",
      summary:
        "Melee touch attack deals fire damage; your weapons gain the flaming property at 11th level.",
    },
    {
      id: "wingsOfFire",
      name: "Wings of Fire",
      minLevel: 7,
      summary:
        "Manifest fiery wings granting a 60-ft. fly speed, a limited number of times per day.",
    },
  ]),
  ...forMystery("heavens", [
    {
      id: "awesomeDisplay",
      name: "Awesome Display",
      summary:
        "Your illusion (pattern) spells treat targets as having fewer Hit Dice, reduced by your Charisma bonus.",
    },
    {
      id: "coatOfManyStars",
      name: "Coat of Many Stars",
      summary:
        "Conjure starry armor for a scaling armor bonus (with DR at higher levels), usable several times per day.",
    },
    {
      id: "dwellerInDarkness",
      name: "Dweller in Darkness",
      minLevel: 11,
      summary:
        "Once per day, reach out through the void to draw the attention of a terrible otherworldly being.",
    },
    {
      id: "guidingStar",
      name: "Guiding Star",
      summary:
        "Navigate flawlessly by starlight, add Charisma to Wisdom checks under the stars, and apply a metamagic feat to a spell once per day at no level increase.",
    },
    {
      id: "interstellarVoid",
      name: "Interstellar Void",
      summary:
        "Deal cold damage to nearby foes, fatiguing, exhausting, or stunning them on a failed save (severity scales with level).",
    },
    {
      id: "lureOfTheHeavens",
      name: "Lure of the Heavens",
      summary:
        "Gain progressively better movement as you level: untrackable, then hovering, then true flight.",
    },
    {
      id: "mantleOfMoonlight",
      name: "Mantle of Moonlight",
      summary:
        "Immune to lycanthropy; melee touch attack forces a target into humanoid form or a rage-like state.",
    },
    {
      id: "moonlightBridge",
      name: "Moonlight Bridge",
      summary:
        "Conjure a temporary bridge of light, usable a number of times per day equal to your Charisma bonus.",
    },
    {
      id: "sprayOfShootingStars",
      name: "Spray of Shooting Stars",
      summary: "Standard action: hurl a bursting ball of energy that explodes in a 5-ft. radius.",
    },
    {
      id: "starChart",
      name: "Star Chart",
      minLevel: 7,
      summary: "Once per day, commune with celestial patterns for guidance.",
    },
  ]),
  ...forMystery("life", [
    {
      id: "channel",
      name: "Channel",
      summary:
        "Channel positive energy like a cleric, using your oracle level as your effective cleric level.",
    },
    {
      id: "combatHealer",
      name: "Combat Healer",
      minLevel: 7,
      summary:
        "Cast a cure spell as a swift action by expending two spell slots of the spell's level, a limited number of times per day.",
    },
    {
      id: "delayAffliction",
      name: "Delay Affliction",
      summary:
        "Once per day as an immediate action, ignore the effects of a failed save against disease or poison for 1 hour per level.",
    },
    {
      id: "energyBody",
      name: "Energy Body",
      summary:
        "Become pure life energy: undead who strike you in melee take damage, and allies who move through your space heal.",
    },
    {
      id: "enhancedCures",
      name: "Enhanced Cures",
      summary:
        "Your cure spells heal beyond the spell's normal die-roll cap, scaling with your oracle level.",
    },
    {
      id: "healingHands",
      name: "Healing Hands",
      summary:
        "Gain a +4 bonus on Heal checks and can treat multiple patients at once at double the normal rate.",
    },
    {
      id: "lifeLink",
      name: "Life Link",
      summary:
        "Bond to a creature: it automatically heals 5 hit points each round it is wounded, at the cost of 5 of your own.",
    },
    {
      id: "lifesense",
      name: "Lifesense",
      minLevel: 11,
      summary: "Sense living creatures within 30 ft. as if you possessed blindsight for them.",
    },
    {
      id: "safeCuring",
      name: "Safe Curing",
      summary: "Casting healing spells no longer provokes attacks of opportunity.",
    },
    {
      id: "spiritBoost",
      name: "Spirit Boost",
      summary:
        "Healing that would exceed a target's maximum hit points instead grants temporary hit points lasting 1 round per oracle level.",
    },
  ]),
  ...forMystery("lore", [
    {
      id: "arcaneArchivist",
      name: "Arcane Archivist",
      minLevel: 11,
      summary:
        "Cast a sorcerer/wizard-list spell you don't know by expending a higher-level spell slot.",
    },
    {
      id: "automaticWriting",
      name: "Automatic Writing",
      summary:
        "Spend an hour meditating to produce prophetic writing that functions as augury, divination, or commune, depending on your oracle level.",
    },
    {
      id: "brainDrain",
      name: "Brain Drain",
      summary:
        "Ranged mental attack that damages a foe within 100 ft. and lets you glean knowledge from their mind.",
    },
    {
      id: "focusedTrance",
      name: "Focused Trance",
      summary:
        "Meditate for bonuses against sonic and gaze effects, then make a heavily bolstered Intelligence-based skill check.",
    },
    {
      id: "loreKeeper",
      name: "Lore Keeper",
      summary: "Use your Charisma modifier instead of Intelligence on all Knowledge checks.",
      contextNotes: [
        note(
          "Mechanic substitution only — apply manually; no Cha-for-Int Change target exists.",
          "kno",
        ),
      ],
    },
    {
      id: "mentalAcuity",
      name: "Mental Acuity",
      minLevel: 7,
      summary:
        "Gain a +1 inherent bonus to Intelligence when taken, increasing further every third oracle level thereafter.",
      contextNotes: [
        note(
          "Scaling depends on the level you took this at — track the current bonus yourself and add it as an ability-score adjustment.",
          "abilities.int",
        ),
      ],
    },
    {
      id: "sidestepSecret",
      name: "Sidestep Secret",
      summary: "Add your Charisma modifier to AC and Reflex saves instead of Dexterity.",
      contextNotes: [
        note(
          "Mechanic substitution only — apply manually; no Cha-for-Dex Change target exists.",
          "ac",
        ),
      ],
    },
    {
      id: "spontaneousSymbology",
      name: "Spontaneous Symbology",
      minLevel: 11,
      summary:
        'Cast any spell with "symbol" in its name using an appropriate-level slot without knowing it.',
    },
    {
      id: "thinkOnIt",
      name: "Think On It",
      summary: "Once per day, reattempt a failed Knowledge check with a +10 competence bonus.",
    },
    {
      id: "whirlwindLesson",
      name: "Whirlwind Lesson",
      summary:
        "Teach a spell to another spellcaster in minutes instead of the normal 48-hour minimum.",
    },
  ]),
  ...forMystery("nature", [
    {
      id: "bondedMount",
      name: "Bonded Mount",
      summary:
        "Gain an unusually intelligent, strong, and loyal mount, functioning as a druid's animal companion.",
      contextNotes: [
        note(
          "Reminder: set up your mount in the Animal Companion section of the Classes panel — this toggle is informational.",
        ),
      ],
    },
    {
      id: "erosionTouch",
      name: "Erosion Touch",
      summary:
        "Melee touch attack damages objects and constructs, usable a number of times per day tied to oracle level.",
    },
    {
      id: "friendToTheAnimals",
      name: "Friend to the Animals",
      summary:
        "Add summon nature's ally spells to your list; nearby animals gain a bonus on their saving throws.",
    },
    {
      id: "lifeLeach",
      name: "Life Leach",
      minLevel: 7,
      summary:
        "Ranged touch attack drains a living target's life force for damage and grants you temporary hit points.",
    },
    {
      id: "naturalDivination",
      name: "Natural Divination",
      summary:
        "Read omens (entrails, bird flight, bone-casting) for a bonus on a saving throw, skill check, or initiative roll.",
    },
    {
      id: "naturesWhispers",
      name: "Nature's Whispers",
      summary: "Add your Charisma modifier instead of Dexterity to AC and CMD.",
      contextNotes: [
        note(
          "Mechanic substitution only — apply manually; no Cha-for-Dex Change target exists.",
          "ac",
        ),
      ],
    },
    {
      id: "speakWithAnimals",
      name: "Speak with Animals",
      summary:
        "Communicate with one type of animal, gaining additional types every three oracle levels.",
    },
    {
      id: "spiritOfNature",
      name: "Spirit of Nature",
      summary:
        "Automatically stabilize when reduced to negative hit points outdoors; gain fast healing there at higher levels.",
    },
    {
      id: "transcendentalBond",
      name: "Transcendental Bond",
      summary:
        "Open telepathic communication with chosen allies; at 10th level, deliver touch spells through the bond.",
    },
    {
      id: "undoArtifice",
      name: "Undo Artifice",
      minLevel: 11,
      summary: "Permanently reduce a crafted item, magical or not, back to its raw materials.",
    },
  ]),
  ...forMystery("stone", [
    {
      id: "acidSkin",
      name: "Acid Skin",
      summary: "Gain scaling acid resistance, reaching immunity at 17th level.",
    },
    {
      id: "clobberingStrike",
      name: "Clobbering Strike",
      summary:
        "A critical hit with an attack spell lets you attempt a free trip against the target.",
    },
    {
      id: "crystalSight",
      name: "Crystal Sight",
      summary:
        "See through stone and earth at range for a number of rounds per day equal to your oracle level.",
    },
    {
      id: "earthGlide",
      name: "Earth Glide",
      minLevel: 7,
      summary: "Move through earth and stone at your normal speed, as if it were air.",
    },
    {
      id: "mightyPebble",
      name: "Mighty Pebble",
      summary: "Hurl a charged stone that explodes on impact, dealing damage with a splash radius.",
    },
    {
      id: "rockThrowing",
      name: "Rock Throwing",
      summary: "Gain attack and damage bonuses when throwing rocks, with a 20-ft. range increment.",
    },
    {
      id: "shardExplosion",
      name: "Shard Explosion",
      summary:
        "Swift action: burst a 10-ft. radius of stone shards, damaging foes and making the area difficult terrain.",
    },
    {
      id: "steelbreakerSkin",
      name: "Steelbreaker Skin",
      minLevel: 7,
      summary: "Weapons that strike you in combat take damage equal to your oracle level.",
    },
    {
      id: "stoneStability",
      name: "Stone Stability",
      summary:
        "Gain a bonus against trip and bull rush attempts, adding related bonus feats at higher levels.",
    },
    {
      id: "touchOfAcid",
      name: "Touch of Acid",
      summary:
        "Melee touch attack deals acid damage; your weapons gain bonus acid damage at 11th level.",
    },
  ]),
  ...forMystery("waves", [
    {
      id: "blizzard",
      name: "Blizzard",
      minLevel: 11,
      summary: "Conjure a raging blizzard dealing cold damage across a large area.",
    },
    {
      id: "fluidNature",
      name: "Fluid Nature",
      summary:
        "Gain a +4 bonus to CMD against certain combat maneuvers; foes have a harder time confirming critical hits against you.",
    },
    {
      id: "fluidTravel",
      name: "Fluid Travel",
      summary: "Walk safely across liquid surfaces; gain a swim speed underwater at 7th level.",
    },
    {
      id: "freezingSpells",
      name: "Freezing Spells",
      summary: "Cold damage from your spells slows a creature that fails its save against them.",
    },
    {
      id: "iceArmor",
      name: "Ice Armor",
      summary:
        "Conjure ice armor for a scaling armor bonus, plus damage reduction at higher levels.",
    },
    {
      id: "icySkin",
      name: "Icy Skin",
      summary: "Gain scaling cold resistance, reaching immunity at 17th level.",
    },
    {
      id: "punitiveTransformation",
      name: "Punitive Transformation",
      minLevel: 7,
      summary:
        "Transform an opponent into a harmless animal for a number of rounds equal to your oracle level.",
    },
    {
      id: "waterForm",
      name: "Water Form",
      minLevel: 7,
      summary: "Assume a water elemental's form, able to grow larger at higher levels.",
    },
    {
      id: "waterSight",
      name: "Water Sight",
      summary: "See through fog without penalty; scry using any pool of water.",
    },
    {
      id: "wintryTouch",
      name: "Wintry Touch",
      summary: "Melee touch attack deals cold damage, usable a limited number of times per day.",
    },
  ]),
  ...forMystery("wind", [
    {
      id: "airBarrier",
      name: "Air Barrier",
      summary: "Conjure an invisible shell of air for a scaling armor bonus.",
    },
    {
      id: "gaseousForm",
      name: "Gaseous Form",
      minLevel: 7,
      summary: "Once per day, assume gaseous form for 1 minute per oracle level.",
    },
    {
      id: "invisibility",
      name: "Invisibility",
      minLevel: 3,
      summary:
        "Once per day, turn invisible for 1 minute per oracle level, upgrading to greater invisibility at 9th level.",
    },
    {
      id: "lightningBreath",
      name: "Lightning Breath",
      summary:
        "Exhale a 30-ft. line of electricity dealing damage that scales with your oracle level.",
    },
    {
      id: "sparkSkin",
      name: "Spark Skin",
      summary: "Gain scaling electricity resistance, reaching immunity at 17th level.",
    },
    {
      id: "thunderburst",
      name: "Thunderburst",
      minLevel: 7,
      summary: "Create an expanding-radius blast of sound dealing damage and deafening foes.",
    },
    {
      id: "touchOfElectricity",
      name: "Touch of Electricity",
      summary: "Melee touch attack deals electricity damage that scales with your oracle level.",
    },
    {
      id: "vortexSpells",
      name: "Vortex Spells",
      summary: "A critical hit with an attack spell staggers the target for 1 round.",
    },
    {
      id: "windSight",
      name: "Wind Sight",
      summary:
        "Ignore wind-based Perception penalties; see and hear through air currents at 7th level.",
    },
    {
      id: "wingsOfAir",
      name: "Wings of Air",
      minLevel: 7,
      summary:
        "Manifest wings granting a 60-ft. fly speed for 1 minute per oracle level, once per day.",
    },
  ]),
];

export const ORACLE_REVELATIONS: Record<string, OracleRevelationDef> = Object.fromEntries(
  REVELATION_LIST.map((r) => [r.id, r]),
);

export const ORACLE_REVELATION_IDS: readonly string[] = REVELATION_LIST.map((r) => r.id);

/** All revelation defs available to a given mystery tag, in table order. */
export function revelationsForMystery(mysteryTag: string): OracleRevelationDef[] {
  return REVELATION_LIST.filter((r) => r.mysteryTag === mysteryTag);
}

/**
 * A mystery's 20th-level Final Revelation — automatic, NOT one of the six
 * budgeted revelation picks (`model/oracleRevelations.ts`), so it is never
 * stored in `doc.build.oracleRevelations`. Informational display only.
 */
export const ORACLE_MYSTERY_FINAL_REVELATIONS: Record<string, OracleMysteryFinalRevelation> = {
  battle: {
    mysteryTag: "battle",
    name: "Final Revelation",
    summary:
      "Combine a full attack with movement in one action, ignore damage reduction on critical hits, gain a +4 insight bonus to AC against critical-hit confirmations, and survive well past 0 hit points.",
  },
  bones: {
    mysteryTag: "bones",
    name: "Final Revelation",
    summary:
      "Cast stabilize and cure the bleed condition at will, automatically stabilize at 0 hit points, cast animate dead with no material cost, and use power word kill once per day.",
  },
  flame: {
    mysteryTag: "flame",
    name: "Final Revelation",
    summary:
      "Apply any metamagic feat to a fire spell without increasing its level or casting time.",
  },
  heavens: {
    mysteryTag: "heavens",
    name: "Final Revelation",
    summary:
      "Gain bonuses on saving throws, automatic stabilization, immunity to fear, guaranteed confirmed critical threats, and rebirth as a star-child upon death.",
  },
  life: {
    mysteryTag: "life",
    name: "Final Revelation",
    summary:
      "Gain immunity to several debilitating conditions and die only once negative hit points exceed twice your Constitution score.",
  },
  lore: {
    mysteryTag: "lore",
    name: "Final Revelation",
    summary:
      "Take 20 on any Knowledge check, and cast wish once per day without material components (with restrictions).",
  },
  nature: {
    mysteryTag: "nature",
    name: "Final Revelation",
    summary:
      "Retreat into an organic cocoon to change your creature type and heal all damage and diseases.",
  },
  stone: {
    mysteryTag: "stone",
    name: "Final Revelation",
    summary:
      "Apply any metamagic feat to an acid or earth spell without increasing its level or casting time.",
  },
  waves: {
    mysteryTag: "waves",
    name: "Final Revelation",
    summary:
      "Apply any metamagic feat to a cold or water spell without increasing its level or casting time.",
  },
  wind: {
    mysteryTag: "wind",
    name: "Final Revelation",
    summary:
      "Apply the Enlarge, Extend, Silent, or Still Spell metamagic feat to an air or electricity spell without increasing its level or casting time.",
  },
};
