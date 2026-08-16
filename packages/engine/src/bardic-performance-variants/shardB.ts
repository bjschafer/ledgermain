/**
 * Bard archetype performance-variant defs, shard B — see `types.ts` for the
 * def shape and `index.ts` for the merge. Shard ownership is alphabetical by
 * archetype slug; each entry is hand-authored from the published rules and
 * verified against the vendored archetype-feature text (aonprd.com/
 * d20pfsrd.com where the vendored prose is ambiguous or omits its "replaces"
 * sentence), same clean-room posture as `bardic-performances.ts`.
 *
 * Dawnflower Dervish and Dervish Dancer are deliberately absent: both
 * redefine bardic performance itself into a self-only "battle dance" (move
 * action to start, free action to maintain, swift at 10th, no effect on
 * allies or enemies), the same wholesale-pool-replacement shape `shardA.ts`
 * documents for Busker. This merge mechanism only supports additive/
 * subtractive edits to the standard CRB performance list, not a self-only
 * pool, so neither archetype is modeled as a variant here.
 *
 * None of shard B's entries carry real numeric `Change`s. Two archetypes
 * (First World Minstrel's Echoes of the First World, "himself or a single
 * willing ally") meet the self-targeting half of the Inspire Greatness/
 * Inspire Heroics precedent, but their granted benefit is a player-chosen
 * special ability off the fey creature template rather than a fixed number,
 * so it's still context-note only.
 *
 * Several entries below correct a vendored-data gap where the
 * archetype-features text omits its "this ability replaces X" sentence
 * (present in the printed rules but dropped somewhere in the pipeline's
 * source compilation): Filidh's Echoes of Nature's Song/Divinatory Song/
 * Voices of Life/Unity of Life/Song of the Cycle, Fey Prankster's Song of
 * Clumsiness/Incite Unreliability/Embarrassing Satire, Disciple of the
 * Forked Tongue's Discordant Spiral/Venomous Whispers, First World
 * Minstrel's Echoes of the First World/Gremlin's Luck, Fortune-Teller's
 * Transparent Fate, Fey Courtier's Scorn of the Wilds/Stone Dance/Summon Fey
 * Allies, and Dragon Herald's Diplomatic Immunity/Diplomatic Protection/
 * Rebuke Foes/Retreat to Lair. The `removesTags`/`removesInspireCourage` for
 * all of these were verified directly against aonprd.com and d20pfsrd.com
 * rather than the vendored prose.
 */

import type { ArchetypePerformanceVariant } from "./types.js";
import { MAINTAIN_NOTE } from "./types.js";

