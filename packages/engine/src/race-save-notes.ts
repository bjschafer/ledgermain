/**
 * Standard racial traits whose save bonus the compendium ships as PROSE.
 *
 * A race's standard traits reach the sheet two ways: as `Race.changes` (a
 * structured number the pipeline can apply) or as `Race.contextNotes` (a
 * reminder string). Every "+2 racial bonus on saves against X" is the second
 * kind — the vendored pack has no way to say "against X", so a dwarf's Hardy
 * arrives as the text "+2 Racial vs Poisons, Spells and Spell-likes" and
 * nothing more. Now that `Change.saveCategories` exists, that text can carry a
 * real number, and this table is the mapping.
 *
 * ## Why the vendored note is the key
 *
 * Each entry matches on a substring of the note it came from, and
 * `collect.ts` only offers it the notes that SURVIVED
 * `effectiveRaceContextNotes`. That is the whole suppression story: an
 * alternate racial trait that replaces a note-only standard trait already
 * drops its note by substring (`suppressNotes`), so the derived bonus goes
 * with it and cannot double up with the replacement. A dwarf who takes Steel
 * Soul loses Hardy's note and therefore Hardy's `+2`, keeping only Steel
 * Soul's own `+2 vs. poison` / `+4 vs. spells and SLAs`; a halfling who takes
 * Practicality loses Fearless the same way. Attaching these to `Race.changes`
 * in the data pipeline instead would have put them beyond that mechanism's
 * reach: the only handle there is `suppressTargets`, and the target is
 * `allSavingThrows`, shared by every save change a race has.
 *
 * The note itself deliberately stays on the sheet. Several of these strings
 * carry a rider in the same text that no number can express (Elf's "Immune to
 * Magic Sleep", Android's immunity list), and the note is where a player reads
 * what the trait actually is.
 *
 * ## What is left as prose, and why
 *
 * Clean-room from the published rules; the vendored slice's 24 save notes were
 * read in full. A bonus is only promoted when the whole of it fits categories
 * the `SAVE_CATEGORIES` vocabulary already carries. Where a note covers more
 * ground than the vocabulary does, the modelled part is applied and the rest
 * stays in the note (Android's paralysis, Duskwalker's negative energy,
 * Astomoi's inhaled poisons). Two are left alone entirely:
 *
 *   - Gillman: +2 vs. enchantment normally, but -2 against aboleths and their
 *     servants. One category with two totals depending on who is casting is
 *     not expressible, and picking either would be wrong half the time.
 *   - Wayang: +2 vs. the shadow subschool. Shadow is a subschool of illusion,
 *     so `illusion` would over-apply it to every illusion effect.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** One standard trait's save bonus, recovered from the note that describes it. */
export interface StandardRaceSaveBonus {
  /**
   * Substring of the vendored `allSavingThrows` note this bonus was
   * transcribed from. Matching on the note rather than the trait name is what
   * makes `suppressNotes` suppress the number too.
   */
  match: string;
  /**
   * The standard trait, for orientation only — never displayed, and omitted
   * where the published trait name could not be confirmed.
   */
  trait?: string;
  changes: Change[];
  /**
   * False when `changes` leaves part of the note's benefit unmodeled — see
   * the entry's own inline comment for what stays prose (Android's
   * paralysis, Astomoi's inhaled poisons, Duskwalker's negative energy).
   * Defaults to true (the note is fully expressed) when omitted.
   */
  full?: boolean;
}

/** `+N racial` on every save, scoped to `categories`. */
function racial(formula: string, ...categories: string[]): Change {
  return { target: "allSavingThrows", type: "racial", formula, saveCategories: categories };
}

/** Keyed by `Race.name`, matching the by-name precedent in `racial-traits.ts`. */
export const STANDARD_RACE_SAVE_BONUSES: Readonly<
  Record<string, readonly StandardRaceSaveBonus[]>
