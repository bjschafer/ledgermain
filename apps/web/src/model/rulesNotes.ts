/**
 * Pure helpers for rendering a vendored `ContextNote` as a plain-text
 * reminder line (see `components/RulesNote.tsx`, the one renderer).
 *
 * Note text is upstream prose: it reaches the app with whatever the source
 * author typed, which occasionally includes HTML emphasis. `RulesNote` renders
 * text, not markup, so a `<b>` would otherwise print verbatim.
 */
import type { ContextNote } from "@pf1/schema";

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
