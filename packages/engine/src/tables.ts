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

/**
 * Craft, Profession, and Perform are each a *family* of independently-ranked
 * subskills in PF1 (Craft [alchemy], Perform [oratory], ...), not one skill
 * line. A character may hold zero, one, or several instances of each, keyed
 * `"<prefix>.<slug>"` (e.g. `"crf.alchemy"`, `"prf.oratory"`) — see
 * {@link skillBaseId}. The bare `"crf"`/`"pro"`/`"prf"` id remains valid on
 * its own (back-compat with existing documents, and usable as an
 * unlabeled/generic instance).
 */
export const PARAMETERIZED_SKILL_PREFIXES: ReadonlySet<string> = new Set(["crf", "pro", "prf"]);

/**
 * Returns the "real" `SKILL_ABILITY`/`SKILL_TRAINED_ONLY` lookup key for a
 * skill id — stripping a parameterized-instance suffix if present (e.g.
 * `"crf.alchemy"` -> `"crf"`). A plain id (no dot) is returned unchanged.
 */
export function skillBaseId(skillId: string): string {
  const dot = skillId.indexOf(".");
  return dot === -1 ? skillId : skillId.slice(0, dot);
}

/** Armor check penalty applies to Strength- and Dexterity-based skill checks. */
export function skillUsesAcp(skillId: string): boolean {
  const ability = SKILL_ABILITY[skillBaseId(skillId)];
  return ability === "str" || ability === "dex";
}

/** All known skill ids (keys of {@link SKILL_ABILITY}). */
export const SKILL_IDS = Object.keys(SKILL_ABILITY);

/**
 * Foundry PF1's `Change.target` grammar includes a handful of "compound
 * skill" group aliases (e.g. `skill.knowledge`) that mean "every sub-skill
 * in this family," distinct from `skill.<id>` targeting one specific skill
 * (e.g. `skill.dev` for Trapfinding). Only `knowledge` is in the vendored
 * slice today (Bard's Bardic Knowledge — `target: "skill.knowledge"`,
 * confirmed in `packs/class-abilities/bardic-knowledge...yaml`); add more
 * aliases here for a fixed SRD family (all of whose members are known ahead
 * of time, like Knowledge's subtypes).
 *
 * Craft/Profession/Perform are deliberately NOT modeled here even though
 * they're also "compound" in the full PF1 rules: their member list isn't
 * fixed — it's whatever parameterized instances (`crf.<slug>`, ...) a given
 * character has created. That fan-out is data-dependent and handled
 * dynamically in `compute.ts`'s skill-target routing via
 * {@link PARAMETERIZED_SKILL_PREFIXES} instead of a static list here.
 */
