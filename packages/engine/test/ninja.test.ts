import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture coverage for the Ninja (UC) — a rogue-chassis alternate class: BAB
 * medium, poor Fort/Will, good Ref, d8, no trapfinding/trap sense (confirmed
 * absent from the vendored feature list below). Two things worth confirming
 * against the real vendored data rather than assuming:
 *
 * - **Sneak Attack** uses the exact same die progression as rogue
 *   (`floor((level+1)/2)` d6) — the vendored feature carries no dice of its
 *   own (`changes: []`, prose-only upstream, same as rogue's), so
 *   `archetypes.ts`'s name+classTag dispatch was extended to match
 *   `classTag === "ninja"` alongside `"rogue"`, reusing `sneakAttackDice`
 *   wholesale (no new table).
 * - **Ki Pool (NIN)** is Cha-based, NOT Wis-based like the monk's Ki Pool —
 *   confirmed via the vendored `uses.maxFormula`:
 *   `floor(@class.unlevel / 2) + @abilities.cha.mod`. This rides the fully
 *   generic `uses.maxFormula` pipeline with zero hand-authoring.
 *
 * Ninja Tricks / Master Tricks (the ninja's talent-menu subsystem, like Rogue
 * Talents) are deliberately NOT modeled — see IMPLEMENTATION_PLAN.md.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(tag: string, level: number, abilities: CharacterDoc["abilities"]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag, level }] },
    abilities,
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("ninja L7 (BAB med, Fort/Will poor, Ref good, d8)", () => {
  const doc = makeDoc("ninja", 7, { str: 14, dex: 18, con: 12, int: 10, wis: 10, cha: 16 });
  const sheet = compute(doc, ref);

  it("BAB +5 (medium: floor(7*3/4))", () => {
    expect(sheet.bab).toBe(5);
  });

  it("saves: Fort +3 (poor), Ref +9 (good), Will +2 (poor)", () => {
    // poor = floor(7/3) = 2, +Con1 = 3; good = 2+floor(7/2) = 5, +Dex4 = 9.
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(9);
    expect(sheet.saves.will.total).toBe(2);
  });

  it("HP 45 (d8: L1 max 8, L2-7 6x(floor(8/2)+1=5)=30, +Con 1/level=7)", () => {
    expect(sheet.hp.max).toBe(45);
  });

  it("level-appropriate features present (L1-L7), Master Tricks (L10) absent, no trapfinding/trap sense", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Poison Use");
    expect(names).toContain("Sneak Attack");
    expect(names).toContain("Ki Pool (NIN)");
    expect(names).toContain("Ninja Tricks");
    expect(names).toContain("No Trace");
    expect(names).toContain("Uncanny Dodge");
    expect(names).not.toContain("Master Tricks");
    expect(names).not.toContain("Improved Uncanny Dodge"); // L8
    expect(names).not.toContain("Trapfinding");
    expect(names).not.toContain("Trap Sense");
  });

  it("Sneak Attack's detail reuses the rogue die progression: floor((7+1)/2) = 4d6", () => {
    const sneak = sheet.classFeatures.find((f) => f.name === "Sneak Attack");
    expect(sneak?.detail).toBe("4d6");
  });

  it("Ki Pool (NIN): Cha-based (NOT Wis, unlike monk) — floor(7/2) + Cha mod(3) = 6/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const ki = pools.find((p) => p.name === "Ki Pool (NIN)");
    expect(ki?.max).toBe(6);
    expect(ki?.per).toBe("day");
  });
});

describe("ninja L1 — Sneak Attack die at the earliest level", () => {
  const doc = makeDoc("ninja", 1, { str: 12, dex: 16, con: 12, int: 10, wis: 10, cha: 12 });
  const sheet = compute(doc, ref);

  it("Sneak Attack: 1d6 at L1, no Ki Pool yet (granted at L2)", () => {
    const sneak = sheet.classFeatures.find((f) => f.name === "Sneak Attack");
    expect(sneak?.detail).toBe("1d6");
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Ki Pool (NIN)")).toBeUndefined();
  });
});

describe("ninja L20 — capstone", () => {
  const doc = makeDoc("ninja", 20, { str: 14, dex: 18, con: 12, int: 10, wis: 10, cha: 14 });
  const sheet = compute(doc, ref);

  it("Sneak Attack caps at 10d6, Hidden Master present, Ki Pool draws from the same pool (uses.source)", () => {
    const sneak = sheet.classFeatures.find((f) => f.name === "Sneak Attack");
    expect(sneak?.detail).toBe("10d6");
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Hidden Master");
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    // Hidden Master (`uses.source: "kiPool"`) never becomes its own pool row.
    expect(pools.find((p) => p.name === "Hidden Master")).toBeUndefined();
    // Ki Pool: floor(20/2) + Cha mod(2) = 12/day.
    expect(pools.find((p) => p.name === "Ki Pool (NIN)")?.max).toBe(12);
  });
});
