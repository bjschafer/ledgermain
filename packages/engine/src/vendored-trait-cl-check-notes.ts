/**
 * Caster-level-CHECK bonuses the vendored racial-trait catalog ships only as
 * `contextNotes` prose, keyed by the EXACT note text they were transcribed
 * from. Same gap and fix as `vendored-trait-save-notes.ts`, applied to the
 * `clCheck`/`clCheck.sr`/`clCheck.dispel` targets `spell-dcs.ts` introduced.
 *
 * The vendored pack tags every caster-level-shaped note `target: "cl"`,
 * whether the underlying bonus is to caster LEVEL itself (still a
 * deliberately unapplied target — see `spell-dcs.ts`) or to a CHECK made at
 * that caster level (overcoming spell resistance, dispelling). Exact-text
 * keying is what tells the two apart here: a table key names a check bonus
 * in its own words, never a level bonus, so `note.target === "cl"` alone
 * can't be used as a promotion filter the way `SAVE_NOTE_TARGETS`/
 * `MANEUVER_NOTE_TARGETS` are for their axes — it's only a first pass, same
 * as those two.
 *
 * Entries are only promoted when the whole bonus is UNSCOPED — reaches every
 * caster-level check of that kind, not just checks against one named
 * opponent type, descriptor, or spell. Human Dragon Scholar (dragons only)
 * and Gnome Fairy Catcher (fey only) are the two vendored entries that read
 * this way and were deliberately left out for that reason (see
 * `racial-trait-classification/racesHR.ts` and `racesEG.ts`).
 */

import type { Change, ContextNote } from "@pf1/schema";

/** `+N <type>` on a clCheck target ("clCheck.sr" or "clCheck.dispel"). */
export function scopedClCheck(formula: string, type: string, kind: "sr" | "dispel"): Change {
  return { target: `clCheck.${kind}`, type, formula };
}

/**
 * Vendored ALTERNATE RACIAL TRAIT notes (`RefData.racialTraits`), keyed by
 * the note's exact text.
 */
export const VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES: Readonly<Record<string, readonly Change[]>> = {
  // Duergar Deep Magic (ARG p. 186): both halves are unscoped.
  "+2 Racial bonus on checks to overcome SR and to dispel.": [
    scopedClCheck("2", "racial", "sr"),
    scopedClCheck("2", "racial", "dispel"),
  ],
  // Human Unstoppable Magic (ARG p. 214): unscoped vs. spell resistance.
  "+2 Racial bonus on caster level checks against spell resistance.": [
    scopedClCheck("2", "racial", "sr"),
  ],
};

/**
 * Note targets eligible for promotion — the vendored pack's own convention
 * for every CL-shaped note, whether it's a level bonus or a check bonus; the
 * table's exact-text keys are what actually separate the two (see the module
 * doc comment).
 */
export const CL_CHECK_NOTE_TARGETS: ReadonlySet<string> = new Set(["cl"]);

/**
 * The scoped `Change`s an entry's own CL-check notes imply.
 *
 * Only `cl`-targeted notes are considered, so a table key can never pull a
 * clCheck bonus out of a skill or AC reminder.
 */
export function clCheckChangesFromNotes(
  notes: readonly ContextNote[] | undefined,
  table: Readonly<Record<string, readonly Change[]>>,
): readonly Change[] {
  if (!notes || notes.length === 0) return [];
  const out: Change[] = [];
  for (const note of notes) {
    if (!CL_CHECK_NOTE_TARGETS.has(note.target)) continue;
    const hit = table[note.text.trim()];
    if (hit) out.push(...hit);
  }
  return out;
}
