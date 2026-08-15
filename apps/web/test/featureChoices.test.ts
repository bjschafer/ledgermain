import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  archetypeFeatureChoice,
  archetypeFeatureChoiceDescriptor,
  classFeatureChoice,
  classFeatureChoiceDescriptor,
  setArchetypeFeatureChoice,
  setClassFeatureChoice,
} from "../src/model/featureChoices.js";

function makeDoc(pickChoices?: Record<string, string>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
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

// Invulnerable Rager's Extreme Endurance (fire-or-cold pick).
const EXTREME_ENDURANCE = "barbarian:invulnerable-rager:extreme-endurance:3";

describe("model/featureChoices: archetypeFeatureChoiceDescriptor", () => {
  it("returns the declared choice for Extreme Endurance", () => {
    const descriptor = archetypeFeatureChoiceDescriptor(EXTREME_ENDURANCE);
    expect(descriptor?.label).toBe("Energy type");
    expect(descriptor?.options.map((o) => o.id).sort()).toEqual(["cold", "fire"]);
  });

  it("returns undefined for a feature id with no declared choice", () => {
    expect(archetypeFeatureChoiceDescriptor("not-a-real-feature-id")).toBeUndefined();
  });
});

describe("model/featureChoices: archetypeFeatureChoice / setArchetypeFeatureChoice", () => {
  it("stores the pick under the archetypeFeature:<id> key", () => {
    const doc = setArchetypeFeatureChoice(makeDoc(), EXTREME_ENDURANCE, "fire");
    expect(doc.build.pickChoices).toEqual({ [`archetypeFeature:${EXTREME_ENDURANCE}`]: "fire" });
    expect(archetypeFeatureChoice(doc, EXTREME_ENDURANCE)).toBe("fire");
  });

  it("undefined clears the stored pick", () => {
    let doc = setArchetypeFeatureChoice(makeDoc(), EXTREME_ENDURANCE, "cold");
    doc = setArchetypeFeatureChoice(doc, EXTREME_ENDURANCE, undefined);
    expect(archetypeFeatureChoice(doc, EXTREME_ENDURANCE)).toBeUndefined();
  });

  it("is a no-op (same object) when the value is unchanged", () => {
    const doc = setArchetypeFeatureChoice(makeDoc(), EXTREME_ENDURANCE, "fire");
    expect(setArchetypeFeatureChoice(doc, EXTREME_ENDURANCE, "fire")).toBe(doc);
    expect(setArchetypeFeatureChoice(makeDoc(), EXTREME_ENDURANCE, undefined)).toEqual(makeDoc());
  });
});

// Proctor's Monitor Expression (executor/foster/harmonizer/impulsive pick).
const MONITOR_EXPRESSION = "nAf2hU0pfOBrOSAr";
// Wizard Abjuration school's Resistance (Power) (daily energy-type pick),
// routed via GRANTED_POWER_CHOICES but stored under the same classFeature
// namespace as a base class feature's choice.
const RESISTANCE_POWER = "UeYdiNoaF0gG08Y5";

describe("model/featureChoices: classFeatureChoiceDescriptor", () => {
  it("resolves a base class feature's choice by bare name", () => {
    const descriptor = classFeatureChoiceDescriptor("proctor", "Monitor Expression");
    expect(descriptor?.label).toBe("Monitor expression");
    expect(descriptor?.options.map((o) => o.id).sort()).toEqual([
      "executor",
      "foster",
      "harmonizer",
      "impulsive",
    ]);
  });

  it("resolves a granted power's choice by name, independent of classTag", () => {
    const descriptor = classFeatureChoiceDescriptor("wizard", "Resistance (Power)");
    expect(descriptor?.label).toBe("Energy type");
    expect(descriptor?.options.map((o) => o.id).sort()).toEqual([
      "acid",
      "cold",
      "electricity",
      "fire",
      "sonic",
    ]);
  });

  it("returns undefined for a feature name with no declared choice", () => {
    expect(classFeatureChoiceDescriptor("fighter", "Bravery")).toBeUndefined();
  });
});

describe("model/featureChoices: classFeatureChoice / setClassFeatureChoice", () => {
  it("stores the pick under the classFeature:<id> key", () => {
    const doc = setClassFeatureChoice(makeDoc(), MONITOR_EXPRESSION, "executor");
    expect(doc.build.pickChoices).toEqual({
      [`classFeature:${MONITOR_EXPRESSION}`]: "executor",
    });
    expect(classFeatureChoice(doc, MONITOR_EXPRESSION)).toBe("executor");
  });

  it("works identically for a granted power's stored pick", () => {
    const doc = setClassFeatureChoice(makeDoc(), RESISTANCE_POWER, "fire");
    expect(classFeatureChoice(doc, RESISTANCE_POWER)).toBe("fire");
  });

  it("undefined clears the stored pick", () => {
    let doc = setClassFeatureChoice(makeDoc(), MONITOR_EXPRESSION, "foster");
    doc = setClassFeatureChoice(doc, MONITOR_EXPRESSION, undefined);
    expect(classFeatureChoice(doc, MONITOR_EXPRESSION)).toBeUndefined();
  });

  it("is a no-op (same object) when the value is unchanged", () => {
    const doc = setClassFeatureChoice(makeDoc(), MONITOR_EXPRESSION, "executor");
    expect(setClassFeatureChoice(doc, MONITOR_EXPRESSION, "executor")).toBe(doc);
  });
});
