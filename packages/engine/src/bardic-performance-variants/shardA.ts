/**
 * Bard archetype performance-variant defs, shard A — see `types.ts` for the
 * def shape and `index.ts` for the merge. Shard ownership is alphabetical by
 * archetype slug; each entry is hand-authored from the published rules and
 * verified against the vendored archetype-feature text (aonprd.com where the
 * vendored prose is ambiguous), same clean-room posture as
 * `bardic-performances.ts`.
 *
 * Busker is deliberately absent: its "busker stunts" ability redefines the
 * entire Bardic Performance pool as its own resource ("treated as bardic
 * performance... a busker stunt cannot be maintained at the same time as
 * other performance abilities") rather than swapping individual base
 * performance types the way every other entry here does. This merge
 * mechanism only supports additive/subtractive edits to the standard CRB
 * performance list, not a wholesale pool replacement, so busker isn't
 * modeled as a variant at all.
 *
 * Several entries below correct a vendored-data gap: the archetype-features
 * text for Argent Voice's Limning Verse/Shattering Crescendo/Devilbane
 * Refrain, Arrowsong Minstrel's Arcane Archery/Arrowsong Strike, and
 * Chronicler of Worlds's Quintessence Infusion/Mantra of Tabris all omit
 * their "this ability replaces X" sentence (present in the printed rules but
 * dropped somewhere in the pipeline's source compilation) — the `removesTags`
 * below for those six were verified directly against aonprd.com and
 * d20pfsrd.com rather than the vendored prose.
 */

import type { ArchetypePerformanceVariant } from "./types.js";
import { MAINTAIN_NOTE } from "./types.js";

