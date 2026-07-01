import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  accessibleSpellLevels,
  bonusSpellsForLevel,
  casterModelFor,
  concentrationDC,
  grantedCantrips,
  spellSaveDC,
  spellSlotsByLevel,
  spellsKnownLimitsByLevel,
} from "../src/model/spellcasting.js";

const ref = loadRefData();

describe("bonusSpellsForLevel()", () => {
  it("returns 0 for cantrips (spell level 0) regardless of modifier", () => {
    expect(bonusSpellsForLevel(10, 0)).toBe(0);
    expect(bonusSpellsForLevel(0, 0)).toBe(0);
  });

  it("returns 0 when ability mod is below the spell level", () => {
    expect(bonusSpellsForLevel(0, 1)).toBe(0);
    expect(bonusSpellsForLevel(2, 3)).toBe(0);
  });

  it("Int +3, spell level 1 → 1 bonus", () => {
    expect(bonusSpellsForLevel(3, 1)).toBe(1);
  });

  it("Int +5, spell level 1 → 2 bonuses", () => {
    expect(bonusSpellsForLevel(5, 1)).toBe(2);
  });

  it("Int +5, spell level 5 → 1 bonus (just qualifies)", () => {
    expect(bonusSpellsForLevel(5, 5)).toBe(1);
  });

  it("Int +1, spell level 1 → 1 bonus (minimum qualifying modifier)", () => {
    expect(bonusSpellsForLevel(1, 1)).toBe(1);
  });

  it("Int +0, spell level 1 → 0 (does not qualify)", () => {
    expect(bonusSpellsForLevel(0, 1)).toBe(0);
  });
});

describe("casterModelFor()", () => {
  it("returns a prepared/int model for wizard", () => {
    const m = casterModelFor("wizard");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("int");
    expect(m!.knownLabel).toBe("Spellbook");
    expect(m!.grantsAllCantrips).toBe(true);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("returns undefined for an unregistered tag (e.g. bard)", () => {
    expect(casterModelFor("bard")).toBeUndefined();
  });
});

describe("casterModelFor() — cleric", () => {
  it("prepares from the full class list, not a curated known list", () => {
    const m = casterModelFor("cleric");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("wis");
    expect(m!.preparesFromClassList).toBe(true);
  });
});

describe("grantedCantrips()", () => {
  it("returns all wizard cantrips from the class spell list, sorted by name", () => {
    const list = grantedCantrips(ref, "wizard");
    expect(list.length).toBeGreaterThan(0);
    // Should be sorted
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.name.localeCompare(list[i]!.name)).toBeLessThanOrEqual(0);
    }
  });

  it("cantrip ids are the level-0 entries from spellLists", () => {
    const list = grantedCantrips(ref, "wizard");
    const expected = ref.spellLists["wizard"]![0]!;
    expect(list.map((c) => c.id).sort()).toEqual([...expected].sort());
  });

  it("returns empty array for a tag with no spell list", () => {
    expect(grantedCantrips(ref, "fighter")).toEqual([]);
  });
});

describe("casterModelFor() — sorcerer", () => {
  it("returns a spontaneous/cha model for sorcerer", () => {
    const m = casterModelFor("sorcerer");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("spontaneous");
    expect(m!.ability).toBe("cha");
    expect(m!.grantsAllCantrips).toBe(true);
    expect(m!.knownProgression).toBe("sorcerer");
    expect(m!.preparesFromClassList).toBe(false);
  });
});

describe("spellSaveDC()", () => {
  it("level 3 spell, CHA +4 → DC 17", () => {
    expect(spellSaveDC(3, 4)).toBe(17);
  });

  it("level 0 cantrip, INT +3 → DC 13", () => {
    expect(spellSaveDC(0, 3)).toBe(13);
  });

  it("level 1, +0 modifier → DC 11", () => {
    expect(spellSaveDC(1, 0)).toBe(11);
  });
});

describe("concentrationDC()", () => {
  it("level 0 cantrip → 15", () => {
    expect(concentrationDC(0)).toBe(15);
  });

  it("level 3 → 21 (15 + 2*3)", () => {
    expect(concentrationDC(3)).toBe(21);
  });

  it("level 9 → 33 (15 + 18)", () => {
    expect(concentrationDC(9)).toBe(33);
  });
});

describe("accessibleSpellLevels()", () => {
  it("a level-1 cleric can access cantrips and level 1 only", () => {
    const cleric = casterModelFor("cleric")!;
    expect(accessibleSpellLevels(cleric, 1)).toEqual([0, 1]);
  });

  it("a level-3 cleric can access up to level 2", () => {
    const cleric = casterModelFor("cleric")!;
    expect(accessibleSpellLevels(cleric, 3)).toEqual([0, 1, 2]);
  });

  it("a level-17 cleric can access every level 0-9", () => {
    const cleric = casterModelFor("cleric")!;
    expect(accessibleSpellLevels(cleric, 17)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("matches the levels spellSlotsByLevel reports as accessible (ability mod 0)", () => {
    const cleric = casterModelFor("cleric")!;
    const fromSlots = spellSlotsByLevel(cleric, 5, 0).map((s) => s.level);
    expect(accessibleSpellLevels(cleric, 5)).toEqual(fromSlots);
  });
});

describe("spellsKnownLimitsByLevel()", () => {
  it("returns empty array for prepared caster (wizard)", () => {
    const wizModel = casterModelFor("wizard")!;
    expect(spellsKnownLimitsByLevel(wizModel, 5)).toEqual([]);
  });

  it("L1 sorcerer knows 2 first-level spells and no higher", () => {
    const sorcModel = casterModelFor("sorcerer")!;
    const limits = spellsKnownLimitsByLevel(sorcModel, 1);
    const l0 = limits.find((l) => l.level === 0);
    const l1 = limits.find((l) => l.level === 1);
    const l2 = limits.find((l) => l.level === 2);
    expect(l0).toBeDefined(); // 4 cantrips known
    expect(l0!.limit).toBe(4);
    expect(l1).toBeDefined();
    expect(l1!.limit).toBe(2);
    expect(l2).toBeUndefined(); // no 2nd-level access yet
  });

  it("L10 sorcerer can know up to 4 first-level and 4 second-level spells", () => {
    const sorcModel = casterModelFor("sorcerer")!;
    const limits = spellsKnownLimitsByLevel(sorcModel, 10);
    expect(limits.find((l) => l.level === 1)!.limit).toBe(4);
    expect(limits.find((l) => l.level === 2)!.limit).toBe(4);
  });
});
