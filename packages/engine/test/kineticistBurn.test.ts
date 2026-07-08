import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  burnDetailLabel,
  burnPerRoundLimit,
  compute,
  deriveResourcePools,
  kineticBlastDetail,
} from "../src/index.js";

/**
 * Kineticist (Occult Adventures, 17-class expansion follow-up wave) — class
 * vend + the Burn resource pool (which rides in FREE from the vendored Burn
 * feature's `uses.maxFormula: "3 + @abilities.con.mod"`, no hand-authoring
 * needed for the max) + the hand-authored display helpers. Lookups scoped by
 * classTag, never bare name.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(classes: { tag: string; level: number }[], con: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities: { str: 10, dex: 10, con, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("kineticist class vend (real vendored data slice)", () => {
  it("kineticist 4 computes: 3/4 BAB (+3), good Fort/Ref, poor Will", () => {
    const sheet = compute(makeDoc([{ tag: "kineticist", level: 4 }], 16), ref);
    expect(sheet.bab).toBe(3); // med: floor(4 * 3/4)
    expect(sheet.saves.fort.total).toBe(7); // good base 4 + Con +3
    expect(sheet.saves.ref.total).toBe(4); // good base 4 + Dex 0
    expect(sheet.saves.will.total).toBe(1); // poor base 1 + Wis 0
  });

  it("kineticist is a NON-caster: no vendored spell list at all (correct, it does not cast)", () => {
    expect(ref.spellLists["kineticist"]).toBeUndefined();
  });
});

describe("Burn resource pool (vendored uses.maxFormula, not hand-authored)", () => {
  it("burn max = 3 + Con mod (Con 16 → 6), tracked in charges", () => {
    const doc = makeDoc([{ tag: "kineticist", level: 4 }], 16);
    const sheet = compute(doc, ref);
    const burn = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "kineticist" && p.name === "Burn",
    );
    expect(burn).toBeDefined();
    expect(burn!.max).toBe(6); // 3 + 3
    expect(burn!.per).toBe("charges");
    expect(burn!.restValue).toBe(6); // full night's rest removes all burn
  });

  it("burn detail explains the nonlethal-per-CHARACTER-level rule without auto-applying it", () => {
    // Multiclass on purpose: character level 7 (kineticist 4 / fighter 3) —
    // the nonlethal amount must use TOTAL character level, per RAW; the
    // per-round cap uses kineticist class level (4 → still 1/round).
    const doc = makeDoc(
      [
        { tag: "kineticist", level: 4 },
        { tag: "fighter", level: 3 },
      ],
      16,
    );
    const sheet = compute(doc, ref);
    const burn = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "kineticist" && p.name === "Burn",
    );
    expect(burn!.detail).toBe(burnDetailLabel(7, 4));
    expect(burn!.detail).toContain("7 nonlethal");
    expect(burn!.detail).toContain("max 1 accepted/round");
  });
});

describe("burnPerRoundLimit (hand-computed vs. the published tiers)", () => {
  it("1/round at L1-5, 2 at L6-8, 3 at L9-11, 4 at L12-14, 5 at L15-17, 6 at L18+", () => {
    expect(burnPerRoundLimit(1)).toBe(1);
    expect(burnPerRoundLimit(5)).toBe(1);
    expect(burnPerRoundLimit(6)).toBe(2);
    expect(burnPerRoundLimit(8)).toBe(2);
    expect(burnPerRoundLimit(9)).toBe(3);
    expect(burnPerRoundLimit(12)).toBe(4);
    expect(burnPerRoundLimit(15)).toBe(5);
    expect(burnPerRoundLimit(18)).toBe(6);
    expect(burnPerRoundLimit(20)).toBe(6);
  });
});

describe("kineticBlastDetail (hand-computed vs. the published progression)", () => {
  it("dice = ceil(level/2): 1d6 at L1, 2d6 at L3-4, 10d6 at L19-20", () => {
    expect(kineticBlastDetail(1).dice).toBe(1);
    expect(kineticBlastDetail(3).dice).toBe(2);
    expect(kineticBlastDetail(4).dice).toBe(2);
    expect(kineticBlastDetail(19).dice).toBe(10);
    expect(kineticBlastDetail(20).dice).toBe(10);
  });

  it("resolved labels: L4 Con +3 → physical 2d6+5, energy 2d6+1 (touch)", () => {
    const d = kineticBlastDetail(4, 3);
    expect(d.physicalLabel).toBe("2d6+5 (physical)"); // 2 (dice rider) + 3 (Con)
    expect(d.energyLabel).toBe("2d6+1 (energy, touch)"); // floor(3/2)
  });

  it("symbolic labels when no Con mod is supplied", () => {
    const d = kineticBlastDetail(5);
    expect(d.physicalLabel).toBe("3d6+3 + Con mod (physical)");
    expect(d.energyLabel).toBe("3d6 + 1/2 Con mod (energy, touch)");
  });

  it("blast details surface on the computed sheet's class-feature rows", () => {
    const sheet = compute(makeDoc([{ tag: "kineticist", level: 4 }], 16), ref);
    const physical = sheet.classFeatures.find(
      (f) => f.classTag === "kineticist" && f.name === "Physical Kinetic Blast",
    );
    const energy = sheet.classFeatures.find(
      (f) => f.classTag === "kineticist" && f.name === "Energy Kinetic Blast",
    );
    expect(physical?.detail).toBe("2d6+5 (physical)");
    expect(energy?.detail).toBe("2d6+1 (energy, touch)");
  });
});
