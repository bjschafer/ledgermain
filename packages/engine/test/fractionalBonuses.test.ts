/**
 * Fixture tests for the Pathfinder Unchained "Fractional Base Bonuses"
 * optional rule (`build.settings.fractionalBonuses`, default off): the
 * `fractionalBab`/`fractionalSave` tables and their integration through
 * `compute()`.
 *
 * Expected values are hand-computed from the published rule: BAB accrues at
 * 1 / (3/4) / (1/2) per class level, base saves at 1/2 (good) and 1/3 (poor),
 * summed across every class and rounded down once at the end, with a good
 * save's +2 granted only by the class taken at 1st level.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  babForLevels,
  compute,
  fractionalBab,
  fractionalSave,
  saveForLevels,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(classes: { tag: string; level: number }[], fractional: boolean): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    // All 10s: every ability modifier is 0, so a save's total equals its base
    // and BAB equals the melee attack bonus.
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(fractional ? { settings: { fractionalBonuses: true } } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** The synthetic "Base" component of a save, i.e. the class-table term alone. */
function saveBase(sheet: ReturnType<typeof compute>, which: "fort" | "ref" | "will"): number {
  const base = sheet.saves[which].components.find((c) => c.source === "Base");
  if (!base) throw new Error(`no Base component on ${which}`);
  return base.value;
}

describe("fractionalBab", () => {
  it("sums quarters and rounds down once: Cleric 1 / Wizard 1 is +1, not +0", () => {
    // 3/4 + 1/2 = 1.25 -> 1. RAW floors each class first: 0 + 0 = 0.
    expect(
      fractionalBab([
        { tier: "med", level: 1 },
        { tier: "low", level: 1 },
      ]),
    ).toBe(1);
    expect(babForLevels("med", 1) + babForLevels("low", 1)).toBe(0);
  });

  it("Rogue 3 / Wizard 3 is +3 (2.25 + 1.5 = 3.75), RAW gives +3 as well", () => {
    expect(
      fractionalBab([
        { tier: "med", level: 3 },
        { tier: "low", level: 3 },
      ]),
    ).toBe(3);
  });

  it("Fighter 1 / Cleric 1 / Wizard 1 is +2 (1 + 3/4 + 1/2 = 2.25), RAW gives +1", () => {
    const entries = [
      { tier: "high", level: 1 },
      { tier: "med", level: 1 },
      { tier: "low", level: 1 },
    ] as const;
    expect(fractionalBab(entries)).toBe(2);
    expect(entries.reduce((s, e) => s + babForLevels(e.tier, e.level), 0)).toBe(1);
  });

  it("ignores level-0 entries (builder scratch rows) and empty input", () => {
    expect(fractionalBab([])).toBe(0);
    expect(
      fractionalBab([
        { tier: "high", level: 0 },
        { tier: "high", level: 5 },
      ]),
    ).toBe(5);
  });

  it("matches RAW exactly for a single class at every level 1-20, all three tiers", () => {
    for (const tier of ["high", "med", "low"] as const) {
      for (let level = 1; level <= 20; level++) {
        expect(fractionalBab([{ tier, level }])).toBe(babForLevels(tier, level));
      }
    }
  });
});

describe("fractionalSave", () => {
  it("grants the good save's +2 once, not once per good-save class", () => {
    // Fighter 10 / Barbarian 10, both Fort-good: 5 + 5 = 10, +2 = 12.
    // RAW: (2 + 5) + (2 + 5) = 14.
    const entries = [
      { tier: "high", level: 10 },
      { tier: "high", level: 10 },
    ] as const;
    expect(fractionalSave(entries)).toBe(12);
    expect(entries.reduce((s, e) => s + saveForLevels(e.tier, e.level), 0)).toBe(14);
  });

  it("grants no +2 when the class taken at 1st level has a poor save there", () => {
    // Wizard 1 (poor Fort) / Cleric 1 (good Fort): 1/3 + 1/2 = 0.833 -> 0.
    expect(
      fractionalSave([
        { tier: "low", level: 1 },
        { tier: "high", level: 1 },
      ]),
    ).toBe(0);
    // Order matters: the same two classes taken the other way round earn it.
    expect(
      fractionalSave([
        { tier: "high", level: 1 },
        { tier: "low", level: 1 },
      ]),
    ).toBe(2);
  });

  it("sums poor saves before rounding: Fighter 2 / Rogue 2 Will is +1, RAW is +0", () => {
    const entries = [
      { tier: "low", level: 2 },
      { tier: "low", level: 2 },
    ] as const;
    expect(fractionalSave(entries)).toBe(1); // 2/3 + 2/3 = 1.33 -> 1
    expect(entries.reduce((s, e) => s + saveForLevels(e.tier, e.level), 0)).toBe(0);
  });

  it("treats a prestige good save as a plain 1/2 per level and never grants the +2 from it", () => {
    // A prestige class can't legally be a character's 1st level; even listed
    // first it contributes only its fraction.
    expect(fractionalSave([{ tier: "highPrestige", level: 10 }])).toBe(5);
    expect(fractionalSave([{ tier: "lowPrestige", level: 10 }])).toBe(3);
  });

  it("skips level-0 entries when deciding which class granted the +2", () => {
    expect(
      fractionalSave([
        { tier: "low", level: 0 },
        { tier: "high", level: 4 },
      ]),
    ).toBe(4);
  });

  it("matches RAW exactly for a single base class at every level 1-20, both tiers", () => {
    // Only the base tiers: the prestige tiers deliberately differ, since their
    // RAW formulas exist to work around the per-class +2 that this rule
    // removes outright.
    for (const tier of ["high", "low"] as const) {
      for (let level = 1; level <= 20; level++) {
        expect(fractionalSave([{ tier, level }])).toBe(saveForLevels(tier, level));
      }
    }
  });
});

