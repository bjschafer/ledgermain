import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, ROGUE_TALENT_IDS, ROGUE_TALENTS } from "../src/index.js";

/**
 * Fixture coverage for Rogue Talents (issue #65) — the deferred choice-
 * bearing subsystem noted in IMPLEMENTATION_PLAN.md's Rogue (Unchained)
 * as-built section, SHARED between the chained rogue and Rogue (Unchained).
 * Clean-room, hand-authored curated ~28-entry menu (see `rogue-talents.ts`),
 * mostly `displayOnly` with two feat-bridging exceptions (Combat Trick,
 * Finesse Rogue — covered by `apps/web/test/feats.test.ts` since the bridge
 * lives in `apps/web/src/model/feats.ts`, not the engine).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(classTag: string, level: number, rogueTalents: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: classTag, level }] },
    abilities: { str: 12, dex: 18, con: 12, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      rogueTalents,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("ROGUE_TALENTS table", () => {
  it("has a curated core menu, all displayOnly with no changes", () => {
    expect(ROGUE_TALENT_IDS.length).toBeGreaterThanOrEqual(25);
    for (const id of ROGUE_TALENT_IDS) {
      const talent = ROGUE_TALENTS[id]!;
      expect(talent.displayOnly).toBe(true);
      expect(talent.changes).toEqual([]);
    }
  });

  it("Combat Trick contributes a bonus-feat slot, Finesse Rogue grants Weapon Finesse outright", () => {
    expect(ROGUE_TALENTS.combatTrick!.bonusFeatSlot).toBe(true);
    expect(ROGUE_TALENTS.finesseRogue!.grantsFeat).toBe("weapon finesse");
  });

  it("Double Debilitation is flagged unchainedOnly (references Debilitating Injury)", () => {
    expect(ROGUE_TALENTS.doubleDebilitation!.unchainedOnly).toBe(true);
    expect(ROGUE_TALENTS.combatTrick!.unchainedOnly).toBeUndefined();
  });
});

describe("chosen rogue talents surface in the sheet's classFeatures list", () => {
  it("chained rogue", () => {
    const doc = makeDoc("rogue", 5, ["trapSpotter", "fastStealth"]);
    const sheet = compute(doc, ref);
    const trapSpotter = sheet.classFeatures.find((f) => f.name === "Trap Spotter");
    expect(trapSpotter).toBeDefined();
    expect(trapSpotter!.classTag).toBe("rogue");
    expect(trapSpotter!.detail).toBe(ROGUE_TALENTS.trapSpotter!.summary);
  });

  it("Rogue (Unchained) — same field, classTag reflects the actual class", () => {
    const doc = makeDoc("rogueUnchained", 5, ["combatTrick"]);
    const sheet = compute(doc, ref);
    const combatTrick = sheet.classFeatures.find((f) => f.name === "Combat Trick");
    expect(combatTrick).toBeDefined();
    expect(combatTrick!.classTag).toBe("rogueUnchained");
  });

  it("a non-rogue character with a stale field gets nothing granted", () => {
    const doc = makeDoc("monkUnchained", 5, ["trapSpotter"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Trap Spotter")).toBe(false);
  });
});
