/**
 * Hand-computed fixture tests for `CLASS_FEATURE_CHOICES` (`class-feature-
 * effects.ts`) and the `collect.ts` granted-class-features loop that applies
 * it — the classFeature pick-choice namespace's base-loop pilot.
 *
 * Proctor's "Monitor Expression" (prestige class, level 2): "a proctor must
 * select a specific expression of her role for her monitor demigod." Four
 * options; only Executor carries an unconditional, non-activated number:
 * "gains a +4 bonus on saving throws against disease, paralysis, poison,
 * sleep, and stunning. At 5th level, this bonus also applies on saves
 * against mind-affecting effects." Foster/Harmonizer/Impulsive are all
 * swift-action/at-will abilities this engine doesn't track, so picking one
 * of them is a valid pick that still emits nothing (same posture as a rage
 * power with `changes: []`).
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

const HUMAN = raceId("Human");

/** Human proctor, all abilities 10 (every mod 0). */
function makeProctor(level: number, pickChoices?: Record<string, string>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "class-feature-choices-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "proctor", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      pickChoices,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const FEATURE_ID = "nAf2hU0pfOBrOSAr";
const PICK_KEY = `classFeature:${FEATURE_ID}`;

describe("Monitor Expression: below the choice threshold, only level 2 grant applies", () => {
  it("no stored pick: no save conditionals from this feature", () => {
    const sheet = compute(makeProctor(2), ref);
    expect(sheet.saves.fort.conditionals?.some((c) => c.categories.includes("poison"))).toBeFalsy();
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("sleep"))).toBeFalsy();
  });

  it("a stale option id grants nothing", () => {
    const sheet = compute(makeProctor(2, { [PICK_KEY]: "bogus" }), ref);
    expect(sheet.saves.fort.conditionals?.some((c) => c.categories.includes("poison"))).toBeFalsy();
  });

  it("foster/harmonizer/impulsive are valid picks that still emit nothing (activation-gated)", () => {
    for (const option of ["foster", "harmonizer", "impulsive"]) {
      const sheet = compute(makeProctor(2, { [PICK_KEY]: option }), ref);
      expect(
        sheet.saves.fort.conditionals?.some((c) => c.categories.includes("poison")),
        `${option} unexpectedly granted a save bonus`,
      ).toBeFalsy();
    }
  });

  it("executor at level 2: +4 vs. poison on Fortitude (base fort floor 1)", () => {
    const sheet = compute(makeProctor(2, { [PICK_KEY]: "executor" }), ref);
    expect(sheet.saves.fort.total).toBe(1);
    const poisonLine = sheet.saves.fort.conditionals?.find((c) => c.categories.includes("poison"));
    expect(poisonLine?.total).toBe(5); // floor 1 + 4
  });

  it("executor at level 2: +4 vs. sleep on Will (mind-affecting not yet included)", () => {
    // Will headline already carries Soultended's own unconditional +2 ("the
    // comforting inevitability of this fate grants the proctor a +2 bonus on
    // Will saves", a level-1 Proctor grant every bearer has, already wired
    // via CLASS_FEATURE_CHANGE_PATCHES) on top of the lowPrestige floor 1 —
    // that +2 folds into every Will conditional line too, alongside
    // Executor's own +4.
    const sheet = compute(makeProctor(2, { [PICK_KEY]: "executor" }), ref);
    expect(sheet.saves.will.total).toBe(3); // floor 1 + Soultended 2
    const sleepLine = sheet.saves.will.conditionals?.find((c) => c.categories.includes("sleep"));
    expect(sleepLine?.total).toBe(7); // floor 1 + Soultended 2 + Executor 4
    // Below 5th level, the broader mind-affecting clause hasn't kicked in —
    // only "sleep" itself is named, not the wider family.
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("mind"))).toBeFalsy();
  });
});

describe("Monitor Expression: at 5th level, the mind-affecting clause broadens Will coverage", () => {
  it("executor at level 5: +4 vs. poison on Fortitude (base fort floor 3, no Will-only Soultended bonus here)", () => {
    const sheet = compute(makeProctor(5, { [PICK_KEY]: "executor" }), ref);
    expect(sheet.saves.fort.total).toBe(3);
    const poisonLine = sheet.saves.fort.conditionals?.find((c) => c.categories.includes("poison"));
    expect(poisonLine?.total).toBe(7); // floor 3 + 4
  });

  it("executor at level 5: +4 vs. mind-affecting on Will; the now-redundant sleep-only branch drops out", () => {
    const sheet = compute(makeProctor(5, { [PICK_KEY]: "executor" }), ref);
    expect(sheet.saves.will.total).toBe(4); // floor 2 + Soultended 2
    const mindLine = sheet.saves.will.conditionals?.find((c) => c.categories.includes("mind"));
    expect(mindLine?.total).toBe(8); // floor 2 + Soultended 2 + Executor 4
    // Sleep is a mind-affecting effect: the broader "mind" grant already
    // covers it, so the "sleep"-only branch's formula evaluates to 0 at 5th
    // level and `collect.ts`'s `evalChange` drops a zero-value
    // category-scoped change outright, rather than printing a redundant
    // "sleep" line identical to "mind"'s.
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("sleep"))).toBe(false);
  });
});