export const SHARD_B_VARIANTS: ArchetypePerformanceVariant[] = [
  {
    archetypeId: "bard:demagogue",
    // removesTags/removesInspireCourage taken directly from the vendored
    // "replaces" sentences (present in this archetype's text).
    removesInspireCourage: true,
    removesTags: ["suggestion", "massSuggestion"],
    performances: [
      {
        tag: "inciteViolence",
        name: "Incite Violence",
        summary: "Whips a fascinated crowd into a rage against a target you name.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a standard action (without ending fascinate), select a number of creatures you've already fascinated equal to your bard level. Each makes a Will save (DC 10 plus half your bard level plus your Cha modifier) or rages for a number of rounds equal to your bard level against a target you designate, which need not be present. Sound based, so countersong can block it. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "righteousCause",
        name: "Righteous Cause",
        summary: "Redirects a fascinated crowd's fervor toward a cause instead of violence.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After fascinating a crowd and using incite violence without naming a target, you may instead fill the crowd with purpose. Each fails a Will save (DC 10 plus half your bard level plus your Cha modifier) or is affected by mass suggestion toward a plausible idea that lingers for one day. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:detective",
    // Careful Teamwork/True Confession/Show Yourselves all state their
    // replacement explicitly in the vendored text.
    removesInspireCourage: true,
    removesTags: ["inspireGreatness", "inspireHeroics"],
    performances: [
      {
        tag: "carefulTeamwork",
        name: "Careful Teamwork",
        summary:
          "After 3 rounds of performance, grants nearby allies a package of tactical bonuses for an hour.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After 3 rounds of continuous performance while allies within 30 feet can see and hear you, they gain a +1 bonus on Initiative, Perception, and Disable Device checks, plus a +1 insight bonus on Reflex saves and to AC against traps and while flat-footed, for 1 hour. The bonus increases by +1 at 5th level and every 6 levels thereafter. RAW says allies, not you. Not modeled as a Change on your sheet.",
          },
        ],
      },
      {
        tag: "trueConfession",
        name: "True Confession",
        summary: "Compels a target to blurt out its secrets after a few rounds of performance.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After 3 rounds of continuous performance (2 rounds at 15th level, 1 round at 20th level), the target makes a Will save (DC 10 plus half your bard level plus your Cha modifier). Success grants 24-hour immunity; failure forces a liar to reveal the truth, or a charmed/compelled target to reveal the enchantment's nature and source with a new save to break free. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "showYourselves",
        name: "Show Yourselves",
        summary:
          "Compels hidden enemies within 30 feet to break cover and stop attacking or fleeing.",
        minLevel: 15,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies within 30 feet who fail a Will save (DC 10 plus half your bard level plus your Cha modifier, re-rolled each round you perform) must stop using Stealth, open doors between themselves and you, and shed magical concealment, and may not attack or flee until they do (though attacking them frees them immediately). Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:dirge-bard",
    performances: [
      {
        tag: "danceOfTheDead",
        name: "Dance of the Dead",
        summary: "Animates nearby bones or bodies for as long as you keep performing.",
        minLevel: 10,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as animate dead, but the created skeletons or zombies stay animate only as long as you continue the performance, collapsing to carrion once it stops. No components, no evil descriptor, and a given body or bones can't be reanimated this way twice. Not modeled: create and remove the undead manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:disciple-of-the-forked-tongue",
    // Neither ability states its replacement in the vendored text; verified
    // against d20pfsrd.com (Discordant Spiral replaces inspire courage,
    // Venomous Whispers replaces inspire greatness).
    removesInspireCourage: true,
    removesTags: ["inspireGreatness"],
    performances: [
      {
        tag: "discordantSpiral",
        name: "Discordant Spiral",
        summary:
          "Weakens enemies' resistance to mind-affecting and curse effects while they hear you perform.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies who hear your performance take a -1 penalty on saves against mind-affecting and curse effects and a -2 penalty on concentration checks, worsening by 1 at 5th level and every 6 levels thereafter. Not modeled as a penalty on your sheet: it applies to enemies, not you.",
          },
        ],
      },
      {
        tag: "venomousWhispers",
        name: "Venomous Whispers",
        summary: "Makes a target treat its own allies as hostile for spells and abilities.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One enemy within 30 feet treats its allies as hostile for its own spells and abilities: it's never a willing target of their spells, must save against them when possible, and gains no benefit from allied performances or similar abilities. One additional target for every 3 levels beyond 9th (up to four at 18th). The source text gives no saving throw for the target to resist this effect; treat as GM-adjudicated.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:dragon-herald",
    // removesTags verified against aonprd.com (ArchetypeDisplay.aspx?FixedName=Bard+Dragon+Herald)
    // — the vendored archetype-feature text omits every one of these
    // "replaces" sentences.
    removesTags: [
      "countersong",
      "fascinate",
      "inspireCompetence",
      "soothingPerformance",
      "inspireHeroics",
    ],
    performances: [
      {
        tag: "diplomaticImmunity",
        name: "Diplomatic Immunity",
        summary: "Wraps yourself in a sanctuary effect while you perform.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Generates a sanctuary effect (as the spell, your dragon herald level as caster level) on yourself for as long as you perform, plus 1 round after. Not modeled: sanctuary isn't a flat bonus, so apply its effect manually.",
          },
        ],
      },
      {
        tag: "diplomaticProtection",
        name: "Diplomatic Protection",
        summary:
          "Wraps a single ally in energy resistance and natural armor tied to your dragon patron.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One ally you can see who can perceive your performance gains energy resistance equal to twice your dragon herald level (of your patron's energy type) and an enhancement bonus to natural armor equal to half your dragon herald level. Ally only, not modeled as a Change on your sheet.",
          },
        ],
      },
      {
        tag: "rebukeFoes",
        name: "Rebuke Foes",
        summary: "Rains your dragon patron's energy damage on enemies each round you perform.",
        minLevel: 12,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Once per round while you perform, deals energy damage of your patron's type equal to twice your dragon herald level (Reflex half) to one enemy within 50 feet for every 4 dragon herald levels you have. Not modeled as a damage roll on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:dragon-yapper",
    removesTags: ["fascinate", "dirgeOfDoom"],
    performances: [
      {
        tag: "yappingSong",
        name: "Yapping Song",
        summary:
          "Saddles enemies who hear you with a penalty on attacks, damage, and fear/charm saves.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies who hear your performance take a -1 penalty (minimum 1) on attack and damage rolls, and on saves against fear and charm effects, for as long as you perform. The penalty worsens by 1 at 5th level and every 6 levels thereafter. No saving throw. Not modeled as a penalty on your sheet: it applies to enemies, not you.",
          },
        ],
      },
      {
        tag: "frightfulSong",
        name: "Frightful Song",
        summary: "Shakes enemies within 30 feet unless they save.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies within 30 feet who fail a Will save (DC 10 plus half your level plus your Cha modifier) become shaken; a success grants 24-hour immunity. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:duettist",
    // Harmonizing Familiar and Symphonic Familiar are both modifiers to
    // whichever base performance the duettist and familiar are already
    // using together, not standalone performance types, so only the base
    // performances they replace are tracked here.
    removesTags: ["dirgeOfDoom", "frighteningTune"],
    performances: [],
  },
  {
    archetypeId: "bard:fey-courtier",
    // removesTags verified against d20pfsrd.com — the vendored text for
    // Scorn of the Wilds, Stone Dance, and Summon Fey Allies omits its
    // "replaces" sentence.
    removesTags: ["dirgeOfDoom", "frighteningTune", "inspireHeroics", "inspireCompetence"],
    performances: [
      {
        tag: "scornOfTheWilds",
        name: "Scorn of the Wilds",
        summary: "Curses a target who has wronged fey or nature, after 2 rounds of performance.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After 2 rounds of performance while the target stays within 30 feet, it makes a Will save (DC 10 plus half your bard level plus your Cha modifier) or is cursed as nature's exile or bestow curse (also baleful polymorph or green caress at 14th level). You must set a condition, tied to making amends, that lifts the curse. Success grants 24-hour immunity. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "stoneDance",
        name: "Stone Dance",
        summary: "Animates unworked stone, water, and plants around you, as animate plants.",
        minLevel: 15,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as animate plants (DC 10 plus half your bard level plus your Cha modifier), but can also animate unworked stone and water from natural bodies of water. Not modeled: resolve the animation manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:fey-prankster",
    // removesTags/removesInspireCourage verified against d20pfsrd.com — the
    // vendored text for Song of Clumsiness, Incite Unreliability, and
    // Embarrassing Satire omits its "replaces" sentence. Plant Traps, Steal
    // Appearance, Unseen Trickster, and Dirty Trickster's feats are excluded:
    // their prose reads like contamination from an unrelated rogue
    // archetype (rogue level, uncanny dodge) per
    // `archetype-extracted/bard.ts`'s doc comment, and none of them describe
    // themselves as an activated performance anyway.
    removesInspireCourage: true,
    removesTags: ["countersong", "dirgeOfDoom"],
    performances: [
      {
        tag: "songOfClumsiness",
        name: "Song of Clumsiness",
        summary: "Makes enemies within 30 feet drop items or stumble in difficult terrain.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies within 30 feet who hear you drop any weapon or item they draw or retrieve, and fall prone the first time they enter difficult terrain on their turn, unless they succeed at a separate Reflex save (DC 10 plus half your bard level plus your Cha modifier) for each. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "inciteUnreliability",
        name: "Incite Unreliability",
        summary: "Confuses a single target for as long as it can hear you perform.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One target within 30 feet who fails a Will save (DC 10 plus half your bard level plus your Cha modifier) is affected as lesser confusion for as long as it can hear you; a success grants 24-hour immunity from you. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "embarrassingSatire",
        name: "Embarrassing Satire",
        summary: "Sickens a target with painful facial boils for as long as you perform.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One target within 30 feet is sickened for as long as it stays in range and you continue performing; the boils themselves last 1 day after. The source text gives no saving throw for this effect; treat as GM-adjudicated.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:filidh",
    // removesInspireCourage/removesTags verified against d20pfsrd.com — the
    // vendored text for all five of these performances omits its "replaces"
    // sentence.
    removesInspireCourage: true,
    removesTags: ["suggestion", "dirgeOfDoom", "inspireHeroics", "deadlyPerformance"],
    performances: [
      {
        tag: "echoesOfNaturesSong",
        name: "Echoes of Nature's Song",
        summary: "Grants nearby allies a scaling insight bonus to Reflex saves and AC.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Allies affected by your performance gain a +1 insight bonus on Reflex saves and to AC, increasing by 1 at 5th level and every 6 levels thereafter, to a maximum of +4 at 17th level. RAW says allies, not you. Not modeled as a Change on your sheet.",
          },
        ],
      },
      {
        tag: "divinatorySong",
        name: "Divinatory Song",
        summary: "Spends 10 minutes and 6 rounds of performance for a divination-spell effect.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Takes 10 minutes and consumes 6 rounds of bardic performance to create an effect as divination (your bard level as caster level); you and allies who hear the performance receive the information. Not modeled: resolve the divination manually.",
          },
        ],
      },
      {
        tag: "voicesOfLife",
        name: "Voices of Life",
        summary:
          "Grants yourself and allies who hear you speak with animals and plants while performing.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "You and allies who can hear your performance gain the effects of speak with animals and speak with plants for as long as you maintain it. Not modeled: it isn't a flat bonus.",
          },
        ],
      },
      {
        tag: "unityOfLife",
        name: "Unity of Life",
        summary: "Interlinks two allies' life force, as shield other, while you perform.",
        minLevel: 15,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Links two allies who can hear you as though under shield other (your bard level as caster level); you designate the warded ally and the one who takes the transferred damage, and may swap them as a free action each round you maintain the performance. Ally only, not modeled as a Change on your sheet.",
          },
        ],
      },
      {
        tag: "songOfTheCycle",
        name: "Song of the Cycle",
        summary: "Grants all allies who can see and hear you personal foresight while you perform.",
        minLevel: 20,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "All allies who can see and hear you are affected as though by the personal version of foresight for as long as you perform. RAW says allies, not you. Not modeled as a Change on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:first-world-minstrel",
    // removesInspireCourage/removesTags verified against d20pfsrd.com (the
    // "Fey World Minstrel" listing there is this same archetype) — the
    // vendored text for both performances omits its "replaces" sentence.
    removesInspireCourage: true,
    removesTags: ["dirgeOfDoom"],
    performances: [
      {
        tag: "echoesOfTheFirstWorld",
        name: "Echoes of the First World",
        summary: "Grants yourself or an ally a chosen fey-template special ability for 1 round.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Infuses yourself or one willing ally within 30 feet with one special ability from the fey creature template (other than change shape) for 1 round. One additional target, or one additional ability on an existing target, for every 3 levels beyond 1st. The granted ability is a player choice, not a fixed number, so it isn't modeled as a Change.",
          },
        ],
      },
      {
        tag: "gremlinsLuck",
        name: "Gremlin's Luck",
        summary: "Forces a target to roll twice and take the worse result on its next roll.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "One target within 30 feet who fails a Will save (DC 10 plus half your level plus your Cha modifier) must roll twice and take the worse result on its next ability check, attack roll, save, or skill check within 1 round; success grants 24-hour immunity. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:flame-dancer",
    removesTags: ["countersong", "inspireCompetence", "suggestion", "dirgeOfDoom"],
    performances: [
      {
        tag: "fireDance",
        name: "Fire Dance",
        summary: "Lets nearby allies use your Perform check in place of saves against fire.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round, make a Perform (dance or sing) check. Any ally within 30 feet on fire or affected by a fire effect or extreme heat may use that result in place of its save, and allies suffering heatstroke ignore the resulting fatigue while you maintain the performance. Ally only, not modeled as a Change on your sheet.",
          },
        ],
      },
      {
        tag: "songOfTheFieryGaze",
        name: "Song of the Fiery Gaze",
        summary: "Lets nearby allies see through fire, fog, and smoke without penalty.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Allies within 30 feet who can hear you see through fire, fog, and smoke without penalty, as the base gaze of flames oracle revelation, for as long as you perform. Ally only, not modeled as a Change on your sheet.",
          },
        ],
      },
      {
        tag: "fireBreak",
        name: "Fire Break",
        summary: "Grants nearby allies resist fire while you perform.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Allies within 30 feet who can hear or see your performance gain resist fire 20 (30 at 11th level) for as long as you maintain it. Ally only, not modeled as a Change on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:fortune-teller",
    // removesTags verified against d20pfsrd.com — Transparent Fate's
    // vendored text omits its "replaces" sentence. Oracular Performance
    // shifts other performances' existing bonus/penalty by 1 rather than
    // granting a standalone performance, so it isn't given its own def.
    removesTags: ["countersong", "distraction", "dirgeOfDoom"],
    performances: [
      {
        tag: "transparentFate",
        name: "Transparent Fate",
        summary: "Reveals enemies' near future, granting their attackers a bonus against them.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Enemies within 30 feet who fail a Will save (DC 10 plus half your level plus your Cha modifier) grant a +2 bonus to AC and on saves against their attacks to whoever they attack; if reduced below their Constitution score in hit points, they must also save or become frightened for 1 round (once per casting). Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
];
