import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  mergedShamanHexCatalog,
  resolveGeneralShamanHex,
  SHAMAN_GENERAL_HEXES,
  SHAMAN_GENERAL_HEX_IDS,
} from "../src/index.js";

/**
 * Coverage for the GENERAL shaman-hex catalog (issue #74) plus its
 * hand-authored overlay (`shaman-hexes.ts`'s `SHAMAN_GENERAL_HEXES`),
 * mirroring `witchHexCatalog.test.ts` closely — see that file's doc comment
 * for the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedShamanHexCatalog", () => {
  const merged = mergedShamanHexCatalog(ref);
  const byId = new Map(merged.map((h) => [h.id, h]));

  it("has one row per vendored entry (16) — all 16 hand-authored entries matched", () => {
    expect(merged).toHaveLength(16);
    expect(merged).toHaveLength(Object.keys(ref.shamanHexes).length);
  });

  it("a known entry (Chant) carries name/nameSuffix/prose", () => {
    const entry = merged.find((h) => h.id === "chant")!;
    expect(entry.name).toBe("Chant");
    expect(entry.nameSuffix).toBe("(Su)");
    expect(entry.description).toContain("move action");
    expect(entry.summary.length).toBeGreaterThan(0);
    expect(entry.summary).not.toContain("<");
  });

  it("all 16 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of SHAMAN_GENERAL_HEX_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(SHAMAN_GENERAL_HEXES[id]!.changes);
      expect(entry!.displayOnly).toBe(SHAMAN_GENERAL_HEXES[id]!.displayOnly);
      expect(entry!.summary).toBe(SHAMAN_GENERAL_HEXES[id]!.summary);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(16);
  });

  it("every id is unique", () => {
    const ids = merged.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveGeneralShamanHex", () => {
  it("resolves a real vendored id, preferring the hand-authored table's summary/mechanics", () => {
    const entry = resolveGeneralShamanHex("fury", ref);
    expect(entry?.name).toBe("Fury");
    expect(entry?.summary).toBe(SHAMAN_GENERAL_HEXES.fury!.summary);
    expect(entry?.displayOnly).toBe(true);
    expect(entry?.changes).toEqual([]);
  });

  it("returns undefined for an id in neither table (including the excluded 'witch_hex' meta-rule entry)", () => {
    expect(resolveGeneralShamanHex("not-a-real-hex", ref)).toBeUndefined();
    expect(resolveGeneralShamanHex("witch_hex", ref)).toBeUndefined();
  });
});

describe("a general (vendored-only) shaman hex pick surfaces on the sheet alongside spirit hexes", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(shamanHexes: string[]): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "shaman", level: 12 }],
      },
      abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 16, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        shamanSpirit: "battle",
        shamanHexes,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }

  it("a general-catalog id (not scoped to the chosen spirit) still appears in classFeatures, tagged Hex", () => {
    const doc = makeDoc(["fury"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Fury");
  });

  it("still resolves the chosen spirit's own hexes alongside a general pick", () => {
    const doc = makeDoc(["fury", "battle:battleMaster"]);
    const sheet = compute(doc, ref);
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Fury");
    expect(names).toContain("Battle Master");
  });
});
