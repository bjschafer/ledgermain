/**
 * Trap Sense fixtures — the reference content for BOTH new mechanisms at
 * once: `Change.acCategories` (the dodge-AC-vs-traps half) and per-class
 * `CLASS_FEATURE_CHANGE_PATCHES` keys (the three progressions sharing the
 * name).
 *
 * Expected values are hand-computed from the published progressions:
 *   - Rogue/Barbarian/Investigator (Core Rulebook / APG): +1 at 3rd, +1
 *     every 3 levels thereafter — floor(level / 3).
 *   - Aspis Agent (Pathfinder Society Field Guide, prestige): +1 at 4th, +1
 *     every 3 levels thereafter, "stacks with any trap sense bonuses gained
 *     from other classes".
 *   - Pathfinder Delver (Seekers of Secrets, prestige): +1 at 2nd, +1 every
 *     3 levels thereafter, stacks with the rogue's.
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

function makeDoc(classes: { tag: string; level: number }[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "trap-sense-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function trapsLine(conditionals: { total: number; categories: string[] }[] | undefined) {
  return conditionals?.find((c) => c.categories.includes("traps"));
}

describe("Trap Sense (rogue family, bare patch key)", () => {
  it("gives a rogue 3 +1 Reflex vs. traps and +1 dodge AC vs. traps", () => {
    const sheet = compute(makeDoc([{ tag: "rogue", level: 3 }]), ref);
    // Rogue 3: Ref base 3 + Dex 0 = +3 headline; traps line +1 higher.
    expect(sheet.saves.ref.total).toBe(3);
    expect(trapsLine(sheet.saves.ref.conditionals)?.total).toBe(4);
    // AC 10 headline; traps line 11.
    expect(sheet.ac.normal).toBe(10);
    expect(trapsLine(sheet.ac.conditionals)?.total).toBe(11);
  });

  it("scales to +2 at rogue 6 and grants nothing below 3rd", () => {
    const at6 = compute(makeDoc([{ tag: "rogue", level: 6 }]), ref);
    expect(trapsLine(at6.ac.conditionals)?.total).toBe(at6.ac.normal + 2);

    const at2 = compute(makeDoc([{ tag: "rogue", level: 2 }]), ref);
    expect(trapsLine(at2.ac.conditionals)).toBeUndefined();
    expect(trapsLine(at2.saves.ref.conditionals)).toBeUndefined();
  });
});

describe("Trap Sense (prestige copies, per-class patch keys)", () => {
  it("gives a Pathfinder Delver 2 +1 (the bare rogue formula would give 0)", () => {
    // floor(2 / 3) = 0, so a line appearing at all proves the per-class
    // "pathfinderDelver:Trap Sense" key won over the bare-name formula.
    const sheet = compute(makeDoc([{ tag: "pathfinderDelver", level: 2 }]), ref);
    expect(trapsLine(sheet.ac.conditionals)?.total).toBe(sheet.ac.normal + 1);
    expect(trapsLine(sheet.saves.ref.conditionals)?.total).toBe(sheet.saves.ref.total + 1);
  });

  it("gives an Aspis Agent 4 +1, starting from 4th not 3rd", () => {
    const at4 = compute(makeDoc([{ tag: "aspisAgent", level: 4 }]), ref);
    expect(trapsLine(at4.ac.conditionals)?.total).toBe(at4.ac.normal + 1);

    const at3 = compute(makeDoc([{ tag: "aspisAgent", level: 3 }]), ref);
    expect(trapsLine(at3.ac.conditionals)).toBeUndefined();
  });

  it("stacks a rogue 3 / Aspis Agent 4 multiclass to +2 (untyped and dodge both sum)", () => {
    const sheet = compute(
      makeDoc([
        { tag: "rogue", level: 3 },
        { tag: "aspisAgent", level: 4 },
      ]),
      ref,
    );
    expect(trapsLine(sheet.saves.ref.conditionals)?.total).toBe(sheet.saves.ref.total + 2);
    expect(trapsLine(sheet.ac.conditionals)?.total).toBe(sheet.ac.normal + 2);
  });
});
