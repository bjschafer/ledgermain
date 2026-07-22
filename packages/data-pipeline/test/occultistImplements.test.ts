import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored occultist-implement catalog (issue
 * #74 Phase 3c) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.occultistImplements", () => {
  it("has 12 entries — 13 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.occultistImplements)).toHaveLength(12);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.occultistImplements.not_found).toBeUndefined();
  });

  it("includes all 8 core Occult Adventures schools the hand-authored table covers", () => {
    for (const tag of [
      "abjuration",
      "conjuration",
      "divination",
      "enchantment",
      "evocation",
      "illusion",
      "necromancy",
      "transmutation",
    ]) {
      expect(ref.occultistImplements[tag]).toBeDefined();
    }
  });

  it("strips the markdown header + SOURCE line from the rendered description", () => {
    const abj = ref.occultistImplements.abjuration!;
    expect(abj.description).not.toContain("## Abjuration");
    expect(abj.description).not.toMatch(/SOURCE/);
    expect(abj.description).toContain("Implements");
  });

  it("also carries the Psychic Anthology Panoply variant schools with no hand-authored counterpart", () => {
    expect(ref.occultistImplements.mages_paraphernalia!.name).toBe(
      "Mage's Paraphernalia (Panoply)",
    );
    expect(ref.occultistImplements.trappings_of_the_warrior).toBeDefined();
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const s of Object.values(ref.occultistImplements)) {
      expect(s.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, s] of Object.entries(ref.occultistImplements)) {
      expect(s.id).toBe(key);
      expect(s.uuid).toBe(`pfdata:occultist-implement:${key}`);
    }
  });

  it("meta records a hash for occultist-implements.json and the collection count", () => {
    expect(ref.meta.hashes["occultist-implements.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.occultistImplements).toBe(12);
  });
});
