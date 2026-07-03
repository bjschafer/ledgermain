import { describe, expect, it } from "bun:test";

import { flurryOfBlowsLabel, unarmedDamageDie } from "../src/index.js";

/**
 * Monk unarmed strike damage die progression. Clean-room from the published
 * PF1 SRD "Table: Monk Unarmed Damage" (Medium column only). Upstream's
 * `description` embeds the full table as prose and the feature's own action
 * formula is dice-bearing (`sizeRoll(...)`), neither of which this engine's
 * formula DSL numerically evaluates, so this number doesn't come from the
 * vendored data.
 */
describe("unarmedDamageDie", () => {
  it("level 1 monk -> 1d6", () => {
    expect(unarmedDamageDie(1)).toEqual({ dieLabel: "1d6" });
  });

  it("level 3 monk -> 1d6 (top of the first tier)", () => {
    expect(unarmedDamageDie(3)).toEqual({ dieLabel: "1d6" });
  });

  it("level 4 monk -> 1d8", () => {
    expect(unarmedDamageDie(4)).toEqual({ dieLabel: "1d8" });
  });

  it("level 7 monk -> 1d8 (top of the second tier)", () => {
    expect(unarmedDamageDie(7)).toEqual({ dieLabel: "1d8" });
  });

  it("level 8 monk -> 1d10", () => {
    expect(unarmedDamageDie(8)).toEqual({ dieLabel: "1d10" });
  });

  it("level 11 monk -> 1d10 (top of the third tier)", () => {
    expect(unarmedDamageDie(11)).toEqual({ dieLabel: "1d10" });
  });

  it("level 12 monk -> 2d6", () => {
    expect(unarmedDamageDie(12)).toEqual({ dieLabel: "2d6" });
  });

  it("level 15 monk -> 2d6 (top of the fourth tier)", () => {
    expect(unarmedDamageDie(15)).toEqual({ dieLabel: "2d6" });
  });

  it("level 16 monk -> 2d8", () => {
    expect(unarmedDamageDie(16)).toEqual({ dieLabel: "2d8" });
  });

  it("level 19 monk -> 2d8 (top of the fifth tier)", () => {
    expect(unarmedDamageDie(19)).toEqual({ dieLabel: "2d8" });
  });

  it("level 20 monk -> 2d10", () => {
    expect(unarmedDamageDie(20)).toEqual({ dieLabel: "2d10" });
  });

  it("out-of-range level clamps to the L1-3 tier", () => {
    expect(unarmedDamageDie(0)).toEqual({ dieLabel: "1d6" });
  });
});

/**
 * Monk Flurry of Blows display summary. Clean-room from the published PF1
 * SRD: 1 extra attack at 1st level (2 attacks total), a 2nd extra attack at
 * 8th level (3 attacks total), a 3rd extra attack at 15th level (4 attacks
 * total), all at a flat -2 using monk level in place of true BAB. Display
 * only — not wired into the live attacks/iteratives table.
 */
describe("flurryOfBlowsLabel", () => {
  it("level 1 monk -> 2 attacks at -2", () => {
    expect(flurryOfBlowsLabel(1)).toBe("2 attacks at -2 (BAB = monk level)");
  });

  it("level 7 monk -> 2 attacks at -2 (top of the first tier)", () => {
    expect(flurryOfBlowsLabel(7)).toBe("2 attacks at -2 (BAB = monk level)");
  });

  it("level 8 monk -> 3 attacks at -2", () => {
    expect(flurryOfBlowsLabel(8)).toBe("3 attacks at -2 (BAB = monk level)");
  });

  it("level 14 monk -> 3 attacks at -2 (top of the second tier)", () => {
    expect(flurryOfBlowsLabel(14)).toBe("3 attacks at -2 (BAB = monk level)");
  });

  it("level 15 monk -> 4 attacks at -2", () => {
    expect(flurryOfBlowsLabel(15)).toBe("4 attacks at -2 (BAB = monk level)");
  });

  it("out-of-range level returns an empty string", () => {
    expect(flurryOfBlowsLabel(0)).toBe("");
  });
});
