/**
 * Save bonuses the vendored catalogs ship only as `contextNotes` prose, keyed
 * by the EXACT note text they were transcribed from.
 *
 * Same gap and same fix as `race-save-notes.ts`, applied to the two big
 * vendored catalogs whose entries carry their own notes: the ~80-race
 * alternate racial trait catalog (`RefData.racialTraits`) and the character
 * trait catalog (`RefData.traits`). Neither can express "against poison", so a
 * trait whose whole benefit is a scoped save bonus arrives with `changes: []`
 * and a note, and moves no number.
 *
 * ## Why exact text rather than a per-entry table
 *
 * These notes repeat verbatim across many entries (a dozen traits all say
 * "+2 Trait bonus vs fear effects"), so keying on the note text itself makes
 * one line of table cover all of them, and makes the table impossible to
 * mis-apply to an entry it wasn't written for: the match is the entry's own
 * words. Exact rather than substring, so a longer note that merely CONTAINS a
 * shorter one never silently inherits its bonus.
 *
 * Entries are only promoted when the whole bonus fits the `SAVE_CATEGORIES`
 * vocabulary. Where a note reaches past it, the modelled part applies and the
 * note keeps carrying the rest.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** `+N <type>` on every save, scoped to `categories`. */
export function scopedSave(formula: string, type: string, ...categories: string[]): Change {
  return { target: "allSavingThrows", type, formula, saveCategories: categories };
}

/**
 * Vendored ALTERNATE RACIAL TRAIT notes (`RefData.racialTraits`), keyed by the
 * note's exact text.
 */
export const VENDORED_RACIAL_TRAIT_SAVE_NOTES: Readonly<Record<string, readonly Change[]>> = {};

/** Vendored CHARACTER TRAIT notes (`RefData.traits`), keyed by the note's exact text. */
export const VENDORED_CHARACTER_TRAIT_SAVE_NOTES: Readonly<Record<string, readonly Change[]>> = {};

/**
 * The scoped `Change`s an entry's own save notes imply.
 *
 * Only `allSavingThrows` notes are considered, so a table key can never pull a
 * save bonus out of a skill or AC reminder.
 */
export function saveChangesFromNotes(
  notes: readonly ContextNote[] | undefined,
  table: Readonly<Record<string, readonly Change[]>>,
): readonly Change[] {
  if (!notes || notes.length === 0) return [];
  const out: Change[] = [];
  for (const note of notes) {
    if (note.target !== "allSavingThrows") continue;
    const hit = table[note.text.trim()];
    if (hit) out.push(...hit);
  }
  return out;
}
