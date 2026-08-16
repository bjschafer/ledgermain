/**
 * Bard archetype performance-variant defs, shard E — see `types.ts` for the
 * def shape and `index.ts` for the merge. Shard ownership is alphabetical by
 * archetype slug; each entry is hand-authored from the published rules and
 * verified against the vendored archetype-feature text (aonprd.com/d20pfsrd
 * where the vendored prose is ambiguous, truncated, or missing its "this
 * replaces..." clause entirely), same clean-room posture as
 * `bardic-performances.ts`.
 *
 * Cross-archetype modelling note: several features here read as "as part of
 * another bardic performance" or "when he begins a bardic performance"
 * (Stonesinger's Tremor and Quake) rather than spending their own round as a
 * standalone action — those are riders bundled onto whatever performance is
 * already running, not a separate selectable toggle, so they get no
 * `BardicPerformanceDef` of their own even though the base performance type
 * they replace is recorded in `removesTags`. Likewise, several "this
 * replaces X" swaps grant a bonus feat, skill mechanic, or spellcasting
 * option that never spends a round of bardic performance at all (Speaker of
 * the Palatine Eye's Corpse Speaker, every Studious Librarian swap, Street
 * Performer's Gladhanding, Voice of the Wild's Nature Magic) — those also
 * get no def, only the `removesTags` entry.
 *
 * None of this shard's archetypes have a legitimate self-facing target (no
 * "himself or a single ally" wording anywhere in this batch), so every
 * authored def below is note-tier with `changes: []`.
 */

import type { ArchetypePerformanceVariant } from "./types.js";
import { MAINTAIN_NOTE } from "./types.js";

