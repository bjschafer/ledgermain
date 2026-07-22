import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored mesmerist-bold-stare catalog (issue
 * #74 Phase 3c) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.mesmeristBoldStares", () => {
  it("has 24 entries — 25 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.mesmeristBoldStares)).toHaveLength(24);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.mesmeristBoldStares.not_found).toBeUndefined();
  });

  it("a known entry (Allure) has the expected fields", () => {
    const stare = ref.mesmeristBoldStares.allure!;
    expect(stare.name).toBe("Allure");
    expect(stare.description).toContain("hypnotic stare");
    expect(stare.sources).toEqual([{ id: "occult-adventures", pages: "42" }]);
  });

  it("carries the themed Devilbane sub-chain (Occult Origins) as ordinary entries", () => {
    expect(ref.mesmeristBoldStares.devilbane_binding!.name).toBe("Devilbane Binding");
    expect(ref.mesmeristBoldStares.devilbane_withering!.name).toBe("Devilbane Withering");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const stare of Object.values(ref.mesmeristBoldStares)) {
      expect(stare.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, stare] of Object.entries(ref.mesmeristBoldStares)) {
      expect(stare.id).toBe(key);
      expect(stare.uuid).toBe(`pfdata:mesmerist-bold-stare:${key}`);
    }
  });

  it("meta records a hash for mesmerist-bold-stares.json and the collection count", () => {
    expect(ref.meta.hashes["mesmerist-bold-stares.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.mesmeristBoldStares).toBe(24);
  });
});
