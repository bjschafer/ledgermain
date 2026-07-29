import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, ROGUE_TALENT_IDS, ROGUE_TALENTS } from "../src/index.js";

/**
 * Fixture coverage for Rogue Talents (issue #65) — the deferred choice-
 * bearing subsystem, SHARED between the chained rogue and Rogue (Unchained).
 * Clean-room, hand-authored at full vendored parity (234 entries — see
 * `rogue-talents.ts`), mostly `displayOnly`; the feat-bridging entries
 * (Combat Trick's slot, the dozen `grantsFeat` grants) are covered by
 * `apps/web/test/feats.test.ts` since the bridge lives in
 * `apps/web/src/model/feats.ts`, not the engine. Stony Skin is the one
 * entry with real `changes[]` (always-on DR — fixture below).
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
  it("covers the full 234-entry vendored catalog; Stony Skin is the only entry with changes", () => {
    expect(ROGUE_TALENT_IDS.length).toBe(234);
    const withChanges: string[] = [];
    for (const id of ROGUE_TALENT_IDS) {
      const talent = ROGUE_TALENTS[id]!;
      expect(talent.displayOnly).toBe(talent.changes.length === 0);
      if (talent.changes.length > 0) withChanges.push(id);
    }
    expect(withChanges).toEqual(["stonySkin"]);
  });

  it("Combat Trick contributes a bonus-feat slot, Finesse Rogue grants Weapon Finesse outright", () => {
    expect(ROGUE_TALENTS.combatTrick!.bonusFeatSlot).toBe(true);
    expect(ROGUE_TALENTS.finesseRogue!.grantsFeat).toBe("weapon finesse");
  });

  it("the Phase 5 grantsFeat promotions carry vendored-verified feat names", () => {
    // Strong Impression (APG p.131), Unbalancing Trick (Elemental Master's
    // Handbook p.9), Thrill of the Chase (Inner Sea Intrigue p.32) — each
    // grant is unconditional, no player choice.
    expect(ROGUE_TALENTS.strongImpression!.grantsFeat).toBe("intimidating prowess");
    expect(ROGUE_TALENTS.unbalancingTrick!.grantsFeat).toBe("improved trip");
    expect(ROGUE_TALENTS.thrillOfTheChase!.grantsFeat).toBe("run");
    expect(ROGUE_TALENTS.combatSwipe!.grantsFeat).toBe("improved steal");
    // Superior Sniper's grant forks if Expert Sniper is already known —
    // deliberately note-tier, never auto-applied.
    expect(ROGUE_TALENTS.superiorSniper!.grantsFeat).toBeUndefined();
  });

  it("Double Debilitation is flagged unchainedOnly (references Debilitating Injury)", () => {
    expect(ROGUE_TALENTS.doubleDebilitation!.unchainedOnly).toBe(true);
    expect(ROGUE_TALENTS.combatTrick!.unchainedOnly).toBeUndefined();
  });

  it("minLevel soft gates: 2 for regular talents, 10 for advanced, prose overrides win", () => {
    expect(ROGUE_TALENTS.bleedingAttack!.minLevel).toBe(2);
    // Against the Wall — "Advanced Combat Talents" (Elemental Master's Handbook p.9).
    expect(ROGUE_TALENTS.againstTheWall!.minLevel).toBe(10);
    expect(ROGUE_TALENTS.doubleDebilitation!.minLevel).toBe(10);
    // Blinding Strike states a 15th-level requirement outright (Blood of Shadows p.9).
    expect(ROGUE_TALENTS.blindingStrike!.minLevel).toBe(15);
    // Chained-only vs Unchained-only list flags ride the vendored prefixes.
    expect(ROGUE_TALENTS.finesseRogue!.chainedOnly).toBe(true);
    expect(ROGUE_TALENTS.certainty!.unchainedOnly).toBe(true);
  });
});

describe("Stony Skin (Elemental Master's Handbook p.9) — the one changes[] promotion", () => {
  it("rogue 10 with Stony Skin shows DR 2/adamantine on the sheet", () => {
    const doc = makeDoc("rogue", 10, ["stonySkin"]);
    const sheet = compute(doc, ref);
    const dr = sheet.defenses?.dr.find((d) => d.qualifier === "adamantine");
    expect(dr?.total).toBe(2);
  });

  it("a non-rogue character with the same stale pick gets no DR", () => {
    const doc = makeDoc("monkUnchained", 10, ["stonySkin"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "adamantine")).toBeUndefined();
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
