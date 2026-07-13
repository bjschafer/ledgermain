/**
 * Hand-computed fixture tests for the encumbrance module (issue #16) — the
 * carrying-capacity table, size multipliers, load-tier boundaries, and the
 * reduced-speed table. Values cross-checked against the published PF1 CRB
 * "Table: Carrying Capacity" / "Table: Speed" (see encumbrance.ts doc comment).
 */
import { describe, expect, it } from "bun:test";

import {
  carryingCapacity,
  encumberedSpeed,
  encumbranceLevelFor,
  loadAcp,
  loadMaxDexCap,
  loadThresholds,
  loadTier,
  loadTierLabel,
  sizeCarryingMultiplier,
  totalCarriedWeight,
} from "../src/encumbrance.js";

describe("carryingCapacity()", () => {
  it("Str 10 = 33/66/100 (CRB table)", () => {
    expect(carryingCapacity(10)).toEqual({ light: 33, medium: 66, heavy: 100 });
  });

  it("Str 18 = 100/200/300", () => {
    expect(carryingCapacity(18)).toEqual({ light: 100, medium: 200, heavy: 300 });
  });

  it("Str 23 = 200/400/600 (tremendous-Strength extension)", () => {
    expect(carryingCapacity(23)).toEqual({ light: 200, medium: 400, heavy: 600 });
  });

  it("Str 1 = 3/6/10 (table floor)", () => {
    expect(carryingCapacity(1)).toEqual({ light: 3, medium: 6, heavy: 10 });
  });

  it("Str 29 = 466/933/1400 (table ceiling before the ×4 extension)", () => {
    expect(carryingCapacity(29)).toEqual({ light: 466, medium: 933, heavy: 1400 });
  });

  it("Str 30 = Str 20 × 4 (RAW: same ones digit, one decade above)", () => {
    const str20 = carryingCapacity(20);
    expect(carryingCapacity(30)).toEqual({
      light: str20.light * 4,
      medium: str20.medium * 4,
      heavy: str20.heavy * 4,
    });
  });

  it("Str 33 = Str 23 × 4", () => {
    const str23 = carryingCapacity(23);
    expect(carryingCapacity(33)).toEqual({
      light: str23.light * 4,
      medium: str23.medium * 4,
      heavy: str23.heavy * 4,
    });
  });

  it("Str 40 = Str 20 × 16 (two decades above)", () => {
    const str20 = carryingCapacity(20);
    expect(carryingCapacity(40)).toEqual({
      light: str20.light * 16,
      medium: str20.medium * 16,
      heavy: str20.heavy * 16,
    });
  });

  it("clamps non-positive Strength to 1", () => {
    expect(carryingCapacity(0)).toEqual(carryingCapacity(1));
    expect(carryingCapacity(-5)).toEqual(carryingCapacity(1));
  });
});

describe("sizeCarryingMultiplier()", () => {
  it("Small = ×0.75", () => {
    expect(sizeCarryingMultiplier("sm")).toBe(0.75);
  });
  it("Large = ×2", () => {
    expect(sizeCarryingMultiplier("lg")).toBe(2);
  });
  it("Medium (and every other unmodeled size) = ×1", () => {
    expect(sizeCarryingMultiplier("med")).toBe(1);
    expect(sizeCarryingMultiplier("tiny")).toBe(1);
    expect(sizeCarryingMultiplier("huge")).toBe(1);
  });
});

describe("loadThresholds()", () => {
  it("Medium Str 10: 33/66/100, unchanged by size multiplier", () => {
    expect(loadThresholds(10, "med")).toEqual({ light: 33, medium: 66, heavy: 100 });
  });

  it("Small Str 10: floored ×0.75", () => {
    // 33*0.75=24.75→24, 66*0.75=49.5→49, 100*0.75=75
    expect(loadThresholds(10, "sm")).toEqual({ light: 24, medium: 49, heavy: 75 });
  });

  it("Large Str 10: ×2", () => {
    expect(loadThresholds(10, "lg")).toEqual({ light: 66, medium: 132, heavy: 200 });
  });
});

describe("loadTier() — boundaries (issue #16)", () => {
  // Str 10 Medium: light<=33, medium<=66, heavy otherwise.
  it("exactly at the light threshold stays light (RAW 'up to')", () => {
    expect(loadTier(33, 10)).toBe("light");
  });

  it("one pound over the light threshold becomes medium", () => {
    expect(loadTier(34, 10)).toBe("medium");
  });

  it("exactly at the medium threshold stays medium", () => {
    expect(loadTier(66, 10)).toBe("medium");
  });

  it("one pound over the medium threshold becomes heavy", () => {
    expect(loadTier(67, 10)).toBe("heavy");
  });

  it("exactly at the heavy threshold stays heavy", () => {
    expect(loadTier(100, 10)).toBe("heavy");
  });

  it("weight beyond the heavy ceiling is still reported as heavy (overloaded not modeled)", () => {
    expect(loadTier(9999, 10)).toBe("heavy");
  });

  it("zero weight is light", () => {
    expect(loadTier(0, 10)).toBe("light");
  });
});

