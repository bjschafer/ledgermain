/**
 * Hardcoded PF1 progression tables. The numeric BAB/save values per tier are NOT
 * in the vendored data (only the `high|med|low` / `high|low` tier labels), so the
 * standard rules tables live here. All are computed per class level and summed
 * across a multiclass character (the +2 base good-save bonus applies once per
 * class, which is the correct PF1 multiclass behaviour).
 */

import type { AbilityId, BabTier, Race, SaveTier, SizeId } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

/** Base attack bonus contributed by `level` levels of a class at `tier`. */
export function babForLevels(tier: BabTier, level: number): number {
  if (level <= 0) return 0;
  switch (tier) {
    case "high":
      return level; // 1/level
    case "med":
      return Math.floor((level * 3) / 4); // 3/4
    case "low":
      return Math.floor(level / 2); // 1/2
  }
}

/** Base save bonus contributed by `level` levels of a class at `tier`. */
export function saveForLevels(tier: SaveTier, level: number): number {
  if (level <= 0) return 0;
  return tier === "high"
    ? 2 + Math.floor(level / 2) // good save
    : Math.floor(level / 3); // poor save
}

/** Size modifier to AC and attack rolls (Foundry size id → modifier). */
export const SIZE_AC_MOD: Record<SizeId, number> = {
  fine: 8,
  dim: 4,
  tiny: 2,
  sm: 1,
  med: 0,
  lg: -1,
  huge: -2,
  grg: -4,
  col: -8,
};

/**
 * Special size modifier to CMB / CMD (and combat maneuvers) — the inverse of the
 * AC/attack size modifier: larger creatures gain a bonus.
 */
export function specialSizeMod(size: SizeId): number {
  return -SIZE_AC_MOD[size];
}

/** The save each defense keys off of. */
export const SAVE_ABILITY: Record<"fort" | "ref" | "will", AbilityId> = {
  fort: "con",
  ref: "dex",
  will: "wis",
};

/**
 * Skill → governing ability, using the Foundry PF1 skill ids. Covers the SRD
 * skills plus the variant skills present in the vendored class lists (art, lor).
 */
export const SKILL_ABILITY: Record<string, AbilityId> = {
  acr: "dex", // Acrobatics
  apr: "int", // Appraise
  art: "int", // Artistry
  blf: "cha", // Bluff
  clm: "str", // Climb
  crf: "int", // Craft
  dip: "cha", // Diplomacy
  dev: "dex", // Disable Device
  dis: "cha", // Disguise
  esc: "dex", // Escape Artist
  fly: "dex", // Fly
  han: "cha", // Handle Animal
  hea: "wis", // Heal
  int: "cha", // Intimidate
  kar: "int", // Knowledge (arcana)
  kdu: "int", // Knowledge (dungeoneering)
  ken: "int", // Knowledge (engineering)
  kge: "int", // Knowledge (geography)
  khi: "int", // Knowledge (history)
  klo: "int", // Knowledge (local)
  kna: "int", // Knowledge (nature)
  kno: "int", // Knowledge (nobility)
  kpl: "int", // Knowledge (planes)
  kre: "int", // Knowledge (religion)
  lin: "int", // Linguistics
  lor: "int", // Lore
  per: "wis", // Perception
  prf: "cha", // Perform
  pro: "wis", // Profession
  rid: "dex", // Ride
  sen: "wis", // Sense Motive
  slt: "dex", // Sleight of Hand
  spl: "int", // Spellcraft
  ste: "dex", // Stealth
  sur: "wis", // Survival
  swm: "str", // Swim
  umd: "cha", // Use Magic Device
};

/** Armor check penalty applies to Strength- and Dexterity-based skill checks. */
export function skillUsesAcp(skillId: string): boolean {
  const ability = SKILL_ABILITY[skillId];
  return ability === "str" || ability === "dex";
}

/** All known skill ids (keys of {@link SKILL_ABILITY}). */
export const SKILL_IDS = Object.keys(SKILL_ABILITY);

/**
 * Skills that require at least 1 rank to be used (PF1 "trained only"). A
 * character with 0 ranks in one of these skills cannot attempt the check.
 * All other skills in {@link SKILL_ABILITY} can be used untrained.
 */
