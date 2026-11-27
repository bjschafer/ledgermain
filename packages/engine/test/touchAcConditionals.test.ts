/**
 * Hand-computed fixtures for touch-AC situational lines: bonuses that apply
 * only against incorporeal touch attacks or rays, promoted from the vendored
 * buffs' `ac` notes (`buff-effects.ts`). Rules:
 * - Incorporeal touch attacks ignore armor and shield bonuses, but force
 *   effects such as mage armor work normally (Bestiary, Incorporeal); Mage
 *   Armor grants a +4 armor bonus and Shield a +4 shield bonus, both force.
 * - A scatterlight suit's color bonus is an armor bonus to touch AC against
 *   beam weapons and rays only (Technology Guide).
 *
 * Base: Human Fighter 1, all abilities 10, no gear, so AC/touch/FF are 10.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buff(name: string, casterLevel?: number): ActiveBuff {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  const [buffId, b] = entry;
  return {
    instanceId: buffId,
    buffId,
    name: b.name,
    changes: b.changes,
    contextNotes: b.contextNotes,
    ...(casterLevel !== undefined ? { casterLevel } : {}),
  };
}

function docWith(...activeBuffs: ActiveBuff[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "touch-ac-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

describe("touch AC vs incorporeal touch attacks", () => {
  it("Mage Armor: 14 normal, 10 touch, 14 touch vs incorporeal", () => {
    const { ac } = compute(docWith(buff("Mage Armor")), ref);
    expect(ac.normal).toBe(14);
    expect(ac.touch).toBe(10);
    expect(ac.flatFooted).toBe(14);
    expect(ac.touchConditionals).toEqual([
      { total: 14, categories: ["incorporeal"], labels: ["incorporeal"] },
    ]);
    // A touch-only category never prints under normal AC.
    expect(ac.conditionals).toBeUndefined();
  });

  it("Mage Armor + Shield: armor and shield bonuses are different types, so 10 + 4 + 4 = 18", () => {
    const { ac } = compute(docWith(buff("Mage Armor"), buff("Shield")), ref);
    expect(ac.normal).toBe(18);
    expect(ac.touch).toBe(10);
    expect(ac.touchConditionals).toEqual([
      { total: 18, categories: ["incorporeal"], labels: ["incorporeal"] },
    ]);
  });
});

describe("touch AC vs rays", () => {
  it("Scatterlight suit at item level 6: 16 touch vs rays, normal untouched", () => {
    const { ac } = compute(docWith(buff("Scatterlight suit", 6)), ref);
    expect(ac.normal).toBe(10);
    expect(ac.touch).toBe(10);
    expect(ac.touchConditionals).toEqual([{ total: 16, categories: ["rays"], labels: ["rays"] }]);
  });

  it("Mage Armor + Scatterlight suit 6: separate lines, highest first; mage armor doesn't help vs rays", () => {
    const { ac } = compute(docWith(buff("Mage Armor"), buff("Scatterlight suit", 6)), ref);
    expect(ac.touchConditionals).toEqual([
      { total: 16, categories: ["rays"], labels: ["rays"] },
      { total: 14, categories: ["incorporeal"], labels: ["incorporeal"] },
    ]);
  });
});
