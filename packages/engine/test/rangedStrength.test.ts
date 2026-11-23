/**
 * Hand-computed fixtures for the Strength a ranged weapon adds (CRB p. 144,
 * "Strength Bonus" under Weapon Qualities): a thrown weapon or a sling adds
 * the full modifier, a bow takes only a penalty, a composite bow adds its
 * modifier up to the bow's Strength rating and gives -2 on attacks when the
 * wielder is weaker than the rating (CRB p. 147), and a crossbow adds nothing.
 */
import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function sheetFor(weapon: WeaponInstance, over: { str?: number } = {}) {
  const abilities: Record<AbilityId, number> = {
    str: over.str ?? 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };
  const doc: CharacterDoc = {
    schemaVersion: 1,
    id: "ranged-strength-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Archer",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [weapon],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
  return compute(doc, ref).attacks[0]!;
}

const javelin: WeaponInstance = {
  name: "Javelin",
  attackAbility: "dex",
  category: "ranged",
  weaponGroups: ["spears", "thrown"],
};
const sling: WeaponInstance = {
  name: "Sling",
  attackAbility: "dex",
  category: "ranged",
  weaponGroups: ["thrown"],
};
const longbow: WeaponInstance = {
  name: "Longbow",
  attackAbility: "dex",
  category: "ranged",
  weaponGroups: ["bows"],
};
const compositeLongbow: WeaponInstance = { ...longbow, name: "Composite Longbow", strRating: 2 };
const crossbow: WeaponInstance = {
  name: "Light Crossbow",
  attackAbility: "dex",
  category: "ranged",
  damageAbility: "none",
  weaponGroups: ["crossbows"],
};

describe("ranged Strength to damage", () => {
  it("a thrown javelin adds the full Strength bonus: Str 14 is +2", () => {
    expect(sheetFor(javelin, { str: 14 }).damageBonus.total).toBe(2);
  });

  it("a sling takes the full Strength penalty: Str 6 is -2", () => {
    expect(sheetFor(sling, { str: 6 }).damageBonus.total).toBe(-2);
  });

  it("a plain longbow adds no Strength bonus: Str 16 is +0, with no Strength term", () => {
    const atk = sheetFor(longbow, { str: 16 });
    expect(atk.damageBonus.total).toBe(0);
    expect(atk.damageBonus.components).toEqual([]);
  });

  it("a plain longbow still takes a Strength penalty: Str 8 is -1", () => {
    expect(sheetFor(longbow, { str: 8 }).damageBonus.total).toBe(-1);
  });

  it("a +2 composite longbow caps a Str 18 archer's +4 at +2", () => {
    const atk = sheetFor(compositeLongbow, { str: 18 });
    expect(atk.damageBonus.total).toBe(2);
    expect(atk.damageBonus.components[0]!.source).toBe("Strength (rating 2)");
  });

  it("a +2 composite longbow takes a Str 8 archer's -1 penalty", () => {
    expect(sheetFor(compositeLongbow, { str: 8 }).damageBonus.total).toBe(-1);
  });

  it("a crossbow adds no Strength either way: Str 6 is +0", () => {
    expect(sheetFor(crossbow, { str: 6 }).damageBonus.total).toBe(0);
  });
});

describe("composite bow Strength rating on attacks", () => {
  // Fighter 1: BAB +1, Dex 10.
  it("Str 14 (+2) meets a +2 rating: attack +1, no penalty", () => {
    expect(sheetFor(compositeLongbow, { str: 14 }).attack.total).toBe(1);
  });

  it("Str 12 (+1) is below a +2 rating: -2, attack -1", () => {
    const atk = sheetFor(compositeLongbow, { str: 12 });
    expect(atk.attack.total).toBe(-1);
    expect(atk.attack.components.some((c) => c.value === -2 && c.type === "penalty")).toBe(true);
  });
});
