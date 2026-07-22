import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored Monk (Unchained) ki-power catalog
 * (issue #74 Phase 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.monkKiPowers", () => {
  it("has 44 entries — 45 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.monkKiPowers)).toHaveLength(44);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.monkKiPowers.not_found).toBeUndefined();
  });

  it("a known entry (Abundant Step) has the expected fields", () => {
    const power = ref.monkKiPowers.abundant_step!;
    expect(power.name).toBe("Abundant Step");
    expect(power.nameSuffix).toBe("(Su)");
    expect(power.description).toContain("dimension door");
    expect(power.sources).toEqual([{ id: "pathfinder-unchained", pages: "16" }]);
  });

  it("carries the source's raw `level` field uninterpreted — NOT a monk-level gate (see MonkKiPower.level's doc comment)", () => {
    // Cobra Breath/Ki Volley/Master-Thought Koan all carry `level: 1` despite
    // being 12th/16th/12th-level-minimum powers per the published rules.
    expect(ref.monkKiPowers.cobra_breath!.level).toBe(1);
    expect(ref.monkKiPowers.ki_volley!.level).toBe(1);
    expect(ref.monkKiPowers.master_thought_koan!.level).toBe(1);
    expect(ref.monkKiPowers.abundant_step!.level).toBeUndefined();
  });

  it("resolves ‹…› cross-refs between entries to plain display text", () => {
    for (const power of Object.values(ref.monkKiPowers)) {
      expect(power.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, power] of Object.entries(ref.monkKiPowers)) {
      expect(power.id).toBe(key);
      expect(power.uuid).toBe(`pfdata:monk-ki-power:${key}`);
    }
  });

  it("meta records a hash for monk-ki-powers.json and the collection count", () => {
    expect(ref.meta.hashes["monk-ki-powers.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.monkKiPowers).toBe(44);
  });
});
