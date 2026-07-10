import { describe, expect, it } from "bun:test";

import type { DerivedCompanion, DerivedCompanionAttack } from "@pf1/engine";

import {
  companionSkillRows,
  formatCompanionAttackDamage,
  formatCompanionAttackName,
  formatCompanionAttackRoll,
  formatCompanionAttackTypeSuffix,
  formatCompanionSummary,
} from "../src/model/companionDisplay.js";

function makeAttack(overrides: Partial<DerivedCompanionAttack> = {}): DerivedCompanionAttack {
  return {
    name: "Bite",
    count: 1,
    attack: 6,
    damageDice: "1d8",
    damageBonus: 3,
    attackType: "primary",
    ...overrides,
  };
}

function makeCompanion(overrides: Partial<DerivedCompanion> = {}): DerivedCompanion {
  return {
    speciesId: "wolf",
    speciesName: "Wolf",
    name: "Fang",
    size: "lg",
    level: 7,
    hd: 6,
    abilities: {
      str: { score: 16, mod: 3 },
      dex: { score: 17, mod: 3 },
      con: { score: 15, mod: 2 },
      int: { score: 2, mod: -4 },
      wis: { score: 12, mod: 1 },
      cha: { score: 6, mod: -2 },
    },
    hp: { max: 39, current: 39, nonlethal: 0 },
    init: 3,
    speeds: { land: 50 },
    senses: ["low-light vision", "scent"],
    ac: { normal: 17, touch: 12, flatFooted: 14, components: [] },
    saves: { fort: 7, ref: 8, will: 3 },
    bab: 4,
    cmb: 8,
    cmd: 21,
    attacks: [makeAttack()],
    skills: {
      per: { id: "per", ability: "wis", total: 5, components: [] },
      ste: { id: "ste", ability: "dex", total: -1, components: [] },
    },
    naturalArmor: 5,
    specialAbilities: [],
    specialNotes: [],
    bonusTricks: 3,
    bonusFeats: 3,
    ...overrides,
  };
}

describe("formatCompanionSummary", () => {
  it("joins species/size, speeds, and senses with the app's '·' convention", () => {
    const companion = makeCompanion();
    expect(formatCompanionSummary(companion)).toBe(
      "Wolf, Lg · Speed 50 ft. · Low-light vision, scent",
    );
  });

  it("formats non-land speeds with their mode label", () => {
    const companion = makeCompanion({ speeds: { land: 10, fly: 80 } });
    expect(formatCompanionSummary(companion)).toContain("Speed 10 ft., fly 80 ft.");
  });
});

describe("formatCompanionAttackName", () => {
  it("shows a single attack unpluralized", () => {
    expect(formatCompanionAttackName(makeAttack({ name: "Bite", count: 1 }))).toBe("Bite");
  });

  it("pluralizes and lowercases multi-attacks", () => {
    expect(formatCompanionAttackName(makeAttack({ name: "Talon", count: 2 }))).toBe("2 talons");
  });
});

describe("formatCompanionAttackTypeSuffix", () => {
  it("is blank for a primary attack", () => {
    expect(formatCompanionAttackTypeSuffix(makeAttack({ attackType: "primary" }))).toBe("");
  });

  it("flags a secondary attack (issue #68)", () => {
    expect(formatCompanionAttackTypeSuffix(makeAttack({ attackType: "secondary" }))).toBe(
      "(secondary)",
    );
  });
});

describe("formatCompanionAttackRoll / formatCompanionAttackDamage", () => {
  it("formats the attack roll as a signed number", () => {
    expect(formatCompanionAttackRoll(makeAttack({ attack: 6 }))).toBe("+6");
    expect(formatCompanionAttackRoll(makeAttack({ attack: -1 }))).toBe("-1");
  });

  it("formats damage dice + a nonzero bonus + any note", () => {
    expect(formatCompanionAttackDamage(makeAttack({ damageDice: "1d8", damageBonus: 3 }))).toBe(
      "1d8+3",
    );
    expect(
      formatCompanionAttackDamage(
        makeAttack({ damageDice: "1d6", damageBonus: 0, note: "plus grab" }),
      ),
    ).toBe("1d6 plus grab");
  });
});

describe("companionSkillRows", () => {
  it("only surfaces skills present on the companion, sorted by display name", () => {
    const rows = companionSkillRows(makeCompanion());
    expect(rows.map((r) => r.id)).toEqual(["per", "ste"]);
    expect(rows[0]!.total).toBe(5);
  });
});
