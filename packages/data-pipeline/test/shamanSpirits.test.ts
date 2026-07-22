import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored shaman-spirit catalog (issue #74
 * Phase 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.shamanSpirits", () => {
  it("has 18 entries — 19 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.shamanSpirits)).toHaveLength(18);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.shamanSpirits.not_found).toBeUndefined();
  });

  it("includes all 8 Advanced Class Guide core spirits the hand-authored engine table covers", () => {
    for (const tag of ["battle", "bones", "flame", "heavens", "life", "nature", "stone", "waves"]) {
      expect(ref.shamanSpirits[tag]?.name).toBeDefined();
    }
  });

  it("flattens the source's blockquoted hex/ability menu into plain paragraphs, dropping leading '>' markers", () => {
    const ancestors = ref.shamanSpirits.ancestors!;
    expect(ancestors.name).toBe("Ancestors");
    expect(ancestors.description).not.toMatch(/&gt;/);
    expect(ancestors.description).toContain("Ancestral Blessing");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const spirit of Object.values(ref.shamanSpirits)) {
      expect(spirit.description ?? "").not.toMatch(/[‹›«»]/);
      expect(spirit.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, spirit] of Object.entries(ref.shamanSpirits)) {
      expect(spirit.id).toBe(key);
      expect(spirit.uuid).toBe(`pfdata:shaman-spirit:${key}`);
    }
  });

  it("meta records a hash for shaman-spirits.json and the collection count", () => {
    expect(ref.meta.hashes["shaman-spirits.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.shamanSpirits).toBe(18);
  });
});
