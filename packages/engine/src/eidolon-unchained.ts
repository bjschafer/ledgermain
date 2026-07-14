/**
 * Summoner (Unchained)'s eidolon subtype system (Pathfinder Unchained
 * "Eidolons (Unchained)") — the unchained variant's OWN evolution-pool
 * table plus the 12 core outsider SUBTYPES (Agathion/Angel/Archon/Azata/
 * Daemon/Demon/Devil/Div/Elemental/Inevitable/Protean/Psychopomp), each
 * granting a themed set of free evolutions/resistances/immunities as the
 * eidolon's HD increase, in place of the chained (APG) eidolon's flat,
 * subtype-less pool. Clean-room, paraphrased from d20pfsrd.com's "Eidolons
 * (Unchained)" page during authoring (issue #74) — no Foundry source was
 * consulted (see DESIGN §6).
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
 * Only the three base forms this codebase already models (Biped/Quadruped/
 * Serpentine) appear in any subtype's `baseForms` below — same "three core
 * forms" deferral as {@link EIDOLON_BASE_FORMS} itself. Elemental is split
 * into four separate subtype ids (air/earth/fire/water) since the eidolon's
 * element is chosen permanently at first summoning — a fifth "aberrant"
 * base form (Pathfinder Campaign Setting: Heroes of the Wild, a
 * later-splatbook subtype) is out of scope, matching the existing
 * Aquatic/Avian/Tauric base-form deferral.
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
 * replacement for the chip.
 */
export function eidolonUnchainedSpecialAbilityNames(level: number): string[] {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  const names: string[] = [];
  for (let i = 0; i < clamped; i++) {
    names.push(...EIDOLON_UNCHAINED_SPECIAL_BY_LEVEL[i]!);
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

/** One of the 15 modeled Pathfinder Unchained eidolon subtypes. */
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
};

/** All 15 modeled Pathfinder Unchained eidolon subtypes (12 core subtypes, Elemental split into 4 element ids — see module doc comment). */
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
