import { describe, expect, it } from "bun:test";

import type { CharacterDoc, DerivedClassFeature } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * `build.wizardSchool` still has no bearing on bonus spell-slot accounting in
 * `compute()` (that's a builder/tracker display concern, handled in the web
 * app's model layer) — but it DOES now grant the school's powers (see
 * `collectGrantedFeatures` in `archetypes.ts`), surfaced as `classFeatures`
 * entries tagged `origin.kind === "school"`. `undefined` means Universalist
 * (back-compat, matches the `WizardSchoolTag` doc comment in @pf1/schema) —
 * a Universalist still gets Hand of the Apprentice / Metamagic Mastery.
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

function schoolFeatures(features: DerivedClassFeature[]): string[] {
  return features
    .filter((f) => f.origin?.kind === "school")
    .map((f) => f.name)
    .sort();
}

describe("build.wizardSchool grants school powers", () => {
  it("undefined (implicit Universalist) grants Hand of the Apprentice at level 5, not Metamagic Mastery (level 8)", () => {
    const sheet = compute(makeDoc(undefined), ref);
    expect(schoolFeatures(sheet.classFeatures)).toEqual(["Hand of the Apprentice"]);
  });

  it("explicit 'uni' tag computes byte-identically to undefined", () => {
    const withUni = compute(makeDoc("uni"), ref);
    const withUndefined = compute(makeDoc(undefined), ref);
    expect(withUni).toEqual(withUndefined);
  });

  it("an Evocation specialist at level 5 gets Force Missile + Intense Spells, not Elemental Wall (level 8)", () => {
    const sheet = compute(makeDoc("evo", ["enc", "nec"]), ref);
    expect(schoolFeatures(sheet.classFeatures)).toEqual(["Force Missile", "Intense Spells"]);
  });

  it("an unresolvable school tag grants no school powers (soft-fail, not an error)", () => {
    const sheet = compute(makeDoc("NotARealSchool", ["NotARealOpposition"]), ref);
    expect(schoolFeatures(sheet.classFeatures)).toEqual([]);
  });
});
