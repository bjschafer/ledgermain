import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  chosenTraitCategories,
  chosenTraitCount,
  EXPECTED_TRAIT_COUNT,
  hasTrait,
  toggleTrait,
  traitsNeedWarning,
} from "../src/model/traits.js";

function makeDoc(traits?: string[]): CharacterDoc {
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
      traits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/traits: toggleTrait", () => {
  it("adds a trait id not yet present", () => {
    const doc = toggleTrait(makeDoc([]), "reactionary");
    expect(doc.build.traits).toEqual(["reactionary"]);
    expect(hasTrait(doc, "reactionary")).toBe(true);
  });

  it("adds to an undefined traits array (back-compat docs)", () => {
    const doc = toggleTrait(makeDoc(undefined), "reactionary");
    expect(doc.build.traits).toEqual(["reactionary"]);
  });

  it("removes a trait id already present", () => {
    const doc = toggleTrait(makeDoc(["reactionary", "deftDodger"]), "reactionary");
    expect(doc.build.traits).toEqual(["deftDodger"]);
  });

  it("never blocks taking a third trait", () => {
    const doc = toggleTrait(makeDoc(["reactionary", "deftDodger"]), "resilient");
    expect(doc.build.traits).toEqual(["reactionary", "deftDodger", "resilient"]);
    expect(chosenTraitCount(doc)).toBe(3);
  });
});

describe("model/traits: soft budget warning", () => {
  it("no warning at exactly the expected count from different categories", () => {
    // reactionary = Combat, indomitableFaith = Faith
    const doc = makeDoc(["reactionary", "indomitableFaith"]);
    expect(chosenTraitCount(doc)).toBe(EXPECTED_TRAIT_COUNT);
    expect(traitsNeedWarning(doc)).toBe(false);
  });

  it("warns when more than the expected count is chosen", () => {
    const doc = makeDoc(["reactionary", "indomitableFaith", "resilient"]);
    expect(traitsNeedWarning(doc)).toBe(true);
  });

  it("warns when two traits share a category, even at the expected count", () => {
    // reactionary + resilient are both Combat traits.
    const doc = makeDoc(["reactionary", "resilient"]);
    expect(chosenTraitCategories(doc)).toEqual(["Combat", "Combat"]);
    expect(traitsNeedWarning(doc)).toBe(true);
  });

  it("unknown trait ids are skipped when computing categories, never crash", () => {
    const doc = makeDoc(["not-a-real-trait", "reactionary"]);
    expect(chosenTraitCategories(doc)).toEqual(["Combat"]);
    expect(traitsNeedWarning(doc)).toBe(false);
  });

  it("empty selection needs no warning", () => {
    expect(traitsNeedWarning(makeDoc([]))).toBe(false);
  });
});
