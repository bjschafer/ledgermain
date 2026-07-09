/**
 * Unit tests for `model/occultistImplements.ts` (issue #65 — occultist
 * Implements/Focus Powers/Mental Focus investment). Mirrors
 * `rogueTalents.test.ts`'s budget-math test pattern, plus coverage for the
 * MULTISET implement-school picks (unique among this app's budgeted pickers
 * — see that module's doc comment) and the live Mental Focus investment
 * setters.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  addOccultistImplement,
  chosenOccultistFocusPowerCount,
  chosenOccultistImplementCount,
  expectedOccultistFocusPowerCount,
  expectedOccultistImplementCount,
  hasOccultistFocusPower,
  knownOccultistSchoolTags,
  occultistFocusPowersNeedWarning,
  occultistImplementCount,
  occultistImplementsNeedWarning,
  occultistLevel,
  removeOccultistImplement,
  setOccultistFocusInvested,
  setOccultistPhysicalEnhancementAbility,
  toggleOccultistFocusPower,
  totalOccultistFocusInvested,
} from "../src/model/occultistImplements.js";

const ref = loadRefData();

function extraFocusPowerFeatId(): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === "Extra Focus Power");
  if (!entry) throw new Error("Extra Focus Power feat not found in vendored data");
  return entry[0];
}

function withClass(tag: string, level: number): CharacterDoc {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag, level }] } };
}

describe("occultistLevel()", () => {
  it("0 for a non-occultist character", () => {
    expect(occultistLevel(createEmptyDoc("t"))).toBe(0);
  });

  it("reads the occultist class level", () => {
    expect(occultistLevel(withClass("occultist", 7))).toBe(7);
  });
});

describe("expectedOccultistImplementCount()", () => {
  it("0 below 1st level", () => {
    expect(expectedOccultistImplementCount(createEmptyDoc("t"))).toBe(0);
  });

  it("2 at 1st level, +1 at 2nd/6th/10th/14th/18th", () => {
    expect(expectedOccultistImplementCount(withClass("occultist", 1))).toBe(2);
    expect(expectedOccultistImplementCount(withClass("occultist", 2))).toBe(3);
    expect(expectedOccultistImplementCount(withClass("occultist", 5))).toBe(3);
    expect(expectedOccultistImplementCount(withClass("occultist", 6))).toBe(4);
    expect(expectedOccultistImplementCount(withClass("occultist", 10))).toBe(5);
    expect(expectedOccultistImplementCount(withClass("occultist", 14))).toBe(6);
    expect(expectedOccultistImplementCount(withClass("occultist", 18))).toBe(7);
    expect(expectedOccultistImplementCount(withClass("occultist", 20))).toBe(7);
  });
});

describe("addOccultistImplement() / removeOccultistImplement() — MULTISET semantics", () => {
  it("the same school can be added more than once, each counting toward the budget", () => {
    let d = withClass("occultist", 6);
    d = addOccultistImplement(d, "abjuration");
    d = addOccultistImplement(d, "abjuration");
    d = addOccultistImplement(d, "divination");
    expect(occultistImplementCount(d, "abjuration")).toBe(2);
    expect(occultistImplementCount(d, "divination")).toBe(1);
    expect(chosenOccultistImplementCount(d)).toBe(3);
    // But only 2 DISTINCT schools are "known" — the repeat grants no extra base/resonant power.
    expect(knownOccultistSchoolTags(d).sort()).toEqual(["abjuration", "divination"]);
  });

  it("removeOccultistImplement removes one occurrence, not all", () => {
    let d = withClass("occultist", 6);
    d = addOccultistImplement(d, "abjuration");
    d = addOccultistImplement(d, "abjuration");
    d = removeOccultistImplement(d, "abjuration");
    expect(occultistImplementCount(d, "abjuration")).toBe(1);
    expect(knownOccultistSchoolTags(d)).toEqual(["abjuration"]);
  });

  it("removing from an empty multiset is a no-op", () => {
    const d = withClass("occultist", 1);
    const d2 = removeOccultistImplement(d, "abjuration");
    expect(d2).toBe(d);
  });
});

describe("occultistImplementsNeedWarning()", () => {
  it("false at or under budget, true when over", () => {
    let d = withClass("occultist", 1); // expects 2
    d = addOccultistImplement(d, "abjuration");
    d = addOccultistImplement(d, "divination");
    expect(occultistImplementsNeedWarning(d)).toBe(false);
    d = addOccultistImplement(d, "enchantment");
    expect(occultistImplementsNeedWarning(d)).toBe(true);
  });
});

describe("toggleOccultistFocusPower() / chosenOccultistFocusPowerCount()", () => {
  it("adds then removes a focus power", () => {
    let d = withClass("occultist", 1);
    d = addOccultistImplement(d, "abjuration");
    d = toggleOccultistFocusPower(d, "abjuration:aegis");
    expect(hasOccultistFocusPower(d, "abjuration:aegis")).toBe(true);
    expect(chosenOccultistFocusPowerCount(d)).toBe(1);
    d = toggleOccultistFocusPower(d, "abjuration:aegis");
    expect(hasOccultistFocusPower(d, "abjuration:aegis")).toBe(false);
    expect(chosenOccultistFocusPowerCount(d)).toBe(0);
  });

  it("a focus power from a since-abandoned school doesn't count toward the chosen total", () => {
    let d = withClass("occultist", 1);
    d = addOccultistImplement(d, "abjuration");
    d = toggleOccultistFocusPower(d, "abjuration:aegis");
    d = removeOccultistImplement(d, "abjuration"); // school abandoned, pick left dangling
    expect(hasOccultistFocusPower(d, "abjuration:aegis")).toBe(true); // still stored
    expect(chosenOccultistFocusPowerCount(d)).toBe(0); // but not counted
  });
});

describe("expectedOccultistFocusPowerCount()", () => {
  it("1 at 1st level, +1 at 3rd/5th/.../19th", () => {
    expect(expectedOccultistFocusPowerCount(withClass("occultist", 1), ref)).toBe(1);
    expect(expectedOccultistFocusPowerCount(withClass("occultist", 2), ref)).toBe(1);
    expect(expectedOccultistFocusPowerCount(withClass("occultist", 3), ref)).toBe(2);
    expect(expectedOccultistFocusPowerCount(withClass("occultist", 19), ref)).toBe(10);
    expect(expectedOccultistFocusPowerCount(withClass("occultist", 20), ref)).toBe(10);
  });

  it("+1 per 'Extra Focus Power' feat, counted by occurrence", () => {
    const featId = extraFocusPowerFeatId();
    const base = withClass("occultist", 3); // expects 2
    const withOne = { ...base, build: { ...base.build, feats: [featId] } };
    expect(expectedOccultistFocusPowerCount(withOne, ref)).toBe(3);
    const withTwo = { ...base, build: { ...base.build, feats: [featId, featId] } };
    expect(expectedOccultistFocusPowerCount(withTwo, ref)).toBe(4);
  });
});

describe("occultistFocusPowersNeedWarning()", () => {
  it("false at or under budget, true when over", () => {
    let d = withClass("occultist", 1); // expects 1
    d = addOccultistImplement(d, "abjuration");
    d = toggleOccultistFocusPower(d, "abjuration:aegis");
    expect(occultistFocusPowersNeedWarning(d, ref)).toBe(false);
    d = toggleOccultistFocusPower(d, "abjuration:planar-ward");
    expect(occultistFocusPowersNeedWarning(d, ref)).toBe(true);
  });
});

describe("setOccultistFocusInvested() / totalOccultistFocusInvested()", () => {
  it("sets, clamps negative to 0, and removes the key entirely at 0", () => {
    let d = withClass("occultist", 5);
    d = setOccultistFocusInvested(d, "abjuration", 4);
    expect(d.live.occultistFocusInvested).toEqual({ abjuration: 4 });
    d = setOccultistFocusInvested(d, "divination", -3);
    expect(d.live.occultistFocusInvested).toEqual({ abjuration: 4 });
    d = setOccultistFocusInvested(d, "abjuration", 0);
    expect(d.live.occultistFocusInvested).toEqual({});
  });

  it("totalOccultistFocusInvested sums across every school", () => {
    let d = withClass("occultist", 5);
    d = setOccultistFocusInvested(d, "abjuration", 3);
    d = setOccultistFocusInvested(d, "divination", 2);
    expect(totalOccultistFocusInvested(d)).toBe(5);
  });
});

describe("setOccultistPhysicalEnhancementAbility()", () => {
  it("sets the target ability", () => {
    const d = setOccultistPhysicalEnhancementAbility(withClass("occultist", 6), "dex");
    expect(d.live.occultistPhysicalEnhancementAbility).toBe("dex");
  });
});
