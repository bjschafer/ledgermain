import { describe, expect, it } from "bun:test";

import { baseSpellsKnown, baseSpellsPerDay, baseSpellsPrepared } from "../src/index.js";

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
        expect(baseSpellsPerDay("cleric", cl, spLvl)).toBe(baseSpellsPerDay("wizard", cl, spLvl));
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

describe("baseSpellsPerDay() — druid", () => {
  it("level-1 druid: 3 orisons, 1 first-level, no access above", () => {
    expect(baseSpellsPerDay("druid", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("druid", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("druid", 1, 2)).toBeNull();
    expect(baseSpellsPerDay("druid", 1, 9)).toBeNull();
  });

  it("3rd-level druid unlocks 2nd-level spells (1 slot)", () => {
    expect(baseSpellsPerDay("druid", 3, 2)).toBe(1);
    expect(baseSpellsPerDay("druid", 3, 3)).toBeNull();
  });

  it("matches wizard/cleric progression at every level/spell-level pair", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 0; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("druid", cl, spLvl)).toBe(baseSpellsPerDay("wizard", cl, spLvl));
      }
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("druid", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("druid", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("druid", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("druid", 5, 10)).toBeNull();
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

describe("baseSpellsPerDay() — paladin / ranger (identical half-caster progression)", () => {
  it("levels 1-3: no spellcasting yet", () => {
    for (const progression of ["paladin", "ranger"] as const) {
      for (let cl = 1; cl <= 3; cl++) {
        for (let spLvl = 0; spLvl <= 9; spLvl++) {
          expect(baseSpellsPerDay(progression, cl, spLvl)).toBeNull();
        }
      }
    }
  });

  it("level 4: 0 first-level slots (accessible but no bonus slot yet), no 2nd-level access", () => {
    expect(baseSpellsPerDay("paladin", 4, 1)).toBe(0);
    expect(baseSpellsPerDay("ranger", 4, 1)).toBe(0);
    expect(baseSpellsPerDay("paladin", 4, 2)).toBeNull();
    expect(baseSpellsPerDay("ranger", 4, 2)).toBeNull();
  });

  it("cantrips (level 0) are always null — neither class casts them", () => {
    for (const progression of ["paladin", "ranger"] as const) {
      for (let cl = 1; cl <= 20; cl++) {
        expect(baseSpellsPerDay(progression, cl, 0)).toBeNull();
      }
    }
  });

  it("caps at 4th-level spells — levels 5-9 are always null", () => {
    for (const progression of ["paladin", "ranger"] as const) {
      for (let cl = 1; cl <= 20; cl++) {
        for (let spLvl = 5; spLvl <= 9; spLvl++) {
          expect(baseSpellsPerDay(progression, cl, spLvl)).toBeNull();
        }
      }
    }
  });

  it("level 20 (max row): 4/4/3/3 at spell levels 1-4", () => {
    const expected = [4, 4, 3, 3];
    for (const progression of ["paladin", "ranger"] as const) {
      for (let spLvl = 1; spLvl <= 4; spLvl++) {
        expect(baseSpellsPerDay(progression, 20, spLvl)).toBe(expected[spLvl - 1]!);
      }
    }
  });

  it("paladin and ranger tables are identical at every level/spell-level pair", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 0; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("paladin", cl, spLvl)).toBe(baseSpellsPerDay("ranger", cl, spLvl));
      }
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("paladin", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("paladin", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("ranger", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("ranger", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPerDay() — bard", () => {
  it("cantrips (level 0) are always null — bards cast them at will, like sorcerers", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("bard", cl, 0)).toBeNull();
    }
  });

  it("level-1 bard: 1 first-level slot, no 2nd-level access", () => {
    expect(baseSpellsPerDay("bard", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("bard", 1, 2)).toBeNull();
  });

  it("level-4 bard unlocks 2nd-level spells (1 slot)", () => {
    expect(baseSpellsPerDay("bard", 4, 1)).toBe(3);
    expect(baseSpellsPerDay("bard", 4, 2)).toBe(1);
    expect(baseSpellsPerDay("bard", 4, 3)).toBeNull();
  });

  it("caps at 6th-level spells — levels 7-9 are always null", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 7; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("bard", cl, spLvl)).toBeNull();
      }
    }
  });

  it("level-16 bard unlocks 6th-level spells (1 slot)", () => {
    expect(baseSpellsPerDay("bard", 16, 6)).toBe(1);
    expect(baseSpellsPerDay("bard", 15, 6)).toBeNull();
  });

  it("level-20 bard: 5 slots at levels 1-6", () => {
    for (let spLvl = 1; spLvl <= 6; spLvl++) {
      expect(baseSpellsPerDay("bard", 20, spLvl)).toBe(5);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("bard", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("bard", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("bard", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("bard", 5, 10)).toBeNull();
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

describe("baseSpellsKnown() — bard", () => {
  it("L1 bard knows 4 cantrips, 2 first-level spells", () => {
    expect(baseSpellsKnown("bard", 1, 0)).toBe(4);
    expect(baseSpellsKnown("bard", 1, 1)).toBe(2);
    expect(baseSpellsKnown("bard", 1, 2)).toBeNull();
  });

  it("L4 bard unlocks 2nd-level known (2)", () => {
    expect(baseSpellsKnown("bard", 4, 2)).toBe(2);
    expect(baseSpellsKnown("bard", 3, 2)).toBeNull();
  });

  it("caps at 6th-level spells — levels 7-9 are always null", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 7; spLvl <= 9; spLvl++) {
        expect(baseSpellsKnown("bard", cl, spLvl)).toBeNull();
      }
    }
  });

  it("L20 bard knows 6 cantrips and 6/6/6/6/5/5 spells at levels 1–6", () => {
    expect(baseSpellsKnown("bard", 20, 0)).toBe(6);
    const expected = [6, 6, 6, 6, 5, 5];
    for (let lvl = 1; lvl <= 6; lvl++) {
      expect(baseSpellsKnown("bard", 20, lvl)).toBe(expected[lvl - 1]!);
    }
  });

  it("out-of-range returns null", () => {
    expect(baseSpellsKnown("bard", 0, 1)).toBeNull();
    expect(baseSpellsKnown("bard", 21, 1)).toBeNull();
    expect(baseSpellsKnown("bard", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPerDay() — arcanist (hybrid: cast-slot pool)", () => {
  it("cantrips (level 0) are always null — cantrips are governed by the prepared table instead", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("arcanist", cl, 0)).toBeNull();
    }
  });

  it("level-1 arcanist: 2 first-level slots, no 2nd-level access", () => {
    expect(baseSpellsPerDay("arcanist", 1, 1)).toBe(2);
    expect(baseSpellsPerDay("arcanist", 1, 2)).toBeNull();
  });

  it("level-4 arcanist unlocks 2nd-level spells: 4 first-level / 2 second-level slots", () => {
    expect(baseSpellsPerDay("arcanist", 4, 1)).toBe(4);
    expect(baseSpellsPerDay("arcanist", 4, 2)).toBe(2);
    expect(baseSpellsPerDay("arcanist", 4, 3)).toBeNull();
  });

  it("level-20 arcanist: 4 slots at every level 1-9", () => {
    for (let spLvl = 1; spLvl <= 9; spLvl++) {
      expect(baseSpellsPerDay("arcanist", 20, spLvl)).toBe(4);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("arcanist", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("arcanist", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("arcanist", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("arcanist", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPrepared() — arcanist (hybrid: wizard-shaped spellbook readying)", () => {
  it("L1 arcanist: 4 cantrips, 2 first-level spells prepared", () => {
    expect(baseSpellsPrepared("arcanist", 1, 0)).toBe(4);
    expect(baseSpellsPrepared("arcanist", 1, 1)).toBe(2);
    expect(baseSpellsPrepared("arcanist", 1, 2)).toBeNull();
  });

  it("L4 arcanist: 6 cantrips, 3 first-level, 1 second-level prepared — fewer spells prepared than slots to cast them", () => {
    expect(baseSpellsPrepared("arcanist", 4, 0)).toBe(6);
    expect(baseSpellsPrepared("arcanist", 4, 1)).toBe(3);
    expect(baseSpellsPrepared("arcanist", 4, 2)).toBe(1);
    expect(baseSpellsPrepared("arcanist", 4, 3)).toBeNull();
    // Fewer prepared than slots at every accessible level: casting spends a
    // slot, not the specific prepared spell, so this asymmetry is the point.
    expect(baseSpellsPrepared("arcanist", 4, 1)!).toBeLessThan(baseSpellsPerDay("arcanist", 4, 1)!);
    expect(baseSpellsPrepared("arcanist", 4, 2)!).toBeLessThan(baseSpellsPerDay("arcanist", 4, 2)!);
  });

  it("L20 arcanist: 9 cantrips and 5/5/4/4/4/3/3/3/3 prepared at levels 1-9", () => {
    expect(baseSpellsPrepared("arcanist", 20, 0)).toBe(9);
    const expected = [5, 5, 4, 4, 4, 3, 3, 3, 3];
    for (let lvl = 1; lvl <= 9; lvl++) {
      expect(baseSpellsPrepared("arcanist", 20, lvl)).toBe(expected[lvl - 1]!);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPrepared("arcanist", 0, 1)).toBeNull();
    expect(baseSpellsPrepared("arcanist", 21, 1)).toBeNull();
    expect(baseSpellsPrepared("arcanist", 5, -1)).toBeNull();
    expect(baseSpellsPrepared("arcanist", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPerDay() — magus (UM medium prepared-arcane, caps at 6th level)", () => {
  it("level-1 magus: 3 cantrips, 1 first-level, no 2nd-level access", () => {
    expect(baseSpellsPerDay("magus", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("magus", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("magus", 1, 2)).toBeNull();
  });

  it("level-4 magus: 4/3/1 at levels 0-2, no 3rd-level access (aonprd.com Table: Magus)", () => {
    expect(baseSpellsPerDay("magus", 4, 0)).toBe(4);
    expect(baseSpellsPerDay("magus", 4, 1)).toBe(3);
    expect(baseSpellsPerDay("magus", 4, 2)).toBe(1);
    expect(baseSpellsPerDay("magus", 4, 3)).toBeNull();
  });

  it("level-7 magus: 5/4/3/1 at levels 0-3, no 4th-level access", () => {
    expect(baseSpellsPerDay("magus", 7, 0)).toBe(5);
    expect(baseSpellsPerDay("magus", 7, 1)).toBe(4);
    expect(baseSpellsPerDay("magus", 7, 2)).toBe(3);
    expect(baseSpellsPerDay("magus", 7, 3)).toBe(1);
    expect(baseSpellsPerDay("magus", 7, 4)).toBeNull();
  });

  it("magus caps at 6th-level spells: levels 7-9 are never accessible", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("magus", cl, 7)).toBeNull();
      expect(baseSpellsPerDay("magus", cl, 8)).toBeNull();
      expect(baseSpellsPerDay("magus", cl, 9)).toBeNull();
    }
  });

  it("level-20 magus: 5 slots at every level 0-6", () => {
    for (let lvl = 0; lvl <= 6; lvl++) {
      expect(baseSpellsPerDay("magus", 20, lvl)).toBe(5);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("magus", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("magus", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("magus", 5, -1)).toBeNull();
  });
});

describe("baseSpellsPerDay() — witch (APG, aliases the wizard table)", () => {
  // Witch's "Spells per Day" table (APG) is numerically identical to the
  // wizard's (verified against aonprd.com's Table: Witch — exact match at
  // every level). This locks that reuse in place with spot-checks at
  // L1/L5/L10/L20, then a full level-by-level cross-check.
  it("level-1 witch: 3 cantrips, 1 first-level, no access above", () => {
    expect(baseSpellsPerDay("witch", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("witch", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("witch", 1, 2)).toBeNull();
  });

  it("level-5 witch: 4/3/2/1 at levels 0-3, no 4th-level access", () => {
    expect(baseSpellsPerDay("witch", 5, 0)).toBe(4);
    expect(baseSpellsPerDay("witch", 5, 1)).toBe(3);
    expect(baseSpellsPerDay("witch", 5, 2)).toBe(2);
    expect(baseSpellsPerDay("witch", 5, 3)).toBe(1);
    expect(baseSpellsPerDay("witch", 5, 4)).toBeNull();
  });

  it("level-10 witch: 4/4/4/3/3/2 at levels 0-5, no 6th-level access", () => {
    expect(baseSpellsPerDay("witch", 10, 0)).toBe(4);
    expect(baseSpellsPerDay("witch", 10, 1)).toBe(4);
    expect(baseSpellsPerDay("witch", 10, 2)).toBe(4);
    expect(baseSpellsPerDay("witch", 10, 3)).toBe(3);
    expect(baseSpellsPerDay("witch", 10, 4)).toBe(3);
    expect(baseSpellsPerDay("witch", 10, 5)).toBe(2);
    expect(baseSpellsPerDay("witch", 10, 6)).toBeNull();
  });

  it("level-20 witch: 4 slots at every level 0-9", () => {
    for (let lvl = 0; lvl <= 9; lvl++) {
      expect(baseSpellsPerDay("witch", 20, lvl)).toBe(4);
    }
  });

  it("matches wizard progression at every level/spell-level pair", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 0; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("witch", cl, spLvl)).toBe(baseSpellsPerDay("wizard", cl, spLvl));
      }
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("witch", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("witch", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("witch", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("witch", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPerDay() — shaman (ACG, aliases the cleric table)", () => {
  // Shaman's "Spells per Day" table (ACG) is numerically identical to the
  // cleric's/wizard's (verified against aonprd.com's Table: Shaman — exact
  // match at every level). This locks that reuse in place with spot-checks at
  // L1/L5/L10/L20, then a full level-by-level cross-check.
  it("level-1 shaman: 3 orisons, 1 first-level, no access above", () => {
    expect(baseSpellsPerDay("shaman", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("shaman", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("shaman", 1, 2)).toBeNull();
  });

  it("level-5 shaman: 4/3/2/1 at levels 0-3, no 4th-level access", () => {
    expect(baseSpellsPerDay("shaman", 5, 0)).toBe(4);
    expect(baseSpellsPerDay("shaman", 5, 1)).toBe(3);
    expect(baseSpellsPerDay("shaman", 5, 2)).toBe(2);
    expect(baseSpellsPerDay("shaman", 5, 3)).toBe(1);
    expect(baseSpellsPerDay("shaman", 5, 4)).toBeNull();
  });

  it("level-10 shaman: 4/4/4/3/3/2 at levels 0-5, no 6th-level access", () => {
    expect(baseSpellsPerDay("shaman", 10, 0)).toBe(4);
    expect(baseSpellsPerDay("shaman", 10, 1)).toBe(4);
    expect(baseSpellsPerDay("shaman", 10, 2)).toBe(4);
    expect(baseSpellsPerDay("shaman", 10, 3)).toBe(3);
    expect(baseSpellsPerDay("shaman", 10, 4)).toBe(3);
    expect(baseSpellsPerDay("shaman", 10, 5)).toBe(2);
    expect(baseSpellsPerDay("shaman", 10, 6)).toBeNull();
  });

  it("level-20 shaman: 4 slots at every level 0-9", () => {
    for (let lvl = 0; lvl <= 9; lvl++) {
      expect(baseSpellsPerDay("shaman", 20, lvl)).toBe(4);
    }
  });

  it("matches cleric/wizard progression at every level/spell-level pair", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 0; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("shaman", cl, spLvl)).toBe(baseSpellsPerDay("cleric", cl, spLvl));
      }
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("shaman", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("shaman", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("shaman", 5, -1)).toBeNull();
    expect(baseSpellsPerDay("shaman", 5, 10)).toBeNull();
  });
});

describe("baseSpellsPerDay()/baseSpellsKnown() — oracle reuses the sorcerer tables", () => {
  // Oracle's "Spells per Day" and "Spells Known" tables (APG) are numerically
  // identical to the sorcerer's (verified against aonprd.com/d20pfsrd.com) —
  // apps/web/src/model/spellcasting.ts's CASTER_MODELS.oracle sets
  // progression/knownProgression to "sorcerer" rather than duplicating the
  // table under an "oracle" key. This just locks that reuse in place.
  it("level-5 oracle (via the sorcerer table): 6 orisons, 4 first-level, 2 second-level known", () => {
    expect(baseSpellsKnown("sorcerer", 5, 0)).toBe(6);
    expect(baseSpellsKnown("sorcerer", 5, 1)).toBe(4);
    expect(baseSpellsKnown("sorcerer", 5, 2)).toBe(2);
    expect(baseSpellsPerDay("sorcerer", 5, 1)).toBe(6);
    expect(baseSpellsPerDay("sorcerer", 5, 2)).toBe(4);
  });
});

describe("baseSpellsPerDay() — alchemist (APG, int-based extracts, NO 0-level tier)", () => {
  it("level-1 alchemist: no 0-level extracts at all, 1 first-level, no 2nd-level access", () => {
    expect(baseSpellsPerDay("alchemist", 1, 0)).toBeNull();
    expect(baseSpellsPerDay("alchemist", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("alchemist", 1, 2)).toBeNull();
  });

  it("level-4 alchemist: 3/1 at extract levels 1-2, no 3rd-level access (aonprd.com/d20pfsrd.com Table: Alchemist)", () => {
    expect(baseSpellsPerDay("alchemist", 4, 1)).toBe(3);
    expect(baseSpellsPerDay("alchemist", 4, 2)).toBe(1);
    expect(baseSpellsPerDay("alchemist", 4, 3)).toBeNull();
  });

  it("level-10 alchemist: 5/4/3/1 at extract levels 1-4, no 5th-level access", () => {
    expect(baseSpellsPerDay("alchemist", 10, 1)).toBe(5);
    expect(baseSpellsPerDay("alchemist", 10, 2)).toBe(4);
    expect(baseSpellsPerDay("alchemist", 10, 3)).toBe(3);
    expect(baseSpellsPerDay("alchemist", 10, 4)).toBe(1);
    expect(baseSpellsPerDay("alchemist", 10, 5)).toBeNull();
  });

  it("alchemist caps at 6th-level extracts: levels 7-9 are never accessible", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("alchemist", cl, 7)).toBeNull();
      expect(baseSpellsPerDay("alchemist", cl, 8)).toBeNull();
      expect(baseSpellsPerDay("alchemist", cl, 9)).toBeNull();
    }
  });

  it("level-20 alchemist: 5 slots at every extract level 1-6, still no 0-level tier", () => {
    expect(baseSpellsPerDay("alchemist", 20, 0)).toBeNull();
    for (let lvl = 1; lvl <= 6; lvl++) {
      expect(baseSpellsPerDay("alchemist", 20, lvl)).toBe(5);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("alchemist", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("alchemist", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("alchemist", 5, -1)).toBeNull();
  });
});

describe("baseSpellsPerDay() — investigator reuses the alchemist extracts-per-day table", () => {
  // Investigator (ACG) extracts per day are numerically identical to the
  // alchemist's (verified against aonprd.com/d20pfsrd.com, both matching at
  // every spot-checked level) — apps/web/src/model/spellcasting.ts's
  // CASTER_MODELS.investigator sets progression to "investigator", which
  // `@pf1/engine` `tables.ts` aliases to ALCHEMIST_EXTRACTS_PER_DAY rather
  // than duplicating the table, same posture as oracle/sorcerer above.
  it("matches the alchemist table exactly at spot-checked levels", () => {
    expect(baseSpellsPerDay("investigator", 1, 0)).toBeNull();
    expect(baseSpellsPerDay("investigator", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("investigator", 4, 1)).toBe(3);
    expect(baseSpellsPerDay("investigator", 4, 2)).toBe(1);
    expect(baseSpellsPerDay("investigator", 10, 4)).toBe(1);
    expect(baseSpellsPerDay("investigator", 10, 5)).toBeNull();
    for (let lvl = 1; lvl <= 6; lvl++) {
      expect(baseSpellsPerDay("investigator", 20, lvl)).toBe(5);
    }
    expect(baseSpellsPerDay("investigator", 20, 7)).toBeNull();
  });
});

describe("baseSpellsPerDay()/baseSpellsKnown() — inquisitor, summoner, skald (bard-shaped)", () => {
  // Inquisitor (APG, Wis), Summoner (APG, Cha), and Skald (ACG, Cha) are all
  // 6-level-max spontaneous casters whose Spells per Day / Spells Known
  // tables are numerically IDENTICAL to the bard's — verified against
  // aonprd.com's live class pages and legacy.aonprd.com's static mirror, both
  // matching exactly at every level 1-20 for all three classes and both
  // tables (see tables.ts's INQUISITOR_SPELLS_PER_DAY/etc. comment). Spot
  // checks at L1/L5/L10/L20 for each of the three "own" progression keys
  // (which alias the bard tables under the hood, same posture as oracle
  // reusing sorcerer above).
  for (const tag of ["inquisitor", "summoner", "skald"] as const) {
    it(`${tag}: L1 — 4 cantrips known, 2 first-level known, 1 first-level slot/day`, () => {
      expect(baseSpellsKnown(tag, 1, 0)).toBe(4);
      expect(baseSpellsKnown(tag, 1, 1)).toBe(2);
      expect(baseSpellsPerDay(tag, 1, 0)).toBeNull(); // cantrips cast at will, no per-day slot
      expect(baseSpellsPerDay(tag, 1, 1)).toBe(1);
    });

    it(`${tag}: L5 — 6 cantrips known, 4/3 known at 1st/2nd, 4/2 slots/day at 1st/2nd`, () => {
      expect(baseSpellsKnown(tag, 5, 0)).toBe(6);
      expect(baseSpellsKnown(tag, 5, 1)).toBe(4);
      expect(baseSpellsKnown(tag, 5, 2)).toBe(3);
      expect(baseSpellsPerDay(tag, 5, 1)).toBe(4);
      expect(baseSpellsPerDay(tag, 5, 2)).toBe(2);
    });

    it(`${tag}: L10 — 5/5/4/2 known at 1st-4th, 5/4/3/1 slots/day at 1st-4th`, () => {
      expect(baseSpellsKnown(tag, 10, 1)).toBe(5);
      expect(baseSpellsKnown(tag, 10, 2)).toBe(5);
      expect(baseSpellsKnown(tag, 10, 3)).toBe(4);
      expect(baseSpellsKnown(tag, 10, 4)).toBe(2);
      expect(baseSpellsPerDay(tag, 10, 1)).toBe(5);
      expect(baseSpellsPerDay(tag, 10, 2)).toBe(4);
      expect(baseSpellsPerDay(tag, 10, 3)).toBe(3);
      expect(baseSpellsPerDay(tag, 10, 4)).toBe(1);
    });

    it(`${tag}: L20 — 6 known at every level up to 4th, 5 at 5th/6th; 5 slots/day at every level 1-6`, () => {
      for (const lvl of [0, 1, 2, 3, 4]) {
        expect(baseSpellsKnown(tag, 20, lvl)).toBe(6);
      }
      expect(baseSpellsKnown(tag, 20, 5)).toBe(5);
      expect(baseSpellsKnown(tag, 20, 6)).toBe(5);
      for (let lvl = 1; lvl <= 6; lvl++) {
        expect(baseSpellsPerDay(tag, 20, lvl)).toBe(5);
      }
      expect(baseSpellsPerDay(tag, 20, 7)).toBeNull(); // caps at 6th-level spells
    });
  }
});

describe("baseSpellsPerDay() — warpriest (ACG wis prepared-divine, caps at 6th, has orisons)", () => {
  it("level-1 warpriest: 3 orisons, 1 first-level, no 2nd-level access", () => {
    expect(baseSpellsPerDay("warpriest", 1, 0)).toBe(3);
    expect(baseSpellsPerDay("warpriest", 1, 1)).toBe(1);
    expect(baseSpellsPerDay("warpriest", 1, 2)).toBeNull();
  });

  it("level-6 warpriest: 5/4/3 at levels 0-2, no 3rd-level access (Table: Warpriest)", () => {
    expect(baseSpellsPerDay("warpriest", 6, 0)).toBe(5);
    expect(baseSpellsPerDay("warpriest", 6, 1)).toBe(4);
    expect(baseSpellsPerDay("warpriest", 6, 2)).toBe(3);
    expect(baseSpellsPerDay("warpriest", 6, 3)).toBeNull();
  });

  it("level-10 warpriest: 5/5/4/3/1 at levels 0-4, no 5th-level access", () => {
    expect(baseSpellsPerDay("warpriest", 10, 0)).toBe(5);
    expect(baseSpellsPerDay("warpriest", 10, 1)).toBe(5);
    expect(baseSpellsPerDay("warpriest", 10, 2)).toBe(4);
    expect(baseSpellsPerDay("warpriest", 10, 3)).toBe(3);
    expect(baseSpellsPerDay("warpriest", 10, 4)).toBe(1);
    expect(baseSpellsPerDay("warpriest", 10, 5)).toBeNull();
  });

  it("warpriest caps at 6th-level spells: levels 7-9 are never accessible", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("warpriest", cl, 7)).toBeNull();
      expect(baseSpellsPerDay("warpriest", cl, 8)).toBeNull();
      expect(baseSpellsPerDay("warpriest", cl, 9)).toBeNull();
    }
  });

  it("level-20 warpriest: 5 slots at every level 0-6", () => {
    for (let lvl = 0; lvl <= 6; lvl++) {
      expect(baseSpellsPerDay("warpriest", 20, lvl)).toBe(5);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("warpriest", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("warpriest", 21, 1)).toBeNull();
    expect(baseSpellsPerDay("warpriest", 5, -1)).toBeNull();
  });
});

describe("baseSpellsPerDay()/baseSpellsKnown() — hunter reuses the bard tables", () => {
  // Hunter's "Spells per Day" and "Spells Known" tables (ACG) are numerically
  // identical to the bard's (verified against the raw "Table: Hunter" /
  // "Table: Hunter Spells Known" HTML on legacy.aonprd.com — both cap at
  // 6th-level spells and share the exact same per-level numbers) —
  // apps/web/src/model/spellcasting.ts's CASTER_MODELS.hunter sets
  // progression/knownProgression to "bard" rather than duplicating the table
  // under a "hunter" key, same posture as oracle/sorcerer above.
  it("level-4 hunter (via the bard table): 3/1 first/second-level slots and known", () => {
    expect(baseSpellsPerDay("bard", 4, 1)).toBe(3);
    expect(baseSpellsPerDay("bard", 4, 2)).toBe(1);
    expect(baseSpellsKnown("bard", 4, 0)).toBe(6);
    expect(baseSpellsKnown("bard", 4, 1)).toBe(4);
    expect(baseSpellsKnown("bard", 4, 2)).toBe(2);
  });

  it("level-1 hunter (via the bard table): no 0-level slot column (orisons cast at will), 1 first-level slot", () => {
    expect(baseSpellsPerDay("bard", 1, 0)).toBeNull();
    expect(baseSpellsPerDay("bard", 1, 1)).toBe(1);
    expect(baseSpellsKnown("bard", 1, 0)).toBe(4);
    expect(baseSpellsKnown("bard", 1, 1)).toBe(2);
  });
});

describe("baseSpellsPerDay()/baseSpellsKnown() — bloodrager (ACG cha spontaneous arcane, late start)", () => {
  it("levels 1-3: no spellcasting yet at all", () => {
    for (let cl = 1; cl <= 3; cl++) {
      for (let spLvl = 0; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("bloodrager", cl, spLvl)).toBeNull();
        expect(baseSpellsKnown("bloodrager", cl, spLvl)).toBeNull();
      }
    }
  });

  it("level 4: first spells appear (1 per day, 2 known), no 2nd-level access", () => {
    expect(baseSpellsPerDay("bloodrager", 4, 1)).toBe(1);
    expect(baseSpellsKnown("bloodrager", 4, 1)).toBe(2);
    expect(baseSpellsPerDay("bloodrager", 4, 2)).toBeNull();
    expect(baseSpellsKnown("bloodrager", 4, 2)).toBeNull();
  });

  it("cantrips (level 0) are always null — bloodragers never gain orisons", () => {
    for (let cl = 1; cl <= 20; cl++) {
      expect(baseSpellsPerDay("bloodrager", cl, 0)).toBeNull();
      expect(baseSpellsKnown("bloodrager", cl, 0)).toBeNull();
    }
  });

  it("caps at 4th-level spells — levels 5-9 are always null", () => {
    for (let cl = 1; cl <= 20; cl++) {
      for (let spLvl = 5; spLvl <= 9; spLvl++) {
        expect(baseSpellsPerDay("bloodrager", cl, spLvl)).toBeNull();
        expect(baseSpellsKnown("bloodrager", cl, spLvl)).toBeNull();
      }
    }
  });

  it("level 10: 2/1/1 per day, 5/4/2 known at levels 1-3", () => {
    expect(baseSpellsPerDay("bloodrager", 10, 1)).toBe(2);
    expect(baseSpellsPerDay("bloodrager", 10, 2)).toBe(1);
    expect(baseSpellsPerDay("bloodrager", 10, 3)).toBe(1);
    expect(baseSpellsKnown("bloodrager", 10, 1)).toBe(5);
    expect(baseSpellsKnown("bloodrager", 10, 2)).toBe(4);
    expect(baseSpellsKnown("bloodrager", 10, 3)).toBe(2);
  });

  it("level 20 (max row): 4/4/3/2 per day, 6/6/6/5 known at levels 1-4", () => {
    const expectedPerDay = [4, 4, 3, 2];
    const expectedKnown = [6, 6, 6, 5];
    for (let spLvl = 1; spLvl <= 4; spLvl++) {
      expect(baseSpellsPerDay("bloodrager", 20, spLvl)).toBe(expectedPerDay[spLvl - 1]!);
      expect(baseSpellsKnown("bloodrager", 20, spLvl)).toBe(expectedKnown[spLvl - 1]!);
    }
  });

  it("out-of-range inputs return null", () => {
    expect(baseSpellsPerDay("bloodrager", 0, 1)).toBeNull();
    expect(baseSpellsPerDay("bloodrager", 21, 1)).toBeNull();
    expect(baseSpellsKnown("bloodrager", 0, 1)).toBeNull();
    expect(baseSpellsKnown("bloodrager", 21, 1)).toBeNull();
  });
});
