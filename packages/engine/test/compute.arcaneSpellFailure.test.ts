/**
 * Engine integration fixtures for issue #8: `DerivedSheet.arcaneSpellFailure`
 * sums ASF across equipped armor/shields, shown only for characters with an
 * arcane-casting class (wizard/sorcerer/bard), with the bard's light-armor
 * exemption applied only when bard is the character's sole arcane class.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  gear?: ItemInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const ABILITIES: CharacterDoc["abilities"] = {
  str: 14,
  dex: 14,
  con: 12,
  int: 10,
  wis: 10,
  cha: 10,
};

describe("compute: arcane spell failure (issue #8)", () => {
  it("is undefined for a character with no arcane-casting class", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Full Plate",
          armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3, asf: 35 },
        },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toBeUndefined();
  });

  it("is undefined for a divine-only caster (cleric) even in heavy armor", () => {
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Full Plate",
          armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3, asf: 35 },
        },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toBeUndefined();
  });

  it("sums ASF across worn armor + shield for a wizard", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Padded",
          armor: { slot: "armor", ac: 1, maxDex: 8, type: 1, asf: 5 },
        },
        {
          equipped: true,
          name: "Buckler",
          armor: { slot: "shield", ac: 1, acp: -1, asf: 5 },
        },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({ total: 10, bardExempt: false });
  });

  it("a wizard with no armor equipped still reports (zero) ASF, not undefined", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], abilities: ABILITIES });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({ total: 0, bardExempt: false });
  });

  it("bard-only + light armor + no shield: exempt, total reads 0", () => {
    const doc = makeDoc({
      classes: [{ tag: "bard", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Padded",
          armor: { slot: "armor", ac: 1, maxDex: 8, type: 1, asf: 5 },
        },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({ total: 0, bardExempt: true });
  });

  it("bard-only + heavy armor: exemption does NOT apply (medium/heavy armor isn't covered)", () => {
    const doc = makeDoc({
      classes: [{ tag: "bard", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Full Plate",
          armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3, asf: 35 },
        },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({ total: 35, bardExempt: false });
  });

  it("bard-only + light armor + a shield: exemption does NOT apply (shields aren't covered)", () => {
    const doc = makeDoc({
      classes: [{ tag: "bard", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Padded",
          armor: { slot: "armor", ac: 1, maxDex: 8, type: 1, asf: 5 },
        },
        { equipped: true, name: "Buckler", armor: { slot: "shield", ac: 1, acp: -1, asf: 5 } },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({ total: 10, bardExempt: false });
  });

  it("multiclass wizard/bard in light armor: exemption does NOT apply (another arcane class present)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "bard", level: 1 },
        { tag: "wizard", level: 1 },
      ],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Padded",
          armor: { slot: "armor", ac: 1, maxDex: 8, type: 1, asf: 5 },
        },
      ],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({ total: 5, bardExempt: false });
  });
});
