import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Mechanism-only fixture: with every ki/arcane/grit/panache/
 * sacred-weapon/mental-focus pool-spend table still empty (content lands in a
 * later wave — see ki-spends.ts/arcane-spends.ts/grit-panache-spends.ts/
 * sacred-weapon-spends.ts/mental-focus-spends.ts), a pool wired to one of
 * these tags must derive with `tableOptions` left `undefined`, not `[]` — the
 * tracker's resources panel renders a toggle section only when `tableOptions`
 * is present, so an attached empty array would show a blank section. Content
 * agents extend this file with their own fixture tests once the tables carry
 * real entries.
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

describe("pool-spend toggle tables (mechanism contract)", () => {
  it("monk 4 / magus 5 / gunslinger 3 derives Ki Pool, Arcane Pool, and Grit with spend toggles", () => {
    const doc = baseDoc({
      identity: {
        name: "Scaffold",
        race: raceId("Human"),
        classes: [
          { tag: "monk", level: 4 },
          { tag: "magus", level: 5 },
          { tag: "gunslinger", level: 3 },
        ],
      },
      abilities: { str: 12, dex: 14, con: 12, int: 14, wis: 12, cha: 10 },
    });

    expect(() => compute(doc, ref)).not.toThrow();
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const kiPool = pools.find((p) => p.name === "Ki Pool");
    const arcanePool = pools.find((p) => p.name === "Arcane Pool");
    const grit = pools.find((p) => p.name === "Grit");

    expect(kiPool).toBeDefined();
    expect(arcanePool).toBeDefined();
    expect(grit).toBeDefined();

    // Populated factories attach real options; a factory with nothing to
    // offer must leave tableOptions undefined (never []), so the web app
    // never renders an empty toggle section.
    expect(kiPool?.tableOptions?.length).toBeGreaterThan(0);
    expect(arcanePool?.tableOptions?.length).toBeGreaterThan(0);
    expect(grit?.tableOptions?.length).toBeGreaterThan(0);
    for (const pool of pools) {
      expect(pool.tableOptions).not.toEqual([]);
    }
  });
});
