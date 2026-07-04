import { describe, expect, it } from "bun:test";

import type { CharacterDoc, RefData } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { setRace } from "../src/model/doc.js";
import { expectedFeatCount } from "../src/model/feats.js";
import { isMultitalented } from "../src/model/race.js";
import {
  availableRacialTraits,
  conflictingRacialTraitIds,
  hasRacialTrait,
  suppressedRaceTargets,
  toggleRacialTrait,
} from "../src/model/racialTraits.js";
import { skillBudget } from "../src/model/skills.js";

const ref: RefData = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(raceName: string, racialTraits?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId(raceName), classes: [{ tag: "fighter", level: 1 }] },
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

describe("toggle + availability", () => {
  it("toggleRacialTrait adds then removes an id", () => {
    let doc = makeDoc("Human");
    expect(hasRacialTrait(doc, "human-focused-study")).toBe(false);
    doc = toggleRacialTrait(doc, "human-focused-study");
    expect(hasRacialTrait(doc, "human-focused-study")).toBe(true);
    doc = toggleRacialTrait(doc, "human-focused-study");
    expect(hasRacialTrait(doc, "human-focused-study")).toBe(false);
  });

  it("availableRacialTraits is scoped to the current race", () => {
    const human = availableRacialTraits(makeDoc("Human"), ref).map((t) => t.id);
    expect(human).toContain("human-focused-study");
    expect(human).not.toContain("halfling-outrider");
  });

  it("setRace clears chosen alternate racial traits", () => {
    const doc = makeDoc("Human", ["human-focused-study"]);
    const switched = setRace(doc, raceId("Elf"));
    expect(switched.build.racialTraits).toBeUndefined();
  });
});

describe("conflict detection", () => {
  it("flags two alternates that replace the same standard trait", () => {
    // Outrider and Practicality both replace Sure-Footed.
    const doc = makeDoc("Halfling", ["halfling-outrider", "halfling-practicality"]);
    const conflicts = conflictingRacialTraitIds(doc, ref);
    expect(conflicts.has("halfling-outrider")).toBe(true);
    expect(conflicts.has("halfling-practicality")).toBe(true);
  });

  it("no conflict when alternates replace different standard traits", () => {
    // Sacred Tattoo (Orc Ferocity) + Shaman's Apprentice (Intimidating).
    const doc = makeDoc("Half-Orc", ["half-orc-sacred-tattoo", "half-orc-shamans-apprentice"]);
    expect(conflictingRacialTraitIds(doc, ref).size).toBe(0);
  });
});

describe("model-layer budgets respect swaps", () => {
  it("Focused Study drops the Human bonus feat from the feat budget", () => {
    const plain = expectedFeatCount(makeDoc("Human"), ref);
    const swapped = expectedFeatCount(makeDoc("Human", ["human-focused-study"]), ref);
    expect(swapped).toBe(plain - 1);
    expect(
      suppressedRaceTargets(makeDoc("Human", ["human-focused-study"]), ref).has("bonusFeats"),
    ).toBe(true);
  });

  it("Eye for Talent drops the Human bonus skill rank from the skill budget", () => {
    const plain = skillBudget(makeDoc("Human"), ref, 0).total;
    const swapped = skillBudget(makeDoc("Human", ["human-eye-for-talent"]), ref, 0).total;
    // Human Skilled grants +1 rank per Hit Die; a level-1 fighter loses exactly 1.
    expect(swapped).toBe(plain - 1);
  });
});

describe("Dual Minded disables Multitalented", () => {
  it("Half-Elf is multitalented until Dual Minded is taken", () => {
    expect(isMultitalented(makeDoc("Half-Elf"), ref)).toBe(true);
    expect(isMultitalented(makeDoc("Half-Elf", ["half-elf-dual-minded"]), ref)).toBe(false);
  });
});
