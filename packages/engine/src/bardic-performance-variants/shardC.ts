/**
 * Bard archetype performance-variant defs, shard C — see `types.ts` for the
 * def shape and `index.ts` for the merge. Shard ownership is alphabetical by
 * archetype slug; each entry is hand-authored from the published rules and
 * verified against the vendored archetype-feature text (aonprd.com where the
 * vendored prose is ambiguous), same clean-room posture as
 * `bardic-performances.ts`.
 *
 * Two archetypes assigned to this shard carry no entry at all, on purpose:
 *   - Lotus Geisha's only performance-touching feature, Enrapturing
 *     Performance, redefines HOW the whole Bardic Performance pool can be
 *     spent (a single-target activation mode for any performance she
 *     already knows, plus flat DC/bonus increments on several of them) —
 *     not a replacement or addition of one specific performance type, so it
 *     doesn't fit this table's per-tag shape. See the file-level flag in the
 *     wave's report for detail.
 *   - Provocateur's three candidate features (Calumny, Damning Performance,
 *     Provocateur) are all either a passive skill substitution with no
 *     bardic-performance cost, an add-on effect layered onto an
 *     already-active Fascinate rather than its own performance, or a
 *     passive bonus scoped to Ultimate Intrigue subsystems this engine
 *     doesn't model — none of them occupy a toggle slot.
 */

import type { ArchetypePerformanceVariant } from "./types.js";
import { MAINTAIN_NOTE } from "./types.js";

