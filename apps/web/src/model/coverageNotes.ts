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
 * "M" badge), versus genuinely absent.
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
      "Class picker lists (rage powers, hexes, arcana, talents, exploits, tricks, discoveries, ki powers, style strikes, bold stares, phrenic amplifications)",
    note: 'Every published entry in these lists is browsable, searchable, and written up with its level requirement flagged. Entries that move numbers on your sheet automatically are marked with an "M". Most entries are not: they show their rules text for you to apply at the table.',
    issueDetail:
      "All sixteen lists sit at full vendored parity (rage powers 243, rogue talents 234, alchemist discoveries 168, witch hexes 104, down to monk style strikes 15), so the gap is promotion rather than coverage: only 31 rage powers and a scattering of talents and discoveries carry live changes[]. Candidates blocked on a missing mechanism are recorded inline in their table files.",
  },
  {
    category: "Bloodlines, spirits, disciplines, implements, orders, patrons, and shifter aspects",
    note: "The full published lists are browsable. Beyond the core-book ones, they show their rules text without wiring up the per-level powers you gain. That's deliberate, rather than inventing mechanics that might be wrong.",
  },
  {
    category: "Oracle revelations",
    note: 'Every published mystery\'s full revelation list is pickable, with level requirements flagged softly and each pick showing on your sheet with its write-up. Fifteen of them carry an "M" and move real numbers. The rest are yours to apply at the table.',
    issueDetail:
      "336 revelations, 15 promoted to live changes[]. Rejected with reasons recorded inline: save-category-scoped bonuses, ability substitutions, and repeat picks the one-key choose-one mechanism can't store.",
  },
  {
    category: "Kineticist wild talents",
    note: "Every published infusion and utility talent is written up across all seven elements, plus every composite blast. Level gates and burn costs are tracked and the infusion and utility budgets counted. What a talent does is rules text you apply at the table: blasts aren't rolled by the sheet, and defense talents scale with burn you accept in play.",
    issueDetail:
      "236 hand-authored wild talents, 22 composite blasts, 7 elements, display-only per the honesty bar (activated abilities with action, save, and burn state). Blast attack and damage rolls aren't computed, since there's no blast weapon model. Burn is a real resource pool, but its nonlethal damage stays player-applied.",
  },
  {
    category: "Summoner (Unchained) eidolon",
    note: 'Every published Paizo subtype and base form is in. A subtype\'s resistances, immunities, and spell-like abilities show as reference chips rather than live numbers, and a grant that says "choose one" is yours to apply. An avian or tauric eidolon is built at its Medium baseline, with the start-Small option yours to apply. The third-party Tapestry-Warped subtype is absent.',
    issueDetail:
      "28 subtype defs. Astral's halved Str/Dex table-accrual has no per-subtype override hook; choose-one-of evolution grants have no structured mechanism; Tapestry-Warped is non-Paizo with no verifiable source and is excluded on provenance. Vendored subtype prose is not surfaced in the picker.",
  },
  {
    category: "Alternate racial traits",
    note: "Every race's published alternates are browsable, and picking one applies whatever bonuses it spells out as numbers. What differs is the trade. For twenty-eight races, taking an alternate also retires the standard trait it replaces. For every other race the swap is yours to make: the entry names what it replaces, but nothing takes that standard trait away for you, and a heritage's different ability-score spread stays yours to apply.",
    issueDetail:
      "860 vendored across all 80 races, 252 of them carrying structured changes that collect.ts applies live. Replacement enforcement reaches 28 races through a verified standard-trait-name to change-target map. Elsewhere the vendored entries name a replaced trait with no verified target, so they apply on top. Deliberate non-mappings are documented at the map.",
  },
  {
    category: "Character traits",
    note: "The full published trait catalog is searchable in the picker, and a trait whose benefit comes with structured numbers applies them to your sheet automatically. The rest show their benefit as text to apply at the table. Anything still missing can be added as a homebrew trait.",
    issueDetail:
      "1,981 vendored and searchable; 434 carry structured changes the sheet applies live, plus the 28 hand-authored core entries. The other ~1,500 are prose-only upstream.",
  },
  {
    category: "Spell resistance",
    note: "Your SR shows on the sheet, but nothing rolls against it. Whether an effect needs to beat it, and whether it does, is still on you and your GM to resolve.",
  },
  {
    category: "Damage reduction and energy resistance",
    note: "Your DR and resistances come off incoming damage automatically, and ablative pools like stoneskin track what they have left. Whether an attack bypassed your DR is yours to say, since only your GM knows what the attacker was swinging: name the material in the hit, or flip the switch by hand.",
  },
  {
    category: "Immunities",
    note: "Immunity to nonlethal damage has no slot on the sheet; apply it from the ability's own text. Immunity to things that aren't damage shows on your sheet and flags the matching condition, but it's a reminder for you and your GM. Nothing rolls against it.",
    issueDetail:
      "Nonlethal damage is a category, not a damage type, so no imm.* target can hold it; telepathy has no sense target. Non-damage immunity is a separate axis (Defenses.effectImmunities) that resolveDamage deliberately never sees: display-only, plus a soft flag on the conditions it maps onto.",
  },
  {
    category: "Buffs marked “reminder only”",
    note: "Most buffs move real numbers on your sheet. Twenty-eight don't, and they say so on the buff itself: either the effect isn't a number (invisibility, see invisibility, endure elements) or it's a reroll rather than a bonus. Toggle them as trackers for the duration; apply what they do by hand.",
    issueDetail:
      "190 buffs vendored, 28 empty by hasNoModeledEffect (no changes[], no contextNotes[], no instance state). Some are genuinely unmodelable, some are reroll- or narrative-shaped, and some would need mechanics that don't exist yet.",
  },
  {
    category: "Community-pack feats",
    note: "The bulk of the feat catalog is in, but a feat sourced from the wider community content pack may show its prerequisites as text only rather than enforcing them, and may not apply its effect to your sheet automatically.",
  },
  {
    category: "Skill rank history",
    note: "Skill ranks are checked against your lifetime budget and per-skill level cap, but the sheet doesn't record which level each rank was bought at, so a rank that was spent before it was legally available (say, after re-ordering multiclass levels) isn't caught.",
    issueDetail:
      "CharacterDoc stores running rank totals with no per-level purchase ledger and no level-up ordering, so per-level spent-vs-earned auditing would need a schema addition and a level-gated allocator UX.",
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
    category: "Foundry use counters in vendored notes",
    detail:
      'About 78 vendored inline rolls read `@resources.*`, Foundry\'s per-day use counter, which has no roll-data equivalent here since this app meters uses through `deriveResourcePools` instead. Those resolve to nothing rather than to a wrong 0, dropping the "(N remaining uses)" clause; the note\'s own "once per day" wording carries the frequency.',
  },
  {
    category: "Timed conditions",
    detail:
      "`live.conditionRounds` gives a condition a countdown the round clock ticks, but nothing in the catalog except the rage/bloodrage fatigue aftermath states its duration in rounds structurally, so every other condition is applied untimed and cleared by hand.",
  },
  {
    category: "Size-die scaling below Small",
    detail:
      "Weapon damage-die size scaling steps one category at a time in both directions. The size-change FAQ's separate two-step rule for Fine/Diminutive/Tiny wielders is not implemented, so a weapon sized for a wielder below Small reads too high.",
  },
  {
    category: "Per-spell SR flag never set",
    detail:
      "Vendored spells.json never carries `sr: true` (1,331 spells say false, 1,695 omit it), so whether a spell allows spell resistance is undisplayable; the transform is a faithful passthrough of `system.sr`, so the loss is upstream in the source packs.",
  },
];
