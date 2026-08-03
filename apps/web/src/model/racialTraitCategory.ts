/**
 * Alternate-racial-trait category classification, for organizing the vendored
 * racial-trait picker into published trait categories rather than one flat
 * alphabetical list (Elf alone vendors 63 entries) — the same shape as
 * `model/rarity.ts` for races and `model/classCategory.ts` for classes.
 *
 * Unlike those two, the categories are not derived here: the vendored pack
 * carries its own `traitCategory` tag, which matches the published racial-trait
 * categories one for one (Defense Racial Traits, Feat and Skill Racial Traits,
 * Magical, Movement, Offense, Senses, Weakness, Other). Labels drop the shared
 * "Racial Traits" suffix, since the picker's own heading already says it.
 *
 * About a quarter of the pack ships no tag at all, and an unrecognized tag from
 * a future data bump is the same situation: both land in `"uncategorized"`
 * rather than being guessed into `"other"`, which is a real published category
 * with its own entries. Category is purely presentational — it never touches
 * `compute()` or any game number. See `model/grouping.ts` for the grouping
 * mechanism.
 */

import type { RacialTrait } from "@pf1/schema";

import { type CategoryGroup, groupByCategory } from "./grouping.js";

export type RacialTraitCategory =
  | "defense"
  | "featSkills"
  | "magical"
  | "movement"
  | "offense"
  | "senses"
  | "weakness"
  | "other"
  | "uncategorized";

/** Display order: the published category order, untagged entries last. */
export const RACIAL_TRAIT_CATEGORY_ORDER: readonly RacialTraitCategory[] = [
  "defense",
  "featSkills",
  "magical",
  "movement",
  "offense",
  "senses",
  "weakness",
  "other",
  "uncategorized",
];

export const RACIAL_TRAIT_CATEGORY_LABEL: Record<RacialTraitCategory, string> = {
  defense: "Defense",
  featSkills: "Feat and Skill",
  magical: "Magical",
  movement: "Movement",
  offense: "Offense",
  senses: "Senses",
  weakness: "Weakness",
  other: "Other",
  uncategorized: "Uncategorized",
};

const TAGGED: readonly RacialTraitCategory[] = [
  "defense",
  "featSkills",
  "magical",
  "movement",
  "offense",
  "senses",
  "weakness",
  "other",
];

/** Category for a vendored entry, defaulting to `"uncategorized"`. */
export function racialTraitCategory(
  trait: Pick<RacialTrait, "traitCategory">,
): RacialTraitCategory {
  const tag = trait.traitCategory;
  return TAGGED.find((c) => c === tag) ?? "uncategorized";
}

/**
 * Group vendored racial-trait picker entries into ordered category sections.
 * Thin convenience over `groupByCategory` so the component doesn't re-wire the
 * label/order plumbing — mirrors `groupRacesByRarity`/`groupClassesByCategory`,
 * including preserving each caller's own sort within a section.
 */
export function groupRacialTraitsByCategory<T extends Pick<RacialTrait, "traitCategory">>(
  entries: readonly T[],
): CategoryGroup<T, RacialTraitCategory>[] {
  return groupByCategory(
    entries,
    (t) => racialTraitCategory(t),
    RACIAL_TRAIT_CATEGORY_ORDER,
    (c) => RACIAL_TRAIT_CATEGORY_LABEL[c],
  );
}
