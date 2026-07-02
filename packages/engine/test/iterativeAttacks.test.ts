/**
 * Hand-computed fixture tests for full-attack iterative sequences (PF1 CRB):
 * an extra attack at BAB +6, +11, and +16, each at a cumulative -5, capped at
 * 4 attacks total. Count depends only on BAB; the bonus at each step depends
 * on the full attack total (BAB + ability + size + enh + ... ).
 *
 * Explicitly out of scope (per the audit finding): haste/speed extra attacks,
 * two-weapon fighting, and flurry of blows all modify the iterative sequence
 * beyond plain BAB and are not modeled here.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import { iterativeSequence } from "../src/compute.js";

const ref = loadRefData();

describe("iterativeSequence: attack count from BAB", () => {
  it("BAB 5 -> single attack (undefined)", () => {
    expect(iterativeSequence(5, 5)).toBeUndefined();
  });

  it("BAB 6 -> 2 attacks: +6/+1", () => {
    expect(iterativeSequence(6, 6)).toEqual([6, 1]);
  });

  it("BAB 10 -> 2 attacks: +10/+5", () => {
    expect(iterativeSequence(10, 10)).toEqual([10, 5]);
  });

  it("BAB 11 -> 3 attacks: +11/+6/+1", () => {
    expect(iterativeSequence(11, 11)).toEqual([11, 6, 1]);
  });

  it("BAB 15 -> 3 attacks: +15/+10/+5", () => {
    expect(iterativeSequence(15, 15)).toEqual([15, 10, 5]);
  });

  it("BAB 16 -> 4 attacks: +16/+11/+6/+1", () => {
    expect(iterativeSequence(16, 16)).toEqual([16, 11, 6, 1]);
  });

  it("BAB 20 -> 4 attacks (capped): +20/+15/+10/+5", () => {
    expect(iterativeSequence(20, 20)).toEqual([20, 15, 10, 5]);
  });

  it("sequence values track a non-BAB attack total (e.g. ability/enh bonuses folded in)", () => {
    // BAB 6 but a +5 total attack bonus (e.g. from ability/enh) -> +11/+6, not +6/+1.
    expect(iterativeSequence(6, 11)).toEqual([11, 6]);
  });
});

/** Minimal CharacterDoc factory; single full-BAB class at a configurable level. */
function makeDoc(level: number, weapons: WeaponInstance[] = []): CharacterDoc {
  const humanEntry = Object.entries(ref.races).find(([, r]) => r.name === "Human");
  if (!humanEntry) throw new Error("Human race not found in ref data");
  const [humanId] = humanEntry;

  return {
    schemaVersion: 1,
    id: "iterative-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: humanId,
      // Barbarian is full ("high") BAB progression: BAB = level.
      classes: [{ tag: "barbarian", level }],
    },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute(): iteratives on a weapon line at BAB 6", () => {
  const sword: WeaponInstance = {
    name: "Longsword +1",
    attackAbility: "str",
    enhancement: 1,
    damageDice: "1d8",
  };
  const doc = makeDoc(6, [sword]);
  const sheet = compute(doc, ref);

  it("attack total = BAB(6) + STR(3) + enh(1) = 10", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(10);
  });

  it("iteratives = [10, 5] (BAB 6 grants one extra attack at -5)", () => {
    expect(sheet.attacks[0]!.attack.iteratives).toEqual([10, 5]);
  });
});

describe("compute(): no iteratives below BAB 6", () => {
  const sword: WeaponInstance = { name: "Longsword", attackAbility: "str", damageDice: "1d8" };
  const doc = makeDoc(5, [sword]);
  const sheet = compute(doc, ref);

  it("attack total = BAB(5) + STR(3) = 8", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(8);
  });

  it("iteratives field is omitted for a single attack", () => {
    expect(sheet.attacks[0]!.attack.iteratives).toBeUndefined();
  });
});

describe("compute(): generic melee/ranged attack lines also carry iteratives", () => {
  const doc = makeDoc(11);
  const sheet = compute(doc, ref);

  it("melee: BAB(11) + STR(3) = 14 -> iteratives [14, 9, 4]", () => {
    expect(sheet.attack.melee.total).toBe(14);
    expect(sheet.attack.melee.iteratives).toEqual([14, 9, 4]);
  });

  it("ranged: BAB(11) + DEX(2) = 13 -> iteratives [13, 8, 3]", () => {
    expect(sheet.attack.ranged.total).toBe(13);
    expect(sheet.attack.ranged.iteratives).toEqual([13, 8, 3]);
  });
});
