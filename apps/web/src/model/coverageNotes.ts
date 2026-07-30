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
 * Most gaps take one of two shapes, and the copy should say which:
 * browsable-but-not-modeled (the entry is in the picker with its full rules
 * text, but no live number moves — pickers mark modeled entries with an
 * "M" badge), versus genuinely absent. `group` states which, so the issue
 * mirror can bucket by shape.
 *
 * House style applies to every string here: no em or en dashes in copy that
 * renders in the app. Restructure the sentence instead.
 */

/**
 * Which shape a gap takes. Only the generated issue mirror reads this, to
 * bucket entries instead of listing fifteen unrelated headings flat:
 * `not-modeled` is in the picker with its rules text but moves no numbers,
 * `not-adjudicated` is a number the sheet shows but never rules on.
 */
export type CoverageGroup = "not-modeled" | "not-adjudicated";

export interface CoverageNote {
  category: string;
  group: CoverageGroup;
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
    group: "not-modeled",
    note: "All of them are in the class picker. Only the ten core-rulebook ones, plus Student of War and Soul Warden, have their spellcasting progression and entry requirements tracked. The rest show their full rules text, and their requirements read as advice rather than something the sheet enforces. If one you're playing advances your spellcasting, say so and it can be added.",
    issueDetail:
      "108 vendored splatbook prestige classes: no structured castingAdvancement (the schedules are prose) and no structured prereqs (requirements stay soft advisories).",
  },
  {
    category:
      "Class picker lists (rage powers, hexes, arcana, talents, exploits, tricks, discoveries, ki powers, style strikes, bold stares, phrenic amplifications, spirits, disciplines, implements, orders, patrons, aspects)",
    group: "not-modeled",
    note: 'Every published entry in these lists is browsable, searchable, and written up with its level requirement flagged. Entries that move numbers on your sheet automatically are marked with an "M". Most entries are not: they show their rules text for you to apply at the table.',
    issueDetail:
      "Every list, the class-subsystem tables included, sits at full vendored parity (rage powers 243, rogue talents 234, alchemist discoveries 168, witch hexes 104, down to monk style strikes 15), so the gap is promotion rather than coverage: only 31 rage powers and a scattering of talents and discoveries carry live changes[]. Candidates blocked on a missing mechanism are recorded inline in their table files.",
  },
  {
    category: "Oracle revelations",
    group: "not-modeled",
    note: 'Every published mystery\'s full revelation list is pickable, with level requirements flagged softly and each pick showing on your sheet with its write-up. Fifteen of them carry an "M" and move real numbers. The rest are yours to apply at the table.',
    issueDetail:
      "336 revelations, 15 promoted to live changes[]. Rejected with reasons recorded inline: save-category-scoped bonuses, ability substitutions, and repeat picks the one-key choose-one mechanism can't store.",
  },
  {
    category: "Kineticist wild talents",
    group: "not-modeled",
    note: "Every published infusion and utility talent is written up across all seven elements, plus every composite blast. Level gates and burn costs are tracked and the infusion and utility budgets counted. What a talent does is rules text you apply at the table: blasts aren't rolled by the sheet, and defense talents scale with burn you accept in play.",
    issueDetail:
      "236 hand-authored wild talents, 22 composite blasts, 7 elements, display-only per the honesty bar (activated abilities with action, save, and burn state). Blast attack and damage rolls aren't computed, since there's no blast weapon model. Burn is a real resource pool, but its nonlethal damage stays player-applied.",
  },
  {
    category: "Alternate racial traits",
    group: "not-modeled",
    note: "Every race's published alternates are browsable, and picking one applies the bonuses it spells out as numbers while retiring the replaced standard trait's numbers. What stays yours to apply: a swap whose replaced trait is a situational reminder line rather than a number (the reminder stays on your sheet), and a heritage rider that only works while shapechanged.",
    issueDetail:
      "860 vendored across all 80 races, 289 carrying structured changes applied live. The map reaches every race whose replaced standard traits have structured targets. Unreachable: context-note-only replaced traits and shapechange riders.",
  },
  {
    category: "Character traits",
    group: "not-modeled",
    note: "The full published trait catalog is searchable in the picker, and a trait whose benefit comes with structured numbers applies them to your sheet automatically. The rest show their benefit as text to apply at the table. Anything still missing can be added as a homebrew trait.",
    issueDetail:
      "1,981 vendored and searchable; 434 carry structured changes the sheet applies live, plus the 28 hand-authored core entries. The other ~1,500 are prose-only upstream.",
  },
  {
    category: "Spell resistance",
    group: "not-adjudicated",
    note: "Your SR shows on the sheet, but nothing rolls against it. Whether an effect needs to beat it, and whether it does, is still on you and your GM to resolve.",
  },
  {
    category: "Damage reduction and energy resistance",
    group: "not-adjudicated",
    note: "Your DR and resistances come off incoming damage automatically, and ablative pools like stoneskin track what they have left. Whether an attack bypassed your DR is yours to say, since only your GM knows what the attacker was swinging: name the material in the hit, or flip the switch by hand.",
  },
  {
    category: "Immunities",
    group: "not-adjudicated",
    note: "Immunity to things that aren't damage shows on your sheet and flags the matching condition, but it's a reminder for you and your GM. Nothing rolls against it.",
    issueDetail:
      "Non-damage immunity is a separate axis (Defenses.effectImmunities) that resolveDamage deliberately never sees: a soft flag on the conditions it maps onto, and a gate on the tracker's nonlethal entry, but nothing adjudicates an incoming effect against it.",
  },
  {
    category: "Buffs marked “reminder only”",
    group: "not-modeled",
    note: "Most buffs move real numbers on your sheet. Sixteen don't, and they say so on the buff itself: either the effect isn't a number (invisibility, see invisibility, endure elements) or it's a reroll rather than a bonus. Toggle them as trackers for the duration; apply what they do by hand.",
    issueDetail:
      "190 buffs vendored, 16 empty by hasNoModeledEffect (no changes[], no contextNotes[], no instance state). Each is genuinely unmodelable, reroll- or narrative-shaped, or blocked on a mechanic that doesn't exist yet.",
  },
  {
    category: "Community-pack feats",
    group: "not-modeled",
    note: "The bulk of the feat catalog is in, but a feat sourced from the wider community content pack may show its prerequisites as text only rather than enforcing them, and may not apply its effect to your sheet automatically.",
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
    category: "Beyond data",
    detail:
      "Situational/activated effects, prestige-class prereq structuring, and Paths of Prestige-tier mechanics tables have no machine-readable source and must be hand-authored against the published rules.",
  },
  {
    category: "Timed conditions",
    detail:
      "`live.conditionRounds` gives a condition a countdown the round clock ticks, but nothing in the catalog except the rage/bloodrage fatigue aftermath states its duration in rounds structurally, so every other condition is applied untimed and cleared by hand.",
  },
];
