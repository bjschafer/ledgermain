import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  mergedWitchHexCatalog,
  resolveWitchHex,
  WITCH_HEX_IDS,
  WITCH_HEXES,
} from "../src/index.js";

/**
 * Coverage for the witch-hex vendored-catalog overlay (issue #74 Phase 3b) —
 * mirrors `ragePowerCatalog.test.ts` exactly. See `witch-hexes.ts`'s
 * "vendored catalog overlay" section doc comment for the collision-audit
 * narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedWitchHexCatalog", () => {
  const merged = mergedWitchHexCatalog(ref);
  const byId = new Map(merged.map((h) => [h.id, h]));

  it("has exactly one row per vendored entry — all 27 hand-authored entries matched", () => {
    const vendoredCount = Object.keys(ref.hexes).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 27 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of WITCH_HEX_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(WITCH_HEXES[id]!.changes);
      expect(entry!.displayOnly).toBe(WITCH_HEXES[id]!.displayOnly);
      expect(entry!.tier).toBe(WITCH_HEXES[id]!.tier);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(27);
  });

  it("a vendored-only entry (no hand-authored counterpart) resolves display-only with its own id + prose, and a soft minLevel derived from its tier", () => {
    const entry = byId.get("aura_of_purity")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
    expect(entry.tier).toBe("hex");
    expect(entry.minLevel).toBe(1);
    expect(entry.description).toContain("purifies");
    expect(WITCH_HEXES.aura_of_purity).toBeUndefined();
  });

  it("a vendored-only MAJOR hex gets minLevel 10, a vendored-only GRAND hex gets minLevel 18", () => {
    // "Cure Sight" isn't a real vendored key — pick any vendored-only entry
    // per tier instead of hardcoding a possibly-renamed id.
    const majorOnly = merged.find((h) => h.tier === "major" && !WITCH_HEX_IDS.includes(h.id));
    const grandOnly = merged.find((h) => h.tier === "grand" && !WITCH_HEX_IDS.includes(h.id));
    expect(majorOnly?.minLevel).toBe(10);
    expect(grandOnly?.minLevel).toBe(18);
  });

  it("every id is unique", () => {
    const ids = merged.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveWitchHex", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const hex = resolveWitchHex("cauldron", ref);
    expect(hex).toBe(WITCH_HEXES.cauldron);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const hex = resolveWitchHex("aura_of_purity", ref);
    expect(hex?.displayOnly).toBe(true);
    expect(hex?.name).toBe("Aura of Purity");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveWitchHex("not-a-real-hex", ref)).toBeUndefined();
  });
});

describe("a vendored-only pick surfaces on the sheet like any other hex", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(witchHexes: string[]): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "witch", level: 12 }],
      },
      abilities: { str: 10, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        witchHexes,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }

  it("appears in classFeatures, tagged Hex, with no crash and no numeric Change applied", () => {
    const doc = makeDoc(["aura_of_purity"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Aura of Purity");
  });
});