export const SHARD_E_VARIANTS: ArchetypePerformanceVariant[] = [
  {
    // Both new performance types spend their own round as a standalone
    // action (verified against aonprd.com), so both get real defs.
    archetypeId: "bard:sound-striker",
    removesTags: ["inspireCompetence", "suggestion"],
    performances: [
      {
        tag: "wordstrike",
        name: "Wordstrike",
        summary: "Directs a burst of sonically charged words at a creature or object.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Spend 1 round of bardic performance as a standard action to strike a creature or object within reach with sonically charged words: 1d4 plus your bard level damage to an object, half that to a living creature. Not modeled as a Change: the damage includes a die roll.",
          },
        ],
      },
      {
        tag: "weirdWords",
        name: "Weird Words",
        summary: "Speaks sonic-charged words as ranged touch attacks dealing heavy sonic damage.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Starting the performance is always a standard action: speak up to one word per 4 bard levels, each a ranged touch attack (30 feet) dealing 4d6 sonic damage plus your Charisma modifier. Multiple words striking the same target combine into a single attack. Each word costs 1 round of bardic performance. Not modeled as a Change: the damage includes a die roll.",
          },
        ],
      },
    ],
  },
  {
    // Corpse Speaker replaces countersong (confirmed via d20pfsrd; the
    // vendored description text is missing its "replaces countersong"
    // clause) but is its own independent Su ability with no bardic
    // performance round cost, so it gets no def. Angelic Grace (class-skill
    // swap) and Keen Ritualist (replaces jack-of-all-trades, which isn't a
    // pool toggle either) touch nothing in the toggle table at all.
    archetypeId: "bard:speaker-of-the-palatine-eye",
    removesTags: ["countersong"],
    performances: [],
  },
  {
    // Stone Song modifies the Bardic Performance mechanism itself
    // (subsonic/tremorsense-perceived rather than audible) for every
    // performance the stonesinger has, not one specific type, so it gets no
    // def (see file doc comment on pool-redefining archetypes). Tremor and
    // Quake are each riders bundled onto whatever performance is already
    // active ("as part of another bardic performance" / "when he begins a
    // bardic performance") rather than their own standalone toggle, but
    // each still displaces a base performance type per d20pfsrd (Tremor
    // replaces countersong, Quake replaces dirge of doom at 8th level).
    archetypeId: "bard:stonesinger",
    removesTags: ["countersong", "dirgeOfDoom"],
    performances: [],
  },
  {
    archetypeId: "bard:street-performer",
    removesTags: ["countersong", "inspireCompetence", "inspireGreatness", "inspireHeroics"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "disappearingAct",
        name: "Disappearing Act",
        summary: "Makes a chosen ally appear invisible to onlookers who fail a Will save.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "All creatures within 30 feet who fail a Will save (DC 10 + 1/2 your bard level + your Cha modifier) treat one creature you choose (never yourself) as if it were invisible. Affects one additional creature at 5th level and every 6 levels thereafter. Ends for anyone who sees the target act overtly. Mind-affecting, requires visual components.",
          },
          {
            target: "allChecks",
            text: "At 15th level (Slip through the Crowd), affected creatures can move through crowded and enemy-occupied squares unimpeded, as greater invisibility, though enemies get a new save each time they attack.",
          },
        ],
      },
      {
        tag: "harmlessPerformer",
        name: "Harmless Performer",
        summary: "Enemies who target you must save or lose that attack, as sanctuary.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Whenever an enemy targets you, it must succeed at a Will save (DC 10 + 1/2 your bard level + your Cha bonus) or lose that attack, as sanctuary (it may redirect other attacks it has). A targeting spellcaster instead needs a matching concentration check or loses the spell. Mind-affecting, requires audible or visual components.",
          },
        ],
      },
      {
        tag: "madcapPrank",
        name: "Madcap Prank",
        summary: "A target within 30 feet suffers a random debuff each round it can perceive you.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round the target sees or hears the performance, it makes a Reflex save (DC 10 + 1/2 your bard level + your Cha modifier) or suffers one round of a random effect: blinded, dazzled, deafened, entangled, knocked prone, or nauseated.",
          },
        ],
      },
    ],
  },
  {
    // All five swaps trade a base performance slot for a non-performance
    // benefit (a bonus feat, scroll-casting, a Knowledge take-20, a
    // spell-swap) that never spends a round of bardic performance, so none
    // get a def. Scribe Scroll (replaces distraction) and Perfect
    // Recollection (replaces mass suggestion) are confirmed via d20pfsrd;
    // the vendored description text for both is missing its "replaces"
    // clause entirely.
    archetypeId: "bard:studious-librarian",
    removesTags: [
      "distraction",
      "suggestion",
      "dirgeOfDoom",
      "massSuggestion",
      "deadlyPerformance",
    ],
    performances: [],
  },
  {
    archetypeId: "bard:thundercaller",
    removesTags: [
      "inspireCompetence",
      "suggestion",
      "massSuggestion",
      "dirgeOfDoom",
      "frighteningTune",
    ],
    performances: [
      {
        tag: "thunderCall",
        name: "Thunder Call",
        summary: "Unleashes a deafening peal of thunder, as the sound burst spell.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Starting the performance is always a standard action: functions as the sound burst spell (same range, area, and Fortitude save to negate the stun), dealing 1d8 sonic damage regardless of the save. The sonic damage increases to 3d8 at 7th level and by 2d8 every 4 levels thereafter. A creature that succeeds its save is still immune to the stun but takes the damage.",
          },
        ],
      },
      {
        tag: "inciteRage",
        name: "Incite Rage",
        summary: "Induces a furious rage in one creature within 30 feet, as the rage spell.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as the rage spell on one creature within 30 feet (never yourself) for as long as it can hear the performance. An unwilling target resists with a Will save (DC 10 + 1/2 your bard level + your Cha modifier); success grants 24 hours of immunity. A target with its own rage class feature can rage this way without spending its daily rounds. Mind-affecting, requires audible components.",
          },
        ],
      },
      {
        tag: "callLightning",
        name: "Call Lightning",
        summary:
          "Summons bolts of lightning as the call lightning spell for as long as you perform.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as the call lightning spell, calling down one bolt per round as a standard action for as long as you continue the performance. Bolt damage scales with weather as the spell describes.",
          },
        ],
      },
      {
        tag: "callLightningStorm",
        name: "Call Lightning Storm",
        summary:
          "Summons bolts of lightning as the call lightning storm spell for as long as you perform.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as the call lightning storm spell, calling down one bolt per round as a standard action for as long as you continue the performance. Bolt damage scales with weather as the spell describes.",
          },
        ],
      },
    ],
  },
  {
    // Brigh's Knowledge (purely additive Knowledge bonus, already extracted
    // as a numeric Change elsewhere) also grants every remaining and
    // replaced performance the ability to affect constructs despite their
    // usual mind-affecting immunity; that blanket clause is folded into
    // each construct-only reflavor's note below rather than modeled
    // separately. The vendored "Distraction" entry (bard:voice-of-brigh:
    // distraction:1) is a suspected duplicate/mislabeled artifact: its text
    // is byte-for-byte the same fascinate-construct-only ability as Brigh's
    // Soothing, and aonprd.com's live Voice of Brigh page lists only five
    // abilities total with no separate "Distraction" among them, so it gets
    // no def of its own.
    archetypeId: "bard:voice-of-brigh",
    removesTags: ["fascinate", "dirgeOfDoom", "soothingPerformance", "frighteningTune"],
    performances: [
      {
        tag: "brighsSoothing",
        name: "Brigh's Soothing",
        summary: "Functions as Fascinate, except it can also affect constructs.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as the fascinate bardic performance (Will save DC 10 + 1/2 your bard level + your Cha modifier to resist), except it can also target constructs, which are normally immune to mind-affecting bardic performances.",
          },
        ],
      },
      {
        tag: "brighsAnger",
        name: "Brigh's Anger",
        summary: "Functions as Dirge of Doom, except it can also affect constructs.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as the dirge of doom bardic performance (every enemy within 30 feet who can see and hear you becomes shaken, no save), except it can also target constructs, which are normally immune to mind-affecting bardic performances.",
          },
        ],
      },
      {
        tag: "brighsSpark",
        name: "Brigh's Spark",
        summary:
          "Reanimates a destroyed construct, which regains hit points while you keep performing.",
        minLevel: 12,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Expend 1 round of bardic performance to reanimate a destroyed construct within 60 feet: it returns staggered with hit points equal to your level and follows your orders. Expend another round each round to keep it reanimated; it regains hit points equal to your level each round it remains so, and becomes fully and permanently reanimated (following your orders for 24 hours) if it reaches full hit points. Ending the performance early, being interrupted, or reducing it to 0 hit points destroys the construct for good. Reanimating multiple constructs costs 1 round per construct per round.",
          },
        ],
      },
      {
        tag: "brighsWrath",
        name: "Brigh's Wrath",
        summary: "Functions as Frightening Tune, except it can also affect constructs.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as the frightening tune bardic performance (Will save DC 10 + 1/2 your bard level + your Cha modifier or become frightened and flee), except it can also target constructs, which are normally immune to mind-affecting bardic performances.",
          },
        ],
      },
    ],
  },
  {
    // Nature Magic (spell-list swap) never spends a round of bardic
    // performance, so it gets no def despite replacing countersong (plus
    // versatile performance and jack-of-all-trades, neither a pool toggle).
    // Wild Knowledge's "replaces bardic knowledge" claim is out of scope
    // here (Bardic Knowledge isn't a pool toggle either; already handled as
    // a blocked Knowledge-overlap elsewhere in bard.ts).
    archetypeId: "bard:voice-of-the-wild",
    removesTags: ["countersong", "inspireCompetence", "dirgeOfDoom", "inspireHeroics"],
    performances: [
      {
        tag: "songOfTheWild",
        name: "Song of the Wild",
        summary: "Grants an animal aspect to one ally, as the hunter's animal focus.",
        minLevel: 3,
        // Ally-only per RAW ("grant an animal aspect to an ally") — the bard
        // is never a legitimate target, unlike Inspire Greatness/Heroics.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Grants one ally who can see or hear the performance an animal aspect, as the hunter's animal focus class feature, using your bard level as your hunter level. Affects a second ally at 10th level and a third at 17th. Requires audible or visual components.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:watersinger",
    removesTags: ["fascinate", "suggestion", "massSuggestion", "inspireCompetence"],
    performances: [
      {
        tag: "watersong",
        name: "Watersong",
        summary: "Animates and controls a cube of water within 30 feet, shaping it like solid ice.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "A successful Perform check animates and controls a 5-foot cube of water within 30 feet, shaped as anything carvable from ice (pillar, ladder, bridge, stairs, and so on) and able to bear weight. The water starts at hardness 0 and 3 hit points per inch of thickness, gaining +1 hardness at 3rd level and every 3 levels thereafter. The volume affected grows by another 5-foot cube at 5th, 10th, 15th, and 20th level. The shape holds for 1 round after you stop spending rounds to maintain it.",
          },
        ],
      },
      {
        tag: "waterstrike",
        name: "Waterstrike",
        summary: "Commands manipulated water to lash out with a slam attack.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Spend 1 round of bardic performance to command water you're currently manipulating with watersong to make a slam attack (your base attack bonus and Cha bonus, no attacks of opportunity) dealing 1d6 bludgeoning damage plus your Cha bonus. Damage becomes 1d8 with 10 feet of reach at 10th level, 2d6 at 15th, and 2d8 at 20th.",
          },
        ],
      },
      {
        tag: "lifewater",
        name: "Lifewater",
        summary: "Sickens a creature's fluids or repositions it, at 30 feet.",
        minLevel: 5,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Spend 1 round of bardic performance as a standard action to manipulate a fluid-bodied creature within 30 feet: it becomes sickened for 1d4 rounds, or you attempt a reposition combat maneuver against it using your base attack bonus and Cha modifier as your CMB. Doesn't work on creatures immune to critical hits. Replaces only the 5th-level use of lore master; lore master itself still comes online at 11th and 17th level (not tracked on this toggle pool).",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:wit",
    removesTags: ["inspireCompetence", "dirgeOfDoom", "frighteningTune"],
    performances: [
      {
        tag: "cuttingRemark",
        name: "Cutting Remark",
        summary: "Wounds a target within 30 feet with nonlethal damage that scales with level.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Spend 1 round of bardic performance as a standard action to deal 1d4 plus your bard level nonlethal damage to a creature within 30 feet (subject to damage reduction). Mind-affecting, language-dependent, requires audible components. Not modeled as a Change: the damage includes a die roll.",
          },
          {
            target: "allChecks",
            text: "At 8th level, a damaged target is also sickened while within 30 feet and for 1 round after, and the nonlethal damage counts as magic for overcoming damage reduction. At 14th level, a damaged target also makes a Will save (DC 10 + 1/2 your bard level + your Cha modifier) or is dazed for 1 round, with 24 hours of immunity on a success.",
          },
        ],
      },
    ],
  },
];
