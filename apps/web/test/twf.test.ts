import { describe, expect, it } from "bun:test";

import type { ResolvedWeaponAttack } from "@pf1/schema";
import { offHandAbilityDelta } from "../src/model/twf.js";

const atk = (damageAbilityMod: number, damageMultiplier?: number): ResolvedWeaponAttack =>
  ({ damageAbilityMod, damageMultiplier }) as ResolvedWeaponAttack;

describe("offHandAbilityDelta", () => {
  it("halves a Str bonus for the off hand (×1 entry -> ×0.5)", () => {
    expect(offHandAbilityDelta(atk(4), 0.5)).toBe(-2);
  });

  it("restores full Str with Double Slice (×1)", () => {
    expect(offHandAbilityDelta(atk(4), 1)).toBe(0);
  });

  it("backs out a two-handed ×1.5 entry", () => {
    expect(offHandAbilityDelta(atk(4, 1.5), 0.5)).toBe(2 - 6);
  });

  it("never scales a Str penalty: full penalty applies in both terms", () => {
    // Str 5 (mod -3): engine applies -3 unscaled; off-hand keeps the full -3.
    expect(offHandAbilityDelta(atk(-3), 0.5)).toBe(0);
    expect(offHandAbilityDelta(atk(-3, 1.5), 0.5)).toBe(0);
  });
});
