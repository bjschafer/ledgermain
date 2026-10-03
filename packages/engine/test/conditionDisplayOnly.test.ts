import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { compute, CONDITIONS, CONDITION_IDS } from "../src/index.js";

/**
 * The conditions panel splits its chips on `displayOnly`, and the heading over
 * the second group tells a player those chips do not move any number. That is
 * a claim about the engine, not about the panel, so it is checked here: toggle
 * each condition on an otherwise identical character and compare the whole
 * DerivedSheet. A `displayOnly` condition that silently moved a number would
 * make the panel lie, and nothing else in the suite would notice.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Deliberately ordinary: a mid-level martial with scores that are not all 10,
 *  so a condition touching any ability, save, AC or attack has somewhere to
 *  show up. */
function makeDoc(conditions: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "condition-display-only",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 6 }] },
    abilities: { str: 16, dex: 14, con: 14, int: 12, wis: 13, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 50, temp: 0, nonlethal: 0 },
      conditions: [...conditions],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

const baseline = JSON.stringify(compute(makeDoc([]), ref));

describe("displayOnly conditions move no number", () => {
  for (const id of CONDITION_IDS.filter((c) => CONDITIONS[c]!.displayOnly)) {
    it(`${id} leaves the derived sheet byte-identical`, () => {
      expect(JSON.stringify(compute(makeDoc([id]), ref))).toBe(baseline);
    });
  }
});

describe("scoring conditions do move a number", () => {
  for (const id of CONDITION_IDS.filter((c) => !CONDITIONS[c]!.displayOnly)) {
    it(`${id} changes the derived sheet`, () => {
      expect(JSON.stringify(compute(makeDoc([id]), ref))).not.toBe(baseline);
    });
  }
});
