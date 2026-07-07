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

const ALIGNMENT_NAME_TO_CODE: Map<string, string> = new Map(
  Object.entries(ALIGNMENT_LABELS).map(([code, label]) => [label.toLowerCase(), code]),
);
const ALIGNMENT_CODES = new Set(Object.keys(ALIGNMENT_LABELS));

/**
 * Normalize free-text alignment ("Chaotic Evil", "ce", "CE") to the two-letter
 * code the builder's Alignment dropdown expects (case-insensitive on both the
 * code and the full label). Returns undefined when unrecognized — callers
 * decide whether to still store the raw text (the schema allows any string).
 */
export function normalizeAlignmentCode(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (ALIGNMENT_CODES.has(upper)) return upper;
  return ALIGNMENT_NAME_TO_CODE.get(trimmed.toLowerCase());
}

/**
 * Human labels for the engine's flat (non-prefixed) `Change`/`ContextNote`
 * targets — see `packages/engine/src/targets.ts` for the canonical
 * vocabulary (`APPLIED_TARGETS` plus the unapplied-only ones formerly listed
 * separately in `UNAPPLIED_TARGET_LABELS`). Covers both targets `compute()`
 * consumes and ones it doesn't — a raw buff/gear row can show either.
 */
const CHANGE_TARGET_LABELS: Record<string, string> = {
  // saves
  fort: "Fortitude",
  ref: "Reflex",
  will: "Will",
  allSavingThrows: "all saving throws",
  // AC
  ac: "AC",
  aac: "AC (armor)",
  sac: "AC (shield)",
  nac: "AC (natural)",
  // combat maneuver
  cmb: "CMB",
  cmd: "CMD",
  // initiative / hp / skills
  init: "Initiative",
  hp: "HP",
  skills: "all skills",
  // attack + damage
  attack: "attack rolls",
  mattack: "melee attack rolls",
  rattack: "ranged attack rolls",
  tattack: "touch attack rolls",
  nattack: "natural attack rolls",
  damage: "damage",
  wdamage: "weapon damage",
  mwdamage: "melee weapon damage",
  rwdamage: "ranged weapon damage",
  twdamage: "thrown weapon damage",
  ndamage: "natural attack damage",
  critConfirm: "crit confirmation rolls",
  // misc
  concentration: "concentration checks",
  cl: "caster level",
  reach: "reach",
  allChecks: "all ability checks",
  // movement
  landSpeed: "land speed",
  flySpeed: "fly speed",
  swimSpeed: "swim speed",
  climbSpeed: "climb speed",
  burrowSpeed: "burrow speed",
  // size / armor interactions
  size: "size",
  mDexA: "max Dex bonus (armor)",
  acpA: "armor check penalty",
  // feats / skill ranks
  bonusFeats: "bonus feats",
  bonusSkillRanks: "bonus skill ranks",
  // defenses
  spellResist: "spell resistance",
  dr: "damage reduction",
  // per-ability checks/skills/penalties
  strChecks: "Str-based ability checks",
  dexChecks: "Dex-based ability checks",
  conChecks: "Con-based ability checks",
  intChecks: "Int-based ability checks",
  wisChecks: "Wis-based ability checks",
  chaChecks: "Cha-based ability checks",
  strSkills: "Str-based skill checks",
  dexSkills: "Dex-based skill checks",
  conSkills: "Con-based skill checks",
  intSkills: "Int-based skill checks",
  wisSkills: "Wis-based skill checks",
  chaSkills: "Cha-based skill checks",
  strPen: "Strength penalties",
  dexPen: "Dexterity penalties",
  conPen: "Constitution penalties",
  intPen: "Intelligence penalties",
  wisPen: "Wisdom penalties",
  chaPen: "Charisma penalties",
  // carrying capacity / senses
  carryStr: "carrying capacity",
  carryMult: "carrying capacity",
  sensedv: "senses",
  sensebse: "senses",
  sensetr: "senses",
  senseall: "senses",
};

/** "coldIron" -> "cold iron", "adamantine" -> "adamantine". */
function humanizeCamel(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

/** "blades-light" -> "Blades Light" (a `WEAPON_GROUPS` slug). */
function weaponGroupLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Human label for any raw `Change`/`ContextNote` target string, e.g.
 * "tattack" -> "touch attack rolls", "skill.per" -> "Perception",
 * "eres.fire" -> "fire resistance", "dr.coldIron" -> "DR (bypassed by cold iron)".
 * Falls back to the raw target string for anything not recognized, so an
 * unmapped target still renders (just not humanized) rather than disappearing.
 */
export function changeTargetLabel(target: string): string {
  const direct = CHANGE_TARGET_LABELS[target];
  if (direct) return direct;

  const abilityId = target as AbilityId;
  if (ABILITY_NAMES[abilityId]) return ABILITY_NAMES[abilityId];

  if (target.startsWith("skill.")) return skillName(target.slice("skill.".length) as SkillId);
  if (target.startsWith("attack.weapon.")) {
    return `${weaponGroupLabel(target.slice("attack.weapon.".length))} weapon attack rolls`;
  }
  if (target.startsWith("damage.weapon.")) {
    return `${weaponGroupLabel(target.slice("damage.weapon.".length))} weapon damage`;
  }
  if (target.startsWith("dr.")) return `DR (bypassed by ${humanizeCamel(target.slice(3))})`;
  if (target.startsWith("eres.")) return `${humanizeCamel(target.slice(5))} resistance`;

  return target;
}

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
