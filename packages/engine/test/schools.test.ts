import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WizardSchoolTag } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { deriveResourcePools, resolveClassFeatures } from "../src/index.js";
import type { AbilityView } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeWizard(level: number, wizardSchool?: WizardSchoolTag): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 18, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(wizardSchool ? { wizardSchool } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function schoolFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures.filter((f) => f.origin?.kind === "school").map((f) => f.name).sort();
}

describe("wizard arcane school powers", () => {
  it("a level-1 Evocation wizard gets Force Missile + Intense Spells, not Elemental Wall (level 8)", () => {
    const doc = makeWizard(1, "evo");
    expect(schoolFeatureNames(doc)).toEqual(["Force Missile", "Intense Spells"]);
  });

  it("a level-8 Evocation wizard also gets Elemental Wall", () => {
    const doc = makeWizard(8, "evo");
    expect(schoolFeatureNames(doc)).toEqual(["Elemental Wall", "Force Missile", "Intense Spells"]);
  });

  it("a level-1 Universalist (implicit) gets Hand of the Apprentice, not Metamagic Mastery (level 8)", () => {
    const doc = makeWizard(1);
    expect(schoolFeatureNames(doc)).toEqual(["Hand of the Apprentice"]);
  });

  it("origin label reads the school's full name", () => {
    const { classFeatures } = resolveClassFeatures(makeWizard(1, "evo"), ref);
    const forceMissile = classFeatures.find((f) => f.name === "Force Missile")!;
    expect(forceMissile.origin).toEqual({ kind: "school", label: "Evocation School" });
    expect(forceMissile.classTag).toBe("wizard");
  });

  it("Hand of the Apprentice surfaces as a resource pool with max = 3 + Int mod", () => {
    const doc = makeWizard(1);
    const abilities: Record<string, AbilityView> = {
      int: { base: 18, total: 18, mod: 4 },
    };
    const pools = deriveResourcePools(doc, ref, abilities);
    const hota = pools.find((p) => p.name === "Hand of the Apprentice");
    expect(hota).toBeDefined();
    expect(hota!.max).toBe(7);
    expect(hota!.per).toBe("day");
    expect(hota!.classTag).toBe("wizard");
  });
});
