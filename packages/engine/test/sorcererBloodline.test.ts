import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Stage 1 (sorcerer bloodline spells) is a builder/tracker display concern —
 * `compute()` never reads `build.sorcererBloodline`. This pins that: a doc
 * with the field set produces byte-identical DerivedSheet output to the same
 * doc without it.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(sorcererBloodline?: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "sorcerer", level: 7 }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(sorcererBloodline ? { sorcererBloodline } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute() ignores build.sorcererBloodline", () => {
  it("a sorcerer 7 with a bloodline chosen computes byte-identically to one without", () => {
    const withBloodline = compute(makeDoc("Draconic"), ref);
    const withoutBloodline = compute(makeDoc(undefined), ref);
    expect(withBloodline).toEqual(withoutBloodline);
  });

  it("an unknown bloodline tag also computes byte-identically (engine ignores the field entirely)", () => {
    const withUnknown = compute(makeDoc("NotARealBloodline"), ref);
    const withoutBloodline = compute(makeDoc(undefined), ref);
    expect(withUnknown).toEqual(withoutBloodline);
  });
});
