/**
 * Summoner (Unchained)'s eidolon subtype system (Pathfinder Unchained
 * "Eidolons (Unchained)") — the unchained variant's OWN evolution-pool
 * table plus 13 core outsider SUBTYPES (Aberrant/Agathion/Angel/Archon/
 * Azata/Daemon/Demon/Devil/Div/Elemental/Inevitable/Protean/Psychopomp),
 * each granting a themed set of free evolutions/resistances/immunities as
 * the eidolon's HD increase, in place of the chained (APG) eidolon's flat,
 * subtype-less pool. Clean-room, paraphrased from d20pfsrd.com's "Eidolons
 * (Unchained)" page during authoring (issue #74) — no Foundry source was
 * consulted (see DESIGN §6). Aberrant (Pathfinder Campaign Setting: Horror
 * Realms) was added later, cross-checked against aonprd.com's "Subtypes -
 * Eidolon (Unchained)" page and the raw OGL dataset's `aberrant` entry.
 *
 * `deriveEidolon` (`eidolon.ts`) owns the actual derivation branch; this
 * module is pure data plus small lookup helpers, mirroring how `eidolon.ts`
 * itself separates data tables from derivation.
 *
 * Table: Eidolon Base Statistics (Unchained) — every column EXCEPT
 * `evolutionPool`/`special` is numerically IDENTICAL to the chained
 * {@link EIDOLON_PROGRESSION} (verified row-by-row against d20pfsrd.com
 * during authoring), so {@link eidolonUnchainedProgressionRow} reuses
 * {@link eidolonProgressionRow} rather than re-transcribing HD/BAB/saves/
 * armor/Str-Dex bonus/max attacks/skill points/bonus feats.
 *
 * Base forms: every unchained base form grants a flat +2 natural armor
 * that the chained forms don't (folded into `deriveEidolon`'s unchained
 * branch, not into {@link EIDOLON_BASE_FORMS} itself, since that table is
 * shared with the chained derivation). More importantly, a base form's free
 * evolutions — and therefore its natural attacks — are SUBTYPE-specific in
 * unchained (e.g. an Angel biped has a slam, not the chained Biped's
 * claws); {@link EIDOLON_SUBTYPES}' `baseForms` carry the real per-subtype
 * attack list, and `deriveEidolon` only falls back to the chained form's
 * `baseAttacks` when no subtype is set (or the subtype doesn't model the
 * chosen form) — a soft-warning posture, never a missing/undefined result.
 *
 * Only the four base forms this codebase models (Biped/Quadruped/
 * Serpentine/Aberrant) appear in any subtype's `baseForms` below — APG's
 * other three (Aquatic/Avian/Tauric) remain deferred, see
 * {@link EIDOLON_BASE_FORMS}'s module doc comment. Elemental is split into
 * four separate subtype ids (air/earth/fire/water) since the eidolon's
 * element is chosen permanently at first summoning.
 *
 * Every subtype grant is either a paraphrased display-only `note` (the
 * overwhelming majority — resistances, immunities, DR, spell-likes, and
 * every other prose-only rule this codebase doesn't have a numeric hook
 * for) or one of a small, explicit set of STRUCTURED numeric fields
 * (`poolBonus`, `abilityIncrease`, `landSpeedBonus`, `evolutionIds`) —
 * same honesty-bar split `eidolon.ts`'s own `displayOnly` evolutions use.
 * `evolutionIds` free-grants a real {@link EIDOLON_EVOLUTIONS} entry (e.g.
 * "flight", "burrow", "swim") at zero pool cost, reusing that evolution's
 * own numeric shape rather than re-deriving the effect here.
 */

import type { CharacterDoc } from "@pf1/schema";

import {
  eidolonProgressionRow,
  eidolonSummonerLevel,
  type EidolonAttackGrant,
  type EidolonProgressionRow,
} from "./eidolon.js";

/**
 * Evolution pool by unchained summoner level 1–20 (d20pfsrd.com "Table:
 * Eidolon Base Statistics" [Unchained], "Evolution Pool" column) — smaller
 * at every level than the chained {@link EIDOLON_PROGRESSION}'s pool, the
 * trade-off for a subtype's free themed grants.
 */
export const EIDOLON_UNCHAINED_POOL: readonly number[] = [
  1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15,
];

/**
 * Special-abilities column by unchained summoner level 1–20 (same table as
 * above). Differs from the chained column only in WHEN "Ability Score
 * Increase" appears (5th/10th/15th here vs. not existing as a chained
 * special at all — the chained eidolon's ability increase is a plain
 * evolution pick, not an automatic table grant; see {@link EidolonBuild}'s
 * doc comment for the schema-level split).
 */
const EIDOLON_UNCHAINED_SPECIAL_BY_LEVEL: readonly string[][] = [
  ["Darkvision", "Link", "Share Spells"],
  ["Evasion"],
  [],
  [],
  ["Ability Score Increase"],
  ["Devotion"],
  [],
  [],
  ["Multiattack"],
  ["Ability Score Increase"],
  [],
  [],
  [],
  ["Improved Evasion"],
  ["Ability Score Increase"],
  [],
  [],
  [],
  [],
  [],
];

/**
 * The unchained progression row for `level`, clamped to [1, 20] — every
 * column except `evolutionPool`/`special` is the chained row unchanged (see
 * module doc comment); only those two are swapped for the unchained table's
 * own values.
 */
export function eidolonUnchainedProgressionRow(level: number): EidolonProgressionRow {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  const chained = eidolonProgressionRow(clamped);
  return {
    ...chained,
    evolutionPool: EIDOLON_UNCHAINED_POOL[clamped - 1]!,
    special: EIDOLON_UNCHAINED_SPECIAL_BY_LEVEL[clamped - 1]!,
  };
}

