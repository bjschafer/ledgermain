/**
 * "What's not covered" content for Settings (issue #88) — a short, honest,
 * player-language summary of deliberate content-scope exclusions, so a
 * player who hits a gap can tell "not covered yet" from "the app is
 * broken" without filing a report. Maintained by hand as a static array
 * (no runtime fetch — nothing in the UI should ever imply a GitHub round
 * trip is happening for something this small).
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for known content gaps, including
 * issue #74's inventory: `bun run coverage:issue` (scripts/coverage-issue.ts)
 * renders #74's body from this file, so any edit here — a filled gap, a new
 * one, or only reworded copy — leaves that issue stale until it's
 * regenerated. Never hand-edit the issue.
 *
 * `COVERAGE_NOTES` is also what the Settings panel renders directly, so keep
 * its `note` copy player-facing; `issueDetail` is extra specificity (counts,
 * vendored-entry names) that's useful in the issue but too dense for the
 * panel. `INTERNAL_GAPS` holds gaps with no player-facing surface at all
 * (pure data-pipeline facts) that belong in the issue but have nowhere to
 * render in Settings.
 *
 * ## This file only ever describes what is MISSING
 *
 * The failure mode this file drifts into, repeatedly, is growing instead of
 * shrinking as gaps get closed: an entry gets rewritten to narrate the work
 * that just landed, and the actual gap ends up as its last sentence. Closing
 * a gap means DELETING its entry, or cutting the entry back to the smaller
 * gap that remains. It never means appending what now works.
 *
 * So: no "used to", no "no longer", no "now also", no counts of what got
 * fixed, no enumerating the races or lists that do work. The changelog
 * (`changelog.ts`) is where shipped work is announced; this is the
 * complement, and the two must not converge. `issueDetail` carries inventory
 * facts (how many entries exist, how many are modeled, what blocks the rest)
 * and not implementation history: no issue numbers, no commit provenance, no
 * "audited in the sweep". `test/coverageNotes.test.ts` enforces the length
 * budgets and the banned constructions, so a growing entry fails the build
 * rather than shipping.
 *
 * ## An entry has to be closeable
 *
 * A gap belongs here only if some future version of Ledgermain could close
 * it. Where the sheet stops because it would have to know something only the
 * GM knows, that's the product's boundary and not a gap: the app never models
 * the attacker's side, so it can't rule on whether a hit bypassed your DR or
 * whether an incoming effect lands. Listing those implies a future that isn't
 * coming. Document them as affordances where the player uses them instead.
 *
 * House style applies to every string here: no em or en dashes in copy that
 * renders in the app. Restructure the sentence instead.
 */

export interface CoverageNote {
  category: string;
  note: string;
  /**
   * Extra technical detail (counts, vendored-entry names) for the generated
   * issue #74 mirror only — never rendered by `CoverageNotesPanel`.
   */
  issueDetail?: string;
}

