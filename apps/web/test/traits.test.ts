import { describe, expect, it } from "bun:test";

import type { CharacterDoc, RefData, TraitDef } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

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

const ref: RefData = loadRefData();

function vendoredIdByName(name: string): string {
  const entry = Object.values(ref.traits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored trait not found: ${name}`);
  return entry.id;
}

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
    expect(traitsNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than the expected count is chosen", () => {
    const doc = makeDoc(["reactionary", "indomitableFaith", "resilient"]);
    expect(traitsNeedWarning(doc, ref)).toBe(true);
  });

  it("warns when two traits share a category, even at the expected count", () => {
    // reactionary + resilient are both Combat traits.
    const doc = makeDoc(["reactionary", "resilient"]);
    expect(chosenTraitCategories(doc, ref)).toEqual(["Combat", "Combat"]);
    expect(traitsNeedWarning(doc, ref)).toBe(true);
  });

  it("unknown trait ids are skipped when computing categories, never crash", () => {
    const doc = makeDoc(["not-a-real-trait", "reactionary"]);
    expect(chosenTraitCategories(doc, ref)).toEqual(["Combat"]);
    expect(traitsNeedWarning(doc, ref)).toBe(false);
  });

  it("empty selection needs no warning", () => {
    expect(traitsNeedWarning(makeDoc([]), ref)).toBe(false);
  });
});

describe("model/traits: homebrew resolution (issue #87)", () => {
  it("resolveTrait() finds a hand-authored trait first", () => {
    expect(resolveTrait(makeDoc([]), ref, "reactionary")?.name).toBe("Reactionary");
  });

  it("resolveTrait() falls back to doc.build.homebrew.traits", () => {
    const trait = makeTrait({ id: "hb-1", name: "River Rat" });
    const doc = makeDoc([], { "hb-1": trait });
    expect(resolveTrait(doc, ref, "hb-1")).toEqual(trait);
  });

  it("resolveTrait() returns undefined for an id in no table", () => {
    expect(resolveTrait(makeDoc([]), ref, "hb-nope")).toBeUndefined();
  });

  it("allTraitIds() includes every vendored id plus this doc's homebrew ids", () => {
    const doc = makeDoc([], { "hb-1": makeTrait({ id: "hb-1" }) });
    const ids = allTraitIds(doc, ref);
    expect(ids).toContain("reactionary");
    expect(ids).toContain("hb-1");
  });

  it("allTraitIds() with no homebrew traits is just the merged vendored catalog", () => {
    expect(allTraitIds(makeDoc([]), ref)).not.toContain("hb-1");
  });

  it("chosenTraitCategories() resolves a selected homebrew trait's category too", () => {
    const trait = makeTrait({ id: "hb-1", category: "Magic" });
    const doc = makeDoc(["hb-1"], { "hb-1": trait });
    expect(chosenTraitCategories(doc, ref)).toEqual(["Magic"]);
  });

  it("traitsNeedWarning() fires on a vendored + homebrew trait sharing a category", () => {
    // reactionary is Combat; give the homebrew trait the same category.
    const trait = makeTrait({ id: "hb-1", category: "Combat" });
    const doc = makeDoc(["reactionary", "hb-1"], { "hb-1": trait });
    expect(traitsNeedWarning(doc, ref)).toBe(true);
  });

  it("a homebrew trait id whose definition was deleted is skipped, like an unknown vendored id", () => {
    // Selected but no longer present in build.homebrew.traits (simulates
    // deletion without going through removeHomebrewTrait's cleanup).
    const doc = makeDoc(["hb-gone", "reactionary"]);
    expect(chosenTraitCategories(doc, ref)).toEqual(["Combat"]);
    expect(resolveTrait(doc, ref, "hb-gone")).toBeUndefined();
  });
});

describe("model/traits: vendored catalog + id-stability migration (issue #74 Phase 1)", () => {
  it("the catalog now carries close to the full ~2,000-entry vendored trait pack", () => {
    // 28 hand-authored + ~1,950 surviving vendored entries after name-collision
    // dedup (see the next tests) — well above the pre-vendoring 28.
    expect(allTraitIds(makeDoc([]), ref).length).toBeGreaterThan(1900);
  });

  it("resolves a trait that exists ONLY in the vendored catalog, not the hand-authored 28", () => {
    const id = vendoredIdByName("Ambush Training (Pathfinder Society)");
    const trait = resolveTrait(makeDoc([]), ref, id);
    expect(trait?.name).toBe("Ambush Training (Pathfinder Society)");
    expect(trait?.category).toBe("Combat");
    expect(trait?.changes).toEqual([{ formula: "1", target: "init", type: "trait" }]);
  });

  it("an existing CharacterDoc's legacy hand-authored id keeps resolving to the SAME (verified) entry after vendoring — no doc migration needed", () => {
    // The vendored catalog independently carries a "Reactionary" entry too
    // (a different Foundry id) — resolving the legacy slug id must still
    // return the hand-authored, hand-verified definition, not the vendored
    // one, so existing CharacterDocs referencing "reactionary" see no change
    // in behavior.
    const trait = resolveTrait(makeDoc([]), ref, "reactionary");
    expect(trait?.summary).toBe("+2 trait bonus on initiative checks.");
    expect(trait?.changes).toEqual([{ formula: "2", target: "init", type: "trait" }]);
  });

  it("the vendored catalog's own duplicate of a hand-authored trait name is not offered as a second pick", () => {
    const vendoredReactionaryId = vendoredIdByName("Reactionary");
    expect(vendoredReactionaryId).not.toBe("reactionary");
    expect(allTraitIds(makeDoc([]), ref)).not.toContain(vendoredReactionaryId);
  });

  it("a vendored-only trait with no hand-curated summary surfaces its HTML description instead", () => {
    const id = vendoredIdByName("Ambush Training (Pathfinder Society)");
    const trait = resolveTrait(makeDoc([]), ref, id);
    expect(trait?.summary).toBeUndefined();
    expect(trait?.description).toContain("+1 trait bonus on initiative checks");
  });

  it("a drawback-type vendored trait is pickable but grants no extra slot (deferred — see model/traits.ts doc comment)", () => {
    const drawback = Object.values(ref.traits).find((t) => t.traitType === "drawback");
    expect(drawback).toBeDefined();
    const doc = makeDoc([drawback!.id, "reactionary", "resilient"]);
    // Three traits including a drawback still reads as "over budget" — the
    // conventional third-trait allowance isn't modeled.
    expect(chosenTraitCount(doc)).toBe(3);
    expect(traitsNeedWarning(doc, ref)).toBe(true);
  });
});
