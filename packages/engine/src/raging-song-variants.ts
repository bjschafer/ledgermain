/**
 * Skald archetype raging-song variant defs — the skald counterpart of
 * `bardic-performance-variants/` (see that directory's `types.ts` for the def
 * shape and merge semantics). `removesTags` reference the base tag list in
 * `raging-song.ts`'s `BASE_RAGING_SONGS`; variant option ids come out as
 * `ragingSong:<archetype-slug>:<tag>`. Hand-authored from the published rules
 * and verified against the vendored archetype-feature text
 * (`archetype-features.json`), same clean-room posture as `raging-song.ts`.
 * Only archetypes whose raging song swaps in a genuinely different
 * performance for one of the five base slots (or adds a wholly new one) get
 * an entry here — every skald archetype restates the whole Raging Song
 * ability as its own feature row (a vendoring artifact, see
 * `archetype-extracted/skald.ts`'s file header), but a restatement with no
 * sub-song swap carries nothing to model.
 *
 * Posture, mirroring `raging-song.ts`: a variant Inspired-Rage-style bonus
 * that applies to the skald's own sheet (allies including self, same as base
 * Inspired Rage) gets a real `Change` scaling on `@classes.skald.level`;
 * enemy-facing, ally-equipment-facing, or no-numeric-target songs get
 * `changes: []` plus a context note carrying the real numbers in words. A few
 * archetypes' vendored text omits an explicit "replaces X" sentence for a
 * later-level slot but simply never restates that base song either — for
 * those, `removesTags` records the omission as an inferred replacement (only
 * one performance exists for the slot's level; flagged per entry below).
 */

import type { ArchetypePerformanceVariant } from "./bardic-performance-variants/types.js";

