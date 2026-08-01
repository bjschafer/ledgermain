/**
 * Save bonuses the vendored catalogs ship only as `contextNotes` prose, keyed
 * by the EXACT note text they were transcribed from.
 *
 * Same gap and same fix as `race-save-notes.ts`, applied to the two big
 * vendored catalogs whose entries carry their own notes: the ~80-race
 * alternate racial trait catalog (`RefData.racialTraits`) and the character
 * trait catalog (`RefData.traits`). Neither can express "against poison", so a
 * trait whose whole benefit is a scoped save bonus arrives with `changes: []`
 * and a note, and moves no number.
 *
 * ## Why exact text rather than a per-entry table
 *
 * These notes repeat verbatim across many entries (a dozen traits all say
 * "+2 Trait bonus vs fear effects"), so keying on the note text itself makes
 * one line of table cover all of them, and makes the table impossible to
 * mis-apply to an entry it wasn't written for: the match is the entry's own
 * words. Exact rather than substring, so a longer note that merely CONTAINS a
 * shorter one never silently inherits its bonus.
 *
 * Entries are only promoted when the whole bonus fits the `SAVE_CATEGORIES`
 * vocabulary. Where a note reaches past it, the modelled part applies and the
 * note keeps carrying the rest.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** `+N <type>` on every save, scoped to `categories`. */
export function scopedSave(formula: string, type: string, ...categories: string[]): Change {
  return { target: "allSavingThrows", type, formula, saveCategories: categories };
}

/**
 * Vendored ALTERNATE RACIAL TRAIT notes (`RefData.racialTraits`), keyed by the
 * note's exact text.
 *
 * The vendored slice's ~86 distinct `allSavingThrows` notes were read in
 * full; 32 promote here. The rest stay prose because the scope they name has
 * no vocabulary entry (nauseated/sickened, ability drain, sonic, gaze
 * attacks, entangled, negative levels, starvation, fatigue, sanity damage,
 * language-dependent, altitude sickness, the pain descriptor, the pattern/
 * fascination subschool, traps), because it scopes to a school rather than
 * the whole of `spell`/`sla` (divination, necromancy, transmutation,
 * psychic), because it is a property of the ATTACKER rather than the effect
 * (aboleths, dragons, fey, undead, "non-elven humanoid", divine casters and
 * their outsider allies), because it is energy resistance or spell
 * resistance rather than a save bonus, because it is a limited-use resource
 * or reroll rather than a passive bonus (Adaptable Luck, Pharaonic Will,
 * Piety, a once-per-fire-kindled bonus), or because a caveat makes it
 * unexpressible (Xenophobic's mind-affecting-except-fear carve-out; the
 * Gillman pair that is +2 vs. illusions from everyone but aboleths and -2
 * from aboleths, the same one-category-two-totals problem as the standard
 * Gillman entry in `race-save-notes.ts`).
 *
 * Where a note names one fitting scope alongside one that is not
 * expressible, only the fitting part is promoted and the note keeps carrying
 * the rest; each such entry below says what was left out and why.
 */
