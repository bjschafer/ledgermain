import { describe, expect, it } from "bun:test";

import type { DerivedNaturalAttack } from "@pf1/schema";

import {
  naturalAttackDamageLabel,
  naturalAttackName,
  naturalAttackNoteLine,
  naturalAttackTypeSuffix,
} from "../src/model/naturalAttackDisplay.js";

function makeAttack(overrides: Partial<DerivedNaturalAttack> = {}): DerivedNaturalAttack {
  return {
    name: "Claw",
    count: 1,
    kind: "primary",
    attackBonus: 5,
    attackComponents: [],
    damageDice: "1d4",
    damageBonus: 3,
    damageComponents: [],
    ...overrides,
  };
}

describe("naturalAttackName", () => {
  it("shows a single attack unpluralized", () => {
    expect(naturalAttackName(makeAttack({ name: "Bite", count: 1 }))).toBe("Bite");
  });

  it("pluralizes and lowercases multi-attacks", () => {
    expect(naturalAttackName(makeAttack({ name: "Claw", count: 2 }))).toBe("2 claws");
  });
});

describe("naturalAttackTypeSuffix", () => {
  it("is blank for a primary attack", () => {
    expect(naturalAttackTypeSuffix(makeAttack({ kind: "primary" }))).toBe("");
  });

  it("flags a secondary attack", () => {
    expect(naturalAttackTypeSuffix(makeAttack({ kind: "secondary" }))).toBe("(secondary)");
  });
});

describe("naturalAttackDamageLabel", () => {
  it("joins dice + a nonzero signed bonus with no space", () => {
    expect(naturalAttackDamageLabel(makeAttack({ damageDice: "1d4", damageBonus: 3 }))).toBe(
      "1d4+3",
    );
  });

  it("drops the bonus term when it's zero", () => {
    expect(naturalAttackDamageLabel(makeAttack({ damageDice: "1d6", damageBonus: 0 }))).toBe("1d6");
  });

  it("shows a negative bonus with its own sign", () => {
    expect(naturalAttackDamageLabel(makeAttack({ damageDice: "1d3", damageBonus: -1 }))).toBe(
      "1d3-1",
    );
  });

  it("falls back to the bare signed bonus when there's no damage die", () => {
    expect(naturalAttackDamageLabel(makeAttack({ damageDice: undefined, damageBonus: 2 }))).toBe(
      "+2",
    );
  });

  it("falls back to +0 when there's neither a die nor a bonus", () => {
    expect(naturalAttackDamageLabel(makeAttack({ damageDice: undefined, damageBonus: 0 }))).toBe(
      "+0",
    );
  });
});

describe("naturalAttackNoteLine", () => {
  it("is null when the line has no notes", () => {
    expect(naturalAttackNoteLine(makeAttack({ notes: undefined }))).toBeNull();
    expect(naturalAttackNoteLine(makeAttack({ notes: [] }))).toBeNull();
  });

  it("joins multiple notes with the app's '·' convention", () => {
    expect(naturalAttackNoteLine(makeAttack({ notes: ["Grab", "Only while raging"] }))).toBe(
      "Grab · Only while raging",
    );
  });
});
