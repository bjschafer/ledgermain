/**
 * Pure spellcasting model for the builder UI. Keeps caster-class knowledge in
 * one place so the registry can be extended when more spell lists are vendored.
 *
 * Wizard, sorcerer, cleric, paladin, and ranger are modelled today. Cleric
 * domain spell lists (one bonus prepare-slot per accessible spell level per
 * chosen domain) live in `refData.domainSpellLists`; the tracker's Spells
 * panel renders those slots. The UI falls back gracefully for any caster tag
 * not in CASTER_MODELS. Paladin/ranger are prepared divine half-casters like
 * cleric but with no cantrips and no bonus domain-style slots.
 */

import { baseSpellsKnown, baseSpellsPerDay, type SpellKnownProgression, type SpellProgression } from "@pf1/engine";
import type { AbilityId, RefData, WizardSchoolTag } from "@pf1/schema";

// ---------------------------------------------------------------------------
// Bonus spells per day
// ---------------------------------------------------------------------------

/**
 * PF1 bonus-spells-per-day granted by a high casting-ability score.
 *
 * Formula: a caster with modifier M gains bonus spell(s) for spell level L
 * when M >= L, counted as floor((M - L) / 4) + 1.
 * Cantrips (spell level 0) never grant bonus spells.
 *
 * @example
 *   bonusSpellsForLevel(3, 1) // → 1  (Int +3: qualifies, (3-1)/4 = 0, +1)
 *   bonusSpellsForLevel(5, 1) // → 2  (Int +5: (5-1)/4 = 1, +1 = 2)
 *   bonusSpellsForLevel(5, 5) // → 1  (Int +5: (5-5)/4 = 0, +1 = 1)
 *   bonusSpellsForLevel(0, 1) // → 0  (modifier too low)
 *   bonusSpellsForLevel(3, 0) // → 0  (cantrips: always 0)
 */
export function bonusSpellsForLevel(abilityMod: number, spellLevel: number): number {
  if (spellLevel === 0) return 0;
  if (abilityMod < spellLevel) return 0;
  return Math.floor((abilityMod - spellLevel) / 4) + 1;
}

// ---------------------------------------------------------------------------
// Caster-model registry
// ---------------------------------------------------------------------------

export interface CasterModel {
  preparation: "prepared" | "spontaneous";
  /** The ability score that governs spellcasting for this class. */
  ability: AbilityId;
  /** Spells-per-day progression table this class uses (engine `tables.ts`). */
  progression: SpellProgression;
  /**
   * Spells-known progression (spontaneous casters only). When set, the builder
   * shows the known-limit advisory and the tracker uses it to cap additions.
   */
  knownProgression?: SpellKnownProgression;
  /** What the "known" list represents in the UI (e.g. "Spellbook"). */
  knownLabel: string;
  /** One-line guidance on how many spells this caster learns per level. */
  learnGuidance: string;
  /** One-line explanation of prepared-vs-spontaneous for the UI hint. */
  blurb: string;
  /**
   * True if this caster knows every cantrip on its class list for free (no
   * selection needed) — e.g. a wizard's spellbook starts with all 0-level
   * wizard spells. When true the builder excludes cantrips from the
   * spellbook and the tracker sources them from the class list as read-only
   * at-will spells. When false (e.g. sorcerer), cantrips are capped by the
   * class's spells-known table at level 0 and picked/removed the same way as
   * any other known spell level; the tracker still casts them at will
   * (unlimited, no slot spent) once known.
   */
  grantsAllCantrips: boolean;
  /**
   * True when this caster has no curated "known" list at all — every spell on
   * the class list is available to prepare each day (e.g. cleric). When true,
   * the builder shows the class list read-only instead of an Add/Remove
   * picker, and the tracker's prepare-from picker sources directly from the
   * class list instead of `build.spells.known`.
   */
  preparesFromClassList: boolean;
}

