import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { casterLevel, casterLevelForClass, isCasterTag } from "../src/model/casterLevel.js";

function docWith(classes: { tag: string; level: number }[]): Pick<CharacterDoc, "identity"> {
  return { identity: { name: "", race: "", classes } } as unknown as Pick<CharacterDoc, "identity">;
}

describe("casterLevel", () => {
  it("returns class level for recognised full casters", () => {
    expect(casterLevelForClass("wizard", 5)).toBe(5);
    expect(casterLevelForClass("cleric", 12)).toBe(12);
  });

  it("returns 0 for non-casters", () => {
    expect(casterLevelForClass("fighter", 10)).toBe(0);
    expect(casterLevelForClass("barbarian", 20)).toBe(0);
    expect(casterLevelForClass("rogue", 7)).toBe(0);
  });

  it("isCasterTag matches the full-caster set", () => {
    expect(isCasterTag("wizard")).toBe(true);
    expect(isCasterTag("druid")).toBe(true);
    expect(isCasterTag("paladin")).toBe(true);
    expect(isCasterTag("fighter")).toBe(false);
  });

  it("casterLevel() reports the highest single-class CL, never a sum", () => {
    expect(casterLevel(docWith([{ tag: "wizard", level: 5 }]) as CharacterDoc)).toBe(5);
    // Wiz 5 / Clr 3 -> CL 5, NOT 8 (CL never sums across classes in PF1).
    expect(
      casterLevel(
        docWith([
          { tag: "wizard", level: 5 },
          { tag: "cleric", level: 3 },
        ]) as CharacterDoc,
      ),
    ).toBe(5);
    // Non-caster levels never contribute.
    expect(
      casterLevel(
        docWith([
          { tag: "fighter", level: 10 },
          { tag: "wizard", level: 1 },
        ]) as CharacterDoc,
      ),
    ).toBe(1);
    expect(casterLevel(docWith([{ tag: "fighter", level: 20 }]) as CharacterDoc)).toBe(0);
  });

  it("Occult Adventures psychic casters (mesmerist/occultist/spiritualist) cast starting at 1st level, CL = class level", () => {
    expect(casterLevelForClass("mesmerist", 7)).toBe(7);
    expect(casterLevelForClass("occultist", 7)).toBe(7);
    expect(casterLevelForClass("spiritualist", 7)).toBe(7);
    expect(isCasterTag("mesmerist")).toBe(true);
    expect(isCasterTag("occultist")).toBe(true);
    expect(isCasterTag("spiritualist")).toBe(true);
  });

  it("bloodrager (issue #65) casts nothing before 4th level, CL = class level from 4th on (no -3 offset)", () => {
    expect(casterLevelForClass("bloodrager", 1)).toBe(0);
    expect(casterLevelForClass("bloodrager", 3)).toBe(0);
    expect(casterLevelForClass("bloodrager", 4)).toBe(4);
    expect(casterLevelForClass("bloodrager", 10)).toBe(10);
    expect(casterLevelForClass("bloodrager", 20)).toBe(20);
    expect(isCasterTag("bloodrager")).toBe(true);
  });

  it("medium (issue #65) casts nothing before 4th level, CL = class level from 4th on (no -3 offset)", () => {
    expect(casterLevelForClass("medium", 1)).toBe(0);
    expect(casterLevelForClass("medium", 3)).toBe(0);
    expect(casterLevelForClass("medium", 4)).toBe(4);
    expect(casterLevelForClass("medium", 20)).toBe(20);
    expect(isCasterTag("medium")).toBe(true);
  });

  it("casterLevel() picks up a level-gated class only once its gate is reached", () => {
    expect(casterLevel(docWith([{ tag: "bloodrager", level: 3 }]) as CharacterDoc)).toBe(0);
    expect(casterLevel(docWith([{ tag: "bloodrager", level: 4 }]) as CharacterDoc)).toBe(4);
    // A level-gated class below its gate doesn't shadow a real caster level
    // from another class (mirrors the existing multiclass tests above).
    expect(
      casterLevel(
        docWith([
          { tag: "bloodrager", level: 3 },
          { tag: "wizard", level: 2 },
        ]) as CharacterDoc,
      ),
    ).toBe(2);
  });

  it("bard is a true full caster: CL = bard level from 1st, no offset", () => {
    expect(casterLevelForClass("bard", 1)).toBe(1);
    expect(casterLevelForClass("bard", 5)).toBe(5);
    expect(casterLevelForClass("bard", 20)).toBe(20);
    expect(isCasterTag("bard")).toBe(true);
  });

  it("paladin/ranger/antipaladin cast nothing through 3rd level, CL = level - 3 from 4th on", () => {
    for (const tag of ["paladin", "ranger", "antipaladin"]) {
      expect(casterLevelForClass(tag, 1)).toBe(0);
      expect(casterLevelForClass(tag, 3)).toBe(0);
      expect(casterLevelForClass(tag, 4)).toBe(1);
      expect(casterLevelForClass(tag, 9)).toBe(6);
      expect(casterLevelForClass(tag, 20)).toBe(17);
      expect(isCasterTag(tag)).toBe(true);
    }
  });

  it("casterLevel() applies the paladin/ranger -3 offset in a multiclass document", () => {
    // Paladin 9 / Fighter 5 -> CL 6 (9 - 3), fighter never contributes a CL.
    expect(
      casterLevel(
        docWith([
          { tag: "paladin", level: 9 },
          { tag: "fighter", level: 5 },
        ]) as CharacterDoc,
      ),
    ).toBe(6);
  });
});
