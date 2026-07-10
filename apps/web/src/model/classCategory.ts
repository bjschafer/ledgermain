/**
 * Class category classification, for organizing the builder's class picker into
 * Core / Base / Hybrid sections rather than one flat 31-entry alphabetical
 * chip list (which drops Fighter right next to Bloodrager) — the same shape as
 * `model/rarity.ts` does for races.
 *
 * The tiers are the published Paizo class categories (Core Rulebook classes;
 * the APG/UM/UC/UI/UW "base" classes; the ACG "hybrid" classes). The vendored
 * Foundry entries are no help here: every one of the 31 classes carries
 * `subType: "base"` upstream (Foundry's subType only distinguishes
 * base/prestige/npc-style kinds), so — exactly like race rarity — we map by
 * class NAME, clean-room from published facts. Anything unlisted (future
 * prestige/NPC-class vendoring) falls through to `"other"`; the
 * `classCategory.test.ts` "every named class resolves" guard catches a
 * data-pipeline rename silently dropping a class to that tier.
 *
 * Category is purely presentational — it never touches `compute()` or any game
 * number. See `model/grouping.ts` for the reusable grouping mechanism.
 */

import type { Class } from "@pf1/schema";

import { type CategoryGroup, groupByCategory } from "./grouping.js";

export type ClassCategory =
  | "core"
  | "base"
  | "hybrid"
  | "unchained"
  | "alternate"
  | "occult"
  | "prestige"
  | "other";

/** Display order, most → least foundational (drives the picker's section order). */
export const CLASS_CATEGORY_ORDER: readonly ClassCategory[] = [
  "core",
  "base",
  "hybrid",
  "unchained",
  "alternate",
  "occult",
  "prestige",
  "other",
];

export const CLASS_CATEGORY_LABEL: Record<ClassCategory, string> = {
  core: "Core",
  base: "Base",
  hybrid: "Hybrid",
  unchained: "Unchained",
  alternate: "Alternate",
  occult: "Occult",
  prestige: "Prestige",
  other: "Other",
};

/**
 * Class NAME → category. Only Core/Base/Hybrid are enumerated (the whole
 * vendored slice today); anything not listed here defaults to `"other"` via
 * `classCategory`.
 */
const CLASS_CATEGORY: Readonly<Record<string, ClassCategory>> = {
  // Core Rulebook (11).
  Barbarian: "core",
  Bard: "core",
  Cleric: "core",
  Druid: "core",
  Fighter: "core",
  Monk: "core",
  Paladin: "core",
  Ranger: "core",
  Rogue: "core",
  Sorcerer: "core",
  Wizard: "core",

  // Base classes (APG, UM, UC, UI, UW — 10 in the vendored slice).
  Alchemist: "base",
  Cavalier: "base",
  Gunslinger: "base",
  Inquisitor: "base",
  Magus: "base",
  Oracle: "base",
  Shifter: "base",
  Summoner: "base",
  Vigilante: "base",
  Witch: "base",

  // Advanced Class Guide — Hybrid (10).
  Arcanist: "hybrid",
  Bloodrager: "hybrid",
  Brawler: "hybrid",
  Hunter: "hybrid",
  Investigator: "hybrid",
  Shaman: "hybrid",
  Skald: "hybrid",
  Slayer: "hybrid",
  Swashbuckler: "hybrid",
  Warpriest: "hybrid",

  // Pathfinder Unchained (4).
  "Barbarian (Unchained)": "unchained",
  "Monk (Unchained)": "unchained",
  "Rogue (Unchained)": "unchained",
  "Summoner (Unchained)": "unchained",

  // Alternate classes (APG antipaladin; UC ninja/samurai) — parent-class
  // variants a character can't combine with their parent.
  Antipaladin: "alternate",
  Ninja: "alternate",
  Samurai: "alternate",

  // Occult Adventures (6).
  Kineticist: "occult",
  Medium: "occult",
  Mesmerist: "occult",
  Occultist: "occult",
  Psychic: "occult",
  Spiritualist: "occult",

  // Prestige classes (Core Rulebook; issue #66 chunk 1 — hand-authored, the
  // pinned Foundry pack ships none. See `packages/data-pipeline/src/
  // supplements.ts`'s `SUPPLEMENTAL_PRESTIGE_CLASSES`.)
  "Eldritch Knight": "prestige",
  "Mystic Theurge": "prestige",
};

/** Category for a class, defaulting to `"other"` for anything unlisted. */
export function classCategory(cls: Pick<Class, "name">): ClassCategory {
  return CLASS_CATEGORY[cls.name] ?? "other";
}

/**
 * Group class picker entries into ordered category sections. Thin convenience
 * over `groupByCategory` so the component doesn't re-wire the label/order
 * plumbing — mirrors `groupRacesByRarity`.
 */
export function groupClassesByCategory<T extends Pick<Class, "name">>(
  entries: readonly T[],
): CategoryGroup<T, ClassCategory>[] {
  return groupByCategory(
    entries,
    (cls) => classCategory(cls),
    CLASS_CATEGORY_ORDER,
    (c) => CLASS_CATEGORY_LABEL[c],
  );
}