export const COVERAGE_NOTES: readonly CoverageNote[] = [
  {
    category: "Prestige classes",
    note: "All of them are in the class picker. Only the ten core-rulebook ones, plus Student of War and Soul Warden, have their spellcasting progression and entry requirements tracked. The rest show their full rules text, and their requirements read as advice rather than something the sheet enforces. If one you're playing advances your spellcasting, say so and it can be added.",
    issueDetail:
      "108 vendored splatbook prestige classes: no structured castingAdvancement (the schedules are prose) and no structured prereqs (requirements stay soft advisories).",
  },
  {
    category:
      "Class picker lists (rage powers, hexes, arcana, talents, exploits, tricks, discoveries, ki powers, style strikes, bold stares, phrenic amplifications, revelations, spirits, disciplines, implements, orders, patrons, aspects, wild talents)",
    note: 'Every published entry in these lists is browsable, searchable, and written up with its level requirement flagged. Entries that move numbers on your sheet automatically are marked with an "M". Most entries are not: they show their rules text for you to apply at the table.',
    issueDetail:
      "Every list, the class-subsystem tables included, sits at full vendored parity (rage powers 243, rogue talents 234, alchemist discoveries 168, witch hexes 104, down to monk style strikes 15), so the gap is promotion rather than coverage: only 32 rage powers and a scattering of talents and discoveries carry live changes[]. Candidates blocked on a missing mechanism are recorded inline in their table files.",
  },
  {
    category: "Archetypes",
    note: "Every published archetype is in the picker, and picking one swaps your class features and strikes through what it trades away. Only some archetype features move numbers on your sheet automatically: the rest show their rules text for you to apply at the table.",
    issueDetail:
      "1,425 vendored archetypes; 396 carry at least one structured feature effect. The remaining features are structural or prose-only, so the gap is promotion rather than coverage.",
  },
  {
    category: "Familiars",
    note: "The improved familiar catalog covers the common picks, not the whole published list: a species missing from the picker has no stat block to track, and a familiar archetype (a sage, a mascot, an emissary) is not modeled at all.",
    issueDetail:
      "47 species and 4 templates modeled. The published expanded Improved Familiar table exceeds 90 rows; the remainder lack authored stat blocks, the kami familiars the ninja's spiritual companion trick names among them. Familiar archetypes are a separate absent subsystem.",
  },
  {
    category: "Eidolon evolutions",
    note: "Every evolution is pickable and point-costed on your eidolon, but only the structured kinds (extra attacks, armor, ability increases, size, speed) change its derived stat block. The rest, like Grab, Poison, Immunity, Fast Healing, or Damage Reduction, show as picked abilities with rules text for you to apply at the table.",
    issueDetail:
      "81 evolutions are pickable against the pool; 18 (the attack, armor, ability, size, and speed kinds) move numbers in the eidolon derivation. The other 63 are display kind: picked and point-costed but applying nothing, defenses included, since the eidolon's defense block is fed only by unchained subtype grants, never by evolution picks.",
  },
  {
    category: "Witch patrons",
    note: 'The published patrons are all in the picker with their bonus spells. The nine "unique" patrons are shown but not applied: the hex one grants, the theme you pick under it, and the spells it swaps in are all yours to apply by hand.',
    issueDetail:
      "52 of 61 patrons carry a parsed 9-spell progression. The 9 unique patrons are templates over a chosen theme, and the doc has no field for that sub-choice, so their granted hex, drawback, theme restriction and per-level spell overrides stay display-only.",
  },
  {
    category: "Magic items",
    note: 'The full published catalog is in the gear picker: wondrous items, rings, rods, staves, artifacts, and named magic weapons and armor. Entries whose effect the sheet applies while equipped are marked with an "M". Most are not: they carry their rules text for you to apply at the table, and equipping one moves no numbers.',
    issueDetail:
      "1,090 entries carry structured changes[]; the imported catalog adds 3,832 whose effects exist only as prose. The gap is promotion rather than coverage, and the weapon and armor special ability catalog sits on the same axis: keen is the only entry that moves numbers.",
  },
  {
    category: "Metamagic",
    note: "Applying a metamagic feat tracks the slot cost, not the effect: Empower's bigger numbers or Dazing's save stay rules text for you to apply at the table. Class abilities that grant free or cheaper metamagic through a choice the sheet cannot store yet, like the Theologian's chosen domain spell or a magus arcana's once-a-day feat, are not applied either.",
    issueDetail:
      "All 84 vendored metamagic-tagged feats carry slot costs. Unmodeled free-application grants: Theologian Domain Secret and psychic Mimic Metamagic need stored feat-and-spell picks; magus metamagic arcana and oracle Guiding Star are once-a-day with no tracked pool; arcanist Metamixing, the Magician bard's Metamagic Mastery, and Arcane bloodline's Metamagic Adept only change casting time, which the sheet has no action surface for.",
  },
  {
    category: "Monk flurry of blows",
    note: "A monk's flurry sequence shows in Class Features as a reference string, but the sheet does not roll it: saved rolls and the attack lines use your normal attack progression. A brawler's flurry is the exception, rolled through a saved roll's two weapon fighting mode.",
    issueDetail:
      "Chained and unchained monk flurry labels are computed in the engine but stay display-only; nothing feeds them into iteratives or saved rolls. Chained flurry substitutes monk level for BAB, which the granted two-weapon-chain mechanism cannot express.",
  },
  {
    category: "Character traits",
    note: "The full published trait catalog is searchable in the picker, and a trait whose benefit carries structured numbers or a class-skill grant applies to your sheet automatically; a trait that asks you to choose a skill offers that choice on the trait itself. The rest show their benefit as text to apply at the table. Anything still missing can be added as a homebrew trait.",
    issueDetail:
      "1,981 vendored and searchable; 628 apply live effects, 71 more once their choose-one pick is made, plus the 28 hand-authored core entries. The remaining ~1,280 are situational prose; 58 hold an unconditional number blocked on an axis the sheet lacks (multi-select or any-skill picks, caster-level and per-day-pool numbers), inventoried in the engine's trait table.",
  },
];

/**
 * Gaps with no player-facing surface — pure data-pipeline facts that belong
 * in the generated issue #74 mirror but have nowhere to render in the
 * Settings panel, which only reads `COVERAGE_NOTES`.
 *
 * Same discipline as `COVERAGE_NOTES`: what's missing, not what got fixed.
 */
export interface InternalGap {
  category: string;
  detail: string;
}

export const INTERNAL_GAPS: readonly InternalGap[] = [
  {
    category: "Timed conditions",
    detail:
      "No condition in the catalog except the rage/bloodrage fatigue aftermath states its duration in rounds structurally, so every other countdown starts from a number typed at the table rather than from data.",
  },
];