export const SKILL_GROUPS: Record<string, readonly string[]> = {
  knowledge: SKILL_IDS.filter((id) => id.startsWith("k")),
};

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
  return SKILL_TRAINED_ONLY.has(skillBaseId(skillId));
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
 * table to extend. Cleric and druid share the wizard base-spells-per-day
 * numbers (the domain spell slot granted at each accessible level for cleric,
 * and druid's lack of one, are not included here).
 */
export type SpellProgression =
  | "wizard"
  | "sorcerer"
  | "cleric"
  | "paladin"
  | "ranger"
  | "bard"
  | "druid"
  | "arcanist"
  | "magus"
  | "witch"
  | "shaman";

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
  /* L7  */ [7, 5, 3, 2, null, null, null, null, null, null],
  /* L8  */ [8, 5, 3, 2, 1, null, null, null, null, null],
  /* L9  */ [8, 5, 4, 3, 2, null, null, null, null, null],
  /* L10 */ [9, 5, 4, 3, 2, 1, null, null, null, null],
  /* L11 */ [9, 5, 5, 4, 3, 2, null, null, null, null],
  /* L12 */ [9, 5, 5, 4, 3, 2, 1, null, null, null],
  /* L13 */ [9, 5, 5, 4, 4, 3, 2, null, null, null],
  /* L14 */ [9, 5, 5, 4, 4, 3, 2, 1, null, null],
  /* L15 */ [9, 5, 5, 4, 4, 4, 3, 2, null, null],
  /* L16 */ [9, 5, 5, 4, 4, 4, 3, 2, 1, null],
  /* L17 */ [9, 5, 5, 4, 4, 4, 3, 3, 2, null],
  /* L18 */ [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
  /* L19 */ [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
  /* L20 */ [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
];

/**
 * Progressions for which a separate spells-known table exists. Spontaneous
 * casters have a fixed set of spells they can know at each spell level (capped
 * per the known table), as distinct from prepared casters whose spellbook IS
 * their known list (unlimited within the rules for acquired spells).
 */
export type SpellKnownProgression = "sorcerer" | "bard";

/**
 * Cleric base spells per day, indexed `[classLevel - 1][spellLevel]`. Clerics
 * are full prepared-divine casters and use the same base spells-per-day numbers
 * as the wizard (3/1 at L1, scaling to 4/every-level at L20). The domain spell
 * slot granted at each accessible level is class-feature territory and is NOT
 * included in this base table. Cantrips (level 0) are orisons prepared at will.
 * (PF1 SRD — clean-room table from the published rules, open game content.)
 */
const CLERIC_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY;

/**
 * Druid base spells per day, indexed `[classLevel - 1][spellLevel]`. Druids
 * are full prepared-divine casters and use the same base spells-per-day
 * numbers as the wizard/cleric ("Table: Druid" in the Core Rulebook is
 * numerically identical to "Table: Cleric"). Cantrips (level 0) are orisons
 * prepared at will. (PF1 SRD — clean-room table from the published rules,
 * open game content.)
 */
const DRUID_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY;

/**
 * Paladin/ranger base spells per day, indexed `[classLevel - 1][spellLevel]`.
 * Both are quarter-casters that gain no spellcasting until 4th level and cap at
 * 4th-level spells; "Table: Paladin" and "Table: Ranger" in the Core Rulebook
 * are numerically identical to each other. Column 0 (cantrips) is always null —
 * neither class casts cantrips/orisons. Bonus spells from a high casting
 * ability (Cha for paladin, Wis for ranger) are added on top by
 * {@link bonusSpellsForLevel} and are NOT included here.
 * (PF1 SRD — clean-room table from the published rules, open game content;
 * cross-checked against d20pfsrd.com and aonprd.com.)
 */
const PALADIN_RANGER_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, null, null, null, null, null, null, null, null, null],
  /* L2  */ [null, null, null, null, null, null, null, null, null, null],
  /* L3  */ [null, null, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 0, null, null, null, null, null, null, null, null],
  /* L5  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L6  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L7  */ [null, 1, 0, null, null, null, null, null, null, null],
  /* L8  */ [null, 1, 1, null, null, null, null, null, null, null],
  /* L9  */ [null, 2, 1, null, null, null, null, null, null, null],
  /* L10 */ [null, 2, 1, 0, null, null, null, null, null, null],
  /* L11 */ [null, 2, 1, 1, null, null, null, null, null, null],
  /* L12 */ [null, 2, 2, 1, null, null, null, null, null, null],
  /* L13 */ [null, 3, 2, 1, 0, null, null, null, null, null],
  /* L14 */ [null, 3, 2, 1, 1, null, null, null, null, null],
  /* L15 */ [null, 3, 2, 2, 1, null, null, null, null, null],
  /* L16 */ [null, 3, 3, 2, 1, null, null, null, null, null],
  /* L17 */ [null, 4, 3, 2, 1, null, null, null, null, null],
  /* L18 */ [null, 4, 3, 2, 2, null, null, null, null, null],
  /* L19 */ [null, 4, 3, 3, 2, null, null, null, null, null],
  /* L20 */ [null, 4, 4, 3, 3, null, null, null, null, null],
];

/**
 * Bard base spells per day, indexed `[classLevel - 1][spellLevel]`. Bards are
 * spontaneous arcane casters like sorcerers and, like sorcerers, cast cantrips
 * at will — column 0 is always null here (not a daily resource); the cantrip
 * *count known* is capped separately by {@link BARD_SPELLS_KNOWN}'s column 0.
 * Bards cap at 6th-level spells (columns 7–9 always null). (PF1 SRD —
 * clean-room table from the published rules, open game content; cross-checked
 * against d20pfsrd.com and aonprd.com, both matching exactly. Note: this
 * confirms bards do NOT get a 0-level column in the official "Spells per Day"
 * table, unlike a first-pass assumption that `cantrips: true` implied one —
 * verified directly against the published table header and rows.)
 */
const BARD_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L2  */ [null, 2, null, null, null, null, null, null, null, null],
  /* L3  */ [null, 3, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 3, 1, null, null, null, null, null, null, null],
  /* L5  */ [null, 4, 2, null, null, null, null, null, null, null],
  /* L6  */ [null, 4, 3, null, null, null, null, null, null, null],
  /* L7  */ [null, 4, 3, 1, null, null, null, null, null, null],
  /* L8  */ [null, 4, 4, 2, null, null, null, null, null, null],
  /* L9  */ [null, 5, 4, 3, null, null, null, null, null, null],
  /* L10 */ [null, 5, 4, 3, 1, null, null, null, null, null],
  /* L11 */ [null, 5, 4, 4, 2, null, null, null, null, null],
  /* L12 */ [null, 5, 5, 4, 3, null, null, null, null, null],
  /* L13 */ [null, 5, 5, 4, 3, 1, null, null, null, null],
  /* L14 */ [null, 5, 5, 4, 4, 2, null, null, null, null],
  /* L15 */ [null, 5, 5, 5, 4, 3, null, null, null, null],
  /* L16 */ [null, 5, 5, 5, 4, 3, 1, null, null, null],
  /* L17 */ [null, 5, 5, 5, 4, 4, 2, null, null, null],
  /* L18 */ [null, 5, 5, 5, 5, 4, 3, null, null, null],
  /* L19 */ [null, 5, 5, 5, 5, 5, 4, null, null, null],
  /* L20 */ [null, 5, 5, 5, 5, 5, 5, null, null, null],
];

