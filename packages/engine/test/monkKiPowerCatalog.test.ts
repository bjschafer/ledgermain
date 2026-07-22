import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MONK_KI_POWER_IDS,
  MONK_KI_POWERS,
  mergedMonkKiPowerCatalog,
  resolveMonkKiPower,
} from "../src/index.js";

/**
 * Coverage for the Monk (Unchained) ki-power vendored-catalog overlay (issue
 * #74 Phase 3c) — mirrors `ragePowerCatalog.test.ts`'s pattern.
 */
const ref = loadRefData();

describe("mergedMonkKiPowerCatalog", () => {
  const merged = mergedMonkKiPowerCatalog(ref);
  const byId = new Map(merged.map((p) => [p.id, p]));

  it("has exactly one row per vendored entry — every hand-authored entry matched, no orphan to append", () => {
    expect(merged).toHaveLength(Object.keys(ref.monkKiPowers).length);
  });

  it("all 39 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of MONK_KI_POWER_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(MONK_KI_POWERS[id]!.changes);
      expect(entry!.displayOnly).toBe(true);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(39);
  });

  it("a vendored-only entry (a splatbook power outside the Pathfinder Unchained core book, no hand-authored counterpart) resolves display-only", () => {
    const entry = byId.get("qinggong_power")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
    expect(entry.description).toBeDefined();
    expect(MONK_KI_POWERS.qinggong_power).toBeUndefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveMonkKiPower", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const power = resolveMonkKiPower("abundantStep", ref);
    expect(power).toBe(MONK_KI_POWERS.abundantStep);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const power = resolveMonkKiPower("qinggong_power", ref);
    expect(power?.displayOnly).toBe(true);
    expect(power?.name).toBe("Qinggong Power");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMonkKiPower("not-a-real-power", ref)).toBeUndefined();
  });
});
