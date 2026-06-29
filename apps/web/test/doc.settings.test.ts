/**
 * Unit tests for the Stage 1 additions to model/doc.ts:
 * HP mode, per-level rolls, FCB houserule, hero-point cap, stat overrides,
 * and favored-class bonus choice setter.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  setFavoredClassBonus,
  setFcbHouserule,
  setHeroPointsCap,
  setHpMode,
  setHpRoll,
  setStatOverride,
  STAT_OVERRIDE_KEYS,
} from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

// ---------------------------------------------------------------------------
// setHpMode
// ---------------------------------------------------------------------------
describe("setHpMode()", () => {
  it("stores the chosen mode", () => {
    expect(setHpMode(doc(), "max").build.settings?.hpMode).toBe("max");
    expect(setHpMode(doc(), "rolled").build.settings?.hpMode).toBe("rolled");
    expect(setHpMode(doc(), "average").build.settings?.hpMode).toBe("average");
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    setHpMode(d, "max");
    expect(d.build.settings?.hpMode).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setHpRoll
// ---------------------------------------------------------------------------
describe("setHpRoll()", () => {
  it("stores the roll at the given level index (1-based)", () => {
    const d = setHpRoll(doc(), 2, 7);
    expect(d.build.hpRolls?.[1]).toBe(7);
  });

  it("clamps value to 1..100", () => {
    expect(setHpRoll(doc(), 1, 0).build.hpRolls?.[0]).toBe(1);
    expect(setHpRoll(doc(), 1, 999).build.hpRolls?.[0]).toBe(100);
  });

  it("is a no-op for level < 1", () => {
    const d = doc();
    expect(setHpRoll(d, 0, 5)).toBe(d);
  });

  it("does not mutate the original", () => {
    const d = doc();
    setHpRoll(d, 1, 8);
    expect(d.build.hpRolls).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setFcbHouserule
// ---------------------------------------------------------------------------
describe("setFcbHouserule()", () => {
  it("enables the houserule", () => {
    expect(setFcbHouserule(doc(), true).build.settings?.fcbHouserule).toBe(true);
  });

  it("disables the houserule", () => {
    const d = setFcbHouserule(doc(), true);
    expect(setFcbHouserule(d, false).build.settings?.fcbHouserule).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setHeroPointsCap
// ---------------------------------------------------------------------------
describe("setHeroPointsCap()", () => {
  it("stores a valid positive cap", () => {
    expect(setHeroPointsCap(doc(), 5).build.settings?.heroPointsCap).toBe(5);
  });

  it("removes the key when passed null", () => {
    const d = setHeroPointsCap(doc(), 5);
    expect(setHeroPointsCap(d, null).build.settings?.heroPointsCap).toBeUndefined();
  });

  it("removes the key for zero or negative", () => {
    expect(setHeroPointsCap(doc(), 0).build.settings?.heroPointsCap).toBeUndefined();
    expect(setHeroPointsCap(doc(), -1).build.settings?.heroPointsCap).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setStatOverride
// ---------------------------------------------------------------------------
describe("setStatOverride()", () => {
  it("stores a numeric override for a valid key", () => {
    const d = setStatOverride(doc(), "hp.max", 100);
    expect(d.build.settings?.statOverrides?.["hp.max"]).toBe(100);
  });

  it("removes the override when passed null", () => {
    const d = setStatOverride(setStatOverride(doc(), "bab", 10), "bab", null);
    expect(d.build.settings?.statOverrides?.["bab"]).toBeUndefined();
  });

  it("multiple overrides coexist independently", () => {
    let d = setStatOverride(doc(), "hp.max", 50);
    d = setStatOverride(d, "bab", 8);
    expect(d.build.settings?.statOverrides?.["hp.max"]).toBe(50);
    expect(d.build.settings?.statOverrides?.["bab"]).toBe(8);
  });

  it("STAT_OVERRIDE_KEYS contains the expected bounded set", () => {
    expect(STAT_OVERRIDE_KEYS).toContain("hp.max");
    expect(STAT_OVERRIDE_KEYS).toContain("saves.fort.total");
    expect(STAT_OVERRIDE_KEYS).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// setFavoredClassBonus
// ---------------------------------------------------------------------------
describe("setFavoredClassBonus()", () => {
  it("sets the choice at the given 0-based index", () => {
    const d = setFavoredClassBonus(doc(), 0, "hp");
    expect(d.build.favoredClassBonus?.[0]).toBe("hp");
  });

  it("can set 'both' (house-rule choice)", () => {
    const d = setFavoredClassBonus(doc(), 1, "both");
    expect(d.build.favoredClassBonus?.[1]).toBe("both");
  });

  it("does not mutate existing entries at other indices", () => {
    let d = setFavoredClassBonus(doc(), 0, "skill");
    d = setFavoredClassBonus(d, 2, "hp");
    expect(d.build.favoredClassBonus?.[0]).toBe("skill");
    expect(d.build.favoredClassBonus?.[2]).toBe("hp");
  });

  it("is a no-op for negative index", () => {
    const d = doc();
    expect(setFavoredClassBonus(d, -1, "hp")).toBe(d);
  });
});
