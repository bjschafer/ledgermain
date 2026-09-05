/**
 * The Background Skills skill-list split (Pathfinder Unchained p. 134). The
 * table is the whole rule's data half: which skills the variant's separate
 * rank pool may buy. Expected membership is the published list, verbatim.
 */
import { describe, expect, it } from "bun:test";

import { BACKGROUND_SKILL_IDS, isBackgroundSkill, SKILL_IDS } from "../src/index.js";

describe("BACKGROUND_SKILL_IDS", () => {
  it("holds exactly the 13 published background skills", () => {
    expect([...BACKGROUND_SKILL_IDS].sort()).toEqual([
      "apr", // Appraise
      "art", // Artistry
      "crf", // Craft
      "han", // Handle Animal
      "ken", // Knowledge (engineering)
      "kge", // Knowledge (geography)
      "khi", // Knowledge (history)
      "kno", // Knowledge (nobility)
      "lin", // Linguistics
      "lor", // Lore
      "prf", // Perform
      "pro", // Profession
      "slt", // Sleight of Hand
    ]);
  });

  it("every member is a real skill id", () => {
    for (const id of BACKGROUND_SKILL_IDS) expect(SKILL_IDS).toContain(id);
  });

  it("leaves the rest of the list adventuring", () => {
    // Spot-check the ones a reader might expect to be background skills:
    // Knowledge is split down the middle, and Disable Device / Use Magic
    // Device stay adventuring despite being craft-flavored.
    for (const id of ["kar", "kdu", "klo", "kna", "kpl", "kre", "dev", "umd", "hea", "sur"]) {
      expect(isBackgroundSkill(id)).toBe(false);
    }
  });
});

describe("isBackgroundSkill", () => {
  it("resolves a parameterized instance through its base id", () => {
    expect(isBackgroundSkill("crf.alchemy")).toBe(true);
    expect(isBackgroundSkill("prf.oratory")).toBe(true);
    expect(isBackgroundSkill("pro.scribe")).toBe(true);
  });

  it("is false for an unknown id", () => {
    expect(isBackgroundSkill("nope")).toBe(false);
  });
});
