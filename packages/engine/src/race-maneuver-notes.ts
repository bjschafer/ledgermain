/**
 * Standard racial traits whose maneuver bonus the compendium ships as PROSE.
 *
 * Mirrors `race-save-notes.ts` exactly, for `Change.maneuverCategories`
 * instead of `saveCategories`: a race's standard traits reach the sheet as
 * either `Race.changes` (a structured number) or `Race.contextNotes` (a
 * reminder string), and "+4 racial bonus to CMD when resisting a bull rush
 * or trip attempt" has always been the second kind — the vendored pack has
 * no way to say "against a bull rush or trip", so it arrives as text and
 * nothing more. `Change.maneuverCategories` gives that text a real number.
 *
 * The dwarf Stability trait ("+4 Racial vs Bull Rush and Trip while on
 * ground") is the one entry so far, carried by BOTH Dwarf and Duergar (an
 * exact duplicate of the same note text — Duergar's write-up borrows the
 * dwarf's wholesale). The "while on the ground" qualifier is true for nearly
 * every mundane melee combatant and the sheet has no way to detect the rare
 * exception (fighting from the air or water), so — same call the racial
 * `Stability`/`Relentless` entries in `vendored-trait-maneuver-notes.ts` make
 * for the same design family — this promotes as always-on with the qualifier
 * left in the visible note text rather than modeled.
 *
 * Same suppression story as `race-save-notes.ts`: `collect.ts` only offers
 * this table the notes that survived `effectiveRaceContextNotes`, so a
 * vendored alternate that replaces Stability (Relentless, Tightfisted — both
 * verified via `VENDORED_STANDARD_TRAIT_NOTES` in `racial-traits.ts`) drops
 * the note, and Stability's derived bonus goes with it.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** One standard trait's maneuver bonus, recovered from the note that describes it. */
export interface StandardRaceManeuverBonus {
  /** Substring of the vendored `cmb`/`cmd` note this bonus was transcribed from. */
  match: string;
  /** The standard trait, for orientation only — never displayed. */
  trait?: string;
  changes: Change[];
  /**
   * False when `changes` leaves part of the note's benefit unmodeled.
   * Defaults to true (the note is fully expressed) when omitted. Stability's
   * "while on the ground" qualifier stays modeled as always-on (see the
   * module doc comment), so it does not set this to false.
   */
  full?: boolean;
}

/** `+N <type>` on `target` ("cmb" or "cmd"), scoped to `categories`. */
function racialManeuver(formula: string, target: "cmb" | "cmd", ...categories: string[]): Change {
  return { target, type: "racial", formula, maneuverCategories: categories };
}

/** Keyed by `Race.name`, matching the by-name precedent in `race-save-notes.ts`. */
export const STANDARD_RACE_MANEUVER_BONUSES: Readonly<
  Record<string, readonly StandardRaceManeuverBonus[]>
> = {
  Dwarf: [
    {
      match: "Bull Rush and Trip",
      trait: "Stability",
      changes: [racialManeuver("4", "cmd", "bullRush", "trip")],
    },
  ],
  Duergar: [
    {
      match: "Bull Rush and Trip",
      trait: "Stability",
      changes: [racialManeuver("4", "cmd", "bullRush", "trip")],
    },
  ],
};

/**
 * The category-scoped `Change`s a race's SURVIVING maneuver notes imply.
 *
 * `notes` must be the post-suppression list (`effectiveRaceContextNotes`),
 * matching `standardRaceSaveChanges`'s own contract. Only `cmb`/`cmd` notes
 * are considered, so a match string can never pull a maneuver bonus out of a
 * skill or AC reminder.
 */
export function standardRaceManeuverChanges(
  raceName: string,
  notes: readonly ContextNote[],
): Change[] {
  const entries = STANDARD_RACE_MANEUVER_BONUSES[raceName];
  if (!entries) return [];
  const maneuverNotes = notes.filter((n) => n.target === "cmb" || n.target === "cmd");
  if (maneuverNotes.length === 0) return [];
  return entries
    .filter((e) => maneuverNotes.some((n) => n.text.includes(e.match)))
    .flatMap((e) => e.changes);
}
