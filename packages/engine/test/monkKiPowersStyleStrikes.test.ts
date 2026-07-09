import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  MONK_KI_POWER_IDS,
  MONK_KI_POWERS,
  MONK_STYLE_STRIKE_IDS,
  MONK_STYLE_STRIKES,
} from "../src/index.js";

/**
 * Fixture coverage for Monk (Unchained) ki powers + style strikes (issue
 * #65) — the deferred choice-bearing subsystems noted in
 * IMPLEMENTATION_PLAN.md's Monk (Unchained) as-built section. Both tables
 * are clean-room, hand-authored (see `monk-ki-powers.ts`/`monk-style-strikes.ts`),
 * `displayOnly` in their entirety (no unconditional numeric effect cleared
 * the honesty bar), so this file proves: (1) the data tables are internally
 * consistent and reasonably scoped, and (2) chosen picks surface in the
 * sheet's classFeatures list via `archetypes.ts`'s new granted-feature
 * blocks, mirroring `HexPicker`'s "picked hexes show up in Class Features"
 * behavior.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  level: number,
  monkKiPowers: string[] = [],
  monkStyleStrikes: string[] = [],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "monkUnchained", level }],
    },
    abilities: { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      monkKiPowers,
      monkStyleStrikes,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("MONK_KI_POWERS table", () => {
  it("has 39 core Pathfinder Unchained ki powers, all displayOnly with no changes", () => {
    expect(MONK_KI_POWER_IDS.length).toBe(39);
    for (const id of MONK_KI_POWER_IDS) {
      const power = MONK_KI_POWERS[id]!;
      expect(power.displayOnly).toBe(true);
      expect(power.changes).toEqual([]);
      expect(power.minLevel).toBeGreaterThanOrEqual(4);
    }
  });

  it("Quivering Palm and Elemental Burst gate at the correct high levels", () => {
    expect(MONK_KI_POWERS.quiveringPalm!.minLevel).toBe(16);
    expect(MONK_KI_POWERS.elementalBurst!.minLevel).toBe(18);
  });
});

describe("MONK_STYLE_STRIKES table", () => {
  it("has 15 core style strikes, all displayOnly with no changes", () => {
    expect(MONK_STYLE_STRIKE_IDS.length).toBe(15);
    for (const id of MONK_STYLE_STRIKE_IDS) {
      const strike = MONK_STYLE_STRIKES[id]!;
      expect(strike.displayOnly).toBe(true);
      expect(strike.changes).toEqual([]);
    }
  });
});

describe("Monk (Unchained) L5 with chosen ki powers + style strikes", () => {
  it("chosen ki powers surface in the sheet's classFeatures list with their summary as detail", () => {
    const doc = makeDoc(5, ["wholenessOfBody", "suddenSpeed"]);
    const sheet = compute(doc, ref);
    const wholeness = sheet.classFeatures.find((f) => f.name === "Wholeness of Body");
    expect(wholeness).toBeDefined();
    expect(wholeness!.classTag).toBe("monkUnchained");
    expect(wholeness!.detail).toBe(MONK_KI_POWERS.wholenessOfBody!.summary);
    const speed = sheet.classFeatures.find((f) => f.name === "Sudden Speed");
    expect(speed).toBeDefined();
  });

  it("chosen style strikes surface in the sheet's classFeatures list", () => {
    const doc = makeDoc(5, [], ["hammerblow", "legSweep"]);
    const sheet = compute(doc, ref);
    const hammerblow = sheet.classFeatures.find((f) => f.name === "Hammerblow");
    expect(hammerblow).toBeDefined();
    expect(hammerblow!.classTag).toBe("monkUnchained");
    expect(hammerblow!.detail).toBe(MONK_STYLE_STRIKES.hammerblow!.summary);
    const legSweep = sheet.classFeatures.find((f) => f.name === "Leg Sweep");
    expect(legSweep).toBeDefined();
  });

  it("an unrecognized/stale power or strike id is silently skipped, not crashed on", () => {
    const doc = makeDoc(5, ["not-a-real-power"], ["not-a-real-strike"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.featureId === "kiPower:not-a-real-power")).toBe(false);
  });

  it("a non-monkUnchained character with a stale field gets nothing granted", () => {
    const doc = makeDoc(0, ["wholenessOfBody"]);
    doc.identity.classes = [{ tag: "rogueUnchained", level: 5 }];
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Wholeness of Body")).toBe(false);
  });
});
