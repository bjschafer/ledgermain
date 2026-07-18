/**
 * Unit tests for the PF1 point-buy calculator (issue #86): hand-computed
 * fixtures against the CRB purchase-cost table (score 7-18 -> cost).
 */
import { describe, expect, it } from "bun:test";

import {
  POINT_BUY_BUDGETS,
  POINT_BUY_MAX_SCORE,
  POINT_BUY_MIN_SCORE,
  pointBuyCost,
  totalPointBuyCost,
} from "../src/model/pointBuy.js";

describe("pointBuyCost()", () => {
  it("matches the PF1 Core Rulebook purchase table exactly", () => {
    expect(pointBuyCost(7)).toBe(-4);
    expect(pointBuyCost(8)).toBe(-2);
    expect(pointBuyCost(9)).toBe(-1);
    expect(pointBuyCost(10)).toBe(0);
    expect(pointBuyCost(11)).toBe(1);
    expect(pointBuyCost(12)).toBe(2);
    expect(pointBuyCost(13)).toBe(3);
    expect(pointBuyCost(14)).toBe(5);
    expect(pointBuyCost(15)).toBe(7);
    expect(pointBuyCost(16)).toBe(10);
    expect(pointBuyCost(17)).toBe(13);
    expect(pointBuyCost(18)).toBe(17);
  });

  it("returns null below the priced range", () => {
    expect(pointBuyCost(6)).toBeNull();
    expect(pointBuyCost(1)).toBeNull();
    expect(pointBuyCost(0)).toBeNull();
    expect(pointBuyCost(-5)).toBeNull();
  });

  it("returns null above the priced range", () => {
    expect(pointBuyCost(19)).toBeNull();
    expect(pointBuyCost(25)).toBeNull();
  });

  it("exposes the priced range bounds", () => {
    expect(POINT_BUY_MIN_SCORE).toBe(7);
    expect(POINT_BUY_MAX_SCORE).toBe(18);
  });
});

describe("totalPointBuyCost()", () => {
  it("computes a classic 15-point standard array", () => {
    // 14/14/14/10/10/8 -> 5+5+5+0+0-2 = 13 (under a 15-point budget)
    const result = totalPointBuyCost({
      str: 14,
      dex: 14,
      con: 14,
      int: 10,
      wis: 10,
      cha: 8,
    });
    expect(result.spent).toBe(13);
    expect(result.outOfRange).toEqual([]);
  });

  it("computes an all-10s array as exactly 0 points spent", () => {
    const result = totalPointBuyCost({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    expect(result.spent).toBe(0);
    expect(result.outOfRange).toEqual([]);
  });

  it("computes a maxed-out 25-point-budget-busting array", () => {
    // 18/14/14/10/10/10 -> 17+5+5+0+0+0 = 27
    const result = totalPointBuyCost({
      str: 18,
      dex: 14,
      con: 14,
      int: 10,
      wis: 10,
      cha: 10,
    });
    expect(result.spent).toBe(27);
    expect(result.outOfRange).toEqual([]);
  });

  it("reports out-of-range abilities instead of extrapolating a cost", () => {
    const result = totalPointBuyCost({
      str: 20,
      dex: 3,
      con: 14,
      int: 10,
      wis: 10,
      cha: 10,
    });
    // str=20 and dex=3 are both outside 7-18; only con/int/wis/cha are priced: 5+0+0+0 = 5
    expect(result.spent).toBe(5);
    expect(result.outOfRange).toEqual(["str", "dex"]);
  });

  it("prices the full 7-18 range with no out-of-range entries", () => {
    const result = totalPointBuyCost({ str: 7, dex: 18, con: 12, int: 12, wis: 12, cha: 12 });
    expect(result.outOfRange).toEqual([]);
    // -4 + 17 + 2+2+2+2 = 21
    expect(result.spent).toBe(21);
  });
});

describe("POINT_BUY_BUDGETS", () => {
  it("exposes the four standard PF1 budgets in ascending order", () => {
    expect(POINT_BUY_BUDGETS.map((b) => b.points)).toEqual([10, 15, 20, 25]);
  });
});
