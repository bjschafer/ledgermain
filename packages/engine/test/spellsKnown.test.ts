import { describe, expect, it } from "bun:test";

import { baseSpellsKnown } from "../src/index.js";

// Hand-computed fixtures from the published PF1 CRB sorcerer spells-known
// table (0th..9th spell level). These pin down the L7+ rows that were
// previously wrong (the table incorrectly capped 1st-level known at 4 and
// never granted a 5th known spell of a level).

describe("baseSpellsKnown() — sorcerer, L7+", () => {
  it("L7 sorcerer knows five 1st-level spells (7/5/3/2)", () => {
    expect(baseSpellsKnown("sorcerer", 7, 0)).toBe(7);
    expect(baseSpellsKnown("sorcerer", 7, 1)).toBe(5);
    expect(baseSpellsKnown("sorcerer", 7, 2)).toBe(3);
    expect(baseSpellsKnown("sorcerer", 7, 3)).toBe(2);
    expect(baseSpellsKnown("sorcerer", 7, 4)).toBeNull();
  });

  it("L11 sorcerer knows five 2nd-level spells (9/5/5/4/3/2)", () => {
    expect(baseSpellsKnown("sorcerer", 11, 0)).toBe(9);
    expect(baseSpellsKnown("sorcerer", 11, 1)).toBe(5);
    expect(baseSpellsKnown("sorcerer", 11, 2)).toBe(5);
    expect(baseSpellsKnown("sorcerer", 11, 3)).toBe(4);
    expect(baseSpellsKnown("sorcerer", 11, 4)).toBe(3);
    expect(baseSpellsKnown("sorcerer", 11, 5)).toBe(2);
    expect(baseSpellsKnown("sorcerer", 11, 6)).toBeNull();
  });

  it("L20 sorcerer known table is 9/5/5/4/4/4/3/3/3/3", () => {
    const expected = [9, 5, 5, 4, 4, 4, 3, 3, 3, 3];
    for (let spellLevel = 0; spellLevel <= 9; spellLevel++) {
      expect(baseSpellsKnown("sorcerer", 20, spellLevel)).toBe(expected[spellLevel]!);
    }
  });

  it("returns null for a spell level not yet accessible", () => {
    // A 7th-level sorcerer has 1st-3rd level spells but no 4th-level access yet.
    expect(baseSpellsKnown("sorcerer", 7, 4)).toBeNull();
    expect(baseSpellsKnown("sorcerer", 1, 2)).toBeNull();
  });
});
