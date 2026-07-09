/**
 * Unit tests for `model/rogueTalents.ts` (issue #65 — previously deferred
 * Rogue Talents, shared between the chained rogue and Rogue (Unchained)).
 * Mirrors `magusArcana.test.ts`'s budget-math test pattern.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  chosenRogueTalentCount,
  expectedRogueTalentCount,
  hasRogueTalent,
  rogueLevel,
  rogueTalentsNeedWarning,
  toggleRogueTalent,
} from "../src/model/rogueTalents.js";

const ref = loadRefData();

function extraRogueTalentFeatId(): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === "Extra Rogue Talent");
  if (!entry) throw new Error("Extra Rogue Talent feat not found in vendored data");
  return entry[0];
}

function withClass(tag: string, level: number): CharacterDoc {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag, level }] } };
}

describe("rogueLevel()", () => {
  it("0 for a non-rogue character", () => {
    expect(rogueLevel(createEmptyDoc("t"))).toBe(0);
  });

  it("reads either 'rogue' or 'rogueUnchained'", () => {
    expect(rogueLevel(withClass("rogue", 5))).toBe(5);
    expect(rogueLevel(withClass("rogueUnchained", 7))).toBe(7);
  });
});

describe("expectedRogueTalentCount()", () => {
  it("0 below 2nd level", () => {
    expect(expectedRogueTalentCount(withClass("rogue", 1), ref)).toBe(0);
  });

  it("1 at 2nd level, +1 every 2 levels thereafter", () => {
    expect(expectedRogueTalentCount(withClass("rogue", 2), ref)).toBe(1);
    expect(expectedRogueTalentCount(withClass("rogue", 3), ref)).toBe(1);
    expect(expectedRogueTalentCount(withClass("rogue", 4), ref)).toBe(2);
    expect(expectedRogueTalentCount(withClass("rogueUnchained", 20), ref)).toBe(10);
  });

  it("+1 per 'Extra Rogue Talent' feat, counted by occurrence in build.feats", () => {
    const featId = extraRogueTalentFeatId();
    const base = withClass("rogue", 4); // expects 2
    const withOneExtra = { ...base, build: { ...base.build, feats: [featId] } };
    expect(expectedRogueTalentCount(withOneExtra, ref)).toBe(3);
    // Two occurrences in build.feats (same "counted by OCCURRENCE, not
    // presence" convention `expectedWitchHexCount`'s `extraHexFeatCount` uses).
    const withTwoExtra = { ...base, build: { ...base.build, feats: [featId, featId] } };
    expect(expectedRogueTalentCount(withTwoExtra, ref)).toBe(4);
  });
});

describe("toggleRogueTalent() / chosenRogueTalentCount() / hasRogueTalent()", () => {
  it("adds then removes a talent", () => {
    const d0 = withClass("rogue", 2);
    const d1 = toggleRogueTalent(d0, "trapSpotter");
    expect(hasRogueTalent(d1, "trapSpotter")).toBe(true);
    expect(chosenRogueTalentCount(d1)).toBe(1);
    const d2 = toggleRogueTalent(d1, "trapSpotter");
    expect(hasRogueTalent(d2, "trapSpotter")).toBe(false);
  });
});

describe("rogueTalentsNeedWarning()", () => {
  it("false when at or under budget, true when over", () => {
    const atBudget = toggleRogueTalent(withClass("rogue", 2), "trapSpotter");
    expect(rogueTalentsNeedWarning(atBudget, ref)).toBe(false);
    const overBudget = toggleRogueTalent(atBudget, "fastStealth");
    expect(rogueTalentsNeedWarning(overBudget, ref)).toBe(true);
  });
});
