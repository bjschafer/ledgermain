/**
 * Unit tests for `model/monkKiPowers.ts` (issue #65 — previously deferred
 * Monk (Unchained) Ki Powers). Mirrors the `witchHexes`/`magusArcana` budget-
 * math test pattern.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  chosenMonkKiPowerCount,
  expectedMonkKiPowerCount,
  hasMonkKiPower,
  monkKiPowersNeedWarning,
  monkUnchainedLevel,
  toggleMonkKiPower,
} from "../src/model/monkKiPowers.js";

function withLevel(level: number) {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag: "monkUnchained", level }] } };
}

describe("monkUnchainedLevel()", () => {
  it("0 for a non-monkUnchained character", () => {
    expect(monkUnchainedLevel(createEmptyDoc("t"))).toBe(0);
  });
});

describe("expectedMonkKiPowerCount()", () => {
  it("0 below 4th level", () => {
    expect(expectedMonkKiPowerCount(withLevel(1))).toBe(0);
    expect(expectedMonkKiPowerCount(withLevel(3))).toBe(0);
  });

  it("1 at 4th level, +1 every 2 levels thereafter", () => {
    expect(expectedMonkKiPowerCount(withLevel(4))).toBe(1);
    expect(expectedMonkKiPowerCount(withLevel(5))).toBe(1);
    expect(expectedMonkKiPowerCount(withLevel(6))).toBe(2);
    expect(expectedMonkKiPowerCount(withLevel(20))).toBe(9);
  });
});

describe("toggleMonkKiPower() / chosenMonkKiPowerCount() / hasMonkKiPower()", () => {
  it("adds then removes a power", () => {
    const d0 = withLevel(4);
    expect(hasMonkKiPower(d0, "wholenessOfBody")).toBe(false);
    const d1 = toggleMonkKiPower(d0, "wholenessOfBody");
    expect(hasMonkKiPower(d1, "wholenessOfBody")).toBe(true);
    expect(chosenMonkKiPowerCount(d1)).toBe(1);
    const d2 = toggleMonkKiPower(d1, "wholenessOfBody");
    expect(hasMonkKiPower(d2, "wholenessOfBody")).toBe(false);
    expect(chosenMonkKiPowerCount(d2)).toBe(0);
  });

  it("adding two distinct powers accumulates them", () => {
    const d = toggleMonkKiPower(toggleMonkKiPower(withLevel(4), "highJump"), "suddenSpeed");
    expect(chosenMonkKiPowerCount(d)).toBe(2);
  });
});

describe("monkKiPowersNeedWarning()", () => {
  it("false when at or under budget, true when over", () => {
    const atBudget = toggleMonkKiPower(withLevel(4), "highJump");
    expect(monkKiPowersNeedWarning(atBudget)).toBe(false);
    const overBudget = toggleMonkKiPower(atBudget, "suddenSpeed");
    expect(monkKiPowersNeedWarning(overBudget)).toBe(true);
  });
});
