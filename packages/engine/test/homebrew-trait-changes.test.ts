/**
 * Homebrew trait definitions (issue #87): unlike homebrew races/feats, a
 * homebrew trait isn't overlaid onto `RefData` (traits aren't vendored data
 * — see `src/traits.ts`'s doc comment) — its definition instead rides in
 * `doc.build.homebrew.traits` and is looked up as a fallback wherever the
 * engine's hand-authored `TRAITS` table is consulted (`collect.ts`).
 * Verifies `collectModifiers` applies a homebrew trait's `changes[]`, that it
 * uses the real "trait" stacking type (so it correctly does NOT stack with a
 * same-target vendored trait bonus), and that an unrelated homebrew trait
 * selection doesn't disturb the vendored-trait path.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, TraitDef } from "@pf1/schema";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HOMEBREW_TRAIT_ID = "hb-trait-stalwart";

function homebrewTrait(over: Partial<TraitDef> = {}): TraitDef {
  return {
    id: HOMEBREW_TRAIT_ID,
    name: "Stalwart Upbringing",
    category: "Combat",
    summary: "+1 trait bonus on Fortitude saving throws.",
    changes: [{ formula: "1", target: "fort", type: "trait" }],
    ...over,
  };
}

function makeDoc(over: {
  traits?: string[];
  homebrewTraits?: Record<string, TraitDef>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      traits: over.traits ?? [],
      homebrew: over.homebrewTraits ? { traits: over.homebrewTraits } : undefined,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("homebrew trait changes", () => {
  it("applies a homebrew trait's own changes even though it has no TRAITS table entry", () => {
    const trait = homebrewTrait();
    const withoutTrait = compute(makeDoc({}), ref);
    const withTrait = compute(
      makeDoc({ traits: [trait.id], homebrewTraits: { [trait.id]: trait } }),
      ref,
    );
    expect(withTrait.saves.fort.total - withoutTrait.saves.fort.total).toBe(1);
    const comp = withTrait.saves.fort.components.find((c) => c.source === trait.name);
    expect(comp).toBeDefined();
    expect(comp!.type).toBe("trait");
    expect(comp!.value).toBe(1);
    expect(comp!.applied).toBe(true);
  });

  it('a homebrew "trait"-type bonus does not stack with a same-target vendored trait bonus', () => {
    // "resilient" (vendored) already grants +1 trait bonus to Fortitude —
    // taking both should still yield only +1, exactly like taking the same
    // vendored trait twice (see traits.test.ts), proving the homebrew
    // definition's `type: "trait"` really participates in the same
    // non-stacking bucket as the engine's hand-authored table.
    const trait = homebrewTrait();
    const baseline = compute(makeDoc({}), ref);
    const both = compute(
      makeDoc({
        traits: ["resilient", trait.id],
        homebrewTraits: { [trait.id]: trait },
      }),
      ref,
    );
    expect(both.saves.fort.total).toBe(baseline.saves.fort.total + 1);
  });

  it("selecting an id with no matching definition anywhere (vendored or homebrew) is a no-op", () => {
    const baseline = compute(makeDoc({}), ref);
    const sheet = compute(makeDoc({ traits: ["hb-does-not-exist"] }), ref);
    expect(sheet.saves.fort.total).toBe(baseline.saves.fort.total);
  });

  it("does not affect vendored traits when unrelated homebrew traits exist but aren't selected", () => {
    const trait = homebrewTrait();
    const baseline = compute(makeDoc({}), ref);
    const sheet = compute(
      makeDoc({ traits: ["resilient"], homebrewTraits: { [trait.id]: trait } }),
      ref,
    );
    expect(sheet.saves.fort.total).toBe(baseline.saves.fort.total + 1);
  });
});
