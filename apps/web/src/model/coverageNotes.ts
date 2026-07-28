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
 * `COVERAGE_NOTES` is also what the Settings panel
 * renders directly, so keep its `note` copy player-facing; `issueDetail` is
 * extra specificity (counts, vendored-entry names) that's useful in the
 * issue but too dense for the panel. `INTERNAL_GAPS` holds gaps with no
 * player-facing surface at all (pure data-pipeline facts) that belong in the
 * issue but have nowhere to render in Settings.
 *
 * Most gaps take one of two shapes, and the copy should say which:
 * browsable-but-not-modeled (the entry is in the picker with its full rules
 * text, but no live number moves — pickers mark modeled entries with an
 * "M" badge), versus genuinely absent.
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
    note: "All of them are in the class picker, but only the ten core-rulebook ones (plus Student of War and Soul Warden) have their spellcasting progression and entry requirements tracked. Later-book prestige classes show their full rules text, and their requirements appear as advice rather than something the sheet enforces. If one you're playing advances your spellcasting, say so and it can be added.",
    issueDetail:
      "108 vendored splatbook prestige classes have no structured castingAdvancement (schedules are prose) and no structured prereqs (requirements are soft advisories).",
  },
  {
    category:
      "Class picker lists (rage powers, hexes, arcana, talents, exploits, tricks, discoveries, ki powers, style strikes, bold stares, phrenic amplifications)",
    note: 'Every published entry is browsable and searchable, but only the core-book sets actually move numbers on your sheet; those are marked with an "M". The rest show their rules text for reference, so you\'ll need to apply them by hand.',
  },
  {
    category: "Bloodlines, spirits, disciplines, implements, orders, patrons, and shifter aspects",
    note: "The full published lists are browsable. Beyond the core-book ones, they show their rules text without wiring up the per-level powers you gain. That's deliberate, rather than inventing mechanics that might be wrong. Oracle mysteries used to be on this list and no longer are: every published mystery now grants its class skills and bonus spells for real, with its whole revelation list pickable.",
  },
  {
    category: "Oracle revelations",
    note: "Every published mystery's full revelation list is pickable, with level requirements enforced softly and each pick showing on your sheet with its write-up. What a revelation does is still yours to apply at the table — none of them move numbers on the sheet yet.",
    issueDetail:
      "336 revelations across all 34 mysteries, all displayOnly by the forMystery factory's construction. Known promotion candidates for a modeling pass: metal's Iron Constitution, spellscar's Eldritch Resistance and Mystic Null, elemental's Elemental Resistance, streets' Face in the Crowd, apocalypse's Defy Elements and Near Death, and the darkvision grants (dark_tapestry's Pierce the Veil, shadow's Pierce the Shadows).",
  },
  {
    category: "Kineticist wild talents",
    note: "The whole catalog is browsable, with the core infusions and utility talents modeled.",
  },
  {
    category: "Summoner (Unchained) eidolon",
    note: "Every published Paizo subtype is in — the twelve Unchained core ones plus Aberrant, Aeon, Ancestor, Astral, Deepwater, Genie, Kami, Kyton, Radiant, Shadow, Storykin, Twinned, and Void — along with the Aberrant base form and the Small-eidolon option (its smaller dice, size modifiers, and skill bonuses all computed). A subtype's resistances, immunities, and spell-like abilities still show as reference chips rather than live numbers, and a grant that says \"choose one\" (like the Genie's 8th-level movement pick) is yours to apply. The Aquatic, Avian, and Tauric base forms are still absent, as is the third-party Tapestry-Warped subtype.",
    issueDetail:
      "28 EidolonSubtypeDefs (Elemental split into 4 element ids). Known prose-only accuracy gaps: Astral's halved Str/Dex table-accrual has no per-subtype override hook; choose-one-of evolution grants (Genie 8th) have no structured mechanism; Tapestry-Warped is non-Paizo (Orphaned Bookworm Productions) with no vendored/AoN text to verify against, excluded on provenance. Vendored RefData.eidolonSubtypes prose (26 entries) is not yet surfaced in the picker — the hand-authored grant notes carry the mechanics.",
  },
  {
    category: "Alternate racial traits",
    note: "Every race's published alternates are browsable, and picking one applies whatever bonuses it spells out as numbers. What differs is the trade: for the seven core races plus sylph, taking an alternate also retires the standard trait it replaces. For every other race the swap is yours to make: the entry names what it replaces, but nothing takes that standard trait away for you.",
    issueDetail:
      "860 vendored across all 80 races, 252 of them carrying structured `changes` that `collect.ts` applies live (plus `openChanges` once a target is chosen). Only the hand-authored 8-race table enforces the replacement via `suppressTargets`: the vendored catalog names replaced traits by name only, with no verified mapping onto that race's `changes`/`contextNotes` entries.",
  },
  {
    category: "Character traits",
    note: "The full published trait catalog is searchable in the picker. Traits outside a core set may show their benefit as text only rather than a live number the sheet tracks. Anything still missing can be added as a homebrew trait.",
    issueDetail:
      "1,981 vendored and searchable; only the hand-authored core set is mechanically modeled.",
  },
  {
    category: "Spell resistance",
    note: "Your SR shows on the sheet, but nothing rolls against it. Whether an effect needs to beat it, and whether it does, is still on you and your GM to resolve.",
  },
  {
    category: "Damage reduction and energy resistance",
    note: "Your DR and resistances come off incoming damage automatically. Enter the hit on the Hit Points panel, naming types if the GM did (\"12b 6c\", \"18 fire\"), and each part meets the right defense. Stoneskin and protection from energy track how much they have left to absorb, and end when they're spent. Whether an attack bypassed your DR is yours to say, since only your GM knows what the attacker was swinging: name the material in the hit (\"12 adamantine\", \"18 cold iron\") or flip the switch by hand. Immunity to a damage type works too, but nothing in the catalog grants one automatically yet. The high-level bloodline, mystery, and spirit powers that would aren't wired up, so add it as a custom buff for now. Immunity to things that aren't damage (an elf against magic sleep, a paladin against fear, a monk against disease) shows on your sheet and flags the matching condition, but it's a reminder for you and your GM; nothing rolls against it. Those come from your race and from the class features that grant them outright — a paladin's auras and Divine Health, a monk's Purity of Body and Diamond Body, a druid's Venom Immunity, an alchemist's Poison Immunity, and their kin.",
    issueDetail:
      "A sweep found zero player-race damage-type immunities. The real sources are capstone-tier class content (sorcerer/bloodrager bloodlines, class features, oracle mysteries, archetype features, feats, domains, spirits), which sit inside the chassis subsystems already listed above as core-only. Non-damage immunity is a separate axis (`Defenses.effectImmunities`, target `immEffect.<slug>`) that `resolveDamage` deliberately never sees: display-only, plus a soft flag on the conditions it maps onto (`conditionImmunityFor`). Sourced from `SUPPLEMENTAL_RACE_EFFECT_IMMUNITY`'s 11 hand-authored races and `SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY`'s 15 hand-authored class features (the paladin/antipaladin, monk, druid, and alchemist/investigator immunity lines, plus the prestige classes that share those features), since both are prose-only upstream.",
  },
  {
    category: "Buffs marked “reminder only”",
    note: "Most buffs move real numbers on your sheet. Twenty-eight don't, and they say so on the buff itself: either the effect isn't a number (invisibility, see invisibility, endure elements) or it's a reroll rather than a bonus (the Danger Wards). Toggle them as trackers for the duration; apply what they do by hand.",
    issueDetail:
      "190 buffs vendored total; 28 are empty by `hasNoModeledEffect` (no changes[], no contextNotes[], no BUFF_INSTANCE_STATE). Some are genuinely unmodelable (Invisibility, See Invisibility, Endure Elements, Delay Poison), some are reroll- or narrative-shaped (the Danger Wards), and some would need mechanics that don't exist yet (Force Field, Divine Transfer, Resiliency's alignment-DR variant, the Veemod set).",
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
      '`model/inlineRolls.ts` resolves the vendored `[[formula]]` inline rolls the data-pipeline can\'t (they read an `@` path, so they need a character), but ~78 of them read `@resources.*`, Foundry\'s per-day use counter, which has no roll-data equivalent here since this app meters uses through `deriveResourcePools` instead. Those resolve to nothing rather than to a wrong 0, dropping the "(N remaining uses)" clause; the note\'s own "once per day" wording carries the frequency.',
  },
  {
    category: "Timed conditions",
    detail:
      "`live.conditionRounds` gives a condition a countdown the round clock ticks, which the rage/bloodrage fatigue aftermath is currently the only thing that sets. Nothing else in the catalog states its duration in rounds structurally, so every other condition is still applied untimed and cleared by hand.",
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