export const SHARD_C_VARIANTS: ArchetypePerformanceVariant[] = [
  {
    archetypeId: "bard:hatharat-agent",
    removesTags: ["dirgeOfDoom"],
    performances: [
      {
        tag: "masterOfManipulation",
        name: "Master of Manipulation",
        summary: "Enemies within 20 feet cannot speak deliberate lies while you perform.",
        minLevel: 8,
        // Purely a compulsion effect on OTHER creatures you select, no self
        // stat and no saving throw to model.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Any creature you select within a 20 foot radius emanation from you cannot speak deliberate or intentional lies for as long as this performance continues, though it's aware of the effect and can dodge a question or stay evasive within the truth. Mind affecting compulsion, no saving throw.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:hoaxer",
    removesTags: ["countersong", "distraction", "inspireCompetence", "inspireGreatness"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "badDeal",
        name: "Bad Deal",
        summary: "Invests a witch hex into an object; triggers on whoever accepts it.",
        minLevel: 1,
        // The hex afflicts whoever accepts the object, never you, and the
        // hex list/DC is bookkeeping this static sheet can't carry.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a standard action, invest a witch hex you know into an object you're holding, then spend 1 round of bardic performance each round as a swift action to keep it hexed until someone else willingly accepts it, you drop it, or it triggers. The hex targets its new owner on acceptance. At 1st level you know one hex from a fixed list, gaining one more every 3 levels; major hexes unlock at 12th. Save DC (where the hex allows one) is 10 plus half your bard level plus your Charisma modifier. Not modeled on your sheet.",
          },
        ],
      },
      {
        tag: "buyerBeware",
        name: "Buyer Beware",
        summary: "Talks a target into accepting a gift or trade, as beguiling gift.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Spend 1 round of bardic performance on a supernatural sales pitch to convince a creature to accept a gift or trade, as beguiling gift (DC 10 plus half your bard level plus your Charisma modifier). Often used to get a mark to accept a hexed object from Bad Deal. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "personalGuarantee",
        name: "Personal Guarantee",
        summary: "Delays a hexed object's trigger so you can get out of sight first.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "While hexing an object with Bad Deal, spend up to 1 additional round of bardic performance per bard level to delay the hex's trigger by 1 minute per round spent. No standing bonus to model.",
          },
        ],
      },
      {
        tag: "curseBreaker",
        name: "Curse Breaker",
        summary: "After 4 rounds of continuous performance, acts as break enchantment.",
        minLevel: 12,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After 4 rounds of continuous performance, same trigger as soothing performance, affects everyone who could see and hear you throughout as break enchantment, using your bard level as caster level. Not modeled: apply the effect manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:impervious-messenger",
    removesTags: ["suggestion", "massSuggestion", "dirgeOfDoom", "frighteningTune"],
    performances: [
      {
        tag: "songOfSubterfuge",
        name: "Song of Subterfuge",
        summary: "Perform check vs mind reading effects targeting you, in place of a save.",
        minLevel: 6,
        // Reactive Perform-check substitution like Distraction, but self
        // only — same "no static number to model" posture.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Each round, make a Perform check. You may use that result in place of your own saving throw against an effect attempting to read your mind, such as detect thoughts, rolled after the save. Affects only you. At 18th level, if you succeed this way, the diviner must succeed at a Will save (DC 20 plus your Charisma modifier) or you learn the nature of the effect and can feed it false information instead of the truth.",
          },
        ],
      },
      {
        tag: "unbrokenStride",
        name: "Unbroken Stride",
        summary: "Insight bonus on Acrobatics, Climb, Fly, and Ride, plus faster land speed.",
        minLevel: 8,
        // RAW: self buff, grace-and-speed enhancement while performing.
        changes: [
          { formula: "floor(@classes.bard.level / 2)", target: "skill.acr", type: "insight" },
          { formula: "floor(@classes.bard.level / 2)", target: "skill.clm", type: "insight" },
          { formula: "floor(@classes.bard.level / 2)", target: "skill.fly", type: "insight" },
          { formula: "floor(@classes.bard.level / 2)", target: "skill.rid", type: "insight" },
          {
            formula: "if(gte(@classes.bard.level, 12), 30, 10)",
            target: "landSpeed",
            type: "enhancement",
          },
        ],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Also grants the ranger's woodland stride while maintained. At 12th level, you also act as if under freedom of movement. Neither is modeled as a Change; apply manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:luring-piper",
    removesTags: ["soothingPerformance"],
    performances: [
      {
        tag: "feyWoundingSong",
        name: "Fey-Wounding Song",
        summary: "Mass inflict serious wounds against fey creatures only.",
        minLevel: 12,
        // Enemy facing (fey only), no self stat.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "As a full round action, spend 3 rounds of bardic performance to deal mass inflict serious wounds damage to fey creatures only, using your bard level as caster level. Not modeled as damage on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:magician",
    removesTags: ["countersong", "dirgeOfDoom", "frighteningTune"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "dweomercraft",
        name: "Dweomercraft",
        summary: "Grants allies a caster level, concentration, and spell attack bonus.",
        minLevel: 1,
        // RAW says "allies of the magician" only, with no "or himself"
        // clause anywhere in the text, unlike Inspire Greatness/Heroics
        // above in the base table, so this stays note-tier.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Allies (not yourself, per RAW) within range gain a +1 bonus on caster level checks, concentration checks, and attack rolls with spells and spell-like abilities, increasing to +2 at 5th level and every 6 levels thereafter (+3 at 11th, +4 at 17th). Requires visual and audible components. This tracker applies buffs only to your own sheet, so sharing it with allies isn't modeled.",
          },
        ],
      },
      {
        tag: "spellSuppression",
        name: "Spell Suppression",
        summary: "While performing, attempt to counterspell a foe's spell as an immediate action.",
        minLevel: 8,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "While active, track the number of rounds you've performed it. As an immediate action, you can attempt to counter a spell you can identify with Spellcraft whose level is at or below the rounds you've performed so far, as a dispel magic check using your bard level as caster level. Success ends this performance immediately. Not modeled: apply the dispel check manually.",
          },
        ],
      },
      {
        tag: "metamagicMastery",
        name: "Metamagic Mastery",
        summary: "Applies a metamagic feat to a spell about to be cast, at no extra casting time.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Apply a metamagic feat to a spell you're about to cast without increasing its casting time, at the cost of a higher level spell slot; this performance ends immediately after. Not modeled: apply the metamagic effect manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:masked-performer",
    removesTags: ["countersong", "inspireCompetence", "suggestion", "massSuggestion"],
    performances: [
      {
        tag: "seamlessGuise",
        name: "Seamless Guise",
        summary: "Big bonus on Disguise and Perform (act) checks to stay in character.",
        minLevel: 1,
        // RAW gives an unnamed "+10 bonus" with no stated type; per this
        // engine's convention for RAW-silent bonuses, modeled as untyped
        // (stacks with everything, same as this file's other unnamed-bonus
        // entries elsewhere in the engine).
        changes: [
          { formula: "10", target: "skill.dis", type: "untyped" },
          { formula: "10", target: "skill.prf.act", type: "untyped" },
        ],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Applies only after you've already established your character in the current scene; it doesn't help the initial Perception check when someone first meets you, only the automatic check each hour after.",
          },
        ],
      },
      {
        tag: "exaggeratedPose",
        name: "Exaggerated Pose",
        summary: "Competence bonus on a chosen Strength-, Dexterity-, or Charisma-based skill.",
        minLevel: 3,
        // The bonus target is a live choice made when the performance
        // starts (and swap-able as a swift action), with no fixed stat to
        // bind a Change to.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Choose a Strength-, Dexterity-, or Charisma-based skill when you start this performance; gain a +2 competence bonus on it, rising to +3 at 7th level, +4 at 11th, +5 at 15th, +6 at 19th. You can change the chosen skill as a swift action. Not modeled: the target skill is a live choice this tracker can't bind to a fixed stat.",
          },
        ],
      },
      {
        tag: "stageCombat",
        name: "Stage Combat",
        summary: "Gain the benefit of a chosen combat feat you don't have while performing.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Choose a combat feat you don't have when you start this performance; you gain its benefits for as long as you maintain the performance, as if you had it, including any daily-use limits. Not modeled: the chosen feat is a live choice this tracker can't bind to a fixed stat.",
          },
        ],
      },
      {
        tag: "multiplicityOfMasks",
        name: "Multiplicity of Masks",
        summary:
          "Disguises any number of allies as you or another chosen ally; enemies may disbelieve.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Any number of allies within 60 feet who can see you appear as you or another chosen ally to enemies, who may attempt a Will save (DC 10 plus half your bard level plus your Charisma modifier) to disbelieve if the disguised ally differs in size or type. Illusion (glamer); not modeled on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:mute-musician",
    removesTags: ["inspireCompetence", "frighteningTune", "massSuggestion", "inspireHeroics"],
    performances: [
      {
        tag: "symphonyOfSilence",
        name: "Symphony of Silence",
        summary:
          "Everyone nearby, including you, saves better vs sonic and language-dependent effects.",
        minLevel: 3,
        // This engine has no scoped-save target ("vs sonic/language
        // dependent effects only"), the same gap that leaves Luring Piper's
        // Piper's Attention and Mute Musician's own Dulled Horror as
        // situational elsewhere in this wave, so this stays note-tier even
        // though it names the bard as a beneficiary.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "All creatures within 30 feet, including you, gain a +2 bonus on saving throws against sonic attacks and language dependent effects, rising to +3 at 7th level, +4 at 11th, +5 at 15th, +6 at 19th. Not modeled: this engine has no scoped save target for a bonus that only applies against certain effect types.",
          },
        ],
      },
      {
        tag: "maddeningHarmonics",
        name: "Maddening Harmonics",
        summary:
          "Chosen enemies within 30 feet save or become confused for as long as they can hear you.",
        minLevel: 14,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Choose which creatures within 30 feet are affected; each makes a Will save (DC 10 plus half your bard level plus your Charisma modifier) or becomes confused for as long as it can hear you, with 24 hour immunity on a success. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "songOfTheConjunction",
        name: "Song of the Conjunction",
        summary: "Duplicates gate for travel to a destination on your current plane.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Duplicates gate used for travel, limited to a destination on your current plane but otherwise unrestricted by distance. Not modeled: apply the effect manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:negotiator",
    removesTags: ["inspireGreatness"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "fastTalk",
        name: "Fast Talk",
        summary: "Listeners save worse vs charm and illusion, and misjudge Appraise checks.",
        minLevel: 1,
        // Purely a debuff on listeners, no self stat.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "While you perform, anyone who can hear you takes a -1 penalty on saves against enchantment (charm) and illusion (figment, glamer, or shadow) effects, plus a penalty on Appraise checks equal to half your level (minimum -1); a failed Appraise check misjudges an object's value by 10 percent in your chosen direction. Both the save penalty and the value shift increase again at 5th, 11th, and 17th level. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "bindingContract",
        name: "Binding Contract",
        summary: "After 3 rounds of performance, binds a target's promise with a geas effect.",
        minLevel: 9,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After 3 rounds of continuous performance with the target able to see and hear you, bind its promise with lesser geas (Will DC 10 plus half your level plus your Charisma modifier negates; target's Hit Dice can't exceed your level). The geas breaks if you break your end of the bargain. At 18th level this becomes geas/quest, with no Hit Dice limit and no saving throw. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:phrenologist",
    removesTags: ["inspireCompetence"],
    removesInspireCourage: true,
    performances: [
      {
        tag: "skullSonata",
        name: "Skull Sonata",
        summary: "Enemies with skulls take extra sonic damage from any source while you perform.",
        minLevel: 1,
        // Purely enemy facing damage bonus, no self stat.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Every enemy within 30 feet who has a skull takes extra sonic damage equal to half your bard level (minimum 1) whenever it takes sonic damage. Not modeled as damage on your sheet.",
          },
        ],
      },
      {
        tag: "inYourHead",
        name: "In Your Head",
        summary: "Sends your senses into a target's skull, as the spell witness.",
        minLevel: 3,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Send your senses into a creature's skull, as the spell witness (DC 10 plus half your class level plus your Charisma modifier). Duration extends to 10 minutes per bard level at 11th and 1 hour per bard level at 19th. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:plant-speaker",
    removesTags: ["inspireGreatness"],
    performances: [
      {
        tag: "leshySpeaker",
        name: "Leshy Speaker",
        summary: "After 10 minutes performing, gain the effects of commune with nature.",
        minLevel: 9,
        // A one-shot triggered information-gaining effect, not a standing
        // bonus, same posture as Soothing Performance in the base table.
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "After performing for 10 minutes and spending 7 rounds of bardic performance, gain the effects of commune with nature. Not modeled: apply the effect manually.",
          },
        ],
      },
      {
        tag: "mysticalAllegory",
        name: "Mystical Allegory",
        summary: "Perform to gain augury, then divination, then legend lore as you level.",
        minLevel: 5,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Perform for 1 minute and spend 4 rounds of bardic performance to gain the effects of augury. At 11th level, perform for 10 minutes and spend 7 rounds for divination. At 17th level, perform for 1 hour and spend 10 rounds for legend lore, though the information is always vague and incomplete. Not modeled: apply the effect manually.",
          },
        ],
      },
    ],
  },
  {
    archetypeId: "bard:prankster",
    removesTags: ["fascinate", "suggestion", "massSuggestion"],
    performances: [
      {
        tag: "mock",
        name: "Mock",
        summary: "Targets become angry and penalized until they attack you; enemy-facing.",
        minLevel: 1,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Target one or more creatures within 90 feet (one additional per 3 levels beyond 1st) who can see, hear, and understand you; each resists with a Will save (DC 10 plus half your level plus your Charisma modifier) or becomes angry and takes a -2 penalty on attack rolls and skill checks until it successfully attacks you. A successful save makes that creature immune to your mock for 24 hours. Enchantment (compulsion), mind affecting. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "punchline",
        name: "Punchline",
        summary: "Goads a creature you've mocked into hideous laughter, as the spell.",
        minLevel: 6,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Goad a creature you've already mocked into hideous laughter, as the spell (Will DC 10 plus half your level plus your Charisma modifier negates). Doesn't cost bardic performance rounds beyond maintaining mock, and can be used more than once per performance against the same target. Not modeled as a save DC on your sheet.",
          },
        ],
      },
      {
        tag: "massPunchline",
        name: "Mass Punchline",
        summary: "As Punchline, but affects any number of creatures you've mocked at once.",
        minLevel: 18,
        changes: [],
        contextNotes: [
          MAINTAIN_NOTE,
          {
            target: "allChecks",
            text: "Functions as punchline, but affects any number of creatures you've already mocked simultaneously. Not modeled as a save DC on your sheet.",
          },
        ],
      },
    ],
  },
];
