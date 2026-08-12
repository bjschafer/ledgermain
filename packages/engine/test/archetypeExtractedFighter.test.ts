import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/fighter.js";

/**
 * Fixture test for `archetype-extracted/fighter.ts`'s one maneuver-scoped
 * cmb/cmd promotion (`fighter:dirty-fighter:maneuver-training:5`), run
 * end-to-end through `compute()` — the aggregator (`archetype-extracted/
 * index.ts`) already merges every class's tables into the production
 * `ARCHETYPE_FEATURE_EFFECTS_EXTRACTED`, so a fighter with the Dirty Fighter
 * archetype picks this up the same way a hand-verified `archetype-effects.ts`
 * entry would.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === classTag,
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

function makeDoc(level: number, archetypes: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      archetypes,
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

describe("Maneuver Training (Dirty Fighter, dirty-trick-scoped cmb/cmd)", () => {
  it("classification is numeric, backed by an extracted-effects entry", () => {
    const entry =
      FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION["fighter:dirty-fighter:maneuver-training:5"];
    expect(entry?.bucket).toBe("numeric");
    expect(
      FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED["fighter:dirty-fighter:maneuver-training:5"],
    ).toBeDefined();
  });

  it("+2 cmb/cmd on dirty trick only, headline cmb/cmd untouched, at 5th level", () => {
    // "At 5th level, a dirty fighter becomes a master of dirty tricks. He
    // gains a +2 bonus on dirty trick combat maneuver checks and +2 to his
    // CMD when he is the target of a dirty trick combat maneuver." Fighter
    // has full BAB, so BAB 5 at level 5; Str 10 and Medium size contribute
    // nothing, so headline cmb/cmd read straight off BAB (cmd = 10 + BAB).
    const dirtyFighter = archetypeId("Dirty Fighter", "fighter");
    const sheet = compute(makeDoc(5, [dirtyFighter]), ref);
    expect(sheet.cmb).toBe(5);
    expect(sheet.cmd).toBe(15);
    expect(sheet.cmbConditionals).toEqual([
      { total: 7, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
    expect(sheet.cmdConditionals).toEqual([
      { total: 17, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });

  it("no conditional lines without the archetype", () => {
    const sheet = compute(makeDoc(5, []), ref);
    expect(sheet.cmbConditionals ?? []).toEqual([]);
    expect(sheet.cmdConditionals ?? []).toEqual([]);
  });
});
