/**
 * Hand-computed fixture tests for per-weapon attack and damage bonus lines.
 * All expected values are derived from the PF1 combat formula:
 *   attack  = BAB + ability mod + size mod + enhancement + collected attack changes
 *   damage  = floor(STR × damageMultiplier) [melee/STR only] + enhancement + collected damage changes
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

/** Minimal CharacterDoc factory; barbarian L1 with configurable abilities and weapons. */
function makeDoc(
  abilities: CharacterDoc["abilities"],
  weapons: WeaponInstance[] = [],
  activeBuffs: ActiveBuff[] = [],
): CharacterDoc {
  const humanEntry = Object.entries(ref.races).find(([, r]) => r.name === "Human");
  if (!humanEntry) throw new Error("Human race not found in ref data");
  const [humanId] = humanEntry;

  return {
    schemaVersion: 1,
    id: "weapon-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: humanId,
      classes: [{ tag: "barbarian", level: 1 }],
    },
    abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

// Barbarian L1: BAB = 1 (high progression); Human = medium size (size mod = 0)
// STR 16 → mod +3; DEX 14 → mod +2

describe("weapons: STR melee weapon", () => {
  const sword: WeaponInstance = {
    name: "Longsword",
    attackAbility: "str",
    damageDice: "1d8",
    critRange: 19,
    critMult: 2,
  };
  const doc = makeDoc({ str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }, [sword]);
  const sheet = compute(doc, ref);

  it("produces exactly one weapon attack entry", () => {
    expect(sheet.attacks).toHaveLength(1);
  });

  it("attack = BAB(1) + STR mod(3) = 4", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(4);
  });

  it("damage bonus = STR mod(3)", () => {
    expect(sheet.attacks[0]!.damageBonus.total).toBe(3);
  });

  it("damageDice is passed through for display", () => {
    expect(sheet.attacks[0]!.damageDice).toBe("1d8");
  });

  it("crit string is '19–20/×2'", () => {
    expect(sheet.attacks[0]!.crit).toBe("19–20/×2");
  });

  it("category is melee", () => {
    expect(sheet.attacks[0]!.category).toBe("melee");
  });

  it("attack provenance includes BAB and Strength components", () => {
    const comps = sheet.attacks[0]!.attack.components;
    expect(comps.find((c) => c.source === "BAB")?.value).toBe(1);
    expect(comps.find((c) => c.source === "Strength")?.value).toBe(3);
  });

  it("damage provenance includes Strength component", () => {
    const comps = sheet.attacks[0]!.damageBonus.components;
    expect(comps.find((c) => c.source === "Strength")?.value).toBe(3);
  });
});

describe("weapons: DEX finesse weapon (attackAbility='dex', damageAbility='none')", () => {
  const rapier: WeaponInstance = {
    name: "Rapier",
    attackAbility: "dex",
    damageAbility: "none",
    damageDice: "1d6",
    critRange: 18,
    critMult: 2,
  };
  const doc = makeDoc({ str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }, [rapier]);
  const sheet = compute(doc, ref);

  it("attack = BAB(1) + DEX mod(2) = 3", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(3);
  });

  it("damage bonus = 0 (no ability modifier)", () => {
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("crit string is '18–20/×2'", () => {
    expect(sheet.attacks[0]!.crit).toBe("18–20/×2");
  });

  it("attack provenance shows Dexterity, not Strength", () => {
    const comps = sheet.attacks[0]!.attack.components;
    expect(comps.find((c) => c.source === "Dexterity")?.value).toBe(2);
    expect(comps.find((c) => c.source === "Strength")).toBeUndefined();
  });
});

describe("weapons: enhancement bonus adds to both attack and damage", () => {
  const magicSword: WeaponInstance = {
    name: "Longsword +1",
    attackAbility: "str",
    enhancement: 1,
    damageDice: "1d8",
  };
  const doc = makeDoc({ str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }, [magicSword]);
  const sheet = compute(doc, ref);

  it("attack = BAB(1) + STR(3) + enh(1) = 5", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(5);
  });

  it("damage = STR(3) + enh(1) = 4", () => {
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });

  it("crit string defaults to '×2'", () => {
    expect(sheet.attacks[0]!.crit).toBe("×2");
  });

  it("attack provenance includes enhancement component", () => {
    const comps = sheet.attacks[0]!.attack.components;
    const enhComp = comps.find((c) => c.type === "enh");
    expect(enhComp?.value).toBe(1);
    expect(enhComp?.applied).toBe(true);
  });

  it("damage provenance includes enhancement component", () => {
    const comps = sheet.attacks[0]!.damageBonus.components;
    const enhComp = comps.find((c) => c.type === "enh");
    expect(enhComp?.value).toBe(1);
    expect(enhComp?.applied).toBe(true);
  });
});

describe("weapons: two-handed weapon applies 1.5× STR to damage", () => {
  // STR 16 → mod +3; floor(3 × 1.5) = floor(4.5) = 4
  const greatsword: WeaponInstance = {
    name: "Greatsword",
    attackAbility: "str",
    damageMultiplier: 1.5,
    damageDice: "2d6",
    critRange: 19,
    critMult: 2,
  };
  const doc = makeDoc({ str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }, [greatsword]);
  const sheet = compute(doc, ref);

  it("attack = BAB(1) + STR(3) = 4 (multiplier doesn't affect attack)", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(4);
  });

  it("damage = floor(3 × 1.5) = 4", () => {
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });

  it("damage provenance label includes multiplier", () => {
    const comps = sheet.attacks[0]!.damageBonus.components;
    const abilityComp = comps.find((c) => c.type === "ability");
    // Source should include the multiplier annotation (e.g. "Strength ×1.5")
    expect(abilityComp?.source).toContain("×");
    expect(abilityComp?.value).toBe(4);
  });
});

describe("weapons: +2 attack buff flows into per-weapon attack", () => {
  // Active buff targeting "attack" with +2 morale bonus
  const moraleBuff: ActiveBuff = {
    instanceId: "buff-1",
    name: "Inspire Courage",
    changes: [{ target: "attack", type: "morale", formula: "2" }],
  };
  const sword: WeaponInstance = {
    name: "Shortsword",
    attackAbility: "str",
    damageDice: "1d6",
  };
  const doc = makeDoc(
    { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    [sword],
    [moraleBuff],
  );
  const sheet = compute(doc, ref);

  it("attack = BAB(1) + STR(3) + morale(2) = 6", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(6);
  });

  it("base melee attack line also includes the buff (consistency check)", () => {
    // Both the per-weapon line and the base melee line read forTarget("attack")
    expect(sheet.attack.melee.total).toBe(6); // 1 + 3 + 2
  });

  it("buff appears in weapon attack provenance components", () => {
    const comps = sheet.attacks[0]!.attack.components;
    const buffComp = comps.find((c) => c.source === "Inspire Courage");
    expect(buffComp?.value).toBe(2);
    expect(buffComp?.type).toBe("morale");
    expect(buffComp?.applied).toBe(true);
  });
});

describe("weapons: no weapons → attacks array is empty", () => {
  const doc = makeDoc({ str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
  const sheet = compute(doc, ref);

  it("sheet.attacks is an empty array when build.weapons is absent", () => {
    expect(sheet.attacks).toEqual([]);
  });
});
