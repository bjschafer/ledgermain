/**
 * Alternate-racial-trait category classification (`model/racialTraitCategory.ts`):
 * the published category tags and the `"uncategorized"` fallback, verified
 * against the real vendored racial-trait slice so a data-pipeline bump that
 * introduces an unknown tag lands somewhere honest rather than in "other" —
 * same guard shape as `rarity.test.ts` / `classCategory.test.ts`.
 */
import { describe, expect, it } from "bun:test";

import type { RefData } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  groupRacialTraitsByCategory,
  RACIAL_TRAIT_CATEGORY_LABEL,
  RACIAL_TRAIT_CATEGORY_ORDER,
  racialTraitCategory,
} from "../src/model/racialTraitCategory.js";

const ref: RefData = loadRefData();
const traits = Object.values(ref.racialTraits);

describe("racialTraitCategory", () => {
  it("passes through every tag the vendored pack actually uses", () => {
    for (const tag of [
      "defense",
      "featSkills",
      "magical",
      "movement",
      "offense",
      "senses",
      "weakness",
      "other",
    ] as const) {
      expect(racialTraitCategory({ traitCategory: tag })).toBe(tag);
    }
  });

  it("files an untagged entry as uncategorized, never as the published 'other' category", () => {
    expect(racialTraitCategory({})).toBe("uncategorized");
    expect(racialTraitCategory({ traitCategory: undefined })).toBe("uncategorized");
  });

  it("files an unrecognized future tag as uncategorized rather than guessing", () => {
    expect(racialTraitCategory({ traitCategory: "someNewTag" })).toBe("uncategorized");
  });

  it("resolves every tag present in the vendored slice (a new tag trips this)", () => {
    const tags = new Set(traits.map((t) => t.traitCategory).filter((t) => t !== undefined));
    // Every tag the pinned pack ships is a known category, so nothing that
    // carries a tag falls through to the untagged bucket.
    for (const tag of tags) {
      expect(racialTraitCategory({ traitCategory: tag })).not.toBe("uncategorized");
    }
    expect(tags.size).toBe(8);
  });

  it("labels every category, uncategorized last in display order", () => {
    for (const category of RACIAL_TRAIT_CATEGORY_ORDER) {
      expect(RACIAL_TRAIT_CATEGORY_LABEL[category].length).toBeGreaterThan(0);
    }
    expect(RACIAL_TRAIT_CATEGORY_ORDER.at(-1)).toBe("uncategorized");
    expect(RACIAL_TRAIT_CATEGORY_LABEL.featSkills).toBe("Feat and Skill");
    expect(RACIAL_TRAIT_CATEGORY_LABEL.weakness).toBe("Weakness");
  });
});

describe("groupRacialTraitsByCategory", () => {
  it("keeps every entry: grouping the whole vendored slice loses nothing", () => {
    const groups = groupRacialTraitsByCategory(traits);
    const total = groups.reduce((sum, g) => sum + g.items.length, 0);
    expect(total).toBe(traits.length);
    // The untagged quarter of the pack is shown, not hidden.
    const untagged = groups.find((g) => g.category === "uncategorized");
    expect(untagged?.items.length).toBe(traits.filter((t) => !t.traitCategory).length);
    expect(untagged?.items.length).toBeGreaterThan(0);
  });

  it("orders sections per RACIAL_TRAIT_CATEGORY_ORDER and drops empty ones", () => {
    const groups = groupRacialTraitsByCategory([
      { traitCategory: "offense" },
      { traitCategory: undefined },
      { traitCategory: "defense" },
    ]);
    expect(groups.map((g) => g.category)).toEqual(["defense", "offense", "uncategorized"]);
    expect(groups.map((g) => g.label)).toEqual(["Defense", "Offense", "Uncategorized"]);
  });

  it("preserves the caller's sort within a section (the picker's chosen-first order)", () => {
    const groups = groupRacialTraitsByCategory([
      { id: "second", traitCategory: "magical" },
      { id: "first", traitCategory: "magical" },
    ]);
    expect(groups[0]?.items.map((t) => t.id)).toEqual(["second", "first"]);
  });

  it("returns no sections for an empty list", () => {
    expect(groupRacialTraitsByCategory([])).toEqual([]);
  });
});
