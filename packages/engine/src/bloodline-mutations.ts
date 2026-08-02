/**
 * Clean-room PF1 "Wildblooded Mutation" table (DESIGN §6): a wildblooded
 * sorcerer takes a base bloodline plus a mutated form of it. RAW (Ultimate
 * Magic p.70): the character keeps the base bloodline's class skill, bonus
 * spells, and bonus feats, takes the MUTATION's bloodline arcana, and keeps
 * the base bloodline's powers "except when the mutated bloodline replaces one
 * of those powers."
 *
 * `RefData.sorcererBloodlineMutations` (data-pipeline
 * `transform/sorcererBloodlines.ts`) carries the full published catalog as
 * prose only — same "catalog from data, mechanics as overlay" pattern as
 * `bloodlines.ts` itself. This table hand-authors, per mutation: its own
 * arcana (as live mechanics, same conservative posture as `bloodlines.ts` —
 * most arcana are conditional on a situation the static sheet can't detect,
 * so they carry `changes: []` plus a `contextNotes` reminder) and which
 * parent power(s) it swaps out for which replacement(s). Every swap in the
 * pinned slice replaces a power at the SAME level gate it displaces, so
 * `mutatedBloodlineDef` never has to reconcile a level conflict.
 *
 * Scope: all 24 "(Wildblooded Mutation)" headings in the pinned Pf Data 1e
 * slice (`class_ability_sorcerer_bloodlines.json`) — hand-authored from
 * aonprd.com's Ultimate Magic reprint (a couple of mutations come from Blood
 * of the Elements / People of the River instead; cited per entry). The
 * source states "25 mutations" in some tallies floating around online, but
 * the pinned slice publishes 24 — every parent bloodline's own entry was
 * checked, and there is no 25th.
 */

import type { Change, ContextNote, RefData, SourceRef } from "@pf1/schema";

import {
  BLOODLINES,
  burstPool,
  c,
  normalizeBloodlineName,
  POOL_3_CHA,
  resolveSorcererBloodline,
  type BloodlineDef,
  type BloodlinePower,
  type MergedSorcererBloodlineEntry,
} from "./bloodlines.js";

/** One parent power a mutation swaps out, and what replaces it. */
export interface BloodlineMutationSwap {
  /** `BloodlinePower.id` on the PARENT bloodline this displaces. */
  replaces: string;
  power: BloodlinePower;
}

export interface BloodlineMutationDef {
  /** Matches `SorcererBloodlineMutation.id` from the vendored catalog (e.g. "arcane-sage"). */
  id: string;
  /** `BloodlineDef.tag` of the base bloodline this mutates (e.g. "Arcane"). */
  parentTag: string;
  name: string;
  arcana: {
    summary: string;
    changes: Change[];
    contextNotes?: ContextNote[];
  };
  /** Parent powers this mutation swaps out — almost always one; Sylvan and Void-Touched swap two. */
  swaps: BloodlineMutationSwap[];
  sources?: SourceRef[];
}

const UM = (pages: string): SourceRef[] => [{ id: "ultimate-magic", pages }];

