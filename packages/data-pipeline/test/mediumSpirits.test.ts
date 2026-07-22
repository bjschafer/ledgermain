import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored Medium legendary-spirit catalog
 * (issue #74 Phase 3c) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.mediumSpirits", () => {
  it("has 40 entries — 41 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.mediumSpirits)).toHaveLength(40);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.mediumSpirits.not_found).toBeUndefined();
  });

  it("includes all 6 core Occult Adventures legendary spirits the hand-authored table covers", () => {
    for (const tag of ["archmage", "champion", "guardian", "hierophant", "marshal", "trickster"]) {
      expect(ref.mediumSpirits[tag]).toBeDefined();
    }
  });

  it("strips the markdown header + SOURCE line from the rendered description", () => {
    const archmage = ref.mediumSpirits.archmage!;
    expect(archmage.description).not.toContain("## Archmage");
    expect(archmage.description).not.toMatch(/SOURCE/);
    expect(archmage.description).toContain("Spirit Bonus");
  });

  it("is a DIFFERENT file than the sibling shaman-spirit catalog (no shaman spirits leak in)", () => {
    // Battle/Bones/Flame/Heavens/... are shaman spirits (RefData.shamanHexes'
    // neighbor catalog), never Medium legendary spirits.
    expect(ref.mediumSpirits.battle).toBeUndefined();
    expect(ref.mediumSpirits.bones).toBeUndefined();
  });

  it("also carries outsider-type and named-historical legendary spirits with no hand-authored counterpart", () => {
    expect(ref.mediumSpirits.aeon!.name).toBe("Aeon");
    expect(ref.mediumSpirits.abrogail_thrune_i!.name).toBe("Abrogail Thrune I");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const s of Object.values(ref.mediumSpirits)) {
      expect(s.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, s] of Object.entries(ref.mediumSpirits)) {
      expect(s.id).toBe(key);
      expect(s.uuid).toBe(`pfdata:medium-spirit:${key}`);
    }
  });

  it("meta records a hash for medium-spirits.json and the collection count", () => {
    expect(ref.meta.hashes["medium-spirits.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.mediumSpirits).toBe(40);
  });
});
