import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored warpriest blessing catalog against the
 * real pinned Pf Data 1e slice — mirrors `eidolonSubtypes.test.ts`.
 * `warpriestBlessings.test.ts`-adjacent unit coverage for the power/deity
 * line parsers themselves lives in `warpriestBlessingsParse.test.ts`.
 */
const ref = loadRefData();

describe("RefData.blessings", () => {
  it("has 42 entries — 48 raw dictionary keys minus 'not_found' and its five redirects", () => {
    expect(Object.keys(ref.blessings)).toHaveLength(42);
  });

  it("never includes the dataset's own junk keys or redirect aliases", () => {
    expect(ref.blessings.not_found).toBeUndefined();
    for (const alias of ["cooperation", "resurrection", "restoration", "freedom", "martyr"]) {
      expect(ref.blessings[alias]).toBeUndefined();
    }
  });

  it("every entry has a stable slug id, synthetic uuid, and non-empty minor/major prose", () => {
    for (const [key, blessing] of Object.entries(ref.blessings)) {
      expect(blessing.id).toBe(key);
      expect(blessing.uuid).toBe(`pfdata:blessing:${key}`);
      expect(blessing.minorPower.name.length).toBeGreaterThan(0);
      expect(blessing.minorPower.description).toContain("<p>");
      expect(blessing.majorPower.name.length).toBeGreaterThan(0);
      expect(blessing.majorPower.description).toContain("<p>");
    }
  });

  it("no emitted description or power prose retains the dataset's cross-ref or directive syntax", () => {
    for (const blessing of Object.values(ref.blessings)) {
      expect(blessing.description ?? "").not.toMatch(/[‹›«»]/);
      expect(blessing.minorPower.description).not.toMatch(/[‹›«»]/);
      expect(blessing.majorPower.description).not.toMatch(/[‹›«»]/);
    }
  });

  it("a known entry (Air) has the expected fields, cited from ACG p.63", () => {
    const air = ref.blessings.air!;
    expect(air.name).toBe("Air");
    expect(air.deities).toEqual(["Gozreh", "Shelyn"]);
    expect(air.sources).toEqual([{ id: "advanced-class-guide" }]);
    expect(air.minorPower.name).toBe("Zephyr's Gift");
    expect(air.minorPower.description).toContain("no penalties due to range");
    expect(air.majorPower.name).toBe("Soaring Assault");
    expect(air.majorPower.description).toContain("fly speed of 60 feet");
  });

  it("leaves `deities` undefined for the four conditional-rule entries with no named deity list", () => {
    for (const tag of ["earthquake", "flood", "tornado", "wildfire"]) {
      expect(ref.blessings[tag]?.deities).toBeUndefined();
    }
  });

  it("splits a splatbook-variant entry's base minor/major power from its replacement subsection", () => {
    // Community's Healer's Handbook variant (Cooperation) replaces the base
    // blessing's MINOR power — minorPower must stay the ACG original
    // (Communal Aid), not the variant (Team Effort), while both texts
    // survive in the full `description`.
    const community = ref.blessings.community!;
    expect(community.minorPower.name).toBe("Communal Aid");
    expect(community.majorPower.name).toBe("Fight as One");
    expect(community.description).toContain("Team Effort");
  });

  it("registers each blessing's minor/major power as its own classFeatures stub", () => {
    for (const blessing of Object.values(ref.blessings)) {
      const minor = ref.classFeatures[blessing.minorPower.featureId];
      const major = ref.classFeatures[blessing.majorPower.featureId];
      expect(minor?.name).toBe(blessing.minorPower.name);
      expect(minor?.description).toBe(blessing.minorPower.description);
      expect(major?.name).toBe(blessing.majorPower.name);
      expect(major?.description).toBe(blessing.majorPower.description);
    }
  });

  it("meta records a hash for blessings.json and the collection count", () => {
    expect(ref.meta.hashes["blessings.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.blessings).toBe(42);
  });
});
