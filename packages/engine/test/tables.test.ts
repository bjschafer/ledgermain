/**
 * Fixture tests for the hardcoded BAB/save progression tables in `tables.ts`
 * — `saveForLevels`'s two prestige tiers in particular (issue #66 chunk 1).
 * See `SaveTier`'s doc comment in `@pf1/schema` `primitives.ts` for how these
 * two sequences were verified against the published Core Rulebook tables
 * (not merely derived from the base `high`/`low` formulas by renaming).
 */
import { describe, expect, it } from "bun:test";

import { babForLevels, saveForLevels } from "../src/index.js";

describe("saveForLevels", () => {
  it("high (base good save): 2 + floor(level/2), starts at 2", () => {
    const expected = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7];
    expected.forEach((v, i) => expect(saveForLevels("high", i + 1)).toBe(v));
  });

  it("low (base poor save): floor(level/3), starts at 0", () => {
    const expected = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3];
    expected.forEach((v, i) => expect(saveForLevels("low", i + 1)).toBe(v));
  });

  it("highPrestige (prestige good save): 1,1,2,2,3,3,4,4,5,5 — no +2 at 1st level", () => {
    const expected = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    expected.forEach((v, i) => expect(saveForLevels("highPrestige", i + 1)).toBe(v));
  });

  it("lowPrestige (prestige poor save): 0,1,1,1,2,2,2,3,3,3 — distinct from base 'low'", () => {
    const expected = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
    expected.forEach((v, i) => expect(saveForLevels("lowPrestige", i + 1)).toBe(v));
    // Explicitly distinct from the base "low" tier at levels 2, 5, 8 (the
    // whole point of the new tier — see the doc comment above).
    expect(saveForLevels("lowPrestige", 2)).not.toBe(saveForLevels("low", 2));
    expect(saveForLevels("lowPrestige", 5)).not.toBe(saveForLevels("low", 5));
    expect(saveForLevels("lowPrestige", 8)).not.toBe(saveForLevels("low", 8));
  });

  it("returns 0 for level <= 0 regardless of tier", () => {
    for (const tier of ["high", "low", "highPrestige", "lowPrestige"] as const) {
      expect(saveForLevels(tier, 0)).toBe(0);
      expect(saveForLevels(tier, -1)).toBe(0);
    }
  });
});

describe("babForLevels (Eldritch Knight full / Mystic Theurge half sanity check)", () => {
  it("high (Eldritch Knight, full BAB) matches level 1:1", () => {
    for (let level = 1; level <= 10; level++) expect(babForLevels("high", level)).toBe(level);
  });

  it("low (Mystic Theurge, half BAB) matches the published 0,1,1,2,2,3,3,4,4,5", () => {
    const expected = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
    expected.forEach((v, i) => expect(babForLevels("low", i + 1)).toBe(v));
  });
});