export const SHARD_A_VARIANTS: ArchetypePerformanceVariant[] = [
  {
    archetypeId: "bard:animal-speaker",
    removesTags: ["fascinate", "inspireCompetence", "suggestion", "massSuggestion"],
    performances: [
      {
        tag: "soothingPerformance",
        name: "Soothing Performance (Animal Speaker)",
        summary:
          "Spends a round of performance to make a wild-empathy-style Perform check on an animal.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Spend 1 round of bardic performance and make a Perform check to influence an animal's attitude, as the druid's wild empathy. If you also have wild empathy from another class, add those levels to the Perform check result. Not modeled as a check bonus on your sheet.",
          },
        ],
      },
      {
        tag: "attractRats",
        name: "Attract Rats",
        summary: "Summons swarms of rats that remain while you keep performing.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Summons 1d3 rat swarms while you continue performing (2d3 advanced swarms at 11th level, 3d3 swarms at 17th level). Not modeled: summon the swarms manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:arcane-duelist",
    removesTags: ["countersong", "suggestion", "massSuggestion"],
    performances: [
      {
        tag: "rallyingCry",
        name: "Rallying Cry",
        summary: "Intimidate check vs fear or despair effects, usable in place of a saving throw.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round, make an Intimidate check. Any ally within 30 feet (including you) affected by a fear or despair effect may use that Intimidate result in place of its saving throw if it's higher, rolled after the save, and may reroll a save each round against an ongoing fear or despair effect. Doesn't work on effects that don't allow saves.",
          },
        ],
      },
      {
        tag: "bladethirst",
        name: "Bladethirst",
        summary:
          "Grants a weapon within 30 feet a scaling enhancement bonus or a weapon special ability.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Grants one weapon, natural weapon, one end of a double weapon, or 50 pieces of ammunition within 30 feet a +1 enhancement bonus, increasing by +1 every 3 levels beyond 6th (max +5 at 18th level). The bonus can instead fund a weapon special ability (defending, distance, ghost touch, keen, mighty cleaving, returning, shock, shocking burst, seeking, speed, or wounding) once at least a +1 enhancement is in place. Not modeled: pick a target weapon and apply the bonus manually.",
          },
        ],
      },
      {
        tag: "massBladethirst",
        name: "Mass Bladethirst",
        summary:
          "Extends bladethirst to every ally's weapon within 30 feet, at a reduced shared bonus.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Grants an identical enhancement bonus to as many allies' weapons within 30 feet as you choose: +4 for two allies, +3 for three, +2 for four, +1 for five or more. Not modeled: apply the bonus manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:archivist",
    removesTags: ["suggestion", "massSuggestion"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "naturalist",
        name: "Naturalist",
        summary:
          "Grants you and nearby allies an insight bonus vs a specifically identified kind of monster.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Once you've identified a creature's exact kind with a Knowledge check, you and allies within 30 feet gain a +1 insight bonus to AC, attack rolls, and saving throws against that specific kind's exceptional, supernatural, and spell-like abilities. The bonus increases by +1 at 5th level and every 6 levels thereafter. Not modeled as a Change: scoped to one identified monster kind at a time, which the static sheet can't track.",
          },
        ],
      },
      {
        tag: "lamentableBelaborment",
        name: "Lamentable Belaborment",
        summary:
          "Bewilders a creature you've already fascinated, dazing or confusing it on a failed save.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a standard action, force a creature you've already fascinated to make a Will save (DC 10 + 1/2 your bard level + your Cha modifier). Failure leaves it dazed or confused (your choice) for as long as you perform, or until it takes damage. Success grants 24-hour immunity. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "pedanticLecture",
        name: "Pedantic Lecture",
        summary: "Extends lamentable belaborment to every creature you have fascinated at once.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Affects every creature you currently have fascinated with lamentable belaborment simultaneously, and you may choose to put failed targets to sleep instead of leaving them dazed or confused. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:argent-voice",
    // removesTags verified against aonprd.com/d20pfsrd.com — see file doc comment.
    removesTags: ["fascinate", "suggestion", "massSuggestion", "dirgeOfDoom", "frighteningTune"],
    performances: [
      {
        tag: "limningVerse",
        name: "Limning Verse",
        summary: "Outlines nearby evil outsiders in silvery light, as faerie fire.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Evil-subtype outsiders within 10 feet are affected as faerie fire. The range increases by 10 feet every 4 levels, to 60 feet at 20th level. Defenses that block alignment or evil detection also block this. Not modeled on your sheet.",
          },
        ],
      },
      {
        tag: "shatteringCrescendo",
        name: "Shattering Crescendo",
        summary:
          "Spends 2 rounds of performance to dispel a single evil spell or an evil creature's enchantment.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a full-round action, spend 2 rounds of bardic performance to dispel a single evil spell, or an enchantment spell cast by an evil creature, as dispel magic with your bard level as caster level. At 18th level it can also remove effects that break enchantment would remove. Not modeled: resolve the dispel check manually.",
          },
        ],
      },
      {
        tag: "devilbaneRefrain",
        name: "Devilbane Refrain",
        summary:
          "Treats nearby allies' weapons as silver, and later as bane against evil outsiders.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Allies within 30 feet who can hear you fight with weapons treated as silver for bypassing damage reduction. At 14th level those weapons also gain the evil outsider bane property. Not modeled as a Change on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:arrowsong-minstrel",
    // removesTags verified against aonprd.com/d20pfsrd.com — see file doc comment.
    // Arcane Archery (1st) drops five base performance types outright; neither
    // it nor Arrowsong Strike (6th, drops suggestion/mass suggestion) is
    // itself a bardic-performance-consuming ability, so there's nothing to
    // define in `performances` here.
    removesTags: [
      "dirgeOfDoom",
      "distraction",
      "fascinate",
      "inspireCompetence",
      "soothingPerformance",
      "suggestion",
      "massSuggestion",
    ],
    performances: [],
  },
  {
    archetypeId: "bard:averaka-arbiter",
    removesTags: ["inspireCompetence", "dirgeOfDoom"],
    performances: [
      {
        tag: "inspireTeamwork",
        name: "Inspire Teamwork",
        summary:
          "Lets allies count as sharing your teamwork feats, so you get your own teamwork bonus around them.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "While performing, treat your allies as if they had your own teamwork feats, for the sole purpose of determining whether you get your teamwork feat's bonus. Allies gain nothing unless they actually have the feat, and positioning or action prerequisites still apply. The bonus itself depends on which teamwork feat you have, so it isn't modeled here.",
          },
        ],
      },
      {
        tag: "ritualOfReconciliation",
        name: "Ritual of Reconciliation",
        summary:
          "Improves nearby creatures' attitude toward you by two steps on a failed Will save.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Creatures within 30 feet who can hear you improve their attitude toward you by two steps unless they succeed at a Will save (DC 10 + 1/2 your bard level + your Cha modifier). Creatures that reach indifferent or better stop attacking you and your allies. Ends if an ally attacks the creature. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:buccaneer",
    // Bonus Feat/Deeds/Exotic Pet/Grit/Gun Training/Liquid Courage/Raider's
    // Riposte/Sword and Pistol are excluded: their vendored text describes
    // gunslinger grit/deeds mechanics the base bard class doesn't have,
    // apparently bled in from the separate gunslinger:buccaneer archetype
    // during compilation (flagged in archetype-extracted/bard.ts's doc
    // comment). None of them mention replacing a base bard performance
    // anyway, so nothing to record even setting the mix-up aside.
    removesTags: ["suggestion", "massSuggestion"],
    performances: [
      {
        tag: "songOfSurrender",
        name: "Song of Surrender",
        summary: "Compels one enemy to drop its weapons and fall prone on a failed Will save.",
        minLevel: 4,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One enemy within 30 feet who can see and hear you drops any held weapons and falls prone for 1 round unless it succeeds at a Will save (DC 10 + 1/2 your level + your Cha modifier). It isn't flat-footed or helpless while prone this way. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "massSongOfSurrender",
        name: "Mass Song of Surrender",
        summary: "Song of surrender against every enemy within 30 feet at once.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as song of surrender, but affects every enemy within 30 feet who can see and hear you. Each still gets its own Will save. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:celebrity",
    // Shining Star (8th) is a passive enhancer of the base Fascinate
    // performance (harder to break, ignores shaken) rather than a standalone
    // activated performance, so it isn't given its own def; only its removal
    // of dirge of doom is tracked.
    removesTags: ["dirgeOfDoom"],
    performances: [],
  },
  {
    archetypeId: "bard:chelish-diva",
    removesTags: ["inspireCompetence", "dirgeOfDoom"],
    performances: [
      {
        tag: "devastatingAria",
        name: "Devastating Aria",
        summary: "Spends a round of performance to blast a creature or object with sonic damage.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a standard action, spend 1 round of bardic performance to deal 1d4 points of damage plus your bard level to an object, or half that to a living creature. Not modeled as a damage roll on your sheet.",
          },
        ],
      },
      {
        tag: "scathingTirade",
        name: "Scathing Tirade",
        summary:
          "Verbally frightens one enemy for as long as you keep performing, plus a lingering duration.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One enemy within 30 feet who can see and hear you becomes frightened for as long as you keep performing and it stays in range, plus 1d4 more rounds after. No saving throw. Can't push a creature already frightened to panicked.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:chronicler-of-worlds",
    // removesTags verified against aonprd.com/d20pfsrd.com — see file doc comment.
    removesTags: ["inspireGreatness", "inspireHeroics"],
    performances: [
      {
        tag: "quintessenceInfusion",
        name: "Quintessence Infusion",
        summary: "While on another plane, grants an ally that plane's basic infusion effect.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "While on a plane other than the Material Plane, grants an ally within 30 feet that plane's basic planar infusion, one additional ally per 3 bard levels beyond 9th. At 13th level affected allies also get the plane's improved infusion, and at 16th level its greater infusion. The plane infused is locked in for the day on first use. Not modeled: apply the plane's infusion effects manually.",
          },
        ],
      },
      {
        tag: "mantraOfTabris",
        name: "Mantra of Tabris",
        summary:
          "Reactively substitutes a Knowledge (planes) check for your AC or save against an outsider's attack.",
        minLevel: 15,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As an immediate action after being hit by an outsider's attack, or failing a save against an outsider's extraordinary, supernatural, or spell-like ability, attempt a Knowledge (planes) check (no taking 20) and use that result as your AC or save result instead, retroactively. Not modeled: the substitute roll is variable, so it isn't a fixed Change.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:court-bard",
    removesTags: ["inspireCompetence", "dirgeOfDoom", "frighteningTune"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "satire",
        name: "Satire",
        summary:
          "Undermines enemies who hear you: a penalty on their attack/damage rolls and fear/charm saves.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies who can hear your performance take a penalty (minimum 1) on attack and damage rolls, and on saves against fear and charm effects, for as long as you perform. The penalty is -1, increasing by -1 at 5th level and every 6 levels thereafter. Not modeled as a penalty on your sheet: it applies to enemies, not you.",
          },
        ],
      },
      {
        tag: "mockery",
        name: "Mockery",
        summary:
          "Saddles one chosen target with a penalty on Charisma checks and Charisma-based skills.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One target who can hear your performance takes a -2 penalty on Charisma checks and Charisma-based skill checks for as long as you perform, worsening by -1 every 4 levels beyond 3rd. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "gloriousEpic",
        name: "Glorious Epic",
        summary: "Enemies within 30 feet become flat-footed unless they save.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies within 30 feet become flat-footed unless they succeed at a Will save (DC 10 + 1/2 your bard level + your Cha modifier); a success grants 24-hour immunity. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "scandal",
        name: "Scandal",
        summary: "Afflicts enemies within 30 feet as song of discord unless they save.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Every enemy within 30 feet who can hear you is affected as song of discord unless it succeeds at a Will save (DC 10 + 1/2 your bard level + your Cha modifier); a success grants 24-hour immunity. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:court-fool",
    removesTags: ["countersong", "inspireCompetence"],
    performances: [
      {
        tag: "distractingMotley",
        name: "Distracting Motley",
        summary:
          "Acrobatics check vs confusion or fascination effects, usable in place of a saving throw.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round, make an Acrobatics check. Any ally within 30 feet (including you) affected by a confusion or fascination effect may use that result in place of its saving throw if it's higher, rolled after the save, and may reroll a save each round against an ongoing effect. Wearing an entertainer's outfit adds +2 to this check. Doesn't work on effects that don't allow saves.",
          },
        ],
      },
      {
        tag: "defuseTension",
        name: "Defuse Tension",
        summary: "Lets one ally who can see you ignore the fatigued and shaken conditions.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One ally within 30 feet who can see you ignores the fatigued and shaken conditions (not more severe conditions like exhausted or frightened) for as long as she keeps watching your performance. Affects one additional ally at 7th level and every 4 levels thereafter. Can't target yourself. Not modeled on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:cultivator",
    removesTags: ["countersong"],
    performances: [
      {
        tag: "songOfGrowth",
        name: "Song of Growth",
        summary: "Conjures plant-matter barriers for total cover while you keep performing.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a standard action, conjure an opaque plant-matter barrier across one face of a square within 30 feet, giving total cover (hardness 0, AC 5, 2 hit points per bard level). You can start one barrier when you begin performing as a standard action. You can maintain a number of barriers equal to your Cha modifier plus half your bard level; they crumble when the performance ends. Not modeled on your sheet.",
          },
        ],
      },
    ],
  },
];
