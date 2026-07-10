/**
 * Tracked animal companions (`CharacterDoc.build.animalCompanion`) — a
 * druid's Nature Bond companion option or a ranger's Hunter's Bond companion
 * option, modeled as its OWN trackable creature (HD/BAB/saves/AC/attacks/
 * skills), mirroring `familiar.ts`'s shape and posture closely. Clean-room
 * from the published PF1 rules (CRB "Animal Companions" / APG's identical
 * reprint) — verified against d20pfsrd.com during authoring; no Foundry
 * source was consulted (see DESIGN §6). Foundry's GPL system code is never
 * used as anything but a behavioral oracle in tests, per the repo's
 * clean-room discipline.
 *
 * Animal Companion Basics (PF1 CRB "Animal Companions"):
 *   - The companion has its OWN Hit Dice, BAB, and saves — unlike a familiar,
 *     it does NOT inherit the master's BAB or "better of" its saves. Table:
 *     Animal Companion Base Statistics gives HD directly by effective druid
 *     level; BAB is exactly the "3/4 HD" (`med`) tier and Fort/Ref/Will are
 *     exactly the good/good/poor (`high`/`high`/`low`) save tiers computed
 *     from that HD — reusing `tables.ts`'s `babForLevels`/`saveForLevels`
 *     reproduces every row of the published table exactly (verified by hand
 *     against all 20 rows during authoring).
 *   - HP: PF1 RAW average-hp-per-HD, "For a d8, the average is 4.5; multiply
 *     by the number of Hit Dice and round down" — every companion in
 *     {@link BASE_COMPANIONS} uses a d8, the universal PF1 "Animal" type Hit
 *     Die — plus the Constitution modifier per HD, floored at 1 hp/HD.
 *   - Ability scores: the base creature's own scores (its 1st-level Bestiary
 *     stat block), PLUS the table's "Str/Dex Adj" (added to BOTH Str and Dex
 *     at the same milestones as natural armor), PLUS any Ability Score
 *     Increase(s) the player has assigned (`build.animalCompanion.abilityIncreases`,
 *     one +1 per milestone reached — CRB levels 4/9/14/20).
 *   - Natural armor: the base creature's own natural armor bonus, plus the
 *     table's "Natural Armor Adj" at the same milestones.
 *   - Size/attack-dice growth (e.g. a wolf pup growing into a full wolf) is
 *     DELIBERATELY NOT modeled here: {@link BaseCompanion.growth}, when
 *     present, changes only the DISPLAYED size and attack dice at its
 *     threshold level — never natural armor or ability scores, which come
 *     exclusively from the generic table above. Mixing both sources would
 *     double-count the same physical growth twice; splitting them this way
 *     is a deliberate, documented v1 simplification.
 *   - Multiattack (unlocked at HD milestone, {@link ANIMAL_COMPANION_PROGRESSION}):
 *     still surfaced as a special-ability chip (its narrative/skill-check
 *     benefits beyond the attack math aren't modeled), but as of issue #68
 *     it DOES soften the secondary-natural-attack penalty from −5 to −2 in
 *     `deriveCompanion`'s attack math below — see `natural-attacks.ts`.
 *     Primary/secondary natural-attack math (full BAB+Str vs. −5/−2 and half
 *     Str) is modeled here via the shared `natural-attacks.ts` module
 *     (issue #68); `familiar.ts`/`eidolon.ts`/`phantom.ts` still don't model
 *     it (documented gap in THEIR own module doc comments, not this one).
 *   - Devotion (+4 morale bonus on Will saves against enchantment) is
 *     situational (only vs. one school of magic), so — matching this
 *     project's posture for Ranger Favored Enemy/Terrain — it is surfaced as
 *     a special-ability chip only, never baked into `saves.will`.
 */

import type { AbilityId, CharacterDoc, ModifierComponent, SizeId } from "@pf1/schema";

import {
  classifyNaturalAttacks,
  naturalAttackBonus,
  naturalAttackDamageBonus,
  type NaturalAttackType,
} from "./natural-attacks.js";
import { abilityMod, totalLevel } from "./rolldata.js";
import {
  applySharedAbilityBonuses,
  applySharedSpeeds,
  routeSharedBuffs,
  type AcCandidate,
} from "./shared-creature-buffs.js";
import { resolveStack } from "./stacking.js";
import {
  babForLevels,
  saveForLevels,
  SIZE_AC_MOD,
  SKILL_ABILITY,
  specialSizeMod,
} from "./tables.js";
import type { RollData } from "./formula.js";

/** How well a species flies — drives the Fly skill's maneuverability bonus below. */
export type FlyManeuverability = "clumsy" | "poor" | "average" | "good" | "perfect";