> = {
  // Paralysis has no vocabulary entry, so it stays in the note.
  Android: [
    {
      match: "Mind Affecting, Paralysis, Poison, Stun",
      trait: "Constructed",
      changes: [racial("4", "poison", "mind", "stun")],
      full: false,
    },
  ],
  Aphorite: [
    {
      match: "Poison and Mind-affecting",
      changes: [racial("2", "poison", "mind")],
    },
  ],
  "Aquatic Elf": [
    {
      match: "vs Enchantment Effects",
      trait: "Elven Immunities",
      changes: [racial("2", "enchantment")],
    },
  ],
  // The penalty vs. INHALED poisons only is narrower than the `poison`
  // category, so only the disease half is promoted.
  Astomoi: [
    {
      match: "Disease and Inhaled Poisons",
      trait: "Mouthless",
      changes: [racial("-2", "disease")],
      full: false,
    },
  ],
  Drow: [
    {
      match: "vs Enchantment Effects",
      trait: "Elven Immunities",
      changes: [racial("2", "enchantment")],
    },
  ],
  "Drow Noble": [
    {
      match: "vs Enchantment Effects",
      trait: "Elven Immunities",
      changes: [racial("2", "enchantment")],
    },
  ],
  // Negative energy has no vocabulary entry, so it stays in the note.
  Duskwalker: [
    {
      match: "Negative Energy and Death",
      trait: "Deathtouched",
      changes: [racial("2", "death")],
      full: false,
    },
  ],
  Dwarf: [
    {
      match: "Poisons, Spells and Spell-likes",
      trait: "Hardy",
      changes: [racial("2", "poison", "spell", "sla")],
    },
  ],
  Elf: [
    {
      match: "vs Enchantment Effects",
      trait: "Elven Immunities",
      changes: [racial("2", "enchantment")],
    },
  ],
  Gnome: [
    {
      match: "vs Illusion Effects",
      trait: "Illusion Resistance",
      changes: [racial("2", "illusion")],
    },
  ],
  "Green Martian": [{ match: "vs Fear Effects", changes: [racial("2", "fear")] }],
  "Half-Elf": [
    {
      match: "vs Enchantment Effects",
      trait: "Elven Immunities",
      changes: [racial("2", "enchantment")],
    },
  ],
  // Untyped rather than racial, deliberately: halfling luck is itself a +1
  // racial bonus on every save, and the published Fearless says its +2
  // "stacks with the bonus granted by halfling luck", which a second racial
  // bonus cannot do. The type encodes the intent rather than the label.
  Halfling: [
    {
      match: "vs Fear",
      trait: "Fearless",
      changes: [
        { target: "allSavingThrows", type: "untyped", formula: "2", saveCategories: ["fear"] },
      ],
    },
  ],
  "Monkey Goblin": [{ match: "vs. Fear Effects", changes: [racial("2", "fear")] }],
  Nagaji: [
    {
      match: "Mind-Affecting Effects and Poison",
      trait: "Resistant",
      changes: [racial("2", "mind", "poison")],
    },
  ],
  Reptoid: [
    {
      match: "against mind-affecting effects and poison",
      trait: "Resistant",
      changes: [racial("2", "mind", "poison")],
    },
  ],
  Strix: [{ match: "vs. Illusions", trait: "Suspicious", changes: [racial("2", "illusion")] }],
  Syrinx: [{ match: "vs. Mind-Affecting Effects", changes: [racial("2", "mind")] }],
  // Scales with Hit Dice, which is why the vendored note carries a formula
  // rather than a number.
  Vishkanya: [
    {
      match: "Racial vs Poison",
      trait: "Poison Resistance",
      changes: [racial("@attributes.hd.total", "poison")],
    },
  ],
};

/**
 * The category-scoped `Change`s a race's SURVIVING save notes imply.
 *
 * `notes` must be the post-suppression list (`effectiveRaceContextNotes`), not
 * `race.contextNotes` — see the module doc comment. Only `allSavingThrows`
 * notes are considered, so a match string can never pull a save bonus out of a
 * skill or AC reminder.
 */
export function standardRaceSaveChanges(raceName: string, notes: readonly ContextNote[]): Change[] {
  const entries = STANDARD_RACE_SAVE_BONUSES[raceName];
  if (!entries) return [];
  const saveNotes = notes.filter((n) => n.target === "allSavingThrows");
  if (saveNotes.length === 0) return [];
  return entries
    .filter((e) => saveNotes.some((n) => n.text.includes(e.match)))
    .flatMap((e) => e.changes);
}
