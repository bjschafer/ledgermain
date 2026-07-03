import { describe, expect, it } from "bun:test";

import { layOnHandsDice } from "../src/index.js";

/**
 * Lay on Hands healing dice. Clean-room from the published PF1 SRD: 1d6 per
 * two paladin levels possessed. The dice formula lives on the class
 * feature's action data upstream, which is outside the vendored
 * `ClassFeature` shape (only `uses.maxFormula` is captured), so this number
 * doesn't come from the pipeline's JSON — same posture as `sneakAttackDice`.
 */
describe("layOnHandsDice", () => {
  it("level 2 paladin (first level with Lay on Hands) → 1d6", () => {
    expect(layOnHandsDice(2)).toEqual({ dice: 1, diceLabel: "1d6" });
  });

  it("level 3 paladin → 1d6 (odd level doesn't bump dice)", () => {
    expect(layOnHandsDice(3)).toEqual({ dice: 1, diceLabel: "1d6" });
  });

  it("level 4 paladin → 2d6", () => {
    expect(layOnHandsDice(4)).toEqual({ dice: 2, diceLabel: "2d6" });
  });

  it("level 20 paladin → 10d6", () => {
    expect(layOnHandsDice(20)).toEqual({ dice: 10, diceLabel: "10d6" });
  });

  it("out-of-range level returns 0 dice", () => {
    expect(layOnHandsDice(0)).toEqual({ dice: 0, diceLabel: "0d6" });
  });
});
