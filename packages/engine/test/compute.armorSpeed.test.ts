/**
 * Engine integration fixtures for issue #8 (armor limitations/corner cases):
 * medium/heavy ARMOR (by weight class, independent of encumbrance) reduces
 * land speed per the RAW "Table: Speed" — a core rule, unlike the optional
 * carrying-capacity encumbrance rule (issue #16), which uses the same table
 * for the same reason and must not double-reduce when both apply.
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
  encumbranceEnabled?: boolean;
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
      ...(over.encumbranceEnabled !== undefined
        ? { settings: { encumbranceEnabled: over.encumbranceEnabled } }
        : {}),
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

describe("compute: worn armor weight class reduces land speed (issue #8)", () => {
  it("light armor (or none) does not reduce speed", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Leather Armor",
          armor: { slot: "armor", ac: 2, maxDex: 6, type: 1 },
        },
      ],
    });
    expect(compute(doc, ref).speeds.land).toBe(30);
  });

  it("medium armor reduces land speed 30 -> 20", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Breastplate",
          armor: { slot: "armor", ac: 6, maxDex: 3, acp: -4, type: 2 },
        },
      ],
    });
    expect(compute(doc, ref).speeds.land).toBe(20);
  });

  it("heavy armor reduces land speed 30 -> 20 (same reduction as medium, per RAW)", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: true,
          name: "Full Plate",
          armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3 },
        },
      ],
    });
    expect(compute(doc, ref).speeds.land).toBe(20);
  });

  it("a shield alone (no body armor) does not reduce speed", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [{ equipped: true, name: "Tower Shield", armor: { slot: "shield", ac: 4, acp: -10 } }],
    });
    expect(compute(doc, ref).speeds.land).toBe(30);
  });

  it("an unequipped heavy armor does not reduce speed", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [
        {
          equipped: false,
          name: "Full Plate",
          armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3 },
        },
      ],
    });
    expect(compute(doc, ref).speeds.land).toBe(30);
  });

  it("armor's medium reduction and the (optional) encumbrance rule's reduction don't stack (still 20, not 15)", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      encumbranceEnabled: true,
      gear: [
        {
          equipped: true,
          name: "Breastplate",
          armor: { slot: "armor", ac: 6, maxDex: 3, acp: -4, type: 2, weight: 30 },
        },
        { equipped: true, name: "Heavy Gear", weight: 200 },
      ],
    });
    const sheet = compute(doc, ref);
    // Str 14 heavy ceiling is 175 lb (CRB table); 230 total exceeds it, so
    // the (optional) encumbrance rule ALSO wants to reduce speed here — both
    // conditions are true simultaneously, but the reduction must apply once
    // (chaining the "Table: Speed" lookup twice would over-reduce to 15).
    expect(sheet.encumbrance?.speedPenalty).toBe(true);
    expect(sheet.speeds.land).toBe(20);
  });
});
