/**
 * Shared "typed modifier" (`Change`) authoring model — the door BuffsPanel's
 * custom-buff form opened first (a single target/type/value row) generalized
 * to an editable LIST, reused by the homebrew race/feat editors (`model/
 * homebrewEditor.ts`) for their "additional typed bonuses" section. Pure and
 * framework-agnostic so it's unit-testable without a DOM; the `TARGETS`/
 * `TYPES` option lists were previously duplicated locally inside
 * `BuffsPanel.tsx`'s `CustomBuffForm` — kept here as the one source now.
 *
 * Option labels are written to stand alone when the `<select>` is closed and
 * only the chosen row shows: "Fire resistance", not "Fire" under a group
 * heading nobody can see at that point.
 */
import type { Change } from "@pf1/schema";

/** One option in a Change-authoring dropdown: the raw engine id plus its display label. */
export interface ChangeOption {
  /** The `Change.target`/`Change.type` string the engine actually reads. */
  id: string;
  label: string;
}

/** A labelled block of targets, rendered as an `<optgroup>`. */
export interface ChangeTargetGroup {
  label: string;
  options: readonly ChangeOption[];
}

/**
 * Common typed-modifier targets offered by every Change-authoring form (not
 * exhaustive — the engine accepts any target string; these are the ones worth
 * putting in a dropdown).
 */
export const CHANGE_TARGET_GROUPS: readonly ChangeTargetGroup[] = [
  {
    label: "Attack rolls",
    options: [
      { id: "attack", label: "All attack rolls" },
      { id: "mattack", label: "Melee attack rolls" },
      { id: "rattack", label: "Ranged attack rolls" },
    ],
  },
  {
    label: "Defense",
    options: [
      { id: "ac", label: "Armor Class" },
      { id: "allSavingThrows", label: "All saving throws" },
      { id: "fort", label: "Fortitude save" },
      { id: "ref", label: "Reflex save" },
      { id: "will", label: "Will save" },
      { id: "spellResist", label: "Spell resistance" },
    ],
  },
  {
    label: "Ability scores",
    options: [
      { id: "str", label: "Strength" },
      { id: "dex", label: "Dexterity" },
      { id: "con", label: "Constitution" },
      { id: "int", label: "Intelligence" },
      { id: "wis", label: "Wisdom" },
      { id: "cha", label: "Charisma" },
    ],
  },
  {
    label: "Checks and skills",
    options: [
      { id: "init", label: "Initiative" },
      { id: "cmb", label: "CMB (combat maneuvers)" },
      { id: "cmd", label: "CMD (maneuver defense)" },
      { id: "skills", label: "All skills" },
    ],
  },
  {
    /* "DR /silver" is how the rulebook writes it (DR 5/silver): the material
       named after the slash is what cuts through. */
    label: "Damage reduction",
    options: [
      { id: "dr", label: "DR (any damage)" },
      { id: "dr.magic", label: "DR /magic" },
      { id: "dr.silver", label: "DR /silver" },
      { id: "dr.cold-iron", label: "DR /cold iron" },
      { id: "dr.adamantine", label: "DR /adamantine" },
      { id: "dr.good", label: "DR /good" },
      { id: "dr.evil", label: "DR /evil" },
      { id: "dr.lawful", label: "DR /lawful" },
      { id: "dr.chaotic", label: "DR /chaotic" },
    ],
  },
  {
    label: "Energy resistance",
    options: [
      { id: "eres.fire", label: "Fire resistance" },
      { id: "eres.cold", label: "Cold resistance" },
      { id: "eres.electricity", label: "Electricity resistance" },
      { id: "eres.acid", label: "Acid resistance" },
      { id: "eres.sonic", label: "Sonic resistance" },
    ],
  },
  {
    /* Immunity is on/off, so any nonzero value reads the same to the engine;
       the row still needs a value because a Change carries one. */
    label: "Energy immunity",
    options: [
      { id: "imm.fire", label: "Fire immunity" },
      { id: "imm.cold", label: "Cold immunity" },
      { id: "imm.electricity", label: "Electricity immunity" },
      { id: "imm.acid", label: "Acid immunity" },
      { id: "imm.sonic", label: "Sonic immunity" },
    ],
  },
];

/** Flat list of every offered target id, in dropdown order. */
export const CHANGE_TARGETS: readonly string[] = CHANGE_TARGET_GROUPS.flatMap((g) =>
  g.options.map((o) => o.id),
);

/**
 * Stacking-type options offered by every Change-authoring form, ordered with
 * the ones a player reaches for most first rather than alphabetically.
 */
export const CHANGE_TYPE_OPTIONS: readonly ChangeOption[] = [
  { id: "untyped", label: "Untyped" },
  { id: "enh", label: "Enhancement" },
  { id: "morale", label: "Morale" },
  { id: "luck", label: "Luck" },
  { id: "insight", label: "Insight" },
  { id: "competence", label: "Competence" },
  { id: "sacred", label: "Sacred" },
  { id: "profane", label: "Profane" },
  { id: "dodge", label: "Dodge" },
  { id: "deflection", label: "Deflection" },
  { id: "natural armor", label: "Natural armor" },
  { id: "resistance", label: "Resistance" },
  { id: "circumstance", label: "Circumstance" },
  { id: "alchemical", label: "Alchemical" },
  { id: "racial", label: "Racial" },
  { id: "trait", label: "Trait" },
  { id: "inherent", label: "Inherent" },
  { id: "size", label: "Size" },
];

/** Flat list of every offered stacking type id. */
export const CHANGE_TYPES: readonly string[] = CHANGE_TYPE_OPTIONS.map((o) => o.id);

/** One editable row in a Change-list form — the UI-facing draft of a `Change`. */
export interface ChangeDraft {
  target: string;
  type: string;
  /** Numeric value; the draft is dropped by {@link draftsToChanges} when this is 0. */
  value: number;
}

/** A fresh, empty row for "+ Add modifier" — first entries in each option list. */
export function emptyChangeDraft(): ChangeDraft {
  return { target: CHANGE_TARGETS[0]!, type: CHANGE_TYPES[0]!, value: 1 };
}

/**
 * Converts editable drafts to real `Change`s, dropping any row with no
 * target or a zero value (a zero-value modifier is a no-op the engine would
 * silently apply anyway; skipping it here keeps the authored entity's
 * `changes[]` free of dead rows a player left at their default).
 */
export function draftsToChanges(drafts: readonly ChangeDraft[]): Change[] {
  return drafts
    .filter((d) => d.target.trim().length > 0 && d.value !== 0)
    .map((d) => ({ formula: String(d.value), target: d.target, type: d.type || "untyped" }));
}

/**
 * Reconstructs editable drafts from real `Change`s, for populating an edit
 * form from an existing homebrew entity. A non-numeric `formula` (never
 * produced by this editor, but possible if a doc was hand-edited or imported)
 * falls back to 0 rather than throwing.
 */
export function changesToDrafts(changes: readonly Change[]): ChangeDraft[] {
  return changes.map((c) => ({ target: c.target, type: c.type, value: Number(c.formula) || 0 }));
}
