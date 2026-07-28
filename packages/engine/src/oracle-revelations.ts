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
 * Scope: revelations for ALL 34 modeled mysteries — the 10 Advanced
 * Player's Guide "core" ones, Solar (Inner Sea Gods), and the 23 splatbook
 * mysteries authored in issue #74's content pass — each with its full
 * published revelation list plus its 20th-level Final Revelation. Most
 * publish exactly 10 revelations; Ascetic (8), Juju (9), and Streets (9)
 * genuinely have fewer RAW. Every mystery here has a matching entry in
 * `ORACLE_MYSTERY_TAGS`.
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
 * Issue #75 audit: the buff-gated-changes mechanism (`Change.activeWhenBuff`,
 * built for the rage powers' "while raging" shape — see `rage-powers.ts`)
 * does NOT unlock anything here. The near-misses above are ability
 * SUBSTITUTIONS (a structural compute change, not a typed modifier) or
 * take-level-dependent scaling — neither is "unconditional while a specific,
 * id-identifiable buff is active", so all stay deliberately deferred.
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
  // Solar (Inner Sea Gods) — outside the APG ten, added because it's the
  // mystery a real 14th-level oracle build needed. Same posture as the rest:
  // every entry display-only. Many Roads comes closest to a flat number
  // (insight bonus on two skills, scaling with level), but the file's
  // invariant is one all-display-only table, and breaking it for a single
  // entry would make "no revelation moves a number" stop being checkable.
  ...forMystery("solar", [
    {
      id: "astralCaravan",
      name: "Astral Caravan",
      summary:
        "Full-round action: step into the planar border with the Astral Plane, carrying one extra person per class level and covering 50 miles per hour as shadow walk. 1 hour/day per oracle level, spent in 1-hour increments.",
    },
    {
      id: "blisteredCaress",
      name: "Blistered Caress",
      summary:
        "Melee touch attack dealing 1d8 fire per 2 oracle levels (Fortitude half); heals or harms plant creatures for 1d6 per level instead. Sickens on a failed save at 7th, also staggers at 15th. Once per day, twice at 10th.",
    },
    {
      id: "luminousForm",
      name: "Luminous Form",
      summary:
        "Become churning light: gain blur and shed light as a sunrod. Blinds adjacent creatures that end their turn there from 7th (Fortitude negates), longer at 13th, and counts as natural sunlight at 18th. 1 minute/day per oracle level.",
    },
    {
      id: "manyRoads",
      name: "Many Roads",
      summary:
        "Insight bonus on Fly and Survival equal to half your oracle level, and you learn three additional languages.",
      contextNotes: [
        note(
          "Many Roads' Fly/Survival insight bonus is not applied automatically — add it by hand.",
        ),
      ],
    },
    {
      id: "serpentInTheSun",
      name: "Serpent in the Sun",
      summary:
        "While you get 4 hours of sunlight a day: no need to eat, +2 vs. disease. 5th — immune to nonmagical disease, no need to drink. 10th — immune to magical disease, +2 vs. poison, half sleep. 15th — immune to poison and fatigue.",
    },
    {
      id: "solarWind",
      name: "Solar Wind",
      summary:
        "Ranged touch attack within 30 ft. (no range increment) dealing 1d6 fire + 1 per 2 oracle levels. From 7th it also bull rushes, using caster level + Charisma in place of your CMB. 3 + Cha modifier times per day.",
    },
    {
      id: "starlightAgility",
      name: "Starlight Agility",
      summary:
        "Gain Dodge as a bonus feat, Wind Stance at 8th, and Lightning Stance at 15th — prerequisites waived.",
      contextNotes: [
        note(
          "The three granted feats are not added to your feat list automatically — take them as bonus feats.",
        ),
      ],
    },
    {
      id: "sunStride",
      name: "Sun Stride",
      minLevel: 5,
      summary:
        "Travel between areas of natural sunlight as dimension door, in 10-ft. increments. 40 ft./day at 5th, doubling at 9th and every 4 levels after. Doesn't work in less than bright light.",
    },
    {
      id: "sungazer",
      name: "Sungazer",
      minLevel: 5,
      summary:
        "Use clairaudience/clairvoyance (sight only) to observe anywhere sunlight touches; scrying at 10th, greater scrying at 15th. 1 minute/day per oracle level.",
    },
    {
      id: "torchTouch",
      name: "Torch Touch",
      summary:
        "Move action: halve or double the light radius of a nonmagical light source within 60 ft. Torch-sized at 1st, Medium at 7th, Large plus magical sources up to an everburning torch at 14th. A holder may attempt a Reflex save.",
    },
  ]),
  ...forMystery("ancestor", [
    {
      id: "ancestralWeapon",
      name: "Ancestral Weapon",
      summary:
        "Summon a family weapon you're automatically proficient with; masterwork at 3rd level, a cumulative +1 enhancement at 7th/15th/19th, and ghost touch at 11th. Usable for a number of minutes per day equal to your oracle level, in 1-minute increments.",
      contextNotes: [
        note(
          "Which weapon you summon is a separate pick — record it, and add its enhancement bonus/ghost touch as it scales.",
        ),
      ],
    },
    {
      id: "bloodOfHeroes",
      name: "Blood of Heroes",
      summary:
        "Move action: gain a +1 morale bonus on attack rolls, damage rolls, and Will saves against fear for a number of rounds equal to your Charisma bonus (+2 at 7th level, +3 at 14th). Usable once per day, plus one additional time at 5th level and every five levels thereafter.",
    },
    {
      id: "phantomTouch",
      name: "Phantom Touch",
      summary:
        "Standard-action melee touch attack shakes a living creature for a number of rounds equal to half your oracle level (minimum 1). Usable a number of times per day equal to 3 + your Charisma modifier.",
    },
    {
      id: "sacredCouncil",
      name: "Sacred Council",
      summary:
        "Move action: grant yourself a +2 bonus on any one d20 roll for 1 round. Usable a number of times per day equal to your Charisma bonus.",
    },
    {
      id: "spiritOfTheWarrior",
      name: "Spirit of the Warrior",
      minLevel: 11,
      summary:
        "Channel a warrior ancestor's spirit: +4 enhancement bonus to Strength, Dexterity, and Constitution, +4 natural armor, base attack bonus equal to your oracle level, and Improved Critical with a weapon of your choice. Usable for 1 round per 2 oracle levels, in 1-round increments.",
      contextNotes: [note("Which weapon gains Improved Critical is a separate pick.")],
    },
    {
      id: "spiritShield",
      name: "Spirit Shield",
      summary:
        "Conjure ancestral spirits into a +4 armor bonus (+2 every 4 levels starting at 7th); at 13th level, ranged attacks against you that require an attack roll have a 50% miss chance. Usable for 1 hour per day per oracle level, in 1-hour increments.",
    },
    {
      id: "spiritWalk",
      name: "Spirit Walk",
      minLevel: 11,
      summary:
        "Become incorporeal and invisible, able only to move, for a number of rounds equal to your oracle level (end early as a standard action). Usable once per day starting at 11th level, twice per day at 15th.",
    },
    {
      id: "stormOfSouls",
      name: "Storm of Souls",
      minLevel: 7,
      summary:
        "20-foot-radius burst within 100 feet: 1d8 damage per two oracle levels to creatures and objects (1d8 per oracle level against undead); a successful Fortitude save halves it. Usable once per day, plus one additional time at 11th level and every four levels thereafter.",
    },
    {
      id: "voiceOfTheGrave",
      name: "Voice of the Grave",
      summary:
        "Cast speak with dead for a number of rounds per day equal to your oracle level (need not be consecutive); the questioned corpse's Will save takes a cumulative -2 penalty starting at 5th level and every five levels thereafter.",
    },
    {
      id: "wisdomOfTheAncestors",
      name: "Wisdom of the Ancestors",
      summary:
        "Once per day, spend an uninterrupted 10-minute trance to gain insight equivalent to augury (80% effective) at 1st level, divination (90% effective) at 5th level, or commune at 8th level — none requiring material components.",
    },
  ]),
  ...forMystery("apocalypse", [
    {
      id: "defyElements",
      name: "Defy Elements",
      summary:
        "Choose an energy type for resistance 5. At 5th level and every five levels thereafter, add resistance 5 to a new energy type or increase an existing one by 5 (maximum 20 per type).",
      contextNotes: [
        note("Which energy type(s) you chose is a separate pick — record it in a note."),
      ],
    },
    {
      id: "destructiveRoots",
      name: "Destructive Roots",
      minLevel: 7,
      summary:
        "Standard action: rupture the ground in a 5-foot radius around you into difficult terrain; a move action each round you remain stationary expands it by 5 feet (maximum 30-foot radius). Moving from your starting square ends the effect; the terrain otherwise lasts 24 hours.",
    },
    {
      id: "doomsayer",
      name: "Doomsayer",
      minLevel: 7,
      summary:
        "Standard action: enemies within 30 feet who can hear you become shaken as long as they stay in range and you spend a move action each round continuing (swift action at 15th level). Can't push an already-shaken target further; a mind-affecting fear effect with audible components.",
    },
    {
      id: "dustToDust",
      name: "Dust to Dust",
      summary:
        "Once per day as a standard action, attempt a single sunder combat maneuver (caster level for BAB, Charisma modifier for Strength) against every manufactured weapon within a 10-foot radius, dealing 1d4 x Charisma modifier damage each (1d6 at 11th level). Usable twice per day at 10th level.",
    },
    {
      id: "erosionTouch",
      name: "Erosion Touch",
      summary:
        "Melee touch attack deals 1d6 points of damage per level to objects or constructs (treated as a sunder attempt against an object in another creature's possession). Usable once per day, plus one additional time per three levels.",
    },
    {
      id: "nearDeath",
      name: "Near Death",
      summary:
        "+2 insight bonus on saves against disease, mind-affecting effects, and poison; extends to death effects, sleep, and stunning at 7th level; the bonus increases to +4 at 11th.",
    },
    {
      id: "passTheTorch",
      name: "Pass the Torch",
      summary:
        "Once per day as a swift action, ignite yourself: you take 1d4 fire damage on activation and again each turn, and any creature that starts its turn adjacent to you takes 1d6 fire damage plus 1 per round the fire has burned. Lasts up to half your oracle level in rounds (end early as a free action); gain one additional use at 5th level and every five levels thereafter.",
    },
    {
      id: "powerOfTheFallen",
      name: "Power of the Fallen",
      minLevel: 5,
      summary:
        "Touch a dying creature to channel its life force into any ally (including yourself) within 30 feet, as death knell, applying the +2 enhancement bonus to Strength, Dexterity, or Constitution as you choose. Usable a number of times per day equal to your Charisma modifier.",
    },
    {
      id: "spellBlast",
      name: "Spell Blast",
      summary:
        "Swift action: when you confirm a critical hit with a spell that requires an attack roll, immediately attempt a bull rush against that target without provoking an attack of opportunity.",
    },
    {
      id: "unstoppableOverrun",
      name: "Unstoppable Overrun",
      summary:
        "Attempt overrun combat maneuvers against opponents up to two size categories larger than you. Gain Improved Overrun as a bonus feat at 5th level and Greater Overrun at 10th, without needing to meet their prerequisites.",
      contextNotes: [
        note(
          "Grants Improved Overrun (5th level) and Greater Overrun (10th level) as bonus feats — add them to the Feats section.",
          "bonusFeats",
        ),
      ],
    },
  ]),
  ...forMystery("ascetic", [
    {
      id: "absenceOfBody",
      name: "Absence of Body",
      summary:
        "Need only half the food and water of your race, and add your oracle level to the rounds you can hold your breath. At 15th level, you need no food or drink at all and can hold your breath ten times as long (2 minutes per point of Constitution, plus 1 minute per oracle level).",
    },
    {
      id: "absenceOfForm",
      name: "Absence of Form",
      summary:
        "Feather fall as a spell-like ability, usable for a number of rounds per day equal to your oracle level (need not be consecutive; you take falling damage if the duration expires mid-fall). At 10th level, you can spend those daily rounds on air walk instead.",
    },
    {
      id: "asceticArmor",
      name: "Ascetic Armor",
      summary:
        "While unarmored and under a light load, gain a +4 armor bonus (+2 every 4 levels starting at 7th); at 13th level, also gain DR 5/unarmed strikes or natural attacks. Usable for 1 hour per day per oracle level, in 1-hour increments.",
    },
    {
      id: "fleet",
      name: "Fleet",
      summary:
        "+10-foot enhancement bonus to base land speed (lost while wearing armor or carrying a medium or heavy load); increases by another 10 feet at 7th level and every six levels thereafter.",
      contextNotes: [note("Unavailable to oracles who took the lame curse.")],
    },
    {
      id: "martialDisciple",
      name: "Martial Disciple",
      summary:
        "Gain Improved Unarmed Strike as a bonus feat (no prerequisites needed) and unarmed strike damage as a monk of your oracle level; monk levels you actually have stack with this for damage purposes.",
      contextNotes: [
        note(
          "Grants Improved Unarmed Strike as a bonus feat — add it to the Feats section.",
          "bonusFeats",
        ),
      ],
    },
    {
      id: "oracularSpellstrike",
      name: "Oracular Spellstrike",
      minLevel: 7,
      summary:
        "Deliver touch spells through an unarmed strike as a melee attack, functioning like the magus's spellstrike ability but limited to unarmed strikes and drawing from the cleric spell list instead of the magus list.",
    },
    {
      id: "rapidConvalescence",
      name: "Rapid Convalescence",
      summary:
        "Need one fewer consecutive successful save to recover from a disease or poison (minimum 1). You can also sacrifice an unused spell slot to gain an enhancement bonus equal to its level on your next poison or disease save, if attempted within 1 minute per level of the slot.",
    },
    {
      id: "spellDeflection",
      name: "Spell Deflection",
      minLevel: 11,
      summary:
        "Readied action: counter a ranged touch-attack spell (such as a ray) targeting you or an adjacent ally by making an unarmed attack roll; beating 20 + the spell's caster level negates it. At 17th level, a negated spell reflects back at its caster with the same attack roll result.",
    },
  ]),
  ...forMystery("dark_tapestry", [
    {
      id: "brainDrain",
      name: "Brain Drain",
      summary:
        "Standard action: probe an intelligent enemy's mind within 100 feet (Will negates, and the target learns the source). On a failed save, deal 1d4 damage per oracle level; you can then spend a full-round action to make one Knowledge check using the victim's skill bonus, as detect thoughts, with the stolen knowledge lasting rounds equal to your Charisma modifier. A mind-affecting effect. Usable once per day at 1st level, plus one additional time at 5th level and every five levels thereafter.",
    },
    {
      id: "cloakOfDarkness",
      name: "Cloak of Darkness",
      summary:
        "Conjure shadow into a +4 armor bonus and +2 circumstance bonus on Stealth checks, both increasing by 2 every four levels starting at 7th. Usable for 1 hour per day per oracle level, in 1-hour increments.",
    },
    {
      id: "dwellerInDarkness",
      name: "Dweller in Darkness",
      minLevel: 11,
      summary:
        "Once per day, summon an otherworldly dweller in darkness that functions as phantasmal killer; at 17th level, it can instead affect multiple perceivers, as weird.",
    },
    {
      id: "giftOfMadness",
      name: "Gift of Madness",
      summary:
        "Cause a living creature within 30 feet to become confused for 1 round (Will negates; mind-affecting compulsion). At 7th level, the confusion lasts a number of rounds equal to your oracle level. Usable a number of times per day equal to 3 + your Charisma modifier.",
    },
    {
      id: "interstellarVoid",
      name: "Interstellar Void",
      summary:
        "Standard action: a target within 30 feet takes 1d6 cold damage per oracle level (Fortitude halves). At 10th level, a failed save also fatigues the target; at 15th, a failed save instead leaves it exhausted and stunned for 1 round. Usable once per day, plus one additional time at 10th level.",
    },
    {
      id: "manyForms",
      name: "Many Forms",
      minLevel: 3,
      summary:
        "Standard action: assume a Small or Medium humanoid form, as alter self. At 7th level, also a Small or Medium animal form (beast shape I); at 11th, a Small or Medium magical beast form (beast shape III); at 15th, any form covered by greater polymorph. Usable for 1 minute per day per oracle level, in 1-minute increments.",
    },
    {
      id: "pierceTheVeil",
      name: "Pierce the Veil",
      summary:
        "Gain darkvision 60 feet. At 11th level, you can see perfectly in darkness of any kind, including magical or absolute darkness.",
    },
    {
      id: "readTheTapestry",
      name: "Read the Tapestry",
      minLevel: 7,
      summary:
        "Once per day, spend 10 minutes meditating to contact an alien being on another plane, as contact other plane.",
    },
    {
      id: "touchOfTheVoid",
      name: "Touch of the Void",
      summary:
        "Standard-action melee touch attack deals 1d6 cold damage plus 1 per two oracle levels. At 7th level, a failed Fortitude save also fatigues the target for a number of rounds equal to half your oracle level. Usable a number of times per day equal to 3 + your Charisma modifier.",
    },
    {
      id: "wingsOfDarkness",
      name: "Wings of Darkness",
      minLevel: 7,
      summary:
        "Swift action: manifest wings granting a fly speed of 60 feet (good maneuverability), usable for 1 minute per day per oracle level. At 11th level, you can instead use the wings once per day as overland flight for up to 1 hour per level, which counts as your entire daily use.",
    },
  ]),
  ...forMystery("dragon", [
    {
      id: "breathWeapon",
      name: "Breath Weapon",
      summary:
        "Gain a breath weapon dealing 1d6 damage of your chosen energy type per 2 oracle levels (minimum 1d6, Reflex half), as a 30-ft. cone or 60-ft. line. Usable once per day at 1st level, plus one additional time at 5th level and every 5 levels thereafter.",
      contextNotes: [
        note("Cone or line shape is chosen when you take this revelation — record it in a note."),
      ],
    },
    {
      id: "draconicResistance",
      name: "Draconic Resistance",
      summary:
        "Resistance 5 against your chosen energy type and a +1 natural armor bonus, increasing to resistance 10/+2 natural armor at 9th level and resistance 20/+4 natural armor at 15th level.",
    },
    {
      id: "dragonMagic",
      name: "Dragon Magic",
      summary:
        "Select one sorcerer/wizard spell two levels below the highest level you can cast (or two spells at least three levels below) to cast once per day each as a spell-like ability; twice per day each at 11th level.",
      contextNotes: [note("Which spell(s) you selected is a separate pick — record it in a note.")],
    },
    {
      id: "dragonSenses",
      name: "Dragon Senses",
      summary:
        "Gain darkvision 60 ft. or low-light vision. At 5th level, gain the other (or extend darkvision by 60 ft.). At 11th level, gain blindsense 30 ft. (or extend existing blindsense by 30 ft.). At 15th level, gain scent or a +4 bonus on Perception checks.",
    },
    {
      id: "formOfTheDragon",
      name: "Form of the Dragon",
      minLevel: 11,
      summary:
        "Standard action: assume the form of a Medium dragon (as form of the dragon I) once per day for 10 minutes per oracle level (1 hour per level if still using form I past 15th). At 15th level, assume a Large dragon (form of the dragon II) instead; at 19th level, a Huge dragon (form of the dragon III).",
      contextNotes: [
        note(
          "Can instead be taken as the alien or exotic dragon form line — a fixed choice made when you select this revelation; record it in a note.",
        ),
      ],
    },
    {
      id: "presenceOfDragons",
      name: "Presence of Dragons",
      summary:
        "Swift action: enemies within 30 ft. who can see you must succeed at a Will save or be shaken for 2d6 rounds (mind-affecting fear); success grants 24-hour immunity. Usable once per day at 1st level, plus one additional time per day at 5th level and every 5 levels thereafter.",
    },
    {
      id: "scaledToughness",
      name: "Scaled Toughness",
      minLevel: 7,
      summary:
        "Swift action: harden your skin for DR 10/magic and immunity to paralysis and sleep effects, lasting a number of rounds equal to your oracle level. Usable once per day, twice at 13th level.",
    },
    {
      id: "tailSwipe",
      name: "Tail Swipe",
      summary:
        "Grow a tail usable only for attacks of opportunity, granting one extra attack of opportunity per round; deals 1d8 (1d6 if Small) + Strength modifier bludgeoning damage. At 10th level, a hit lets you attempt a free trip combat maneuver, provoking no attack of opportunity.",
    },
    {
      id: "talonsOfTheDragon",
      name: "Talons of the Dragon",
      summary:
        "Grow claws as natural weapons, usable for two claw attacks at full BAB in a full attack, each dealing 1d4 (1d3 if Small) + Strength modifier slashing damage. Treated as magic weapons at 5th level; damage die increases to 1d6 (1d4 if Small) at 7th level; deals +1d6 damage of your energy type at 11th level. Usable for 3 + Charisma modifier rounds per day.",
    },
    {
      id: "wingsOfTheDragon",
      name: "Wings of the Dragon",
      minLevel: 7,
      summary:
        "Swift action: manifest wings granting a fly speed of 60 ft. (clumsy maneuverability) for 1 minute per oracle level per day, in 1-minute increments. Maneuverability improves to poor at 10th level; usable time extends to 10 minutes per level at 11th level and becomes unlimited at 15th level.",
    },
  ]),
  ...forMystery("elemental", [
    {
      id: "danceOfWhirlingWater",
      name: "Dance of Whirling Water",
      summary:
        "Succeeding at an Acrobatics check to move through an enemy's square grants a competence bonus equal to half your oracle level (minimum +1) on trip combat maneuvers against that creature until the start of your next turn. At 11th level, gain Whirlwind Attack as a bonus feat and can substitute bull rush for its attacks, without moving the bull-rushed creatures.",
    },
    {
      id: "desertMirage",
      name: "Desert Mirage",
      minLevel: 3,
      summary:
        "Swift action: surround yourself with heated air for concealment (as blur). At 7th level, melee attacks made while active deal +2 fire damage. Usable for 1 minute per oracle level per day, in 1-minute increments.",
    },
    {
      id: "elementalAegis",
      name: "Elemental Aegis",
      summary:
        "Choose air, earth, fire, or water; conjure a protective covering granting a +4 armor bonus to AC, increasing by 2 every 4 levels starting at 7th. At 13th level, gain an additional boon by element: +2 Reflex saves (air), +2 CMD (earth), stacking fire resistance 2 (fire), or +4 Swim (water). Usable 1 hour per oracle level per day, in 1-hour increments.",
      contextNotes: [note("Which element you chose is a separate pick — record it in a note.")],
    },
    {
      id: "elementalAllies",
      name: "Elemental Allies",
      minLevel: 7,
      summary:
        "Cast summon monster spells that summon elementals with the air, earth, fire, or water subtype as a standard action instead of a full round. Usable a number of times per day equal to your oracle level.",
    },
    {
      id: "elementalChanneling",
      name: "Elemental Channeling",
      summary:
        "Gain Elemental Channel (choice of air, earth, fire, or water) as a bonus feat, plus the cleric's channel energy ability (usable only for Elemental Channel) at your oracle level; DC 10 + half oracle level + Charisma modifier. Gain Elemental Channel with another element as a bonus feat at 5th, 10th, and 15th level. Does not stack with channel energy from other classes.",
    },
    {
      id: "elementalResistance",
      name: "Elemental Resistance",
      summary:
        "Resistance 2 to acid, cold, electricity, and fire (stacks with other resistance of the same type), increasing to 5 at 7th level, 10 at 11th level, and 20 at 17th level.",
    },
    {
      id: "flowingStep",
      name: "Flowing Step",
      summary:
        "Base speed increases by 10 ft. At 7th level, move through threatened or occupied squares via Acrobatics without the usual +10 DC penalty. At 11th level, walk on liquid (as water walk) and become immune to damage from proximity to lava, magma, and similarly heated stone. Usable 1 hour per oracle level per day, in 1-hour increments. Not selectable with the lame oracle curse.",
    },
    {
      id: "reforgedArms",
      name: "Reforged Arms",
      summary:
        "Standard action: touch a non-masterwork, non-magical metal or stone weapon to make it masterwork. At 3rd level, also grant alchemical silver or cold iron properties (your choice) for bypassing DR; at 11th level, adamantine instead. At 7th, 15th, and 19th level, add a cumulative +1 enhancement bonus (does not stack with an existing one). Effect lasts 1 minute per oracle level; usable 3 + Charisma modifier times per day.",
    },
    {
      id: "roilingSoil",
      name: "Roiling Soil",
      summary:
        "The ground (or surrounding water) within 5 ft. per 2 oracle levels around you churns; other creatures move through it at half speed with a DC 10 Acrobatics check or stop moving (falling prone on a failure by 5 or more, or going off-balance if underwater). You and your allies are unaffected. Lasts a number of rounds equal to your oracle level; usable 3 + Charisma modifier times per day.",
    },
    {
      id: "sweepingImpact",
      name: "Sweeping Impact",
      summary:
        "When a charge's bull rush pushes the target at least 5 ft., attempt a free trip combat maneuver against it (no risk of being tripped unless you fail by 10 or more). At 7th level, affects creatures up to two size categories larger, plus one additional size category every 4 levels beyond 7th.",
    },
  ]),
  ...forMystery("godclaw", [
    {
      id: "abadarsBoon",
      name: "Abadar's Boon",
      summary:
        "Spend 1 minute communing with a masterwork object to speak with it (as stone tell, but for masterwork goods rather than any object). Usable for a number of minutes per day equal to your oracle level, in 1-minute increments.",
    },
    {
      id: "asmodeussBoon",
      name: "Asmodeus's Boon",
      summary:
        "Whenever a creature fails a save and takes damage from one of your spells, it becomes shaken for a number of rounds equal to the spell's level. Doesn't apply to spells that allow no save, and doesn't stack with other fear effects.",
    },
    {
      id: "armoredMind",
      name: "Armored Mind",
      summary:
        "While wearing Hellknight plate or a signifer mask, gain a +2 bonus on Will saves against mind-affecting effects. Once per day at 7th level, reroll a failed Will save against a mind-affecting effect and take the better result. The bonus increases to +4 at 11th level.",
    },
    {
      id: "mightOfTheGodclaw",
      name: "Might of the Godclaw",
      minLevel: 3,
      summary:
        "Gain Deific Obedience as a bonus feat (prerequisites waived) tied to one Godclaw deity. You can instead gain the benefits of up to four Godclaw deities' obediences by forgoing all three of your chosen deity's boons, spending at most 1 hour per day total on obedience.",
      contextNotes: [
        note("Which Godclaw deity you chose is a separate pick — record it in a note."),
      ],
    },
    {
      id: "instantArmor",
      name: "Instant Armor",
      summary:
        "Gain proficiency with one chosen heavy armor type. At 3rd level, twice per day as an immediate action, teleport a touched suit of that armor onto or off your body. At 11th level, instead stash the armor in an extradimensional space (1 minute to set up) that heals it 1 hp per hour.",
      contextNotes: [note("Which armor type you chose is a separate pick — record it in a note.")],
    },
    {
      id: "iomedaesBoon",
      name: "Iomedae's Boon",
      summary:
        "Move action: gain a +1 morale bonus on attack rolls, damage rolls, and Will saves against fear for a number of rounds equal to your Charisma bonus (+2 at 7th level, +3 at 14th level). Usable once per day, plus one additional time at 5th level and every 5 levels thereafter.",
    },
    {
      id: "ironOrder",
      name: "Iron Order",
      minLevel: 7,
      summary:
        "Once per day, issue a suggestion-like order; chaotic creatures take a -4 penalty on their save to resist it. At 15th level, functions as mass suggestion. While wearing Hellknight plate or a signifer mask, the target takes an additional -2 penalty (stacking with the chaotic penalty).",
    },
    {
      id: "irorisBoon",
      name: "Irori's Boon",
      summary:
        "Once per day as an immediate action, reroll a failed save against blinded, deafened, frightened, panicked, paralyzed, shaken, or stunned with a +4 insight bonus, taking the second result even if worse. One additional use per day at 7th and 15th level.",
    },
    {
      id: "resiliency",
      name: "Resiliency",
      summary:
        "Once per day, when brought below 0 hp without dying, act as if disabled for 1 round; at the end of your next turn you fall unconscious and begin dying unless brought above 0 hp. Gain Diehard as a bonus feat (prerequisite waived) at 7th level. At 15th level, three times per day while disabled and taking a strenuous action, a DC 15 Fortitude save avoids 1 point of that damage.",
    },
    {
      id: "toragsBoon",
      name: "Torag's Boon",
      summary:
        "Standard action: form a shield granting a +4 deflection bonus to AC, lasting 1/2 your oracle level minutes (minimum 1), in 1-minute increments. The bonus increases by 1 at 7th, 11th, and 15th level; at 19th level, it also grants DR 2/chaos.",
    },
  ]),
  ...forMystery("intrigue", [
    {
      id: "assumedForm",
      name: "Assumed Form",
      summary:
        "Change your appearance at will, as disguise self at your oracle level. At 7th level, this instead functions as a polymorph effect (no Will save to disbelieve). At 11th level, it lasts until dismissed or reused, even while you sleep. At 15th level, when used as a polymorph effect, also gain the size ability-score adjustment and racial abilities of alter self.",
    },
    {
      id: "desireSight",
      name: "Desire Sight",
      summary:
        "Standard action: learn the desires of a creature you can see within 100 ft., as detect desires concentrated to its third round (Will negates). Usable once per day at 1st level, plus one additional time per day at 5th level and every 5 levels thereafter.",
    },
    {
      id: "forgottenPresence",
      name: "Forgotten Presence",
      minLevel: 7,
      summary:
        "Once per day as an immediate action, cause a creature to forget your presence and all your actions for the last minute per oracle level, unless it succeeds at a Will save (DC 10 + half oracle level + Charisma modifier); modify memory can restore the lost memories. Usable twice per day at 15th level.",
    },
    {
      id: "gossipGuru",
      name: "Gossip Guru",
      minLevel: 7,
      summary:
        "Use rumormonger once per day as a spell-like ability at your oracle level; each use ends any previous activation. Usable three times per day at 11th level, at will at 15th level.",
    },
    {
      id: "hiddenMagic",
      name: "Hidden Magic",
      summary:
        "Gain Conceal Spell as a bonus feat (prerequisites waived). At 7th level, also hide your use of spell trigger items with it (+2 bonus for onlookers trying to notice). At 11th level, also hide spell completion item use (+5 bonus for onlookers).",
    },
    {
      id: "mirroredRetreat",
      name: "Mirrored Retreat",
      minLevel: 7,
      summary:
        "Once per day as a full-round action, release seven illusory duplicates (as mirror image) and retreat up to your speed while the duplicates flee in other directions; the duplicates share your touch AC and Reflex save, are immune to Fortitude/Will effects, and last 1 minute per oracle level or until damaged. One additional use per day at 11th level and every 4 levels thereafter.",
    },
    {
      id: "poeticVengeance",
      name: "Poetic Vengeance",
      summary:
        "Once per day as an immediate action after being successfully attacked, force the attacker to take half the effects of its own attack (damage halved; non-damaging effects have a 50% chance to apply, against the lower of the two DCs) unless it succeeds at a Will save (DC 10 + half oracle level + Charisma modifier). Usable twice per day at 10th level, three times at 20th level.",
    },
    {
      id: "tracerTouch",
      name: "Tracer Touch",
      minLevel: 11,
      summary:
        "Once per day, touch a creature or object to plant a scrying sensor on it, as vicarious view. Usable twice per day at 15th level.",
    },
    {
      id: "veiledVenom",
      name: "Veiled Venom",
      summary:
        "Standard action: touch an object to grant it the effects of magic aura and obscure poison. Usable at will; each new use ends the effects of a previous one.",
    },
    {
      id: "whisperedGlimpses",
      name: "Whispered Glimpses",
      summary:
        "Use your Charisma modifier instead of Wisdom on Perception and Sense Motive checks.",
      contextNotes: [
        note(
          "Mechanic substitution only — apply manually; no Cha-for-Wis Change target exists.",
          "skill.per",
        ),
        note(
          "Mechanic substitution only — apply manually; no Cha-for-Wis Change target exists.",
          "skill.sen",
        ),
      ],
    },
  ]),
  ...forMystery("juju", [
    {
      id: "beastTongue",
      name: "Beast Tongue",
      summary:
        "Communicate with a single type of animal (birds, cats, snakes, fish, ...) as if constantly under speak with animals; grants no special influence over them.",
    },
    {
      id: "connaissance",
      name: "Connaissance",
      summary:
        "Full-round action: attune to the spirit world for moment of prescience's insight bonus, equal to half your oracle level (minimum 1). Usable a number of times per day equal to your Charisma modifier (minimum 1); only one effect active at a time.",
    },
    {
      id: "ensnareTheSoul",
      name: "Ensnare the Soul",
      summary:
        "Add charm person and dominate person to your spell list. Creatures affected by either appear dead to observers (DC 20 Heal or Perception to tell otherwise) and act only as you direct, though they aren't mindless or helpless and still defend themselves.",
    },
    {
      id: "jujuSenses",
      name: "Juju Senses",
      summary:
        "+2 bonus on Knowledge (arcana) and Spellcraft checks when casting detect magic or identify, and +2 on Perception and Sense Motive checks against spirit creatures (outsiders, fey, incorporeal undead); both increase to +4 at 10th level.",
    },
    {
      id: "nightTerror",
      name: "Night Terror",
      minLevel: 11,
      summary:
        "Once per day, target a creature with nightmare's effect, but instead of the spell's normal damage make a full attack against its touch AC (using Charisma in place of Strength), dealing 1d10 damage per successful hit.",
    },
    {
      id: "pathOfTheSnake",
      name: "Path of the Snake",
      minLevel: 11,
      summary:
        "Once per day as a standard action, become incorporeal with a +10 bonus on Stealth checks, moving through anything but force effects, for a number of rounds equal to your oracle level (or end it early as a standard action); you can take no action but move. Usable twice per day at 15th level.",
    },
    {
      id: "spiritualDefense",
      name: "Spiritual Defense",
      summary:
        "Move action: chant to gain a protection spell's benefit (such as protection from evil) at your oracle level, lasting until you stop chanting or the spell's normal duration; magical silence ends the chant. At 6th level, chant a magic circle effect instead. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "summonNaturesSpirits",
      name: "Summon Nature's Spirits",
      minLevel: 5,
      summary:
        "Once per day as a standard action, cast a summon monster spell of a level up to the highest you can cast, summoning only elementals but treated as if you had Augment Summoning.",
    },
    {
      id: "unwillingHost",
      name: "Unwilling Host",
      minLevel: 7,
      summary:
        "Once per day as a standard action, target a number of creatures (equal to your Charisma modifier, no two more than 30 ft. apart) within 100 ft.; each that fails a Will save suffers confusion, as spirits possess and cause it to act erratically, for a number of rounds equal to your oracle level.",
    },
  ]),
  ...forMystery("lunar", [
    {
      id: "formOfTheBeast",
      name: "Form of the Beast",
      minLevel: 7,
      summary:
        "Standard action: assume a Small or Medium animal's form as beast shape I, upgrading at 9th level to Tiny or Large (beast shape II), at 11th to Diminutive/Huge animal or Small/Medium magical beast (beast shape III), and at 13th to Tiny or Large magical beast (beast shape IV). Once per day; duration 1 hour per oracle level.",
    },
    {
      id: "eyeOfTheMoon",
      name: "Eye of the Moon",
      summary:
        "Darkvision 60 ft. At 11th level, as a standard action, focus on a 10-ft.-by-10-ft. object or area to see it as though under true seeing as long as moonlight reaches it; moonless nights, clouds, and shadows interfere.",
    },
    {
      id: "giftOfClawAndHorn",
      name: "Gift of Claw and Horn",
      summary:
        "Swift action: grow a bite, claw, or gore natural weapon dealing normal damage for your size, lasting a number of rounds equal to half your oracle level (minimum 1). Gains a +1 enhancement bonus at 5th level (+1 more at 10th, 15th, and 20th); grants two natural weapons at once from 11th level. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "mantleOfMoonlight",
      name: "Mantle of Moonlight",
      summary:
        "Immune to lycanthropy. Melee touch attack forces a lycanthrope into humanoid form for a number of rounds equal to your oracle level; from 5th level it instead inflicts a rage-like state, as the spell. Usable once per day at 5th level, plus one additional use per 5 levels above 5th.",
    },
    {
      id: "moonbeam",
      name: "Moonbeam",
      summary:
        "Ranged touch attack within 30 ft. dealing 1d6 damage + 1 per 2 oracle levels; a failed Fortitude save also blinds the target for 1 round. Usable a number of times per day equal to your Charisma modifier (minimum 1).",
    },
    {
      id: "moonlightBridge",
      name: "Moonlight Bridge",
      summary:
        "Summon a 10-ft.-wide bridge of moonlight extending up to 10 ft. per oracle level from a point adjacent to you, lasting until crossed or for 24 hours, whichever is shorter; treat it as a wall of force if attacked. Usable a number of times per day equal to your Charisma bonus.",
    },
    {
      id: "moonlitScript",
      name: "Moonlit Script",
      summary:
        "Once per night while you sleep, your hands produce prophetic writing: augury at 90% effectiveness at 1st level, divination at 90% effectiveness at 5th level, and commune with no material component at 8th level.",
    },
    {
      id: "primalCompanion",
      name: "Primal Companion",
      summary:
        "Gain a bear, boar, crocodile, shark, tiger, or wolf as an animal companion, functioning as a druid's using your oracle level as your effective druid level.",
      contextNotes: [
        note(
          "Reminder: set up your companion in the Animal Companion section of the Classes panel — this toggle is informational.",
        ),
      ],
    },
    {
      id: "propheticArmor",
      name: "Prophetic Armor",
      summary:
        "Add your Charisma modifier instead of Dexterity to AC and Reflex saves; your armor's maximum Dexterity bonus applies to Charisma instead.",
      contextNotes: [
        note(
          "Mechanic substitution only — apply manually; no Cha-for-Dex Change target exists.",
          "ac",
        ),
      ],
    },
    {
      id: "touchOfTheMoon",
      name: "Touch of the Moon",
      minLevel: 7,
      summary:
        "If you cast inflict spells, targets damaged by them also suffer confusion for a number of rounds equal to the inflict spell's level (DC 10 + half your oracle level + Charisma modifier). If you cast cure spells instead, expend two spell slots to cast one as though Empowered, granting temporary hit points (instead of actual healing) that expire after a number of minutes equal to half your oracle level.",
    },
  ]),
  ...forMystery("metal", [
    {
      id: "armorMastery",
      name: "Armor Mastery",
      summary:
        "Move at your normal speed in medium armor made of metal (no proficiency granted). At 5th level, while wearing metal armor, reduce its armor check penalty by 1 (minimum 0) and increase its maximum Dexterity bonus by 1; both increase by 1 again at 10th and 15th level.",
    },
    {
      id: "danceOfTheBlades",
      name: "Dance of the Blades",
      summary:
        "+10 ft. base speed. At 7th level, gain +1 on attack rolls with a metal weapon in any round you move at least 10 ft., increasing by 1 at 11th level and every 4 levels thereafter. At 11th level, as a move action while wielding a metal weapon, conjure a whirling shield of steel giving non-incorporeal attacks against you a 20% miss chance until the start of your next turn.",
    },
    {
      id: "ironConstitution",
      name: "Iron Constitution",
      summary: "+1 bonus on Fortitude saves, increasing to +2 at 7th level and +3 at 14th level.",
    },
    {
      id: "ironSkin",
      name: "Iron Skin",
      minLevel: 11,
      summary:
        "Once per day, harden your skin for DR 10/adamantine, as stoneskin at your oracle level but affecting only you. Usable twice per day at 15th level.",
    },
    {
      id: "ironWeapon",
      name: "Iron Weapon",
      summary:
        "Conjure a simple or martial melee weapon, appropriate to your size and made entirely of metal, lasting 1 minute per oracle level or disappearing 1 round after leaving your grasp; you're automatically proficient with it. Cold iron from 3rd level; gains a +1 enhancement bonus at 7th, 15th, and 19th level; adamantine from 11th level. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "riddleOfSteel",
      name: "Riddle of Steel",
      summary:
        "Once per day, spend 10 minutes meditating on a piece of unworked metal or ore for a +5 insight bonus on your next Craft check to make something from that metal.",
    },
    {
      id: "rustingGrasp",
      name: "Rusting Grasp",
      minLevel: 7,
      summary:
        "Once per day as a standard action, melee touch attack that rusts iron, as the rusting grasp spell. One additional use per day at 11th level and every 4 levels thereafter.",
    },
    {
      id: "skillAtArms",
      name: "Skill at Arms",
      summary: "Gain proficiency with all martial weapons and with heavy armor.",
      contextNotes: [note("Proficiency grant — no numeric sheet effect to model.")],
    },
    {
      id: "steelScarf",
      name: "Steel Scarf",
      summary:
        "Swift action: harden a scarf, sleeve, or other piece of clothing into a steel lash up to 30 ft. long and make a melee attack against a creature in range (Weapon Finesse applies; usable for combat maneuvers), dealing 1d8 slashing damage + 1 per 2 oracle levels on a hit. You don't threaten with it and can't use it for attacks of opportunity. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "visionInIron",
      name: "Vision in Iron",
      minLevel: 7,
      summary:
        "Use any dagger-sized or larger piece of polished metal as a scrying focus, as scrying (greater scrying from 15th level), for a number of rounds per day equal to your oracle level; the rounds need not be consecutive.",
    },
  ]),
  ...forMystery("occult", [
    {
      id: "automaticWriting",
      name: "Automatic Writing",
      summary:
        "Once per day, spend a full hour in meditation to produce prophetic writing: augury at 90% effectiveness at 1st level, divination at 90% effectiveness at 5th level, and commune with no material component at 8th level.",
    },
    {
      id: "brainDrain",
      name: "Brain Drain",
      summary:
        "Standard action: probe the mind of an intelligent enemy within 100 ft. A failed Will save deals 1d4 damage per oracle level and reveals you as the source. After a successful attack, spend a full-round action to attempt one Knowledge check using the victim's skill bonus (as detect thoughts); the stolen knowledge lasts a number of rounds equal to your Charisma modifier. This is a mind-affecting effect. Usable once per day at 1st level, plus one more at 5th level and one per 5 levels thereafter.",
    },
    {
      id: "ectoplasmicArmor",
      name: "Ectoplasmic Armor",
      summary:
        "Conjure ectoplasmic armor granting a +4 armor bonus to AC with the ghost touch property, increasing by 2 every 4 levels from 7th. Usable 1 hour per day per oracle level, spent in 1-hour increments.",
    },
    {
      id: "phantomTouch",
      name: "Phantom Touch",
      summary:
        "Standard action melee touch attack that shakes a living creature for a number of rounds equal to half your oracle level (minimum 1); frightens instead from 5th level, panics from 7th level. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "projectPsyche",
      name: "Project Psyche",
      minLevel: 11,
      summary:
        "Once per day, possess an adjacent creature as magic jar, requiring no receptacle; the target resists with a Will save.",
    },
    {
      id: "shroudOfRetribution",
      name: "Shroud of Retribution",
      minLevel: 7,
      summary:
        "Immediate action: summon a shroud of spirits that reflects 1d8 force damage + 1 per 2 caster levels (maximum +10) back onto any creature that strikes you in melee, lasting until the end of your next turn. Usable once per day, plus one more use at 11th level and every 4 levels thereafter.",
    },
    {
      id: "spectralSpells",
      name: "Spectral Spells",
      summary:
        "Gain Ectoplasmic Spell as a bonus feat. Once per day, apply it to a spell as a standard action without increasing the spell's level; one additional use per day at 7th level and every 4 levels thereafter.",
      contextNotes: [
        note(
          "Grants Ectoplasmic Spell as a bonus feat — add it to doc.build.feats separately.",
          "bonusFeats",
        ),
      ],
    },
    {
      id: "spiritWalk",
      name: "Spirit Walk",
      minLevel: 11,
      summary:
        "Become incorporeal and invisible, moving through solid objects (taking no action but to move) for a number of rounds equal to your oracle level, or end the effect early as a standard action. Usable once per day, twice from 15th level.",
    },
    {
      id: "sureSoul",
      name: "Sure Soul",
      summary:
        "+2 insight bonus on saves against possession effects (magic jar, a ghost's malevolence, domination effects). Extends to death effects and mind-affecting effects at 7th level; the bonus increases to +4 at 11th level.",
    },
    {
      id: "voiceOfTheGrave",
      name: "Voice of the Grave",
      summary:
        "Use speak with dead for a number of rounds per day equal to your oracle level; the rounds need not be consecutive. At 5th level and every 5 levels thereafter, the dead creature takes a cumulative -2 penalty on its Will save to resist.",
    },
  ]),
  ...forMystery("outer_rifts", [
    {
      id: "balefire",
      name: "Balefire",
      summary:
        "Standard action: a target within 30 ft. takes 1d6 fire damage per oracle level (Reflex half). At 10th level, damaged creatures are staggered for 1 round; at 15th level, they're staggered 1d4 rounds and stunned 1 round instead. Usable once per day, plus one more at 10th level.",
    },
    {
      id: "demonhide",
      name: "Demonhide",
      summary:
        "Gain a +4 armor bonus, increasing by +2 every 4 levels starting at 7th; adds DR 5/cold iron at 13th level. Usable 1 hour per day per oracle level, in 1-hour increments.",
    },
    {
      id: "dreadResilience",
      name: "Dread Resilience",
      minLevel: 9,
      summary:
        "Gain a +1 inherent bonus to Constitution on taking this revelation and another every 4 oracle levels thereafter.",
    },
    {
      id: "planarHaze",
      name: "Planar Haze",
      summary:
        "Once per day, as a swift action when you cast a spell with an area, also fill that area with a haze acting as obscuring mist (fog cloud at 10th level), confined to the spell's area. One additional use per day at 7th and 14th level.",
    },
    {
      id: "planarInfusion",
      name: "Planar Infusion",
      summary:
        "Standard action once per day: a 20-ft. spread gains the mildly chaotic- or evil-aligned planar trait for 1 round per oracle level, imposing a -2 circumstance penalty on Charisma-based checks for creatures lacking that alignment component. At 11th level the infusion becomes strongly aligned, widening the penalty to Intelligence-, Wisdom-, and Charisma-based checks (stacking with the lower-level effect).",
      contextNotes: [
        note(
          "Requires you to be chaotic or evil, and only lets you infuse an alignment component you actually have — a prerequisite this table doesn't gate.",
        ),
      ],
    },
    {
      id: "riftMagic",
      name: "Rift Magic",
      summary:
        "Your spells gain a +4 bonus on caster level checks made to overcome the spell resistance of chaotic outsiders and evil outsiders.",
    },
    {
      id: "riftWeapon",
      name: "Rift Weapon",
      summary:
        "Standard action once per day: touch one weapon (or up to 20 similar pieces of ammunition) to grant it the ability to bypass DR/cold iron for 1 minute per caster level; at 9th level, also grant DR/good and DR/law bypass. One additional use per day per 5 oracle levels.",
    },
    {
      id: "telepathy",
      name: "Telepathy",
      minLevel: 11,
      summary:
        "Mentally communicate with any other creature within 100 feet that has a language, as the telepathy ability of demons and angels.",
    },
    {
      id: "unearthlyTerrain",
      name: "Unearthly Terrain",
      summary:
        "Standard action: turn one 20-ft. square into difficult terrain for 1 round per level. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "wingsOfTerror",
      name: "Wings of Terror",
      minLevel: 7,
      summary:
        "Manifest bat-like demon wings granting a 60-ft. fly speed (average maneuverability) and a +4 bonus on Intimidate checks. At 10th level, speed increases to 90 ft. with good maneuverability and the bonus rises to +8. Usable 1 minute per day per oracle level, in 1-minute increments.",
    },
  ]),
  ...forMystery("reaper", [
    {
      id: "deathsEmbrace",
      name: "Death's Embrace",
      summary:
        "Gain Improved Grapple as a bonus feat, even without meeting its prerequisites. Once per round on a successful grapple combat maneuver check, deal 1d6 negative energy damage to the grappled target, increasing by 1d6 at 5th level and every 5 levels thereafter (5d6 max at 20th).",
      contextNotes: [
        note("Grants a specific bonus feat — add it to doc.build.feats separately.", "bonusFeats"),
      ],
    },
    {
      id: "hauntChanneler",
      name: "Haunt Channeler",
      minLevel: 5,
      summary:
        "Gain the medium's haunt channeler class feature, with an effective medium level equal to your oracle level - 2.",
      contextNotes: [
        note(
          "A class-feature substitution from the medium class, which this engine doesn't otherwise model — track its effects by hand.",
        ),
      ],
    },
    {
      id: "moralCrisis",
      name: "Moral Crisis",
      summary:
        "Standard action: a living creature within 30 feet must succeed at a Will save or be staggered for 1 round per oracle level, with a new save at the end of each of its turns. Mind-affecting emotion effect.",
    },
    {
      id: "obliterateMemory",
      name: "Obliterate Memory",
      minLevel: 11,
      summary:
        "Standard action: target a creature within 30 feet and erase its memory of an event, as modify memory (Will negates); the erased account can be made to appear on a blank page you carry. Usable once per day, plus one more at 15th level.",
    },
    {
      id: "paleHorse",
      name: "Pale Horse",
      minLevel: 5,
      summary:
        "Summon a phantom steed, as the spell, to serve you for a number of hours per day equal to your oracle level. The duration need not be consecutive, but must be spent in 1-hour increments.",
    },
    {
      id: "returnToDust",
      name: "Return to Dust",
      summary:
        "Damage an object or undead creature within 30 feet for 1d6 per 2 oracle levels, ignoring hardness and damage reduction (the undead creature, or whoever possesses a targeted object, can attempt a Reflex save to halve). Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "spectralSpells",
      name: "Spectral Spells",
      summary:
        "Gain Ectoplasmic Spell as a bonus feat. Once per day, apply Ectoplasmic Spell to a spell as a standard action without increasing its level. One additional use per day at 7th level and every 4 levels thereafter.",
      contextNotes: [
        note("Grants a specific bonus feat — add it to doc.build.feats separately.", "bonusFeats"),
      ],
    },
    {
      id: "spiritTouch",
      name: "Spirit Touch",
      summary:
        "Standard action: touch a weapon to grant it the ghost touch special ability for a number of rounds equal to your Charisma modifier. At 11th level, spend two uses at once to also grant undead bane. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "terminalAura",
      name: "Terminal Aura",
      minLevel: 11,
      summary:
        "Gain a 10-ft. aura: a stable creature below 0 hit points inside it must succeed at a Will save or suffer the bleed condition; a dying creature in the aura can't stabilize naturally without a Will save (though it can still be healed normally), and fast healing or regeneration is suppressed for 1 round on a failed save each round. Suppress or resume the aura as a free action.",
    },
    {
      id: "trueDeath",
      name: "True Death",
      summary:
        "Creatures slain by your spells or by an attack of yours that deals negative energy damage resist being raised: restoring them requires a caster level check (DC 15 + your oracle level) or the spell fails and its material component is wasted. Casting remove curse (DC 10 + your oracle level) on the corpse first suppresses this effect for 1 minute.",
    },
  ]),
  ...forMystery("shadow", [
    {
      id: "armyOfDarkness",
      name: "Army of Darkness",
      summary:
        "Whenever a summon monster spell you cast would summon a creature with the celestial or fiendish template, you may instead summon it with the shadow creature template. Counts as having Spell Focus (conjuration) for meeting Augment Summoning's prerequisite, and any feat that requires Augment Summoning.",
      contextNotes: [
        note(
          "Feat-prerequisite substitution only — apply manually when checking Augment Summoning's chain.",
        ),
      ],
    },
    {
      id: "cloakOfDarkness",
      name: "Cloak of Darkness",
      summary:
        "Conjure a cloak of shadowy darkness granting a +4 armor bonus and a +2 circumstance bonus on Stealth checks, both increasing by +2 every 4 levels starting at 7th. Usable 1 hour per day per oracle level, in 1-hour increments.",
    },
    {
      id: "darkSecrets",
      name: "Dark Secrets",
      summary:
        "Add sorcerer/wizard spells to your spell list and spells known as divine spells, up to a number equal to your Charisma modifier (minimum 1, maximum half your oracle level) — limited to shadow-subschool illusions or spells with the darkness descriptor, at their sorcerer/wizard spell level. Each level gained after taking this, you may swap one for a new qualifying spell.",
    },
    {
      id: "livingShadow",
      name: "Living Shadow",
      minLevel: 7,
      summary:
        "Dissolve into a living shadow, functioning as gaseous form, for a number of minutes per day equal to your oracle level (1-minute increments). At 14th level, functions as shadow body instead, adding DR 10/magic and immunity to poison, sneak attacks, and critical hits.",
    },
    {
      id: "pierceTheShadows",
      name: "Pierce the Shadows",
      summary:
        "Gain darkvision 60 ft. (or +60 ft. to darkvision you already have). At 11th level, see perfectly in any darkness, including absolute darkness or a deeper darkness spell.",
    },
    {
      id: "shadowArmament",
      name: "Shadow Armament",
      summary:
        "Create a quasi-real, size-appropriate masterwork simple or martial weapon you're automatically proficient with. The first creature it hits may attempt a Will save to disbelieve; success limits it to 1 point of damage (minimum die results instead, at 15th level), failure means normal damage (objects always take 1 point). The weapon gains a cumulative +1 enhancement bonus at 3rd, 11th, and 19th level, and either frost or keen (your choice) at 7th — these don't function against a target that saved. Usable minutes per day equal to your oracle level, in 1-minute increments; the weapon vanishes 1 round after leaving your grasp.",
    },
    {
      id: "shadowMastery",
      name: "Shadow Mastery",
      minLevel: 7,
      summary:
        "Illusion spells you cast from the shadow subschool increase in strength by 1% per oracle level you have.",
    },
    {
      id: "shadowProjection",
      name: "Shadow Projection",
      minLevel: 7,
      summary:
        "Your shadow separates from your body and acts as an independent creature, as shadow projection, except it has the outsider type and phantom subtype rather than the undead type (no evil descriptor; can't be turned or affected as undead, though it can be affected as an outsider). Usable hours per day equal to half your oracle level, in 1-hour increments; your shadow's hit points don't reset between uses (heal it as any other outsider), and while the ability isn't active, healing done to you also heals your shadow.",
    },
    {
      id: "stealthMastery",
      name: "Stealth Mastery",
      summary:
        "Gain Skill Focus (Stealth) as a bonus feat. At 8th level, gain Signature Skill (Stealth) even without meeting its prerequisites. At 16th level, gain the shadowdancer's hide in plain sight class feature.",
      contextNotes: [
        note("Grants a specific bonus feat — add it to doc.build.feats separately.", "bonusFeats"),
      ],
    },
    {
      id: "wingsOfDarkness",
      name: "Wings of Darkness",
      minLevel: 7,
      summary:
        "Swift action: manifest translucent, inky wings granting a 60-ft. fly speed with good maneuverability. Usable 1 minute per day per oracle level, in 1-minute increments. At 11th level, once per day you may instead fly as overland flight for up to 1 hour per level, which counts as your entire daily use of this ability.",
    },
  ]),
  ...forMystery("spellscar", [
    {
      id: "animatePrimalForces",
      name: "Animate Primal Forces",
      minLevel: 3,
      summary:
        "Standard action: summon a single Small air, earth, fire, or water elemental to serve you for a number of rounds equal to your Charisma modifier. At 7th level, summon a Medium elemental; at 9th level, a Large one. Usable once per day, plus one more at 10th level.",
    },
    {
      id: "eldritchBolt",
      name: "Eldritch Bolt",
      summary:
        "Ranged touch attack against a foe within 30 feet, dealing 1d8 force damage +1 per two oracle levels on a hit. At 10th level, range increases to 60 feet. Usable 3 + your Charisma modifier times per day.",
    },
    {
      id: "eldritchResistance",
      name: "Eldritch Resistance",
      summary:
        "Gain resistance 2 to acid, cold, electricity, fire, and sonic, increasing to 5 at 5th level, 10 at 11th level, and 20 at 17th level.",
    },
    {
      id: "eldritchScar",
      name: "Eldritch Scar",
      minLevel: 7,
      summary:
        "Once per day when you damage a creature with a spell, you may, as a swift action, mark it with an eldritch scar. The next time that creature casts a spell, uses a spell-like ability, or activates a magic item, it triggers a primal magic event with a CR equal to your caster level, and the scar vanishes. Only one scar can mark a creature at a time (a stronger one replaces a weaker); it fades after 24 hours or can be removed as a curse (DC = your caster level) — a failed removal attempt itself triggers a primal magic event without clearing the scar.",
    },
    {
      id: "magicPenetration",
      name: "Magic Penetration",
      summary:
        "+2 bonus on caster level checks made to dispel or remove a magic effect (such as with dispel magic or remove curse), increasing to +4 at 9th level.",
    },
    {
      id: "mysticNull",
      name: "Mystic Null",
      summary:
        "+2 insight bonus on saves against spells and spell-like abilities, extending to supernatural abilities at 7th level; the bonus increases to +4 at 11th level.",
    },
    {
      id: "primalManipulation",
      name: "Primal Manipulation",
      minLevel: 7,
      summary:
        "Whenever you cast a spell dealing acid, cold, electricity, or fire damage, you may change it to deal one of the other three instead. Usable once per day, plus one more per 5 levels. At 15th level, you can retarget to sonic damage (halved); at 20th level, to force damage (halved).",
    },
    {
      id: "primalMastery",
      name: "Primal Mastery",
      summary:
        "Whenever a spell you cast triggers a primal magic event, or you use a rod of wonder, roll d% twice and choose which result applies. +2 bonus on saving throws made to resist primal magic events or rod of wonder effects.",
    },
    {
      id: "triggerPrimalMagicEvent",
      name: "Trigger Primal Magic Event",
      minLevel: 9,
      summary:
        "Immediate action once per day: force a spellcaster (including yourself) within 30 feet to trigger a primal magic event as they cast a spell — the caster may attempt a concentration check (DC 15 + twice the spell's level) to avoid it. At 13th level, also usable on a creature activating a magic item (non-spellcasters get no check to avoid it). Usable twice per day at 17th level.",
    },
    {
      id: "spellResistance",
      name: "Spell Resistance",
      minLevel: 11,
      summary: "Gain spell resistance equal to your oracle level + 5.",
    },
  ]),
  ...forMystery("streets", [
    {
      id: "cityProvides",
      name: "The City Provides",
      summary:
        "Once per day as a full-round action in an urban environment, scrounge up any nonmagical item worth up to 10 gp per oracle level; no coins or trade goods, and it's too tattered to resell. Obtaining a new item voids the last one.",
    },
    {
      id: "eyesOfTheStreets",
      name: "Eyes of the Streets",
      summary:
        "Once per day as a full-round action, summon a spirit rat, pigeon, or similar creature to serve as your eyes, functioning as arcane eye. Upgrades to prying eyes at 10th level and greater prying eyes at 15th.",
    },
    {
      id: "faceInTheCrowd",
      name: "Face in the Crowd",
      summary:
        "+4 bonus on Stealth checks, and you can attempt a Stealth check in a crowd even while observed.",
    },
    {
      id: "keepToTheCorners",
      name: "Keep to the Corners",
      summary:
        "Once per day when you fail a Reflex save, reroll it with a +4 insight bonus (must take the second result). One additional use at 7th and 15th level.",
    },
    {
      id: "knifeInTheDark",
      name: "Knife in the Dark",
      summary:
        "Standard action: deliver a sneak attack as a rogue of your oracle level. Once per day, plus one additional time at 5th level and every 5 levels thereafter.",
    },
    {
      id: "nooksAndCrannies",
      name: "Nooks and Crannies",
      summary:
        "Move through obstacles and difficult terrain in an urban environment, including crowds, at full speed without harm or impairment. Magically-imposed impediments still affect you.",
    },
    {
      id: "secretsOfCity",
      name: "Secrets of City",
      summary:
        "Once per day when you cast a divination spell targeting creatures or areas in an urban environment, double its range. One additional use at 7th and 15th level.",
    },
    {
      id: "shroudOfTheCity",
      name: "Shroud of the City",
      summary:
        "Cast veil once per day, affecting yourself and one willing ally per oracle level within 30 ft., disguised only as typical residents of a settlement you know. One additional use at 7th and 15th level.",
    },
    {
      id: "streetsAreYourFriend",
      name: "The Streets Are Your Friend",
      summary:
        "While in an urban environment and concentrating, grant an ally within 30 ft. a +2 competence bonus on checks with one skill, rising to +3 at 9th level and +4 at 15th.",
    },
  ]),
  ...forMystery("succor", [
    {
      id: "combatHealer",
      name: "Combat Healer",
      minLevel: 7,
      summary:
        "Cast any cure spell as a swift action (as Quicken Spell) by expending two spell slots of its level, without increasing the spell's level. Limited uses per day starting at 7th level, one more every 4 levels beyond.",
    },
    {
      id: "curseOfDampening",
      name: "Curse of Dampening",
      minLevel: 7,
      summary:
        "Standard action: curse a target within 30 ft. so it deals only minimum damage on attacks and spells (Will negates, mind-affecting) for 1 round per 2 oracle levels. Once per day, plus one more at 11th and 15th level.",
    },
    {
      id: "enhancedCures",
      name: "Enhanced Cures",
      summary:
        "Your cure spells heal up to your oracle level in bonus hit points instead of the spell's normal cap (e.g. cure light wounds heals 1d8 plus your oracle level).",
    },
    {
      id: "enhancedInflictions",
      name: "Enhanced Inflictions",
      summary:
        "Your inflict spells deal up to your oracle level in bonus damage instead of the spell's normal cap.",
    },
    {
      id: "perfectAid",
      name: "Perfect Aid",
      summary:
        "Gain Bodyguard as a bonus feat. The bonus you grant with the aid another action increases by 1, scaling from 4th level to a maximum of +5 at 19th; doesn't stack with other effects that improve that bonus. Counts as Combat Expertise solely for Swift Aid's prerequisites.",
    },
    {
      id: "pitifulFoe",
      name: "Pitiful Foe",
      summary:
        "Standard action: curse a target within 30 ft. so it never threatens you or your allies, a natural 20 on its attack rolls or saves isn't an automatic success, and it auto-fails critical-hit confirmations (Will negates, mind-affecting) for 1 round per 2 oracle levels. Once per day, plus one more at 7th and 15th level.",
    },
    {
      id: "shellOfSuccor",
      name: "Shell of Succor",
      minLevel: 3,
      summary:
        "Standard-action touch grants an ally temporary hit points equal to your Charisma bonus + 1d6 per 2 oracle levels (max 10d6), lasting 1 minute per oracle level; these are lost before any other temporary hit points. Once per day, plus one more at 11th and 19th level.",
    },
    {
      id: "soulSiphon",
      name: "Soul Siphon",
      minLevel: 7,
      summary:
        "Ranged touch attack (30 ft.) inflicts one negative level on the target for a number of minutes equal to your Charisma modifier, healing you for hit points equal to your oracle level. Once per day, plus one more at 11th level and every 4 levels thereafter.",
    },
    {
      id: "spiritBoost",
      name: "Spirit Boost",
      summary:
        "Excess healing from your spells beyond a target's maximum hit points persists as temporary hit points for 1 round per level, capped at your oracle level.",
    },
    {
      id: "teamworkMastery",
      name: "Teamwork Mastery",
      summary:
        "Gain a bonus teamwork feat (must meet its prerequisites). Standard-action touch grants an ally the benefits of one teamwork feat you have for 1/2 your oracle level in rounds (minimum 1), usable 3 + your Charisma modifier times per day.",
    },
  ]),
  ...forMystery("time", [
    {
      id: "agingTouch",
      name: "Aging Touch",
      summary:
        "Melee touch attack deals 1 point of Strength damage per 2 oracle levels to living creatures, or 1d6 damage per oracle level to objects/constructs (treated as a sunder if the object is held). Once per day, plus one more per 5 oracle levels.",
    },
    {
      id: "eraseFromTime",
      name: "Erase from Time",
      summary:
        "Melee touch attack forces a Fortitude save or the target vanishes outside time — undetectable by magic or divination — for 1/2 your oracle level in rounds (minimum 1), reappearing unharmed after. Once per day, plus one more at 11th level.",
    },
    {
      id: "knowledgeOfTheAges",
      name: "Knowledge of the Ages",
      summary:
        "Retry any Knowledge check you made within the past minute, with an insight bonus equal to your Charisma modifier. Usable a number of times per day equal to your Charisma modifier.",
    },
    {
      id: "momentaryGlimpse",
      name: "Momentary Glimpse",
      summary:
        "Once per day, glimpse the future: on the following round, gain a +2 insight bonus on one attack roll, save, skill check, or to AC until the start of your next turn. One additional use at 5th level and every 4 levels thereafter.",
    },
    {
      id: "rewindTime",
      name: "Rewind Time",
      minLevel: 7,
      summary:
        "Immediate action, once per day: reroll a d20 roll you just made before the result is revealed, keeping the reroll even if worse. One additional use at 11th level and every 4 levels thereafter.",
    },
    {
      id: "speedOrSlowTime",
      name: "Speed or Slow Time",
      minLevel: 7,
      summary:
        "Standard action, once per day: cast haste or slow. One additional use at 12th and 17th level.",
    },
    {
      id: "temporalCelerity",
      name: "Temporal Celerity",
      summary:
        "Roll initiative twice and take either result. At 7th level, always act in the surprise round (last, if you failed to notice the ambush). At 11th level, roll initiative three times and take any of the results.",
    },
    {
      id: "timeFlicker",
      name: "Time Flicker",
      minLevel: 3,
      summary:
        "Standard action: gain concealment as blur, drawing on a pool of 1 minute per oracle level per day (spent in 1-minute increments). At 7th level, each activation instead acts as blink, with each round spent counting as 1 minute of that pool.",
    },
    {
      id: "timeHop",
      name: "Time Hop",
      minLevel: 7,
      summary:
        "Move action: teleport up to 10 ft. per oracle level per day (5-ft. increments, no attacks of opportunity, requires line of sight to the destination). Can bring willing creatures along by spending equal distance per creature.",
    },
    {
      id: "timeSight",
      name: "Time Sight",
      minLevel: 11,
      summary:
        "See as true seeing for a number of minutes per day equal to your oracle level (needn't be consecutive). Upgrades to moment of prescience at 15th level and foresight at 18th.",
    },
  ]),
  ...forMystery("volcano", [
    {
      id: "ashCloud",
      name: "Ash Cloud",
      summary:
        "Standard action: surround yourself with a stationary 10-ft.-radius cloud of ash (as obscuring mist, but you see through it clearly) for 1 round per oracle level; activating it again drops the previous cloud. At 7th level, the cloud fills with embers, dealing 1d6 fire damage per round to others inside and forcing Fortitude saves against choking.",
    },
    {
      id: "breathOfCreation",
      name: "Breath of Creation",
      summary:
        "When volcanic gases deal you Constitution damage, gain an equal Charisma bonus for 1 hour or until the damage is healed, capped at +2 (rising to +4 at 10th level, +6 at 15th).",
    },
    {
      id: "burningMagic",
      name: "Burning Magic",
      summary:
        "A creature that fails a save against one of your fire spells catches fire, taking 1 fire damage per spell level each round for 1d4 rounds. A move-action Reflex save (at the spell's DC) extinguishes it; dousing with water grants +2 on that save, and immersion extinguishes it outright.",
    },
    {
      id: "cleansingFlames",
      name: "Cleansing Flames",
      summary:
        "Swift action: take 1d4 damage per oracle level to gain a new saving throw against a single ongoing effect you already failed, removing it on success. One additional use at 7th and 15th level.",
    },
    {
      id: "erupt",
      name: "Erupt",
      summary:
        "Swift action: flaming rock shards burst from you, dealing 1d6 damage per 2 oracle levels (minimum 1d6, half fire/half piercing) in a 10-ft.-radius burst (Reflex half) and creating difficult terrain for 1 round. Once per day, plus one more at 5th level and every 5 levels thereafter.",
    },
    {
      id: "fieryConduit",
      name: "Fiery Conduit",
      summary:
        "Deliver touch spells to burning creatures within 30 ft. without touching them (ranged touch attack against an unwilling target). 'Burning' covers creatures on fire, taking ongoing fire damage, or with the fire subtype.",
    },
    {
      id: "lavaWalk",
      name: "Lava Walk",
      minLevel: 3,
      summary:
        "Walk on lava, magma, or similarly heated stone at full speed, immune to its fire damage and never slipping or falling from poor footing, for 1 minute per oracle level per day (spent in 1-minute increments).",
    },
    {
      id: "magmaForm",
      name: "Magma Form",
      minLevel: 7,
      summary:
        "Standard action, once per day: assume a Small magma elemental's form (as elemental body I, with a magma elemental's earth glide) for 1 hour per oracle level. Upgrades to Medium at 9th level, Large at 11th, and Huge at 13th (elemental body II-IV).",
    },
    {
      id: "pyroclasticShove",
      name: "Pyroclastic Shove",
      minLevel: 7,
      summary:
        "Standard action: bull rush a target within 30 ft. with a cascade of volcanic ash (CMB = base attack bonus + Charisma modifier + 4 for the cascade's Gargantuan size); on success, it takes 1d6 fire damage per oracle level. Once per day, plus one more at 12th and 17th level.",
    },
    {
      id: "touchOfFlame",
      name: "Touch of Flame",
      summary:
        "Standard action, melee touch attack: deals 1d6 + 1 fire damage per 2 oracle levels, usable 3 + your Charisma modifier times per day. At 11th level, your wielded weapon counts as flaming.",
    },
  ]),
  ...forMystery("whimsy", [
    {
      id: "assumedForm",
      name: "Assumed Form",
      summary:
        "Change your appearance at will, as disguise self at your oracle level. At 7th level, physically transform instead, as alter self. At 11th level, the effect lasts until dismissed or renewed, even while you sleep.",
    },
    {
      id: "capriciousMisdirection",
      name: "Capricious Misdirection",
      minLevel: 7,
      summary:
        "Constantly under the effect of misdirection against aura-reading divinations; as a standard action, redirect detection effects targeting you onto a chosen creature or object within 60 ft. until you choose again.",
    },
    {
      id: "feywise",
      name: "Feywise",
      minLevel: 3,
      summary:
        "Gain the druid's resist nature's lure class feature, plus a +2 bonus on Perception, Sense Motive, and Survival checks against fey.",
    },
    {
      id: "flicker",
      name: "Flicker",
      summary:
        "Swift action: vanish for 1 round per oracle level, as invisibility. Usable a number of times per day equal to half your oracle level (minimum 1).",
    },
    {
      id: "misdirectionMastery",
      name: "Misdirection Mastery",
      minLevel: 3,
      summary:
        "Gain Misdirection Tactics as a bonus feat (prerequisites waived), adding Misdirection Redirection at 10th level and Misdirection Attack at 15th.",
      contextNotes: [
        note(
          "Grants specific bonus feats (Misdirection Tactics, later Redirection/Attack) — add them to doc.build.feats separately.",
          "bonusFeats",
        ),
      ],
    },
    {
      id: "pureWhimsy",
      name: "Pure Whimsy",
      minLevel: 7,
      summary:
        "Once per day, unleash a random rod-of-wonder-style effect at a target within 90 ft.; DC 10 + half your oracle level + Cha modifier, no effect lasting more than a day. One additional use per day for every 4 levels beyond 7th.",
    },
    {
      id: "versatileComedy",
      name: "Versatile Comedy",
      summary:
        "Use your total Perform (comedy) bonus in place of your Bluff and Intimidate bonuses.",
      contextNotes: [
        note(
          "Mechanic substitution only — apply manually; no Perform(comedy)-for-Bluff/Intimidate Change target exists.",
        ),
      ],
    },
    {
      id: "whimsicalPrank",
      name: "Whimsical Prank",
      summary:
        "Standard action: attempt a dirty trick combat maneuver against a creature within 30 ft., using your oracle level as CMB and Charisma in place of Strength/Dexterity. No attack of opportunity provoked and no save allowed, but the same target can't be affected again for 1 day.",
    },
    {
      id: "whimsicalStep",
      name: "Whimsical Step",
      minLevel: 7,
      summary:
        "Move action: teleport up to 10 ft. per oracle level. Usable once per day at 7th level, plus one additional use per day for every 4 levels beyond 7th.",
    },
    {
      id: "woodlandCaprice",
      name: "Woodland Caprice",
      summary:
        "Gain woodland stride, as the druid ability. At 7th level, also gain trackless step, extending concealed tracks to allies within 30 ft.",
    },
  ]),
  ...forMystery("winter", [
    {
      id: "blizzard",
      name: "Blizzard",
      minLevel: 11,
      summary:
        "Standard action: conjure a blizzard of one 10-ft. cube per oracle level (each cube adjacent to another, at least one adjacent to you), dealing 1d4 cold damage per oracle level (Reflex half) for a number of rounds equal to your Charisma modifier. Obscures sight beyond 5 ft. (total concealment; concealment within 5 ft.) and ices the ground (+5 to Acrobatics DCs). Once per day.",
    },
    {
      id: "childOfWinter",
      name: "Child of Winter",
      summary:
        "Constant endure elements against cold only. Move across snow and ice without penalty or Acrobatics checks and leave no trail there (optional). During winter months, gain a +2 insight bonus on Initiative checks and Reflex saves.",
    },
    {
      id: "coldAura",
      name: "Cold Aura",
      summary:
        "Swift action: radiate cold, dealing 1d6 damage per 2 oracle levels to everything within 10 ft. (Fortitude half) and granting yourself concealment until your next turn. Once per day, plus one additional use at 5th level and every 5 levels thereafter.",
    },
    {
      id: "freezingSpells",
      name: "Freezing Spells",
      summary:
        "A creature that fails a save and takes cold damage from one of your spells is slowed for 1 round (spells that allow no save don't slow). At 11th level, the slow lasts 1d4 rounds.",
    },
    {
      id: "iceArmor",
      name: "Ice Armor",
      summary:
        "Conjure ice armor for a +4 armor bonus, +2 more every 4 levels starting at 7th, plus DR 5/piercing from 13th level. Bonus and DR shift +2/-2 in cold/hot conditions. Usable 1 hour per day per oracle level, in 1-hour increments.",
    },
    {
      id: "iceShape",
      name: "Ice Shape",
      summary:
        "Sculpt ice and snow as stone shape, but ice/snow only. Usable 3 + Charisma modifier times per day.",
    },
    {
      id: "icySkin",
      name: "Icy Skin",
      summary:
        "Gain cold resistance 5, rising to 10 at 5th level and 20 at 11th; immune to cold at 17th.",
    },
    {
      id: "servantOfWinter",
      name: "Servant of Winter",
      minLevel: 7,
      summary:
        "Full-round action: summon an ice elemental to serve you — Medium at 7th (as summon monster IV), Huge at 11th (as summon monster VI), elder at 15th (as summon monster VIII). Once per day, plus one additional use at 15th.",
    },
    {
      id: "snowSight",
      name: "Snow Sight",
      summary:
        "See through falling snow and sleet without a Perception penalty, given enough light. At 11th level, in cold conditions or icy/snowy terrain, use commune with nature once per day (twice at 15th).",
    },
    {
      id: "wintryTouch",
      name: "Wintry Touch",
      summary:
        "Standard action: melee touch attack dealing 1d6 cold damage + 1 per 2 oracle levels. Usable 3 + Charisma modifier times per day. At 11th level, any weapon you wield counts as a frost weapon.",
    },
  ]),
  ...forMystery("wood", [
    {
      id: "bendTheGrain",
      name: "Bend the Grain",
      summary:
        "Once per day as a standard action, shape or warp wooden objects, as wood shape or warp wood. At 11th level, push wood away from you instead, as repel wood. One additional use per day at 7th level and again at 14th.",
    },
    {
      id: "lignification",
      name: "Lignification",
      minLevel: 11,
      summary:
        "Once per day as a standard action, target a creature within 30 ft.: it must save (Fortitude) or turn into a mindless wooden statue for rounds equal to half your oracle level, as flesh to stone but wood instead of stone (reversible the same way). Twice per day at 15th level.",
    },
    {
      id: "speakWithWood",
      name: "Speak with Wood",
      minLevel: 11,
      summary:
        "Spend 1 minute communing with wood to speak with it, as stone tell but for natural or worked wood. Usable for 1 minute per oracle level, spent in 1-minute increments (need not be consecutive).",
    },
    {
      id: "thornBurst",
      name: "Thorn Burst",
      summary:
        "Swift action: burst 1d6 piercing damage per 2 oracle levels (minimum 1d6) in a 10-ft. radius (Reflex half); the splinters also act as caltrops in the area until your next turn. Once per day, plus one additional use at 5th level and every 5 levels thereafter.",
    },
    {
      id: "treeForm",
      name: "Tree Form",
      minLevel: 3,
      summary:
        "Standard action: assume the form of a Large living or dead tree or shrub, as tree shape. At 9th level, a Small or Medium plant creature (plant shape I); at 11th, Large (plant shape II); at 13th, Huge (plant shape III). Once per day, lasting 1 hour per level.",
    },
    {
      id: "woodArmor",
      name: "Wood Armor",
      summary:
        "Conjure wooden armor for a +4 armor bonus, +2 more every 4 levels starting at 7th, plus DR 5/slashing from 13th level. Usable 1 hour per day per oracle level, in 1-hour increments; vanishes if removed.",
    },
    {
      id: "woodBond",
      name: "Wood Bond",
      summary:
        "Gain a +1 competence bonus on attack rolls with weapons made mostly of wood (bows, clubs, quarterstaffs, spears, and the like), increasing by +1 at 5th level and every 5 levels thereafter.",
    },
    {
      id: "woodSight",
      name: "Wood Sight",
      summary:
        "Move action: see through underbrush and plant growth that would grant concealment, out to 60 ft. At 7th level, see through wood itself as if it were glass, to a depth in feet equal to your oracle level. Usable a number of rounds per day equal to your oracle level (need not be consecutive).",
    },
    {
      id: "woodenWeapon",
      name: "Wooden Weapon",
      summary:
        "Create a wooden club, quarterstaff, longspear, shortspear, or spear sized for you, lasting 1 minute per oracle level (vanishes 1 round after leaving your grasp); you're proficient with it. Masterwork at 3rd level, +1 enhancement bonus at 7th, 15th, and 19th, keen (or the bludgeoning equivalent) at 11th. Usable 3 + Charisma modifier times per day.",
    },
    {
      id: "woodlandStride",
      name: "Woodland Stride",
      summary:
        "Move through natural undergrowth (thorns, briars, overgrown terrain) at full speed without damage or impairment; magically manipulated terrain still affects you.",
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
  solar: {
    mysteryTag: "solar",
    name: "Final Revelation",
    summary:
      "You cease aging, take no age-related ability penalties, and can't be magically aged. Spells you cast of the conjuration (teleportation) subschool or with the fire or light descriptor are automatically enlarged, without affecting their level.",
  },
  ancestor: {
    mysteryTag: "ancestor",
    name: "Final Revelation",
    summary:
      "Gain a Will save bonus equal to your Charisma modifier, blindsense out to 60 feet, and a +4 caster level bonus for divination spells. You can cast astral projection as a spell-like ability once per day without requiring material components.",
  },
  apocalypse: {
    mysteryTag: "apocalypse",
    name: "Final Revelation",
    summary:
      "Negative-level effects you cause bestow 1d4 additional negative levels. Whenever you confirm a critical hit (melee, ranged, or spell), you can curse the target as a swift action, as bestow curse, with no saving throw allowed and spell resistance ignored.",
  },
  ascetic: {
    mysteryTag: "ascetic",
    name: "Final Revelation",
    summary:
      "Become an outsider rather than your previous creature type for the purpose of spells and magical effects (you can still be returned to life as if you were still that type), and gain damage reduction 10/chaotic.",
  },
  dark_tapestry: {
    mysteryTag: "dark_tapestry",
    name: "Final Revelation",
    summary:
      "Gain damage reduction 5/- and immunity to acid, critical hits, and sneak attacks. Once per day, you can cast shapechange as a spell-like ability without requiring a material component.",
  },
  dragon: {
    mysteryTag: "dragon",
    name: "Final Revelation",
    summary:
      "Gain immunity to paralysis, sleep, and damage of your chosen energy type, and count as a dragon for the purposes of spells and magical effects. If you have the breath weapon revelation, use it an unlimited number of times per day, but no more often than once every 1d4+1 rounds.",
  },
  elemental: {
    mysteryTag: "elemental",
    name: "Final Revelation",
    summary:
      "Become a living conduit of the Elemental Planes: immune to critical hits and precision damage such as sneak attack, and no longer need to breathe, eat, or sleep.",
  },
  godclaw: {
    mysteryTag: "godclaw",
    name: "Final Revelation",
    summary:
      "Cast detect chaos, detect law, and discern lies at will as spell-like abilities at your oracle level. You no longer take armor check penalties, and your armor's maximum Dexterity bonus increases by 5. Once per day, cast crushing hand (manifesting as a massive spiked gauntlet) without a focus component, at your oracle level.",
  },
  intrigue: {
    mysteryTag: "intrigue",
    name: "Final Revelation",
    summary:
      "Apply Silent Spell or Still Spell to any spell you cast without increasing its level or casting time, without needing to know either feat.",
  },
  juju: {
    mysteryTag: "juju",
    name: "Final Revelation",
    summary:
      "Gain an insight bonus equal to your Charisma modifier to AC, all saving throws, and Knowledge checks. Once per day, cast extended dominate monster as a spell-like ability, affecting up to double your Charisma modifier in creatures.",
  },
  lunar: {
    mysteryTag: "lunar",
    name: "Final Revelation",
    summary:
      "Once per day, become a lycanthrope of your choice for a number of hours equal to your Charisma modifier, gaining all its powers including shifting between human, animal, and hybrid form. Gain immunity to mind-affecting and language-dependent effects, and to effects that target only humanoids.",
  },
  metal: {
    mysteryTag: "metal",
    name: "Final Revelation",
    summary:
      "Gain Weapon Focus, Greater Weapon Focus, and Improved Critical with one metal weapon you're proficient with. While wearing metal armor you're proficient with, its maximum Dexterity bonus increases by 5 and it imposes no armor check penalty. Metal you create with your magic (such as wall of iron) gains +10 hardness.",
  },
  occult: {
    mysteryTag: "occult",
    name: "Final Revelation",
    summary:
      "Gain immunity to death effects, exhaustion, fatigue, nausea, negative levels, and the sickened condition. Cast astral projection and true seeing once per day each as spell-like abilities with no material component. Should you die, you rise again as a ghost in 2d4 days.",
  },
  outer_rifts: {
    mysteryTag: "outer_rifts",
    name: "Final Revelation",
    summary:
      "Use gate as a spell-like ability once per day. Calling a creature this way still requires 10,000 gp in offerings to secure its aid.",
  },
  reaper: {
    mysteryTag: "reaper",
    name: "Final Revelation",
    summary:
      "Automatically confirm critical hits, and creatures automatically fail Fortitude saves against your coup de grace attempts. Also notice, locate, and distinguish between living and undead creatures within 60 feet as if by blindsense (creatures only, not objects).",
  },
  shadow: {
    mysteryTag: "shadow",
    name: "Final Revelation",
    summary:
      "Your body becomes permanently suffused with the Shadow Plane's essence: gain regeneration 5 while in dim light or darkness (suppressed in brighter illumination) and immunity to cold, critical hits, and sneak attacks. Spells you cast of the shadow subschool or with the darkness descriptor are automatically enlarged without increasing their spell level.",
  },
  spellscar: {
    mysteryTag: "spellscar",
    name: "Final Revelation",
    summary:
      "Become a master of primal magic: whenever you cast a spell, you may also trigger a primal magic event alongside it (usable once per minute) — the spell still takes effect normally in addition to the event.",
  },
  streets: {
    mysteryTag: "streets",
    name: "Final Revelation",
    summary:
      "Speak a creature's name and a city's name aloud to know whether that creature is currently in that city. At will, learn about any settlement you're in, as commune with nature but limited to towns and settlements.",
  },
  succor: {
    mysteryTag: "succor",
    name: "Final Revelation",
    summary:
      "Apply Enlarge Spell, Extend Spell, Silent Spell, or Still Spell to any spell you cast that targets an ally, without increasing its level or casting time and without needing the feats — any number of times per day.",
  },
  time: {
    mysteryTag: "time",
    name: "Final Revelation",
    summary:
      "Stop aging: immune to magical aging and to further ability-score aging penalties (age bonuses still accrue, and any penalties already accrued remain). You can't die of old age, though you can still be killed. Cast time stop once per day as a spell-like ability.",
  },
  volcano: {
    mysteryTag: "volcano",
    name: "Final Revelation",
    summary:
      "Gain the fire and earth subtypes (and vulnerability to cold); your fire damage ignores the first 10 points of a target's fire resistance (not immunity). Gain a +4 natural armor bonus; your natural weapons, unarmed strikes, and metal-hafted weapons deal +1d6 fire damage, and a creature that strikes you with a natural weapon or unarmed strike, or succeeds at a grapple against you, takes 1d6 fire damage (stacking with other fire sources). Suppress or reestablish this heat as a standard action.",
  },
  whimsy: {
    mysteryTag: "whimsy",
    name: "Final Revelation",
    summary:
      "Become a fey trickster in truth: your creature type changes to fey, and you gain low-light vision, immunity to poison, and DR 10/cold iron.",
  },
  winter: {
    mysteryTag: "winter",
    name: "Final Revelation",
    summary:
      "Permanently become a living avatar of ice, as the ice body spell. Your attacks that deal cold damage bypass cold immunity or resistance.",
  },
  wood: {
    mysteryTag: "wood",
    name: "Final Revelation",
    summary:
      "Become a creature of wood: treated as a plant rather than your original type, with a +4 natural armor bonus, DR 10/- against wooden weapons and wood-creature natural attacks, and immunity to paralysis, poison, polymorph, sleep, and stunning. At will, meld into any tree or block of wood indefinitely, as meld into stone.",
  },
};
