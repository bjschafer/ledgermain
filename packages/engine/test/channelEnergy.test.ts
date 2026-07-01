import { describe, expect, it } from "bun:test";

import { channelEnergyDetail } from "../src/index.js";

/**
 * Channel-energy dice + save-DC scaling. Clean-room from the published PF1
 * rules: 1d6 at L1, +1d6 per 2 cleric levels beyond 1st; DC = 10 + ½ level +
 * Cha mod. Upstream `changes[]` is prose-only, so these numbers don't come from
 * the vendored data.
 */
describe("channelEnergyDetail", () => {
  it("level 1 cleric, Cha +2 → 1d6, DC 12", () => {
    expect(channelEnergyDetail(1, 2)).toEqual({ dice: 1, diceLabel: "1d6", saveDC: 12 });
  });

  it("level 3 cleric, Cha +3 → 2d6, DC 14 (+1 for level, +3 Cha)", () => {
    expect(channelEnergyDetail(3, 3)).toEqual({ dice: 2, diceLabel: "2d6", saveDC: 14 });
  });

  it("level 5 cleric, Cha +0 → 3d6, DC 12", () => {
    expect(channelEnergyDetail(5, 0)).toEqual({ dice: 3, diceLabel: "3d6", saveDC: 12 });
  });

  it("level 5 cleric with negative Cha (-2) → 3d6, DC 10", () => {
    expect(channelEnergyDetail(5, -2)).toEqual({ dice: 3, diceLabel: "3d6", saveDC: 10 });
  });

  it("level 19 cleric, Cha +5 → 10d6, DC 24 (10 + 9 + 5)", () => {
    expect(channelEnergyDetail(19, 5)).toEqual({ dice: 10, diceLabel: "10d6", saveDC: 24 });
  });

  it("level 20 cleric, Cha +5 → 10d6 (even level doesn't bump dice), DC 25", () => {
    // L20: floor((20+1)/2) = 10 (same as L19); DC = 10 + 10 + 5 = 25.
    expect(channelEnergyDetail(20, 5)).toEqual({ dice: 10, diceLabel: "10d6", saveDC: 25 });
  });

  it("out-of-range level returns 0 dice and a baseline DC", () => {
    const ch = channelEnergyDetail(0, 3);
    expect(ch.dice).toBe(0);
    expect(ch.saveDC).toBeGreaterThanOrEqual(10);
  });
});