export const BLOODLINE_MUTATIONS: Record<string, BloodlineMutationDef> = {
  "aberrant-warped": {
    id: "aberrant-warped",
    parentTag: "Aberrant",
    name: "Warped",
    sources: UM("73"),
    arcana: {
      summary:
        "Whenever you cast a polymorph-subschool spell, one target may roll a random effect from the Warped Polymorph Benefits table for the spell's duration.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Random polymorph-benefit rider only on your own polymorph spells; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "acidicRay",
        power: {
          id: "warpTouch",
          level: 1,
          name: "Warp Touch",
          summary:
            "Ranged touch attack (30 ft.): target dazed 1 round (Fortitude negates, DC 10 + 1/2 level + Cha mod).",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "abyssal-brutal": {
    id: "abyssal-brutal",
    parentTag: "Abyssal",
    name: "Brutal",
    sources: UM("70"),
    arcana: {
      summary:
        "Whenever you cast a spell that deals hit point damage, one target affected by it takes 2 additional hit points of damage.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+2 damage rider on one target of a damaging spell; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "strengthOfTheAbyss",
        power: {
          id: "wingsOfTheAbyss",
          level: 9,
          name: "Wings of the Abyss",
          summary:
            "Grow leathery wings for a fly speed of 60 ft. (good maneuverability), 1-minute increments.",
          resourcePool: {
            usesFormula: "@classes.sorcerer.level",
            per: "day",
            detail: "Minutes of flight/day",
          },
        },
      },
    ],
  },

  "aquatic-seaborn": {
    id: "aquatic-seaborn",
    parentTag: "Aquatic",
    name: "Seaborn",
    sources: UM("72"),
    arcana: {
      summary:
        "While in a body of water large enough to float in, your effective caster level is increased by 1.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+1 caster level only while floating in open water." },
      ],
    },
    swaps: [
      {
        replaces: "dehydratingTouch",
        power: {
          id: "waterBlast",
          level: 1,
          name: "Water Blast",
          summary:
            "Ranged touch attack (30 ft.): knocks the target prone and up to 5 ft. away (Reflex negates, DC 10 + 1/2 level + Cha mod).",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "arcane-sage": {
    id: "arcane-sage",
    parentTag: "Arcane",
    name: "Sage",
    sources: UM("72"),
    arcana: {
      summary:
        "Use Intelligence instead of Charisma for all sorcerer class features and effects (bonus spells, max spell level, save DCs, bloodline-power uses/day); +2 on Knowledge (arcana) and Spellcraft checks.",
      changes: [c("2", "skill.kar", "untyped"), c("2", "skill.spl", "untyped")],
      contextNotes: [
        {
          target: "allChecks",
          text: "Casting stat swaps to Intelligence throughout — not reflected in ability-driven derived stats here; track manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "arcaneBond",
        power: {
          id: "arcaneBolt",
          level: 1,
          name: "Arcane Bolt",
          summary:
            "Ranged touch attack (30 ft.): 1d4 + 1 per two sorcerer levels force damage, as a spell of level = half sorcerer level.",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "boreal-rime-blooded": {
    id: "boreal-rime-blooded",
    parentTag: "Boreal",
    name: "Rime-Blooded",
    sources: UM("72"),
    arcana: {
      summary:
        "Whenever you cast a cold-descriptor spell, you may slow one target of it for 1 round (Fortitude DC 10 + spell level + Cha mod negates).",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Slow rider only on your own cold spells; apply manually." },
      ],
    },
    swaps: [
      {
        replaces: "snowShroud",
        power: {
          id: "freezingBolt",
          level: 9,
          name: "Freezing Bolt",
          summary:
            "60-ft.-range 10-ft.-radius burst: 1d6 cold damage/sorcerer level (Reflex half, DC 10 + 1/2 level + Cha mod).",
          resourcePool: burstPool(9, "Freezing bolt bursts/day"),
        },
      },
    ],
  },

  "celestial-empyreal": {
    id: "celestial-empyreal",
    parentTag: "Celestial",
    name: "Empyreal",
    sources: UM("71"),
    arcana: {
      summary:
        "Use Wisdom instead of Charisma for all sorcerer class features and effects (bonus spells, max spell level, save DCs); +2 on Heal and Knowledge (religion) checks.",
      changes: [c("2", "skill.hea", "untyped"), c("2", "skill.kre", "untyped")],
      contextNotes: [
        {
          target: "allChecks",
          text: "Casting stat swaps to Wisdom throughout — not reflected in ability-driven derived stats here; track manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "wingsOfHeaven",
        power: {
          id: "sacredCistern",
          level: 9,
          name: "Sacred Cistern",
          summary: "Channel positive energy once per day as a cleric of (sorcerer level - 4).",
          resourcePool: { usesFormula: "1", per: "day", detail: "Channel energy (as a cleric)" },
        },
      },
    ],
  },

  "deep-earth-bedrock": {
    id: "deep-earth-bedrock",
    parentTag: "Deep Earth",
    name: "Bedrock",
    sources: UM("70"),
    arcana: {
      summary:
        "Whenever you cast a summoning-subschool spell, the summoned creatures gain DR/adamantine equal to 1/2 your sorcerer level (minimum 1); doesn't stack with their own DR.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "DR/adamantine applies to summoned creatures, not you — apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "crystalShard",
        power: {
          id: "ironHide",
          level: 9,
          name: "Iron Hide",
          summary:
            "Swift action: DR 10/adamantine for a number of rounds/day equal to sorcerer level.",
          resourcePool: {
            usesFormula: "@classes.sorcerer.level",
            per: "day",
            detail: "Rounds of DR 10/adamantine per day",
          },
        },
      },
    ],
  },

  "destined-karmic": {
    id: "destined-karmic",
    parentTag: "Destined",
    name: "Karmic",
    sources: UM("71"),
    arcana: {
      summary:
        "Failing a concentration check to cast defensively while threatened lets you redirect an attack of opportunity from one threatening creature onto an adjacent foe of your choice.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Situational attack-of-opportunity redirect; apply manually at the table.",
        },
      ],
    },
    swaps: [
      {
        replaces: "touchOfDestiny",
        power: {
          id: "fatesRetribution",
          level: 1,
          name: "Fate's Retribution",
          summary:
            "Immediate action when hit in melee: curse the attacker with -2 attack/damage for 1d4 rounds (Will DC 10 + 1/2 level + Cha mod negates).",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "draconic-linnorm": {
    id: "draconic-linnorm",
    parentTag: "Draconic",
    name: "Linnorm",
    sources: UM("71"),
    arcana: {
      summary:
        "Whenever you cast a spell whose energy descriptor matches your linnorm bloodline's energy type, you gain a natural armor bonus equal to the spell's level for 1d4 rounds.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Natural armor rider only after casting a matching-energy spell; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "claws",
        power: {
          id: "elementalSpit",
          level: 1,
          name: "Elemental Spit",
          summary:
            "Ranged touch attack (30 ft.): 1d6 + 1 per two sorcerer levels damage of your linnorm's energy type.",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "dreamspun-visionary": {
    id: "dreamspun-visionary",
    parentTag: "Dreamspun",
    name: "Visionary",
    sources: UM("73"),
    arcana: {
      summary:
        "You need only a single hour of sleep before regaining spells (still risk fatigue as normal).",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Reduced rest requirement; watch for fatigue as normal." },
      ],
    },
    swaps: [
      {
        replaces: "dreamshaper",
        power: {
          id: "visions",
          level: 9,
          name: "Visions",
          summary:
            "While sleeping, gain divination-spell information about the next week (one question at 9th, two at 17th, three at 20th).",
          resourcePool: burstPool(9, "Prophetic questions/day"),
        },
      },
    ],
  },

  "elemental-primal": {
    id: "elemental-primal",
    parentTag: "Elemental",
    name: "Primal",
    sources: UM("72"),
    arcana: {
      summary:
        "Whenever you cast a spell whose energy descriptor matches your elemental bloodline's energy type, it deals +1 damage per die.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+1 dmg/die only on matching-energy spells; apply manually." },
      ],
    },
    swaps: [
      {
        replaces: "elementalBlast",
        power: {
          id: "elementalistSummoning",
          level: 9,
          name: "Elementalist Summoning",
          summary:
            "Creatures you summon gain energy resistance 10 of your bloodline's energy type (+5 if they already have it) and their natural attacks deal +1d6 of that energy.",
        },
      },
    ],
  },

  "elemental-lifewater": {
    id: "elemental-lifewater",
    parentTag: "Elemental",
    name: "Lifewater",
    sources: [{ id: "blood-of-the-elements", pages: "15" }],
    arcana: {
      summary:
        "Casting a cold- or water-descriptor spell grants temporary hit points equal to the spell's level (1 minute); up to half may be shared with an adjacent ally.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Temporary HP only after a cold/water spell; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "elementalBlast",
        power: {
          id: "lifewaterStream",
          level: 9,
          name: "Lifewater Stream",
          summary:
            "30-ft. line: remove fatigued/shaken/sickened (or step down exhausted/frightened/nauseated); at 17th also blinded/deafened/dazed/staggered.",
          resourcePool: burstPool(9, "Uses/day"),
        },
      },
    ],
  },

  "fey-dark-fey": {
    id: "fey-dark-fey",
    parentTag: "Fey",
    name: "Dark Fey",
    sources: [{ id: "people-of-the-river", pages: "11" }],
    arcana: {
      summary: "Whenever you cast a curse-subtype spell, its save DC increases by 2.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+2 DC only on curse-subtype spells; apply manually." },
      ],
    },
    swaps: [
      {
        replaces: "laughingTouch",
        power: {
          id: "feyFascination",
          level: 1,
          name: "Fey Fascination",
          summary:
            "Standard action (30 ft.): fascinate one target for 1 round per 2 sorcerer levels (min 1) unless it saves (Will DC 10 + 1/2 level + Cha mod).",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "fey-sylvan": {
    id: "fey-sylvan",
    parentTag: "Fey",
    name: "Sylvan",
    sources: UM("72"),
    arcana: {
      summary:
        'Your bloodline arcana IS your Animal Companion power (RAW: "See bloodline powers") — no separate arcana effect.',
      changes: [],
    },
    swaps: [
      {
        replaces: "laughingTouch",
        power: {
          id: "animalCompanion",
          level: 1,
          name: "Animal Companion",
          summary:
            "Gain an animal companion; effective druid level = sorcerer level - 3 (min 1st). Counts as this bloodline's arcana as well as its 1st-level power.",
        },
      },
      {
        replaces: "feyMagic",
        power: {
          id: "feyWings",
          level: 15,
          name: "Fey Wings",
          summary:
            "Grow insect-like wings and shrink one size category (as reduce person): fly speed 60 ft. (average), 1-minute increments.",
          resourcePool: {
            usesFormula: "@classes.sorcerer.level",
            per: "day",
            detail: "Minutes of flight/day",
          },
        },
      },
    ],
  },

  "infernal-pit-touched": {
    id: "infernal-pit-touched",
    parentTag: "Infernal",
    name: "Pit-Touched",
    sources: UM("71"),
    arcana: {
      summary:
        "Whenever you cast a spell, you gain an Intimidate bonus equal to the spell's level for 1 round.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Intimidate rider only for 1 round after casting; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "hellfire",
        power: {
          id: "toughAsHell",
          level: 9,
          name: "Tough as Hell",
          summary: "+2 inherent bonus to Constitution (+4 at 13th, +6 at 17th).",
          changes: [
            c(
              "if(gte(@classes.sorcerer.level, 17), 6, if(gte(@classes.sorcerer.level, 13), 4, 2))",
              "con",
              "inherent",
            ),
          ],
        },
      },
    ],
  },

  "marid-shahzada": {
    id: "marid-shahzada",
    parentTag: "Marid",
    name: "Shahzada",
    sources: [{ id: "blood-of-the-elements", pages: "15" }],
    arcana: {
      summary:
        "Whenever you cast a water-descriptor spell, gain a swim speed of 30 ft. for a number of rounds equal to double the spell's level.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Swim speed rider only after a water spell; apply manually." },
      ],
    },
    swaps: [
      {
        replaces: "elementalMovement",
        power: {
          id: "sweepingWaves",
          level: 15,
          name: "Sweeping Waves",
          summary:
            "5-ft. burst from your mouth: 1d6 + 1 per 2 sorcerer levels damage and a bull rush (Reflex half + negates bull rush; DC 10 + 1/2 level + Cha mod).",
        },
      },
    ],
  },

  "martyred-retribution": {
    id: "martyred-retribution",
    parentTag: "Martyred",
    name: "Retribution",
    sources: [{ id: "people-of-the-river", pages: "11" }],
    arcana: {
      summary:
        "Until the end of your next turn after a creature damages you, a metamagic feat applied to a spell targeting it costs 1 less spell-slot level (min 0).",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Metamagic-cost reduction only against your last attacker; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "giftOfBlood",
        power: {
          id: "vengefulStrike",
          level: 9,
          name: "Vengeful Strike",
          summary:
            "Immediate action after a foe damages you in melee: deal the same damage back (max 2x character level); twice/day at 17th.",
          resourcePool: { usesFormula: "if(gte(@classes.sorcerer.level, 17), 2, 1)", per: "day" },
        },
      },
    ],
  },

  "protean-anarchic": {
    id: "protean-anarchic",
    parentTag: "Protean",
    name: "Anarchic",
    sources: UM("70"),
    arcana: {
      summary:
        "Failing a concentration check to cast a spell triggers a random known cantrip (50% on a target of your choice within 60 ft., else on you).",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Random cantrip only on a failed concentration check." },
      ],
    },
    swaps: [
      {
        replaces: "proteanResistances",
        power: {
          id: "wildFeedback",
          level: 3,
          name: "Wild Feedback",
          summary:
            "When you successfully dispel or counterspell an opponent's spell, the caster (within 100 ft.) takes 1d6 + 1/spell level damage.",
        },
      },
    ],
  },

  "serpentine-envenomed": {
    id: "serpentine-envenomed",
    parentTag: "Serpentine",
    name: "Envenomed",
    sources: UM("71"),
    arcana: {
      summary: "+2 bonus on Acrobatics, Climb, and Stealth checks.",
      changes: [
        c("2", "skill.acr", "untyped"),
        c("2", "skill.clm", "untyped"),
        c("2", "skill.ste", "untyped"),
      ],
    },
    swaps: [
      {
        replaces: "serpentfriend",
        power: {
          id: "envenom",
          level: 3,
          name: "Envenom",
          summary:
            "Swift action: imbue a wielded weapon with black adder venom (DC 10 + 1/2 level + Cha mod).",
          resourcePool: {
            usesFormula: "1 + floor(max(0, @classes.sorcerer.level - 3) / 3)",
            per: "day",
          },
        },
      },
    ],
  },

  "shadow-umbral": {
    id: "shadow-umbral",
    parentTag: "Shadow",
    name: "Umbral",
    sources: UM("73"),
    arcana: {
      summary:
        "Whenever you cast a spell in dim light or darkness, your effective caster level is increased by 1.",
      changes: [],
      contextNotes: [{ target: "allChecks", text: "+1 caster level only in dim light/darkness." }],
    },
    swaps: [
      {
        replaces: "shadowstrike",
        power: {
          id: "cloakOfShadows",
          level: 1,
          name: "Cloak of Shadows",
          summary:
            "Standard action: grant a target a Stealth bonus (in dim/no light) equal to 1/2 sorcerer level for 1 round per 2 sorcerer levels (min +1/1 round).",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "starsoul-void-touched": {
    id: "starsoul-void-touched",
    parentTag: "Starsoul",
    name: "Void-Touched",
    sources: UM("73"),
    arcana: {
      summary:
        "Whenever you cast an evocation spell, one target that fails its save is silenced (as silence, target only) for 1 round.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Silence rider only on a failed save vs. your evocations." },
      ],
    },
    swaps: [
      {
        replaces: "minuteMeteors",
        power: {
          id: "blackMotes",
          level: 1,
          name: "Black Motes",
          summary:
            "Works exactly like Minute Meteors, but deals cold damage instead of fire (30-ft. range, 5-ft. column, 30 ft. high; 1d4 + 1 per two sorcerer levels).",
          resourcePool: { ...POOL_3_CHA, detail: "1d4+1/2 lvl cold, Reflex negates" },
        },
      },
      {
        replaces: "auroraBorealis",
        power: {
          id: "voidfield",
          level: 9,
          name: "Voidfield",
          summary:
            "As ice storm, but the area is also subject to deeper darkness for 1 round per 4 sorcerer levels.",
          resourcePool: {
            usesFormula: "1 + floor(max(0, @classes.sorcerer.level - 3) / 3)",
            per: "day",
          },
        },
      },
    ],
  },

  "stormborn-arial": {
    id: "stormborn-arial",
    parentTag: "Stormborn",
    name: "Arial",
    sources: UM("70"),
    arcana: {
      summary:
        "While outdoors during any precipitation, your effective caster level is increased by 2.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+2 caster level only outdoors during precipitation." },
      ],
    },
    swaps: [
      {
        replaces: "thunderbolt",
        power: {
          id: "windcaller",
          level: 9,
          name: "Windcaller",
          summary:
            "As control winds, for 1 minute/level (1-minute increments); may choose to be immune to any increased-wind effects you create.",
          resourcePool: {
            usesFormula: "@classes.sorcerer.level",
            per: "day",
            detail: "Minutes of wind control/day",
          },
        },
      },
    ],
  },

  "undead-sanguine": {
    id: "undead-sanguine",
    parentTag: "Undead",
    name: "Sanguine",
    sources: UM("72"),
    arcana: {
      summary:
        "Whenever you cast a necromancy spell, your effective caster level is increased by 1.",
      changes: [],
      contextNotes: [{ target: "allChecks", text: "+1 caster level only on necromancy spells." }],
    },
    swaps: [
      {
        replaces: "graveTouch",
        power: {
          id: "theBloodIsTheLife",
          level: 1,
          name: "The Blood Is the Life",
          summary:
            "Standard action: drink a recently-dead corporeal creature's blood for 1d6 healing and a full meal's worth of nourishment.",
          resourcePool: POOL_3_CHA,
        },
      },
    ],
  },

  "verdant-groveborn": {
    id: "verdant-groveborn",
    parentTag: "Verdant",
    name: "Groveborn",
    sources: UM("71"),
    arcana: {
      summary:
        "Your mind-affecting/language-dependent spells affect plant creatures as if they were humanoids who understood your language.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Extends mind-affecting/language-dependent spells to plants; apply manually.",
        },
      ],
    },
    swaps: [
      {
        replaces: "photosynthesis",
        power: {
          id: "lushSummoning",
          level: 3,
          name: "Lush Summoning",
          summary:
            "Creatures from your summon-monster (summoning subschool) spells gain +2 natural armor and +4 vs. paralysis/poison/polymorph/sleep/stunning.",
        },
      },
    ],
  },
};

/** Every hand-authored mutation, by `id`. */
export function resolveBloodlineMutation(id: string): BloodlineMutationDef | undefined {
  return BLOODLINE_MUTATIONS[id];
}

/**
 * Merge a mutation onto its resolved parent bloodline: the parent's powers
 * with each swap's target removed and its replacement power added, the
 * mutation's own arcana, and everything else (bonus feats, variant options,
 * tag) unchanged from the parent — the RAW shape (file doc comment).
 */
export function mutatedBloodlineDef(
  mutation: BloodlineMutationDef,
  parent: BloodlineDef,
): BloodlineDef {
  const replacedIds = new Set(mutation.swaps.map((s) => s.replaces));
  const kept = parent.powers.filter((p) => !replacedIds.has(p.id));
  const powers = [...kept, ...mutation.swaps.map((s) => s.power)].sort((a, b) => a.level - b.level);
  return {
    ...parent,
    name: `${mutation.name} (${parent.name})`,
    arcana: mutation.arcana,
    powers,
  };
}

/**
 * Resolve a picked bloodline tag (`doc.build.sorcererBloodline`) that may name
 * either a base bloodline OR a `SorcererBloodlineMutation.id` — the single
 * entry point both `collectModifiers`/`collectGrantedFeatures` (engine grant
 * resolution) and the builder's `BloodlinePicker` preview should use instead
 * of indexing `BLOODLINES`/calling `resolveSorcererBloodline` directly, so a
 * mutation choice resolves identically everywhere.
 *
 * A mutation id resolves only when its vendored `parentBloodlineId` matches a
 * bloodline `resolveSorcererBloodline` can find AND a hand-authored swap
 * table entry exists for it (both true for all 24 in the pinned slice); a
 * mutation the data adds ahead of a corresponding hand entry falls through to
 * `resolveSorcererBloodline`'s own handling of the raw tag, same "absent, not
 * wrong" posture as everywhere else in this codebase.
 */
export function resolveSorcererBloodlineOrMutation(
  tag: string,
  refData: RefData,
): MergedSorcererBloodlineEntry | undefined {
  const base = resolveSorcererBloodline(tag, refData);
  if (base) return base;

  const mutation = refData.sorcererBloodlineMutations?.[tag];
  const vendoredParent = mutation && refData.sorcererBloodlines[mutation.parentBloodlineId];
  const parent = vendoredParent && resolveSorcererBloodline(vendoredParent.name, refData);
  const mutationDef = mutation && BLOODLINE_MUTATIONS[mutation.id];
  if (mutation && parent && !parent.displayOnly && mutationDef) {
    return {
      ...mutatedBloodlineDef(mutationDef, parent),
      description: mutation.description,
      sources: mutation.sources ?? parent.sources,
      displayOnly: false,
    };
  }

  return undefined;
}

/**
 * The base bloodline tag a `doc.build.sorcererBloodline` value displays
 * under: `tag` unchanged if it already names a base bloodline, or its
 * mutation's resolved parent tag if it names a `SorcererBloodlineMutation.id`
 * instead — same "resolve a variant tag back to its parent" shape as
 * `parentDomainTagOf` (`apps/web/src/model/doc.ts`) does for a subdomain.
 * Bonus spells known, bonus feats, and class skill all key off THIS tag, not
 * the raw stored one (RAW: those three come from the base bloodline, only
 * arcana and swapped powers come from the mutation). Returns `tag` unchanged
 * for a tag that resolves to neither — soft-warning posture, never throws.
 */
export function parentBloodlineTagFor(tag: string, refData: RefData): string {
  if (BLOODLINES[tag]) return tag;
  const mutation = refData.sorcererBloodlineMutations?.[tag];
  const vendoredParent = mutation && refData.sorcererBloodlines[mutation.parentBloodlineId];
  if (!vendoredParent) return tag;
  const parent = resolveSorcererBloodline(vendoredParent.name, refData);
  return parent && !parent.displayOnly ? parent.tag : vendoredParent.name;
}

/**
 * Every mutation belonging to a given base bloodline tag (matched the same
 * normalized-name way `resolveSorcererBloodline` matches a hand tag against
 * the vendored catalog) — for `BloodlinePicker` to offer as a sub-choice once
 * that base bloodline is picked. Empty for a tag with no published mutations
 * (most of the vendored-only 41).
 */
export function mutationsForBloodlineTag(
  tag: string,
  refData: RefData,
): { id: string; name: string }[] {
  const normTag = normalizeBloodlineName(tag);
  const out: { id: string; name: string }[] = [];
  for (const mutation of Object.values(refData.sorcererBloodlineMutations ?? {})) {
    const parentVendored = refData.sorcererBloodlines[mutation.parentBloodlineId];
    if (!parentVendored || normalizeBloodlineName(parentVendored.name) !== normTag) continue;
    out.push({ id: mutation.id, name: mutation.name });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
