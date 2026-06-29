import { describe, expect, it } from "bun:test";

import {
  bonusSpellsForLevel,
  casterModelFor,
} from "../src/model/spellcasting.js";

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
  });

  it("returns undefined for an unregistered tag (e.g. bard)", () => {
    expect(casterModelFor("bard")).toBeUndefined();
  });
});
