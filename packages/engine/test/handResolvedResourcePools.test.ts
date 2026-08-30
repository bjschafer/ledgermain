import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { deriveResourcePools } from "../src/index.js";

/**
 * Fixture tests for `resources.ts`'s `HAND_RESOLVED_USES_FORMULA` table —
 * features whose vendored (or hand-authored data-pipeline supplement) entry
 * describes a rounds/uses-per-day resource in prose but carries no `uses`
 * block at all, so `deriveResourcePools` would otherwise never surface a
 * pool row for it. Hand-computed against the cited published formulas, same
 * posture as the rest of this suite.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...over,
  } as CharacterDoc;
}

describe("hand-resolved uses.maxFormula pools", () => {
  it("Adrenaline Rush (darechaser 3, Con 14): 4 + Con mod + 2 per level after 1st (PZO9474 p. 10)", () => {
    // "a number of rounds per day equal to 4 + her Constitution modifier. At
    // each level after 1st, she can use adrenaline rush for an additional 2
    // rounds." Darechaser level 3, Con mod 2: 4 + 2 + 2*(3-1) = 10.
    const doc = baseDoc({
      identity: { name: "D", race: raceId("Human"), classes: [{ tag: "darechaser", level: 3 }] },
      abilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
    });
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Adrenaline Rush");
    expect(pool).toBeDefined();
    expect(pool?.max).toBe(10);
    expect(pool?.per).toBe("day");
    expect(pool?.classTag).toBe("darechaser");
  });

  it("Blood Pool (bloatmage 5): equal to bloatmage level", () => {
    // "A bloatmage's normal pool of blood points is equal to her bloatmage
    // level."
    const doc = baseDoc({
      identity: { name: "B", race: raceId("Human"), classes: [{ tag: "bloatmage", level: 5 }] },
    });
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Blood Pool");
    expect(pool).toBeDefined();
    expect(pool?.max).toBe(5);
    expect(pool?.per).toBe("day");
  });

  it("Founders' Favor (Westcrown devil 4, Wis 12/Cha 16): class level + highest of Int/Wis/Cha mod", () => {
    // "a pool of favor points equal to his class level + his Intelligence,
    // Wisdom, or Charisma modifier (whichever is highest)." Level 4 + Cha
    // mod 3 (the highest of Int 0/Wis 1/Cha 3) = 7.
    const doc = baseDoc({
      identity: {
        name: "W",
        race: raceId("Human"),
        classes: [{ tag: "westcrownDevil", level: 4 }],
      },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 16 },
    });
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Founders' Favor");
    expect(pool).toBeDefined();
    expect(pool?.max).toBe(7);
    expect(pool?.per).toBe("day");
  });

  it("Destructive Aura (Destruction domain, cleric 8): rounds per day equal to cleric level", () => {
    // CRB p. 43 / hand-authored 8th-level power: "emit a 30-foot aura of
    // destruction for a number of rounds per day equal to your cleric
    // level."
    const doc = baseDoc({
      identity: { name: "C", race: raceId("Human"), classes: [{ tag: "cleric", level: 8 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        clericDomains: ["Destruction"],
      },
    });
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Destructive Aura");
    expect(pool).toBeDefined();
    expect(pool?.max).toBe(8);
    expect(pool?.per).toBe("day");
  });

  it("Mantle against Chaos (Order inquisition, inquisitor level, minimum 1)", () => {
    // "You can use this ability for a number of minutes per day equal to
    // your inquisitor level (minimum 1)."
    const doc1 = baseDoc({
      identity: { name: "I1", race: raceId("Human"), classes: [{ tag: "inquisitor", level: 1 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        inquisition: "order",
      },
    });
    const doc5 = baseDoc({
      identity: { name: "I5", race: raceId("Human"), classes: [{ tag: "inquisitor", level: 5 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        inquisition: "order",
      },
    });
    expect(deriveResourcePools(doc1, ref).find((p) => p.name === "Mantle against Chaos")?.max).toBe(
      1,
    );
    expect(deriveResourcePools(doc5, ref).find((p) => p.name === "Mantle against Chaos")?.max).toBe(
      5,
    );
  });

  it("Aquatic Veil (Plane of Water domain, druid 8, Wis 16): 3 + Wis mod", () => {
    // Hand-authored 1st-level power: "you can use this ability a number of
    // times per day equal to 3 + your Wisdom modifier."
    const doc = baseDoc({
      identity: { name: "Dr", race: raceId("Human"), classes: [{ tag: "druid", level: 8 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        druidNatureBondDomain: "Plane of Water",
      },
    });
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Aquatic Veil");
    expect(pool).toBeDefined();
    expect(pool?.max).toBe(6);
    expect(pool?.per).toBe("day");
  });
});