/** Fly skill bonus granted by each maneuverability class (PF1 CRB "Fly"). */
const FLY_MANEUVER_BONUS: Record<FlyManeuverability, number> = {
  clumsy: -8,
  poor: -4,
  average: 0,
  good: 8,
  perfect: 16,
};

/** Stealth's size modifier (PF1 CRB "Stealth") — smaller creatures hide better. */
const STEALTH_SIZE_MOD: Record<SizeId, number> = {
  fine: 16,
  dim: 12,
  tiny: 8,
  sm: 4,
  med: 0,
  lg: -4,
  huge: -8,
  grg: -12,
  col: -16,
};

/** Fly's size modifier (PF1 CRB "Fly") — independent of the Stealth table above. */
const FLY_SIZE_MOD: Record<SizeId, number> = {
  fine: 8,
  dim: 6,
  tiny: 4,
  sm: 2,
  med: 0,
  lg: -2,
  huge: -4,
  grg: -6,
  col: -8,
};

/** The six physical/perceptual skills surfaced for a companion (see module doc comment — no rank investment modeled). */
const COMPANION_SKILLS: ReadonlySet<string> = new Set(["acr", "clm", "fly", "per", "ste", "swm"]);

/** Tiny-or-smaller sizes, for the CMB Dex-instead-of-Str substitution. */
const TINY_OR_SMALLER: ReadonlySet<SizeId> = new Set(["fine", "dim", "tiny"]);

/** AC bucket membership mirroring `compute.ts`'s (duplicated locally — compute.ts's are private). */
const TOUCH_CATEGORIES: ReadonlySet<string> = new Set([
  "base",
  "dex",
  "size",
  "dodge",
  "deflection",
  "generic",
]);
const FLAT_FOOTED_CATEGORIES: ReadonlySet<string> = new Set([
  "base",
  "armor",
  "shield",
  "natural",
  "size",
  "deflection",
  "generic",
]);

/** One natural weapon a base companion attacks with. */
export interface CompanionAttack {
  name: string;
  /** How many of this attack the creature makes (e.g. 2 for "2 claws"). */
  count: number;
  /** Damage dice before the Str-modifier addend, e.g. "1d6". */
  damageDice: string;
  /** Freeform display note, e.g. "plus poison" or "plus grab". */
  note?: string;
}

/**
 * The species' size/attack-dice at a growth milestone (e.g. a wolf pup
 * growing into a full wolf) — display flavor ONLY, see module doc comment for
 * why ability scores/natural armor never change here.
 */
export interface CompanionGrowthStep {
  /** Effective druid level at which this step's size/attacks take over. */
  level: number;
  size: SizeId;
  attacks: CompanionAttack[];
  /** Extra ability unlocked once grown (e.g. "grab", "pounce", "death roll"), display only. */
  specialNote?: string;
}

/**
 * A hand-authored PF1 "Animal Companion" starting stat block (1st-level
 * form). Ability scores/natural armor/attacks are the SPECIES' OWN 1st-level
 * numbers; {@link deriveCompanion} layers the generic
 * {@link ANIMAL_COMPANION_PROGRESSION} table's Str/Dex/natural-armor
 * adjustments on top by effective druid level (see module doc comment for why
 * `growth` is kept separate from those numbers).
 */
export interface BaseCompanion {
  name: string;
  size: SizeId;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  naturalArmor: number;
  attacks: CompanionAttack[];
  /** Movement speeds in feet, keyed by mode ("land", "fly", "climb", "swim"). */
  speeds: Record<string, number>;
  /** Display-only sense list, e.g. ["low-light vision", "scent"]. */
  senses: string[];
  /** Present only when the species has a fly speed. */
  flyManeuverability?: FlyManeuverability;
  /** Display-only special quality notes (e.g. "ferocity", "poison", "rage"). */
  specialNotes?: string[];
  /** At most one growth milestone in this v1 model — see {@link CompanionGrowthStep}. */
  growth?: CompanionGrowthStep;
}

/**
 * Fourteen popular PF1 animal-companion forms (CRB "Animal Companions" +
 * Hunter's Bond's own list), keyed by a stable slug for the builder's picker.
 * Verified against d20pfsrd.com's "Animal Companions" page during authoring
 * (see the module doc comment).
 */
