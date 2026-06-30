import { describe, expect, it } from "bun:test";

import { baseSpellsPerDay } from "../src/index.js";

describe("baseSpellsPerDay() — wizard", () => {
  it("level-1 wizard: 3 cantrips, 1 first-level, no access above", () => {
    expect(baseSpellsPerDay("wizard", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("wizard", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("wizard", 1, 2)).toBeNull();
    expect(baseSpellsPerDay("wizard", 1, 9)).toBeNull();
  });

  it("returns null (no access) above the highest unlocked level", () => {
    // 3rd-level wizard unlocks 2nd-level spells (1 slot) but not 3rd.
    expect(baseSpellsPerDay("wizard", 3, 2)).toBe(1);
    expect(baseSpellsPerDay("wizard", 3, 3)).toBeNull();
  });

  it("20th-level wizard: 4 slots at every level 0–9", () => {
    for (let lvl = 0; lvl <= 9; lvl++) {
      expect(baseSpellsPerDay("wizard", 20, lvl)).toBe(4);
    }
  });

  it("9th-level wizard unlocks 5th-level spells (1 slot)", () => {
    expect(baseSpellsPerDay("wizard", 9, 5)).toBe(1);
    expect(baseSpellsPerDay("wizard", 8, 5)).toBeNull();
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("wizard", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("wizard", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("wizard", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("wizard", 5, 10)).toBeNull();
  });
});