export const SKILL_TRAINED_ONLY: ReadonlySet<string> = new Set([
  "dev", // Disable Device
  "han", // Handle Animal
  "kar", // Knowledge (arcana)
  "kdu", // Knowledge (dungeoneering)
  "ken", // Knowledge (engineering)
  "kge", // Knowledge (geography)
  "khi", // Knowledge (history)
  "klo", // Knowledge (local)
  "kna", // Knowledge (nature)
  "kno", // Knowledge (nobility)
  "kpl", // Knowledge (planes)
  "kre", // Knowledge (religion)
  "lin", // Linguistics
  "pro", // Profession
  "slt", // Sleight of Hand
  "spl", // Spellcraft
  "umd", // Use Magic Device
]);

/** Returns true if `skillId` is a trained-only skill (unusable at 0 ranks). */
export function isTrainedOnly(skillId: string): boolean {
  return SKILL_TRAINED_ONLY.has(skillId);
}

/**
 * Returns true when `race` grants a flexible +2 to an ability score of the
 * player's choice (Human, Half-Elf, Half-Orc in PF1). These races have NO
 * ability-score changes in `race.changes`; fixed-mod races (e.g. Elf: +2 Dex,
 * +2 Int, −2 Con) have at least one change targeting an AbilityId.
 */
export function raceGrantsFlexibleAbility(race: Race): boolean {
  return !race.changes.some((c) => (ABILITY_IDS as readonly string[]).includes(c.target));
}

/* ------------------------------------------------------------ spells/day -- */

/**
 * Spell progressions whose base spells-per-day tables live here. Like BAB/saves,
 * these numbers are NOT in the vendored Foundry data (clean-room, from the
 * published rules). Full prepared-arcane (wizard), full prepared-divine
 * (cleric), and spontaneous-arcane (sorcerer) are tabled today; add a key +
 * table to extend. Cleric shares the wizard base-spells-per-day numbers (the
 * domain spell slot granted at each accessible level is not included here).
 */
export type SpellProgression = "wizard" | "sorcerer" | "cleric";

/**
 * Wizard base spells per day, indexed `[classLevel - 1][spellLevel]`.
 * `null` = that spell level is not yet accessible at that class level (the "—"
 * cells on the published table). Level-0 entries are how many cantrips may be
 * prepared (each cast at will). Bonus spells from a high casting ability are
 * added on top by {@link bonusSpellsForLevel} and are NOT included here.
 */