export const BASE_COMPANIONS: Readonly<Record<string, BaseCompanion>> = {
  wolf: {
    name: "Wolf",
    size: "med",
    abilities: { str: 13, dex: 15, con: 15, int: 2, wis: 12, cha: 6 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
    speeds: { land: 50 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 4,
      size: "lg",
      attacks: [{ name: "Bite", count: 1, damageDice: "1d8" }],
    },
  },
  dog: {
    name: "Dog",
    size: "sm",
    abilities: { str: 13, dex: 17, con: 15, int: 2, wis: 12, cha: 6 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4" }],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 4,
      size: "med",
      attacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
    },
  },
  horse: {
    name: "Horse",
    size: "lg",
    abilities: { str: 16, dex: 13, con: 15, int: 2, wis: 12, cha: 6 },
    naturalArmor: 1,
    attacks: [{ name: "Hoof", count: 2, damageDice: "1d6" }],
    speeds: { land: 60 },
    senses: ["low-light vision", "scent"],
  },
  pony: {
    name: "Pony",
    size: "med",
    abilities: { str: 13, dex: 13, con: 14, int: 2, wis: 12, cha: 6 },
    naturalArmor: 1,
    attacks: [{ name: "Hoof", count: 2, damageDice: "1d4" }],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
  },
  "cat-small": {
    name: "Small Cat",
    size: "sm",
    abilities: { str: 12, dex: 15, con: 12, int: 2, wis: 12, cha: 5 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Claw", count: 2, damageDice: "1d3" },
    ],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
  },
  "cat-big": {
    name: "Big Cat (leopard)",
    size: "med",
    abilities: { str: 15, dex: 15, con: 13, int: 2, wis: 12, cha: 6 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d6" },
      { name: "Claw", count: 2, damageDice: "1d4" },
    ],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 7,
      size: "lg",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d8" },
        { name: "Claw", count: 2, damageDice: "1d6" },
      ],
      specialNote: "grab, pounce",
    },
  },
  bear: {
    name: "Bear",
    size: "sm",
    abilities: { str: 15, dex: 15, con: 13, int: 2, wis: 12, cha: 6 },
    naturalArmor: 2,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Claw", count: 2, damageDice: "1d3" },
    ],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 4,
      size: "med",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d6" },
        { name: "Claw", count: 2, damageDice: "1d4" },
      ],
    },
  },
  boar: {
    name: "Boar",
    size: "sm",
    abilities: { str: 13, dex: 12, con: 15, int: 2, wis: 13, cha: 4 },
    naturalArmor: 6,
    attacks: [{ name: "Gore", count: 1, damageDice: "1d6" }],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
    specialNotes: ["ferocity"],
    growth: {
      level: 4,
      size: "med",
      attacks: [{ name: "Gore", count: 1, damageDice: "1d8" }],
    },
  },
  ape: {
    name: "Ape",
    size: "med",
    abilities: { str: 13, dex: 17, con: 10, int: 2, wis: 12, cha: 7 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Claw", count: 2, damageDice: "1d4" },
    ],
    speeds: { land: 30, climb: 30 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 4,
      size: "lg",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d6" },
        { name: "Claw", count: 2, damageDice: "1d6" },
      ],
    },
  },
  badger: {
    name: "Badger",
    size: "sm",
    abilities: { str: 10, dex: 17, con: 15, int: 2, wis: 12, cha: 10 },
    naturalArmor: 2,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Claw", count: 2, damageDice: "1d3" },
    ],
    speeds: { land: 30, burrow: 10, climb: 10 },
    senses: ["low-light vision", "scent"],
    specialNotes: ["rage"],
    growth: {
      level: 4,
      size: "med",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d6" },
        { name: "Claw", count: 2, damageDice: "1d4" },
      ],
    },
  },
  bird: {
    name: "Bird (hawk/eagle)",
    size: "sm",
    abilities: { str: 10, dex: 15, con: 12, int: 2, wis: 14, cha: 6 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Talon", count: 2, damageDice: "1d4" },
    ],
    speeds: { land: 10, fly: 80 },
    senses: ["low-light vision"],
    flyManeuverability: "average",
  },
  crocodile: {
    name: "Crocodile",
    size: "sm",
    abilities: { str: 15, dex: 14, con: 13, int: 1, wis: 12, cha: 8 },
    naturalArmor: 3,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d6" },
      { name: "Tail slap", count: 1, damageDice: "1d4" },
    ],
    speeds: { land: 20, swim: 30 },
    senses: ["low-light vision"],
    specialNotes: ["hold breath"],
    growth: {
      level: 4,
      size: "med",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d8" },
        { name: "Tail slap", count: 1, damageDice: "1d6" },
      ],
      specialNote: "death roll",
    },
  },
  "snake-constrictor": {
    name: "Snake, Constrictor",
    size: "med",
    abilities: { str: 15, dex: 17, con: 13, int: 1, wis: 12, cha: 4 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d4" },
      { name: "Constrict", count: 1, damageDice: "1d4" },
    ],
    speeds: { land: 30, swim: 30 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 4,
      size: "lg",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d6" },
        { name: "Constrict", count: 1, damageDice: "1d6" },
      ],
    },
  },
  deinonychus: {
    name: "Deinonychus",
    size: "sm",
    abilities: { str: 15, dex: 17, con: 12, int: 2, wis: 12, cha: 6 },
    naturalArmor: 1,
    attacks: [
      { name: "Bite", count: 1, damageDice: "1d6" },
      { name: "Talon", count: 2, damageDice: "1d4" },
      { name: "Foot", count: 2, damageDice: "1d4" },
    ],
    speeds: { land: 60 },
    senses: ["low-light vision", "scent"],
    growth: {
      level: 4,
      size: "med",
      attacks: [
        { name: "Bite", count: 1, damageDice: "1d8" },
        { name: "Talon", count: 2, damageDice: "1d6" },
        { name: "Foot", count: 2, damageDice: "1d6" },
      ],
      specialNote: "pounce, rake",
    },
  },
};