export const CASTER_MODELS: Record<string, CasterModel> = {
  wizard: {
    preparation: "prepared",
    ability: "int",
    progression: "wizard",
    knownLabel: "Spellbook",
    learnGuidance:
      "Wizards add 2 spells to their spellbook at each new level (more can be scribed from scrolls).",
    blurb:
      "Prepared caster: spells live in your spellbook, then you prepare a subset each day. Your spellbook is your \u201cknown\u201d list here.",
    grantsAllCantrips: true,
    preparesFromClassList: false,
  },
  sorcerer: {
    preparation: "spontaneous",
    ability: "cha",
    progression: "sorcerer",
    knownProgression: "sorcerer",
    knownLabel: "Spells Known",
    learnGuidance:
      "Sorcerers learn a fixed set of spells known at each level (see spells-known table), including a limited number of cantrips. You can cast any spell you know by spending a slot of that level; cantrips are cast at will.",
    blurb:
      "Spontaneous caster: you know a limited set of spells and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  cleric: {
    preparation: "prepared",
    ability: "wis",
    progression: "cleric",
    knownLabel: "Cleric List",
    learnGuidance:
      "Clerics have no spellbook and nothing to learn \u2014 the entire cleric spell list below is always available to prepare from. Each chosen domain also grants one bonus prepare-slot per accessible spell level, drawable from that domain's spell list (see Domain picker above).",
    blurb:
      "Prepared divine caster: there's no \u201cknown\u201d list to curate \u2014 prepare any spell(s) from the full cleric list each day, plus one domain spell per accessible level per chosen domain.",
    grantsAllCantrips: true,
    preparesFromClassList: true,
  },
  paladin: {
    preparation: "prepared",
    ability: "cha",
    progression: "paladin",
    knownLabel: "Paladin List",
    learnGuidance:
      "Paladins have no spellbook and nothing to learn — the entire paladin spell list below is always available to prepare from once you reach 4th level. Paladins never gain cantrips.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full paladin list each day, from spell level 1 up to a maximum of 4th, starting at 4th level.",
    grantsAllCantrips: false,
    preparesFromClassList: true,
  },
  ranger: {
    preparation: "prepared",
    ability: "wis",
    progression: "ranger",
    knownLabel: "Ranger List",
    learnGuidance:
      "Rangers have no spellbook and nothing to learn — the entire ranger spell list below is always available to prepare from once you reach 4th level. Rangers never gain cantrips.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full ranger list each day, from spell level 1 up to a maximum of 4th, starting at 4th level.",
    grantsAllCantrips: false,
    preparesFromClassList: true,
  },
};

/** Returns the CasterModel for `tag`, or `undefined` if it is not in the registry. */
export function casterModelFor(tag: string): CasterModel | undefined {
  return CASTER_MODELS[tag];
}

// ---------------------------------------------------------------------------
// Granted cantrips
// ---------------------------------------------------------------------------

/**
 * The cantrips (level-0 spells) a caster with `grantsAllCantrips` knows for
 * free, derived from the class spell list. Sorted by name. Empty when the
 * class has no vendored spell list. Callers should only invoke this for models
 * whose `grantsAllCantrips` is true; the grant semantics are the caller's
 * responsibility (this just reads the level-0 slice of the class list).
 */
