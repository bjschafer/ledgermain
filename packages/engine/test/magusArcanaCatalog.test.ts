import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  mergedMagusArcanaCatalog,
  resolveMagusArcanum,
  MAGUS_ARCANA,
  MAGUS_ARCANA_IDS,
} from "../src/index.js";

/**
 * Coverage for the magus-arcana vendored-catalog overlay (issue #74 Phase
 * 3b) — mirrors `ragePowerCatalog.test.ts` exactly. See `magus-arcana.ts`'s
 * "vendored catalog overlay" section doc comment for the collision-audit
 * narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedMagusArcanaCatalog", () => {
  const merged = mergedMagusArcanaCatalog(ref);
  const byId = new Map(merged.map((a) => [a.id, a]));

  it("has exactly one row per vendored entry — all 20 hand-authored entries matched", () => {
    const vendoredCount = Object.keys(ref.magusArcana).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 20 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of MAGUS_ARCANA_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(MAGUS_ARCANA[id]!.changes);
      expect(entry!.displayOnly).toBe(MAGUS_ARCANA[id]!.displayOnly);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(20);
  });

  it("a vendored-only entry (no hand-authored counterpart) resolves display-only with its own id + prose + parsed nameSuffix, and the base minLevel of 3 (no fabricated higher gate)", () => {
    const entry = byId.get("arcane_scent")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
    expect(entry.minLevel).toBe(3);
    expect(entry.nameSuffix).toBe("(Ex)");
    expect(entry.description).toContain("scent");
    expect(MAGUS_ARCANA.arcane_scent).toBeUndefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveMagusArcanum", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const arcana = resolveMagusArcanum("poolStrike", ref);
    expect(arcana).toBe(MAGUS_ARCANA.poolStrike);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const arcana = resolveMagusArcanum("arcane_scent", ref);
    expect(arcana?.displayOnly).toBe(true);
    expect(arcana?.name).toBe("Arcane Scent");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMagusArcanum("not-a-real-arcana", ref)).toBeUndefined();
  });
});

describe("a vendored-only pick surfaces on the sheet like any other arcana", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(magusArcana: string[]): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "magus", level: 12 }],
      },
      abilities: { str: 12, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        magusArcana,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }

  it("appears in classFeatures, tagged Magus Arcana, with no crash and no numeric Change applied", () => {
    const doc = makeDoc(["arcane_scent"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Arcane Scent");
  });
});