/** All base-companion species slugs, for the builder's picker. */
export const BASE_COMPANION_IDS = Object.keys(BASE_COMPANIONS);

/**
 * RAW Cavalier/Samurai "Mount" species lists (Ultimate Combat, verified
 * against aonprd.com during authoring, issue #68), intersected with this
 * module's own {@link BASE_COMPANION_IDS} — the full published lists include
 * several exotic animals (Camel, Elk, Giraffe, Zebra, Axe Beak, Seahorse
 * (Giant), Tortoise (Giant) for Medium riders; Antelope, Capybara, Kangaroo,
 * Lizard (Giant Gecko), Ram, Reindeer, Weasel (Giant), Wolfdog for Small
 * riders) that this module doesn't model as a {@link BaseCompanion} — only
 * the overlap is surfaced. Soft-note only: `AnimalCompanionPicker` shows this
 * as a hint text, never a hard block on the species `<select>` (matches this
 * project's hybrid prereq/soft-warning posture) — the source text itself
 * says "The GM might approve other animals as suitable mounts." Keyed by the
 * rider's size (a Small cavalier/samurai gets the alternate list; every
 * other size uses the Medium list, the overwhelmingly common case).
 */
export const MOUNT_SPECIES_BY_RIDER_SIZE: Readonly<Record<"med" | "sm", readonly string[]>> = {
  med: ["horse"],
  sm: ["boar", "dog", "pony", "wolf"],
};

/** One row of the CRB/APG "Table: Animal Companion Base Statistics", by effective druid level. */
export interface CompanionProgressionRow {
  level: number;
  hd: number;
  naturalArmorAdj: number;
  /** Added to BOTH Str and Dex. */
  abilityAdj: number;
  bonusTricks: number;
  /** Bonus feats the companion has earned (display-only — no companion feat picker in v1). */
  feats: number;
  /** Special abilities newly granted AT this level (not cumulative — see {@link companionSpecialAbilities}). */
  special: string[];
}

/**
 * Table: Animal Companion Base Statistics (PF1 CRB "Animal Companions" / APG
 * reprint), indexed by effective druid level 1–20. `hd` reproduces
 * `babForLevels("med", hd)` / `saveForLevels("high"|"low", hd)` exactly for
 * every row (verified by hand during authoring) — {@link deriveCompanion}
 * relies on this rather than hardcoding BAB/save numbers separately.
 */
export const ANIMAL_COMPANION_PROGRESSION: readonly CompanionProgressionRow[] = [
  {
    level: 1,
    hd: 2,
    naturalArmorAdj: 0,
    abilityAdj: 0,
    bonusTricks: 1,
    feats: 1,
    special: ["Link", "Share Spells"],
  },
  { level: 2, hd: 3, naturalArmorAdj: 0, abilityAdj: 0, bonusTricks: 1, feats: 2, special: [] },
  {
    level: 3,
    hd: 3,
    naturalArmorAdj: 2,
    abilityAdj: 1,
    bonusTricks: 2,
    feats: 2,
    special: ["Evasion"],
  },
  {
    level: 4,
    hd: 4,
    naturalArmorAdj: 2,
    abilityAdj: 1,
    bonusTricks: 2,
    feats: 2,
    special: ["Ability Score Increase"],
  },
  { level: 5, hd: 5, naturalArmorAdj: 2, abilityAdj: 1, bonusTricks: 2, feats: 3, special: [] },
  {
    level: 6,
    hd: 6,
    naturalArmorAdj: 4,
    abilityAdj: 2,
    bonusTricks: 3,
    feats: 3,
    special: ["Devotion"],
  },
  { level: 7, hd: 6, naturalArmorAdj: 4, abilityAdj: 2, bonusTricks: 3, feats: 3, special: [] },
  { level: 8, hd: 7, naturalArmorAdj: 4, abilityAdj: 2, bonusTricks: 3, feats: 4, special: [] },
  {
    level: 9,
    hd: 8,
    naturalArmorAdj: 6,
    abilityAdj: 3,
    bonusTricks: 4,
    feats: 4,
    special: ["Ability Score Increase", "Multiattack"],
  },
  { level: 10, hd: 9, naturalArmorAdj: 6, abilityAdj: 3, bonusTricks: 4, feats: 5, special: [] },
  { level: 11, hd: 9, naturalArmorAdj: 6, abilityAdj: 3, bonusTricks: 4, feats: 5, special: [] },
  { level: 12, hd: 10, naturalArmorAdj: 8, abilityAdj: 4, bonusTricks: 5, feats: 5, special: [] },
  { level: 13, hd: 11, naturalArmorAdj: 8, abilityAdj: 4, bonusTricks: 5, feats: 6, special: [] },
  {
    level: 14,
    hd: 12,
    naturalArmorAdj: 8,
    abilityAdj: 4,
    bonusTricks: 5,
    feats: 6,
    special: ["Ability Score Increase"],
  },
  {
    level: 15,
    hd: 12,
    naturalArmorAdj: 10,
    abilityAdj: 5,
    bonusTricks: 6,
    feats: 6,
    special: ["Improved Evasion"],
  },
  { level: 16, hd: 13, naturalArmorAdj: 10, abilityAdj: 5, bonusTricks: 6, feats: 7, special: [] },
  { level: 17, hd: 14, naturalArmorAdj: 10, abilityAdj: 5, bonusTricks: 6, feats: 7, special: [] },
  { level: 18, hd: 15, naturalArmorAdj: 12, abilityAdj: 6, bonusTricks: 7, feats: 8, special: [] },
  { level: 19, hd: 15, naturalArmorAdj: 12, abilityAdj: 6, bonusTricks: 7, feats: 8, special: [] },
  {
    level: 20,
    hd: 16,
    naturalArmorAdj: 12,
    abilityAdj: 6,
    bonusTricks: 7,
    feats: 8,
    special: ["Ability Score Increase"],
  },
];

