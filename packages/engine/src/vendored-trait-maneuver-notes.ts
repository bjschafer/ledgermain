/**
 * Maneuver bonuses the vendored catalogs ship only as `contextNotes` prose,
 * keyed by the EXACT note text they were transcribed from.
 *
 * Same gap and same fix as `vendored-trait-save-notes.ts`, applied to
 * `Change.maneuverCategories` instead of `saveCategories`: neither the
 * character trait catalog (`RefData.traits`) nor the alternate racial trait
 * catalog (`RefData.racialTraits`) can express "against a trip attempt", so a
 * trait whose whole benefit is a maneuver-scoped cmb/cmd bonus arrives with
 * `changes: []` and a note, and moves no number.
 *
 * ## Why exact text rather than a per-entry table
 *
 * Same rationale as the save-note tables: keying on the note's own words
 * makes one line cover every entry that repeats it verbatim, and makes the
 * table impossible to mis-apply to an entry it wasn't written for.
 *
 * ## Why `target` is NOT normalized the way `allSavingThrows` is
 *
 * `vendored-trait-save-notes.ts`'s `scopedSave` always targets
 * `allSavingThrows` regardless of which save the source note aimed at,
 * because `SAVE_NOTE_TARGETS` treats fort/ref/will/allSavingThrows as
 * interchangeable — the promoted `saveCategories` already narrow which saves
 * actually see the bonus. `cmb` and `cmd` carry no such interchangeability:
 * one is your own attempt, the other is your defense against someone else's,
 * and conflating them would put an attack bonus on the defense stat or vice
 * versa. Each entry below therefore names its own `target` explicitly,
 * matching what the source note's own wording means (not always the
 * catalog's own `note.target` field — see the Log Roller entries below for
 * the one transcription mismatch that requires this).
 *
 * Entries are only promoted when the whole bonus fits the
 * `MANEUVER_CATEGORIES` vocabulary and applies with no gate the static sheet
 * can't detect. Excluded, same bar as the save tables and the
 * `racial-trait-classification/` audit:
 *   - scoped to a target creature type or subtype (an opponent property, not
 *     a property of the roll itself);
 *   - scoped to an equipped weapon type or a specific weapon a player must
 *     be wielding;
 *   - gated on a toggled state (raging, smiting, a consumed once-per-day
 *     charge) or a terrain/environment condition, EXCEPT the one class of
 *     exception this codebase already carries a precedent for: "while both
 *     combatants are standing on the ground" is treated as always-on (see
 *     `race-maneuver-notes.ts`'s Stability/Relentless — both from the same
 *     dwarven design family, and in melee this is true so close to always
 *     that the alternative is a bonus that silently never fires);
 *   - narrower than the whole maneuver (a bonus that only applies to the PIN
 *     step of a grapple, or to breaking one class of item during a sunder,
 *     is a real subset of `grapple`/`sunder` but would over-apply against
 *     every other grapple/sunder check);
 *   - a maneuver named freely at character creation from the full list
 *     (nothing here can follow a player's choice the way `openChanges` does
 *     for a few other axes);
 *   - "checks to escape a grapple" specifically — ambiguous by RAW (Escape
 *     Artist or a CMB check, player's choice), so no single target is
 *     correct.
 *
 * Where a note names one fitting scope alongside content that isn't
 * expressible, only the fitting part is promoted and the note keeps carrying
 * the rest; each such entry below says what was left out and why.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** `+N <type>` on `target` ("cmb" or "cmd"), scoped to `categories`. */
export function scopedManeuver(
  formula: string,
  type: string,
  target: "cmb" | "cmd",
  ...categories: string[]
): Change {
  return { target, type, formula, maneuverCategories: categories };
}

/**
 * Vendored ALTERNATE RACIAL TRAIT notes (`RefData.racialTraits`), keyed by
 * the note's exact text.
 */
