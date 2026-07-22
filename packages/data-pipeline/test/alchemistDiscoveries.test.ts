import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored alchemist-discovery catalog (issue
 * #74 Phase 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`. `pfdata.test.ts` covers the generic reader in
 * isolation.
 */
const ref = loadRefData();

describe("RefData.alchemistDiscoveries", () => {
  it("has 168 entries — 169 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.alchemistDiscoveries)).toHaveLength(168);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.alchemistDiscoveries.not_found).toBeUndefined();
  });

  it("a known entry (Acid Bomb) has the expected fields", () => {
    const discovery = ref.alchemistDiscoveries.acid_bomb!;
    expect(discovery.name).toBe("Acid Bomb");
    expect(discovery.category).toBe("Primary Bomb Discoveries");
    expect(discovery.description).toContain("acid damage");
    expect(discovery.sources).toEqual([{ id: "advanced-player-s-guide" }]);
    expect(discovery.nameSuffix).toBeUndefined();
  });

  it("carries the source's raw `level` field uninterpreted, same trap as RagePower.level", () => {
    // Several discoveries carry `level: 1` despite no stated character-level
    // minimum in the published rules — a within-source tier marker, not a
    // gate (see AlchemistDiscovery.level's doc comment).
    expect(ref.alchemistDiscoveries.dread_bomb!.level).toBe(1);
    expect(ref.alchemistDiscoveries.acid_bomb!.level).toBeUndefined();
  });

  it("resolves ‹…› cross-refs between entries to plain display text", () => {
    for (const discovery of Object.values(ref.alchemistDiscoveries)) {
      expect(discovery.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, discovery] of Object.entries(ref.alchemistDiscoveries)) {
      expect(discovery.id).toBe(key);
      expect(discovery.uuid).toBe(`pfdata:alchemist-discovery:${key}`);
    }
  });

  it("meta records a hash for alchemist-discoveries.json and the collection count", () => {
    expect(ref.meta.hashes["alchemist-discoveries.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.alchemistDiscoveries).toBe(168);
  });
});
