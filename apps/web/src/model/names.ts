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

/**
 * Turn a user-entered label into a stable slug for a parameterized skill id
 * (e.g. "Alchemy" -> "alchemy", "Basket Weaving!" -> "basket-weaving").
 * Lowercase, non-alphanumeric runs collapse to a single "-", leading/trailing
 * "-" trimmed. Returns "" for a label with no alphanumeric content.
 */
export function slugifySkillLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Reverse of {@link slugifySkillLabel} for display: "basket-weaving" -> "Basket Weaving". */
function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Skill id -> display name. A parameterized instance id ("crf.alchemy") has
 * no separate stored label — see engine's `PARAMETERIZED_SKILL_PREFIXES` doc
 * comment for why: the slug IS the label, humanized back for display
 * ("Craft (Alchemy)"). This keeps id and label a single source of truth (no
 * stale label if the underlying id is ever inspected/edited directly) at the
 * cost of a rename changing the id — acceptable since renaming a subskill
 * instance is rare and goes through `model/doc.ts`'s `renameSkillInstance`,
 * which moves the ranks to the new id atomically.
 */
export function skillName(id: SkillId): string {
  const dot = id.indexOf(".");
  if (dot === -1) return SKILL_NAMES[id] ?? id;
  const base = id.slice(0, dot);
  const slug = id.slice(dot + 1);
  const baseName = SKILL_NAMES[base] ?? base;
  const label = humanizeSlug(slug);
  return label ? `${baseName} (${label})` : baseName;
}

/** Alignment code -> full display label. */
export const ALIGNMENT_LABELS: Record<string, string> = {
  LG: "Lawful Good",
  NG: "Neutral Good",
  CG: "Chaotic Good",
  LN: "Lawful Neutral",
  N: "Neutral",
  CN: "Chaotic Neutral",
  LE: "Lawful Evil",
  NE: "Neutral Evil",
  CE: "Chaotic Evil",
};

/** Format a signed modifier, e.g. 3 -> "+3", -1 -> "-1", 0 -> "+0". */
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Format a full-attack sequence, e.g. [11, 6] -> "+11/+6". Falls back to a
 * single signed total when there's no iterative sequence (BAB < 6).
 */
export function signedSequence(total: number, iteratives?: number[]): string {
  if (!iteratives || iteratives.length < 2) return signed(total);
  return iteratives.map(signed).join("/");
}
