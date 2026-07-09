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
  | "alchemist"
  | "investigator"
  | "inquisitor"
  | "summoner"
  | "skald"
  | "witch"
  | "shaman"
  | "warpriest"
  | "bloodrager"
  | "antipaladin"
  | "summonerUnchained"
  | "mesmerist"
  | "occultist"
  | "spiritualist"
  | "psychic"
  | "medium";

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
export type SpellKnownProgression =
  | "sorcerer"
  | "bard"
  | "inquisitor"
  | "summoner"
  | "skald"
  | "bloodrager"
  | "summonerUnchained"
  | "mesmerist"
  | "spiritualist"
  | "medium";

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
 * Inquisitor (APG, Wis), Summoner (APG, Cha), and Skald (ACG, Cha) base spells
 * per day / spells known, indexed `[classLevel - 1][spellLevel]`. All three are
 * 6-level-max spontaneous casters (like bard: cantrips cast at will, column 0
 * of the per-day table is always null, column 0 of the known table caps
 * cantrips known) and — verified against aonprd.com's live class pages AND
 * legacy.aonprd.com's static mirror (both matching exactly at every level,
 * 1-20, for both tables) — their "Spells per Day" and "Spells Known" tables
 * are numerically IDENTICAL to the bard's, not just similarly-shaped. (This
 * is also documented directly: the skald casts "arcane spells drawn from the
 * bard spell list.") So, same posture as `oracle: sorcerer` in
 * `apps/web/src/model/spellcasting.ts` and `DRUID_SPELLS_PER_DAY =
 * WIZARD_SPELLS_PER_DAY` above, all three reuse `BARD_SPELLS_PER_DAY` /
 * `BARD_SPELLS_KNOWN` rather than duplicating an identical table under a new
 * key. (PF1 APG/ACG SRD — clean-room, open game content.)
 */
const INQUISITOR_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY;
const SUMMONER_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY;
const SKALD_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY;
const INQUISITOR_SPELLS_KNOWN = BARD_SPELLS_KNOWN;
const SUMMONER_SPELLS_KNOWN = BARD_SPELLS_KNOWN;
const SKALD_SPELLS_KNOWN = BARD_SPELLS_KNOWN;

/**
 * Summoner (Unchained) base spells per day / spells known, indexed
 * `[classLevel - 1][spellLevel]`. Pathfinder Unchained's summoner rewrite
 * (PZO1128) replaces the eidolon's evolution-point system and several class
 * features (Life Link, Bond Senses, Aspect, ...), but its "Spells per Day" /
 * "Spells Known" tables are published numerically IDENTICAL to the base
 * (chained) summoner's — verified against aonprd.com's "Summoner
 * (Unchained)" class page, matching at every level 1-20 against
 * `SUMMONER_SPELLS_PER_DAY`/`SUMMONER_SPELLS_KNOWN` (themselves an alias of
 * the bard's tables, per the doc comment above). Reused rather than
 * duplicated, same posture as `DRUID_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY`.
 * What DOES differ between the two summoners is the SPELL LIST itself
 * (vendored separately — `refData.spellLists.summonerUnchained` — e.g.
 * Haste/Slow moved from 2nd to 3rd level); that's a data-level difference
 * these shared per-day/known tables don't need to know about.
 */
const SUMMONER_UNCHAINED_SPELLS_PER_DAY = SUMMONER_SPELLS_PER_DAY;
const SUMMONER_UNCHAINED_SPELLS_KNOWN = SUMMONER_SPELLS_KNOWN;

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
 * Alchemist base extracts per day, indexed `[classLevel - 1][spellLevel]`.
 * Alchemists (APG) are int-based prepared casters with NO 0-level extracts at
 * all (column 0 always null — not merely "cast at will" like wizard/cleric
 * cantrips, extracts simply have no 0-level tier) and cap at 6th-level
 * extracts (columns 7-9 always null). Extracts are readied each morning like
 * prepared spells but are physically brewed into consumable items ("Alchemy"
 * class feature) rather than cast directly — this engine models the per-day
 * count identically to a prepared caster's spell slots (see
 * `CASTER_MODELS.alchemist` in `apps/web/src/model/spellcasting.ts`). Bonus
 * extracts from a high Intelligence score are added on top by
 * {@link bonusSpellsForLevel} and are NOT included here. (PF1 APG SRD —
 * clean-room table from the published rules, open game content;
 * cross-checked against aonprd.com and d20pfsrd.com, both matching exactly at
 * every level: L1 1, L4 3/1, L7 4/3/1, L10 5/4/3/1, L16 5/5/5/4/3/1, L20
 * all-5s.)
 */
const ALCHEMIST_EXTRACTS_PER_DAY: readonly (readonly (number | null)[])[] = [
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
 * Investigator base extracts per day, indexed `[classLevel - 1][spellLevel]`.
 * Investigators (ACG) use "the alchemist formula list" and an int-based
 * extract progression numerically IDENTICAL to the alchemist's (PF1 ACG SRD
 * — clean-room, cross-checked against aonprd.com and d20pfsrd.com, both
 * matching {@link ALCHEMIST_EXTRACTS_PER_DAY} exactly at every level), so the
 * alchemist table is reused rather than duplicated — same posture as
 * `DRUID_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY` above.
 */
const INVESTIGATOR_EXTRACTS_PER_DAY = ALCHEMIST_EXTRACTS_PER_DAY;

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

/**
 * Warpriest base spells per day, indexed `[classLevel - 1][spellLevel]`.
 * Warpriest (ACG) is a MEDIUM prepared-divine caster, wis-based, caps at
 * 6th-level spells (columns 7-9 always null), gains its first spell slot
 * (plus 3 orisons) at 1st level. Column 0 (orisons) is a real per-day
 * preparable count here, same shape as cleric/wizard's cantrip column — NOT
 * null the way it is for bard/sorcerer, since warpriest is a *prepared*
 * caster (see `CASTER_MODELS.warpriest`'s `grantsAllCantrips: true`). Bonus
 * spells from a high Wisdom score are added on top by
 * {@link bonusSpellsForLevel} and are NOT included here. (PF1 ACG SRD —
 * clean-room table, hand-typed from the published rules, open game content;
 * verified against the raw "Table: Warpriest" on legacy.aonprd.com and
 * cross-checked against aonprd.com/d20pfsrd.com, all three matching exactly:
 * sanity anchors at L1 3/1, L6 5/4/3, L10 5/5/4/3/1, L20 all-5s.)
 */