/** The progression row for `level`, clamped to [1, 20] (no companion source below 1; the table caps at 20). */
export function companionProgressionRow(level: number): CompanionProgressionRow {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  return ANIMAL_COMPANION_PROGRESSION[clamped - 1]!;
}

/** Every special-ability name unlocked by `level` (cumulative — union of every row up to and including it). */
export function companionSpecialAbilityNames(level: number): string[] {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  const names: string[] = [];
  for (let i = 0; i < clamped; i++) {
    for (const name of ANIMAL_COMPANION_PROGRESSION[i]!.special) {
      if (name !== "Ability Score Increase") names.push(name);
    }
  }
  return names;
}

/** Display detail text for each one-time special ability a companion can have. */
export const COMPANION_SPECIAL_ABILITY_DETAIL: Readonly<Record<string, string>> = {
  Link: "The master can handle the companion as a free action, or push it as a move action, without Handle Animal ranks.",
  "Share Spells":
    "The master may cast a spell targeting only himself on the companion instead (touch range).",
  Evasion: "On a Reflex save for half damage, the companion takes no damage on a success.",
  Devotion: "+4 morale bonus on Will saves against enchantment spells and effects.",
  Multiattack:
    "With 3+ natural attacks, the companion gains Multiattack as a bonus feat (not separately modeled numerically here).",
  "Improved Evasion":
    "The companion takes no damage on a successful Reflex save, half on a failed one.",
};

/** Character levels at which a companion gains an Ability Score Increase (CRB table). */
export const COMPANION_ABILITY_INCREASE_LEVELS: readonly number[] = [4, 9, 14, 20];

/** How many Ability Score Increase slots a companion has earned by `effectiveLevel`. */
export function companionAbilityIncreaseSlots(effectiveLevel: number): number {
  return COMPANION_ABILITY_INCREASE_LEVELS.filter((l) => l <= effectiveLevel).length;
}

/**
 * The companion's effective druid level from its class source(s)
 * (`build.animalCompanion.source`) BEFORE Boon Companion — CRB "Nature Bond"
 * (druid's own class level), the ranger's "Hunter's Bond" (ranger level − 3,
 * min 0, i.e. nothing before 4th), and/or the ACG Hunter class's OWN Animal
 * Companion feature, `"hunter-companion"` (hunter level 1:1, NO −3 offset —
 * "The hunter's effective druid level is equal to her hunter level," per the
 * vendored `animal-companion-hun.V7cGG7vKN0BY2Bhb.yaml` — verified against
 * aonprd.com's Hunter class page, issue #65). A multiclass character who has
 * chosen the companion option from more than one of these sums them — a
 * deliberate v1 simplification (PF1 RAW doesn't clearly anticipate a
 * character stacking multiple bonds on one companion, though the Hunter's
 * own vendored text explicitly endorses stacking with another source: "If a
 * character receives an animal companion from more than one source, her
 * effective druid levels stack for the purposes of determining the
 * companion's statistics"); treating them as additive contributions to one
 * companion's power is the simplest coherent behavior and is documented here
 * rather than silently guessed at.
 *
 * `"cavalier-mount"`/`"samurai-mount"` (issue #68) are the Cavalier's/
 * Samurai's own "Mount" class feature — 1:1, no −3 offset, same shape as
 * `"hunter-companion"` (verified against aonprd.com: "This mount functions
 * as a druid's animal companion, using the cavalier's/samurai's level as his
 * effective druid level," identical wording for both classes).
 */