/**
 * Bard spells known per level, indexed `[classLevel - 1][spellLevel]`. Column
 * 0 caps cantrips known; columns 1–6 cap how many spells the bard may know at
 * that spell level (bards cap at 6th-level spells; columns 7–9 always null).
 * (PF1 SRD — clean-room, open game content; cross-checked against
 * d20pfsrd.com and aonprd.com, both matching exactly.)
 */
const BARD_SPELLS_KNOWN: readonly (readonly (number | null)[])[] = [
  /* L1  */ [4, 2, null, null, null, null, null, null, null, null],
  /* L2  */ [5, 3, null, null, null, null, null, null, null, null],
  /* L3  */ [6, 4, null, null, null, null, null, null, null, null],
  /* L4  */ [6, 4, 2, null, null, null, null, null, null, null],
  /* L5  */ [6, 4, 3, null, null, null, null, null, null, null],
  /* L6  */ [6, 4, 4, null, null, null, null, null, null, null],
  /* L7  */ [6, 5, 4, 2, null, null, null, null, null, null],
  /* L8  */ [6, 5, 4, 3, null, null, null, null, null, null],
  /* L9  */ [6, 5, 4, 4, null, null, null, null, null, null],
  /* L10 */ [6, 5, 5, 4, 2, null, null, null, null, null],
  /* L11 */ [6, 6, 5, 4, 3, null, null, null, null, null],
  /* L12 */ [6, 6, 5, 4, 4, null, null, null, null, null],
  /* L13 */ [6, 6, 5, 5, 4, 2, null, null, null, null],
  /* L14 */ [6, 6, 6, 5, 4, 3, null, null, null, null],
  /* L15 */ [6, 6, 6, 5, 4, 4, null, null, null, null],
  /* L16 */ [6, 6, 6, 5, 5, 4, 2, null, null, null],
  /* L17 */ [6, 6, 6, 6, 5, 4, 3, null, null, null],
  /* L18 */ [6, 6, 6, 6, 5, 4, 4, null, null, null],
  /* L19 */ [6, 6, 6, 6, 5, 5, 4, null, null, null],
  /* L20 */ [6, 6, 6, 6, 6, 5, 5, null, null, null],
];

/**
 * Arcanist base spells PER DAY (the slot pool spent to cast — sorcerer-shaped),
 * indexed `[classLevel - 1][spellLevel]`. Column 0 (cantrips) is always null:
 * the arcanist's ACG "Spells per Day" table has no 0-level column at all —
 * cantrips are governed entirely by {@link ARCANIST_SPELLS_PREPARED}'s column 0
 * instead (prepared daily, then cast at will, same simplification this engine
 * already applies to wizard/cleric/druid cantrips). Bonus spells from a high
 * Intelligence score are added on top by {@link bonusSpellsForLevel} and are
 * NOT included here. Arcanists are a HYBRID caster (ACG): they *prepare* a
 * limited number of spells from their spellbook each day (capped by
 * {@link ARCANIST_SPELLS_PREPARED}, wizard-shaped) but *cast* spontaneously
 * from among those prepared spells by spending a slot of the matching level
 * from THIS table (sorcerer-shaped) — casting never expends the specific
 * prepared spell, only a slot. (PF1 ACG SRD — clean-room table from the
 * published rules, open game content; cross-checked against aonprd.com and
 * the legacy PRD mirror, both matching exactly.)
 */
