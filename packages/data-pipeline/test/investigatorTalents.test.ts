import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored investigator-talent catalog (issue
 * #74 Phase 3b) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`'s pattern (this subsystem file's dictionary shape is
 * identical to rage powers').
 */
const ref = loadRefData();

describe("RefData.investigatorTalents", () => {
  it("has 67 entries — 68 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.investigatorTalents)).toHaveLength(67);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.investigatorTalents.not_found).toBeUndefined();
  });

  it("a known entry (Blinding Strike) has the expected fields", () => {
    const talent = ref.investigatorTalents.blinding_strike!;
    expect(talent.name).toBe("Blinding Strike");
    expect(talent.nameSuffix).toBe("(Ex)");
    expect(talent.category).toBe("Studied Strike Talents");
    expect(talent.description).toContain("Fortitude");
    expect(talent.sources).toEqual([{ id: "advanced-class-guide", pages: "32" }]);
  });

  it("carries the source's raw `level` field uninterpreted (NOT an investigator-level gate) — every entry that has it carries 1", () => {
    expect(ref.investigatorTalents.greater_combat_inspiration!.level).toBe(1);
    // Most entries carry no `level` at all.
    expect(ref.investigatorTalents.blinding_strike!.level).toBeUndefined();
    for (const talent of Object.values(ref.investigatorTalents)) {
      if (talent.level !== undefined) expect(talent.level).toBe(1);
    }
  });

  it("resolves ‹…› cross-refs to plain display text", () => {
    const talent = ref.investigatorTalents.blinding_strike!;
    expect(talent.description).toContain("dazzled");
    expect(talent.description).not.toMatch(/[‹›]/);
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, talent] of Object.entries(ref.investigatorTalents)) {
      expect(talent.id).toBe(key);
      expect(talent.uuid).toBe(`pfdata:investigator-talent:${key}`);
    }
  });

  it("meta records a hash for investigator-talents.json and the collection count", () => {
    expect(ref.meta.hashes["investigator-talents.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.investigatorTalents).toBe(67);
  });
});
