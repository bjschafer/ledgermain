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
 * #74) — mirrors `witchHexCatalog.test.ts`'s full-parity pattern.
 */
const ref = loadRefData();

describe("mergedMonkKiPowerCatalog", () => {
  const merged = mergedMonkKiPowerCatalog(ref);
  const byId = new Map(merged.map((p) => [p.id, p]));

  it("has exactly one row per vendored entry — all 44 hand-authored entries matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.monkKiPowers).length);
    expect(merged).toHaveLength(44);
  });

  it("all 44 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of MONK_KI_POWER_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(MONK_KI_POWERS[id]!.changes);
      expect(entry!.displayOnly).toBe(true);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(44);
  });

  it("no vendored-only ki powers remain — the fallback path only exists for a future data bump", () => {
    for (const entry of merged) {
      expect(MONK_KI_POWERS[entry.id], entry.id).toBeDefined();
    }
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

  it("resolves a formerly vendored-only power (now hand-authored, issue #74) via the hand table", () => {
    const power = resolveMonkKiPower("qinggongPower", ref);
    expect(power).toBe(MONK_KI_POWERS.qinggongPower);
    expect(power?.displayOnly).toBe(true);
    expect(power?.name).toBe("Qinggong Power");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMonkKiPower("not-a-real-power", ref)).toBeUndefined();
  });
});