const ARCANIST_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, 2, null, null, null, null, null, null, null, null],
  /* L2  */ [null, 3, null, null, null, null, null, null, null, null],
  /* L3  */ [null, 4, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 4, 2, null, null, null, null, null, null, null],
  /* L5  */ [null, 4, 3, null, null, null, null, null, null, null],
  /* L6  */ [null, 4, 4, 2, null, null, null, null, null, null],
  /* L7  */ [null, 4, 4, 3, null, null, null, null, null, null],
  /* L8  */ [null, 4, 4, 4, 2, null, null, null, null, null],
  /* L9  */ [null, 4, 4, 4, 3, null, null, null, null, null],
  /* L10 */ [null, 4, 4, 4, 4, 2, null, null, null, null],
  /* L11 */ [null, 4, 4, 4, 4, 3, null, null, null, null],
  /* L12 */ [null, 4, 4, 4, 4, 4, 2, null, null, null],
  /* L13 */ [null, 4, 4, 4, 4, 4, 3, null, null, null],
  /* L14 */ [null, 4, 4, 4, 4, 4, 4, 2, null, null],
  /* L15 */ [null, 4, 4, 4, 4, 4, 4, 3, null, null],
  /* L16 */ [null, 4, 4, 4, 4, 4, 4, 4, 2, null],
  /* L17 */ [null, 4, 4, 4, 4, 4, 4, 4, 3, null],
  /* L18 */ [null, 4, 4, 4, 4, 4, 4, 4, 4, 2],
  /* L19 */ [null, 4, 4, 4, 4, 4, 4, 4, 4, 3],
  /* L20 */ [null, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

/**
 * Magus base spells per day, indexed `[classLevel - 1][spellLevel]`. Magus is
 * a MEDIUM prepared-arcane caster (UM): int-based, caps at 6th-level spells
 * (columns 7-9 always null), gains its first spell slot at 1st level (unlike
 * a paladin/ranger quarter-caster). Bonus spells from a high Intelligence
 * score are added on top by {@link bonusSpellsForLevel} and are NOT included
 * here. (PF1 UM SRD — clean-room table from the published rules, open game
 * content; cross-checked against aonprd.com and d20pfsrd.com, both matching:
 * sanity anchors at L4 4/3/1, L7 5/4/3/1, L10 5/5/4/3/1, L20 all-5s.)
 */
const MAGUS_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [3, 1, null, null, null, null, null, null, null, null],
  /* L2  */ [4, 2, null, null, null, null, null, null, null, null],
  /* L3  */ [4, 3, null, null, null, null, null, null, null, null],
  /* L4  */ [4, 3, 1, null, null, null, null, null, null, null],
  /* L5  */ [4, 4, 2, null, null, null, null, null, null, null],
  /* L6  */ [5, 4, 3, null, null, null, null, null, null, null],
  /* L7  */ [5, 4, 3, 1, null, null, null, null, null, null],
  /* L8  */ [5, 4, 4, 2, null, null, null, null, null, null],
  /* L9  */ [5, 5, 4, 3, null, null, null, null, null, null],
  /* L10 */ [5, 5, 4, 3, 1, null, null, null, null, null],
  /* L11 */ [5, 5, 4, 4, 2, null, null, null, null, null],
  /* L12 */ [5, 5, 5, 4, 3, null, null, null, null, null],
  /* L13 */ [5, 5, 5, 4, 3, 1, null, null, null, null],
  /* L14 */ [5, 5, 5, 4, 4, 2, null, null, null, null],
  /* L15 */ [5, 5, 5, 5, 4, 3, null, null, null, null],
  /* L16 */ [5, 5, 5, 5, 4, 3, 1, null, null, null],
  /* L17 */ [5, 5, 5, 5, 4, 4, 2, null, null, null],
  /* L18 */ [5, 5, 5, 5, 5, 4, 3, null, null, null],
  /* L19 */ [5, 5, 5, 5, 5, 5, 4, null, null, null],
  /* L20 */ [5, 5, 5, 5, 5, 5, 5, null, null, null],
];

