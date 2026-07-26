/**
 * Hand-computed fixture tests for the Agile Maneuvers feat (APG p.150: "you
 * can use your Dexterity modifier instead of your Strength modifier when
 * calculating your Combat Maneuver Bonus"). Modeled as an ability
 * SUBSTITUTION (`ability-substitution.ts`'s "cmb" slot), the same mechanism
 * already used for Mind Over Metal — not a `Change`, since it swaps which
 * ability feeds CMB rather than adding to it.
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

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: { feats?: string[]; abilities?: CharacterDoc["abilities"] }): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "agile-maneuvers-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    // STR 16 -> mod +3; DEX 18 -> mod +4 (Dex clearly higher, so the swap is
    // an unambiguous improvement).
    abilities: over.abilities ?? { str: 16, dex: 18, con: 12, int: 10, wis: 10, cha: 8 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute(): Agile Maneuvers substitutes Dex for Str in CMB (APG p.150)", () => {
  it("without the feat, CMB uses Str: BAB(1) + STR(3) = 4", () => {
    const sheet = compute(makeDoc({}), ref);
    expect(sheet.cmb).toBe(4);
  });

  it("with the feat, CMB uses the higher Dex instead: BAB(1) + DEX(4) = 5", () => {
    const doc = makeDoc({ feats: [featId("Agile Maneuvers")] });
    const sheet = compute(doc, ref);
    expect(sheet.cmb).toBe(5);
  });

  it("CMD is unaffected by the feat — the substitution is CMB-only", () => {
    const withFeat = compute(makeDoc({ feats: [featId("Agile Maneuvers")] }), ref);
    const without = compute(makeDoc({}), ref);
    expect(withFeat.cmd).toBe(without.cmd);
  });

  it("does not apply the swap backwards when Str is higher than Dex", () => {
    // STR 18 -> mod +4; DEX 10 -> mod +0. Agile Maneuvers never makes CMB
    // worse — the substitution only wins when it's an improvement (see
    // `resolveSubstitution`'s highest-wins convention).
    const doc = makeDoc({
      feats: [featId("Agile Maneuvers")],
      abilities: { str: 18, dex: 10, con: 12, int: 10, wis: 10, cha: 8 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.cmb).toBe(5); // BAB(1) + STR(4)
  });

  it("is a no-op for a Tiny-or-smaller creature (already using Dex via CRB p.199)", () => {
    // Medium -> Tiny is a 2-step reduction on the size ladder; STR 16 -> +3,
    // DEX 18 -> +4. Tiny-or-smaller already substitutes Dex for Str in CMB
    // (CRB p.199) with no feat needed, so Agile Maneuvers changes nothing.
    const tinyBuff = {
      instanceId: "buff-tiny",
      name: "Shrink to Tiny",
      changes: [{ target: "size", type: "untyped", formula: "-2" }],
    };
    const withoutFeat = compute(
      { ...makeDoc({}), live: { ...makeDoc({}).live, activeBuffs: [tinyBuff] } },
      ref,
    );
    const withFeat = compute(
      {
        ...makeDoc({ feats: [featId("Agile Maneuvers")] }),
        live: { ...makeDoc({}).live, activeBuffs: [tinyBuff] },
      },
      ref,
    );
    expect(withFeat.cmb).toBe(withoutFeat.cmb);
  });
});
