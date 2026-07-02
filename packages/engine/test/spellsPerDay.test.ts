import { describe, expect, it } from "bun:test";

import { baseSpellsKnown, baseSpellsPerDay } from "../src/index.js";

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

describe("baseSpellsPerDay() — cleric", () => {
  it("level-1 cleric: 3 orisons, 1 first-level, no access above", () => {
    expect(baseSpellsPerDay("cleric", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("cleric", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("cleric", 1, 2)).toBeNull();
    expect(baseSpellsPerDay("cleric", 1, 9)).toBeNull();
  });

  it("3rd-level cleric unlocks 2nd-level spells (1 slot)", () => {
    expect(baseSpellsPerDay("cleric", 3, 2)).toBe(1);
    expect(baseSpellsPerDay("cleric", 3, 3)).toBeNull();
  });

  it("20th-level cleric: 4 slots at every level 0–9 (shares wizard numbers)", () => {
    for (let lvl = 0; lvl <= 9; lvl++) {
      expect(baseSpellsPerDay("cleric", 20, lvl)).toBe(4);
    }
  });

  it("matches wizard progression at every level/spell-level pair", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 0; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("cleric", cl, spLvl)).toBe(
          baseSpellsPerDay("wizard", cl, spLvl),
        );
      }
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("cleric", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("cleric", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("cleric", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("cleric", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPerDay() — sorcerer", () => {
  it("cantrips (level 0) are always null — sorcerers cast them at will", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("sorcerer", cl, 0)).toBeNull();
    }
  });

  it("level-1 sorcerer: 3 first-level slots, no 2nd-level access", () => {
    expect(baseSpellsPerDay("sorcerer", 1, 1)).toBe(3);
    expect(baseSpellsPerDay("sorcerer", 1, 2)).toBeNull();
  });

  it("level-4 sorcerer unlocks 2nd-level spells (3 slots)", () => {
    expect(baseSpellsPerDay("sorcerer", 4, 1)).toBe(6);
    expect(baseSpellsPerDay("sorcerer", 4, 2)).toBe(3);
    expect(baseSpellsPerDay("sorcerer", 4, 3)).toBeNull();
  });

  it("level-20 sorcerer: 6 slots at levels 1–9", () => {
    for (let spLvl = 1; spLvl <= 9; spLvl++) {
      expect(baseSpellsPerDay("sorcerer", 20, spLvl)).toBe(6);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("sorcerer", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("sorcerer", 21, 1)).toBeNull();
  });
});

describe("baseSpellsKnown() — sorcerer", () => {
  it("L1 sorcerer knows 4 cantrips, 2 first-level spells", () => {
    expect(baseSpellsKnown("sorcerer", 1, 0)).toBe(4);
    expect(baseSpellsKnown("sorcerer", 1, 1)).toBe(2);
    expect(baseSpellsKnown("sorcerer", 1, 2)).toBeNull();
  });

  it("L4 sorcerer unlocks 2nd-level known (1)", () => {
    expect(baseSpellsKnown("sorcerer", 4, 2)).toBe(1);
    expect(baseSpellsKnown("sorcerer", 3, 2)).toBeNull();
  });

  it("L20 sorcerer knows 9 cantrips and 5/5/4/4/4/3/3/3/3 spells at levels 1–9", () => {
    expect(baseSpellsKnown("sorcerer", 20, 0)).toBe(9);
    const expected = [5, 5, 4, 4, 4, 3, 3, 3, 3];
    for (let lvl = 1; lvl <= 9; lvl++) {
      expect(baseSpellsKnown("sorcerer", 20, lvl)).toBe(expected[lvl - 1]!);
    }
  });

  it("out-of-range returns null", () => {
    expect(baseSpellsKnown("sorcerer", 0, 1)).toBeNull();
    expect(baseSpellsKnown("sorcerer", 21, 1)).toBeNull();
    expect(baseSpellsKnown("sorcerer", 5, 10)).toBeNull();
  });
});