export const VENDORED_RACIAL_TRAIT_MANEUVER_NOTES: Readonly<Record<string, readonly Change[]>> = {
  // Halfling Unfettered: the CMB half ("+2 Racial bonus to escape a
  // grapple.") is the escape-a-grapple ambiguity above and stays prose.
  "+2 Racial bonus against grapples.": [scopedManeuver("2", "racial", "cmd", "grapple")],
  "+1 bonus against trip maneuvers.": [scopedManeuver("1", "untyped", "cmd", "trip")],
  "+2 Racial bonus to dirty trick maneuvers.": [scopedManeuver("2", "racial", "cmb", "dirtyTrick")],
  "+4 racial to trip": [scopedManeuver("4", "racial", "cmb", "trip")],
  // Dwarf/vendored Relentless: same "standing on the ground" family as
  // Stability (`race-maneuver-notes.ts`), treated as always-on; the rider
  // stays in the visible note text. No type named, so untyped.
  "+2 bonus to bull rush or overrun while both you and your target are standing on the ground.": [
    scopedManeuver("2", "untyped", "cmb", "bullRush", "overrun"),
  ],
  "+1 racial to disarm and steal": [scopedManeuver("1", "racial", "cmb", "disarm", "steal")],
  // No type named, so untyped. The Strength-check-to-break-objects half
  // (target `strChecks`) is a different target and not this table's concern.
  "+2 bonus on sunder attempts.": [scopedManeuver("2", "untyped", "cmb", "sunder")],
  "+2 Racial vs. bull rush and trip": [scopedManeuver("2", "racial", "cmd", "bullRush", "trip")],
  // Heart of the Snows: the cold-climate Fortitude note and the
  // slippery-terrain Acrobatics/Climb note (narrower than any category) stay
  // prose; only the trip half fits the vocabulary.
  "+2 Racial bonus against trip combat maneuvers.": [scopedManeuver("2", "racial", "cmd", "trip")],
  // Unflinching Valor (Frostkin): the fear save note promotes separately via
  // VENDORED_RACIAL_TRAIT_SAVE_NOTES.
  "+1 Racial bonus to CMD to avoid being grappled.": [
    scopedManeuver("1", "racial", "cmd", "grapple"),
  ],
  // Elf Slender: the CMB half ("+2 Racial bonus to escape grapples") is the
  // escape-a-grapple ambiguity above and stays prose.
  "+2 Racial bonus vs. grapples": [scopedManeuver("2", "racial", "cmd", "grapple")],
  "+4 Racial bonus vs. steal and disarm": [scopedManeuver("4", "racial", "cmd", "steal", "disarm")],
  "+4 Racial bonus to resist bull rush or trip.": [
    scopedManeuver("4", "racial", "cmd", "bullRush", "trip"),
  ],
};

/**
 * Vendored CHARACTER TRAIT notes (`RefData.traits`), keyed by the note's
 * exact text.
 */