const WARPRIEST_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
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
 * Bloodrager base spells per day, indexed `[classLevel - 1][spellLevel]`.
 * Bloodrager (ACG) is a cha-based spontaneous arcane caster that gains NO
 * spellcasting at all until 4th level and caps at 4th-level spells (columns
 * 5-9 always null) — same "late start, low cap" shape as
 * {@link PALADIN_RANGER_SPELLS_PER_DAY}, but unlike paladin/ranger a
 * bloodrager's caster level is a straight `bloodragerLevel` with NO -3 (or
 * similar) offset: per PF1 Core Rulebook ch.9's default caster-level rule
 * ("equal to her class level in the class she's using to cast the spell")
 * and confirmed by Paizo designers Owen K.C. Stephens / Mark Seifter on the
 * official rules forums (a bloodrager's minimum caster level for 1st-level
 * spells is 4, not 1) — see `model/casterLevel.ts`'s doc comment for how
 * this is wired. Column 0 (cantrips) is always null: bloodragers get no
 * orisons at all (no "Orisons" class feature; the vendored `spell-lists.json`
 * bloodrager entry has no 0-level key). Bonus spells from a high Charisma
 * score are added on top by {@link bonusSpellsForLevel} and are NOT included
 * here. (PF1 ACG SRD — clean-room table, hand-typed from the published
 * rules, open game content; verified against the raw "Table: Bloodrager" on
 * legacy.aonprd.com and cross-checked against aonprd.com/d20pfsrd.com, all
 * three matching exactly: sanity anchors at L4 1/-/-/-, L10 2/1/1/-, L20
 * 4/4/3/2.)
 */
const BLOODRAGER_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, null, null, null, null, null, null, null, null, null],
  /* L2  */ [null, null, null, null, null, null, null, null, null, null],
  /* L3  */ [null, null, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L5  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L6  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L7  */ [null, 1, 1, null, null, null, null, null, null, null],
  /* L8  */ [null, 1, 1, null, null, null, null, null, null, null],
  /* L9  */ [null, 2, 1, null, null, null, null, null, null, null],
  /* L10 */ [null, 2, 1, 1, null, null, null, null, null, null],
  /* L11 */ [null, 2, 1, 1, null, null, null, null, null, null],
  /* L12 */ [null, 2, 2, 1, null, null, null, null, null, null],
  /* L13 */ [null, 3, 2, 1, 1, null, null, null, null, null],
  /* L14 */ [null, 3, 2, 1, 1, null, null, null, null, null],
  /* L15 */ [null, 3, 2, 2, 1, null, null, null, null, null],
  /* L16 */ [null, 3, 3, 2, 1, null, null, null, null, null],
  /* L17 */ [null, 4, 3, 2, 1, null, null, null, null, null],
  /* L18 */ [null, 4, 3, 2, 2, null, null, null, null, null],
  /* L19 */ [null, 4, 3, 3, 2, null, null, null, null, null],
  /* L20 */ [null, 4, 4, 3, 2, null, null, null, null, null],
];

/**
 * Bloodrager spells known per level, indexed `[classLevel - 1][spellLevel]`.
 * Column 0 (cantrips) is always null — bloodragers know no orisons at all
 * (see {@link BLOODRAGER_SPELLS_PER_DAY}'s doc comment). Starts at 4th level,
 * same late-start shape as the per-day table above. (PF1 ACG SRD —
 * clean-room, open game content; verified against the raw "Table: Bloodrager
 * Spells Known" on legacy.aonprd.com and cross-checked against
 * aonprd.com/d20pfsrd.com, all three matching exactly.)
 */
const BLOODRAGER_SPELLS_KNOWN: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, null, null, null, null, null, null, null, null, null],
  /* L2  */ [null, null, null, null, null, null, null, null, null, null],
  /* L3  */ [null, null, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 2, null, null, null, null, null, null, null, null],
  /* L5  */ [null, 3, null, null, null, null, null, null, null, null],
  /* L6  */ [null, 4, null, null, null, null, null, null, null, null],
  /* L7  */ [null, 4, 2, null, null, null, null, null, null, null],
  /* L8  */ [null, 4, 3, null, null, null, null, null, null, null],
  /* L9  */ [null, 5, 4, null, null, null, null, null, null, null],
  /* L10 */ [null, 5, 4, 2, null, null, null, null, null, null],
  /* L11 */ [null, 5, 4, 3, null, null, null, null, null, null],
  /* L12 */ [null, 6, 5, 4, null, null, null, null, null, null],
  /* L13 */ [null, 6, 5, 4, 2, null, null, null, null, null],
  /* L14 */ [null, 6, 5, 4, 3, null, null, null, null, null],
  /* L15 */ [null, 6, 6, 5, 4, null, null, null, null, null],
  /* L16 */ [null, 6, 6, 5, 4, null, null, null, null, null],
  /* L17 */ [null, 6, 6, 5, 4, null, null, null, null, null],
  /* L18 */ [null, 6, 6, 6, 5, null, null, null, null, null],
  /* L19 */ [null, 6, 6, 6, 5, null, null, null, null, null],
  /* L20 */ [null, 6, 6, 6, 5, null, null, null, null, null],
];

/**
 * Mesmerist, Occultist, and Spiritualist (Occult Adventures, PZO1132) are all
 * 6-level-max spontaneous PSYCHIC casters (own spell lists, own governing
 * ability — Cha/Int/Wis respectively) whose "Spells per Day" tables are
 * numerically IDENTICAL to the bard's (verified directly against aonprd.com's
 * live class pages, all 20 rows, spell levels 1-6 — mesmerist and spiritualist
 * additionally have a published "Spells Known" table, ALSO numerically
 * identical to the bard's at every level; occultist has no published "Spells
 * Known" table at all — see `CASTER_MODELS.occultist`'s doc comment in
 * `apps/web/src/model/spellcasting.ts`), so the bard progression tables are
 * reused rather than duplicated — same posture as `inquisitor`/`summoner`/
 * `skald`/`hunter` above. Psychic magic is NOT arcane (no arcane spell
 * failure) — these three are deliberately absent from `compute.ts`'s
 * `ARCANE_CASTER_TAGS`.
 */
const MESMERIST_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY;
const OCCULTIST_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY;
const SPIRITUALIST_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY;
const MESMERIST_SPELLS_KNOWN = BARD_SPELLS_KNOWN;
const SPIRITUALIST_SPELLS_KNOWN = BARD_SPELLS_KNOWN;

