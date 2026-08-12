/**
 * Fixture tests for `INQUISITION_POWER_PATCHES` (`granted-power-effects/inquisitions.ts`)
 * — the five inquisitor inquisition granted powers patched with a numeric
 * `Change[]`, applied by the same `collect.ts` loop `grantedPowerEffects.test.ts`
 * proves for domain/school grants (`origin.kind: "inquisition"`).
 *
 * The inquisitor base class itself carries Stern Gaze (morale bonus on
 * Intimidate/Sense Motive, `max(1, floor(level/2))`) and Cunning Initiative
 * (Wisdom modifier, untyped, on initiative, from 2nd level) as its own
 * vendored `changes[]` — both co-appear with these patches whenever the
 * skill/stat overlaps, so totals below account for them explicitly.
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

interface AbilityScores {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
}

/** Human inquisitor with the given inquisition tag and level. */
function makeInquisitor(
  level: number,
  inquisition: string,
  abilities?: AbilityScores,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "granted-power-inquisitions-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "inquisitor", level }],
    },
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      ...abilities,
    },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      inquisition,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Self-Control (Possession inquisition, +2 competence vs. charm/compulsion on Will)", () => {
  it("a level-1 Possession inquisitor gets the merged charm/compulsion conditional", () => {
    // Inquisitor Will is a good save: 2 + floor(level/2). Level 1: 2 + 0 = 2.
    // Wis 16 -> +3 mod. Headline Will = 2 + 3 = 5. Self-Control's +2
    // competence (scoped to charm/compulsion) never joins the headline, only
    // the situational total: 5 + 2 = 7. Both named categories resolve to the
    // same total, so they merge into one ConditionalTotal (same mechanism
    // `SAVE_CATEGORY_ORDER` uses for Guarded Mind's single-category case).
    const sheet = compute(makeInquisitor(1, "possession", { wis: 16 }), ref);
    expect(sheet.saves.will.total).toBe(5);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 7, categories: ["charm", "compulsion"], labels: ["charm", "compulsion"] },
    ]);
  });

  it("a different inquisition gets no charm/compulsion conditional", () => {
    const sheet = compute(makeInquisitor(1, "redemption", { wis: 16 }), ref);
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });
});

describe("Patient Sensibility (Redemption inquisition, +2 Diplomacy/Perception/Sense Motive)", () => {
  it("all three skills carry the +2 untyped bonus at level 1", () => {
    // Abilities all 10 (mod 0). Diplomacy and Perception have no other
    // source in play, so their totals are the bare +2. Sense Motive also
    // picks up Stern Gaze's own morale bonus (max(1, floor(1/2)) = 1),
    // landing at 3.
    const sheet = compute(makeInquisitor(1, "redemption"), ref);
    expect(sheet.skills.dip!.total).toBe(2);
    expect(sheet.skills.per!.total).toBe(2);
    expect(sheet.skills.sen!.total).toBe(3);

    const dipComp = sheet.skills.dip!.components.find((c) => c.source === "Patient Sensibility");
    expect(dipComp).toMatchObject({ type: "untyped", value: 2, applied: true });
    const perComp = sheet.skills.per!.components.find((c) => c.source === "Patient Sensibility");
    expect(perComp).toMatchObject({ type: "untyped", value: 2, applied: true });
    const senComp = sheet.skills.sen!.components.find((c) => c.source === "Patient Sensibility");
    expect(senComp).toMatchObject({ type: "untyped", value: 2, applied: true });
    const sternGazeComp = sheet.skills.sen!.components.find((c) => c.source === "Stern Gaze");
    expect(sternGazeComp).toMatchObject({ type: "morale", value: 1, applied: true });
  });
});

