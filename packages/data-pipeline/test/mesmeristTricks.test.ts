import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored mesmerist-trick catalog (issue #74
 * Phase 3c) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.mesmeristTricks", () => {
  it("has 44 entries — 45 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.mesmeristTricks)).toHaveLength(44);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.mesmeristTricks.not_found).toBeUndefined();
  });

  it("a known entry (Astounding Avoidance) has the expected fields", () => {
    const trick = ref.mesmeristTricks.astounding_avoidance!;
    expect(trick.name).toBe("Astounding Avoidance");
    expect(trick.tier).toBe("trick");
    expect(trick.description).toContain("mesmerist");
  });

  it("tags the masterful-trick tier via the source's own category field", () => {
    expect(ref.mesmeristTricks.avian_escape!.tier).toBe("masterful");
    expect(ref.mesmeristTricks.astounding_avoidance!.tier).toBe("trick");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const trick of Object.values(ref.mesmeristTricks)) {
      expect(trick.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, trick] of Object.entries(ref.mesmeristTricks)) {
      expect(trick.id).toBe(key);
      expect(trick.uuid).toBe(`pfdata:mesmerist-trick:${key}`);
    }
  });

  it("meta records a hash for mesmerist-tricks.json and the collection count", () => {
    expect(ref.meta.hashes["mesmerist-tricks.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.mesmeristTricks).toBe(44);
  });
});