/**
 * Witch base spells per day, indexed `[classLevel - 1][spellLevel]`. Witch
 * (APG) is a full prepared-arcane caster and uses the same base spells-per-day
 * numbers as the wizard (3/1 at L1, scaling to 4/every-level at L20) — verified
 * against aonprd.com's "Table: Witch", exact match at every level including the
 * L20 all-4s row. Cantrips (level 0) are the witch's 0-level spells, stored by
 * her familiar and prepared at will alongside everything else. (PF1 APG SRD —
 * clean-room table from the published rules, open game content.)
 */
const WITCH_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY;

/**
 * Shaman base spells per day, indexed `[classLevel - 1][spellLevel]`. Shaman
 * (ACG) is a full prepared-divine caster and uses the same base spells-per-day
 * numbers as the wizard/cleric ("Table: Shaman" is numerically identical to
 * "Table: Cleric") — verified against aonprd.com's "Table: Shaman", exact
 * match at every level including the L20 all-4s row. The shaman's Spirit
 * Magic bonus spontaneous-cast slots granted by her spirit are NOT included
 * here (not modeled yet — see `CASTER_MODELS.shaman`'s blurb). (PF1 ACG SRD —
 * clean-room table from the published rules, open game content.)
 */
const SHAMAN_SPELLS_PER_DAY = CLERIC_SPELLS_PER_DAY;

const PROGRESSIONS: Record<SpellProgression, readonly (readonly (number | null)[])[]> = {
  wizard: WIZARD_SPELLS_PER_DAY,
  sorcerer: SORCERER_SPELLS_PER_DAY,
  cleric: CLERIC_SPELLS_PER_DAY,
  paladin: PALADIN_RANGER_SPELLS_PER_DAY,
  ranger: PALADIN_RANGER_SPELLS_PER_DAY,
  bard: BARD_SPELLS_PER_DAY,
  druid: DRUID_SPELLS_PER_DAY,
  arcanist: ARCANIST_SPELLS_PER_DAY,
  magus: MAGUS_SPELLS_PER_DAY,
  witch: WITCH_SPELLS_PER_DAY,
  shaman: SHAMAN_SPELLS_PER_DAY,
};

