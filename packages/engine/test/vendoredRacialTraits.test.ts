/**
 * Hand-computed fixture tests for the vendored alternate-racial-trait catalog
 * (issue #74 fill plan, `RefData.racialTraits`) — distinct from the
 * hand-authored 8-race `RACIAL_TRAITS` table covered by `racial-traits.test.ts`.
 * Unlike that table, a vendored pick's `changes[]` apply but nothing suppresses
 * the race's standard `Change`s (see `RacialTrait`'s doc comment in
 * `@pf1/schema`) — these tests prove both halves of that posture: the granted
 * bonus lands, and the race's own baseline is untouched alongside it.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitId(name: string): string {
  const entry = Object.values(ref.racialTraits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored racial trait not found: ${name}`);
  return entry.id;
}

/** Fighter L1, all abilities 10 (mod 0) before racial changes, no gear. */
function makeDoc(raceName: string, vendoredRacialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `vrt-test-${raceName}`,
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(raceName),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vendoredRacialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Oread Granite Skin (vendored, +1 racial natural armor)", () => {
  // Verified against the source: "Rocky growths cover the skin of oreads
  // with this racial trait. They gain a +1 racial bonus to natural armor.
  // This racial trait replaces energy resistance." (replacedTraitNames:
  // ["Energy Resistance"]) — Oread is NOT one of the 8 hand-authored races,
  // so this proves the fill plan's new coverage, not just re-testing the
  // existing table.
  const graniteSkin = traitId("Granite Skin");

  it("adds +1 to natural armor (flat-footed AC, which includes natural but not Dex)", () => {
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted + 1);
    expect(withTrait.ac.normal).toBe(base.ac.normal + 1);
  });

  it("does not touch touch AC (natural armor is excluded from touch)", () => {
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.ac.touch).toBe(base.ac.touch);
  });

  it("leaves the race's own standard changes untouched (no suppression)", () => {
    // Oread's standard ability changes (Str/Wis up, Dex down) still apply in
    // full alongside the vendored grant — nothing here suppresses them.
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.abilities.str.total).toBe(base.abilities.str.total);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total);
  });
});

describe("guards", () => {
  it("ignores a vendored trait id whose race doesn't match", () => {
    const graniteSkin = traitId("Granite Skin");
    const doc = compute(makeDoc("Human", [graniteSkin]), ref);
    const clean = compute(makeDoc("Human"), ref);
    expect(doc.ac.normal).toBe(clean.ac.normal);
  });

  it("ignores an unknown vendored trait id without throwing", () => {
    expect(() => compute(makeDoc("Oread", ["not-a-real-vendored-trait"]), ref)).not.toThrow();
  });
});
