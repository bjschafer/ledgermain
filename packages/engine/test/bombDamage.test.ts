import { describe, expect, it } from "bun:test";

import { bombDamageDetail } from "../src/index.js";

/**
 * Alchemist bomb damage scaling (issue #65). Clean-room from the published
 * PF1 APG SRD: "1d6 fire damage + additional damage equal to the
 * alchemist's Intelligence modifier... increases by 1d6 points at every
 * odd-numbered alchemist level." The vendored Bomb `action.damage` formula
 * is a flat, non-scaling "1d6" — this number doesn't come from vendored
 * data.
 */
describe("bombDamageDetail", () => {
  it("level 1 alchemist, Int 0 — 1d6 fire", () => {
    expect(bombDamageDetail(1, 0)).toEqual({ dice: 1, damageLabel: "1d6 fire" });
  });

  it("level 1 alchemist, Int +3 — 1d6+3 fire", () => {
    expect(bombDamageDetail(1, 3)).toEqual({ dice: 1, damageLabel: "1d6+3 fire" });
  });

  it("level 2 alchemist — still 1d6 (even level doesn't bump dice)", () => {
    expect(bombDamageDetail(2, 0)).toEqual({ dice: 1, damageLabel: "1d6 fire" });
  });

  it("level 3 alchemist — 2d6 fire", () => {
    expect(bombDamageDetail(3, 0)).toEqual({ dice: 2, damageLabel: "2d6 fire" });
  });

  it("level 19 alchemist — 10d6 fire", () => {
    expect(bombDamageDetail(19, 0)).toEqual({ dice: 10, damageLabel: "10d6 fire" });
  });

  it("a negative Int mod subtracts from the flat addend", () => {
    expect(bombDamageDetail(1, -2)).toEqual({ dice: 1, damageLabel: "1d6-2 fire" });
  });

  it("out-of-range level returns 0 dice", () => {
    expect(bombDamageDetail(0, 3)).toEqual({ dice: 0, damageLabel: "0d6 fire" });
  });
});
