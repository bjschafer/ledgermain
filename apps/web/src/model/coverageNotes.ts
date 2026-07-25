/**
 * "What's not covered" content for Settings (issue #88) — a short, honest,
 * player-language summary of deliberate content-scope exclusions, so a
 * player who hits a gap can tell "not covered yet" from "the app is
 * broken" without filing a report. Maintained by hand as a static array
 * (no runtime fetch — nothing in the UI should ever imply a GitHub round
 * trip is happening for something this small).
 *
 * THIS IS THE PLAYER-FACING MIRROR OF ISSUE #74, which is the canonical
 * inventory of known content gaps. The two drift silently — nothing
 * enforces the pairing — so when a gap is filled or found, update both.
 * Deliberately no issue numbers or "as of" dates in the copy itself — a
 * player doesn't care which tracker entry this came from, only what's true
 * today.
 *
 * Most gaps take one of two shapes, and the copy should say which:
 * browsable-but-not-modeled (the entry is in the picker with its full rules
 * text, but no live number moves — pickers mark modeled entries with an
 * "M" badge), versus genuinely absent.
 */
export interface CoverageNote {
  category: string;
  note: string;
}

export const COVERAGE_NOTES: readonly CoverageNote[] = [
  {
    category: "Prestige classes",
    note: "All of them are in the class picker, but only the ten core-rulebook ones (plus Student of War) have their spellcasting progression and entry requirements tracked. Later-book prestige classes show their full rules text, and their requirements appear as advice rather than something the sheet enforces.",
  },
  {
    category:
      "Class picker lists (rage powers, hexes, arcana, talents, exploits, tricks, discoveries)",
    note: 'Every published entry is browsable and searchable, but only the core-book sets actually move numbers on your sheet — those are marked with an "M". The rest show their rules text for reference, so you\'ll need to apply them by hand.',
  },
  {
    category: "Bloodlines, mysteries, spirits, disciplines, implements, and orders",
    note: "The full published lists are browsable. Beyond the core-book ones, they show their rules text without wiring up the per-level powers you gain — deliberately, rather than inventing mechanics that might be wrong.",
  },
  {
    category: "Oracle revelations",
    note: "Covered for the ten Advanced Player's Guide mysteries (Battle, Bones, Flame, Heavens, Life, Lore, Nature, Stone, Waves, and Wind). Revelations from later mysteries aren't written up.",
  },
  {
    category: "Kineticist wild talents",
    note: "The whole catalog is browsable, with the core infusions and utility talents modeled.",
  },
  {
    category: "Summoner (Unchained) eidolon",
    note: "The twelve core Pathfinder Unchained subtypes are in. Later-splatbook subtypes and a couple of rarer base-form options aren't, and a subtype's resistances, immunities, and spell-like abilities show as reference chips rather than live numbers.",
  },
  {
    category: "Alternate racial traits",
    note: "Every race's published alternates are browsable. The seven core races plus sylph have theirs fully modeled, including swapping out the trait they replace; for other races they show as reference text.",
  },
  {
    category: "Character traits",
    note: "The full published trait catalog is searchable in the picker. Traits outside a core set may show their benefit as text only rather than a live number the sheet tracks — anything still missing can be added as a homebrew trait.",
  },
  {
    category: "Damage reduction and energy resistance",
    note: 'Your DR and resistances come off incoming damage automatically — enter the hit on the Hit Points panel, naming types if the GM did ("12b 6c", "18 fire"), and each part meets the right defense. Stoneskin and protection from energy track how much they have left to absorb, and end when they are spent. Whether an attack bypassed your DR is a switch you flip, since only your GM knows what the attacker was swinging. Immunities aren\'t modeled at all, so damage you should shrug off entirely still lands.',
  },
  {
    category: "Buffs marked “reminder only”",
    note: "Most buffs move real numbers on your sheet. Just under thirty don't, and they say so on the buff itself — either the effect isn't a number (invisibility, see invisibility, endure elements) or it's a reroll rather than a bonus (the Danger Wards). Toggle them as trackers for the duration; apply what they do by hand.",
  },
  {
    category: "Community-pack feats",
    note: "The bulk of the feat catalog is in, but a feat sourced from the wider community content pack may show its prerequisites as text only rather than enforcing them, and may not apply its effect to your sheet automatically.",
  },
];