/**
 * Psychic (Occult Adventures) base spells per day, indexed
 * `[classLevel - 1][spellLevel]`. A psychic is an int-based, 9-level-max
 * SPONTANEOUS full caster (cast any known spell without preparing it) —
 * verified against the raw "Table: Psychic" on legacy.aonprd.com: numerically
 * IDENTICAL to the sorcerer's own spells-per-day table at every level (both
 * cap at 6 slots/level from L8 on and share the same L20 all-6s shape), so
 * the sorcerer progression table is reused rather than duplicated — same
 * posture as `oracle: progression: "sorcerer"` in `apps/web/src/model/
 * spellcasting.ts`. Column 0 (cantrips) is always null: psychics cast
 * cantrips ("knacks") at will, capped separately by the spells-known table's
 * column 0. This is also the reason "psychic" MUST be added to
 * `FULL_CASTER_TAGS` in `apps/web/src/model/casterLevel.ts` — unlike Medium
 * (below) or Bloodrager, a psychic's caster level equals her class level
 * starting at 1st level, with no late-start gate.
 */
const PSYCHIC_SPELLS_PER_DAY = SORCERER_SPELLS_PER_DAY;

/**
 * Psychic Spells Known — verified against the raw "Table: Psychic Spells
 * Known" on legacy.aonprd.com (fetched directly, not summarized): numerically
 * IDENTICAL to the sorcerer's own Spells Known table at every one of the 20
 * levels, including the L1 4/2 anchor and the L20 9/5/5/4/4/4/3/3/3/3 row.
 * (This contradicts a common assumption that "the psychic knows more spells
 * than a sorcerer" — checked twice against the same source with the same
 * result, so the sorcerer known table is reused here rather than inventing a
 * bespoke one; see `CASTER_MODELS.psychic` in `apps/web/src/model/
 * spellcasting.ts`, which sets `knownProgression: "sorcerer"` accordingly.)
 * Psychic disciplines (`psychic-disciplines.ts`) grant additional bonus
 * spells known on top of this table, same shape as an oracle mystery.
 */
// (No separate PSYCHIC_SPELLS_KNOWN constant — reuses `SORCERER_SPELLS_KNOWN`
// via the `"sorcerer"` `SpellKnownProgression` key, see the doc comment above.)

/**
 * Medium (Occult Adventures) base spells per day, indexed
 * `[classLevel - 1][spellLevel]` (spell levels 1-4 only — a medium never
 * gains 5th-level-or-higher spells; column 0 is always null, same "cantrips
 * cast at will, capped by the known table's column 0 instead" shape as
 * sorcerer/bard). A medium is a CHA-based spontaneous caster (Medium Spells:
 * "he can cast any spell he knows without preparing it ahead of time... the
 * saving throw DC... equal to 10 + the spell level + the medium's Charisma
 * modifier") who gains NO spellcasting at all until 4th level — same
 * "late-start quarter-ish caster" shape as paladin/ranger/bloodrager, which
 * is why "medium" is deliberately NOT added to `FULL_CASTER_TAGS` in
 * `apps/web/src/model/casterLevel.ts` (that module's binary "classLevel or 0"
 * switch can't represent a level-gated start; see bloodrager's own doc
 * comment there for the precedent). Hand-typed from the raw "Table: Medium"
 * on legacy.aonprd.com (fetched directly and quoted verbatim, not
 * summarized); sanity anchors: L4 1/-/-/-, L9 2/1/-/-, L13 3/2/1/1, L20
 * 4/4/3/2. (PF1 Occult Adventures — clean-room table from the published
 * rules, open game content.)
 */
const MEDIUM_SPELLS_PER_DAY: readonly (readonly (number | null)[])[] = [
  /* L1  */ [null, null, null, null, null, null, null, null, null, null],
  /* L2  */ [null, null, null, null, null, null, null, null, null, null],
  /* L3  */ [null, null, null, null, null, null, null, null, null, null],
  /* L4  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L5  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L6  */ [null, 1, null, null, null, null, null, null, null, null],
  /* L7  */ [null, 1, 1, null, null, null, null, null, null, null],
  /* L8  */ [null, 1, 1, null, null, null, null, null, null, null],
  /* L9  */ [null, 2, 1, null, null, null, null, null, null, null],
  /* L10 */ [null, 2, 1, 1, null, null, null, null, null, null],
  /* L11 */ [null, 2, 1, 1, null, null, null, null, null, null],
  /* L12 */ [null, 2, 2, 1, null, null, null, null, null, null],
  /* L13 */ [null, 3, 2, 1, 1, null, null, null, null, null],
  /* L14 */ [null, 3, 2, 1, 1, null, null, null, null, null],
  /* L15 */ [null, 3, 2, 2, 1, null, null, null, null, null],
  /* L16 */ [null, 3, 3, 2, 1, null, null, null, null, null],
  /* L17 */ [null, 4, 3, 2, 1, null, null, null, null, null],
  /* L18 */ [null, 4, 3, 2, 2, null, null, null, null, null],
  /* L19 */ [null, 4, 3, 3, 2, null, null, null, null, null],
  /* L20 */ [null, 4, 4, 3, 2, null, null, null, null, null],
];

/**
 * Medium Spells Known, indexed `[classLevel - 1][spellLevel]`. Column 0
 * (cantrips known) starts at 2 (1st level) and caps at 6; columns 1-4 cap the
 * medium's known spells at that level (never gains 5th-level-or-higher
 * spells). Hand-typed from the raw "Table: Medium Spells Known" on
 * legacy.aonprd.com (fetched directly and quoted verbatim); per the Medium
 * Spells class feature's own text, this count is fixed and NOT adjusted by
 * Charisma (unlike the spells-per-day table above). (PF1 Occult Adventures —
 * clean-room, open game content.)
 */
