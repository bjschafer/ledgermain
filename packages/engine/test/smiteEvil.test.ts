import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, smiteEvilDetail } from "../src/index.js";

/**
 * Smite Evil attack/damage/AC scaling. Clean-room from the published PF1
 * SRD: "(if any)" Cha bonus to attack and to the deflection AC bonus (floors
 * at 0 for a negative modifier), flat paladin-level damage bonus. Upstream
 * `changes[]` is prose-only, so these numbers don't come from the vendored
 * data (only the `uses.maxFormula` use-count is vendored).
 */
describe("smiteEvilDetail", () => {
  it("level 5 paladin, Cha +3 → +3 atk, +5 dmg, +3 AC", () => {
    expect(smiteEvilDetail(5, 3)).toEqual({ attackBonus: 3, damageBonus: 5, acBonus: 3 });
  });

  it("level 1 paladin, Cha +0 → +0 atk, +1 dmg, +0 AC", () => {
    expect(smiteEvilDetail(1, 0)).toEqual({ attackBonus: 0, damageBonus: 1, acBonus: 0 });
  });

  it("negative Cha modifier floors the attack/AC bonus at 0 (damage is unaffected)", () => {
    expect(smiteEvilDetail(10, -2)).toEqual({ attackBonus: 0, damageBonus: 10, acBonus: 0 });
  });

  it("level 20 paladin, Cha +5 → +5 atk, +20 dmg, +5 AC", () => {
    expect(smiteEvilDetail(20, 5)).toEqual({ attackBonus: 5, damageBonus: 20, acBonus: 5 });
  });

  it("out-of-range level returns all-zero bonuses", () => {
    expect(smiteEvilDetail(0, 4)).toEqual({ attackBonus: 0, damageBonus: 0, acBonus: 0 });
  });
});

describe("Smite Evil uses/day is keyed to paladin level, not total character HD (multiclass)", () => {
  const ref = loadRefData();

  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(classes: { tag: string; level: number }[]): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: { name: "Test", race: raceId("Human"), classes },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }

  it("single-classed paladin 7: 7 total HD == 7 paladin levels, both readings agree at 3/day", () => {
    const doc = makeDoc([{ tag: "paladin", level: 7 }]);
    const pools = deriveResourcePools(doc, ref, compute(doc, ref).abilities);
    expect(pools.find((p) => p.name === "Smite Evil")?.max).toBe(3);
  });

  it("paladin 4 / fighter 3 (7 total HD, but only 4 paladin levels): 2/day, not 3", () => {
    // RAW schedule keyed to PALADIN level: 1/day at 1st, +1 at 4th — a 4th-
    // level paladin has exactly 2 uses/day regardless of other class levels.
    // The old `@attributes.hd.total`-keyed formula would read total HD (7)
    // and give floor((7-1)/3)+1 = 3, one too many.
    const doc = makeDoc([
      { tag: "paladin", level: 4 },
      { tag: "fighter", level: 3 },
    ]);
    const pools = deriveResourcePools(doc, ref, compute(doc, ref).abilities);
    expect(pools.find((p) => p.name === "Smite Evil")?.max).toBe(2);
  });
});
