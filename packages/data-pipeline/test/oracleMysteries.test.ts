import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored oracle-mystery catalog (issue #74
 * Phase 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`. `pfdata.test.ts` covers the generic reader in
 * isolation.
 */
const ref = loadRefData();

describe("RefData.oracleMysteries", () => {
  it("has 34 entries — 35 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.oracleMysteries)).toHaveLength(34);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.oracleMysteries.not_found).toBeUndefined();
  });

  it("includes all 10 Advanced Player's Guide core mysteries the hand-authored engine table covers", () => {
    for (const tag of [
      "battle",
      "bones",
      "flame",
      "heavens",
      "life",
      "lore",
      "nature",
      "stone",
      "waves",
      "wind",
    ]) {
      expect(ref.oracleMysteries[tag]?.name).toBeDefined();
    }
  });

  it("strips the entry's own leading '## Name'/SOURCE header lines from the rendered description", () => {
    const ancestor = ref.oracleMysteries.ancestor!;
    expect(ancestor.name).toBe("Ancestor");
    expect(ancestor.description).not.toMatch(/^<p>##/);
    expect(ancestor.description).not.toContain("SOURCE Ultimate Magic");
    expect(ancestor.description).toContain("Deities");
  });

  it("renders the inline '### Revelations'/'### Final Revelation' section dividers as bold paragraphs, not literal '###' text", () => {
    const ancestor = ref.oracleMysteries.ancestor!;
    expect(ancestor.description).toContain("<strong>Revelations</strong>");
    expect(ancestor.description).toContain("<strong>Final Revelation</strong>");
    expect(ancestor.description).not.toMatch(/###/);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const mystery of Object.values(ref.oracleMysteries)) {
      expect(mystery.description ?? "").not.toMatch(/[‹›«»]/);
      expect(mystery.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, mystery] of Object.entries(ref.oracleMysteries)) {
      expect(mystery.id).toBe(key);
      expect(mystery.uuid).toBe(`pfdata:oracle-mystery:${key}`);
    }
  });

  it("meta records a hash for oracle-mysteries.json and the collection count", () => {
    expect(ref.meta.hashes["oracle-mysteries.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.oracleMysteries).toBe(34);
  });
});
