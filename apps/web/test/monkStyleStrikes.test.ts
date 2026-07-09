/**
 * Unit tests for `model/monkStyleStrikes.ts` (issue #65 — previously
 * deferred Monk (Unchained) Style Strikes).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  chosenMonkStyleStrikeCount,
  expectedMonkStyleStrikeCount,
  hasMonkStyleStrike,
  monkStyleStrikesNeedWarning,
  toggleMonkStyleStrike,
} from "../src/model/monkStyleStrikes.js";

function withLevel(level: number) {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag: "monkUnchained", level }] } };
}

describe("expectedMonkStyleStrikeCount()", () => {
  it("0 below 5th level", () => {
    expect(expectedMonkStyleStrikeCount(withLevel(4))).toBe(0);
  });

  it("1 at 5th, 2 at 9th, 3 at 13th, 4 at 17th and beyond", () => {
    expect(expectedMonkStyleStrikeCount(withLevel(5))).toBe(1);
    expect(expectedMonkStyleStrikeCount(withLevel(8))).toBe(1);
    expect(expectedMonkStyleStrikeCount(withLevel(9))).toBe(2);
    expect(expectedMonkStyleStrikeCount(withLevel(13))).toBe(3);
    expect(expectedMonkStyleStrikeCount(withLevel(17))).toBe(4);
    expect(expectedMonkStyleStrikeCount(withLevel(20))).toBe(4);
  });
});

describe("toggleMonkStyleStrike() / chosenMonkStyleStrikeCount() / hasMonkStyleStrike()", () => {
  it("adds then removes a strike", () => {
    const d0 = withLevel(5);
    const d1 = toggleMonkStyleStrike(d0, "hammerblow");
    expect(hasMonkStyleStrike(d1, "hammerblow")).toBe(true);
    expect(chosenMonkStyleStrikeCount(d1)).toBe(1);
    const d2 = toggleMonkStyleStrike(d1, "hammerblow");
    expect(hasMonkStyleStrike(d2, "hammerblow")).toBe(false);
  });
});

describe("monkStyleStrikesNeedWarning()", () => {
  it("false when at or under budget, true when over", () => {
    const atBudget = toggleMonkStyleStrike(withLevel(5), "hammerblow");
    expect(monkStyleStrikesNeedWarning(atBudget)).toBe(false);
    const overBudget = toggleMonkStyleStrike(atBudget, "legSweep");
    expect(monkStyleStrikesNeedWarning(overBudget)).toBe(true);
  });
});