export const RAGING_SONG_VARIANTS: ArchetypePerformanceVariant[] = [
  {
    // Bacchanal's raging song text (archetype-features.json) never restates
    // Dirge of Doom — Maddening Dance fills the 10th-level slot instead, with
    // no explicit "replaces dirge of doom" sentence, but no other 10th-level
    // song exists for this archetype either. Song of Strength (6th) and Song
    // of the Fallen (14th) are unmodified restatements, so they aren't
    // touched here.
    archetypeId: "skald:bacchanal",
    removesTags: ["songOfMarching", "dirgeOfDoom"],
    performances: [
      {
        tag: "songOfUrging",
        name: "Song of Urging",
        summary: "Wordlessly influence an animal's attitude instead of hustling allies.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Song of Marching. Functions like a Diplomacy check (or an Intimidate check) to influence an animal's attitude: roll 1d20 plus your skald level plus your Charisma modifier. Wild empathy bonuses and penalties apply. Can also affect plants or magical beasts with Intelligence 1 or 2, or drunk creatures of any Intelligence, at a -4 penalty. Costs only 1 round of raging song regardless of how long the check takes. Not a number this tracker adds anywhere.",
          },
        ],
      },
      {
        tag: "maddeningDance",
        name: "Maddening Dance",
        summary: "Compel a nearby enemy to dance, confused, instead of instilling dread.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Takes Dirge of Doom's 10th-level slot in the vendored text (no explicit replaces clause, but Dirge of Doom is never restated for this archetype). Compels a creature within 30 feet to dance: unless it succeeds at a Will save it becomes confused, takes a -2 penalty to AC and Reflex saves, and loses any shield's benefit, for as long as it can hear you from within 30 feet. A creature that saves is immune for 24 hours. Compulsion, emotion, enchantment, mind-affecting. Enemy-facing, so there's no number to add to your own sheet.",
          },
        ],
      },
    ],
  },
  {
    // Song of Questing occupies both the 10th-level (Dirge of Doom) and
    // 14th-level (Song of the Fallen) slots as one ability that scales up at
    // 14th; neither base song is restated anywhere in the vendored text.
    archetypeId: "skald:battle-scion",
    removesTags: ["dirgeOfDoom", "songOfTheFallen"],
    performances: [
      {
        tag: "songOfQuesting",
        name: "Song of Questing",
        summary: "Bind a willing target to a noble quest instead of dread or resurrection.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces both Dirge of Doom and Song of the Fallen. Spend 4 rounds of raging song to bind a truly willing target to a task (as geas/quest, but only on a willing target who understands the full terms). At 14th level, you can offer the same quest to up to one willing creature per skald level; the effect ends for everyone as soon as anyone completes it. Failing to honor an offered reward costs you the archetype's benefits permanently. Not a number this tracker adds anywhere.",
          },
        ],
      },
    ],
  },
  {
    // Song of Endurance (3rd) and Song of Surmounting (7th) are additions
    // alongside the unmodified Song of Marching/Song of Strength/Dirge of
    // Doom, so neither removes a base tag. Frightful Boast fills the
    // 14th-level slot with no explicit "replaces" clause, but Song of the
    // Fallen is never restated for this archetype either.
    archetypeId: "skald:boaster",
    removesTags: ["songOfTheFallen"],
    performances: [
      {
        tag: "songOfEndurance",
        name: "Song of Endurance",
        summary: "Song of Marching, plus the Endurance feat's benefits and any matching feats.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Functions as Song of Marching (allies within 60 feet may hustle for the next hour without the usual fatigue/nonlethal cost), plus grants the benefits of the Endurance feat and of any of Deathless Initiate, Deathless Master, Deathless Zealot, Diehard, Fast Healer, Heroic Defiance, and Heroic Recovery you already have, even without meeting their prerequisites. Not a number this tracker adds anywhere.",
          },
        ],
      },
      {
        tag: "songOfSurmounting",
        name: "Song of Surmounting",
        summary: "Terrain-dependent climb speed, swim speed, or +10 ft. land speed.",
        minLevel: 7,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Grants allies within 90 feet, for 1 hour, one benefit depending on the surrounding terrain (these don't stack): a climb speed equal to half base speed (forest, jungle, mountain, underground), a swim speed equal to base speed (swamp, water), or a +10 foot enhancement bonus to base speed (cold, desert, hill, plains, urban). Doubles at 13th level, triples at 19th. Which terrain applies isn't a state this tracker knows, so there's no number to add automatically.",
          },
        ],
      },
      {
        tag: "frightfulBoast",
        name: "Frightful Boast",
        summary: "Frighten nearby enemies instead of reviving the fallen.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Takes Song of the Fallen's 14th-level slot in the vendored text (no explicit replaces clause, but Song of the Fallen is never restated for this archetype). Functions as the bard's Frightening Tune performance: enemies within 30 feet who can hear you must succeed at a Will save (DC 10 + half your skald level + your Charisma modifier) or become frightened for as long as they can hear you perform. Enemy-facing, so there's no number to add to your own sheet.",
          },
        ],
      },
    ],
  },
  {
    // Insightful Contemplation replaces Inspired Rage with an Int/Cha
    // version; Song of Inspiration replaces Song of Strength with a Wisdom
    // version. Dirge of Doom and Song of the Fallen are unmodified
    // restatements.
    archetypeId: "skald:court-poet",
    removesTags: ["inspiredRage", "songOfStrength"],
    performances: [
      {
        tag: "insightfulContemplation",
        name: "Insightful Contemplation",
        summary: "Inspired Rage's numbers, but on Intelligence and Charisma instead of Str/Con.",
        minLevel: 1,
        changes: [
          { formula: "2 + 2 * floor(@classes.skald.level / 8)", target: "int", type: "morale" },
          { formula: "2 + 2 * floor(@classes.skald.level / 8)", target: "cha", type: "morale" },
          { formula: "1 + floor(@classes.skald.level / 4)", target: "will", type: "morale" },
          { formula: "-1", target: "ac", type: "untyped" },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "RAW this buffs your ALLIES (Int/Cha up, AC down), not you, same simplification as base Inspired Rage: this tracker applies it to your own sheet only. While affected, allies other than you can't use Strength-based skills or make any physical effort requiring a Constitution check; not enforced.",
          },
        ],
      },
      {
        tag: "songOfInspiration",
        name: "Song of Inspiration",
        summary: "Once per round, add half your skald level to a Wisdom-based check.",
        minLevel: 6,
        changes: [
          {
            formula: "max(1, floor(@classes.skald.level / 2))",
            target: "skill.per",
            type: "untyped",
          },
          {
            formula: "max(1, floor(@classes.skald.level / 2))",
            target: "skill.hea",
            type: "untyped",
          },
          {
            formula: "max(1, floor(@classes.skald.level / 2))",
            target: "skill.sen",
            type: "untyped",
          },
          {
            formula: "max(1, floor(@classes.skald.level / 2))",
            target: "skill.sur",
            type: "untyped",
          },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "RAW this buffs ALLIES within 60 feet who can hear you, not you alone; applied to your own sheet only, same simplification as base Song of Strength. Once each round you and affected allies add half your skald level to a Wisdom check or a Wisdom-based skill check. The Wisdom-based-skill half is applied above to Perception, Heal, Sense Motive, and Survival; the bare Wisdom ability check half has no Change target in this engine, track it manually.",
          },
        ],
      },
    ],
  },
  {
    // Glorious Epic replaces Song of Marching; Song of Strength, Dirge of
    // Doom, and Song of the Fallen are unmodified restatements.
    archetypeId: "skald:dragon-skald",
    removesTags: ["songOfMarching"],
    performances: [
      {
        tag: "gloriousEpic",
        name: "Glorious Epic",
        summary: "Grant a chosen subject a Diplomacy/Intimidate bonus instead of a hustle.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Song of Marching. Perform for 10 minutes, expending 1 round of raging song, to extol a heroic subject of your choice; anyone who listened to the full performance grants that subject a circumstance bonus on Diplomacy or Intimidate checks made against them, equal to your Inspired Rage's current Will save bonus. Not a number this tracker adds to your own sheet.",
          },
        ],
      },
    ],
  },
  {
    // Song of Rabble-Rousing (5th) is an addition alongside the unmodified
    // Song of Marching/Song of Strength/Song of the Fallen. Song of Riot
    // fills the 10th-level slot with no explicit replaces clause, but Dirge
    // of Doom is never restated for this archetype.
    archetypeId: "skald:instigator",
    removesTags: ["dirgeOfDoom"],
    performances: [
      {
        tag: "songOfRabbleRousing",
        name: "Song of Rabble-Rousing",
        summary: "Enthrall listeners for up to an hour.",
        minLevel: 5,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Perform for a full round and spend 4 rounds of raging song to affect everyone who hears you, for up to 1 hour, as the enthrall spell-like ability. Enemy/crowd-facing, so there's no number to add to your own sheet.",
          },
        ],
      },
      {
        tag: "songOfRiot",
        name: "Song of Riot",
        summary: "Turn already-enthralled listeners' hatred into a frenzy instead of dread.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Takes Dirge of Doom's 10th-level slot in the vendored text (no explicit replaces clause, but Dirge of Doom is never restated for this archetype). As a standard action costing 4 more rounds of raging song, targets fewer than 4 HD and Wisdom under 16 who are already enthralled by Song of Rabble-Rousing get a new save against an effect like the foster hatred spell; those who fail (or forgo the save) gain your raging song's benefits whenever they attack the target of their hatred, without gaining your rage powers. Enemy-facing, so there's no number to add to your own sheet.",
          },
        ],
      },
    ],
  },
  {
    // Enhance Weapons replaces Inspired Rage; Song of Arcane Manipulation
    // replaces Dirge of Doom. Song of Marching and Song of the Fallen are
    // unmodified restatements.
    archetypeId: "skald:spell-warrior",
    removesTags: ["inspiredRage", "dirgeOfDoom"],
    performances: [
      {
        tag: "enhanceWeapons",
        name: "Enhance Weapons",
        summary: "Grant allies' weapons a scaling enhancement bonus instead of raging them.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Inspired Rage. Grants a +1 enhancement bonus (increasing by 1 every 5 levels) to the weapons and ammunition of allies within 60 feet, spread across up to four weapons per the usual enhancement-bonus-equivalent rules, and usable to add weapon special abilities instead of raw bonus. A wielder of an enhanced weapon counts as under Inspired Rage for the purpose of your rage powers. Ally-equipment-facing, so there's no number to add to your own sheet.",
          },
        ],
      },
      {
        tag: "songOfArcaneManipulation",
        name: "Song of Arcane Manipulation",
        summary: "Counterspell as an immediate action by spending raging song, instead of dread.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Dirge of Doom. While using raging song, counterspell as an immediate action without interrupting the song: costs the normal spell slot(s) plus 1 round of raging song per spell level of the opponent's spell. Not a number this tracker adds anywhere.",
          },
        ],
      },
    ],
  },
  {
    // Inspired Devotion replaces Inspired Rage; Song of Understanding
    // replaces Song of Strength; Song of Secrecy replaces Dirge of Doom.
    // Song of Marching and Song of the Fallen are unmodified restatements.
    archetypeId: "skald:twilight-speaker",
    removesTags: ["inspiredRage", "songOfStrength", "dirgeOfDoom"],
    performances: [
      {
        tag: "inspiredDevotion",
        name: "Inspired Devotion",
        summary: "A competence attack bonus and a morale save bonus instead of Str/Con/Will/AC.",
        minLevel: 1,
        changes: [
          { formula: "1 + floor(@classes.skald.level / 6)", target: "attack", type: "competence" },
          {
            formula: "1 + floor(@classes.skald.level / 6)",
            target: "allSavingThrows",
            type: "morale",
          },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "RAW this buffs your ALLIES, not you, same simplification as base Inspired Rage: this tracker applies it to your own sheet only. +1 competence bonus on attack rolls and +1 morale bonus on all saving throws at 1st, increasing by 1 at 6th, 12th, and 18th. No AC penalty, unlike Inspired Rage.",
          },
        ],
      },
      {
        tag: "songOfUnderstanding",
        name: "Song of Understanding",
        summary: "Grant a tongues aura instead of allies' Strength-check bonus.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Song of Strength. Spend 4 rounds of raging song to create a 60-foot aura (centered on you, caster level equal to your skald level) granting the effects of tongues to you and everyone in it; dismissable as a standard action. Not a number this tracker adds anywhere.",
          },
        ],
      },
      {
        tag: "songOfSecrecy",
        name: "Song of Secrecy",
        summary: "A Stealth bonus, usable without cover or concealment, instead of dread.",
        minLevel: 10,
        changes: [
          {
            formula: "floor(@classes.skald.level / 2)",
            target: "skill.ste",
            type: "untyped",
          },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Dirge of Doom. RAW this buffs ALLIES, not you alone; applied to your own sheet only. Affected allies also get to attempt Stealth checks without cover or concealment, a permission this tracker doesn't model as a number. Audible only to those affected.",
          },
        ],
      },
    ],
  },
  {
    // Inspire Resilience replaces Inspired Rage; Song of Defiance replaces
    // Song of Strength; Dirge of Determination replaces Dirge of Doom. Song
    // of Marching and Song of the Fallen are unmodified restatements. Verified
    // against d20pfsrd's Undying Word page 2026-08-16: the vendored text (and
    // AoN) only states Strength and the AC penalty are dropped, so the
    // Constitution and Will bonuses carry over unchanged from Inspired Rage.
    archetypeId: "skald:undying-word",
    removesTags: ["inspiredRage", "songOfStrength", "dirgeOfDoom"],
    performances: [
      {
        tag: "inspireResilience",
        name: "Inspire Resilience",
        summary: "Inspired Rage's Con/Will bonuses, without the Strength bonus or AC penalty.",
        minLevel: 1,
        changes: [
          { formula: "2 + 2 * floor(@classes.skald.level / 8)", target: "con", type: "morale" },
          { formula: "1 + floor(@classes.skald.level / 4)", target: "will", type: "morale" },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "RAW this buffs your ALLIES, not you, same simplification as base Inspired Rage: this tracker applies it to your own sheet only. Functions as Inspired Rage but grants neither the Strength bonus nor the AC penalty; the Constitution and Will bonuses and their scaling are unchanged from Inspired Rage.",
          },
        ],
      },
      {
        tag: "songOfDefiance",
        name: "Song of Defiance",
        summary: "Grant endure elements instead of allies' Strength-check bonus.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Song of Strength. Spend 1 round of raging song to grant all allies within 60 feet the effects of endure elements for the next hour; you must keep performing for the hour or the effect ends early (only 1 round is spent either way). Not a number this tracker adds anywhere.",
          },
        ],
      },
      {
        tag: "dirgeOfDetermination",
        name: "Dirge of Determination",
        summary: "Blunt allies' ability damage and drain instead of shaking enemies.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Replaces Dirge of Doom. Allies within 30 feet treat ability damage, ability drain, and penalties to ability scores as 2 lower (4 lower at 15th level, 6 lower at 20th), never below 0 or above the original score. No target for ability-damage reduction exists in this engine, so there's no number to add anywhere.",
          },
        ],
      },
    ],
  },
  {
    // Draconic Rage replaces Inspired Rage with a melee attack/damage and
    // paralysis/sleep-save version. Song of Marching, Song of Strength, Dirge
    // of Doom, and Song of the Fallen are unaffected (Draconic Rage is the
    // archetype's only raging-song feature).
    archetypeId: "skald:wyrm-singer",
    removesTags: ["inspiredRage"],
    performances: [
      {
        tag: "draconicRage",
        name: "Draconic Rage",
        summary: "Melee attack/damage and paralysis/sleep saves instead of Str/Con/Will.",
        minLevel: 1,
        changes: [
          { formula: "2 + floor(@classes.skald.level / 8)", target: "mattack", type: "morale" },
          { formula: "2 + floor(@classes.skald.level / 8)", target: "mwdamage", type: "morale" },
          {
            formula: "2 + floor(@classes.skald.level / 4)",
            target: "allSavingThrows",
            type: "morale",
            saveCategories: ["paralysis", "sleep"],
          },
          { formula: "-1", target: "ac", type: "untyped" },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "RAW this buffs your ALLIES, not you, same simplification as base Inspired Rage: this tracker applies it to your own sheet only. +2 morale bonus on melee attack and damage rolls and +2 morale bonus on saves against paralysis and sleep effects at 1st, plus -1 AC. The paralysis/sleep save bonus increases by 1 at 4th and every 4 levels thereafter; the melee attack/damage bonus increases by 1 at 8th and 16th.",
          },
        ],
      },
    ],
  },
];