/**
 * Every special-ability name unlocked by `level` (cumulative — union of
 * every row up to and including it). Unlike `eidolonSpecialAbilityNames`/
 * `phantomSpecialAbilityNames`/`companionSpecialAbilityNames` (which all
 * FILTER OUT "Ability Score Increase" from the cumulative list, since it's
 * tracked separately as a numeric slot count), this one deliberately KEEPS
 * it — the unchained ability increase has its own detail string in
 * `EIDOLON_SPECIAL_ABILITY_DETAIL` so the chip is still informative, and
 * `abilityIncreaseSlots` on `DerivedEidolon` is additive display, not a
 * replacement for the chip. It appears ONCE even though the table grants it
 * at 5th/10th/15th — the UIs key chips by name, and the slot COUNT is
 * carried by `abilityIncreaseSlots`, not by chip repetition.
 */
export function eidolonUnchainedSpecialAbilityNames(level: number): string[] {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  const names: string[] = [];
  for (let i = 0; i < clamped; i++) {
    for (const name of EIDOLON_UNCHAINED_SPECIAL_BY_LEVEL[i]!) {
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

/** Unchained summoner levels at which an eidolon gains an automatic +1 Ability Score Increase (d20pfsrd.com: 5th, 10th, 15th). */
export const EIDOLON_UNCHAINED_ABILITY_INCREASE_LEVELS: readonly number[] = [5, 10, 15];

/** How many automatic Ability Score Increase slots an unchained eidolon has earned by `level`. */
export function eidolonUnchainedAbilityIncreaseSlots(level: number): number {
  return EIDOLON_UNCHAINED_ABILITY_INCREASE_LEVELS.filter((l) => l <= level).length;
}

/** One themed grant a subtype gives at a specific milestone level (1st/4th/8th/12th/16th/20th). */
export interface EidolonSubtypeGrant {
  level: number;
  /** Paraphrased, display-only summary of everything granted at this level (always present). */
  note: string;
  /** Structured free evolution(s), applied like a build pick at zero pool cost (e.g. `["flight"]`, `["swim", "swim"]`). */
  evolutionIds?: readonly string[];
  /** Added to the evolution pool total once this grant is unlocked. */
  poolBonus?: number;
  /** A free +2 to one ability score, targeted by `EidolonBuild.subtypeGrantChoices[String(level)]` (defaults to Str). */
  abilityIncrease?: boolean;
  /** Flat feet added to LAND speed once unlocked (e.g. the Fire Elemental's +20 ft. at 8th) — derived speeds (climb/swim/fly/burrow) are based on the resulting land speed. */
  landSpeedBonus?: number;
}

/** One base form's subtype-specific free evolutions and resulting natural attacks. */
export interface EidolonSubtypeForm {
  /** Display-chip names for the form's free evolutions (the subtype's parenthetical list), already reflected in `attacks`/`freeEvolutionIds`. */
  freeNames: readonly string[];
  /** The form's actual natural attacks under this subtype — authored explicitly (may be empty, e.g. a weapon-wielding Azata biped). */
  attacks: readonly EidolonAttackGrant[];
  /** Structured non-attack free evolutions the form grants (e.g. the Elemental serpentine form's Improved Natural Armor), applied at zero pool cost. */
  freeEvolutionIds?: readonly string[];
}

/** One of the 28 modeled Pathfinder Unchained eidolon subtypes. */
export interface EidolonSubtypeDef {
  id: string;
  name: string;
  /** Canonical alignment codes this subtype requires of the eidolon (e.g. `["LG", "NG", "CG"]`), matching `apps/web/src/model/alignment.ts`'s uppercase code convention — for a soft warning only, never enforced here. */
  alignments: readonly string[];
  /** Human-readable alignment requirement (e.g. "Any good"). */
  alignmentText: string;
  /** Subtype-specific free evolutions/attacks, keyed by base-form id — only the modeled forms (biped/quadruped/serpentine) this subtype actually offers appear here. */
  baseForms: Readonly<Record<string, EidolonSubtypeForm>>;
  /** Themed grants at 1st/4th/8th/12th/16th/20th — not every subtype has an entry at every one of those levels. */
  grants: readonly EidolonSubtypeGrant[];
}

const ELEMENTAL_BASE_FORMS: Readonly<Record<string, EidolonSubtypeForm>> = {
  biped: {
    freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
    attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
  },
  quadruped: {
    freeNames: ["Bite", "Limbs (legs) x2"],
    attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
  },
  serpentine: {
    freeNames: ["Bite", "Improved Natural Armor", "Reach (bite)", "Tail", "Tail Slap"],
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d6" },
      { name: "Tail slap", count: 1, damageDice: "1d6" },
    ],
    freeEvolutionIds: ["improved-natural-armor"],
  },
};

interface ElementalVariant {
  id: string;
  name: string;
  immuneEnergy: string;
  eighthNote: string;
  eighthEvolutionIds?: readonly string[];
  eighthLandSpeedBonus?: number;
  twentiethNote: string;
}

/** The four elements — same shared form/grant shape, differing only in which energy they're immune to and their 8th/20th-level element flavor (see module doc comment for why this is 4 separate subtype ids rather than an element sub-choice). */
const ELEMENTAL_VARIANTS: readonly ElementalVariant[] = [
  {
    id: "elemental-air",
    name: "Elemental (Air)",
    immuneEnergy: "electricity",
    eighthNote:
      "Gains the Flight evolution for free (a magic fly speed equal to its base land speed).",
    eighthEvolutionIds: ["flight"],
    twentiethNote:
      "Can transform into a whirlwind, as an air elemental's whirlwind special attack.",
  },
  {
    id: "elemental-earth",
    name: "Elemental (Earth)",
    immuneEnergy: "acid",
    eighthNote:
      "Gains the Burrow evolution for free (a burrow speed equal to half its base land speed).",
    eighthEvolutionIds: ["burrow"],
    twentiethNote:
      "Earth mastery (a bonus on attack and damage rolls when both combatants touch the ground) and DR 5/—.",
  },
  {
    id: "elemental-fire",
    name: "Elemental (Fire)",
    immuneEnergy: "fire",
    eighthNote: "+20 feet of land speed.",
    eighthLandSpeedBonus: 20,
    twentiethNote:
      "Attacks deal additional fire damage, and it can ignite flammable materials with a touch (burn).",
  },
  {
    id: "elemental-water",
    name: "Elemental (Water)",
    immuneEnergy: "cold",
    eighthNote:
      "Gains the Swim evolution twice for free (a swim speed equal to its base land speed + 20 feet) and the Gills evolution (breathes water indefinitely).",
    eighthEvolutionIds: ["swim", "swim"],
    twentiethNote:
      "Drench (can extinguish fires with a touch) and vortex (can transform into a whirlpool).",
  },
];

function elementalSubtype(v: ElementalVariant): EidolonSubtypeDef {
  return {
    id: v.id,
    name: v.name,
    alignments: ["N"],
    alignmentText: "Neutral",
    baseForms: ELEMENTAL_BASE_FORMS,
    grants: [
      {
        level: 1,
        note: `Immunity to paralysis and sleep effects, and immunity to ${v.immuneEnergy}.`,
      },
      { level: 4, note: "+1 evolution pool point.", poolBonus: 1 },
      {
        level: 8,
        note: v.eighthNote,
        evolutionIds: v.eighthEvolutionIds,
        landSpeedBonus: v.eighthLandSpeedBonus,
      },
      { level: 12, note: "Immunity to bleed and poison, and cannot be flanked." },
      { level: 16, note: "Immunity to critical hits and precision damage." },
      { level: 20, note: v.twentiethNote },
    ],
  };
}

const CORE_SUBTYPES: Readonly<Record<string, EidolonSubtypeDef>> = {
  /**
   * Pathfinder Campaign Setting: Horror Realms (d20pfsrd.com's "Eidolons
   * (Unchained)" page, aonprd.com's "Subtypes - Eidolon (Unchained)" page,
   * and the raw OGL dataset's `aberrant` entry all agree on the text below).
   * The 1st-level class-skill swap (Escape Artist/Intimidate/Knowledge/
   * Perception/Climb-Fly-or-Swim, plus 4 summoner-chosen skills) and the
   * "counts as both aberration and outsider" typing are prose notes, not
   * numeric grants — this codebase doesn't model per-eidolon class-skill
   * lists or creature-type-keyed effects (same honesty-bar posture as every
   * other subtype's 1st-level note).
   */
  aberrant: {
    id: "aberrant",
    name: "Aberrant",
    alignments: ["CE", "CN", "N", "NE"],
    alignmentText: "Chaotic evil, chaotic neutral, neutral, or neutral evil",
    baseForms: {
      aberrant: {
        freeNames: ["Bite", "Grab (tentacle mass)", "Tentacle Mass"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tentacle mass", count: 1, damageDice: "1d8" },
        ],
      },
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
      quadruped: {
        freeNames: ["Bite", "Limbs (legs) x2"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
      serpentine: {
        freeNames: ["Bite", "Grab (bite)", "Reach (bite)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Escape Artist, Intimidate, Knowledge (one), Perception, and Climb/Fly/Swim (one) become class skills, plus 4 more of the summoner's choice (not individually modeled); counts as both an aberration and an outsider; +4 racial bonus on saves against mind-affecting effects.",
      },
      { level: 4, note: "+1 evolution pool point.", poolBonus: 1 },
      {
        level: 8,
        note: "Immunity to mind-affecting effects, including effects that grant morale bonuses.",
      },
      { level: 12, note: "DR 5/slashing, and the Blindsense evolution as a bonus evolution." },
      { level: 16, note: "The Blindsight evolution, and telepathy with a range of 100 feet." },
      {
        level: 20,
        note: "Can use transmogrify as a quickened spell-like ability once per day, and can benefit from the transmogrify spell any number of times per day.",
      },
    ],
  },
  agathion: {
    id: "agathion",
    name: "Agathion",
    alignments: ["NG"],
    alignmentText: "Neutral good",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
      quadruped: {
        freeNames: ["Bite", "Limbs (legs) x2"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to electricity 5, plus a +4 racial bonus on saves against poison and petrification.",
      },
      { level: 4, note: "Cold resistance 10 and sonic resistance 10." },
      {
        level: 8,
        note: "Lay on hands, usable as a paladin whose level equals the eidolon's Hit Dice.",
      },
      { level: 12, note: "DR 5/evil, immunity to petrification, and truespeech." },
      {
        level: 16,
        note: "Immunity to electricity (replacing the 1st-level resistance) and the ability to speak with animals.",
      },
      { level: 20, note: "Detect thoughts at will, and DR 10/evil (replacing the 12th-level DR)." },
    ],
  },
  angel: {
    id: "angel",
    name: "Angel",
    alignments: ["LG", "NG", "CG"],
    alignmentText: "Any good",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to acid 5 and cold 5, plus a +4 racial bonus on saves against poison.",
      },
      { level: 4, note: "Electricity resistance 10 and fire resistance 10." },
      {
        level: 8,
        note: "Gains the Flight evolution for free (a fly speed equal to its base land speed).",
        evolutionIds: ["flight"],
      },
      { level: 12, note: "DR 5/evil, immunity to petrification, and truespeech." },
      {
        level: 16,
        note: "Immunity to acid and immunity to cold (replacing the 1st-level resistances).",
      },
      { level: 20, note: "A protective aura that wards nearby allies from harm." },
    ],
  },
  archon: {
    id: "archon",
    name: "Archon",
    alignments: ["LG"],
    alignmentText: "Lawful good",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to electricity 5, the Skilled evolution (Intimidate), and a +4 racial bonus on saves against poison.",
      },
      { level: 4, note: "+1 evolution pool point.", poolBonus: 1 },
      {
        level: 8,
        note: "A free +2 ability score increase (summoner's choice).",
        abilityIncrease: true,
      },
      { level: 12, note: "DR 5/evil, immunity to petrification, and truespeech." },
      {
        level: 16,
        note: "Immunity to electricity (replacing the 1st-level resistance) and an aura of menace that shakes nearby foes.",
      },
      {
        level: 20,
        note: "Greater teleport at will (self plus 50 lbs. of objects, caster level 14th).",
      },
    ],
  },
  azata: {
    id: "azata",
    name: "Azata",
    alignments: ["CG"],
    alignmentText: "Chaotic good",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)"],
        attacks: [],
      },
      serpentine: {
        freeNames: ["Limbs (arms)", "Tail", "Tail Slap"],
        attacks: [{ name: "Tail slap", count: 1, damageDice: "1d6" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to electricity 5, and weapon training (proficiency with all simple and martial weapons).",
      },
      { level: 4, note: "Cold resistance 10 and fire resistance 10." },
      {
        level: 8,
        note: "Gains the Flight evolution for free (a fly speed equal to its base land speed).",
        evolutionIds: ["flight"],
      },
      { level: 12, note: "DR 5/evil, immunity to petrification, and truespeech." },
      {
        level: 16,
        note: "Immunity to electricity (replacing the 1st-level resistance) and a free +2 ability score increase (summoner's choice).",
        abilityIncrease: true,
      },
      {
        level: 20,
        note: "Energy form: as a standard action, becomes incorporeal and composed of pure energy.",
      },
    ],
  },
  daemon: {
    id: "daemon",
    name: "Daemon",
    alignments: ["NE"],
    alignmentText: "Neutral evil",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
      quadruped: {
        freeNames: ["Bite", "Limbs (legs) x2"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
      serpentine: {
        freeNames: ["Bite", "Reach (bite)", "Reach (sting)", "Sting", "Tail"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Sting", count: 1, damageDice: "1d4" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to acid 5, plus a +4 racial bonus on saves against death effects, disease, and poison.",
      },
      { level: 4, note: "Cold resistance 10, electricity resistance 10, and fire resistance 10." },
      { level: 8, note: "+1 evolution pool point.", poolBonus: 1 },
      { level: 12, note: "DR 5/good, and immunity to death effects, disease, and poison." },
      {
        level: 16,
        note: "Immunity to acid (replacing the 1st-level resistance) and telepathy 100 ft.",
      },
      {
        level: 20,
        note: "As a standard action, can devour the soul of a dying creature for a profane bonus.",
      },
    ],
  },
  demon: {
    id: "demon",
    name: "Demon",
    alignments: ["CE"],
    alignmentText: "Chaotic evil",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
      quadruped: {
        freeNames: ["Bite", "Limbs (legs) x2"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
      serpentine: {
        freeNames: ["Bite", "Improved Damage (bite)", "Reach (bite)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d8" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to electricity 5 and fire 5, plus a +4 racial bonus on saves against poison.",
      },
      { level: 4, note: "Acid resistance 10 and cold resistance 10." },
      {
        level: 8,
        note: "Immunity to poison (replacing the 1st-level save bonus) and +1 evolution pool point.",
        poolBonus: 1,
      },
      {
        level: 12,
        note: "DR 5/good and a free +2 ability score increase (summoner's choice).",
        abilityIncrease: true,
      },
      {
        level: 16,
        note: "Immunity to electricity (replacing the 1st-level resistance) and telepathy 100 ft.",
      },
      { level: 20, note: "Constant true seeing." },
    ],
  },
  devil: {
    id: "devil",
    name: "Devil",
    alignments: ["LE"],
    alignmentText: "Lawful evil",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to fire 5, the Skilled evolution (Bluff), and a +4 racial bonus on saves against poison.",
      },
      { level: 4, note: "Acid resistance 10 and cold resistance 10." },
      { level: 8, note: "The Skilled evolution (Diplomacy) and immunity to poison." },
      { level: 12, note: "DR 5/good and see in darkness." },
      {
        level: 16,
        note: "Immunity to fire (replacing the 1st-level resistance) and telepathy 100 ft.",
      },
      { level: 20, note: "Regeneration 5, overcome only by good-aligned weapons or spells." },
    ],
  },
  div: {
    id: "div",
    name: "Div",
    alignments: ["NE"],
    alignmentText: "Neutral evil",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
    },
    grants: [
      { level: 1, note: "Resistance to fire 5, plus a +4 racial bonus on saves against poison." },
      { level: 4, note: "Acid resistance 10 and electricity resistance 10." },
      {
        level: 8,
        note: "+1 evolution pool point and immunity to poison.",
        poolBonus: 1,
      },
      { level: 12, note: "DR 5/good and see in darkness." },
      {
        level: 16,
        note: "Immunity to fire (replacing the 1st-level resistance) and telepathy 100 ft.",
      },
      {
        level: 20,
        note: "Greater teleport at will (self plus 50 lbs. of objects, caster level 14th).",
      },
    ],
  },
  inevitable: {
    id: "inevitable",
    name: "Inevitable",
    alignments: ["LN"],
    alignmentText: "Lawful neutral",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Counts as both a construct and an outsider for effects keyed to type, plus a +4 racial bonus on saves against death effects, disease, necromancy, paralysis, poison, sleep, and stun.",
      },
      {
        level: 4,
        note: "A +4 racial bonus on saves against mind-affecting effects, and immunity to nonlethal damage, fatigue, and exhaustion.",
      },
      { level: 8, note: "Immunity to death effects, disease, and poison." },
      { level: 12, note: "DR 5/chaotic, immunity to sleep effects, and truespeech." },
      {
        level: 16,
        note: "Immunity to ability damage, ability drain, energy drain, and necromancy effects (replacing the 4th-level bonus against necromancy).",
      },
      {
        level: 20,
        note: "Immunity to paralysis, sleep, stun, and any effect that allows a Fortitude save, unless it can affect objects.",
      },
    ],
  },
  protean: {
    id: "protean",
    name: "Protean",
    alignments: ["CN"],
    alignmentText: "Chaotic neutral",
    baseForms: {
      serpentine: {
        freeNames: ["Bite", "Grab (tail slap)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      { level: 1, note: "Resistance to acid 5 and the Grab evolution." },
      { level: 4, note: "Electricity resistance 10 and sonic resistance 10." },
      { level: 8, note: "The Constrict evolution." },
      {
        level: 12,
        note: "DR 5/lawful, blindsense, and the Flight evolution for free (perfect maneuverability, no wings needed).",
        evolutionIds: ["flight"],
      },
      {
        level: 16,
        note: "Immunity to acid (replacing the 1st-level resistance) and an amorphous anatomy that resists precision damage and critical hits.",
      },
      {
        level: 20,
        note: "Constant freedom of movement, and can change shape as though using greater polymorph.",
      },
    ],
  },
  psychopomp: {
    id: "psychopomp",
    name: "Psychopomp",
    alignments: ["N"],
    alignmentText: "Neutral",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
      quadruped: {
        freeNames: ["Bite", "Limbs (legs) x2"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
      serpentine: {
        freeNames: ["Bite", "Pull (bite)", "Reach (bite)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      { level: 1, note: "Immunity to death effects, disease, and poison." },
      { level: 4, note: "Cold resistance 10 and electricity resistance 10." },
      {
        level: 8,
        note: "Spirit touch (natural attacks count as magic against incorporeal creatures) and +1 evolution pool point.",
        poolBonus: 1,
      },
      { level: 12, note: "DR 5/adamantine and spiritsense." },
      {
        level: 16,
        note: "A free +2 ability score increase (summoner's choice) and invisibility (self only), usable at will.",
        abilityIncrease: true,
      },
      {
        level: 20,
        note: "DR 10/adamantine (replacing the 12th-level DR), plus immunity to cold and immunity to electricity.",
      },
    ],
  },
  // ---- splatbook subtypes (issue #74 content pass; see each entry's
  // source comment). Tapestry-Warped is deliberately absent: it is
  // third-party (non-Paizo) content with no vendored or AoN counterpart
  // to verify against, so it fails the provenance bar. --------------
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Genie" entry,
  // Elemental Master's Handbook p. 27), cross-checked against the pinned
  // pfdata JSON's "genie" entry. ONE subtype id, deliberately NOT split into
  // per-genie-kind variants: unlike Elemental (whose element choice fixes a
  // whole column of grants), RAW's Genie text never names genie kinds — it
  // gives the summoner two fully independent free choices (any one energy
  // type at 1st/12th; flight, burrow, or gills+swim at 8th), and a variant
  // split would forbid RAW-legal combinations (e.g. fire resistance plus
  // flight). Both choices stay prose until a choose-one-of grant mechanism
  // exists (see the coverage note).
  genie: {
    id: "genie",
    name: "Genie",
    alignments: ["CG", "CN", "LE", "LN", "N"],
    alignmentText: "Chaotic good, chaotic neutral, lawful evil, lawful neutral, or neutral",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "The 4-point Weapon Training evolution (proficiency with all simple and martial weapons), and the Resistance evolution against any one energy type of the summoner's choice.",
      },
      {
        level: 4,
        note: "Twice per day as a full-round action, can grow to Large size for 1 round per Hit Die (as the Large evolution, but temporary and non-stacking); permanently purchasing the Large evolution later instead adds +1 evolution pool point.",
      },
      {
        level: 8,
        note: "Gains one of the following for free (summoner's choice): the Flight evolution (a magic fly speed equal to its base land speed), the Burrow evolution, or the Gills evolution plus the Swim evolution twice (swim speed equal to base land speed + 20 ft.). The pick isn't automated here — apply the chosen evolution by hand.",
      },
      {
        level: 12,
        note: "Loses the 1st-level Resistance evolution and instead gains Immunity to that same energy type; plane shift (self plus willing targets, to the Astral Plane, an Elemental Plane, or the Material Plane only) as a spell-like ability once per day, CL 12th.",
      },
      {
        level: 16,
        note: "Once per day as a standard action, in response to the summoner's spoken wish, can cast cleanse or greater evolution surge (CL 16th) on itself as a spell-like ability.",
      },
      {
        level: 20,
        note: "Gains the 20th-level base evolutions of an Elemental eidolon of any one element, summoner's choice.",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Aeon" entry,
  // Plane-Hopper's Handbook p.24), cross-checked against the pinned pfdata
  // JSON's "aeon" entry. See aeon.report.md for details.
  aeon: {
    id: "aeon",
    name: "Aeon",
    alignments: ["N"],
    alignmentText: "Neutral",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
      serpentine: {
        freeNames: ["Limbs (arms)", "Slam", "Tail"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "The envisaging ability (a limited precognitive sense of danger), and a +4 racial bonus on saves against poison. Half of any armor/natural armor bonus the eidolon would gain per level instead becomes a deflection bonus to AC.",
      },
      {
        level: 4,
        note: "The benefits of the moderate fortification armor special ability (25% chance to negate a critical hit or sneak attack), and immunity to being tripped.",
      },
      {
        level: 8,
        note: "Gains the Flight evolution for free (a fly speed equal to its base land speed, using magic).",
        evolutionIds: ["flight"],
      },
      {
        level: 12,
        note: "As a standard action, can influence either emotions (crushing despair on up to 5 targets in 30 ft., each failed save then spreading good hope to one other creature) or time (as above, but slow/haste) — usable a number of times per day equal to 1/5 HD, and the summoner can change which it affects whenever he gains a level.",
      },
      { level: 16, note: "Immunity to critical hits, poison, and sneak attacks." },
      {
        level: 20,
        note: "Moment of prescience (caster level 20th) as a spell-like ability, 3/day.",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Ancestor" entry,
  // Blood of the Beast p.31), cross-checked against the pinned pfdata JSON's
  // "ancestor" entry. See ancestor.report.md for details — this subtype has
  // NO structured numeric grants (see report for why).
  ancestor: {
    id: "ancestor",
    name: "Ancestor",
    // "Any" — no alignment subtype at all (see alignmentText); all 9 codes
    // listed so the soft-warning check never fires, matching this codebase's
    // "no restriction" convention.
    alignments: ["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"],
    alignmentText: "Any (an ancestor eidolon has no alignment subtype)",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)"],
        attacks: [],
      },
    },
    grants: [
      {
        level: 1,
        note: "Gains all the standard racial traits of the summoner's race (a summoner who isn't a 0-HD race chooses one 0-HD race), and counts as that race's type/subtype for most effects (not feat prerequisites). No alternate racial traits.",
      },
      {
        level: 4,
        note: "Chooses a simple class template — Fighter, Rogue, or Sorcerer — and gains that template's quick-rule abilities as a 1-HD creature.",
      },
      {
        level: 8,
        note: "The Skilled evolution twice, on two skills from the chosen template's class skill list.",
      },
      {
        level: 12,
        note: "The chosen simple class template's quick-rule abilities as a 5-HD creature (replacing the 4th-level 1-HD version).",
      },
      {
        level: 16,
        note: "A bonus feat from Dodge, Great Fortitude, Improved Initiative, Iron Will, Lightning Reflexes, Toughness, or any feat listing the chosen race as a prerequisite (prerequisites must still be met).",
      },
      {
        level: 20,
        note: "The chosen simple class template's quick-rule abilities as a 10-HD creature (replacing the 12th-level 5-HD version).",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Astral" entry,
  // Plane-Hopper's Handbook p.24), cross-checked against the pinned pfdata
  // JSON's "astral" entry. See astral.report.md for details.
  astral: {
    id: "astral",
    name: "Astral",
    alignments: ["N"],
    alignmentText: "Neutral",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
      serpentine: {
        freeNames: ["Bite", "Magic Attacks", "Reach (bite)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Immunity to aging, and a +4 racial bonus on saves against curses, diseases, and poisons. The summoner's class level is halved for the purpose of the eidolon's Str/Dex table bonus (an unmodeled reduction — see report).",
      },
      {
        level: 4,
        note: "Augment summoning 3/day: readies an action to meld with a creature the summoner summons, granting it up to 1 point of the eidolon's own evolutions per 3 eidolon HD and temporary hit points (1d8 + eidolon HD) for the duration.",
      },
      {
        level: 8,
        note: "Gains the Flight evolution for free (a fly speed equal to its base land speed, using magic).",
        evolutionIds: ["flight"],
      },
      {
        level: 12,
        note: "Augment summoning 2 additional times/day, and a melded creature also gains the eidolon's Evasion and Devotion abilities.",
      },
      {
        level: 16,
        note: "Immunity to curses, diseases, and poisons (replacing the 1st-level bonus); the summoner's aspect/greater aspect diversion pool grows by 50% (or is granted at 1 point if he lacks it), and no longer suffers ability penalties from aging.",
      },
      {
        level: 20,
        note: "Can meld with every creature summoned by a single summon monster effect simultaneously, and is no longer staggered when a meld ends.",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Deepwater" entry,
  // Blood of the Sea p.23), cross-checked against the pinned pfdata JSON's
  // "deepwater" entry. See deepwater.report.md for details.
  deepwater: {
    id: "deepwater",
    name: "Deepwater",
    alignments: ["CE", "CN", "N", "NE"],
    alignmentText: "Chaotic evil, chaotic neutral, neutral, or neutral evil",
    baseForms: {
      serpentine: {
        freeNames: ["Bite", "Grab (tail slap)", "Reach (tail slap)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Gains the Gills evolution (breathes water indefinitely), Resistance (cold) evolution, and Swim evolution for free (a swim speed equal to its base land speed).",
        evolutionIds: ["swim"],
      },
      {
        level: 4,
        note: "The jet ability (a burst of speed through water, 200 ft.), and its darkvision range increases to 120 ft.",
      },
      {
        level: 8,
        note: "The Poison evolution on its tail slap and tentacle attacks (usable once per round); the summoner can spend 2 evolution points to make it deal Constitution damage instead of Strength damage.",
      },
      {
        level: 12,
        note: "DR 5/magic, and the Rend evolution on tentacle attacks (in place of the usual claw-attack requirement).",
      },
      {
        level: 16,
        note: "Loses the 1st-level Resistance (cold) evolution and instead gains Immunity (cold).",
      },
      { level: 20, note: "Constant freedom of movement, and fast healing 5." },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Kami" entry,
  // Wilderness Origins p.18), cross-checked against the pinned pfdata JSON's
  // "kami" entry. See kami.report.md for details — this subtype has NO
  // structured numeric grants (see report for why).
  kami: {
    id: "kami",
    name: "Kami",
    alignments: ["LG", "NG", "CG", "LN", "N", "CN"],
    alignmentText: "Any non-evil",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "The Resistance (fire) evolution, and the 4-point Weapon Training evolution (proficiency with martial weapons).",
      },
      { level: 4, note: "Acid resistance 10 and cold resistance 10." },
      {
        level: 8,
        note: "As a standard action, can declare a ward once per day (an object, a plant, or a creature with Int 2 or less); while within 60 ft. of its ward, both gain a +2 sacred bonus on saves.",
      },
      {
        level: 12,
        note: "The 4-point Fast Healing evolution, and the merge-with-ward ability (the eidolon can meld into its ward, automatically emerging if the ward loses its designation).",
      },
      {
        level: 16,
        note: "Immunity to bleed, mind-affecting, petrification, and polymorph effects.",
      },
      {
        level: 20,
        note: "Its Fast Healing evolution's rate increases by 2 within 30 ft. of its ward, and its merged ward shares that bonus.",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Kyton" entry,
  // Curse of the Crimson Throne p.431), cross-checked against the pinned
  // pfdata JSON's "kyton" entry. See kyton.report.md for details.
  kyton: {
    id: "kyton",
    name: "Kyton",
    alignments: ["LE"],
    alignmentText: "Lawful evil",
    baseForms: {
      biped: {
        freeNames: ["Improved Natural Armor", "Limbs (arms)", "Limbs (legs)"],
        attacks: [],
        freeEvolutionIds: ["improved-natural-armor"],
      },
    },
    grants: [
      {
        level: 1,
        note: "The Resistance (cold) and Skilled (Heal) evolutions, and proficiency with the spiked chain.",
      },
      { level: 4, note: "+1 evolution pool point.", poolBonus: 1 },
      {
        level: 8,
        note: "An unnerving gaze (30 ft., Will negates, mind-affecting fear) that sickens one target for 1 round as a free action on the kyton's turn; other kytons and its own summoner are immune.",
      },
      {
        level: 12,
        note: "DR 5/good; its unnerving gaze now lasts 1d3 rounds and can target up to 2 creatures per round.",
      },
      {
        level: 16,
        note: "Loses the 1st-level Resistance (cold) evolution and instead gains Immunity (cold); its unnerving gaze now staggers instead of sickens, and can target up to 3 creatures per round.",
      },
      {
        level: 20,
        note: "Regeneration 5, overcome only by good-aligned weapons or spells.",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Radiant" entry,
  // Plane-Hopper's Handbook p.25), cross-checked against the pinned pfdata
  // JSON's "radiant" entry. See radiant.report.md for details.
  radiant: {
    id: "radiant",
    name: "Radiant",
    alignments: ["N"],
    alignmentText: "Neutral",
    baseForms: {
      biped: {
        freeNames: ["Bite", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
      quadruped: {
        freeNames: ["Claws", "Limbs (legs) x2"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
    },
    grants: [
      {
        level: 1,
        note: "Immunity to death effects and energy drain. Unaffected — neither helped nor harmed — by the Positive Energy Plane's positive-dominant trait, and regains 1 additional hit point per die from magical healing.",
      },
      {
        level: 4,
        note: "Natural attacks strike incorporeal creatures as though they were ghost touch weapons. Glows as the light spell (effective spell level equal to half its Hit Dice, rounded down), suppressible or resumable as a standard action.",
      },
      {
        level: 8,
        note: "Grows feathery wings and gains the Flight evolution for free (a fly speed equal to its base land speed).",
        evolutionIds: ["flight"],
      },
      { level: 12, note: "Gains the Fast Healing evolution." },
      {
        level: 16,
        note: "Can cast cure serious wounds three times per day (caster level equal to its Hit Dice). If its summoner drops unconscious or dies from hit point loss within 60 feet, the eidolon can die as an immediate action to grant the summoner the benefits of breath of life.",
      },
      {
        level: 20,
        note: "Deals an extra 2 points of damage per die against undead when attacking with the energy attacks or breath weapon evolutions, and any magical healing it receives functions at full potential, as if the healer had used the Maximize Spell feat.",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Shadow" entry,
  // Blood of Shadows p.11), cross-checked against the pinned pfdata JSON's
  // "shadow" entry. See shadow.report.md for details.
  shadow: {
    id: "shadow",
    name: "Shadow",
    alignments: ["LN", "N", "CN", "LE", "NE", "CE"],
    alignmentText: "Any nongood",
    baseForms: {
      biped: {
        freeNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
        attacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
      },
      quadruped: {
        freeNames: ["Bite", "Limbs (legs) x2"],
        attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
      },
      serpentine: {
        freeNames: ["Bite", "Improved Natural Armor", "Reach (bite)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
        freeEvolutionIds: ["improved-natural-armor"],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to cold 5 and electricity 5, and the ability to cast darkness as a spell-like ability three times per day (caster level equal to its Hit Dice).",
      },
      {
        level: 4,
        note: "Blends effortlessly into shadow: 20% concealment in any illumination dimmer than bright light, or a 50% miss chance in dim light or darkness (not total concealment). Can be suspended or resumed as a free action.",
      },
      {
        level: 8,
        note: "DR 5/magic, darkvision out to 90 feet, and +1 evolution pool point.",
        poolBonus: 1,
      },
      {
        level: 12,
        note: "Trades its darkness spell-like ability for deeper darkness (also three times per day), and gains the see in darkness universal monster ability.",
      },
      {
        level: 16,
        note: "Damage reduction improves to DR 10/magic (replacing the 8th-level DR), and gains the Spell Resistance evolution.",
      },
      {
        level: 20,
        note: "Darkvision extends to 120 feet, gains shadow step as a spell-like ability usable at will, and can quicken that spell-like ability three times per day (as the Quicken Spell-Like Ability feat).",
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Storykin" entry,
  // Plane-Hopper's Handbook p.26), cross-checked against the pinned pfdata
  // JSON's "storykin" entry. See storykin.report.md for details — alignment
  // and the harrow-suit-targeted grants are modeled as a single subtype id
  // rather than per-suit variants (unlike Elemental); the report explains why.
  storykin: {
    id: "storykin",
    name: "Storykin",
    alignments: [],
    alignmentText:
      "Varies (set by the chosen harrow card; must stay within one step of the summoner's own alignment)",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
      quadruped: {
        freeNames: ["Limbs (legs) x2", "Slam"],
        attacks: [{ name: "Slam", count: 1, damageDice: "1d8" }],
      },
      serpentine: {
        freeNames: ["Bite", "Grab (tail slap)", "Tail", "Tail Slap"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Tail slap", count: 1, damageDice: "1d6" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Resistance to sonic 5. Depending on the harrow card's suit, also a +2 bonus on Fortitude saves (Hammers or Shields), Reflex saves (Books or Keys), or Will saves (Crowns or Stars).",
      },
      { level: 4, note: "Cold resistance 10 and electricity resistance 10." },
      {
        level: 8,
        note: "Gains the Ability Increase evolution (+2 to the ability score tied to its harrow card's suit — Strength for Hammers, Dexterity for Keys, Constitution for Shields, Intelligence for Books, Wisdom for Stars, or Charisma for Crowns).",
        abilityIncrease: true,
      },
      { level: 12, note: "Immunity to bleed, poison, and stun, plus DR 5/adamantine." },
      {
        level: 16,
        note: "Trades its sonic resistance for immunity to sonic damage (replacing the 1st-level resistance), and gains immunity to mind-affecting effects.",
      },
      {
        level: 20,
        note: "Gains the Ability Increase evolution again, applied to the same ability score as at 8th level, plus immunity to ability damage and ability drain against that score and immunity to energy drain.",
        abilityIncrease: true,
      },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Twinned" entry,
  // Legacy of the First World p.18), cross-checked against the pinned pfdata
  // JSON's "twinned" entry. See twinned.report.md for details.
  twinned: {
    id: "twinned",
    name: "Twinned",
    alignments: ["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"],
    alignmentText: "Any",
    baseForms: {
      biped: {
        freeNames: ["Limbs (arms)", "Limbs (legs)"],
        attacks: [],
      },
    },
    grants: [
      {
        level: 1,
        note: "Gains the Weapon Training evolution (proficiency with every weapon its summoner is proficient with) and the Skilled evolution (Disguise) — the Skilled bonus doubles while impersonating its summoner. Restricted to twinned summoners.",
      },
      {
        level: 4,
        note: "Can cast a spell known by its summoner (at least one level below the summoner's highest castable spell level) as a spell-like ability once per day; requires Charisma 10 + the spell's level, caster level equal to the eidolon's Hit Dice minus 2, save DC 10 + half its Hit Dice + its Charisma modifier.",
      },
      { level: 8, note: "Gains the Shared Slot evolution." },
      { level: 12, note: "DR 5/magic and the Extra Feat evolution (one bonus feat)." },
      {
        level: 16,
        note: "Gains the Skilled evolution again (a new skill) and the Ability Increase evolution, both targeting a skill and an ability score of the summoner's choice.",
        abilityIncrease: true,
      },
      { level: 20, note: "Gains fast healing 5." },
    ],
  },
  // Source: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Void" entry,
  // Plane-Hopper's Handbook p.25), cross-checked against the pinned pfdata
  // JSON's "void" entry. See void.report.md for details.
  void: {
    id: "void",
    name: "Void",
    alignments: ["N", "NE"],
    alignmentText: "Neutral or neutral evil",
    baseForms: {
      biped: {
        freeNames: ["Bite", "Limbs (legs)", "Skilled (Stealth)", "Wing Buffet"],
        attacks: [
          { name: "Bite", count: 1, damageDice: "1d6" },
          { name: "Wing buffet", count: 2, damageDice: "1d4" },
        ],
      },
    },
    grants: [
      {
        level: 1,
        note: "Negative energy affinity (healed by negative energy, harmed by positive energy), plus immunity to death effects, disease, energy drain, and poison.",
      },
      {
        level: 4,
        note: "Resistance to cold 5, and its natural attacks strike incorporeal creatures as though they were ghost touch weapons.",
      },
      {
        level: 8,
        note: "Its wings let it fly — gains the Flight evolution for free (a fly speed equal to its base land speed). When it takes the Energy Attacks evolution, it may deal 1d6 points of negative energy damage instead of the normal energy type (this damage doesn't heal living creatures).",
        evolutionIds: ["flight"],
      },
      {
        level: 12,
        note: "Gains lifesense, and its bite attack can bestow 1 negative level on a hit (energy drain), up to a total of half its Hit Dice (rounded down) worth of negative levels per day.",
      },
      {
        level: 16,
        note: "Trades its cold resistance for immunity to cold (replacing the 4th-level resistance), and gains DR 5/adamantine.",
      },
      {
        level: 20,
        note: "Its bite can bestow up to 2 negative levels per hit, the daily negative-level cap increases by its Constitution modifier, and its damage reduction improves to DR 10/adamantine (replacing the 16th-level DR).",
      },
    ],
  },
};

/** All 28 modeled Pathfinder Unchained eidolon subtypes: 12 Unchained core + Aberrant + the 12 splatbook subtypes from the #74 content pass, with Elemental split into 4 element ids (see module doc comment). Tapestry-Warped is deliberately absent — third-party, no verifiable source. */
export const EIDOLON_SUBTYPES: Readonly<Record<string, EidolonSubtypeDef>> = {
  ...CORE_SUBTYPES,
  ...Object.fromEntries(ELEMENTAL_VARIANTS.map((v) => [v.id, elementalSubtype(v)])),
};

/** All subtype ids, for the builder's picker. */
export const EIDOLON_SUBTYPE_IDS: readonly string[] = Object.keys(EIDOLON_SUBTYPES);

/**
 * Whether `doc` is building an unchained or chained eidolon. "Unchained"
 * iff the document has `summonerUnchained` levels and NO chained `summoner`
 * levels; a character multiclassed across BOTH summoner variants keeps the
 * existing summed-level CHAINED behavior (`eidolonSummonerLevel` already
 * sums both tags) — a deliberate, narrow edge-case call rather than
 * inventing a third hybrid derivation for a build PF1 doesn't really
 * support anyway (you can't actually have levels in both Summoner variants
 * RAW; this only matters for a homebrew/test document that does).
 */
export function eidolonVariant(doc: CharacterDoc): "chained" | "unchained" {
  const chained = doc.identity.classes.find((c) => c.tag === "summoner")?.level ?? 0;
  const unchained = doc.identity.classes.find((c) => c.tag === "summonerUnchained")?.level ?? 0;
  return unchained > 0 && chained === 0 ? "unchained" : "chained";
}

/**
 * Every grant `subtypeId` offers, with an `unlocked` flag for whether
 * `level` has reached it yet — ALL grants (including future ones) so the UI
 * can gray out what's still to come. Returns `[]` for an unset/unknown
 * subtype id.
 */
export function eidolonSubtypeGrantedEvolutions(
  subtypeId: string | undefined,
  level: number,
): { level: number; note: string; unlocked: boolean }[] {
  const subtype = subtypeId ? EIDOLON_SUBTYPES[subtypeId] : undefined;
  if (!subtype) return [];
  return subtype.grants.map((g) => ({ level: g.level, note: g.note, unlocked: g.level <= level }));
}

/**
 * The evolution pool available to `doc`'s eidolon at its current level,
 * variant-aware (chained: the flat {@link EIDOLON_PROGRESSION} column;
 * unchained: {@link EIDOLON_UNCHAINED_POOL} plus any unlocked subtype
 * `poolBonus` grants). Returns 0 when there's no eidolon or no summoner
 * levels yet — same soft posture as `deriveEidolon`'s own undefined-return
 * gate, but a plain number here since callers (`apps/web/src/model/
 * eidolon.ts`) want the pool independent of a full derivation.
 */
export function eidolonEvolutionPoolAvailable(doc: CharacterDoc): number {
  const level = eidolonSummonerLevel(doc);
  if (level <= 0) return 0;
  if (eidolonVariant(doc) === "chained") return eidolonProgressionRow(level).evolutionPool;

  const row = eidolonUnchainedProgressionRow(level);
  const subtypeId = doc.build.eidolon?.subtype;
  const subtype = subtypeId ? EIDOLON_SUBTYPES[subtypeId] : undefined;
  const poolBonus = subtype
    ? subtype.grants.filter((g) => g.level <= level).reduce((sum, g) => sum + (g.poolBonus ?? 0), 0)
    : 0;
  return row.evolutionPool + poolBonus;
}
