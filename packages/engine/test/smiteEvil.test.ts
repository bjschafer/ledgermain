import { describe, expect, it } from "bun:test";

import { smiteEvilDetail } from "../src/index.js";

/**
 * Smite Evil attack/damage/AC scaling. Clean-room from the published PF1
 * SRD: "(if any)" Cha bonus to attack and to the deflection AC bonus (floors
 * at 0 for a negative modifier), flat paladin-level damage bonus. Upstream
 * `changes[]` is prose-only, so these numbers don't come from the vendored
 * data (only the `uses.maxFormula` use-count is vendored).
 */
describe("smiteEvilDetail", () => {
  it("level 5 paladin, Cha +3 → +3 atk, +5 dmg, +3 AC", () => {
    expect(smiteEvilDetail(5, 3)).toEqual({ attackBonus: 3, damageBonus: 5, acBonus: 3 });
  });

  it("level 1 paladin, Cha +0 → +0 atk, +1 dmg, +0 AC", () => {
    expect(smiteEvilDetail(1, 0)).toEqual({ attackBonus: 0, damageBonus: 1, acBonus: 0 });
  });

  it("negative Cha modifier floors the attack/AC bonus at 0 (damage is unaffected)", () => {
    expect(smiteEvilDetail(10, -2)).toEqual({ attackBonus: 0, damageBonus: 10, acBonus: 0 });
  });

  it("level 20 paladin, Cha +5 → +5 atk, +20 dmg, +5 AC", () => {
    expect(smiteEvilDetail(20, 5)).toEqual({ attackBonus: 5, damageBonus: 20, acBonus: 5 });
  });

  it("out-of-range level returns all-zero bonuses", () => {
    expect(smiteEvilDetail(0, 4)).toEqual({ attackBonus: 0, damageBonus: 0, acBonus: 0 });
  });
});
