/**
 * Unit tests for `model/kineticistBuild.ts` (issue #65 — kineticist
 * Elemental Focus / Expanded Element / Wild Talent budget math). Mirrors
 * `occultistImplements.test.ts`'s pattern.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  chosenKineticistTalentCount,
  expectedKineticistTalentCount,
  hasKineticistWildTalent,
  kineticistLevel,
  kineticistTalentBelowLevel,
  kineticistTalentsNeedWarning,
  knownKineticistElements,
  setKineticistElement,
  setKineticistExpandedElement,
  toggleKineticistWildTalent,
} from "../src/model/kineticistBuild.js";

function withClass(tag: string, level: number): CharacterDoc {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag, level }] } };
}

describe("kineticistLevel()", () => {
  it("0 for a non-kineticist character", () => {
    expect(kineticistLevel(createEmptyDoc("t"))).toBe(0);
  });

  it("the character's kineticist class level otherwise", () => {
    expect(kineticistLevel(withClass("kineticist", 9))).toBe(9);
  });
});

describe("setKineticistElement / setKineticistExpandedElement", () => {
  it("sets and clears the primary element", () => {
    const d1 = setKineticistElement(withClass("kineticist", 1), "fire");
    expect(d1.build.kineticistElement).toBe("fire");
    const d2 = setKineticistElement(d1, null);
    expect(d2.build.kineticistElement).toBeUndefined();
  });

  it("sets each expanded-element index independently", () => {
    let d = withClass("kineticist", 15);
    d = setKineticistExpandedElement(d, 0, "water");
    expect(d.build.kineticistExpandedElements).toEqual(["water"]);
    d = setKineticistExpandedElement(d, 1, "earth");
    expect(d.build.kineticistExpandedElements).toEqual(["water", "earth"]);
  });

  it("clearing index 0 while index 1 is set keeps index 1's slot in place", () => {
    let d = withClass("kineticist", 15);
    d = setKineticistExpandedElement(d, 0, "water");
    d = setKineticistExpandedElement(d, 1, "earth");
    d = setKineticistExpandedElement(d, 0, null);
    expect(d.build.kineticistExpandedElements).toEqual(["", "earth"]);
  });

  it("clearing the trailing (index 1) slot trims the array back to undefined when both are empty", () => {
    let d = withClass("kineticist", 7);
    d = setKineticistExpandedElement(d, 0, "water");
    d = setKineticistExpandedElement(d, 0, null);
    expect(d.build.kineticistExpandedElements).toBeUndefined();
  });
});

describe("knownKineticistElements", () => {
  it("dedupes primary + expanded picks", () => {
    let d = withClass("kineticist", 15);
    d = setKineticistElement(d, "fire");
    d = setKineticistExpandedElement(d, 0, "water");
    d = setKineticistExpandedElement(d, 1, "fire");
    expect(new Set(knownKineticistElements(d))).toEqual(new Set(["fire", "water"]));
  });

  it("empty for a character with no picks yet", () => {
    expect(knownKineticistElements(withClass("kineticist", 1))).toEqual([]);
  });
});

describe("wild talent toggle + budget math", () => {
  it("toggling adds then removes a talent id, no duplicates on double-add", () => {
    let d = withClass("kineticist", 1);
    expect(hasKineticistWildTalent(d, "fire:burningInfusion")).toBe(false);
    d = toggleKineticistWildTalent(d, "fire:burningInfusion");
    expect(hasKineticistWildTalent(d, "fire:burningInfusion")).toBe(true);
    expect(d.build.kineticistWildTalents).toEqual(["fire:burningInfusion"]);
    d = toggleKineticistWildTalent(d, "fire:burningInfusion");
    expect(hasKineticistWildTalent(d, "fire:burningInfusion")).toBe(false);
    expect(d.build.kineticistWildTalents).toEqual([]);
  });

  it("expected infusion count: 1 at L1, 2 at L3, ... 8 at L19+", () => {
    expect(expectedKineticistTalentCount(withClass("kineticist", 1), "infusion")).toBe(1);
    expect(expectedKineticistTalentCount(withClass("kineticist", 3), "infusion")).toBe(2);
    expect(expectedKineticistTalentCount(withClass("kineticist", 19), "infusion")).toBe(8);
    expect(expectedKineticistTalentCount(withClass("kineticist", 20), "infusion")).toBe(8);
  });

  it("expected utility count: 0 below L2, 1 at L2, 10 at L20", () => {
    expect(expectedKineticistTalentCount(withClass("kineticist", 1), "utility")).toBe(0);
    expect(expectedKineticistTalentCount(withClass("kineticist", 2), "utility")).toBe(1);
    expect(expectedKineticistTalentCount(withClass("kineticist", 20), "utility")).toBe(10);
  });

  it("0 for a non-kineticist regardless of category", () => {
    expect(expectedKineticistTalentCount(createEmptyDoc("t"), "infusion")).toBe(0);
    expect(expectedKineticistTalentCount(createEmptyDoc("t"), "utility")).toBe(0);
  });

  it("chosenKineticistTalentCount only counts ids that resolve to the given category", () => {
    let d = withClass("kineticist", 5);
    d = toggleKineticistWildTalent(d, "fire:burningInfusion"); // infusion
    d = toggleKineticistWildTalent(d, "universal:skilledKineticist"); // utility
    d = toggleKineticistWildTalent(d, "bogus:notReal"); // unresolvable, counts as neither
    expect(chosenKineticistTalentCount(d, "infusion")).toBe(1);
    expect(chosenKineticistTalentCount(d, "utility")).toBe(1);
  });

  it("needs-warning flips true only once the chosen count exceeds the expected count", () => {
    let d = withClass("kineticist", 1); // expects 1 infusion
    expect(kineticistTalentsNeedWarning(d, "infusion")).toBe(false);
    d = toggleKineticistWildTalent(d, "fire:burningInfusion");
    expect(kineticistTalentsNeedWarning(d, "infusion")).toBe(false);
    d = toggleKineticistWildTalent(d, "air:gustingInfusion");
    expect(kineticistTalentsNeedWarning(d, "infusion")).toBe(true);
  });

  it("kineticistTalentBelowLevel soft-flags a talent above the effective-level gate", () => {
    // Chain is air, level 5 -> min kineticist level 2*5=10.
    const d = withClass("kineticist", 3);
    expect(kineticistTalentBelowLevel(d, "air:chain")).toBe(true);
    expect(kineticistTalentBelowLevel(d, "fire:burningInfusion")).toBe(false);
    expect(kineticistTalentBelowLevel(d, "bogus:notReal")).toBe(false);
  });
});
