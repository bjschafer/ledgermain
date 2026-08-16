/**
 * Bard archetype performance-variant defs, shard D — see `types.ts` for the
 * def shape and `index.ts` for the merge. Shard ownership is alphabetical by
 * archetype slug; each entry is hand-authored from the published rules and
 * verified against the vendored archetype-feature text (aonprd.com where the
 * vendored prose is ambiguous), same clean-room posture as
 * `bardic-performances.ts`.
 *
 * Two archetypes assigned to this shard carry no entry here, on purpose:
 *   - Ringleader's own "Inspire Competence" feature explicitly "acts as the
 *     inspire competence bardic performance with the following additions" —
 *     it enhances the base tag in place rather than replacing it, so the base
 *     toggle stays exactly as-is and there's nothing to add or remove. Its
 *     other features (Cunning Plan, Inspired Plan, Countless Contingencies)
 *     only bank, redirect, or extend an already-chosen performance — action
 *     economy, not a new or replaced performance type.
 *   - Sorrowsoul's Lyric Sorrow lets the sorrowsoul double a performance's
 *     round cost for a stronger, self-only version of Inspire Courage,
 *     Inspire Greatness, or Inspire Heroics — but it never carries its own
 *     "replaces X" clause, so it doesn't vacate a tag, and the variant shape
 *     here only supports swapping a whole performance slot for another, not
 *     scaling an existing slot's numbers in place. No mechanism to hang this
 *     on without inventing one.
 */

import type { ArchetypePerformanceVariant } from "./types.js";
import { MAINTAIN_NOTE } from "./types.js";

