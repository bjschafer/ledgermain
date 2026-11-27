/**
 * One question, asked the same way regardless of which promotion table did
 * the work: has THIS note's whole benefit already been turned into a real
 * `Change` somewhere in `collect.ts`, or does it still need a player to apply
 * it by hand?
 *
 * Promotion tables turn note prose into structured `saveCategories`,
 * `maneuverCategories`, and `acCategories` bonuses, each keyed differently
 * (exact note text, a match substring plus race name, or a buff name). This
 * module is the single place that reconciles them into one answer, so the UI
 * never has to know which table applies to which catalog. A note's `target`
 * only ever matches one family (`SAVE_NOTE_TARGETS`, `MANEUVER_NOTE_TARGETS`,
 * and `AC_NOTE_TARGETS` don't overlap), so routing on it never has to
 * reconcile conflicting answers.
 *
 * "Partial" means what the promoting table's own doc comments already say:
 * the modelled part is real, but a caveat, rider, or narrower-than-vocabulary
 * clause named in the SAME note has no `Change` form and stays prose. A
 * partial note still needs its "apply by hand" reminder; only a "full" one
 * is safe to hide, since the stat it modifies already shows the bonus.
 */

import type { ContextNote } from "@pf1/schema";

import { BUFF_AC_NOTE_COVERAGE, BUFF_SAVE_NOTE_COVERAGE } from "./buff-effects.js";
import { STANDARD_RACE_AC_BONUSES } from "./race-ac-notes.js";
import { STANDARD_RACE_MANEUVER_BONUSES } from "./race-maneuver-notes.js";
import { STANDARD_RACE_SAVE_BONUSES } from "./race-save-notes.js";
import {
  AC_NOTE_TARGETS,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_AC_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_AC_NOTES,
  VENDORED_CHARACTER_TRAIT_AC_NOTES,
  VENDORED_RACIAL_TRAIT_AC_NOTES,
} from "./vendored-trait-ac-notes.js";
import {
  MANEUVER_NOTE_TARGETS,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_MANEUVER_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_MANEUVER_NOTES,
  VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
} from "./vendored-trait-maneuver-notes.js";
import {
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES,
  SAVE_NOTE_TARGETS,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "./vendored-trait-save-notes.js";

export type NoteCoverage = "full" | "partial" | "none";

/**
 * Which promotion table to consult. `race`/`buff` need the entity's own name
 * (`Race.name`/`Buff.name`) since those tables key on it rather than on note
 * text alone.
 */
export type NoteCatalog =
  | { catalog: "characterTrait" }
  | { catalog: "racialTrait" }
  | { catalog: "race"; raceName: string }
  | { catalog: "buff"; buffName: string };

type Family = "save" | "maneuver" | "ac";

function familyOf(target: string): Family | undefined {
  if (SAVE_NOTE_TARGETS.has(target)) return "save";
  if (MANEUVER_NOTE_TARGETS.has(target)) return "maneuver";
  if (AC_NOTE_TARGETS.has(target)) return "ac";
  return undefined;
}

function textTableCoverage(
  text: string,
  table: Readonly<Record<string, unknown>>,
  partial: ReadonlySet<string>,
): NoteCoverage {
  if (!(text in table)) return "none";
  return partial.has(text) ? "partial" : "full";
}

function standardRaceCoverage(
  table: Readonly<Record<string, readonly { match: string; full?: boolean }[]>>,
  raceName: string,
  text: string,
): NoteCoverage {
  const hit = table[raceName]?.find((e) => text.includes(e.match));
  if (!hit) return "none";
  return hit.full === false ? "partial" : "full";
}

const CHARACTER_TRAIT_TABLES = {
  save: [VENDORED_CHARACTER_TRAIT_SAVE_NOTES, PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES],
  maneuver: [
    VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
    PARTIALLY_PROMOTED_CHARACTER_TRAIT_MANEUVER_NOTES,
  ],
  ac: [VENDORED_CHARACTER_TRAIT_AC_NOTES, PARTIALLY_PROMOTED_CHARACTER_TRAIT_AC_NOTES],
} as const;

const RACIAL_TRAIT_TABLES = {
  save: [VENDORED_RACIAL_TRAIT_SAVE_NOTES, PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES],
  maneuver: [VENDORED_RACIAL_TRAIT_MANEUVER_NOTES, PARTIALLY_PROMOTED_RACIAL_TRAIT_MANEUVER_NOTES],
  ac: [VENDORED_RACIAL_TRAIT_AC_NOTES, PARTIALLY_PROMOTED_RACIAL_TRAIT_AC_NOTES],
} as const;

const STANDARD_RACE_TABLES = {
  save: STANDARD_RACE_SAVE_BONUSES,
  maneuver: STANDARD_RACE_MANEUVER_BONUSES,
  ac: STANDARD_RACE_AC_BONUSES,
} as const;

/**
 * Buff save coverage is keyed by buff name alone (every patched buff has one
 * save note); buff AC coverage by buff name then exact note text, since a
 * buff can carry several `ac` notes of which only one promotes (Angelic
 * Aspect's deflection line vs. its "bodily contact" line). No buff maneuver
 * table exists.
 */
function buffCoverage(buffName: string, family: Family, text: string): NoteCoverage {
  switch (family) {
    case "save":
      return BUFF_SAVE_NOTE_COVERAGE[buffName] ?? "none";
    case "ac":
      return BUFF_AC_NOTE_COVERAGE[buffName]?.[text] ?? "none";
    case "maneuver":
      return "none";
  }
}

/**
 * Whether `note`'s bonus is already fully expressed as a structured `Change`
 * (`"full"`), only partly (`"partial"`, a remainder still needs hand-
 * applying), or not promoted at all (`"none"`, a plain reminder). A note
 * whose target belongs to no promoted family (skills, attack, ...) always
 * reads `"none"`.
 */
export function noteCoverage(
  source: NoteCatalog,
  note: Pick<ContextNote, "target" | "text">,
): NoteCoverage {
  const family = familyOf(note.target);
  if (!family) return "none";
  const text = note.text.trim();
  switch (source.catalog) {
    case "characterTrait":
      return textTableCoverage(text, ...CHARACTER_TRAIT_TABLES[family]);
    case "racialTrait":
      return textTableCoverage(text, ...RACIAL_TRAIT_TABLES[family]);
    case "race":
      return standardRaceCoverage(STANDARD_RACE_TABLES[family], source.raceName, text);
    case "buff":
      return buffCoverage(source.buffName, family, text);
  }
}