const MEDIUM_SPELLS_KNOWN: readonly (readonly (number | null)[])[] = [
  /* L1  */ [2, null, null, null, null, null, null, null, null, null],
  /* L2  */ [3, null, null, null, null, null, null, null, null, null],
  /* L3  */ [4, null, null, null, null, null, null, null, null, null],
  /* L4  */ [4, 2, null, null, null, null, null, null, null, null],
  /* L5  */ [5, 3, null, null, null, null, null, null, null, null],
  /* L6  */ [5, 4, null, null, null, null, null, null, null, null],
  /* L7  */ [6, 4, 2, null, null, null, null, null, null, null],
  /* L8  */ [6, 4, 3, null, null, null, null, null, null, null],
  /* L9  */ [6, 5, 4, null, null, null, null, null, null, null],
  /* L10 */ [6, 5, 4, 2, null, null, null, null, null, null],
  /* L11 */ [6, 5, 4, 3, null, null, null, null, null, null],
  /* L12 */ [6, 6, 5, 4, null, null, null, null, null, null],
  /* L13 */ [6, 6, 5, 4, 2, null, null, null, null, null],
  /* L14 */ [6, 6, 5, 4, 3, null, null, null, null, null],
  /* L15 */ [6, 6, 6, 5, 4, null, null, null, null, null],
  /* L16 */ [6, 6, 6, 5, 4, null, null, null, null, null],
  /* L17 */ [6, 6, 6, 5, 4, null, null, null, null, null],
  /* L18 */ [6, 6, 6, 6, 5, null, null, null, null, null],
  /* L19 */ [6, 6, 6, 6, 5, null, null, null, null, null],
  /* L20 */ [6, 6, 6, 6, 5, null, null, null, null, null],
];

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
  alchemist: ALCHEMIST_EXTRACTS_PER_DAY,
  investigator: INVESTIGATOR_EXTRACTS_PER_DAY,
  inquisitor: INQUISITOR_SPELLS_PER_DAY,
  summoner: SUMMONER_SPELLS_PER_DAY,
  skald: SKALD_SPELLS_PER_DAY,
  witch: WITCH_SPELLS_PER_DAY,
  shaman: SHAMAN_SPELLS_PER_DAY,
  warpriest: WARPRIEST_SPELLS_PER_DAY,
  bloodrager: BLOODRAGER_SPELLS_PER_DAY,
  // Antipaladin (APG) is a quarter-caster mirror of paladin: "His base daily
  // spell allotment is the same as that of a paladin and is given on Table:
  // Antipaladin" (confirmed verbatim in the vendored `class-features.json`
  // "Antipaladin Spells" feature description) — numerically identical to
  // {@link PALADIN_RANGER_SPELLS_PER_DAY}, so reused rather than duplicated,
  // same posture as `DRUID_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY` above.
  antipaladin: PALADIN_RANGER_SPELLS_PER_DAY,
  summonerUnchained: SUMMONER_UNCHAINED_SPELLS_PER_DAY,
  mesmerist: MESMERIST_SPELLS_PER_DAY,
  occultist: OCCULTIST_SPELLS_PER_DAY,
  spiritualist: SPIRITUALIST_SPELLS_PER_DAY,
  psychic: PSYCHIC_SPELLS_PER_DAY,
  medium: MEDIUM_SPELLS_PER_DAY,
};