export const SHARD_D_VARIANTS: ArchetypePerformanceVariant[] = [
  {
    archetypeId: "bard:sandman",
    removesInspireCourage: true,
    removesTags: [
      "inspireCompetence",
      "suggestion",
      "inspireGreatness",
      "inspireHeroics",
      "massSuggestion",
      "deadlyPerformance",
    ],
    performances: [
      {
        tag: "stealspell",
        name: "Stealspell",
        summary:
          "Steals a foe's prepared spell or spell known with a touch attack, casting it from your own slots for as long as the performance lasts.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a standard action, make a touch attack against a creature within reach. It resists with a Will save (DC 10 plus half your bard level plus your Cha bonus) or you steal a spell it has prepared or known, replacing it with your own spell of that level while the performance continues. Requires visual components. Stealing a new spell reverts any spell already stolen.",
          },
        ],
      },
      {
        tag: "slumberSong",
        name: "Slumber Song",
        summary:
          "Puts a creature you've already fascinated into a no-Hit-Dice-limit deep slumber; enemy-facing.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as Suggestion, but the fascinated creature falls into a deep slumber (as the spell, with no Hit Dice limit) instead of following a suggestion. A Will save (DC 10 plus half your bard level plus your Cha modifier) negates.",
          },
        ],
      },
      {
        tag: "dramaticSubtext",
        name: "Dramatic Subtext",
        summary:
          "Casts spells during a performance with no visible or audible components, opposed by an observer's Perception against your Sleight of Hand.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "You must perform for at least 2 rounds before casting a spell this way, or you're automatically detected as the source and the performance ends. Casting still provokes attacks of opportunity as normal.",
          },
        ],
      },
      {
        tag: "greaterStealspell",
        name: "Greater Stealspell",
        summary:
          "Learns everything a fascinated target could lose to Stealspell, or drains and gains its spell resistance instead of stealing a spell.",
        minLevel: 15,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "When a target fails its save against your Stealspell performance, you learn its spell resistance (if any) and every spell it has prepared or known, and choose which to steal. You may instead forgo stealing a spell to reduce its spell resistance by half your bard level and gain that much spell resistance yourself for as long as you keep performing; stacks with spell resistance stolen this way from other targets, and reverts the moment you steal a spell or stop performing.",
          },
        ],
      },
      {
        tag: "massSlumberSong",
        name: "Mass Slumber Song",
        summary: "Slumber Song extended to any number of already-fascinated creatures at once.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as Slumber Song, but affects any number of creatures you've already fascinated within 30 feet simultaneously, as Mass Suggestion.",
          },
        ],
      },
      {
        tag: "spellCatching",
        name: "Spell Catching",
        summary:
          "After saving against a single-target spell, absorb it and immediately recast it, spending performance rounds equal to its level.",
        minLevel: 20,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "When you save against a spell or spell-like ability that targets only you, you may spend an immediate action and attempt a caster level check (DC 10 plus the spell's original caster level). Success lets you absorb the spell and immediately recast it (using the original caster's level and DC) or any spell you know of that level or lower. Costs a number of performance rounds equal to the spell's level, whether or not the check succeeds.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:savage-skald",
    removesTags: ["fascinate", "suggestion", "soothingPerformance", "massSuggestion"],
    performances: [
      {
        tag: "inspiringBlow",
        name: "Inspiring Blow",
        summary:
          "Confirming a critical hit grants yourself temporary hit points equal to your Charisma modifier and rallies nearby allies.",
        minLevel: 1,
        changes: [{ formula: "max(0, @abilities.cha.mod)", target: "tempHp", type: "untyped" }],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Starting this performance is an immediate action that ends any other performance you're maintaining. The temporary hit points last until you end the performance. Allies within 30 feet also gain a +1 morale bonus on their next attack roll before the start of your next turn; that ally-facing bonus isn't modeled on your own sheet.",
          },
        ],
      },
      {
        tag: "inciteRage",
        name: "Incite Rage",
        summary: "Forces one creature into a rage-spell-like fury; enemy-facing.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Affects one creature within 30 feet as the rage spell for as long as it can hear you. You can't target yourself. An unwilling target resists with a Will save (DC 10 plus half your bard level plus your Cha modifier); success grants immunity to this power for 24 hours. A target with the rage class feature can rage this way without spending its own daily rounds while you keep performing.",
          },
        ],
      },
      {
        tag: "songOfTheFallen",
        name: "Song of the Fallen",
        summary:
          "Ten continuous rounds of performance summons spectral warriors, as a horn of Valhalla.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Requires 10 continuous rounds of performance before the warriors appear; they remain only as long as you keep performing. Summons as a silver horn at 10th level, a brass horn at 13th, a bronze horn at 16th, and an iron horn at 19th. Requires audible components.",
          },
        ],
      },
      {
        tag: "berserkergang",
        name: "Berserkergang",
        summary:
          "Suppresses pain, stunning, and fear for one creature (plus more at higher levels) and grants damage reduction.",
        minLevel: 12,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Affects one creature, plus one additional creature for every three levels beyond 12th, suppressing pain, stunning, and fear effects and granting DR 5/- (DR 10/- against nonlethal damage) while you perform; stacks with a barbarian's own damage reduction. Mind-affecting, requires audible components. The rules text doesn't say whether you can target yourself, so this stays a note rather than a bonus on your own sheet.",
          },
        ],
      },
      {
        tag: "battleSong",
        name: "Battle Song",
        summary: "Incite Rage extended to affect every ally within 30 feet at once.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as Incite Rage, but affects every ally within 30 feet simultaneously instead of a single creature.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:sea-singer",
    removesTags: ["countersong", "inspireCompetence", "suggestion", "massSuggestion"],
    performances: [
      {
        tag: "seaShanty",
        name: "Sea Shanty",
        summary:
          "Perform check against exhaustion, fatigue, nausea, or sickness, usable in place of a saving throw, for yourself and allies.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round, make a Perform check. Any creature within 30 feet, including you, may use that Perform result in place of its saving throw against becoming exhausted, fatigued, nauseated, or sickened, with a fresh save each round the effect persists. Has no effect on instantaneous effects or effects that don't allow saves.",
          },
        ],
      },
      {
        tag: "stillWater",
        name: "Still Water",
        summary:
          "Calms rough water within 30 feet, lowering the DC of sailing, swimming, and shipboard checks.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Reduces the DC of Profession (sailor) and Swim checks, and of Acrobatics and Climb checks made aboard ship, by an amount equal to your bard level (minimum DC 10) for as long as you perform. Playing for 10 consecutive rounds extends the effect to 1 hour.",
          },
        ],
      },
      {
        tag: "whistleTheWind",
        name: "Whistle the Wind",
        summary: "Creates a gust of wind that lasts as long as you perform.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Duplicates a gust of wind effect for as long as you keep performing; playing for 5 consecutive rounds extends the duration to 1 minute.",
          },
        ],
      },
      {
        tag: "callTheStorm",
        name: "Call the Storm",
        summary:
          "Duplicates control water, control weather, control winds, or storm of vengeance, at your bard level as caster level.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Requires 1 round of continuous performance per level of the spell duplicated. Effects last as long as you keep performing, up to the spell's normal duration; control weather's effects happen immediately once the performance completes.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:shadow-puppeteer",
    removesInspireCourage: true,
    removesTags: ["inspireCompetence"],
    performances: [
      {
        tag: "shadowPuppets",
        name: "Shadow Puppets",
        summary:
          "Creates a quasi-real shadowy creature that scales with level, as shadow conjuration.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as shadow conjuration: the creature resembles one from the summon monster I list, acting like the next higher version of summon monster at 4th level and every three levels thereafter. Anyone who interacts with it may attempt a Will save (DC 10 plus half your bard level plus your Cha bonus) to treat it as only 20% real. Requires the ability to perform shadow puppetry (Perform (act) and a light source).",
          },
        ],
      },
      {
        tag: "shadowServant",
        name: "Shadow Servant",
        summary:
          "Creates a formless shadow that performs simple tasks, identical to unseen servant at your bard level as caster level.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions exactly as unseen servant, caster level equal to your bard level. Relies on visual components.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:silver-balladeer",
    removesTags: ["suggestion", "inspireGreatness", "massSuggestion"],
    performances: [
      {
        tag: "breakCurse",
        name: "Break Curse",
        summary:
          "Suppresses, then can remove, a single curse on an ally within 30 feet; requires a silver or silver-stringed instrument.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round, attempt a Perform check against the curse's original DC; success suppresses it for 1 round. After 4 consecutive successful rounds, attempt a caster level check to remove the curse as remove curse.",
          },
        ],
      },
      {
        tag: "holyVibration",
        name: "Holy Vibration",
        summary:
          "Wards a door or window within 30 feet against undead and evil creatures, as arcane lock; requires a silver or silver-stringed instrument.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Undead and evil-subtype creatures can't open the warded door or window for 10 minutes per bard level. Incorporeal creatures of that kind also can't move through it, or through walls, floors, or ceilings within 20 feet of it, without a Charisma check against the warded object's break DC.",
          },
        ],
      },
      {
        tag: "massBreakCurse",
        name: "Mass Break Curse",
        summary: "Break Curse extended to suppress curses on any number of allies within 30 feet.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as Break Curse, but suppresses every affected ally's curse within 30 feet at once. Every 4 consecutive rounds, you can attempt a caster level check to remove one ally's curse.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:solacer",
    removesTags: ["countersong"],
    performances: [
      {
        tag: "inspireTenacity",
        name: "Inspire Tenacity",
        summary:
          "Automatically stabilizes dying allies within 30 feet and grants a morale bonus against mind-affecting effects, poison, and disease.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Every dying ally within 30 feet who can hear you automatically stabilizes. Allies within range also gain a +2 morale bonus on saving throws against mind-affecting effects, poisons, and disease. Requires audible components.",
          },
        ],
      },
      {
        tag: "invigoratingArtistry",
        name: "Invigorating Artistry",
        summary:
          "An hour-long performance grants listeners 24 hours of bonus saves against curses, possession, and mind control.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Requires a full hour of performance (no skill check needed) to grant creatures that can hear or see you a +3 bonus for 24 hours on saves against curses, possession effects, and domination or mind-control effects, plus one immediate extra save against any such effect already afflicting them. The bonus rises to +4 at 16th level and +5 at 19th.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:songhealer",
    removesTags: ["frighteningTune"],
    performances: [
      {
        tag: "healingPerformance",
        name: "Healing Performance",
        summary:
          "Five rounds of continuous performance duplicates heal on a living target, or harm on an undead target, at your bard level as caster level.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Requires 5 rounds of continuous performance while the target can see and hear you throughout. Relies on audible and visual components.",
          },
        ],
      },
    ],
  },
];
