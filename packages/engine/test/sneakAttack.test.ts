import { describe, expect, it } from "bun:test";

import { sneakAttackDice } from "../src/index.js";

/**
 * Sneak-attack dice scaling. Clean-room from the published PF1 SRD: 1d6 at
 * L1, +1d6 per 2 rogue levels thereafter. Upstream `changes[]` is prose-only,
 * so this number doesn't come from the vendored data.
 */
describe("sneakAttackDice", () => {
  it("level 1 rogue → 1d6", () => {
    expect(sneakAttackDice(1)).toEqual({ dice: 1, diceLabel: "1d6" });
  });

  it("level 2 rogue → 1d6 (even level doesn't bump dice)", () => {
    expect(sneakAttackDice(2)).toEqual({ dice: 1, diceLabel: "1d6" });
  });

  it("level 3 rogue → 2d6", () => {
    expect(sneakAttackDice(3)).toEqual({ dice: 2, diceLabel: "2d6" });
  });

  it("level 5 rogue → 3d6", () => {
    expect(sneakAttackDice(5)).toEqual({ dice: 3, diceLabel: "3d6" });
  });

  it("level 20 rogue → 10d6", () => {
    expect(sneakAttackDice(20)).toEqual({ dice: 10, diceLabel: "10d6" });
  });

  it("out-of-range level returns 0 dice", () => {
    expect(sneakAttackDice(0)).toEqual({ dice: 0, diceLabel: "0d6" });
  });
});