const KNOWN_PROGRESSIONS: Record<SpellKnownProgression, readonly (readonly (number | null)[])[]> = {
  sorcerer: SORCERER_SPELLS_KNOWN,
  bard: BARD_SPELLS_KNOWN,
  inquisitor: INQUISITOR_SPELLS_KNOWN,
  summoner: SUMMONER_SPELLS_KNOWN,
  skald: SKALD_SPELLS_KNOWN,
  bloodrager: BLOODRAGER_SPELLS_KNOWN,
  summonerUnchained: SUMMONER_UNCHAINED_SPELLS_KNOWN,
  mesmerist: MESMERIST_SPELLS_KNOWN,
  spiritualist: SPIRITUALIST_SPELLS_KNOWN,
  medium: MEDIUM_SPELLS_KNOWN,
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

/* ------------------------------------------------------- smite good (APA) -- */

/**
 * One-line display string for antipaladin (APG) Smite Good, reusing
 * {@link SmiteEvilDetail}/{@link smiteEvilDetail} wholesale — Smite Good is
 * mechanically IDENTICAL to paladin's Smite Evil (confirmed against the
 * vendored `class-features.json` entry: `uses.maxFormula: "1 +
 * floor((@class.unlevel - 1) / 3)"`, byte-identical to Smite Evil's, and the
 * same "adds Cha bonus (if any) to attack, class level to damage, Cha bonus
 * (if any) as deflection AC" prose with target alignment mirrored evil ->
 * good) — only the display suffix changes. Same reuse posture as
 * `DRUID_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY` above.
 */
export function smiteGoodLabel(detail: SmiteEvilDetail): string {
  return `+${detail.attackBonus} atk, +${detail.damageBonus} dmg, +${detail.acBonus} AC vs. good`;
}

/* ---------------------------------------------- flurry of blows (unchained) */

/**
 * Monk (Unchained) Flurry of Blows display summary, clean-room from the
 * published Pathfinder Unchained rules — a full rewrite of the chained
 * monk's Flurry of Blows, NOT the same formula as {@link flurryOfBlowsLabel}:
 * "the monk can make one additional attack at his highest base attack bonus"
 * (1st level), stacking with haste-style bonus attacks, and "at 11th level, a
 * monk can make an additional attack at his highest base attack bonus
 * whenever he makes a flurry of blows" (a 2nd extra attack, also stacking).
 * Both extra attacks are at the monk's TRUE base attack bonus — unlike the
 * chained version, there is no -2 penalty and no "BAB = monk level" swap-in;
 * this is mechanically closer to Haste's bonus attack than the chained
 * Flurry. Display-only, same posture as {@link flurryOfBlowsLabel} — not
 * wired into the live attacks/iteratives table.
 */
export function flurryOfBlowsUnchainedLabel(monkLevel: number): string {
  if (monkLevel <= 0) return "";
  const extraAttacks = monkLevel < 11 ? 1 : 2;
  const plural = extraAttacks > 1 ? "s" : "";
  return `${extraAttacks} extra attack${plural} at full BAB (no penalty)`;
}

/* --------------------------------------------------------- painful stare -- */

/**
 * Mesmerist Painful Stare bonus damage, clean-room from the published PF1 SRD
 * (Occult Adventures, PZO1132) — the class feature's `changes[]` and `uses`
 * are both empty upstream (it's a free-action rider triggered by an attack
 * landing on the mesmerist's current Hypnotic Stare target, not a limited
 * per-day resource), so the bonus-damage number is hand-authored here, same
 * posture as `sneakAttackDice`/`smiteEvilDetail`.
 *
 * "the mesmerist can cause the target to take an amount of additional damage
 * equal to 1/2 the mesmerist's class level (minimum 1)" => `max(1,
 * floor(mesmeristLevel / 2))`. (The SRD's separate "+1d6 per 3 levels"
 * escalation for the self-targeting case is a narrower rules branch, not
 * modeled here — this covers the common "against the stared target" number.)
 */
export function painfulStareBonus(mesmeristLevel: number): number {
  if (mesmeristLevel <= 0) return 0;
  return Math.max(1, Math.floor(mesmeristLevel / 2));
}

/** One-line display string for {@link painfulStareBonus}, e.g. "+3 dmg vs. stared target". */
export function painfulStareLabel(mesmeristLevel: number): string {
  return `+${painfulStareBonus(mesmeristLevel)} dmg vs. stared target`;
}

/* -------------------------------------------------------- hypnotic stare -- */

/**
 * Mesmerist Hypnotic Stare Will-save penalty, clean-room from the published
 * PF1 SRD (Occult Adventures, PZO1132) — the class feature's `changes[]` is
 * empty upstream (there's no fixed "target" for a vendored Change to apply
 * to; the mesmerist picks a new creature to stare at as a swift action, and
 * this app doesn't model per-encounter live targeting). This is intentionally
 * display-only — a contextNote-style summary surfaced via the class-features
 * `detail` line, not a live modifier applied to any tracked creature's saving
 * throw, same "vs. a chosen target" posture as `smiteEvilDetail`'s
 * attack/AC/damage numbers.
 *
 * "That creature takes a –2 penalty on Will saving throws. This penalty
 * changes to –3 at 8th level."
 */
export function hypnoticStarePenalty(mesmeristLevel: number): number {
  if (mesmeristLevel <= 0) return 0;
  return mesmeristLevel >= 8 ? 3 : 2;
}

/** One-line display string for {@link hypnoticStarePenalty}, e.g. "-2 Will save on stared target". */
export function hypnoticStareLabel(mesmeristLevel: number): string {
  return `-${hypnoticStarePenalty(mesmeristLevel)} Will save on stared target`;
}

/* -------------------------------------------------- kineticist (Occult) -- */

/**
 * Kineticist Kinetic Blast damage summary, clean-room from the published PF1
 * Occult Adventures rules (verified against legacy.aonprd.com's raw class
 * text): a simple PHYSICAL blast deals "1d6+1 + the kineticist's Constitution
 * modifier, increasing by 1d6+1 for every 2 kineticist levels beyond 1st"; a
 * simple ENERGY blast deals "1d6 + 1/2 the kineticist's Constitution
 * modifier, increasing by 1d6 for every 2 kineticist levels beyond 1st" —
 * i.e. `ceil(level / 2)` dice for both. Display-only, same posture as
 * `unarmedDamageDie`/`sneakAttackDice` — NOT an attack builder: the vendored
 * "Physical/Energy Kinetic Blast" class features carry real dice-bearing
 * action formulas (including the elemental-overflow
 * `min(@resources.burn.value, ...)` rider), but per this project's
 * formula-DSL convention (`formula.ts`: dice terms parse but throw on numeric
 * eval) those aren't evaluated into the live attacks table; this summary is
 * the static-sheet reference line instead. Elemental Overflow's burn-scaled
 * attack/damage bonus is part of the deferred elements/wild-talents subsystem
 * and is NOT folded in here.
 */
export interface KineticBlastDetail {
  /** Number of d6s (both blast kinds), `ceil(level / 2)`. */
  dice: number;
  /** Simple physical blast, e.g. "3d6+3 + Con mod (physical)" or "3d6+7 (physical)". */
  physicalLabel: string;
  /** Simple energy blast (ranged touch), e.g. "3d6 + 1/2 Con mod (energy, touch)". */
  energyLabel: string;
}

/**
 * Kinetic Blast damage dice for a kineticist of `kineticistLevel`.
 * Out-of-range (<=0) level is clamped to the L1 tier, since Kinetic Blast is
 * granted at 1st level. When `conMod` is provided the labels show resolved
 * numbers ("3d6+7"); otherwise symbolic ("+ Con mod").
 */
export function kineticBlastDetail(kineticistLevel: number, conMod?: number): KineticBlastDetail {
  const level = Math.max(1, kineticistLevel);
  const dice = Math.ceil(level / 2);
  if (conMod === undefined) {
    return {
      dice,
      physicalLabel: `${dice}d6+${dice} + Con mod (physical)`,
      energyLabel: `${dice}d6 + 1/2 Con mod (energy, touch)`,
    };
  }
  const fmt = (n: number) => (n === 0 ? "" : n > 0 ? `+${n}` : `${n}`);
  return {
    dice,
    physicalLabel: `${dice}d6${fmt(dice + conMod)} (physical)`,
    energyLabel: `${dice}d6${fmt(Math.floor(conMod / 2))} (energy, touch)`,
  };
}

/**
 * Kineticist Burn per-round acceptance cap, clean-room from the published PF1
 * Occult Adventures rules: "A kineticist can accept only 1 point of burn per
 * round. This limit rises to 2 points of burn at 6th level, and rises by 1
 * additional point every 3 levels thereafter" — 1 (L1-5), 2 (L6-8), 3
 * (L9-11), 4 (L12-14), 5 (L15-17), 6 (L18+). The burn POOL's daily cap
 * (`3 + Con modifier`) is NOT here — it rides in free from the vendored Burn
 * class feature's `uses.maxFormula` via `deriveResourcePools`; this helper
 * plus {@link burnDetailLabel} only supply the display sub-line for that pool.
 */
export function burnPerRoundLimit(kineticistLevel: number): number {
  if (kineticistLevel < 6) return 1;
  return 2 + Math.floor((kineticistLevel - 6) / 3);
}

/**
 * One-line Burn summary for the resource-pool row (see `resources.ts`),
 * clean-room from the published rules: "For each point of burn she accepts, a
 * kineticist takes 1 point of nonlethal damage per character level. This
 * damage can't be healed by any means other than getting a full night's
 * rest, which removes all burn and associated nonlethal damage." The
 * nonlethal damage is deliberately NOT auto-applied to `live.hp.nonlethal`
 * (accepting burn is a table-time choice with riders — gather power
 * reductions, forced burn — this engine doesn't model); the label tells the
 * player what to apply by hand. `characterLevel` is TOTAL character level
 * (multiclass included), per the rules text — not kineticist class level.
 */
export function burnDetailLabel(characterLevel: number, kineticistLevel: number): string {
  const perRound = burnPerRoundLimit(kineticistLevel);
  return (
    `each point held deals ${Math.max(1, characterLevel)} nonlethal ` +
    `(1/character level; unhealable until a full night's rest — apply manually) · ` +
    `max ${perRound} accepted/round`
  );
}

/**
 * Kineticist Elemental Overflow attack/damage bonus, clean-room from the
 * published PF1 Occult Adventures rules: "she receives a bonus on her
 * attack rolls with kinetic blasts equal to the total number of points of
 * burn she currently has, to a maximum bonus of +1 for every 3 kineticist
 * levels she possesses. She also receives a bonus on damage rolls with her
 * kinetic blast equal to double the bonus on attack rolls." Unlike every
 * other kineticist helper in this file, this one IS live-state-dependent —
 * `currentBurn` is read from `doc.live.resources[burnFeatureId].used` by
 * the caller (`archetypes.ts`'s Elemental Overflow detail branch), the same
 * pool the Burn class feature already rides via `deriveResourcePools`.
 * Returns `{ attackBonus: 0, damageBonus: 0, cap: 0 }` below 3rd level
 * (Elemental Overflow isn't granted until 3rd).
 */
export interface KineticOverflowBonus {
  /** `1 + floor(kineticistLevel / 3)`. */
  cap: number;
  attackBonus: number;
  damageBonus: number;
}

export function kineticOverflowBonus(
  kineticistLevel: number,
  currentBurn: number,
): KineticOverflowBonus {
  if (kineticistLevel < 3) return { cap: 0, attackBonus: 0, damageBonus: 0 };
  const cap = 1 + Math.floor(kineticistLevel / 3);
  const attackBonus = Math.max(0, Math.min(currentBurn, cap));
  return { cap, attackBonus, damageBonus: attackBonus * 2 };
}

/** One-line display string for {@link kineticOverflowBonus}. */
export function kineticOverflowLabel(kineticistLevel: number, currentBurn: number): string {
  const { attackBonus, damageBonus, cap } = kineticOverflowBonus(kineticistLevel, currentBurn);
  return (
    `+${attackBonus} atk / +${damageBonus} dmg with kinetic blasts ` +
    `(currently holding ${currentBurn} burn; cap +${cap} atk at this level)`
  );
}

/**
 * Kineticist Metakinesis tiers unlocked so far, clean-room from the
 * published rules: Empower at 5th (1 burn), Maximize at 9th (2 burn),
 * Quicken at 13th (3 burn), and at 17th "the kineticist can use her kinetic
 * blast twice with the same standard action" (4 burn — a double-blast
 * rider, not a 4th metamagic tier).
 */
export function metakinesisLabel(kineticistLevel: number): string {
  if (kineticistLevel < 5) return "Not yet available (5th level).";
  const tiers: string[] = ["Empower (1 burn)"];
  if (kineticistLevel >= 9) tiers.push("Maximize (2 burn)");
  if (kineticistLevel >= 13) tiers.push("Quicken (3 burn)");
  if (kineticistLevel >= 17) tiers.push("blast twice with one action (4 burn)");
  return tiers.join(", ");
}

/**
 * Kineticist Gather Power burn-reduction summary, clean-room from the
 * published rules: move action reduces a blast's burn cost by 1 (2 for a
 * full round); Supercharge (11th level) raises those to 2/3 respectively.
 */
export function gatherPowerLabel(kineticistLevel: number): string {
  const supercharged = kineticistLevel >= 11;
  return supercharged
    ? "-2 burn (move action) / -3 burn (full round, then move action next turn) — Supercharge active"
    : "-1 burn (move action) / -2 burn (full round, then move action next turn)";
}

/**
 * Kineticist Infusion Specialization burn reduction on combined infusion
 * costs, clean-room from the published rules: "reduces the combined burn
 * cost of the infusions by 1" at 5th, +1 more at 8th/11th/14th/17th/20th —
 * `1 + floor((level - 5) / 3)` for level >= 5 (capped at 6 by 20th).
 */
export function infusionSpecializationReduction(kineticistLevel: number): number {
  if (kineticistLevel < 5) return 0;
  return Math.min(6, 1 + Math.floor((kineticistLevel - 5) / 3));
}

/**
 * Kineticist Internal Buffer max stored points, clean-room from the
 * published rules: 1 point at 6th level, 2 at 11th, 3 at 16th.
 */
export function internalBufferMax(kineticistLevel: number): number {
  if (kineticistLevel < 6) return 0;
  if (kineticistLevel < 11) return 1;
  if (kineticistLevel < 16) return 2;
  return 3;
}

/* ----------------------------------------------------------- witch hexes -- */

/**
 * Witch hex save DC, clean-room from the published PF1 Advanced Player's
 * Guide SRD: "the DC of a hex is equal to 10 + 1/2 the witch's level + the
 * witch's Intelligence modifier" — same `10 + 1/2 level + ability mod` shape
 * as Channel Energy/Bomb, hand-authored here because a hex's DC is not part
 * of any vendored `ClassFeature.uses`/`actions` (hexes have no vendored
 * per-hex data at all — see `witch-hexes.ts`'s doc comment).
 */
export function witchHexDC(witchLevel: number, intMod: number): number {
  if (witchLevel <= 0) return 0;
  return 10 + Math.floor(witchLevel / 2) + intMod;
}

/* ------------------------------------------------------- alchemist bombs -- */

/**
 * Alchemist bomb damage, clean-room from the published PF1 Advanced Player's
 * Guide SRD: "an alchemist's bomb inflicts 1d6 points of fire damage +
 * additional damage equal to the alchemist's Intelligence modifier. The
 * damage of an alchemist's bomb increases by 1d6 points at every odd-numbered
 * alchemist level." The vendored Bomb class feature's own `action.damage`
 * formula is a flat, non-scaling `"1d6"` (confirmed against the pinned data
 * slice — it does not encode the level progression or the Int-mod addend),
 * so `deriveResourcePools` overrides it with this hand-authored detail, same
 * posture as its existing Smite Evil/Burn overrides.
 *
 * Dice = `1 + floor((alchemistLevel - 1) / 2)` — 1d6 at L1, 2d6 at L3, 3d6 at
 * L5, ..., 10d6 at L19+.
 */
export interface BombDamageDetail {
  /** Number of d6 rolled on a direct hit (before the flat Int-mod addend). */
  dice: number;
  /** Display string for the damage, e.g. "3d6+2 fire". */
  damageLabel: string;
}

/**
 * Bomb damage for an alchemist of `alchemistLevel` with an Intelligence
 * modifier of `intMod`. Out-of-range level returns `dice: 0`.
 */
export function bombDamageDetail(alchemistLevel: number, intMod: number): BombDamageDetail {
  if (alchemistLevel <= 0) {
    return { dice: 0, damageLabel: "0d6 fire" };
  }
  const dice = 1 + Math.floor((alchemistLevel - 1) / 2);
  const addend = intMod === 0 ? "" : intMod > 0 ? `+${intMod}` : `${intMod}`;
  return { dice, damageLabel: `${dice}d6${addend} fire` };
}

/* ------------------------------------------------- antipaladin cruelties -- */

/**
 * Antipaladin Cruelty save DC, clean-room from the published PF1 Advanced
 * Player's Guide SRD (vendored `class-features.json` "Cruelty" description,
 * stated once as a blanket rule, not repeated per-cruelty): "The DC of this
 * save is equal to 10 + 1/2 the antipaladin's level + the antipaladin's
 * Charisma modifier." Same `10 + 1/2 level + ability mod` shape as
 * `witchHexDC`, hand-authored here because a cruelty's DC is not part of any
 * vendored `ClassFeature.uses`/`actions` (cruelties have no vendored
 * per-cruelty data at all — see `antipaladin-cruelties.ts`'s doc comment).
 */
export function antipaladinCrueltyDC(antipaladinLevel: number, chaMod: number): number {
  if (antipaladinLevel <= 0) return 0;
  return 10 + Math.floor(antipaladinLevel / 2) + chaMod;
}

/* ----------------------------------------------------- fiendish boon (APA) */

/**
 * Antipaladin Fiendish Boon (weapon form) display summary, clean-room from
 * the published PF1 Advanced Player's Guide SRD (vendored `class-features.json`
 * "Fiendish Boon" description — a prose-only stub with `changes: []`, no
 * different from paladin's own Divine Bond, which today has NO hand-authored
 * numeric modeling or `build.*` field at all: the actual weapon math is left
 * entirely to the player). Unlike Divine Bond, this project DOES track WHICH
 * form (`build.antipaladinBoon`) was chosen — see the schema doc comment —
 * but still stops short of turning the weapon math into a `Change` or
 * resource pool; this is purely an informational summary line for the
 * Fiendish Boon classFeature row, same restraint Divine Bond gets.
 *
 * "At 5th level, this spirit grants the weapon a +1 enhancement bonus. For
 * every three levels beyond 5th, the weapon gains another +1 enhancement
 * bonus, to a maximum of +6 at 20th level... stacking with existing weapon
 * bonuses to a maximum of +5, or... weapon properties... An antipaladin can
 * use this ability once per day at 5th level, and one additional time per
 * day for every four levels beyond 5th, to a total of four times per day at
 * 17th level."
 */
export interface FiendishBoonWeaponDetail {
  /** Total enhancement-equivalent bonus available to spend (1 at L5, capped at 6 at L20+). 0 below 5th level. */
  enhancementBonus: number;
  /** Uses/day (1 at L5, capped at 4 at L17+). 0 below 5th level. */
  usesPerDay: number;
}

export function fiendishBoonWeaponDetail(antipaladinLevel: number): FiendishBoonWeaponDetail {
  if (antipaladinLevel < 5) return { enhancementBonus: 0, usesPerDay: 0 };
  const enhancementBonus = Math.min(6, 1 + Math.floor((antipaladinLevel - 5) / 3));
  const usesPerDay = Math.min(4, 1 + Math.floor((antipaladinLevel - 5) / 4));
  return { enhancementBonus, usesPerDay };
}

/**
 * One-line classFeature `detail` for Fiendish Boon, branching on the chosen
 * `build.antipaladinBoon` form. `undefined` boon (not yet chosen, or below
 * 5th level with the field already set from a stale doc) prompts the picker
 * instead of showing stale numbers.
 */
export function fiendishBoonLabel(
  antipaladinLevel: number,
  boon: "weapon" | "servant" | undefined,
): string {
  if (!boon) return "Choose weapon or servant below — fixed once chosen (PF1 RAW).";
  if (boon === "servant") {
    return "Fiendish servant (as summon monster III, permanent) — companion stat block tracking deferred (issue #68).";
  }
  const { enhancementBonus, usesPerDay } = fiendishBoonWeaponDetail(antipaladinLevel);
  return (
    `+${enhancementBonus} enhancement-equivalent (max +5 enhancement, remainder into properties), ` +
    `${usesPerDay}/day, standard action, 1 min/level each — weapon math stays manual`
  );
}

/* --------------------------------------------------- antipaladin DR (APA) -- */

/**
 * Antipaladin Damage Reduction, clean-room from the published PF1 Advanced
 * Player's Guide SRD (both the Aura of Depravity and Unholy Champion class
 * features' `changes[]` are empty upstream — same posture as
 * `barbarianDamageReduction`): "At 17th level, an antipaladin gains DR
 * 5/good" (Aura of Depravity); "At 20th level... His DR increases to
 * 10/good" (Unholy Champion — replaces, not stacks with, the 17th-level
 * value). Unlike the rest of the antipaladin's aura family (Cowardice,
 * Despair, Vengeance, Sin — all enemies-within-10-ft debuffs with no
 * self-facing number), this IS a genuine static bonus to the antipaladin's
 * OWN sheet, so it rides `defenses.ts`'s `dr`-qualifier pipeline exactly like
 * barbarian DR does.
 */
export interface AntipaladinDrDetail {
  /** DR amount (0 below 17th level, 5 at L17-19, 10 at L20+). */
  amount: number;
  /** Display string, e.g. "5/good" (or "0/good" below 17th level, not normally shown). */
  label: string;
  /** Which class feature grants the current amount, for defense-line provenance. */
  source: "Aura of Depravity" | "Unholy Champion";
}

export function antipaladinDamageReduction(antipaladinLevel: number): AntipaladinDrDetail {
  if (antipaladinLevel < 17) return { amount: 0, label: "0/good", source: "Aura of Depravity" };
  if (antipaladinLevel >= 20) {
    return { amount: 10, label: "10/good", source: "Unholy Champion" };
  }
  return { amount: 5, label: "5/good", source: "Aura of Depravity" };
}
/* --------------------------------------------- rogue (uc) finesse training */

/**
 * Rogue (Unchained) Finesse Training weapon-type pick levels (issue #65,
 * clean-room from the published rules, verified against aonprd.com/
 * d20pfsrd.com's "Rogue (Unchained)" class page): "at 3rd level ... and every
 * eight levels thereafter [11th, 19th] ... she can select any one type of
 * weapon that can be used with Weapon Finesse ... she adds her Dexterity
 * modifier, instead of her Strength modifier, to the damage roll" with that
 * weapon. Three tiers total, mirroring `WEAPON_TRAINING_LEVELS`'s shape
 * (index 0 = 3rd-level pick, index 1 = 11th, index 2 = 19th) but ADDITIVE
 * rather than scaling — each pick just adds one more eligible weapon type,
 * no growing bonus. See `computeWeaponAttacks` in `compute.ts` for how a
 * pick is matched against an equipped `WeaponInstance`.
 */
export const ROGUE_FINESSE_TRAINING_LEVELS: readonly number[] = [3, 11, 19];

/**
 * Rogue's Edge (UC) skill unlock pick levels (issue #65, clean-room from the
 * published rules): "at 5th level, and every five levels thereafter [10th,
 * 15th, 20th], a rogue can choose a skill unlock power for one skill in
 * which she has at least 5 ranks." Four tiers total (index 0 = 5th-level
 * pick). The unlock's own tiered prose effects are not modeled — see
 * `CharacterDoc.build.rogueSkillUnlocks`'s doc comment.
 */
export const ROGUE_SKILL_UNLOCK_LEVELS: readonly number[] = [5, 10, 15, 20];
/* --------------------------------------------------------- studied combat -- */

/**
 * Investigator Studied Combat's insight bonus, clean-room from the published
 * PF1 ACG SRD (the class feature's `changes[]` is empty upstream — only
 * prose text — so the numbers are hand-authored here, same posture as
 * `sneakAttackDice`): "he adds 1/2 his investigator level as an insight
 * bonus on melee attack rolls and as a bonus on damage rolls" against a
 * studied target. Both rolls use the SAME value.
 */
export function studiedCombatBonus(investigatorLevel: number): number {
  if (investigatorLevel <= 0) return 0;
  return Math.floor(investigatorLevel / 2);
}

/** One-line display string for `studiedCombatBonus`, e.g. "+2 atk/dmg vs. studied target". */
export function studiedCombatLabel(investigatorLevel: number): string {
  const bonus = studiedCombatBonus(investigatorLevel);
  return bonus > 0 ? `+${bonus} atk/dmg vs. studied target` : "";
}

/**
 * Investigator Studied Strike's precision damage dice, clean-room from the
 * published PF1 ACG SRD (same "no vendored dice" situation as
 * `studiedCombatBonus`): "The damage is 1d6 at 4th level, and increases by
 * 1d6 for every 2 levels thereafter (to a maximum of 9d6 at 20th level)."
 */
export interface StudiedStrikeDetail {
  /** Number of d6 rolled on a studied strike (0 below 4th level, 9 at L20). */
  dice: number;
  /** Display string, e.g. "3d6". */
  diceLabel: string;
}

/** Studied strike dice count for an investigator of `investigatorLevel`. Out-of-range returns `dice: 0`. */
export function studiedStrikeDice(investigatorLevel: number): StudiedStrikeDetail {
  if (investigatorLevel < 4) {
    return { dice: 0, diceLabel: "0d6" };
  }
  const dice = Math.min(9, Math.floor((investigatorLevel - 4) / 2) + 1);
  return { dice, diceLabel: `${dice}d6` };
}

/* -------------------------------------------------------- hidden strike --- */

/**
 * Vigilante (Stalker) Hidden Strike precision damage dice, clean-room from
 * the published PF1 Ultimate Intrigue SRD (the Vigilante Specialization
 * class feature's `changes[]` is empty upstream — prose only): "an extra
 * 1d8 points of precision damage ... This extra damage increases by 1d8 at
 * 3rd level and every 2 vigilante levels thereafter."
 */
export interface HiddenStrikeDetail {
  /** Number of d8 rolled on a hidden strike (0 for a non-stalker/level-0, 10 at L19+). */
  dice: number;
  /** Display string, e.g. "3d8". */
  diceLabel: string;
}

/** Hidden strike dice count for a stalker vigilante of `vigilanteLevel`. Out-of-range returns `dice: 0`. */
export function hiddenStrikeDice(vigilanteLevel: number): HiddenStrikeDetail {
  if (vigilanteLevel < 1) {
    return { dice: 0, diceLabel: "0d8" };
  }
  const dice = 1 + Math.max(0, Math.floor((vigilanteLevel - 1) / 2));
  return { dice, diceLabel: `${dice}d8` };
}

/* -------------------------------------------------------- shifter claws --- */

/**
 * Shifter Claws damage die, clean-room from the published PF1 Blood of the
 * Beast SRD (the class feature's `changes[]` is empty upstream — prose
 * only): "dealing 1d4 points of piercing and slashing damage... At 7th
 * level, her claw damage increases to 1d6... At 11th level ... 1d8. At 13th
 * level ... 1d10." (Medium size only — same posture as `unarmedDamageDie`
 * not modeling non-Medium sizes.) The die stops increasing after 13th; at
 * 17th the critical multiplier becomes x3 instead. DR-bypass progression
 * (cold iron/silver/magic at 3rd, adamantine/-- at 19th) is prose-only, not
 * modeled as a Change here.
 */
export interface ShifterClawsDetail {
  /** Display string for the claw damage die, e.g. "1d6". */
  dieLabel: string;
  /** Critical multiplier label, "x2" or "x3" (x3 from 17th level on). */
  critLabel: string;
}

/** Shifter Claws damage die/crit for a shifter of `shifterLevel` (Medium size). Level is clamped to >= 1. */
export function shifterClawsDamageDie(shifterLevel: number): ShifterClawsDetail {
  const level = Math.max(1, shifterLevel);
  let dieLabel = "1d4";
  if (level >= 13) dieLabel = "1d10";
  else if (level >= 11) dieLabel = "1d8";
  else if (level >= 7) dieLabel = "1d6";
  const critLabel = level >= 17 ? "x3" : "x2";
  return { dieLabel, critLabel };
}

/** One-line display string for `shifterClawsDamageDie`, e.g. "1d6 (crit x2)". */
export function shifterClawsLabel(shifterLevel: number): string {
  const { dieLabel, critLabel } = shifterClawsDamageDie(shifterLevel);
  return `${dieLabel} (crit ${critLabel})`;
}
