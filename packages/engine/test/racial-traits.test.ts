/**
 * Hand-computed fixture tests for alternate racial traits (issue #35). These
 * exercise the two operations `collect.ts` performs for an active trait: apply
 * the alternate's own `changes[]`, and suppress the replaced standard trait's
 * structured `Race.change` (`suppressTargets`). All assertions are made against
 * observable `DerivedSheet` numbers (skills, saves, initiative), and the
 * suppression is proven by comparing against the same race with no trait.
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

/** Fighter L1, all abilities 10 (mod 0) before racial changes, no gear. */
function makeDoc(raceName: string, racialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `art-test-${raceName}`,
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
      racialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Halfling Outrider (suppress + grant, both sheet-observable)", () => {
  const base = compute(makeDoc("Halfling"), ref);
  const withTrait = compute(makeDoc("Halfling", ["halfling-outrider"]), ref);

  it("standard Sure-Footed grants +2 Acrobatics / +2 Climb without the trait", () => {
    // Halfling Dex +2 (mod +1): Acrobatics (Dex) = 1 + racial 2 = 3.
    // Halfling Str -2 (mod -1): Climb (Str) = -1 + racial 2 = 1.
    expect(base.skills.acr!.total).toBe(3);
    expect(base.skills.clm!.total).toBe(1);
  });

  it("Outrider suppresses the Acrobatics/Climb racial bonus", () => {
    // racial +2 gone → only the ability mod remains (Dex +1 / Str -1).
    expect(withTrait.skills.acr!.total).toBe(1);
    expect(withTrait.skills.clm!.total).toBe(-1);
  });

  it("Outrider grants +2 racial to Ride and Handle Animal", () => {
    // Ride is Dex-based (+1 mod) → 1 + racial 2 = 3; Handle Animal is Cha-based
    // (Halfling Cha +2, mod +1) → 1 + racial 2 = 3.
    expect(withTrait.skills.rid!.total).toBe(base.skills.rid!.total + 2);
    expect(withTrait.skills.han!.total).toBe(base.skills.han!.total + 2);
  });
});

describe("Half-Orc Sacred Tattoo (grant only, no suppression)", () => {
  const base = compute(makeDoc("Half-Orc"), ref);
  const withTrait = compute(makeDoc("Half-Orc", ["half-orc-sacred-tattoo"]), ref);

  it("adds +1 luck to all saving throws", () => {
    expect(withTrait.saves.fort.total).toBe(base.saves.fort.total + 1);
    expect(withTrait.saves.ref.total).toBe(base.saves.ref.total + 1);
    expect(withTrait.saves.will.total).toBe(base.saves.will.total + 1);
  });
});

describe("Elf Fleet-Footed (suppress Keen Senses, grant initiative)", () => {
  const base = compute(makeDoc("Elf"), ref);
  const withTrait = compute(makeDoc("Elf", ["elf-fleet-footed"]), ref);

  it("suppresses the +2 Perception racial bonus", () => {
    expect(withTrait.skills.per!.total).toBe(base.skills.per!.total - 2);
  });

  it("grants +2 initiative", () => {
    expect(withTrait.initiative.total).toBe(base.initiative.total + 2);
  });
});

describe("guards", () => {
  it("ignores an alternate racial trait whose race doesn't match", () => {
    // A Halfling trait id on a Half-Orc must be inert.
    const doc = compute(makeDoc("Half-Orc", ["halfling-outrider"]), ref);
    const clean = compute(makeDoc("Half-Orc"), ref);
    expect(doc.saves.fort.total).toBe(clean.saves.fort.total);
    expect(doc.skills.rid?.total).toBe(clean.skills.rid?.total);
  });

  it("ignores an unknown trait id without throwing", () => {
    expect(() => compute(makeDoc("Elf", ["not-a-real-trait"]), ref)).not.toThrow();
  });
});