export const VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES: Readonly<Record<string, readonly Change[]>> =
  {
    // No type named, so untyped.
    "-2 penalty to CMD against dirty trick combat maneuvers.": [
      scopedManeuver("-2", "untyped", "cmd", "dirtyTrick"),
    ],
    // Prankster: the flatfooted-duration rider on the cmb half has no
    // Change-shaped form and stays prose.
    "+1 Trait bonus on dirty trick combat maneuver checks.  If you succeed at a dirty trick combat maneuver check against a flatfooted opponent, increase the duration of the condition caused by 1 round.":
      [scopedManeuver("1", "trait", "cmb", "dirtyTrick")],
    "+1 Trait bonus to your CMD when an opponent attempts a dirty trick combat maneuver check against you.":
      [scopedManeuver("1", "trait", "cmd", "dirtyTrick")],
    "+1 Trait bonus on checks to sunder,": [scopedManeuver("1", "trait", "cmb", "sunder")],
    "+1 Trait bonus against bull rush and overrun combat maneuvers.": [
      scopedManeuver("1", "trait", "cmd", "bullRush", "overrun"),
    ],
    "+2 Trait bonus when resisting grapple attempts.": [
      scopedManeuver("2", "trait", "cmd", "grapple"),
    ],
    "+2 Trait bonus against bull rush": [scopedManeuver("2", "trait", "cmd", "bullRush")],
    "+2 Trait bonus against grapple": [scopedManeuver("2", "trait", "cmd", "grapple")],
    "+2 Trait bonus on checks made to sunder.": [scopedManeuver("2", "trait", "cmb", "sunder")],
    // Reverent Wielder: the equipment-only saving-throw note (a different
    // target — the gear, not the character) is a separate note untouched here.
    "+1 Trait bonus vs disarm, steal, and sunder.": [
      scopedManeuver("1", "trait", "cmd", "disarm", "steal", "sunder"),
    ],
    "+1 Trait bonus to resist being grappled.": [scopedManeuver("1", "trait", "cmd", "grapple")],
    "+1 Trait bonus to grapple.": [scopedManeuver("1", "trait", "cmb", "grapple")],
    // Athletic Champion: the note repeats verbatim on both a `cmd` and an
    // `allSavingThrows` context note. Only the maneuver trio (bull rush,
    // drag, reposition) fits this vocabulary; navigating a crowd and
    // resisting spell-based forced movement have no matching category or
    // target and stay prose on both copies.
    "+2 Trait bonus on checks to navigate through a crowd or resist being moved against your will, including spells and bull rush, drag, and reposition combat maneuvers.":
      [scopedManeuver("2", "trait", "cmd", "bullRush", "drag", "reposition")],
    "+1 Trait bonus to attempt a dirty trick": [scopedManeuver("1", "trait", "cmb", "dirtyTrick")],
    "+1 Trait bonus to perform disarm and steal combat maneuvers": [
      scopedManeuver("1", "trait", "cmb", "disarm", "steal"),
    ],
    "+1 Trait bonus on checks\nmade to overrun and reposition opponents.": [
      scopedManeuver("1", "trait", "cmb", "overrun", "reposition"),
    ],
    "+2 Trait bonus vs. being disarmed": [scopedManeuver("2", "trait", "cmd", "disarm")],
    "+1 Trait bonus against disarm and steal combat maneuvers.": [
      scopedManeuver("1", "trait", "cmd", "disarm", "steal"),
    ],
    "+1 Trait bonus to overrun opponents.": [scopedManeuver("1", "trait", "cmb", "overrun")],
    "+1 Trait bonus against trip attempts.": [scopedManeuver("1", "trait", "cmd", "trip")],
    // Log Roller / Bellis Log Roller: the vendored note text says "CMB" but
    // the entry's own `note.target` is `cmd`, and the benefit ("resist trip
    // attacks") is unmistakably defensive — trusting the structured target
    // over the prose typo, same principle `SAVE_NOTE_TARGETS` uses.
    "+1 Trait bonus when attempting to resist trip attacks.": [
      scopedManeuver("1", "trait", "cmd", "trip"),
    ],
    "+1 Trait bonus to your CMB when attempting to resist trip attacks.": [
      scopedManeuver("1", "trait", "cmd", "trip"),
    ],
  };

/**
 * Exact keys from {@link VENDORED_RACIAL_TRAIT_MANEUVER_NOTES} whose promoted
 * `Change`s leave part of the note's benefit unmodeled. A note in this set
 * still needs its "apply this by hand" reminder even though the modelled
 * part is now a real number; every other key in the table is fully expressed
 * by its `Change`s.
 */
export const PARTIALLY_PROMOTED_RACIAL_TRAIT_MANEUVER_NOTES: ReadonlySet<string> = new Set([
  "+2 bonus on sunder attempts.",
  "+2 Racial bonus against trip combat maneuvers.",
]);

/** Same idea as the racial set above, for character traits. */
export const PARTIALLY_PROMOTED_CHARACTER_TRAIT_MANEUVER_NOTES: ReadonlySet<string> = new Set([
  "+1 Trait bonus on dirty trick combat maneuver checks.  If you succeed at a dirty trick combat maneuver check against a flatfooted opponent, increase the duration of the condition caused by 1 round.",
  "+2 Trait bonus on checks to navigate through a crowd or resist being moved against your will, including spells and bull rush, drag, and reposition combat maneuvers.",
]);

/**
 * Note targets eligible for promotion — unlike {@link SAVE_NOTE_TARGETS} in
 * `vendored-trait-save-notes.ts`, `cmb` and `cmd` are NOT interchangeable
 * (see this module's doc comment), so this is a filter for "is this note
 * aimed at a maneuver stat at all", not a normalization.
 */
export const MANEUVER_NOTE_TARGETS: ReadonlySet<string> = new Set(["cmb", "cmd"]);

/**
 * The scoped `Change`s an entry's own maneuver notes imply.
 *
 * Only `cmb`/`cmd`-targeted notes are considered, so a table key can never
 * pull a maneuver bonus out of a skill or AC reminder.
 */
export function maneuverChangesFromNotes(
  notes: readonly ContextNote[] | undefined,
  table: Readonly<Record<string, readonly Change[]>>,
): readonly Change[] {
  if (!notes || notes.length === 0) return [];
  const out: Change[] = [];
  for (const note of notes) {
    if (!MANEUVER_NOTE_TARGETS.has(note.target)) continue;
    const hit = table[note.text.trim()];
    if (hit) out.push(...hit);
  }
  return out;
}
