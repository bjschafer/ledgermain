import { describe, expect, it } from "bun:test";

import {
  classifyNaturalAttacks,
  naturalAttackBonus,
  naturalAttackDamageBonus,
  secondaryAttackPenalty,
} from "../src/natural-attacks.js";

describe("classifyNaturalAttacks", () => {
  it("two Hoof entries (4 total attacks) stay SECONDARY — the UMR upgrade is per ATTACK, not per KIND", () => {
    const [hoof1, hoof2] = classifyNaturalAttacks([
      { name: "Hoof", count: 2 },
      { name: "Hoof", count: 2 },
    ]);
    expect(hoof1!.attackType).toBe("secondary");
    expect(hoof2!.attackType).toBe("secondary");
    expect(hoof1!.strMultiplier).toBe(1);
  });

  it("pony/horse: a single 'Hoof' entry with count 2 (2 total attacks) stays secondary, matching the Bestiary's '2 hooves −3'", () => {
    const [hooves] = classifyNaturalAttacks([{ name: "Hoof", count: 2 }]);
    expect(hooves!.attackType).toBe("secondary");
    expect(hooves!.strMultiplier).toBe(1);
    // BAB 1 + Str 12 (mod +1) = base bonus 2; secondary attack is base − 5.
    expect(naturalAttackBonus(1 + 1, hooves!.attackType, false)).toBe(-3);
    // Secondary damage halves a positive Str mod, rounded down: floor(1/2) = 0.
    expect(naturalAttackDamageBonus(1, hooves!.attackType, hooves!.strMultiplier)).toBe(0);
  });

  it("a lone Slam (count 1, the creature's only attack) upgrades to primary with the UMR ×1.5 Str rider", () => {
    const [slam] = classifyNaturalAttacks([{ name: "Slam", count: 1 }]);
    expect(slam!.attackType).toBe("primary");
    expect(slam!.strMultiplier).toBe(1.5);
    expect(naturalAttackDamageBonus(4, slam!.attackType, slam!.strMultiplier)).toBe(6);
  });

  it("a lone naturally-secondary kind (single Hoof, count 1) still upgrades to primary + ×1.5 per the UMR 'only one natural attack' sentence", () => {
    const [hoof] = classifyNaturalAttacks([{ name: "Hoof", count: 1 }]);
    expect(hoof!.attackType).toBe("primary");
    expect(hoof!.strMultiplier).toBe(1.5);
  });

  it("bear: bite + 2 claws (3 total attacks) — both primary-type kinds stay primary, unchanged, no ×1.5", () => {
    const [bite, claw] = classifyNaturalAttacks([
      { name: "Bite", count: 1 },
      { name: "Claw", count: 2 },
    ]);
    expect(bite!.attackType).toBe("primary");
    expect(claw!.attackType).toBe("primary");
    expect(bite!.strMultiplier).toBe(1);
    expect(claw!.strMultiplier).toBe(1);
  });

  it("bite + tail slap: tail slap is secondary-type by name, regardless of order", () => {
    const [bite, tailSlap] = classifyNaturalAttacks([
      { name: "Bite", count: 1 },
      { name: "Tail slap", count: 1 },
    ]);
    expect(bite!.attackType).toBe("primary");
    expect(tailSlap!.attackType).toBe("secondary");
  });

  it("classification is per kind, independent of list order", () => {
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

  it("strMultiplier (1.5, sole-natural-attack UMR rider) scales a positive Str mod on a primary attack, rounded down", () => {
    expect(naturalAttackDamageBonus(3, "primary", 1.5)).toBe(4);
    expect(naturalAttackDamageBonus(4, "primary", 1.5)).toBe(6);
  });

  it("strMultiplier never scales a Strength PENALTY, same posture as the two-handed-weapon ×1.5 rule", () => {
    expect(naturalAttackDamageBonus(-2, "primary", 1.5)).toBe(-2);
  });
});
