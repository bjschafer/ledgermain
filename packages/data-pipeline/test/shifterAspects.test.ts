import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored shifter-aspect catalog (issue #74
 * Phase 3c) against the real pinned Pf Data 1e slice.
 */
const ref = loadRefData();

describe("RefData.shifterAspects", () => {
  it("has 30 entries — 31 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.shifterAspects)).toHaveLength(30);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.shifterAspects.not_found).toBeUndefined();
  });

  it("a known entry (Bat) has the expected fields — this subsystem file carries no nameSuffix/category/level at all", () => {
    const aspect = ref.shifterAspects.bat!;
    expect(aspect.name).toBe("Bat");
    expect(aspect.description).toContain("darkvision");
    expect(aspect.sources).toEqual([{ id: "ultimate-wilderness" }]);
  });

  it("resolves ‹…› cross-refs between entries to plain display text, and strips the redundant leading ## header + SOURCE citation lines", () => {
    for (const aspect of Object.values(ref.shifterAspects)) {
      expect(aspect.description ?? "").not.toMatch(/[‹›«»]/);
      expect(aspect.description ?? "").not.toMatch(/^##\s/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, aspect] of Object.entries(ref.shifterAspects)) {
      expect(aspect.id).toBe(key);
      expect(aspect.uuid).toBe(`pfdata:shifter-aspect:${key}`);
    }
  });

  it("meta records a hash for shifter-aspects.json and the collection count", () => {
    expect(ref.meta.hashes["shifter-aspects.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.shifterAspects).toBe(30);
  });
});
