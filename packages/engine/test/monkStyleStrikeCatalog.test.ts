import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MONK_STYLE_STRIKE_IDS,
  MONK_STYLE_STRIKES,
  mergedMonkStyleStrikeCatalog,
  resolveMonkStyleStrike,
} from "../src/index.js";

/**
 * Coverage for the Monk (Unchained) style-strike vendored-catalog overlay
 * (issue #74 Phase 3c) — mirrors `ragePowerCatalog.test.ts`'s pattern. This
 * catalog is the rare EXACT 1:1 match (15 hand-authored, 15 vendored, zero
 * orphan on either side) — see `monk-style-strikes.ts`'s doc comment.
 */
const ref = loadRefData();

describe("mergedMonkStyleStrikeCatalog", () => {
  const merged = mergedMonkStyleStrikeCatalog(ref);
  const byId = new Map(merged.map((s) => [s.id, s]));

  it("has exactly one row per vendored entry, an exact 1:1 match with the hand-authored table", () => {
    expect(merged).toHaveLength(Object.keys(ref.monkStyleStrikes).length);
    expect(merged).toHaveLength(MONK_STYLE_STRIKE_IDS.length);
  });

  it("every hand-authored entry matched a vendored entry by name and kept its own id + mechanics", () => {
    for (const id of MONK_STYLE_STRIKE_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(MONK_STYLE_STRIKES[id]!.changes);
      expect(entry!.displayOnly).toBe(true);
      expect(entry!.description).toBeDefined();
    }
  });

  it("every id is unique", () => {
    const ids = merged.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveMonkStyleStrike", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const strike = resolveMonkStyleStrike("break", ref);
    expect(strike).toBe(MONK_STYLE_STRIKES.break);
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMonkStyleStrike("not-a-real-strike", ref)).toBeUndefined();
  });
});
