import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectGrantedFeatures, compute, RAGE_POWER_IDS, RAGE_POWERS } from "../src/index.js";

/**
 * Fixture coverage for the rage-power table + picker plumbing (issue #65/#67).
 * Every entry is `displayOnly` (see `rage-powers.ts`'s doc comment), so these
 * tests cover: table shape/count, shared-editions availability, gating on
 * barbarian levels (either edition) in `collectGrantedFeatures`, and that
 * picked powers surface on `DerivedSheet.classFeatures` with a "Rage Power"
 * origin label.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: { classTag: string; level: number; ragePowers?: string[] }): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: over.classTag, level: over.level }],
    },
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ragePowers: over.ragePowers,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("RAGE_POWERS table", () => {
  it("has 30 entries, every one available to both editions, every one displayOnly with no changes", () => {
    expect(RAGE_POWER_IDS).toHaveLength(30);
    for (const id of RAGE_POWER_IDS) {
      const power = RAGE_POWERS[id]!;
      expect(power.displayOnly).toBe(true);
      expect(power.changes).toEqual([]);
      expect(power.editions).toContain("barbarian");
      expect(power.editions).toContain("barbarianUnchained");
    }
  });

  it("has no duplicate ids or names", () => {
    const names = RAGE_POWER_IDS.map((id) => RAGE_POWERS[id]!.name);
    expect(new Set(RAGE_POWER_IDS).size).toBe(RAGE_POWER_IDS.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("Renewed Vigor gates at 4th level; Animal Fury has no level gate", () => {
    expect(RAGE_POWERS.renewedVigor!.minLevel).toBe(4);
    expect(RAGE_POWERS.animalFury!.minLevel).toBe(1);
  });
});

describe("Rage powers surface on the sheet for both chained and unchained barbarian", () => {
  it("chained barbarian: picked powers appear in classFeatures, tagged Rage Power", () => {
    const doc = makeDoc({
      classTag: "barbarian",
      level: 3,
      ragePowers: ["animalFury", "guardedStance"],
    });
    const sheet = compute(doc, ref);
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Animal Fury");
    expect(names).toContain("Guarded Stance");
  });

  it("unchained barbarian: same table, same wiring", () => {
    const doc = makeDoc({
      classTag: "barbarianUnchained",
      level: 3,
      ragePowers: ["strengthSurge"],
    });
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Strength Surge");
  });

  it("a non-barbarian's stale ragePowers field grants nothing", () => {
    const doc = makeDoc({ classTag: "fighter", level: 5, ragePowers: ["animalFury"] });
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).not.toContain("Animal Fury");
  });

  it("collectGrantedFeatures reports origin.kind 'ragePower' with a Rage Power label", () => {
    const doc = makeDoc({ classTag: "barbarian", level: 3, ragePowers: ["animalFury"] });
    const granted = collectGrantedFeatures(doc, ref);
    const entry = granted.find((g) => g.grant.name === "Animal Fury");
    expect(entry?.origin).toEqual({ kind: "ragePower", label: "Rage Power" });
  });

  it("an unrecognized rage power id is silently ignored (no crash)", () => {
    const doc = makeDoc({ classTag: "barbarian", level: 3, ragePowers: ["not-a-real-power"] });
    expect(() => compute(doc, ref)).not.toThrow();
  });
});
