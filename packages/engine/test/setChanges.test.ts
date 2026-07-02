/**
 * Engine tests for A3: Foundry `operator: "set"` change semantics for speed
 * targets (`landSpeed`/`flySpeed`/`swimSpeed`/`climbSpeed`/`burrowSpeed`).
 *
 * Set-changes REPLACE a speed mode's value rather than adding to it, and are
 * evaluated against `@attributes.speed.<mode>.total` seeded with the
 * character's race base speed (see rolldata.ts `buildRollData` doc comment).
 * When multiple set-changes target the same mode, the lowest wins (every
 * vendored set-change is a penalty — see compute.ts `applySpeedTarget`).
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

// Human: 30 ft land speed, no other movement modes.
function baseDoc(activeBuffs: ActiveBuff[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test-set-changes",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 5 }] },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
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
      activeBuffs,
      resources: {},
    },
  };
}

describe("speed set-changes (A3)", () => {
  it("Slow's set-formula halves (round to 5ft) a 30ft land speed to 15, not additive", () => {
    const slow: ActiveBuff = {
      instanceId: "b-slow",
      name: "Test Slow",
      changes: [
        {
          target: "landSpeed",
          operator: "set",
          type: "untyped",
          formula:
            "if(gt(@attributes.speed.land.total, 0), max(1, floor(@attributes.speed.land.total / 5 / 2)) * 5)",
        },
      ],
    };
    const sheet = compute(baseDoc([slow]), ref);
    expect(sheet.speeds.land).toBe(15);
  });

  it("Debilitating Injury (Hampered) shape halves speed (min 5), not +5", () => {
    const hampered: ActiveBuff = {
      instanceId: "b-hampered",
      name: "Test Hampered",
      changes: [
        {
          target: "landSpeed",
          operator: "set",
          type: "untyped",
          formula: "max(5, floor(@attributes.speed.land.total / 2))",
        },
      ],
    };
    const sheet = compute(baseDoc([hampered]), ref);
    expect(sheet.speeds.land).toBe(15);
  });

  it("an additive landSpeed bonus alongside a set-change: set wins", () => {
    const additive: ActiveBuff = {
      instanceId: "b-additive",
      name: "Test Additive +10",
      changes: [{ target: "landSpeed", type: "untyped", formula: "10" }],
    };
    const hampered: ActiveBuff = {
      instanceId: "b-hampered",
      name: "Test Hampered",
      changes: [
        {
          target: "landSpeed",
          operator: "set",
          type: "untyped",
          formula: "max(5, floor(@attributes.speed.land.total / 2))",
        },
      ],
    };
    const sheet = compute(baseDoc([additive, hampered]), ref);
    expect(sheet.speeds.land).toBe(15);
  });

  it("no set-change present: additive behavior is unchanged", () => {
    const additive: ActiveBuff = {
      instanceId: "b-additive",
      name: "Test Additive +10",
      changes: [{ target: "landSpeed", type: "untyped", formula: "10" }],
    };
    const sheet = compute(baseDoc([additive]), ref);
    expect(sheet.speeds.land).toBe(40);
  });

  it("no active buffs: land speed is the race base (30)", () => {
    const sheet = compute(baseDoc([]), ref);
    expect(sheet.speeds.land).toBe(30);
  });
});
