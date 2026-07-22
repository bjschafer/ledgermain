/**
 * Unit tests for `model/slayerTalents.ts` (issue #74 Phase 3b). Mirrors
 * `rogueTalents.test.ts`'s budget-math test pattern.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  chosenSlayerTalentCount,
  expectedSlayerTalentCount,
  hasSlayerTalent,
  slayerLevel,
  slayerTalentsNeedWarning,
  toggleSlayerTalent,
} from "../src/model/slayerTalents.js";

const ref = loadRefData();

function extraSlayerTalentFeatId(): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === "Extra Slayer Talent");
  if (!entry) throw new Error("Extra Slayer Talent feat not found in vendored data");
  return entry[0];
}

function withClass(tag: string, level: number): CharacterDoc {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag, level }] } };
}

describe("slayerLevel()", () => {
  it("0 for a non-slayer character", () => {
    expect(slayerLevel(createEmptyDoc("t"))).toBe(0);
  });

  it("reads the slayer class level", () => {
    expect(slayerLevel(withClass("slayer", 5))).toBe(5);
  });
});

describe("expectedSlayerTalentCount()", () => {
  it("0 below 2nd level", () => {
    expect(expectedSlayerTalentCount(withClass("slayer", 1), ref)).toBe(0);
  });

  it("1 at 2nd level, +1 every 2 levels thereafter", () => {
    expect(expectedSlayerTalentCount(withClass("slayer", 2), ref)).toBe(1);
    expect(expectedSlayerTalentCount(withClass("slayer", 3), ref)).toBe(1);
    expect(expectedSlayerTalentCount(withClass("slayer", 4), ref)).toBe(2);
    expect(expectedSlayerTalentCount(withClass("slayer", 20), ref)).toBe(10);
  });

  it("+1 per 'Extra Slayer Talent' feat, counted by occurrence in build.feats", () => {
    const featId = extraSlayerTalentFeatId();
    const base = withClass("slayer", 4); // expects 2
    const withOneExtra = { ...base, build: { ...base.build, feats: [featId] } };
    expect(expectedSlayerTalentCount(withOneExtra, ref)).toBe(3);
    const withTwoExtra = { ...base, build: { ...base.build, feats: [featId, featId] } };
    expect(expectedSlayerTalentCount(withTwoExtra, ref)).toBe(4);
  });
});

describe("toggleSlayerTalent() / chosenSlayerTalentCount() / hasSlayerTalent()", () => {
  it("adds then removes a talent", () => {
    const d0 = withClass("slayer", 2);
    const d1 = toggleSlayerTalent(d0, "poison_use");
    expect(hasSlayerTalent(d1, "poison_use")).toBe(true);
    expect(chosenSlayerTalentCount(d1)).toBe(1);
    const d2 = toggleSlayerTalent(d1, "poison_use");
    expect(hasSlayerTalent(d2, "poison_use")).toBe(false);
  });
});

describe("slayerTalentsNeedWarning()", () => {
  it("false when at or under budget, true when over", () => {
    const atBudget = toggleSlayerTalent(withClass("slayer", 2), "poison_use");
    expect(slayerTalentsNeedWarning(atBudget, ref)).toBe(false);
    const overBudget = toggleSlayerTalent(atBudget, "trapfinding");
    expect(slayerTalentsNeedWarning(overBudget, ref)).toBe(true);
  });
});
