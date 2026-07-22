import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedPhrenicAmplificationCatalog,
  PHRENIC_AMPLIFICATION_IDS,
  PHRENIC_AMPLIFICATIONS,
  resolvePhrenicAmplification,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `phrenic-amplifications.ts`'s "vendored catalog overlay" section doc
 * comment for the collision-audit narrative this asserts against: a clean
 * 1:1 match, the only subsystem in this wave with zero vendored-only rows.
 */
const ref = loadRefData();

describe("mergedPhrenicAmplificationCatalog", () => {
  const merged = mergedPhrenicAmplificationCatalog(ref);
  const byId = new Map(merged.map((a) => [a.id, a]));

  it("has exactly one row per vendored entry — a clean 1:1 match with the hand-authored table", () => {
    expect(merged).toHaveLength(Object.keys(ref.phrenicAmplifications).length);
    expect(merged).toHaveLength(PHRENIC_AMPLIFICATION_IDS.length);
  });

  it("every hand-authored entry matched a vendored entry by name and kept its own id + mechanics", () => {
    for (const id of PHRENIC_AMPLIFICATION_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.tier).toBe(PHRENIC_AMPLIFICATIONS[id]!.tier);
      expect(entry!.costLabel).toBe(PHRENIC_AMPLIFICATIONS[id]!.costLabel);
      expect(entry!.description).toBeDefined();
    }
  });

  it("Space-Rending Spell matches despite the source's case-only 'Space-rending Spell' spelling", () => {
    const entry = byId.get("spaceRendingSpell")!;
    expect(entry.description).toBeDefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolvePhrenicAmplification", () => {
  it("prefers the hand-authored table for a matched id", () => {
    expect(resolvePhrenicAmplification("biokineticHealing", ref)).toBe(
      PHRENIC_AMPLIFICATIONS.biokineticHealing,
    );
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolvePhrenicAmplification("not-a-real-amp", ref)).toBeUndefined();
  });
});
