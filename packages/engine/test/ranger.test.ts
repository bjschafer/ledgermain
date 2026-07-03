import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  COMBAT_STYLES,
  computeRanger,
  favoredBonusBudget,
  favoredEnemySlots,
  favoredTerrainSlots,
  rangerLevel,
} from "../src/index.js";

/**
 * Ranger situational selections. Hand-authored clean-room from PF1 CRB pp.
 * 64–65 — the vendored data carries these features as prose only. The bonuses
 * never touch the always-on sheet; `computeRanger` only projects the player's
 * build choices onto `DerivedSheet.ranger` for the saved-roll attachment path.
 */

function makeDoc(overrides: Partial<CharacterDoc["build"]> = {}, rangerLvl = 10): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: "human",
      classes: rangerLvl > 0 ? [{ tag: "ranger", level: rangerLvl }] : [{ tag: "fighter", level: 5 }],
    },
    abilities: { str: 14, dex: 16, con: 12, int: 10, wis: 12, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...overrides,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("favoredEnemySlots (CRB: 1, 5, 10, 15, 20)", () => {
  it("counts a new favored enemy at level 1 and every 5 levels", () => {
    expect(favoredEnemySlots(1)).toBe(1);
    expect(favoredEnemySlots(4)).toBe(1);
    expect(favoredEnemySlots(5)).toBe(2);
    expect(favoredEnemySlots(10)).toBe(3);
    expect(favoredEnemySlots(15)).toBe(4);
    expect(favoredEnemySlots(20)).toBe(5);
  });

  it("is 0 below level 1", () => {
    expect(favoredEnemySlots(0)).toBe(0);
  });
});

describe("favoredTerrainSlots (CRB: 3, 8, 13, 18)", () => {
  it("counts a new favored terrain at level 3 and every 5 levels after", () => {
    expect(favoredTerrainSlots(2)).toBe(0);
    expect(favoredTerrainSlots(3)).toBe(1);
    expect(favoredTerrainSlots(7)).toBe(1);
    expect(favoredTerrainSlots(8)).toBe(2);
    expect(favoredTerrainSlots(13)).toBe(3);
    expect(favoredTerrainSlots(18)).toBe(4);
  });
});

describe("favoredBonusBudget (4s − 2 total +2-increments)", () => {
  it("matches the RAW distribution total at each slot count", () => {
    expect(favoredBonusBudget(0)).toBe(0);
    expect(favoredBonusBudget(1)).toBe(2); // one type at +2
    expect(favoredBonusBudget(2)).toBe(6); // e.g. +4/+2
    expect(favoredBonusBudget(3)).toBe(10);
    expect(favoredBonusBudget(5)).toBe(18); // capstone: e.g. +10/+2/+2/+2/+2
  });
});

describe("COMBAT_STYLES", () => {
  it("has the CRB + Ultimate Combat styles, each with a non-empty feat tree", () => {
    const ids = COMBAT_STYLES.map((s) => s.id);
    // Two CRB styles first, then the five from Ultimate Combat.
    expect(ids).toEqual([
      "archery",
      "two-weapon",
      "crossbow",
      "mounted-combat",
      "natural-weapon",
      "two-handed-weapon",
      "weapon-and-shield",
    ]);
    for (const style of COMBAT_STYLES) {
      expect(style.featSlugs.length).toBeGreaterThan(0);
    }
  });

  it("has stable, unique kebab-case slugs in each tree", () => {
    for (const style of COMBAT_STYLES) {
      const unique = new Set(style.featSlugs);
      expect(unique.size).toBe(style.featSlugs.length);
      for (const slug of style.featSlugs) {
        expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });

  it("archery includes rapid-shot and manyshot; two-handed includes power-attack", () => {
    const archery = COMBAT_STYLES.find((s) => s.id === "archery")!;
    expect(archery.featSlugs).toContain("rapid-shot");
    expect(archery.featSlugs).toContain("manyshot");
    const twoHanded = COMBAT_STYLES.find((s) => s.id === "two-handed-weapon")!;
    expect(twoHanded.featSlugs).toContain("power-attack");
  });
});

describe("rangerLevel", () => {
  it("sums ranger class levels only", () => {
    expect(rangerLevel(makeDoc({}, 7))).toBe(7);
    expect(rangerLevel(makeDoc({}, 0))).toBe(0); // fighter-only doc
  });
});

describe("computeRanger", () => {
  it("returns undefined for a non-ranger", () => {
    expect(computeRanger(makeDoc({}, 0))).toBeUndefined();
  });

  it("passes build selections through unchanged", () => {
    const doc = makeDoc({
      favoredEnemies: [
        { type: "undead", bonus: 4 },
        { type: "aberration", bonus: 2 },
      ],
      favoredTerrains: [{ type: "forest", bonus: 2 }],
      combatStyle: "archery",
    });
    expect(computeRanger(doc)).toEqual({
      favoredEnemies: [
        { type: "undead", bonus: 4 },
        { type: "aberration", bonus: 2 },
      ],
      favoredTerrains: [{ type: "forest", bonus: 2 }],
      combatStyle: "archery",
    });
  });

  it("drops entries with an empty type but keeps the rest", () => {
    const doc = makeDoc({
      favoredEnemies: [
        { type: "", bonus: 2 },
        { type: "dragon", bonus: 2 },
      ],
    });
    expect(computeRanger(doc)!.favoredEnemies).toEqual([{ type: "dragon", bonus: 2 }]);
  });
});
