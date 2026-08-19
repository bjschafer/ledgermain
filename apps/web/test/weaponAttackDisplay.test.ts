/**
 * Unit tests for `model/weaponAttackDisplay.ts` — the shared sub-line string
 * the on-screen sheet and the print sheet both render for a weapon attack's
 * range increment / firearm misfire / capacity / touch-AC band.
 */
import { describe, expect, it } from "bun:test";

import type { ResolvedWeaponAttack } from "@pf1/schema";

import { misfireRangeLabel, weaponAttackSubLine } from "../src/model/weaponAttackDisplay.js";

function attack(overrides: Partial<ResolvedWeaponAttack> = {}): ResolvedWeaponAttack {
  return {
    name: "Test Weapon",
    category: "melee",
    attack: { total: 0, components: [] },
    damageBonus: { total: 0, components: [] },
    crit: "×2",
    ...overrides,
  } as ResolvedWeaponAttack;
}

describe("misfireRangeLabel()", () => {
  it("renders a bare '1' when misfire is 1 (never '1-1')", () => {
    expect(misfireRangeLabel(1)).toBe("1");
  });

  it("renders '1-N' for N > 1, with a plain hyphen", () => {
    expect(misfireRangeLabel(2)).toBe("1-2");
    expect(misfireRangeLabel(3)).toBe("1-3");
  });
});

describe("weaponAttackSubLine()", () => {
  it("is null for a plain melee weapon with no range/firearm data", () => {
    expect(weaponAttackSubLine(attack())).toBeNull();
  });

  it("shows the range increment for a ranged weapon", () => {
    const line = weaponAttackSubLine(attack({ category: "ranged", rangeIncrement: 110 }));
    expect(line).toBe("Range 110 ft");
  });

  it("omits range for a melee weapon even if rangeIncrement is somehow set", () => {
    const line = weaponAttackSubLine(attack({ category: "melee", rangeIncrement: 110 }));
    expect(line).toBeNull();
  });

  it("combines range, misfire, capacity, and touch band for a full firearm line", () => {
    const line = weaponAttackSubLine(
      attack({
        category: "ranged",
        rangeIncrement: 20,
        firearm: { misfire: 1, capacity: 6, touchRangeFt: 100 },
      }),
    );
    expect(line).toBe("Range 20 ft · Misfire 1 · Capacity 6 · vs. touch AC within 100 ft");
  });

  it("renders 'Misfire 1-2' (plain hyphen) for a misfire range of 2, never an en/em dash", () => {
    const line = weaponAttackSubLine(attack({ category: "ranged", firearm: { misfire: 2 } }));
    expect(line).toBe("Misfire 1-2");
    expect(line).not.toMatch(/[—–]/);
  });

  it("only shows the firearm fields that are actually present", () => {
    const line = weaponAttackSubLine(attack({ category: "ranged", firearm: { capacity: 6 } }));
    expect(line).toBe("Capacity 6");
  });
});
