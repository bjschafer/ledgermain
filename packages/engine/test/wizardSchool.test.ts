import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Stage 2 (wizard specialization schools) is a builder/tracker display and
 * slot-accounting concern — `compute()` never reads `build.wizardSchool` or
 * `build.wizardOppositionSchools`. This pins that: a doc with those fields
 * set produces byte-identical DerivedSheet output to the same doc without them.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(wizardSchool?: string, wizardOppositionSchools?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level: 5 }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 18, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(wizardSchool ? { wizardSchool } : {}),
      ...(wizardOppositionSchools ? { wizardOppositionSchools } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("compute() ignores build.wizardSchool / build.wizardOppositionSchools", () => {
  it("a wizard 5 specialist with opposition schools computes byte-identically to a Universalist doc", () => {
    const withSchool = compute(makeDoc("evo", ["enc", "nec"]), ref);
    const withoutSchool = compute(makeDoc(undefined), ref);
    expect(withSchool).toEqual(withoutSchool);
  });

  it("an unknown school tag also computes byte-identically (engine ignores the fields entirely)", () => {
    const withUnknown = compute(makeDoc("NotARealSchool", ["NotARealOpposition"]), ref);
    const withoutSchool = compute(makeDoc(undefined), ref);
    expect(withUnknown).toEqual(withoutSchool);
  });
});