describe("compute: fractionalBonuses disabled (default)", () => {
  it("absent settings and explicit false produce byte-identical sheets", () => {
    const classes = [
      { tag: "cleric", level: 1 },
      { tag: "wizard", level: 1 },
    ];
    const absent = compute(makeDoc(classes, false), ref);
    const explicitFalse = compute(
      {
        ...makeDoc(classes, false),
        build: { ...makeDoc(classes, false).build, settings: { fractionalBonuses: false } },
      },
      ref,
    );
    expect(explicitFalse).toEqual(absent);
  });

  it("Cleric 1 / Wizard 1 keeps RAW's +0 BAB and +4 Will", () => {
    const sheet = compute(
      makeDoc(
        [
          { tag: "cleric", level: 1 },
          { tag: "wizard", level: 1 },
        ],
        false,
      ),
      ref,
    );
    expect(sheet.bab).toBe(0);
    expect(saveBase(sheet, "will")).toBe(4); // 2 (cleric) + 2 (wizard)
    expect(saveBase(sheet, "fort")).toBe(2);
    expect(saveBase(sheet, "ref")).toBe(0);
  });
});

describe("compute: fractionalBonuses enabled", () => {
  it("Cleric 1 / Wizard 1 gains +1 BAB and drops the doubled Will +2", () => {
    const sheet = compute(
      makeDoc(
        [
          { tag: "cleric", level: 1 },
          { tag: "wizard", level: 1 },
        ],
        true,
      ),
      ref,
    );
    expect(sheet.bab).toBe(1); // 3/4 + 1/2 = 1.25
    expect(saveBase(sheet, "will")).toBe(3); // 1/2 + 1/2 = 1, +2 once
    expect(saveBase(sheet, "fort")).toBe(2); // 1/2 + 1/3 = 0.83 -> 0, +2 once
    expect(saveBase(sheet, "ref")).toBe(0); // 1/3 + 1/3 = 0.67 -> 0
  });

  it("BAB flows into the melee attack bonus, not just the headline number", () => {
    const classes = [
      { tag: "cleric", level: 1 },
      { tag: "wizard", level: 1 },
    ];
    const raw = compute(makeDoc(classes, false), ref);
    const fractional = compute(makeDoc(classes, true), ref);
    expect(fractional.attack.melee.total).toBe(raw.attack.melee.total + 1);
    expect(fractional.cmd).toBe(raw.cmd + 1);
  });

  it("Fighter 10 / Barbarian 10 loses the second Fortitude +2 (14 -> 12)", () => {
    const classes = [
      { tag: "fighter", level: 10 },
      { tag: "barbarian", level: 10 },
    ];
    expect(saveBase(compute(makeDoc(classes, false), ref), "fort")).toBe(14);
    expect(saveBase(compute(makeDoc(classes, true), ref), "fort")).toBe(12);
    // Both classes are full BAB, so the attack bonus is unchanged at +20.
    expect(compute(makeDoc(classes, true), ref).bab).toBe(20);
  });

  it("changes nothing for a single-class character at any level", () => {
    for (const tag of ["fighter", "cleric", "wizard", "rogue"]) {
      for (const level of [1, 4, 7, 11, 20]) {
        const raw = compute(makeDoc([{ tag, level }], false), ref);
        const fractional = compute(makeDoc([{ tag, level }], true), ref);
        expect(fractional.bab).toBe(raw.bab);
        expect(fractional.saves).toEqual(raw.saves);
      }
    }
  });
});