describe("encumbranceLevelFor() / loadMaxDexCap() / loadAcp() / loadTierLabel()", () => {
  it("light: level 0, no Dex cap, no ACP", () => {
    expect(encumbranceLevelFor("light")).toBe(0);
    expect(loadMaxDexCap("light")).toBeUndefined();
    expect(loadAcp("light")).toBe(0);
    expect(loadTierLabel("light")).toBe("Light load");
  });

  it("medium: level 1, max Dex +3, ACP -3", () => {
    expect(encumbranceLevelFor("medium")).toBe(1);
    expect(loadMaxDexCap("medium")).toBe(3);
    expect(loadAcp("medium")).toBe(-3);
    expect(loadTierLabel("medium")).toBe("Medium load");
  });

  it("heavy: level 2, max Dex +1, ACP -6", () => {
    expect(encumbranceLevelFor("heavy")).toBe(2);
    expect(loadMaxDexCap("heavy")).toBe(1);
    expect(loadAcp("heavy")).toBe(-6);
    expect(loadTierLabel("heavy")).toBe("Heavy load");
  });
});

describe("encumberedSpeed() — Table: Speed", () => {
  it("30 -> 20 (the common case)", () => {
    expect(encumberedSpeed(30)).toBe(20);
  });
  it("20 -> 15", () => {
    expect(encumberedSpeed(20)).toBe(15);
  });
  it("40 -> 30", () => {
    expect(encumberedSpeed(40)).toBe(30);
  });
  it("60 -> 40", () => {
    expect(encumberedSpeed(60)).toBe(40);
  });
  it("5 -> 5 (floor, unaffected)", () => {
    expect(encumberedSpeed(5)).toBe(5);
  });
  it("0 or negative is passed through unchanged", () => {
    expect(encumberedSpeed(0)).toBe(0);
    expect(encumberedSpeed(-10)).toBe(-10);
  });
});

describe("totalCarriedWeight()", () => {
  const refData = {
    items: {
      potion: {
        id: "potion",
        name: "Potion",
        weight: 0.5,
        uuid: "",
        changes: [],
        contextNotes: [],
      },
    },
  } as unknown as import("@pf1/schema").RefData;

  function doc(
    gear: import("@pf1/schema").ItemInstance[],
    weapons: import("@pf1/schema").WeaponInstance[] = [],
  ) {
    return {
      build: { gear, weapons },
    } as unknown as import("@pf1/schema").CharacterDoc;
  }

  it("sums itemId-linked gear weight × quantity", () => {
    const d = doc([{ itemId: "potion", equipped: true, quantity: 4 }]);
    expect(totalCarriedWeight(d, refData)).toBe(2); // 0.5 * 4
  });

  it("sums armor weight (from the snapshotted WornArmor.weight)", () => {
    const d = doc([{ equipped: true, armor: { slot: "armor", ac: 4, weight: 25 } }]);
    expect(totalCarriedWeight(d, refData)).toBe(25);
  });

  it("sums custom-gear weight × quantity (ammo case)", () => {
    const d = doc([{ equipped: true, name: "Arrows", weight: 0.15, quantity: 20 }]);
    expect(totalCarriedWeight(d, refData)).toBeCloseTo(3, 5); // 0.15 * 20
  });

  it("includes weapon weight (no quantity field on weapons)", () => {
    const d = doc(
      [],
      [
        {
          name: "Longsword",
          attackAbility: "str",
          weight: 4,
        } as import("@pf1/schema").WeaponInstance,
      ],
    );
    expect(totalCarriedWeight(d, refData)).toBe(4);
  });

  it("counts unequipped gear too (still carried, just not worn)", () => {
    const d = doc([{ itemId: "potion", equipped: false, quantity: 2 }]);
    expect(totalCarriedWeight(d, refData)).toBe(1);
  });

  it("gear with no weight anywhere contributes 0", () => {
    const d = doc([{ equipped: true, name: "Harrow Deck" }]);
    expect(totalCarriedWeight(d, refData)).toBe(0);
  });

  it("an explicit instance weight overrides the linked item's (a hand-corrected row)", () => {
    const d = doc([{ itemId: "potion", equipped: true, weight: 2, quantity: 3 }]);
    expect(totalCarriedWeight(d, refData)).toBe(6); // 2 * 3, not 0.5 * 3
  });
});
