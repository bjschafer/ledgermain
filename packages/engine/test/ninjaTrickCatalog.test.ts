import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedNinjaTrickCatalog,
  NINJA_TRICK_IDS,
  NINJA_TRICKS,
  resolveNinjaTrick,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3b) — mirrors
 * `ragePowerCatalog.test.ts`. Of the 44 hand-authored entries, 43 matched a
 * vendored entry by name; `advancedTalents` ("Advanced Talents") needed an
 * alias to match the vendored "Advanced Talent" (singular).
 */
const ref = loadRefData();

describe("mergedNinjaTrickCatalog", () => {
  const merged = mergedNinjaTrickCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every hand-authored entry matched (via alias where needed)", () => {
    const vendoredCount = Object.keys(ref.ninjaTricks).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("every hand-authored entry matched a vendored entry by name and kept its own id + mechanics", () => {
    for (const id of NINJA_TRICK_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(NINJA_TRICKS[id]!.changes);
      expect(entry!.tier).toBe(NINJA_TRICKS[id]!.tier);
      expect(entry!.description).toBeDefined();
    }
  });

  it("resolves the 'Advanced Talents' / 'Advanced Talent' naming drift via alias", () => {
    const entry = byId.get("advancedTalents")!;
    expect(entry.description).toContain("Advanced Talents");
  });

  it("a vendored-only entry (no hand-authored counterpart) resolves display-only, with tier derived from its category prefix", () => {
    const trick = byId.get("arcane_backfire")!;
    expect(trick.displayOnly).toBe(true);
    expect(trick.changes).toEqual([]);
    expect(trick.tier).toBe("trick");
    expect(trick.minLevel).toBe(2);

    const master = byId.get("deep_cover")!;
    expect(master.tier).toBe("master");
    expect(master.minLevel).toBe(10);
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveNinjaTrick", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const trick = resolveNinjaTrick("smokeBomb", ref);
    expect(trick).toBe(NINJA_TRICKS.smokeBomb);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const trick = resolveNinjaTrick("arcane_backfire", ref);
    expect(trick?.displayOnly).toBe(true);
    expect(trick?.name).toBe("Arcane Backfire");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveNinjaTrick("not-a-real-trick", ref)).toBeUndefined();
  });
});