const WIZARD_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [3, 1, null, null, null, null, null, null, null, null],
  /* L2  */ [4, 2, null, null, null, null, null, null, null, null],
  /* L3  */ [4, 2, 1, null, null, null, null, null, null, null],
  /* L4  */ [4, 3, 2, null, null, null, null, null, null, null],
  /* L5  */ [4, 3, 2, 1, null, null, null, null, null, null],
  /* L6  */ [4, 3, 3, 2, null, null, null, null, null, null],
  /* L7  */ [4, 4, 3, 2, 1, null, null, null, null, null],
  /* L8  */ [4, 4, 3, 3, 2, null, null, null, null, null],
  /* L9  */ [4, 4, 4, 3, 2, 1, null, null, null, null],
  /* L10 */ [4, 4, 4, 3, 3, 2, null, null, null, null],
  /* L11 */ [4, 4, 4, 4, 3, 2, 1, null, null, null],
  /* L12 */ [4, 4, 4, 4, 3, 3, 2, null, null, null],
  /* L13 */ [4, 4, 4, 4, 4, 3, 2, 1, null, null],
  /* L14 */ [4, 4, 4, 4, 4, 3, 3, 2, null, null],
  /* L15 */ [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
  /* L16 */ [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
  /* L17 */ [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
  /* L18 */ [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
  /* L19 */ [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
  /* L20 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

/**
 * Sorcerer base spells per day, indexed `[classLevel - 1][spellLevel]`.
 * `null` = not yet accessible or not applicable. Column 0 (cantrips) is always
 * null because sorcerers cast cantrips at will (unlimited). Columns 1–9 are
 * daily slots. Bonus spells from Charisma are NOT included here. (PF1 SRD —
 * clean-room table from the published rules, open game content.)
 */
const SORCERER_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, 3, null, null, null, null, null, null, null, null],
  /* L2  */ [null, 4, null, null, null, null, null, null, null, null],
  /* L3  */ [null, 5, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 6, 3, null, null, null, null, null, null, null],
  /* L5  */ [null, 6, 4, null, null, null, null, null, null, null],
  /* L6  */ [null, 6, 5, 3, null, null, null, null, null, null],
  /* L7  */ [null, 6, 6, 4, null, null, null, null, null, null],
  /* L8  */ [null, 6, 6, 5, 3, null, null, null, null, null],
  /* L9  */ [null, 6, 6, 6, 4, null, null, null, null, null],
  /* L10 */ [null, 6, 6, 6, 5, 3, null, null, null, null],
  /* L11 */ [null, 6, 6, 6, 6, 4, null, null, null, null],
  /* L12 */ [null, 6, 6, 6, 6, 5, 3, null, null, null],
  /* L13 */ [null, 6, 6, 6, 6, 6, 4, null, null, null],
  /* L14 */ [null, 6, 6, 6, 6, 6, 5, 3, null, null],
  /* L15 */ [null, 6, 6, 6, 6, 6, 6, 4, null, null],
  /* L16 */ [null, 6, 6, 6, 6, 6, 6, 5, 3, null],
  /* L17 */ [null, 6, 6, 6, 6, 6, 6, 6, 4, null],
  /* L18 */ [null, 6, 6, 6, 6, 6, 6, 6, 5, 3],
  /* L19 */ [null, 6, 6, 6, 6, 6, 6, 6, 6, 4],
  /* L20 */ [null, 6, 6, 6, 6, 6, 6, 6, 6, 6],
];

/**
 * Sorcerer spells known per level, indexed `[classLevel - 1][spellLevel]`.
 * Column 0 caps cantrips known; columns 1–9 cap how many spells the sorcerer
 * may know at that spell level. (PF1 SRD — clean-room, open game content.)
 */
const SORCERER_SPELLS_KNOWN: readonly (readonly (number | null)[])[] = [
  /* L1  */ [4, 2, null, null, null, null, null, null, null, null],
  /* L2  */ [5, 2, null, null, null, null, null, null, null, null],
  /* L3  */ [5, 3, null, null, null, null, null, null, null, null],
  /* L4  */ [6, 3, 1, null, null, null, null, null, null, null],
  /* L5  */ [6, 4, 2, null, null, null, null, null, null, null],
  /* L6  */ [7, 4, 2, 1, null, null, null, null, null, null],
  /* L7  */ [7, 4, 3, 2, null, null, null, null, null, null],
  /* L8  */ [8, 4, 3, 2, 1, null, null, null, null, null],
  /* L9  */ [8, 4, 3, 3, 2, null, null, null, null, null],
  /* L10 */ [9, 4, 4, 3, 2, 1, null, null, null, null],
  /* L11 */ [9, 4, 4, 3, 3, 2, null, null, null, null],
  /* L12 */ [9, 4, 4, 4, 3, 2, 1, null, null, null],
  /* L13 */ [9, 4, 4, 4, 3, 3, 2, null, null, null],
  /* L14 */ [9, 4, 4, 4, 4, 3, 2, 1, null, null],
  /* L15 */ [9, 4, 4, 4, 4, 3, 3, 2, null, null],
  /* L16 */ [9, 4, 4, 4, 4, 4, 3, 2, 1, null],
  /* L17 */ [9, 4, 4, 4, 4, 4, 3, 3, 2, null],
  /* L18 */ [9, 4, 4, 4, 4, 4, 4, 3, 2, 1],
  /* L19 */ [9, 4, 4, 4, 4, 4, 4, 3, 3, 2],
  /* L20 */ [9, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

/**
 * Progressions for which a separate spells-known table exists. Spontaneous
 * casters have a fixed set of spells they can know at each spell level (capped
 * per the known table), as distinct from prepared casters whose spellbook IS
 * their known list (unlimited within the rules for acquired spells).
 */
export type SpellKnownProgression = "sorcerer";

const KNOWN_PROGRESSIONS: Record<
  SpellKnownProgression,
  readonly (readonly (number | null)[])[]
> = {
  sorcerer: SORCERER_SPELLS_KNOWN,
};

/**
 * Cleric base spells per day, indexed `[classLevel - 1][spellLevel]`. Clerics
 * are full prepared-divine casters and use the same base spells-per-day numbers
 * as the wizard (3/1 at L1, scaling to 4/every-level at L20). The domain spell
 * slot granted at each accessible level is class-feature territory and is NOT
 * included in this base table. Cantrips (level 0) are orisons prepared at will.
 * (PF1 SRD — clean-room table from the published rules, open game content.)
 */
const CLERIC_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY;

const PROGRESSIONS: Record<SpellProgression, readonly (readonly (number | null)[])[]> = {
  wizard: WIZARD_SPELLS_PER_DAY,
  sorcerer: SORCERER_SPELLS_PER_DAY,
  cleric: CLERIC_SPELLS_PER_DAY,
};

/**
 * Base spells per day (before ability bonus) for `progression` at `classLevel`
 * and `spellLevel` (0–9). Returns `null` when that spell level is not yet
 * accessible — distinct from `0`, which a real table never lists but callers may
 * treat the same way. Out-of-range inputs return `null`.
 */
export function baseSpellsPerDay(
  progression: SpellProgression,
  classLevel: number,
  spellLevel: number,
): number | null {
  const table = PROGRESSIONS[progression];
  if (classLevel < 1 || classLevel > table.length) return null;
  if (spellLevel < 0 || spellLevel > 9) return null;
  return table[classLevel - 1]![spellLevel] ?? null;
}

/**
 * Maximum number of spells a caster with `progression` can know at `spellLevel`
 * when `classLevel`. Returns `null` when that spell level is not yet accessible.
 * Out-of-range inputs return `null`. Only applicable to progressions that have a
 * separate spells-known table (i.e. spontaneous casters like sorcerer).
 */
export function baseSpellsKnown(
  progression: SpellKnownProgression,
  classLevel: number,
  spellLevel: number,
): number | null {
  const table = KNOWN_PROGRESSIONS[progression];
  if (classLevel < 1 || classLevel > table.length) return null;
  if (spellLevel < 0 || spellLevel > 9) return null;
  return table[classLevel - 1]![spellLevel] ?? null;
}

/* -------------------------------------------------------- channel energy -- */

/**
 * Cleric channel-energy scaling, clean-room from the published PF1 rules (the
 * Channel Energy class feature's `changes[]` is prose-only upstream — dice and
 * save DC are NOT among the vendored `uses.maxFormula` data).
 *
 * Damage/Healing dice = `1d6 + 1d6 per 2 cleric levels beyond 1st`, so at L1
 * it is 1d6, L3 it is 2d6, L5 it is 3d6, and so on. Equivalently:
 * `floor((clericLevel + 1) / 2)` d6.
 *
 * Save DC uses the standard "10 + ½ class level + casting-ability modifier"
 * template; for channel energy the casting ability is Charisma.
 */
export interface ChannelEnergyDetail {
  /** Number of d6 rolled when channeling (1 at L1, 10 at L19). */
  dice: number;
  /** Display string, e.g. "4d6". */
  diceLabel: string;
  /** Will-save DC to halve the damage, 10 + floor(clericLevel/2) + chaMod. */
  saveDC: number;
}

/**
 * Channel-energy dice count and save DC for a cleric of `clericLevel` with a
 * Charisma modifier of `chaMod`. Out-of-range level returns `dice: 0`.
 * The alignment choice (positive vs. negative — heal vs. damage) is display
 * only; the underlying numbers are symmetric.
 */
export function channelEnergyDetail(
  clericLevel: number,
  chaMod: number,
): ChannelEnergyDetail {
  if (clericLevel <= 0) {
    return { dice: 0, diceLabel: "0d6", saveDC: 10 + Math.max(0, chaMod) };
  }
  const dice = Math.floor((clericLevel + 1) / 2);
  const saveDC = 10 + Math.floor(clericLevel / 2) + chaMod;
  return { dice, diceLabel: `${dice}d6`, saveDC };
}
