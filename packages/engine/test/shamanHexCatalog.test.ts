import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, mergedShamanHexCatalog, resolveGeneralShamanHex } from "../src/index.js";

/**
 * Coverage for the GENERAL shaman-hex catalog (issue #74 Phase 3b) — see
 * `shaman-hexes.ts`'s doc comment for why this one has no hand-authored
 * table to overlay (unlike its `witch-hexes.ts`/`magus-arcana.ts` siblings):
 * every row here is vendored-only and display-only.
 */
const ref = loadRefData();

describe("mergedShamanHexCatalog", () => {
  const merged = mergedShamanHexCatalog(ref);

  it("has one row per vendored entry (16)", () => {
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

  it("every id is unique", () => {
    const ids = merged.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveGeneralShamanHex", () => {
  it("resolves a real vendored id", () => {
    const entry = resolveGeneralShamanHex("fury", ref);
    expect(entry?.name).toBe("Fury");
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
