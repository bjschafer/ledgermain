import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  ALCHEMIST_DISCOVERIES,
  ALCHEMIST_DISCOVERY_IDS,
  mergedAlchemistDiscoveryCatalog,
  resolveAlchemistDiscovery,
} from "../src/index.js";

/**
 * Coverage for the alchemist-discovery vendored-catalog overlay (issue #74
 * Phase 3c) — mirrors `ragePowerCatalog.test.ts`'s pattern. See
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
      expect(entry!.displayOnly).toBe(true);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(41);
  });

  it("a vendored-only entry (no hand-authored counterpart) resolves display-only with its own id + prose + category", () => {
    const entry = byId.get("dread_bomb")!;
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
