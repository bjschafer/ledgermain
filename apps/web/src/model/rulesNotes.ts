/**
 * Pure helpers for rendering a vendored `ContextNote` as a plain-text
 * reminder line (see `components/RulesNote.tsx`, the one renderer).
 *
 * Note text is upstream prose: it reaches the app with whatever the source
 * author typed, which occasionally includes HTML emphasis. `RulesNote` renders
 * text, not markup, so a `<b>` would otherwise print verbatim.
 */
import type { ContextNote } from "@pf1/schema";
import {
  MANEUVER_NOTE_TARGETS,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_MANEUVER_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_MANEUVER_NOTES,
  saveNoteCoverage,
  STANDARD_RACE_MANEUVER_BONUSES,
  VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
  type SaveNoteCoverage,
} from "@pf1/engine";

/**
 * HTML emphasis tags only, never a bare `<word>`: note text also carries
 * prose placeholders the source author wrote in angle brackets ("+1 Trait
 * bonus vs. <chosen> creatures"), and those are content a player needs to
 * read, not markup to drop.
 */
const EMPHASIS_TAG = /<\/?(?:b|i|em|strong|u|span)(?:\s[^>]*)?>/gi;

/** Block-level tags, which stand in for a space rather than nothing. */
const BLOCK_TAG = /<\/?(?:br|p|div|li|ul|ol)(?:\s[^>]*)?\/?>/gi;

/** Strip the HTML markup a vendored note may carry, leaving readable prose. */
export function stripNoteMarkup(text: string): string {
  return text
    .replace(EMPHASIS_TAG, "")
    .replace(BLOCK_TAG, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * The distinct reminder lines a note list is worth showing.
 *
 * One rules line often ships as several notes, one per stat it touches, with
 * the SAME text on each (Skates repeat "-4 on rough ice" across trip, drag,
 * and bull rush). Rendering them per note would stack identical rows, so
 * dedupe on the visible text and keep source order.
 */
export function noteLines(notes: readonly ContextNote[] | undefined): string[] {
  if (!notes || notes.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of notes) {
    const text = stripNoteMarkup(note.text);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

/**
 * Which promotion tables to consult for {@link contextNoteCoverage}. Mirrors
 * `@pf1/engine`'s `SaveNoteCatalog`, minus `"buff"`: no maneuver-note
 * promotion table exists for buffs (see `buff-effects.ts`'s
 * `BUFF_SAVE_NOTE_COVERAGE`, which has no maneuver counterpart), so
 * `BuffsPanel` keeps calling `saveNoteCoverage` directly instead of routing
 * through here.
 */
export type ContextNoteCatalog =
  | { catalog: "characterTrait" }
  | { catalog: "racialTrait" }
  | { catalog: "race"; raceName: string };

function textTableCoverage(
  text: string,
  table: Readonly<Record<string, unknown>>,
  partial: ReadonlySet<string>,
): SaveNoteCoverage {
  if (!(text in table)) return "none";
  return partial.has(text) ? "partial" : "full";
}

function standardRaceManeuverCoverage(raceName: string, text: string): SaveNoteCoverage {
  const entries = STANDARD_RACE_MANEUVER_BONUSES[raceName];
  if (!entries) return "none";
  const hit = entries.find((e) => text.includes(e.match));
  if (!hit) return "none";
  return hit.full === false ? "partial" : "full";
}

/**
 * Same question as `@pf1/engine`'s `saveNoteCoverage`, asked against the
 * maneuver-note promotion tables (`vendored-trait-maneuver-notes.ts`,
 * `race-maneuver-notes.ts`) instead of the save ones: has this `cmb`/`cmd`
 * note's whole benefit already landed as a real `Change`, or does it still
 * need a player to apply it by hand?
 */
function maneuverNoteCoverage(
  source: ContextNoteCatalog,
  note: Pick<ContextNote, "target" | "text">,
): SaveNoteCoverage {
  if (!MANEUVER_NOTE_TARGETS.has(note.target)) return "none";
  const text = note.text.trim();
  switch (source.catalog) {
    case "characterTrait":
      return textTableCoverage(
        text,
        VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
        PARTIALLY_PROMOTED_CHARACTER_TRAIT_MANEUVER_NOTES,
      );
    case "racialTrait":
      return textTableCoverage(
        text,
        VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
        PARTIALLY_PROMOTED_RACIAL_TRAIT_MANEUVER_NOTES,
      );
    case "race":
      return standardRaceManeuverCoverage(source.raceName, text);
  }
}

/**
 * The single answer `RulesNote`'s `appliedAutomatically` cue needs: has
 * `note`'s whole benefit already landed as a real `Change` somewhere in
 * `collect.ts`? Tries the save-note route first (`saveNoteCoverage`), then
 * the maneuver-note route — a given note's `target` only ever matches one of
 * the two (`SAVE_NOTE_TARGETS` and `MANEUVER_NOTE_TARGETS` don't overlap), so
 * this never has to reconcile conflicting answers, only pick whichever route
 * actually applies.
 *
 * "Partial" carries the same weight here as it does on the save side: the
 * modelled part is real but a caveat has no `Change` form and stays prose, so
 * a partial note still reads as "apply by hand" wherever a caller only checks
 * for `"full"`.
 */
export function contextNoteCoverage(
  source: ContextNoteCatalog,
  note: Pick<ContextNote, "target" | "text">,
): SaveNoteCoverage {
  const save = saveNoteCoverage(source, note);
  if (save !== "none") return save;
  return maneuverNoteCoverage(source, note);
}
