import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, RACIAL_TRAITS } from "../src/index.js";

/**
 * Fixture tests for `AlternateRacialTrait.resourcePool` — alternate racial
 * traits whose benefit is metered per day (Sylph's Storm in the Blood), hand
 * computed against the published ARG text: "up to a maximum number of hit
 * points equal to twice your character level".
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
    identity: { name: "Test", race: raceId("Sylph"), classes: [{ tag: "arcanist", level: 4 }] },
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

function stormPool(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return deriveResourcePools(doc, ref, sheet.abilities).find(
    (p) => p.id === "sylph-storm-in-the-blood",
  );
}

describe("alternate racial trait resource pools", () => {
  it("sylph arcanist 4 with Storm in the Blood: 2 hp/level/day = 8, refills fully on rest", () => {
    const doc = baseDoc({
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        racialTraits: ["sylph-storm-in-the-blood"],
      },
    });
    const pool = stormPool(doc);
    expect(pool?.name).toBe("Storm in the Blood");
    expect(pool?.max).toBe(8);
    expect(pool?.restValue).toBe(8);
    expect(pool?.per).toBe("day");
    expect(pool?.classTag).toBe("racial");
    expect(pool?.detail).toContain("1 use = 1 hp healed");
  });

  it("the pool scales with CHARACTER level, not one class's — a 3/2 multiclass gets 10", () => {
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: raceId("Sylph"),
        classes: [
          { tag: "arcanist", level: 3 },
          { tag: "rogue", level: 2 },
        ],
      },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        racialTraits: ["sylph-storm-in-the-blood"],
      },
    });
    expect(stormPool(doc)?.max).toBe(10);
  });

  it("no pool without the trait chosen", () => {
    expect(stormPool(baseDoc({}))).toBeUndefined();
  });

  it("a stale trait id from a race change grants nothing", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "arcanist", level: 4 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        racialTraits: ["sylph-storm-in-the-blood"],
      },
    });
    expect(stormPool(doc)).toBeUndefined();
  });

  it("alternates without a resourcePool stay off the tracker", () => {
    const doc = baseDoc({
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        racialTraits: ["sylph-like-the-wind"],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(RACIAL_TRAITS["sylph-like-the-wind"]?.resourcePool).toBeUndefined();
    expect(pools.some((p) => p.classTag === "racial")).toBe(false);
  });
});