export const VENDORED_RACIAL_TRAIT_SAVE_NOTES: Readonly<Record<string, readonly Change[]>> = {
  "+1 Luck bonus against fear effects for yourself and all allies of the same size category within 60 ft (18 m).":
    [scopedSave("1", "luck", "fear")],
  // Alchemical weapons and drunk potions/elixirs have no vocabulary entry.
  "+1 Racial bonus vs poison, alchemical weapons, and harmful effects from drinking potions or elixirs.":
    [scopedSave("1", "racial", "poison")],
  // Hexes carry no descriptor uniformly, so they stay in the note. Typed
  // UNTYPED rather than racial despite the note's wording: both traits saying
  // this are halfling, halfling luck is itself a +1 racial on every save, and
  // a second racial bonus cannot stack with it. The published trait says
  // explicitly that it does, so the type has to encode the intent rather than
  // the label.
  "+2 Racial bonus against curse effects and hexes. This bonus stacks with the bonus granted by halfling luck.":
    [scopedSave("2", "untyped", "curse")],
  // Energy drain, negative energy, and necromancy-only spells/SLAs have no
  // fitting category (spell/sla are unscoped by school).
  "+2 Racial bonus against death effects, energy drain, negative energy, and spells or spell-like abilities of the necromancy school.":
    [scopedSave("2", "racial", "death")],
  // Ingested poisons are narrower than `poison`; nauseated/sickened have no entry.
  "+2 Racial bonus against disease, ingested poisons, and becoming nauseated or sickened.": [
    scopedSave("2", "racial", "disease"),
  ],
  "+2 Racial bonus against disease.": [scopedSave("2", "racial", "disease")],
  // Dominate has no vocabulary entry; only the possession half is promoted.
  // Untyped for the same reason as the curse entry above.
  "+2 Racial bonus against dominate and possession effects. This bonus stacks with the bonus granted by halfling luck.":
    [scopedSave("2", "untyped", "possession")],
  "+2 Racial bonus against emotion and fear effects.": [
    scopedSave("2", "racial", "emotion", "fear"),
  ],
  "+2 Racial bonus against fear and despair effects.": [
    scopedSave("2", "racial", "fear", "despair"),
  ],
  "+2 Racial bonus against fear effects.": [scopedSave("2", "racial", "fear")],
  // Paralysis has no vocabulary entry.
  "+2 Racial bonus against fear, sleep and paralysis effects.": [
    scopedSave("2", "racial", "fear", "sleep"),
  ],
  "+2 Racial bonus against illusion spells and effects.": [scopedSave("2", "racial", "illusion")],
  "+2 Racial bonus against mind-affecting effects and poisons.": [
    scopedSave("2", "racial", "mind", "poison"),
  ],
  "+2 Racial bonus against mind-affecting effects.": [scopedSave("2", "racial", "mind")],
  // Nauseated/sickened have no vocabulary entry.
  "+2 Racial bonus to resist becoming nauseated, sickened or diseased": [
    scopedSave("2", "racial", "disease"),
  ],
  "+2 Racial bonus vs mind-affecting effects.": [scopedSave("2", "racial", "mind")],
  "+2 Racial bonus vs. death effects.": [scopedSave("2", "racial", "death")],
  // The "1 less save to cure" rider has no expressible form.
  "+2 Racial bonus vs. diseases and poisons; Requires 1 less save to heal diseases and poisons (min. 1 save)":
    [scopedSave("2", "racial", "disease", "poison")],
  "+2 Racial bonus vs. fear effects": [scopedSave("2", "racial", "fear")],
  "+2 Racial bonus vs. illusion spells and effects": [scopedSave("2", "racial", "illusion")],
  "+2 Racial bonus vs. poisons": [scopedSave("2", "racial", "poison")],
  // Necromancy-only spells/SLAs are narrower than the unscoped spell/sla
  // categories; only the curse-descriptor half is promoted.
  "+2 Racial bonus vs. spells and spell-like abilities of necromancy school or with curse descriptor.":
    [scopedSave("2", "racial", "curse")],
  "+2 bonus against illusions.": [scopedSave("2", "untyped", "illusion")],
  // The electricity resistance rider is not a save bonus.
  "+2 bonus versus poison. You have Electricity resistance 5": [
    scopedSave("2", "untyped", "poison"),
  ],
  "+2 bonus vs death effects.": [scopedSave("2", "untyped", "death")],
  // The "count as two consecutive saves" rider has no expressible form.
  "+2 bonus vs diseases.  If you exceed the DC by 5 or more count as two consecutive saves": [
    scopedSave("2", "untyped", "disease"),
  ],
  // Divination has no vocabulary entry.
  "+2 racial vs. divination and enchantment spells and effects": [
    scopedSave("2", "racial", "enchantment"),
  ],
  "+2 racial vs. fear effects": [scopedSave("2", "racial", "fear")],
  "+2 racial vs. mind-affecting effects": [scopedSave("2", "racial", "mind")],
  "-2 penalty against fear effects.": [scopedSave("-2", "untyped", "fear")],
  // The "no benefit from morale bonuses on such saves" rider, and the speed/AC
  // rider, have no expressible form.
  "-2 penalty on saves against fear effects and gain no benefit from morale bonuses on such saves. When affected by a fear effect, their base speed increases by 10 feet and they gain a +1 dodge bonus to Armor Class.":
    [scopedSave("-2", "untyped", "fear")],
  // The 24-hour suppression toggle has no expressible form.
  "You don't usually gain morale bonuses, but instead gain a +2 Racial bonus against emotion and fear effects. You can choose suppress both of these effects but the suppression must be done for a full 24 hour period.":
    [scopedSave("2", "racial", "emotion", "fear")],
};

/** Vendored CHARACTER TRAIT notes (`RefData.traits`), keyed by the note's exact text. */
export const VENDORED_CHARACTER_TRAIT_SAVE_NOTES: Readonly<Record<string, readonly Change[]>> = {};

/**
 * The scoped `Change`s an entry's own save notes imply.
 *
 * Only `allSavingThrows` notes are considered, so a table key can never pull a
 * save bonus out of a skill or AC reminder.
 */
export function saveChangesFromNotes(
  notes: readonly ContextNote[] | undefined,
  table: Readonly<Record<string, readonly Change[]>>,
): readonly Change[] {
  if (!notes || notes.length === 0) return [];
  const out: Change[] = [];
  for (const note of notes) {
    if (note.target !== "allSavingThrows") continue;
    const hit = table[note.text.trim()];
    if (hit) out.push(...hit);
  }
  return out;
}
