/**
 * "What's not covered" content for Settings (issue #88) — a short, honest,
 * player-language summary of deliberate content-scope exclusions, so a
 * player who hits a gap can tell "not covered yet" from "the app is
 * broken" without filing a report. Maintained by hand as a static array
 * (no runtime fetch — nothing in the UI should ever imply a GitHub round
 * trip is happening for something this small).
 *
 * Content is a plain-language summary of the project's own tracked list of
 * deliberate exclusions; keep it in sync by hand when that list changes.
 * Deliberately no issue numbers or "as of" dates in the copy — a player
 * doesn't care which tracker entry this came from, only what's true today.
 */
export interface CoverageNote {
  category: string;
  note: string;
}

export const COVERAGE_NOTES: readonly CoverageNote[] = [
  {
    category: "Prestige classes",
    note: "Only the ten core-rulebook prestige classes are built in. Later-book prestige classes (Battle Herald, Rage Prophet, Master Chymist, and similar) aren't yet.",
  },
  {
    category: "Rage powers",
    note: "The core set plus a handful of common additions are covered. The long tail of splatbook rage powers (totem chains, ultimate-line powers, and similar) isn't.",
  },
  {
    category: "Menu subsystems (hexes, arcana, talents, exploits, tricks)",
    note: "Witch hexes, magus arcana, arcanist exploits, ninja tricks, investigator talents, and similar class picker lists cover the core books, not every later-splatbook addition.",
  },
  {
    category: "Kineticist wild talents",
    note: "Roughly half the element-specific wild-talent catalog — deeper infusions, utility talents, and some composite blasts — isn't modeled yet.",
  },
  {
    category: "Summoner (Unchained) eidolon",
    note: "The twelve core Pathfinder Unchained subtypes are in. Later-splatbook subtypes and a couple of rarer base-form options aren't.",
  },
  {
    category: "Alchemist's cognatogen",
    note: "Its numbers show up as reference text rather than a toggleable buff, unlike the alchemist's mutagen.",
  },
  {
    category: "Alternate racial traits",
    note: "Written up for the seven core races plus sylph. The rest of the vendored races have their standard traits only.",
  },
  {
    category: "Character traits",
    note: "The full published trait catalog is searchable in the picker. Traits outside a core 28-entry set may show their benefit as text only rather than a live number the sheet tracks — anything still missing can be added as a homebrew trait.",
  },
  {
    category: "Subdomains & elemental wizard schools",
    note: "Only top-level cleric domains and the standard wizard schools are wired up — subdomains and element-focused schools aren't.",
  },
  {
    category: "Community-pack feats",
    note: "The bulk of the feat catalog is in, but a feat sourced from the wider community content pack may show its prerequisites as text only rather than enforcing them.",
  },
];