export function grantedCantrips(
  refData: RefData,
  casterTag: string,
): { id: string; name: string }[] {
  const ids = refData.spellLists[casterTag]?.[0];
  if (!ids) return [];
  const out: { id: string; name: string }[] = [];
  for (const id of ids) {
    const sp = refData.spells[id];
    out.push({ id, name: sp?.name ?? id });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Spell slots per day
// ---------------------------------------------------------------------------

/** Slot capacity at one spell level: base (table) + bonus (ability) = total. */
export interface SpellSlotLevel {
  /** Spell level, 0–9. */
  level: number;
  /** Base slots from the class progression table. */
  base: number;
  /** Bonus slots from a high casting ability (0 for cantrips). */
  bonus: number;
  /** Slots available to prepare at this level. */
  total: number;
}

/**
 * Slots-per-day for every spell level the caster can access at `classLevel`,
 * combining the engine's base table with ability bonus spells. Levels with no
 * access (base `null`) are omitted. `abilityMod` is the final casting-ability
 * modifier from the computed sheet.
 */
export function spellSlotsByLevel(
  model: CasterModel,
  classLevel: number,
  abilityMod: number,
): SpellSlotLevel[] {
  const out: SpellSlotLevel[] = [];
  for (let level = 0; level <= 9; level++) {
    const base = baseSpellsPerDay(model.progression, classLevel, level);
    if (base === null) continue;
    const bonus = bonusSpellsForLevel(abilityMod, level);
    out.push({ level, base, bonus, total: base + bonus });
  }
  return out;
}

/**
 * Spell levels (0–9) this caster can access at `classLevel`, per the base
 * progression table. Ability-score bonus spells never unlock a new level, so
 * (unlike {@link spellSlotsByLevel}) this needs no ability modifier — it's
 * cheap to call from the builder, before a computed sheet exists, to filter
 * a spell-list reference down to what's actually reachable yet.
 */
export function accessibleSpellLevels(model: CasterModel, classLevel: number): number[] {
  const out: number[] = [];
  for (let level = 0; level <= 9; level++) {
    if (baseSpellsPerDay(model.progression, classLevel, level) !== null) out.push(level);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spells-known limits (spontaneous casters)
// ---------------------------------------------------------------------------

/**
 * Maximum spells known at each accessible spell level for a spontaneous caster.
 * Levels with no access (null) are omitted. Only meaningful when the model has
 * a `knownProgression`. Returns empty array for prepared casters.
 */
export function spellsKnownLimitsByLevel(
  model: CasterModel,
  classLevel: number,
): { level: number; limit: number }[] {
  if (!model.knownProgression) return [];
  const out: { level: number; limit: number }[] = [];
  for (let level = 0; level <= 9; level++) {
    const limit = baseSpellsKnown(model.knownProgression, classLevel, level);
    if (limit === null) continue;
    out.push({ level, limit });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spell detail helpers (Task 2)
// ---------------------------------------------------------------------------

/**
 * Save DC for a spell: 10 + spell level + casting-ability modifier.
 * Only meaningful when the spell actually allows a saving throw.
 *
 * @example
 *   spellSaveDC(3, 4) // → 17  (10 + 3 + 4)
 */
export function spellSaveDC(spellLevel: number, abilityMod: number): number {
  return 10 + spellLevel + abilityMod;
}

/**
 * Concentration check DC to cast defensively (to avoid provoking an AoO):
 * 15 + 2 × spell level. This is the standard PF1 defensive-casting DC.
 *
 * @example
 *   concentrationDC(3) // → 21  (15 + 6)
 *   concentrationDC(0) // → 15  (cantrips)
 */
export function concentrationDC(spellLevel: number): number {
  return 15 + 2 * spellLevel;
}

// ---------------------------------------------------------------------------
// Bloodline bonus spells (sorcerer)
// ---------------------------------------------------------------------------

/**
 * Bloodline bonus spells known at `sorcererLevel` for the given `bloodlineTag`.
 * PF1 rule: a bloodline's level-`L` spell (1-indexed spell level) is unlocked
 * at sorcerer level `2L+1`. Returns the ids of unlocked bloodline spells (only
 * those whose spell level ≤ floor((sorcererLevel-1)/2)). Empty if the tag is
 * unknown to refData or the sorcererLevel is below 3. Sorted by name.
 *
 * These are *bonus* spells known — the builder adds them to the displayed
 * known list automatically and they do NOT count against the spells-known cap.
 *
 * @example
 *   bloodlineSpellsKnown(ref, "Draconic", 7)  // → spells of level 1..3
 *   bloodlineSpellsKnown(ref, "Draconic", 2)  // → []  (starts at L3)
 */
export function bloodlineSpellsKnown(
  refData: RefData,
  bloodlineTag: string | undefined,
  sorcererLevel: number,
): { id: string; name: string; level: number }[] {
  if (!bloodlineTag) return [];
  const list = refData.bloodlineSpellLists[bloodlineTag];
  if (!list) return [];
  const out: { id: string; name: string; level: number }[] = [];
  for (let level = 1; level <= 9; level++) {
    if (2 * level + 1 > sorcererLevel) break;
    for (const id of list[level] ?? []) {
      const sp = refData.spells[id];
      out.push({ id, name: sp?.name ?? id, level });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Wizard specialization schools
// ---------------------------------------------------------------------------

/**
 * Wizard specialization school tag -> display label. Hand-authored (trivial;
 * the vendored Foundry data has no arcane-school display-name mapping, only
 * the bare `Spell.school` abbreviation each spell carries). The single source
 * of truth for both the builder's school/opposition pickers and the spell
 * browse filter chips.
 */
export const SCHOOL_LABELS: Record<WizardSchoolTag, string> = {
  abj: "Abjuration",
  con: "Conjuration",
  div: "Divination",
  enc: "Enchantment",
  evo: "Evocation",
  ill: "Illusion",
  nec: "Necromancy",
  trs: "Transmutation",
  uni: "Universalist",
};

/** All wizard school tags (the eight specialist schools + Universalist). */
export const SCHOOL_TAGS: WizardSchoolTag[] = [
  "abj",
  "con",
  "div",
  "enc",
  "evo",
  "ill",
  "nec",
  "trs",
  "uni",
];

/**
 * Display label for a school tag read off `Spell.school` (a bare `string` in
 * the schema, not narrowed to `WizardSchoolTag`). Falls back to the raw tag
 * for any value outside the known set (shouldn't happen with vendored data,
 * but keeps display code crash-free).
 */
export function schoolLabel(tag: string): string {
  return SCHOOL_LABELS[tag as WizardSchoolTag] ?? tag;
}