const KNOWN_PROGRESSIONS: Record<SpellKnownProgression, readonly (readonly (number | null)[])[]> = {
  sorcerer: SORCERER_SPELLS_KNOWN,
  bard: BARD_SPELLS_KNOWN,
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

/**
 * Arcanist spells PREPARED (the wizard-shaped half of the hybrid ACG class):
 * how many distinct spells from her spellbook she may ready each day at each
 * spell level, indexed `[classLevel - 1][spellLevel]` (column 0 = cantrips).
 * Distinct from {@link ARCANIST_SPELLS_PER_DAY}: an arcanist prepares FEWER
 * spells than she has slots to cast (e.g. at L4: 3 first-level spells
 * prepared vs. 4 first-level slots per day), then spends slots casting any
 * of her prepared spells repeatedly. Unlike bonus spells-per-day, this table
 * is NOT adjusted by a high Intelligence score (no vendored/SRD bonus column
 * for "spells prepared", mirroring how spells-KNOWN tables for sorcerer/bard
 * also take no ability bonus). (PF1 ACG SRD — clean-room, open game content;
 * cross-checked against aonprd.com and the legacy PRD mirror, both matching
 * exactly.)
 */
export type SpellPreparedProgression = "arcanist";

const ARCANIST_SPELLS_PREPARED: readonly (readonly (number | null)[])[] = [
  /* L1  */ [4, 2, null, null, null, null, null, null, null, null],
  /* L2  */ [5, 2, null, null, null, null, null, null, null, null],
  /* L3  */ [5, 3, null, null, null, null, null, null, null, null],
  /* L4  */ [6, 3, 1, null, null, null, null, null, null, null],
  /* L5  */ [6, 4, 2, null, null, null, null, null, null, null],
  /* L6  */ [7, 4, 2, 1, null, null, null, null, null, null],
  /* L7  */ [7, 5, 3, 2, null, null, null, null, null, null],
  /* L8  */ [8, 5, 3, 2, 1, null, null, null, null, null],
  /* L9  */ [8, 5, 4, 3, 2, null, null, null, null, null],
  /* L10 */ [9, 5, 4, 3, 2, 1, null, null, null, null],
  /* L11 */ [9, 5, 5, 4, 3, 2, null, null, null, null],
  /* L12 */ [9, 5, 5, 4, 3, 2, 1, null, null, null],
  /* L13 */ [9, 5, 5, 4, 4, 3, 2, null, null, null],
  /* L14 */ [9, 5, 5, 4, 4, 3, 2, 1, null, null],
  /* L15 */ [9, 5, 5, 4, 4, 4, 3, 2, null, null],
  /* L16 */ [9, 5, 5, 4, 4, 4, 3, 2, 1, null],
  /* L17 */ [9, 5, 5, 4, 4, 4, 3, 3, 2, null],
  /* L18 */ [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
  /* L19 */ [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
  /* L20 */ [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
];

const PREPARED_PROGRESSIONS: Record<
  SpellPreparedProgression,
  readonly (readonly (number | null)[])[]
> = {
  arcanist: ARCANIST_SPELLS_PREPARED,
};

/**
 * Maximum number of distinct spells a caster with `progression` may have
 * PREPARED (readied from her spellbook) at `spellLevel` when `classLevel`.
 * Returns `null` when that spell level is not yet accessible. Out-of-range
 * inputs return `null`. Distinct from {@link baseSpellsPerDay} (the daily slot
 * pool spent casting) and {@link baseSpellsKnown} (a spontaneous caster's
 * permanent known-spells cap) — see {@link ARCANIST_SPELLS_PREPARED}'s doc
 * comment for why the arcanist needs a third, separate table.
 */
export function baseSpellsPrepared(
  progression: SpellPreparedProgression,
  classLevel: number,
  spellLevel: number,
): number | null {
  const table = PREPARED_PROGRESSIONS[progression];
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
export function channelEnergyDetail(clericLevel: number, chaMod: number): ChannelEnergyDetail {
  if (clericLevel <= 0) {
    return { dice: 0, diceLabel: "0d6", saveDC: 10 + Math.max(0, chaMod) };
  }
  const dice = Math.floor((clericLevel + 1) / 2);
  const saveDC = 10 + Math.floor(clericLevel / 2) + chaMod;
  return { dice, diceLabel: `${dice}d6`, saveDC };
}

/* ---------------------------------------------------------- sneak attack -- */

/**
 * Rogue sneak-attack dice, clean-room from the published PF1 SRD (the Sneak
 * Attack class feature's `changes[]` is prose-only upstream — the die count
 * is NOT among the vendored data).
 *
 * Extra damage = `1d6 at 1st level, +1d6 every two rogue levels thereafter`,
 * so at L1 it is 1d6, L2 it is 1d6, L3 it is 2d6, L5 it is 3d6, and so on.
 * Equivalently: `floor((rogueLevel + 1) / 2)` d6 — the same formula shape as
 * `channelEnergyDetail`'s dice count.
 */
export interface SneakAttackDetail {
  /** Number of d6 rolled on a sneak attack (0 with no rogue levels, 10 at L19+). */
  dice: number;
  /** Display string, e.g. "3d6". */
  diceLabel: string;
}

/**
 * Sneak-attack dice count for a rogue of `rogueLevel`. Out-of-range level
 * returns `dice: 0`.
 */
export function sneakAttackDice(rogueLevel: number): SneakAttackDetail {
  if (rogueLevel <= 0) {
    return { dice: 0, diceLabel: "0d6" };
  }
  const dice = Math.floor((rogueLevel + 1) / 2);
  return { dice, diceLabel: `${dice}d6` };
}

/* ------------------------------------------------------------ smite evil -- */

/**
 * Paladin Smite Evil scaling, clean-room from the published PF1 SRD (the
 * Smite Evil class feature's `changes[]` is prose-only upstream — only the
 * `uses.maxFormula` use-count is vendored; the attack/damage/AC math is not).
 *
 * "the paladin adds her Charisma bonus (if any) to her attack rolls and adds
 * her paladin level to all damage rolls made against the target of her
 * smite. ... the paladin gains a deflection bonus equal to her Charisma
 * modifier (if any) to her AC against attacks made by the target of the
 * smite." Both the attack and AC bonuses are "(if any)" — a negative Cha
 * modifier does not become a penalty, so both floor at 0. Damage is a flat
 * `paladinLevel` (not halved, not dice) against the general smite target; the
 * SRD's "2 points of damage per level" against evil outsiders/evil dragons/
 * undead is a first-successful-attack-only escalation and is display/prose
 * territory, not modeled here (same posture as prose-only feature text
 * elsewhere in this engine).
 */
export interface SmiteEvilDetail {
  /** Bonus to attack rolls vs. the smite target: max(0, chaMod). */
  attackBonus: number;
  /** Bonus to damage rolls vs. the smite target: flat paladinLevel. */
  damageBonus: number;
  /** Deflection bonus to AC vs. the smite target: max(0, chaMod). */
  acBonus: number;
}

/**
 * Smite Evil's attack/damage/AC bonuses for a paladin of `paladinLevel` with
 * a Charisma modifier of `chaMod`. Out-of-range level returns all-zero
 * bonuses (a 0-level "paladin" has no Smite Evil).
 */
export function smiteEvilDetail(paladinLevel: number, chaMod: number): SmiteEvilDetail {
  if (paladinLevel <= 0) {
    return { attackBonus: 0, damageBonus: 0, acBonus: 0 };
  }
  const chaBonus = Math.max(0, chaMod);
  return { attackBonus: chaBonus, damageBonus: paladinLevel, acBonus: chaBonus };
}

/**
 * One-line display string for a {@link SmiteEvilDetail}, e.g.
 * "+3 atk, +5 dmg, +3 AC vs. evil". Shared by `resolveClassFeatures`'s
 * classFeature `detail` and `deriveResourcePools`'s pool `detail` so the two
 * surfaces (class-features list, resource-pool row) never drift.
 */
export function smiteEvilLabel(detail: SmiteEvilDetail): string {
  return `+${detail.attackBonus} atk, +${detail.damageBonus} dmg, +${detail.acBonus} AC vs. evil`;
}

/* -------------------------------------------------------- lay on hands ---- */

/**
 * Paladin Lay on Hands healing dice, clean-room from the published PF1 SRD
 * (the healing dice live on the class feature's `action.damage` formula
 * upstream, which is NOT part of the vendored `ClassFeature` shape — only
 * `uses.maxFormula` is captured — so the dice count doesn't come from the
 * pipeline's JSON and is hand-authored here, same posture as
 * `sneakAttackDice`).
 *
 * "a paladin can heal 1d6 hit points of damage for every two paladin levels
 * she possesses" — `floor(paladinLevel / 2)` d6.
 */
export interface LayOnHandsDetail {
  /** Number of d6 healed per use (0 below 2nd level, 10 at L20). */
  dice: number;
  /** Display string, e.g. "2d6". */
  diceLabel: string;
}

/**
 * Lay on Hands healing dice count for a paladin of `paladinLevel`.
 * Out-of-range level returns `dice: 0`.
 */
export function layOnHandsDice(paladinLevel: number): LayOnHandsDetail {
  if (paladinLevel <= 0) {
    return { dice: 0, diceLabel: "0d6" };
  }
  const dice = Math.floor(paladinLevel / 2);
  return { dice, diceLabel: `${dice}d6` };
}

/* -------------------------------------------------------- unarmed strike -- */

/**
 * Monk unarmed strike damage die, clean-room from the published PF1 SRD
 * "Table: Monk Unarmed Damage" — Medium column only (this engine doesn't
 * model non-Medium creature sizes for this table; same posture as other
 * hand-authored dice tables here). The Monk class feature's own vendored
 * `description` embeds the full Small/Medium/Large table upstream, and it
 * also carries a real dice-bearing action formula
 * (`sizeRoll(ceil(@class.unlevel/11), 6 + floor(@class.unlevel/4) % 3 * 2, @size)`)
 * — but per this project's formula-DSL convention (`formula.ts`: dice terms
 * parse but throw on numeric eval), that's not evaluated here; the display
 * table below is hand-authored directly from the SRD text instead, same
 * posture as `sneakAttackDice` and `smiteEvilDetail`.
 *
 * Progression: 1d6 (L1-3), 1d8 (L4-7), 1d10 (L8-11), 2d6 (L12-15),
 * 2d8 (L16-19), 2d10 (L20).
 */
export interface UnarmedDamageDetail {
  /** Display string, e.g. "1d8". */
  dieLabel: string;
}

/**
 * Unarmed strike damage die for a monk of `monkLevel` (Medium size).
 * Out-of-range (<=0) level is clamped to the L1-3 tier, since a monk's
 * Unarmed Strike class feature is always granted at 1st level.
 */
export function unarmedDamageDie(monkLevel: number): UnarmedDamageDetail {
  const level = Math.max(1, monkLevel);
  if (level <= 3) return { dieLabel: "1d6" };
  if (level <= 7) return { dieLabel: "1d8" };
  if (level <= 11) return { dieLabel: "1d10" };
  if (level <= 15) return { dieLabel: "2d6" };
  if (level <= 19) return { dieLabel: "2d8" };
  return { dieLabel: "2d10" }; // L20
}

/* ------------------------------------------------------- flurry of blows -- */

/**
 * Monk Flurry of Blows display summary, clean-room from the published PF1
 * SRD: as a full-attack action, a monk may forgo her normal attacks to make
 * a flurry of extra unarmed (or monk weapon) attacks, using her monk level
 * in place of her true BAB for those attacks, all at a flat -2 penalty. She
 * gets 1 extra attack at 1st level (2 attacks total), a 2nd extra attack at
 * 8th level (3 attacks total, "as if using Improved Two-Weapon Fighting"),
 * and a 3rd extra attack at 15th level (4 attacks total, "as if using
 * Greater Two-Weapon Fighting").
 *
 * Note: the SRD actually reduces the flat -2 penalty to -1 at monk level 11
 * and drops it entirely at level 16 — this display-only summary keeps a flat
 * -2 at every tier for simplicity, since (per this project's scope) Flurry
 * of Blows is NOT wired into the live attacks/iteratives table at all (that
 * table only models true-BAB full-attack routines); this is a static
 * reference note, not a live roll input.
 */
export function flurryOfBlowsLabel(monkLevel: number): string {
  if (monkLevel <= 0) return "";
  const attacks = monkLevel <= 7 ? 2 : monkLevel <= 14 ? 3 : 4;
  return `${attacks} attacks at -2 (BAB = monk level)`;
}

/* ------------------------------------------------------ barbarian DR ---- */

/**
 * Barbarian Damage Reduction, clean-room from the published PF1 SRD (the
 * Damage Reduction class feature's `changes[]` is empty upstream — Foundry
 * doesn't model DR via `changes` at all in this vendored slice — so both the
 * class-feature `detail` string and the defenses-line contribution are
 * hand-authored here, same posture as `sneakAttackDice`/`smiteEvilDetail`).
 *
 * "At 7th level, a barbarian gains DR 1/—. ... This increases by 1 point for
 * every three barbarian levels attained after 7th level, to a maximum of
 * 5/— at 19th level."  => 1/— at 7, 2/— at 10, 3/— at 13, 4/— at 16, 5/— at 19.
 */
export interface BarbarianDrDetail {
  /** DR amount (0 below 7th level, 5 at L19+). */
  amount: number;
  /** Display string, e.g. "3/—" (or "0/—" below 7th level, not normally shown). */
  label: string;
}

/**
 * Barbarian Damage Reduction for a barbarian of `barbarianLevel`. Below 7th
 * level, `amount` is 0 (the feature isn't granted yet).
 */
export function barbarianDamageReduction(barbarianLevel: number): BarbarianDrDetail {
  if (barbarianLevel < 7) return { amount: 0, label: "0/—" };
  const amount = 1 + Math.floor((barbarianLevel - 7) / 3);
  return { amount, label: `${amount}/—` };
}

/**
 * Fighter's Weapon Training, clean-room from the published PF1 rules (the
 * class feature's `changes[]` is empty upstream, same posture as
 * `barbarianDamageReduction` — see issue #45's "Fighter weapon training group
 * choices" deferred-item entry in IMPLEMENTATION_PLAN.md, now built).
 *
 * "Starting at 5th level, a fighter can select one group of weapons... he
 * gains a +1 bonus on attack and damage rolls. Every four levels thereafter
 * (9th, 13th, and 17th), a fighter becomes further trained in another group
 * of weapons... the bonuses granted by previous weapon groups increase by +1
 * each." Each of the 4 tiers is 4 levels apart, so "the bonus granted by a
 * group increases by +1 every time a LATER tier unlocks" collapses to the
 * same `1 + floor((level - grantLevel) / 4)` shape as every other Weapon-
 * Training-family formula in `archetype-extracted/fighter.ts` — this is the
 * canonical, unmodified version those are reflavors of.
 */
export const WEAPON_TRAINING_LEVELS: readonly number[] = [5, 9, 13, 17];

/**
 * Weapon Training's current attack/damage bonus (both rolls get the same
 * value) for the group picked at `tierIndex` (0-based index into
 * {@link WEAPON_TRAINING_LEVELS}), given the fighter's current class level.
 * 0 before that tier's own grant level, or for an out-of-range `tierIndex`.
 */
export function weaponTrainingBonus(fighterLevel: number, tierIndex: number): number {
  const grantLevel = WEAPON_TRAINING_LEVELS[tierIndex];
  if (grantLevel === undefined || fighterLevel < grantLevel) return 0;
  return 1 + Math.floor((fighterLevel - grantLevel) / 4);
}
