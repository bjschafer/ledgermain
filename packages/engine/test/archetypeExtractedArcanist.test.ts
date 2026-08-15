import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED,
  ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/arcanist.js";

/**
 * Fixture test for `archetype-extracted/arcanist.ts`'s one `numeric`
 * classification: Elemental Master's "Elemental Movement" choose-one
 * air/earth/fire/water pick, run end-to-end through `compute()`.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === classTag,
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

function makeDoc(
  level: number,
  archetypes: string[],
  pickChoices?: Record<string, string>,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "arcanist", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      archetypes,
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      pickChoices,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED shape", () => {
  it("has exactly 1 entry, classified numeric", () => {
    expect(Object.keys(ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(1);
    expect(
      ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION["arcanist:elemental-master:elemental-movement:15"]
        ?.bucket,
    ).toBe("numeric");
  });

  it("the stale -su id stays subsystem and unextracted", () => {
    expect(
      ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION[
        "arcanist:elemental-master:elemental-movement-su:15"
      ]?.bucket,
    ).toBe("subsystem");
    expect(
      ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED["arcanist:elemental-master:elemental-movement-su:15"],
    ).toBeUndefined();
  });
});

describe("Elemental Master: Elemental Movement air/earth/fire/water pick (build.pickChoices)", () => {
  const elementalMaster = archetypeId("Elemental Master", "arcanist");
  const featureId = "arcanist:elemental-master:elemental-movement:15";
  const pickChoiceKey = `archetypeFeature:${featureId}`;

  function sheetWithElement(element: string | undefined) {
    return compute(
      makeDoc(15, [elementalMaster], element ? { [pickChoiceKey]: element } : undefined),
      ref,
    );
  }

  it("no stored pick: no movement grant", () => {
    const sheet = sheetWithElement(undefined);
    expect(sheet.speeds.fly ?? 0).toBe(0);
    expect(sheet.speeds.burrow ?? 0).toBe(0);
    expect(sheet.speeds.swim ?? 0).toBe(0);
  });

  it("air: fly speed 90 ft.", () => {
    expect(sheetWithElement("air").speeds.fly).toBe(90);
  });

  it("earth: burrow speed 30 ft.", () => {
    expect(sheetWithElement("earth").speeds.burrow).toBe(30);
  });

  it("fire: +30 ft. land speed", () => {
    const sheet = sheetWithElement("fire");
    const base = sheetWithElement(undefined);
    expect((sheet.speeds.land ?? 0) - (base.speeds.land ?? 0)).toBe(30);
  });

  it("water: swim speed 60 ft.", () => {
    expect(sheetWithElement("water").speeds.swim).toBe(60);
  });

  it("a stale option id grants nothing", () => {
    const sheet = sheetWithElement("aether");
    expect(sheet.speeds.fly ?? 0).toBe(0);
    expect(sheet.speeds.burrow ?? 0).toBe(0);
    expect(sheet.speeds.swim ?? 0).toBe(0);
  });
});
