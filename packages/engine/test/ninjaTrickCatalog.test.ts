import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedNinjaTrickCatalog,
  NINJA_TRICK_IDS,
  NINJA_TRICKS,
  resolveNinjaTrick,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — mirrors
 * `witchHexCatalog.test.ts` exactly. The table reached full vendored parity in
 * a later follow-up (44 -> 65 entries); all 65 matched a vendored entry by
 * name, `advancedTalents` ("Advanced Talents") via the alias to the vendored
 * "Advanced Talent" (singular).
 */
const ref = loadRefData();

describe("mergedNinjaTrickCatalog", () => {
  const merged = mergedNinjaTrickCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — all 65 hand-authored entries matched", () => {
    const vendoredCount = Object.keys(ref.ninjaTricks).length;
    expect(vendoredCount).toBe(65);
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 65 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of NINJA_TRICK_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(NINJA_TRICKS[id]!.changes);
      expect(entry!.displayOnly).toBe(NINJA_TRICKS[id]!.displayOnly);
      expect(entry!.tier).toBe(NINJA_TRICKS[id]!.tier);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(65);
  });

  it("resolves the 'Advanced Talents' / 'Advanced Talent' naming drift via alias", () => {
    const entry = byId.get("advancedTalents")!;
    expect(entry.description).toContain("Advanced Talents");
  });

  it("no vendored-only tricks remain — the fallback path only exists for a future data bump", () => {
    // Full hand-table parity as of a later follow-up.
    for (const entry of merged) {
      expect(NINJA_TRICKS[entry.id], entry.id).toBeDefined();
    }
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

  it("falls back to the vendored catalog when looked up by the vendored snake_case id (hand-authored ids are always camelCase, so this id is never a direct hit in NINJA_TRICKS)", () => {
    // Confirms the fallback path still resolves a real (display-only)
    // definition for a future data bump this hand table hasn't caught up
    // to yet — even though `arcaneBackfire` (this trick's hand-authored id)
    // now carries the real mechanics, matched into the picker catalog by
    // name rather than by id.
    const trick = resolveNinjaTrick("arcane_backfire", ref);
    expect(trick?.displayOnly).toBe(true);
    expect(trick?.name).toBe("Arcane Backfire");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveNinjaTrick("not-a-real-trick", ref)).toBeUndefined();
  });
});
