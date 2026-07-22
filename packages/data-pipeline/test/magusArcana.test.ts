import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored magus-arcana catalog (issue #74 Phase
 * 3b) against the real pinned Pf Data 1e slice — mirrors `ragePowers.test.ts`
 * exactly. `pfdata.test.ts` covers the generic reader in isolation.
 */
const ref = loadRefData();

describe("RefData.magusArcana", () => {
  it("has 64 entries — 66 raw dictionary keys minus the 'not_found' sentinel and 1 redirect alias", () => {
    expect(Object.keys(ref.magusArcana)).toHaveLength(64);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.magusArcana.not_found).toBeUndefined();
    // Greater Arcane Redoubt redirects to arcane_redoubt_greater.
    expect(ref.magusArcana.greater_arcane_redoubt).toBeUndefined();
    expect(ref.magusArcana.arcane_redoubt_greater).toBeDefined();
  });

  it("a known entry (Pool Strike) has the expected fields, with the description's own leading bold name header parsed into nameSuffix and stripped from the prose", () => {
    const arcana = ref.magusArcana.pool_strike!;
    expect(arcana.name).toBe("Pool Strike");
    expect(arcana.nameSuffix).toBe("(Su)");
    expect(arcana.description).toContain("arcane pool");
    expect(arcana.description).not.toContain("**");
    expect(arcana.description).not.toMatch(/^<p>Pool Strike/);
    expect(arcana.sources).toEqual([{ id: "ultimate-magic" }]);
  });

  it("this source has no top-level nameSuffix field of its own — every entry's suffix is parsed from its description's bold header", () => {
    // Flamboyant Arcana, Pool Ray, Ranger Trap, Reach Magic, Throwing Magus, and
    // Vision-Clouding Strike are the only entries with NO (Ex/Su/Sp) suffix at
    // all in the source prose — confirms the parser doesn't fabricate one.
    expect(ref.magusArcana.flamboyant_arcana!.nameSuffix).toBeUndefined();
    expect(ref.magusArcana.pool_ray!.nameSuffix).toBeUndefined();
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const arcana of Object.values(ref.magusArcana)) {
      expect(arcana.description ?? "").not.toMatch(/[‹›«»]/);
      expect(arcana.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, arcana] of Object.entries(ref.magusArcana)) {
      expect(arcana.id).toBe(key);
      expect(arcana.uuid).toBe(`pfdata:magus-arcana:${key}`);
    }
  });

  it("meta records a hash for magus-arcana.json and the collection count", () => {
    expect(ref.meta.hashes["magus-arcana.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.magusArcana).toBe(64);
  });
});
