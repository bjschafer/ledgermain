/**
 * Unit tests for the Stage 1 additions to model/doc.ts:
 * HP mode, per-level rolls, FCB houserule, hero-point cap, stat overrides,
 * and favored-class bonus choice setter.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  setAge,
  setAppearance,
  setDeity,
  setFavoredClassBonus,
  setFcbHouserule,
  setGender,
	setGmGrantFeatSlots,
	setGmGrantSkillRanks,
	setHeight,
	setHeroPointsCap,
	setHeroPointsEnabled,
	setHpMode,
	setHpRoll,
	setRestMode,
	setStatOverride,
	setWeight,
	STAT_OVERRIDE_KEYS,
} from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

// ---------------------------------------------------------------------------
// Identity flavour setters
// ---------------------------------------------------------------------------
describe("identity flavour setters", () => {
  it("setDeity stores a deity name", () => {
    expect(setDeity(doc(), "Iomedae").identity.deity).toBe("Iomedae");
  });

  it("setGender stores gender text", () => {
    expect(setGender(doc(), "Female").identity.gender).toBe("Female");
  });

  it("setAge stores age as a string", () => {
    expect(setAge(doc(), "32").identity.age).toBe("32");
  });

  it("setHeight stores height as a string", () => {
    expect(setHeight(doc(), "5'10\"").identity.height).toBe("5'10\"");
  });

  it("setWeight stores weight as a string", () => {
    expect(setWeight(doc(), "180 lb").identity.weight).toBe("180 lb");
  });

  it("setAppearance stores appearance text", () => {
    const text = "Tall with auburn hair and grey eyes.";
    expect(setAppearance(doc(), text).identity.appearance).toBe(text);
  });

  it("none of the setters mutate the original doc", () => {
    const d = doc();
    setDeity(d, "Cayden");
    setGender(d, "Male");
    setAge(d, "25");
    setHeight(d, "6'0\"");
    setWeight(d, "190 lb");
    setAppearance(d, "Some text");
    expect(d.identity.deity).toBeUndefined();
    expect(d.identity.gender).toBeUndefined();
    expect(d.identity.age).toBeUndefined();
    expect(d.identity.height).toBeUndefined();
    expect(d.identity.weight).toBeUndefined();
    expect(d.identity.appearance).toBeUndefined();
  });
});

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
// setRestMode (issue #32)
// ---------------------------------------------------------------------------
describe("setRestMode()", () => {
  it("stores the chosen mode", () => {
    expect(setRestMode(doc(), "natural").build.settings?.restMode).toBe("natural");
    expect(setRestMode(doc(), "full").build.settings?.restMode).toBe("full");
  });

  it("is absent by default (treated as 'full' by consumers)", () => {
    expect(doc().build.settings?.restMode).toBeUndefined();
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    setRestMode(d, "natural");
    expect(d.build.settings?.restMode).toBeUndefined();
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
// setHeroPointsEnabled
// ---------------------------------------------------------------------------
describe("setHeroPointsEnabled()", () => {
  it("stores true when enabled", () => {
    expect(setHeroPointsEnabled(doc(), true).build.settings?.heroPointsEnabled).toBe(true);
  });

  it("stores false when disabled", () => {
    expect(setHeroPointsEnabled(doc(), false).build.settings?.heroPointsEnabled).toBe(false);
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    setHeroPointsEnabled(d, false);
    expect(d.build.settings?.heroPointsEnabled).toBeUndefined();
  });

  it("preserves the live hero-point pool when toggling off", () => {
    const d = { ...doc(), live: { ...doc().live, heroPoints: 2 } };
    const off = setHeroPointsEnabled(d, false);
    expect(off.live.heroPoints).toBe(2);
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

// ---------------------------------------------------------------------------
// GM grants (setGmGrantSkillRanks / setGmGrantFeatSlots)
// ---------------------------------------------------------------------------
describe("setGmGrantSkillRanks()", () => {
  it("stores a positive addend on gmGrants", () => {
    expect(setGmGrantSkillRanks(doc(), 4).build.gmGrants?.skillRanks).toBe(4);
  });

  it("allows a negative addend (claw-back)", () => {
    expect(setGmGrantSkillRanks(doc(), -2).build.gmGrants?.skillRanks).toBe(-2);
  });

  it("clamps to [-999, 999]", () => {
    expect(setGmGrantSkillRanks(doc(), 1000).build.gmGrants?.skillRanks).toBe(999);
    expect(setGmGrantSkillRanks(doc(), -1000).build.gmGrants?.skillRanks).toBe(-999);
  });

  it("treats NaN as a clear", () => {
    const d = setGmGrantSkillRanks(doc(), 5);
    expect(setGmGrantSkillRanks(d, Number.NaN).build.gmGrants?.skillRanks).toBeUndefined();
  });

  it("removes the key when passed null", () => {
    const d = setGmGrantSkillRanks(doc(), 5);
    expect(setGmGrantSkillRanks(d, null).build.gmGrants?.skillRanks).toBeUndefined();
  });

  it("drops the gmGrants object when both keys are cleared", () => {
    let d = setGmGrantSkillRanks(doc(), 5);
    d = setGmGrantFeatSlots(d, 1);
    d = setGmGrantSkillRanks(d, null);
    d = setGmGrantFeatSlots(d, null);
    expect(d.build.gmGrants).toBeUndefined();
  });

  it("preserves the featSlots key when only skillRanks is cleared", () => {
    let d = setGmGrantSkillRanks(doc(), 5);
    d = setGmGrantFeatSlots(d, 1);
    d = setGmGrantSkillRanks(d, null);
    expect(d.build.gmGrants?.skillRanks).toBeUndefined();
    expect(d.build.gmGrants?.featSlots).toBe(1);
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    setGmGrantSkillRanks(d, 4);
    expect(d.build.gmGrants).toBeUndefined();
  });
});

describe("setGmGrantFeatSlots()", () => {
  it("stores a positive addend on gmGrants", () => {
    expect(setGmGrantFeatSlots(doc(), 2).build.gmGrants?.featSlots).toBe(2);
  });

  it("allows a negative addend (claw-back)", () => {
    expect(setGmGrantFeatSlots(doc(), -1).build.gmGrants?.featSlots).toBe(-1);
  });

  it("clamps to [-999, 999]", () => {
    expect(setGmGrantFeatSlots(doc(), 2000).build.gmGrants?.featSlots).toBe(999);
    expect(setGmGrantFeatSlots(doc(), -2000).build.gmGrants?.featSlots).toBe(-999);
  });

  it("treats NaN as a clear", () => {
    const d = setGmGrantFeatSlots(doc(), 2);
    expect(setGmGrantFeatSlots(d, Number.NaN).build.gmGrants?.featSlots).toBeUndefined();
  });

  it("removes the key when passed null", () => {
    const d = setGmGrantFeatSlots(doc(), 2);
    expect(setGmGrantFeatSlots(d, null).build.gmGrants?.featSlots).toBeUndefined();
  });

  it("preserves the skillRanks key when only featSlots is cleared", () => {
    let d = setGmGrantSkillRanks(doc(), 5);
    d = setGmGrantFeatSlots(d, 1);
    d = setGmGrantFeatSlots(d, null);
    expect(d.build.gmGrants?.featSlots).toBeUndefined();
    expect(d.build.gmGrants?.skillRanks).toBe(5);
  });
});
