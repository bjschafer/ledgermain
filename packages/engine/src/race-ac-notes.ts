/**
 * Standard racial traits whose AC bonus the compendium ships as PROSE.
 *
 * Mirrors `race-maneuver-notes.ts` exactly, for `Change.acCategories`
 * instead of `maneuverCategories`: a race's standard traits reach the sheet
 * as either `Race.changes` (a structured number) or `Race.contextNotes` (a
 * reminder string), and "+4 dodge bonus to AC against monsters of the giant
 * subtype" has always been the second kind — the vendored pack has no way to
 * say "against giants", so it arrives as text and nothing more.
 * `Change.acCategories` gives that text a real number.
 *
 * Defensive Training ("+4 Dodge vs Giants") is carried by BOTH Dwarf and
 * Gnome — the identical published trait, and the identical vendored note
 * text. The attacker-subtype scope is exactly what the `giants` key in
 * `AC_CATEGORIES` exists for (see that module's doc comment for why AC's
 * vocabulary carries an attacker-type axis when saves/maneuvers don't).
 *
 * Same suppression story as `race-save-notes.ts`/`race-maneuver-notes.ts`:
 * `collect.ts` only offers this table the notes that survived
 * `effectiveRaceContextNotes`, so a vendored alternate racial trait that
 * replaces Defensive Training drops the note, and the derived bonus goes
 * with it.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** One standard trait's AC bonus, recovered from the note that describes it. */
export interface StandardRaceAcBonus {
  /** Substring of the vendored `ac` note this bonus was transcribed from. */
  match: string;
  /** The standard trait, for orientation only — never displayed. */
  trait?: string;
  changes: Change[];
  /**
   * False when `changes` leaves part of the note's benefit unmodeled.
   * Defaults to true (the note is fully expressed) when omitted.
   */
  full?: boolean;
}

/** `+N <type>` to AC, scoped to `categories`. */
function racialAc(formula: string, type: string, ...categories: string[]): Change {
  return { target: "ac", type, formula, acCategories: categories };
}

/** Keyed by `Race.name`, matching the by-name precedent in `race-save-notes.ts`. */
export const STANDARD_RACE_AC_BONUSES: Readonly<Record<string, readonly StandardRaceAcBonus[]>> = {
  Dwarf: [
    {
      match: "Dodge vs Giants",
      trait: "Defensive Training",
      changes: [racialAc("4", "dodge", "giants")],
    },
  ],
  Gnome: [
    {
      match: "Dodge vs Giants",
      trait: "Defensive Training",
      changes: [racialAc("4", "dodge", "giants")],
    },
  ],
};

/**
 * The category-scoped `Change`s a race's SURVIVING AC notes imply.
 *
 * `notes` must be the post-suppression list (`effectiveRaceContextNotes`),
 * matching `standardRaceSaveChanges`'s own contract. Only `ac`-targeted
 * notes are considered, so a match string can never pull an AC bonus out of
 * a skill or maneuver reminder.
 */
export function standardRaceAcChanges(raceName: string, notes: readonly ContextNote[]): Change[] {
  const entries = STANDARD_RACE_AC_BONUSES[raceName];
  if (!entries) return [];
  const acNotes = notes.filter((n) => n.target === "ac");
  if (acNotes.length === 0) return [];
  return entries
    .filter((e) => acNotes.some((n) => n.text.includes(e.match)))
    .flatMap((e) => e.changes);
}
