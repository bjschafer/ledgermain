/**
 * Shared "typed modifier" (`Change`) authoring model — the door BuffsPanel's
 * custom-buff form opened first (a single target/type/value row) generalized
 * to an editable LIST, reused by the homebrew race/feat editors (`model/
 * homebrewEditor.ts`) for their "additional typed bonuses" section. Pure and
 * framework-agnostic so it's unit-testable without a DOM; the `TARGETS`/
 * `TYPES` option lists were previously duplicated locally inside
 * `BuffsPanel.tsx`'s `CustomBuffForm` — kept here as the one source now.
 */
import type { Change } from "@pf1/schema";

/** Common typed-modifier targets offered by every Change-authoring form (not exhaustive). */
export const CHANGE_TARGETS: readonly string[] = [
  "attack",
  "mattack",
  "rattack",
  "ac",
  "allSavingThrows",
  "fort",
  "ref",
  "will",
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
  "init",
  "cmb",
  "cmd",
  "skills",
  "spellResist",
  "dr",
  "dr.magic",
  "dr.silver",
  "dr.coldIron",
  "dr.adamantine",
  "eres.fire",
  "eres.cold",
  "eres.electricity",
  "eres.acid",
  "eres.sonic",
];

/** Stacking-type options offered by every Change-authoring form. */
export const CHANGE_TYPES: readonly string[] = [
  "untyped",
  "enh",
  "morale",
  "luck",
  "sacred",
  "competence",
  "dodge",
  "deflection",
  "resistance",
  "circumstance",
  "racial",
  "trait",
  "natural armor",
  "size",
];

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
