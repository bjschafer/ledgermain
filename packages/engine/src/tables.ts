/**
 * Hardcoded PF1 progression tables. The numeric BAB/save values per tier are NOT
 * in the vendored data (only the `high|med|low` / `high|low` tier labels), so the
 * standard rules tables live here. All are computed per class level and summed
 * across a multiclass character (the +2 base good-save bonus applies once per
 * class, which is the correct PF1 multiclass behaviour).
 */

import type { AbilityId, BabTier, SaveTier, SizeId } from "@pf1/schema";

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
