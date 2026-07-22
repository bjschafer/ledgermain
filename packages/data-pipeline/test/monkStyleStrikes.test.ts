import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored Monk (Unchained) style-strike catalog
 * (issue #74 Phase 3c) against the real pinned Pf Data 1e slice.
 */
const ref = loadRefData();

describe("RefData.monkStyleStrikes", () => {
  it("has 15 entries — 16 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.monkStyleStrikes)).toHaveLength(15);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.monkStyleStrikes.not_found).toBeUndefined();
  });

  it("a known entry (Break) has the expected fields — this subsystem file carries no nameSuffix/category/level at all", () => {
    const strike = ref.monkStyleStrikes.break!;
    expect(strike.name).toBe("Break");
    expect(strike.description).toContain("grapple");
    expect(strike.sources).toEqual([{ id: "martial-arts-handbook", pages: "7" }]);
  });

  it("resolves ‹…› cross-refs between entries to plain display text", () => {
    for (const strike of Object.values(ref.monkStyleStrikes)) {
      expect(strike.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, strike] of Object.entries(ref.monkStyleStrikes)) {
      expect(strike.id).toBe(key);
      expect(strike.uuid).toBe(`pfdata:monk-style-strike:${key}`);
    }
  });

  it("meta records a hash for monk-style-strikes.json and the collection count", () => {
    expect(ref.meta.hashes["monk-style-strikes.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.monkStyleStrikes).toBe(15);
  });
});
