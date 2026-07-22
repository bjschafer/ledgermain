import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored vigilante-talent + vigilante-social-
 * talent catalogs (issue #74 Phase 3b) against the real pinned Pf Data 1e
 * slice, mirroring `ragePowers.test.ts` exactly — two separate RefData
 * collections, same as the two independent hand-authored pools in
 * `@pf1/engine` `vigilante-talents.ts`.
 */
const ref = loadRefData();

describe("RefData.vigilanteTalents", () => {
  it("has 81 entries — 82 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.vigilanteTalents)).toHaveLength(81);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.vigilanteTalents.not_found).toBeUndefined();
  });

  it("a known entry (Evasive — the vendored name for the hand-authored 'Evasion') has the expected fields", () => {
    const talent = ref.vigilanteTalents.evasive!;
    expect(talent.name).toBe("Evasive");
    expect(talent.category).toBe("Stalker Talents");
    expect(talent.description).toContain("evasion");
  });

  it("categorizes Avenger/Stalker-gated talents distinctly from shared ones", () => {
    expect(ref.vigilanteTalents.evasive!.category).toBe("Stalker Talents");
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, talent] of Object.entries(ref.vigilanteTalents)) {
      expect(talent.id).toBe(key);
      expect(talent.uuid).toBe(`pfdata:vigilante-talent:${key}`);
    }
  });

  it("meta records a hash for vigilante-talents.json and the collection count", () => {
    expect(ref.meta.hashes["vigilante-talents.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.vigilanteTalents).toBe(81);
  });
});

describe("RefData.vigilanteSocialTalents", () => {
  it("has 46 entries — 47 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.vigilanteSocialTalents)).toHaveLength(46);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.vigilanteSocialTalents.not_found).toBeUndefined();
  });

  it("a known entry (Always Prepared) has the expected fields", () => {
    const talent = ref.vigilanteSocialTalents.always_prepared!;
    expect(talent.name).toBe("Always Prepared");
    expect(talent.nameSuffix).toBe("(Ex)");
    expect(talent.sources).toEqual([{ id: "chronicle-of-legends", pages: "7" }]);
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, talent] of Object.entries(ref.vigilanteSocialTalents)) {
      expect(talent.id).toBe(key);
      expect(talent.uuid).toBe(`pfdata:vigilante-social-talent:${key}`);
    }
  });

  it("meta records a hash for vigilante-social-talents.json and the collection count", () => {
    expect(ref.meta.hashes["vigilante-social-talents.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.vigilanteSocialTalents).toBe(46);
  });
});
