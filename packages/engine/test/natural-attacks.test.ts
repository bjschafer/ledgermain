import { describe, expect, it } from "bun:test";

import {
  classifyNaturalAttacks,
  naturalAttackBonus,
  naturalAttackDamageBonus,
  secondaryAttackPenalty,
} from "../src/natural-attacks.js";

describe("classifyNaturalAttacks", () => {
  it("a single distinct attack form is always primary, regardless of count", () => {
    const [hoof1, hoof2] = classifyNaturalAttacks([
      { name: "Hoof", count: 2 },
      { name: "Hoof", count: 2 },
    ]);
    expect(hoof1!.attackType).toBe("primary");
    expect(hoof2!.attackType).toBe("primary");
  });

  it("bite + claws: bite (first-listed, primary-type) stays primary, claw is downgraded to secondary", () => {
    const [bite, claw] = classifyNaturalAttacks([
      { name: "Bite", count: 1 },
      { name: "Claw", count: 2 },
    ]);
    expect(bite!.attackType).toBe("primary");
    expect(claw!.attackType).toBe("secondary");
  });

  it("bite + tail slap: tail slap is secondary-type by name, regardless of order", () => {
    const [bite, tailSlap] = classifyNaturalAttacks([
      { name: "Bite", count: 1 },
      { name: "Tail slap", count: 1 },
    ]);
    expect(bite!.attackType).toBe("primary");
    expect(tailSlap!.attackType).toBe("secondary");
  });

  it("a secondary-type-only entry preceding a primary-type one still lets the primary-type one claim primary", () => {
    const [tailSlap, bite] = classifyNaturalAttacks([
      { name: "Tail slap", count: 1 },
      { name: "Bite", count: 1 },
    ]);
    expect(tailSlap!.attackType).toBe("secondary");
    expect(bite!.attackType).toBe("primary");
  });
});

describe("secondaryAttackPenalty", () => {
  it("−5 normally, −2 with Multiattack", () => {
    expect(secondaryAttackPenalty(false)).toBe(-5);
    expect(secondaryAttackPenalty(true)).toBe(-2);
  });
});

describe("naturalAttackBonus / naturalAttackDamageBonus", () => {
  it("primary: no penalty, full Str mod", () => {
    expect(naturalAttackBonus(10, "primary", false)).toBe(10);
    expect(naturalAttackDamageBonus(3, "primary")).toBe(3);
    expect(naturalAttackDamageBonus(-2, "primary")).toBe(-2);
  });

  it("secondary without Multiattack: −5, half a POSITIVE Str mod (rounded down)", () => {
    expect(naturalAttackBonus(10, "secondary", false)).toBe(5);
    expect(naturalAttackDamageBonus(3, "secondary")).toBe(1);
    expect(naturalAttackDamageBonus(4, "secondary")).toBe(2);
  });

  it("secondary with Multiattack: only −2", () => {
    expect(naturalAttackBonus(10, "secondary", true)).toBe(8);
  });

  it("a Strength PENALTY applies in full on a secondary attack, not halved", () => {
    expect(naturalAttackDamageBonus(-4, "secondary")).toBe(-4);
  });
});