function baseCompanionEffectiveLevel(doc: CharacterDoc): number {
  const source = doc.build.animalCompanion?.source ?? [];
  let level = 0;
  if (source.includes("nature-bond")) {
    level += doc.identity.classes.find((c) => c.tag === "druid")?.level ?? 0;
  }
  if (source.includes("hunters-bond")) {
    const rangerLevel = doc.identity.classes.find((c) => c.tag === "ranger")?.level ?? 0;
    level += Math.max(0, rangerLevel - 3);
  }
  if (source.includes("hunter-companion")) {
    level += doc.identity.classes.find((c) => c.tag === "hunter")?.level ?? 0;
  }
  if (source.includes("cavalier-mount")) {
    level += doc.identity.classes.find((c) => c.tag === "cavalier")?.level ?? 0;
  }
  if (source.includes("samurai-mount")) {
    level += doc.identity.classes.find((c) => c.tag === "samurai")?.level ?? 0;
  }
  return level;
}

/**
 * The companion's effective druid level, including the Boon Companion feat
 * (+4, capped at total character level) — CRB feat text: "add +4 to the
 * character's effective druid level... to a maximum of his total character
 * level." `hasBoonCompanion` is resolved by the CALLER (which has `RefData`
 * to turn a feat id into its name/slug — this pure module never takes
 * `RefData`), defaulting to `false` so a caller that hasn't wired the feat
 * check yet degrades to the plain sum above rather than crashing.
 *
 * Returns 0 (no companion) when the document has no companion source at all
 * — Boon Companion's own prerequisite is already having an animal companion,
 * so the bonus never creates one from nothing.
 */
export function companionEffectiveLevel(doc: CharacterDoc, hasBoonCompanion = false): number {
  const base = baseCompanionEffectiveLevel(doc);
  if (base <= 0) return 0;
  return Math.min(totalLevel(doc), base + (hasBoonCompanion ? 4 : 0));
}

export interface DerivedCompanionSkill {
  id: string;
  ability: AbilityId;
  total: number;
  components: ModifierComponent[];
}

export interface DerivedCompanionAttack {
  name: string;
  count: number;
  attack: number;
  damageDice: string;
  damageBonus: number;
  note?: string;
  /** Primary (full BAB+Str) or secondary (−5/−2 with Multiattack, half Str) — see `natural-attacks.ts`, issue #68. */
  attackType: NaturalAttackType;
}

export interface DerivedCompanionAc {
  normal: number;
  touch: number;
  flatFooted: number;
  components: ModifierComponent[];
}

/** The full derived stat block for a tracked animal companion (`build.animalCompanion`). */
export interface DerivedCompanion {
  speciesId: string;
  speciesName: string;
  name: string;
  size: SizeId;
  /** The companion's effective druid level (see {@link companionEffectiveLevel}). */
  level: number;
  hd: number;
  abilities: Record<AbilityId, { score: number; mod: number }>;
  hp: { max: number; current: number; nonlethal: number };
  init: number;
  speeds: Record<string, number>;
  senses: string[];
  ac: DerivedCompanionAc;
  saves: { fort: number; ref: number; will: number };
  bab: number;
  cmb: number;
  cmd: number;
  attacks: DerivedCompanionAttack[];
  skills: Record<string, DerivedCompanionSkill>;
  /** Total natural armor (base creature's own + the level-scaled table bonus). */
  naturalArmor: number;
  /** One-time special abilities unlocked so far (Link, Share Spells, Evasion, Devotion, Multiattack, Improved Evasion). */
  specialAbilities: { name: string; detail: string }[];
  /** Display-only species quality notes (e.g. "ferocity", "poison") plus any unlocked growth-step note. */
  specialNotes: string[];
  /** Bonus tricks (Handle Animal) earned so far — display only, CRB table. */
  bonusTricks: number;
  /** Bonus feats earned so far — display only, no companion feat picker in v1. */
  bonusFeats: number;
}

/**
 * Derive the tracked animal companion's full stat block, or `undefined` when
 * the document has no `build.animalCompanion`, its `speciesId` isn't in
 * {@link BASE_COMPANIONS}, or its effective level (from
 * {@link companionEffectiveLevel}) is 0 (no companion-granting source chosen
 * yet, or a ranger below 4th level) — soft-warning posture, never a crash;
 * the UI simply shows nothing.
 *
 * Unlike a familiar, the companion has its OWN Hit Dice/BAB/saves (see module
 * doc comment) — `rollData` is needed only to evaluate shared buffs'
 * formulas (`live.animalCompanion.sharedBuffIds`), exactly like
 * `deriveFamiliar`'s buff-sharing routing (see `shared-creature-buffs.ts`).
 */
