import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored unchained-summoner eidolon-subtype
 * catalog against the real pinned Pf Data 1e slice — mirrors
 * `witchHexes.test.ts`. `pfdata.test.ts` covers the generic reader in
 * isolation.
 */
const ref = loadRefData();

describe("RefData.eidolonSubtypes", () => {
  it("has 26 entries — 27 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.eidolonSubtypes)).toHaveLength(26);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.eidolonSubtypes.not_found).toBeUndefined();
  });

  it("a known entry (Aberrant) has the expected fields", () => {
    const subtype = ref.eidolonSubtypes.aberrant!;
    expect(subtype.name).toBe("Aberrant");
    expect(subtype.description).toContain("Base Form");
    expect(subtype.sources).toEqual([{ id: "horror-realms", pages: "18" }]);
  });

  it("includes the 11 core outsider subtypes the engine's hand-authored EIDOLON_SUBTYPES table also models", () => {
    for (const tag of [
      "agathion",
      "angel",
      "archon",
      "azata",
      "daemon",
      "demon",
      "devil",
      "div",
      "inevitable",
      "protean",
      "psychopomp",
    ]) {
      expect(ref.eidolonSubtypes[tag]?.name).toBeDefined();
    }
  });

  it("includes later-splatbook subtypes the engine doesn't model", () => {
    for (const tag of [
      "aberrant",
      "aeon",
      "ancestor",
      "astral",
      "deepwater",
      "genie",
      "kami",
      "kyton",
      "plant",
      "radiant",
      "shadow",
      "storykin",
      "twinned",
      "void",
    ]) {
      expect(ref.eidolonSubtypes[tag]?.name).toBeDefined();
    }
  });

  it("resolves ‹family/…›/‹unchevolution/…› cross-refs between entries to plain display text", () => {
    const subtype = ref.eidolonSubtypes.angel!;
    expect(subtype.description).toContain("angel");
    expect(subtype.description).not.toMatch(/[‹›]/);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const subtype of Object.values(ref.eidolonSubtypes)) {
      expect(subtype.description ?? "").not.toMatch(/[‹›«»]/);
      expect(subtype.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, subtype] of Object.entries(ref.eidolonSubtypes)) {
      expect(subtype.id).toBe(key);
      expect(subtype.uuid).toBe(`pfdata:eidolon-subtype:${key}`);
    }
  });

  it("meta records a hash for eidolon-subtypes.json and the collection count", () => {
    expect(ref.meta.hashes["eidolon-subtypes.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.eidolonSubtypes).toBe(26);
  });
});
