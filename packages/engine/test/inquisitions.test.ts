import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { resolveClassFeatures } from "../src/index.js";

/**
 * An inquisitor's inquisition (Ultimate Magic pp.41-44) — the alternative to
 * a domain, granting its own named powers off the inquisitor's own level
 * rather than `domainCasterLevel` (never a cleric concern). Conversion's two
 * granted powers, Charm of Wisdom (1st) and Swaying Word (8th), are the fixture
 * used throughout — see `packages/data-pipeline/test/inquisitions.test.ts`
 * for the parse-level coverage of the granted-power import itself.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeInquisitor(level: number, inquisition: string | undefined): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "inquisitor", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      inquisition,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function inquisitionFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "inquisition")
    .map((f) => f.name)
    .sort();
}

describe("inquisitor inquisition powers", () => {
  it("a level-1 inquisitor with Conversion gets Charm of Wisdom, not the 8th-level Swaying Word", () => {
    expect(inquisitionFeatureNames(makeInquisitor(1, "conversion"))).toEqual(["Charm of Wisdom"]);
  });

  it("gates the second granted power on the inquisitor's own level", () => {
    expect(inquisitionFeatureNames(makeInquisitor(7, "conversion"))).toEqual(["Charm of Wisdom"]);
    expect(inquisitionFeatureNames(makeInquisitor(8, "conversion"))).toEqual([
      "Charm of Wisdom",
      "Swaying Word",
    ]);
  });

  it("attributes the grant to the inquisitor class, not a phantom cleric", () => {
    const { classFeatures } = resolveClassFeatures(makeInquisitor(8, "conversion"), ref);
    const granted = classFeatures.filter((f) => f.origin?.kind === "inquisition");
    expect(granted.length).toBeGreaterThan(0);
    expect(granted.every((f) => f.classTag === "inquisitor")).toBe(true);
    expect(granted.every((f) => f.origin?.label === "Conversion")).toBe(true);
  });

  it("grants nothing when no inquisition is chosen", () => {
    expect(inquisitionFeatureNames(makeInquisitor(8, undefined))).toEqual([]);
  });

  it("grants nothing to a non-inquisitor even with a stale `build.inquisition`", () => {
    const doc = makeInquisitor(8, "conversion");
    const fighter = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 8 }] },
    };
    expect(inquisitionFeatureNames(fighter)).toEqual([]);
  });

  it("an inquisition with no named power (Black Powder) grants no class-feature rows — its prose still carries the whole granted-powers text", () => {
    expect(inquisitionFeatureNames(makeInquisitor(10, "black_powder"))).toEqual([]);
    expect(ref.inquisitions.black_powder!.description).toContain("Granted Powers");
  });
});
