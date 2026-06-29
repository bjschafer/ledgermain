/**
 * Display labels for the Foundry abbreviations the engine/data use. Pure data;
 * no framework deps so it can be unit-tested and reused anywhere.
 */
import type { AbilityId, SkillId } from "@pf1/schema";

export const ABILITY_NAMES: Record<AbilityId, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const ABILITY_ABBR: Record<AbilityId, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export const SAVE_NAMES: Record<"fort" | "ref" | "will", string> = {
  fort: "Fortitude",
  ref: "Reflex",
  will: "Will",
};

/** Skill id -> display name (mirrors the comments in engine/src/tables.ts). */
export const SKILL_NAMES: Record<SkillId, string> = {
  acr: "Acrobatics",
  apr: "Appraise",
  art: "Artistry",
  blf: "Bluff",
  clm: "Climb",
  crf: "Craft",
  dip: "Diplomacy",
  dev: "Disable Device",
  dis: "Disguise",
  esc: "Escape Artist",
  fly: "Fly",
  han: "Handle Animal",
  hea: "Heal",
  int: "Intimidate",
  kar: "Knowledge (arcana)",
  kdu: "Knowledge (dungeoneering)",
  ken: "Knowledge (engineering)",
  kge: "Knowledge (geography)",
  khi: "Knowledge (history)",
  klo: "Knowledge (local)",
  kna: "Knowledge (nature)",
  kno: "Knowledge (nobility)",
  kpl: "Knowledge (planes)",
  kre: "Knowledge (religion)",
  lin: "Linguistics",
  lor: "Lore",
  per: "Perception",
  prf: "Perform",
  pro: "Profession",
  rid: "Ride",
  sen: "Sense Motive",
  slt: "Sleight of Hand",
  spl: "Spellcraft",
  ste: "Stealth",
  sur: "Survival",
  swm: "Swim",
  umd: "Use Magic Device",
};

export function skillName(id: SkillId): string {
  return SKILL_NAMES[id] ?? id;
}

/** Format a signed modifier, e.g. 3 -> "+3", -1 -> "-1", 0 -> "+0". */
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
