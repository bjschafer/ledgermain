/**
 * AC bonuses the vendored catalogs ship only as `contextNotes` prose, keyed
 * by the EXACT note text they were transcribed from.
 *
 * Same gap and same fix as `vendored-trait-save-notes.ts` and
 * `vendored-trait-maneuver-notes.ts`, applied to `Change.acCategories`:
 * neither the character trait catalog (`RefData.traits`) nor the alternate
 * racial trait catalog (`RefData.racialTraits`) can express "against
 * attacks of opportunity", so a trait whose whole benefit is an
 * attack-scoped AC bonus arrives with `changes: []` and a note, and moves
 * no number.
 *
 * ## Why exact text rather than a per-entry table
 *
 * Same rationale as the save/maneuver note tables: keying on the note's own
 * words makes one line cover every entry that repeats it verbatim, and makes
 * the table impossible to mis-apply to an entry it wasn't written for.
 *
 * Entries are only promoted when the whole bonus fits the `AC_CATEGORIES`
 * vocabulary and applies with no gate the static sheet can't detect.
 * Excluded, same bar as the save/maneuver tables — with ONE deliberate
 * divergence: an attacker-SUBTYPE scope that names an `AC_CATEGORIES` key
 * (giants) is promotable here, because AC's vocabulary carries that axis on
 * purpose (see `ac-categories.ts`'s doc comment); attacker types with no key
 * stay prose rather than earning ad-hoc keys per entry. Also excluded:
 *   - scoped to an equipped weapon/shield the sheet can't verify, or to a
 *     fighting style/stance that must be active;
 *   - gated on a toggled or positional state (fighting defensively,
 *     adjacent ally, higher ground, being prone);
 *   - narrower than the whole category (only AoOs provoked by MOVEMENT is a
 *     real subset of `aoo` and would over-apply to every other AoO);
 *   - a category named freely at character creation from the full list.
 *
 * Where a note names one fitting scope alongside content that isn't
 * expressible, only the fitting part is promoted and the note keeps carrying
 * the rest; each such entry below says what was left out and why.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** `+N <type>` to AC, scoped to `categories`. */
export function scopedAc(formula: string, type: string, ...categories: string[]): Change {
  return { target: "ac", type, formula, acCategories: categories };
}

/**
 * Vendored ALTERNATE RACIAL TRAIT notes (`RefData.racialTraits`), keyed by
 * the note's exact text.
 */
export const VENDORED_RACIAL_TRAIT_AC_NOTES: Readonly<Record<string, readonly Change[]>> = {
  // Drow Defensive Training (Drow): the whole note is one dodge bonus
  // against one attacker type, a clean AC_CATEGORIES fit.
  "+4 dodge vs. aberrations": [scopedAc("4", "dodge", "aberrations")],
  // Ratfolk Unnatural: the dodge half of the note now has a home; the -4
  // Charisma-skill penalty (target chaSkills, an unapplied target) and the
  // worse-starting-attitude rider stay prose.
  "+2 Dodge bonus vs animals.": [scopedAc("2", "dodge", "animals")],
  // Dwarf Deep Warrior: this note is the AC half only (a separate cmb note
  // carries the grapple bonus, handled by the maneuver-note table) and is
  // fully expressed on its own.
  "+2 Dodge bonus vs. aberrations": [scopedAc("2", "dodge", "aberrations")],
  // Gnome Warden of Nature: aberrations is the only one of the three named
  // attacker types with an AC_CATEGORIES key; oozes and vermin stay prose.
  "+2 Dodge bonus vs. aberrations, oozes and vermin.": [scopedAc("2", "dodge", "aberrations")],
  // Elf Vigilance: "chaotic creatures" names an alignment, not a creature
  // type, so it fits the plain `chaotic` key rather than needing a
  // type-plus-alignment intersection.
  "+2 Dodge bonus vs. chaotic creatures.": [scopedAc("2", "dodge", "chaotic")],
};

/**
 * Vendored CHARACTER TRAIT notes (`RefData.traits`), keyed by the note's
 * exact text.
 */
export const VENDORED_CHARACTER_TRAIT_AC_NOTES: Readonly<Record<string, readonly Change[]>> = {
  // Trap Savvy (Darklands): no bonus type is named in the note, so, like the
  // sibling save note this trait ships ("+1 bonus against effects created by
  // traps.", already wired untyped in `vendored-trait-save-notes.ts`), this
  // is untyped rather than assumed to be a trait bonus. Fully expressed on
  // its own; the Craft (traps) bonus and the paired save note live in their
  // own notes.
  "+1 bonus to AC against attacks by traps": [scopedAc("1", "untyped", "traps")],
  // Blessed of the Norns: the traps half is promotable; the surprise-round
  // half names a combat state with no AC_CATEGORIES equivalent and stays
  // prose.
  "+1 Trait bonus to your AC against traps, and during any surprise round in which you are caught unaware.":
    [scopedAc("1", "trait", "traps")],
  // Dwarf-Trained (Giantslayer): the trait requires "cannot be a dwarf or
  // gnome", so the character can never also carry the dwarf/gnome Defensive
  // Training dodge-vs-giants bonus this note says it doesn't stack with;
  // that clause can never trigger and needs no special handling here.
  "+2 Dodge bonus to AC against creatures with the giant subtype.": [
    scopedAc("2", "dodge", "giants"),
  ],
};

/**
 * Exact keys from {@link VENDORED_RACIAL_TRAIT_AC_NOTES} whose promoted
 * `Change`s leave part of the note's benefit unmodeled. A note in this set
 * still needs its "apply this by hand" reminder even though the modelled
 * part is now a real number; every other key in the table is fully expressed
 * by its `Change`s.
 */
export const PARTIALLY_PROMOTED_RACIAL_TRAIT_AC_NOTES: ReadonlySet<string> = new Set([
  "+2 Dodge bonus vs animals.",
  "+2 Dodge bonus vs. aberrations, oozes and vermin.",
]);

/** Same idea as the racial set above, for character traits. */
export const PARTIALLY_PROMOTED_CHARACTER_TRAIT_AC_NOTES: ReadonlySet<string> = new Set([
  "+1 Trait bonus to your AC against traps, and during any surprise round in which you are caught unaware.",
]);

/**
 * Note targets eligible for promotion. Only the bare `ac` target — a note
 * aimed at touch/flat-footed AC specifically (none occur in the vendored
 * catalogs today) would be narrower than what `Change.acCategories` models
 * and must not match.
 */
export const AC_NOTE_TARGETS: ReadonlySet<string> = new Set(["ac"]);

/**
 * The scoped `Change`s an entry's own AC notes imply.
 *
 * Only `ac`-targeted notes are considered, so a table key can never pull an
 * AC bonus out of a skill or maneuver reminder.
 */
export function acChangesFromNotes(
  notes: readonly ContextNote[] | undefined,
  table: Readonly<Record<string, readonly Change[]>>,
): readonly Change[] {
  if (!notes || notes.length === 0) return [];
  const out: Change[] = [];
  for (const note of notes) {
    if (!AC_NOTE_TARGETS.has(note.target)) continue;
    const hit = table[note.text.trim()];
    if (hit) out.push(...hit);
  }
  return out;
}
