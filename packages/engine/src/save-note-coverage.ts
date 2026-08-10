/**
 * One question, asked the same way regardless of which promotion table did
 * the work: has THIS `allSavingThrows` note's whole benefit already been
 * turned into a real `Change` somewhere in `collect.ts`, or does it still
 * need a player to apply it by hand?
 *
 * Four tables promote note prose into structured `saveCategories` bonuses
 * (`vendored-trait-save-notes.ts` for character traits and the vendored
 * racial-trait catalog, `race-save-notes.ts` for standard racial traits,
 * `buff-effects.ts`'s `SAVE_CATEGORY_PATCHES` for buffs), each keyed
 * differently (exact note text, a match substring plus race name, or a buff
 * name). This module is the single place that reconciles them into one
 * answer, so the UI never has to know which table applies to which catalog.
 *
 * "Partial" means what the promoting table's own doc comments already say:
 * the modelled part is real, but a caveat, rider, or narrower-than-vocabulary
 * clause named in the SAME note has no `Change` form and stays prose. A
 * partial note still needs its "apply by hand" reminder; only a "full" one
 * is safe to mark as already applied.
 */

import type { ContextNote } from "@pf1/schema";

import { BUFF_SAVE_NOTE_COVERAGE } from "./buff-effects.js";
import { STANDARD_RACE_SAVE_BONUSES } from "./race-save-notes.js";
import {
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES,
  SAVE_NOTE_TARGETS,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "./vendored-trait-save-notes.js";

export type SaveNoteCoverage = "full" | "partial" | "none";

/**
 * Which promotion table to consult. `race`/`buff` need the entity's own name
 * (`Race.name`/`Buff.name`) since those two tables key on it rather than on
 * note text alone.
 */
export type SaveNoteCatalog =
  | { catalog: "characterTrait" }
  | { catalog: "racialTrait" }
  | { catalog: "race"; raceName: string }
  | { catalog: "buff"; buffName: string };

function textTableCoverage(
  text: string,
  table: Readonly<Record<string, unknown>>,
  partial: ReadonlySet<string>,
): SaveNoteCoverage {
  if (!(text in table)) return "none";
  return partial.has(text) ? "partial" : "full";
}

function standardRaceCoverage(raceName: string, text: string): SaveNoteCoverage {
  const entries = STANDARD_RACE_SAVE_BONUSES[raceName];
  if (!entries) return "none";
  const hit = entries.find((e) => text.includes(e.match));
  if (!hit) return "none";
  return hit.full === false ? "partial" : "full";
}

function buffCoverage(buffName: string): SaveNoteCoverage {
  return BUFF_SAVE_NOTE_COVERAGE[buffName] ?? "none";
}

/**
 * Whether `note`'s bonus is already fully expressed as a structured `Change`
 * (`"full"`), only partly (`"partial"`, a remainder still needs hand-
 * applying), or not promoted at all (`"none"`, today's plain reminder).
 *
 * Only save-targeted notes are ever promoted (`SAVE_NOTE_TARGETS`, matching
 * `saveChangesFromNotes`'s own scope) — a skill or AC reminder always reads
 * `"none"`.
 */
export function saveNoteCoverage(
  source: SaveNoteCatalog,
  note: Pick<ContextNote, "target" | "text">,
): SaveNoteCoverage {
  if (!SAVE_NOTE_TARGETS.has(note.target)) return "none";
  const text = note.text.trim();
  switch (source.catalog) {
    case "characterTrait":
      return textTableCoverage(
        text,
        VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
        PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES,
      );
    case "racialTrait":
      return textTableCoverage(
        text,
        VENDORED_RACIAL_TRAIT_SAVE_NOTES,
        PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES,
      );
    case "race":
      return standardRaceCoverage(source.raceName, text);
    case "buff":
      return buffCoverage(source.buffName);
  }
}
