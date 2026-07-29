import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  ALCHEMIST_DISCOVERIES,
  ALCHEMIST_DISCOVERY_IDS,
  mergedAlchemistDiscoveryCatalog,
  resolveAlchemistDiscovery,
} from "../src/index.js";

/**
 * Coverage for the alchemist-discovery vendored-catalog overlay (issue #74) — mirrors
 * `ragePowerCatalog.test.ts`'s pattern. See
 * `alchemist-discoveries.ts`'s "vendored catalog overlay" doc comment for
 * the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedAlchemistDiscoveryCatalog", () => {
  const merged = mergedAlchemistDiscoveryCatalog(ref);
  const byId = new Map(merged.map((d) => [d.id, d]));

  it("has exactly one row per vendored entry — every hand-authored entry matched, no orphan to append", () => {
    expect(merged).toHaveLength(Object.keys(ref.alchemistDiscoveries).length);
  });

  it("all 41 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of ALCHEMIST_DISCOVERY_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(ALCHEMIST_DISCOVERIES[id]!.changes);
      // Cognatogen is the one modeled entry (toggleable buffs, see
      // `cognatogen.ts`) — the merge must carry that through, not flatten it.
      expect(entry!.displayOnly).toBe(ALCHEMIST_DISCOVERIES[id]!.displayOnly);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(168);
  });

  it("no vendored-only discoveries remain — the fallback path only exists for a future data bump", () => {
    // Full hand-table parity as of the #74 Phase 5 extension.
    for (const entry of merged) {
      expect(ALCHEMIST_DISCOVERIES[entry.id], entry.id).toBeDefined();
    }
  });

  it("a hand-authored entry carries the vendored prose + category for display", () => {
    const entry = byId.get("dreadBomb")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
    expect(entry.category).toBe("Primary Bomb Discoveries");
    expect(entry.description).toBeDefined();
    expect(ALCHEMIST_DISCOVERIES.dread_bomb).toBeUndefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveAlchemistDiscovery", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const discovery = resolveAlchemistDiscovery("acidBomb", ref);
    expect(discovery).toBe(ALCHEMIST_DISCOVERIES.acidBomb);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const discovery = resolveAlchemistDiscovery("dread_bomb", ref);
    expect(discovery?.displayOnly).toBe(true);
    expect(discovery?.name).toBe("Dread Bomb");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveAlchemistDiscovery("not-a-real-discovery", ref)).toBeUndefined();
  });
});