export function deriveCompanion(
  doc: CharacterDoc,
  rollData: RollData,
  hasBoonCompanion = false,
): DerivedCompanion | undefined {
  const build = doc.build.animalCompanion;
  if (!build) return undefined;
  const species = BASE_COMPANIONS[build.speciesId];
  if (!species) return undefined;

  const level = companionEffectiveLevel(doc, hasBoonCompanion);
  if (level <= 0) return undefined;

  const row = companionProgressionRow(level);
  const hd = row.hd;
  const companionBab = babForLevels("med", hd);

  // --- ability scores: species base + table Str/Dex Adj + player-assigned ASIs
  const abilityIncreaseSlots = companionAbilityIncreaseSlots(level);
  const chosenIncreases = (build.abilityIncreases ?? []).slice(0, abilityIncreaseSlots);
  const increaseBonus: Record<AbilityId, number> = {
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
  };
  for (let i = 0; i < abilityIncreaseSlots; i++) {
    const ability = chosenIncreases[i] ?? "str";
    increaseBonus[ability] += 1;
  }
  const baseStr = species.abilities.str + row.abilityAdj + increaseBonus.str;
  const baseDex = species.abilities.dex + row.abilityAdj + increaseBonus.dex;
  const baseCon = species.abilities.con + increaseBonus.con;
  const baseInt = species.abilities.int + increaseBonus.int;
  const baseWis = species.abilities.wis + increaseBonus.wis;
  const baseCha = species.abilities.cha + increaseBonus.cha;

  let abilities: Record<AbilityId, { score: number; mod: number }> = {
    str: { score: baseStr, mod: abilityMod(baseStr) },
    dex: { score: baseDex, mod: abilityMod(baseDex) },
    con: { score: baseCon, mod: abilityMod(baseCon) },
    int: { score: baseInt, mod: abilityMod(baseInt) },
    wis: { score: baseWis, mod: abilityMod(baseWis) },
    cha: { score: baseCha, mod: abilityMod(baseCha) },
  };

  // --- size/attacks: base form, or the grown form once `growth.level` is reached
  const grown = species.growth && level >= species.growth.level ? species.growth : undefined;
  const size = grown?.size ?? species.size;
  const speciesAttacks = grown?.attacks ?? species.attacks;
  const sizeAcMod = SIZE_AC_MOD[size];

  // --- shared buffs: evaluate + bucket by target (mirrors familiar.ts, issue #44) --
  const sharedIds = new Set(doc.live.animalCompanion?.sharedBuffIds ?? []);
  const sharedBuffs = (doc.live.activeBuffs ?? []).filter((b) => sharedIds.has(b.instanceId));
  const routed = routeSharedBuffs(sharedBuffs, rollData);

  abilities = applySharedAbilityBonuses(abilities, routed.ability, abilityMod);
  const strMod = abilities.str.mod;
  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;
  const wisMod = abilities.wis.mod;

  // --- HP: PF1 RAW average-per-HD (d8: 4.5/HD, rounded down) + Con mod/HD, min 1/HD ---
  const avgHpBeforeCon = Math.floor(4.5 * hd);
  const hpMax = Math.max(hd, avgHpBeforeCon + conMod * hd);

  // --- AC -------------------------------------------------------------------
  const naturalArmor = species.naturalArmor + row.naturalArmorAdj;
  const acCandidates: AcCandidate[] = [
    { category: "base", type: "base", value: 10, source: "Base" },
    { category: "dex", type: "untyped", value: dexMod, source: "Dexterity" },
    { category: "natural", type: "untyped", value: naturalArmor, source: "Natural armor" },
    ...(sizeAcMod !== 0
      ? [{ category: "size", type: "size", value: sizeAcMod, source: "Size" }]
      : []),
    ...routed.ac,
  ];
  const acGroups = new Map<string, AcCandidate[]>();
  for (const c of acCandidates) {
    const arr = acGroups.get(c.category);
    if (arr) arr.push(c);
    else acGroups.set(c.category, [c]);
  }
  let acNormal = 0;
  let acTouch = 0;
  let acFlatFooted = 0;
  const acComponents: ModifierComponent[] = [];
  for (const [category, group] of acGroups) {
    const stack = resolveStack(group);
    for (const m of stack.modifiers) {
      acComponents.push({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
      });
      if (!m.applied) continue;
      acNormal += m.value;
      if (TOUCH_CATEGORIES.has(category)) acTouch += m.value;
      if (FLAT_FOOTED_CATEGORIES.has(category)) acFlatFooted += m.value;
    }
  }

  // --- saves: the companion's OWN good/good/poor progression from its HD ----
  const saves = {
    fort: saveForLevels("high", hd) + conMod + resolveStack(routed.fort).total,
    ref: saveForLevels("high", hd) + dexMod + resolveStack(routed.ref).total,
    will: saveForLevels("low", hd) + wisMod + resolveStack(routed.will).total,
  };

  // --- CMB/CMD ----------------------------------------------------------------
  const sizeSpecial = specialSizeMod(size);
  const cmb = companionBab + (TINY_OR_SMALLER.has(size) ? dexMod : strMod) + sizeSpecial;
  const cmd = 10 + companionBab + strMod + dexMod + sizeSpecial;

  // --- attacks: companion's own BAB + better of Str/Dex + size + shared bonus,
  // with primary/secondary natural-attack math (issue #68) — see
  // `natural-attacks.ts`. Multiattack (unlocked at the HD milestone, see
  // module doc comment) softens the secondary penalty from −5 to −2.
  const hasMultiattack = companionSpecialAbilityNames(level).includes("Multiattack");
  const sharedAttackBonus = resolveStack(routed.attack).total;
  const sharedDamageBonus = resolveStack(routed.damage).total;
  const baseAttackBonus = companionBab + Math.max(strMod, dexMod) + sizeAcMod + sharedAttackBonus;
  const classifiedAttacks = classifyNaturalAttacks(speciesAttacks);
  const attacks: DerivedCompanionAttack[] = classifiedAttacks.map((a) => ({
    name: a.name,
    count: a.count,
    attack: naturalAttackBonus(baseAttackBonus, a.attackType, hasMultiattack),
    damageDice: a.damageDice,
    damageBonus: naturalAttackDamageBonus(strMod, a.attackType) + sharedDamageBonus,
    note: a.note,
    attackType: a.attackType,
  }));

  // --- skills: physical/perceptual only, no rank investment (see module doc) --
  const hasClimbSpeed = species.speeds.climb !== undefined;
  const hasSwimSpeed = species.speeds.swim !== undefined;
  const skills: Record<string, DerivedCompanionSkill> = {};
  for (const id of COMPANION_SKILLS) {
    // Universal Monster Rules: a creature with a climb/swim speed uses Dex
    // (not Str) for that specific skill — mirrors familiar.ts's identical
    // override.
    let ability: AbilityId = SKILL_ABILITY[id] ?? "dex";
    if (id === "clm" && hasClimbSpeed) ability = "dex";
    if (id === "swm" && hasSwimSpeed) ability = "dex";
    const abilityModVal = abilities[ability].mod;

    let racial = 0;
    if (id === "clm" && hasClimbSpeed) racial += 8;
    if (id === "swm" && hasSwimSpeed) racial += 8;

    let sizeSkillMod = 0;
    if (id === "ste") sizeSkillMod = STEALTH_SIZE_MOD[size];
    if (id === "fly") {
      sizeSkillMod =
        FLY_SIZE_MOD[size] +
        (species.flyManeuverability ? FLY_MANEUVER_BONUS[species.flyManeuverability] : 0);
    }

    const miscStack = resolveStack(routed.skill.get(id) ?? []);
    const components: ModifierComponent[] = [];
    if (racial !== 0)
      components.push({
        source: `${species.name} (racial)`,
        type: "racial",
        value: racial,
        applied: true,
      });
    if (sizeSkillMod !== 0)
      components.push({ source: "Size", type: "size", value: sizeSkillMod, applied: true });
    components.push(
      ...miscStack.modifiers.map((m) => ({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
      })),
    );

    skills[id] = {
      id,
      ability,
      total: abilityModVal + racial + sizeSkillMod + miscStack.total,
      components,
    };
  }

  const specialNotes = [
    ...(species.specialNotes ?? []),
    ...(grown?.specialNote ? [grown.specialNote] : []),
  ];

  return {
    speciesId: build.speciesId,
    speciesName: species.name,
    name: build.name,
    size,
    level,
    hd,
    abilities,
    hp: {
      max: hpMax,
      current: hpMax - (doc.live.animalCompanion?.damage ?? 0),
      nonlethal: doc.live.animalCompanion?.nonlethal ?? 0,
    },
    init: dexMod + resolveStack(routed.init).total,
    speeds: applySharedSpeeds(species.speeds, routed.speed),
    senses: species.senses,
    ac: { normal: acNormal, touch: acTouch, flatFooted: acFlatFooted, components: acComponents },
    saves,
    bab: companionBab,
    cmb,
    cmd,
    attacks,
    skills,
    naturalArmor,
    specialAbilities: companionSpecialAbilityNames(level).map((name) => ({
      name,
      detail: COMPANION_SPECIAL_ABILITY_DETAIL[name] ?? "",
    })),
    specialNotes,
    bonusTricks: row.bonusTricks,
    bonusFeats: row.feats,
  };
}
