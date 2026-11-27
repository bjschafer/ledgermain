/**
 * "What's not covered" content for Settings: a short, honest, player-language
 * summary of known gaps, so a player who hits one can tell "not built yet"
 * from "the app is broken" without filing a report. Maintained by hand as a
 * static array (no runtime fetch: nothing in the UI should imply a GitHub
 * round trip for something this small).
 *
 * This is panel copy, not the engineering inventory. Closeable gaps are
 * tracked as GitHub issues labeled `gap`; an entry here is the player's view
 * of one a player would actually notice, and goes when that issue closes.
 *
 * ## This file only ever describes what is MISSING
 *
 * The failure mode this file drifts into is growing instead of shrinking as
 * gaps get closed: an entry gets rewritten to narrate the work that just
 * landed, and the actual gap ends up as its last sentence. Closing a gap means
 * DELETING its entry, or cutting it back to the smaller gap that remains. It
 * never means appending what now works; shipped work is announced in
 * `changelog.ts`, and the two must not converge.
 *
 * ## No per-catalog entries
 *
 * A catalog where some entries move numbers and the rest are rules text
 * (archetypes, magic items, traits, talent lists, feats) is covered by the
 * first entry below. Don't add an entry per catalog counting how many are
 * modeled: that long tail never closes, and listing it is what makes this
 * panel long without telling a player anything.
 *
 * ## An entry has to be closeable
 *
 * Where the sheet stops because it would have to know something only the GM
 * knows, that's the product's boundary and not a gap: the app never models
 * the attacker's side, so it can't rule on whether a hit bypassed your DR or
 * whether an incoming effect lands. Document those as affordances where the
 * player uses them instead.
 *
 * `test/coverageNotes.test.ts` enforces the length budget and the banned
 * constructions. House style applies to every string here: no em or en
 * dashes. Restructure the sentence instead.
 */

export interface CoverageNote {
  category: string;
  note: string;
}

export const COVERAGE_NOTES: readonly CoverageNote[] = [
  {
    category: "Rules text you apply yourself",
    note: 'Every published class option, archetype, feat, trait, magic item, and eidolon evolution is in its picker with its full rules text, but most of them do not move numbers on your sheet. Most pickers mark the ones that do with an "M"; the rest are yours to apply at the table. Requirements written only as prose show a warning rather than blocking the pick.',
  },
  {
    category: "Prestige class spellcasting",
    note: "The Prophet of Kalistrade and the Red Mantis Assassin cast from a short spell list of their own, which the sheet does not give them.",
  },
  {
    category: "Familiars",
    note: "The improved familiar catalog covers the common picks, not the whole published list: a species missing from the picker has no stat block to track, and familiar archetypes (a sage, a mascot, an emissary) are not modeled.",
  },
  {
    category: "Witch patrons",
    note: 'The nine "unique" patrons are shown but not applied: the hex one grants, the theme you pick under it, and the spells it swaps in are yours to apply by hand.',
  },
  {
    category: "Weapon training maneuvers",
    note: "A fighter's weapon training bonus on combat maneuvers made with a trained weapon is not added to CMB: apply it at the table. Its CMD bonus against disarm and sunder shows the best trained group's bonus, whatever weapon is in hand.",
  },
  {
    category: "Monk flurry weapon lists",
    note: "An archetype that trades what a flurry may be swung with is not reflected in the flurry line: a zen archer's bow, a far strike monk's thrown weapons, and a sacred fist warpriest's fists carry no flurry sequence of their own.",
  },
  {
    category: "Crane Riposte and Crane Wing",
    note: "Neither shows up as a stance toggle, so Crane Riposte's smaller attack penalty and Crane Wing's dodge bonus against melee while Fighting Defensively stay rules text.",
  },
];
