import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored psychic-discipline catalog (issue #74
 * Phase 3c) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.psychicDisciplines", () => {
  it("has 23 entries — 24 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.psychicDisciplines)).toHaveLength(23);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.psychicDisciplines.not_found).toBeUndefined();
  });

  it("includes all 12 core Occult Adventures disciplines the hand-authored table covers", () => {
    for (const tag of [
      "abomination",
      "dream",
      "enlightenment",
      "faith",
      "ferocity",
      "haunted",
      "lore",
      "pageantry",
      "pain",
      "rebirth",
      "self_perfection",
      "tranquility",
    ]) {
      expect(ref.psychicDisciplines[tag]).toBeDefined();
    }
  });

  it("also carries splatbook-only disciplines with no hand-authored counterpart", () => {
    expect(ref.psychicDisciplines.mindtech!.name).toBe("Mindtech");
    expect(ref.psychicDisciplines.psychedelia).toBeDefined();
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const d of Object.values(ref.psychicDisciplines)) {
      expect(d.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, d] of Object.entries(ref.psychicDisciplines)) {
      expect(d.id).toBe(key);
      expect(d.uuid).toBe(`pfdata:psychic-discipline:${key}`);
    }
  });

  it("meta records a hash for psychic-disciplines.json and the collection count", () => {
    expect(ref.meta.hashes["psychic-disciplines.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.psychicDisciplines).toBe(23);
  });
});
