/**
 * Defensive Training fixtures — the standard-race half of the AC-note
 * promotion route (`race-ac-notes.ts`): Dwarf and Gnome both carry "+4 Dodge
 * vs Giants" as a vendored `ac` context note and nothing else, so the +4
 * dodge bonus vs. the giant subtype (Core Rulebook, both races) must arrive
 * as a conditional AC line, not a headline change.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(race: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "race-ac-note-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId(race), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
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

describe("Defensive Training (+4 dodge AC vs. giants, dwarf and gnome)", () => {
  it("prints a giants line 4 above headline AC for a dwarf, leaving headlines bare", () => {
    const sheet = compute(makeDoc("Dwarf"), ref);
    // Medium, Dex 0, no armor: AC 10 across the board.
    expect(sheet.ac.normal).toBe(10);
    expect(sheet.ac.conditionals).toEqual([
      { total: 14, categories: ["giants"], labels: ["giants"] },
    ]);
    // The scoped dodge bonus must not reach CMD's auto-derivation either:
    // 10 + BAB 1 + Str 0 + Dex 0 = 11.
    expect(sheet.cmd).toBe(11);
  });

  it("prints the same +4 line for a gnome, on top of its size-adjusted AC", () => {
    const sheet = compute(makeDoc("Gnome"), ref);
    // Small: AC 10 + 1 size = 11; the giants line sits 4 above whatever the
    // headline is rather than at a hardcoded value.
    expect(sheet.ac.conditionals).toEqual([
      { total: sheet.ac.normal + 4, categories: ["giants"], labels: ["giants"] },
    ]);
  });
});
