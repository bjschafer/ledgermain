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
    category:
      "Bloodlines, mysteries, spirits, disciplines, implements, orders, patrons, and shifter aspects",
    note: "The full published lists are browsable. Beyond the core-book ones, they show their rules text without wiring up the per-level powers you gain. That's deliberate, rather than inventing mechanics that might be wrong.",
  },
  {
    category: "Oracle revelations",
    note: "Covered for the ten Advanced Player's Guide mysteries (Battle, Bones, Flame, Heavens, Life, Lore, Nature, Stone, Waves, and Wind) plus Solar. Revelations from other mysteries aren't written up, but the mystery itself is still browsable with its full rules text, revelations included, so you can pick from it and apply them by hand.",
  },
  {
    category: "Kineticist wild talents",
    note: "The whole catalog is browsable, with the core infusions and utility talents modeled.",
  },
  {
    category: "Summoner (Unchained) eidolon",
    note: "The twelve core Pathfinder Unchained subtypes are in. Later-splatbook subtypes and a couple of rarer base-form options aren't, and a subtype's resistances, immunities, and spell-like abilities show as reference chips rather than live numbers.",
    issueDetail:
      "Not covered: the Aeon, Ancestor, Astral, Deepwater, Genie, Kami, Kyton, Radiant, Shadow, Storykin, Tapestry-Warped, Twinned, and Void subtypes, the Aberrant base form, and the Small-variant option.",
  },
  {
    category: "Alternate racial traits",
    note: "Every race's published alternates are browsable. The seven core races plus sylph have theirs fully modeled, including swapping out the trait they replace; for other races they show as reference text.",
    issueDetail:
      "750 vendored across all 80 races; only the hand-authored 8-race set carries mechanics and replacement enforcement.",
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
    note: 'Your DR and resistances come off incoming damage automatically. Enter the hit on the Hit Points panel, naming types if the GM did ("12b 6c", "18 fire"), and each part meets the right defense. Stoneskin and protection from energy track how much they have left to absorb, and end when they\'re spent. Whether an attack bypassed your DR is yours to say, since only your GM knows what the attacker was swinging: name the material in the hit ("12 adamantine", "18 cold iron") or flip the switch by hand. Immunity to a damage type works too, but nothing in the catalog grants one automatically yet. The high-level bloodline, mystery, and spirit powers that would aren\'t wired up, so add it as a custom buff for now. Immunity to things that aren\'t damage (sleep, poison, paralysis, mind-affecting, fear, disease, critical hits) isn\'t tracked at all.',
    issueDetail:
      "A sweep found zero player-race damage-type immunities — the real sources are capstone-tier class content (sorcerer/bloodrager bloodlines, class features, oracle mysteries, archetype features, feats, domains, spirits), which sit inside the chassis subsystems already listed above as core-only. Non-damage immunity is a different axis resolveDamage has no place for — this is where nearly all race immunity content actually lives (elves/half-elves/drow vs. magic sleep, duergar vs. paralysis/poison, androids vs. fear, Being of Ib vs. crits).",
  },
  {
    category: "Buffs marked “reminder only”",
    note: "Most buffs move real numbers on your sheet. Twenty-seven don't, and they say so on the buff itself: either the effect isn't a number (invisibility, see invisibility, endure elements) or it's a reroll rather than a bonus (the Danger Wards). Toggle them as trackers for the duration; apply what they do by hand.",
    issueDetail:
      "185 buffs vendored total; 27 have empty changes[]/contextNotes[]. Some are genuinely unmodelable (Invisibility, See Invisibility, Endure Elements, Delay Poison), some are reroll- or narrative-shaped (the Danger Wards), and some would need mechanics that don't exist yet (Force Field, Divine Transfer, Resiliency's alignment-DR variant, the Veemod set).",
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
    category: "Archetype buffs",
    detail: "The pf-arch-buffs pack (8 buffs across 2 archetypes) isn't vendored at all.",
  },
  {
    category: "Beyond data",
    detail:
      "Situational/activated effects, prestige-class prereq structuring, and Paths of Prestige-tier mechanics tables have no machine-readable source and must be hand-authored against the published rules.",
  },
  {
    category: "Unevaluated Foundry inline rolls in buff notes",
    detail:
      "~46 vendored buff contextNotes still contain Foundry's raw `[[formula]]` inline-roll syntax, rendered verbatim instead of evaluated (e.g. Inspire Courage's morale-vs-fear note).",
  },
  {
    category: "Armor-bonus items stack instead of competing",
    detail:
      "Bracers of Armor and Robe of the Archmagi grant their armor bonus via the `aac` target with untyped stacking, so they add to worn armor rather than taking the higher of the two as RAW requires.",
  },
  {
    category: "Unchained rage fatigue timer",
    detail:
      "Chained rage/bloodrage aftermath fatigue auto-applies (untimed) when the buff ends; Rage (Unchained)'s flat 1-minute fatigue is not auto-applied because conditions have no minute-scale timer.",
  },
  {
    category: "Size-die scaling exclusions",
    detail:
      "Weapon damage-die size scaling covers the die shapes present in the vendored weapon data; 2d4/1d12/2d12 are deliberately left unscaled, and the FAQ's two-step rule below Small is not implemented.",
  },
];