describe("Torturer's Presence (Torture inquisition, +2 untyped Intimidate, stacks with Stern Gaze)", () => {
  it("Intimidate includes both Torturer's Presence and Stern Gaze at level 8", () => {
    // Abilities all 10 (mod 0). Stern Gaze morale = max(1, floor(8/2)) = 4.
    // Torturer's Presence untyped = 2. Different stacking types, so both
    // apply: total 6.
    const sheet = compute(makeInquisitor(8, "torture"), ref);
    expect(sheet.skills.int!.total).toBe(6);
    const torturerComp = sheet.skills.int!.components.find(
      (c) => c.source === "Torturer's Presence",
    );
    expect(torturerComp).toMatchObject({ type: "untyped", value: 2, applied: true });
    const sternGazeComp = sheet.skills.int!.components.find((c) => c.source === "Stern Gaze");
    expect(sternGazeComp).toMatchObject({ type: "morale", value: 4, applied: true });
  });
});

describe("Grant the Initiative (Tactics inquisition, 8th level, Wisdom bonus on initiative)", () => {
  it("no bonus below 8th level", () => {
    const sheet = compute(makeInquisitor(7, "tactics", { wis: 14 }), ref);
    expect(sheet.initiative.components.some((c) => c.source === "Grant the Initiative")).toBe(
      false,
    );
  });

  it("at 8th level, adds max(0, Wisdom modifier) untyped, alongside Cunning Initiative", () => {
    // Wis 14 -> +2 mod. Cunning Initiative (the inquisitor's own 2nd-level
    // feature) already adds the raw Wis mod to initiative; Grant the
    // Initiative is a second, distinct untyped source, so both stack.
    const sheet = compute(makeInquisitor(8, "tactics", { wis: 14 }), ref);
    const grantComp = sheet.initiative.components.find((c) => c.source === "Grant the Initiative");
    expect(grantComp).toMatchObject({ type: "untyped", value: 2, applied: true });
    const cunningComp = sheet.initiative.components.find((c) => c.source === "Cunning Initiative");
    expect(cunningComp).toMatchObject({ type: "untyped", value: 2, applied: true });
  });
});

describe("Labyrinthine Words (Politics inquisition, Wis mod added on top of Cha on Bluff/Diplomacy)", () => {
  it("Bluff and Diplomacy both include the Wisdom modifier", () => {
    // Wis 14 -> +2 mod, Cha 16 -> +3 mod. Neither skill has any other source
    // in play (Stern Gaze doesn't touch Bluff/Diplomacy), so totals are the
    // bare ability sum: 3 + 2 = 5.
    const sheet = compute(makeInquisitor(1, "politics", { wis: 14, cha: 16 }), ref);
    expect(sheet.skills.blf!.total).toBe(5);
    expect(sheet.skills.dip!.total).toBe(5);
    const blfComp = sheet.skills.blf!.components.find((c) => c.source === "Labyrinthine Words");
    expect(blfComp).toMatchObject({ type: "untyped", value: 2, applied: true });
    const dipComp = sheet.skills.dip!.components.find((c) => c.source === "Labyrinthine Words");
    expect(dipComp).toMatchObject({ type: "untyped", value: 2, applied: true });
  });
});

describe("origin scoping: an inquisitor with a different inquisition picks up none of these", () => {
  it("an Anger inquisitor at level 8 gets no Possession/Redemption/Torture/Tactics/Politics power", () => {
    const sheet = compute(makeInquisitor(8, "anger", { wis: 14, cha: 16 }), ref);
    expect(sheet.saves.will.conditionals).toBeUndefined();
    expect(sheet.skills.dip!.components.some((c) => c.source === "Patient Sensibility")).toBe(
      false,
    );
    expect(sheet.skills.int!.components.some((c) => c.source === "Torturer's Presence")).toBe(
      false,
    );
    expect(sheet.initiative.components.some((c) => c.source === "Grant the Initiative")).toBe(
      false,
    );
    expect(sheet.skills.blf!.components.some((c) => c.source === "Labyrinthine Words")).toBe(false);
  });
});
