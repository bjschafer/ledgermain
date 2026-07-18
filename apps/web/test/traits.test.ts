import { describe, expect, it } from "bun:test";

import type { CharacterDoc, TraitDef } from "@pf1/schema";

import {
  allTraitIds,
  chosenTraitCategories,
  chosenTraitCount,
  EXPECTED_TRAIT_COUNT,
  hasTrait,
  resolveTrait,
  toggleTrait,
  traitsNeedWarning,
} from "../src/model/traits.js";

function makeDoc(traits?: string[], homebrewTraits?: Record<string, TraitDef>): CharacterDoc {
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
      homebrew: homebrewTraits ? { traits: homebrewTraits } : undefined,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function makeTrait(over: Partial<TraitDef> = {}): TraitDef {
  return {
    id: "hb-trait-fixture",
    name: "Homebrew Trait",
    category: "Social",
    summary: "A homebrew trait.",
    changes: [],
    ...over,
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

describe("model/traits: homebrew resolution (issue #87)", () => {
  it("resolveTrait() finds a vendored trait first", () => {
    expect(resolveTrait(makeDoc([]), "reactionary")?.name).toBe("Reactionary");
  });

  it("resolveTrait() falls back to doc.build.homebrew.traits", () => {
    const trait = makeTrait({ id: "hb-1", name: "River Rat" });
    const doc = makeDoc([], { "hb-1": trait });
    expect(resolveTrait(doc, "hb-1")).toEqual(trait);
  });

  it("resolveTrait() returns undefined for an id in neither table", () => {
    expect(resolveTrait(makeDoc([]), "hb-nope")).toBeUndefined();
  });

  it("allTraitIds() includes every vendored id plus this doc's homebrew ids", () => {
    const doc = makeDoc([], { "hb-1": makeTrait({ id: "hb-1" }) });
    const ids = allTraitIds(doc);
    expect(ids).toContain("reactionary");
    expect(ids).toContain("hb-1");
  });

  it("allTraitIds() with no homebrew traits is just the vendored list", () => {
    expect(allTraitIds(makeDoc([]))).not.toContain("hb-1");
  });

  it("chosenTraitCategories() resolves a selected homebrew trait's category too", () => {
    const trait = makeTrait({ id: "hb-1", category: "Magic" });
    const doc = makeDoc(["hb-1"], { "hb-1": trait });
    expect(chosenTraitCategories(doc)).toEqual(["Magic"]);
  });

  it("traitsNeedWarning() fires on a vendored + homebrew trait sharing a category", () => {
    // reactionary is Combat; give the homebrew trait the same category.
    const trait = makeTrait({ id: "hb-1", category: "Combat" });
    const doc = makeDoc(["reactionary", "hb-1"], { "hb-1": trait });
    expect(traitsNeedWarning(doc)).toBe(true);
  });

  it("a homebrew trait id whose definition was deleted is skipped, like an unknown vendored id", () => {
    // Selected but no longer present in build.homebrew.traits (simulates
    // deletion without going through removeHomebrewTrait's cleanup).
    const doc = makeDoc(["hb-gone", "reactionary"]);
    expect(chosenTraitCategories(doc)).toEqual(["Combat"]);
    expect(resolveTrait(doc, "hb-gone")).toBeUndefined();
  });
});
