import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture tests for `deriveResourcePools`'s optional `abilityDCs` param
 * (`resources.ts`) — once an `abilityDC.<family>`-targeted modifier raises a
 * character's Channel Energy or Bomb DC, the Resources panel's `detail`
 * string (independently evaluated from the vendored `dcFormula`) must show
 * the same final number as `DerivedSheet.abilityDCs`, not the pre-modifier
 * one. Companion to `abilityDCs.test.ts`'s own modifier-stacking fixtures.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...over,
  } as CharacterDoc;
}

describe("deriveResourcePools abilityDCs override", () => {
  it("cleric Channel Energy detail reflects an abilityDC.channel modifier when abilityDCs is passed", () => {
    const doc = baseDoc({
      identity: { name: "Hex", race: raceId("Human"), classes: [{ tag: "cleric", level: 7 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        resources: {},
        activeBuffs: [
          {
            instanceId: "b1",
            name: "Test Buff",
            changes: [{ formula: "2", target: "abilityDC.channel", type: "untyped" }],
          },
        ],
      },
    });
    const sheet = compute(doc, ref);
    // Base DC 10 + floor(7/2) + Cha mod(2) = 15, +2 from the buff = 17.
    expect(sheet.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 17, save: "Will" },
    ]);

    // Without the override, the pool's own detail independently evaluates the
    // vendored dcFormula and stays at the pre-modifier DC 15 (unaware of the
    // abilityDC.channel change, same as before this wave).
    const withoutOverride = deriveResourcePools(doc, ref, sheet.abilities);
    expect(withoutOverride.find((p) => p.name === "Channel Energy")?.detail).toBe(
      "4d6 (DC 15 Will)",
    );

    // With the override, the detail string matches the panel's final DC 17.
    const withOverride = deriveResourcePools(doc, ref, sheet.abilities, sheet.abilityDCs);
    expect(withOverride.find((p) => p.name === "Channel Energy")?.detail).toBe("4d6 (DC 17 Will)");
  });

  it("alchemist Bomb detail reflects an abilityDC.bomb modifier when abilityDCs is passed", () => {
    const doc = baseDoc({
      identity: {
        name: "Vex",
        race: raceId("Human"),
        classes: [{ tag: "alchemist", level: 5 }],
      },
      abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        resources: {},
        activeBuffs: [
          {
            instanceId: "b1",
            name: "Test Buff",
            changes: [{ formula: "3", target: "abilityDC.bomb", type: "untyped" }],
          },
        ],
      },
    });
    const sheet = compute(doc, ref);
    // Base DC 10 + floor(5/2) + Int mod(3) = 15, +3 from the buff = 18.
    expect(sheet.abilityDCs).toEqual([{ key: "bomb", label: "Bomb DC", dc: 18, save: "Reflex" }]);

    const withoutOverride = deriveResourcePools(doc, ref, sheet.abilities);
    expect(withoutOverride.find((p) => p.name === "Bomb")?.detail).toContain("(DC 15 Ref)");

    const withOverride = deriveResourcePools(doc, ref, sheet.abilities, sheet.abilityDCs);
    expect(withOverride.find((p) => p.name === "Bomb")?.detail).toContain("(DC 18 Ref)");
  });

  it("an unmapped pool (Rage) is byte-identical whether or not abilityDCs is passed", () => {
    const doc = baseDoc({
      identity: {
        name: "Grug",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: 4 }],
      },
      abilities: { str: 16, dex: 10, con: 16, int: 10, wis: 10, cha: 10 },
    });
    const sheet = compute(doc, ref);
    const withoutOverride = deriveResourcePools(doc, ref, sheet.abilities);
    const withOverride = deriveResourcePools(doc, ref, sheet.abilities, sheet.abilityDCs);
    expect(withOverride).toEqual(withoutOverride);
  });
});
