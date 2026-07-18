import { describe, expect, it } from "bun:test";

import { escapeHatchFor, pickerLabel, type SearchMissPicker } from "../src/model/searchMiss.js";

const ALL_PICKERS: readonly SearchMissPicker[] = [
  "feats",
  "spells",
  "races",
  "traits",
  "gear",
  "archetypes",
  "buffs",
];

describe("pickerLabel", () => {
  it("has a non-empty noun for every picker", () => {
    for (const picker of ALL_PICKERS) {
      expect(pickerLabel(picker).length).toBeGreaterThan(0);
    }
  });
});

describe("escapeHatchFor", () => {
  it("points feats/traits/races/gear/buffs at their homebrew/custom-entry door", () => {
    expect(escapeHatchFor("feats")).toMatch(/homebrew feat/);
    expect(escapeHatchFor("traits")).toMatch(/homebrew trait/);
    expect(escapeHatchFor("races")).toMatch(/homebrew race/);
    expect(escapeHatchFor("gear")).toMatch(/custom item/);
    expect(escapeHatchFor("buffs")).toMatch(/custom buff/);
  });

  it("has no escape hatch for pickers with no homebrew authoring door", () => {
    expect(escapeHatchFor("spells")).toBeUndefined();
    expect(escapeHatchFor("archetypes")).toBeUndefined();
  });
});
