import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored ninja-trick catalog (issue #74 Phase
 * 3b) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts` exactly.
 */
const ref = loadRefData();

describe("RefData.ninjaTricks", () => {
  it("has 65 entries — 66 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.ninjaTricks)).toHaveLength(65);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.ninjaTricks.not_found).toBeUndefined();
  });

  it("a known entry (Acrobatic Master) has the expected fields", () => {
    const trick = ref.ninjaTricks.acrobatic_master!;
    expect(trick.name).toBe("Acrobatic Master");
    expect(trick.nameSuffix).toBe("(Su)");
    expect(trick.description).toContain("Acrobatics");
  });

  it("tags the 10th-level master-trick tier via a `Master ` category prefix", () => {
    expect(ref.ninjaTricks.advanced_talent!.category).toBe("Master Other Tricks");
    expect(ref.ninjaTricks.acrobatic_master!.category).not.toMatch(/^Master /);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const trick of Object.values(ref.ninjaTricks)) {
      expect(trick.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, trick] of Object.entries(ref.ninjaTricks)) {
      expect(trick.id).toBe(key);
      expect(trick.uuid).toBe(`pfdata:ninja-trick:${key}`);
    }
  });

  it("meta records a hash for ninja-tricks.json and the collection count", () => {
    expect(ref.meta.hashes["ninja-tricks.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.ninjaTricks).toBe(65);
  });
});
