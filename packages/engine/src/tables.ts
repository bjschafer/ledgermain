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
 * published rules). Only full prepared-arcane (wizard) is tabled today; add a
 * key + table to extend.
 */
export type SpellProgression = "wizard";

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

const PROGRESSIONS: Record<SpellProgression, readonly (readonly (number | null)[])[]> = {
  wizard: WIZARD_SPELLS_PER_DAY,
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
