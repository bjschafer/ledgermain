import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_FEATURE_CLASSIFICATION,
  SORCERER_ARCHETYPE_EFFECTS_EXTRACTED,
  compute,
  resolveArchetypeFeatureEffect,
} from "../src/index.js";

/**
 * Issue #45 sorcerer wave: fixture tests for `archetype-extracted/sorcerer.ts`.
 * Unlike the bard/fighter waves, this class's extracted-effects table is
 * EMPTY (see that file's doc comment) — every sorcerer archetype feature
 * that clears the `numeric` bar is already covered by the pre-existing
 * hand-verified table. These tests instead verify (a) the classification
 * table's shape/coverage, (b) the two `blocked` bloodline-suppression-gap
 * entries the task specifically called out, and (c) that the pre-existing
 * hand-verified Sorcerer of Sleep / Seeker entries still resolve correctly
 * through the shared precedence module unaffected by this file existing.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const ABILITIES = { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 18 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: over.classes,
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
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

describe("Sorcerer archetype-extraction wave (issue #45): no new numeric entries", () => {
  it("SORCERER_ARCHETYPE_EFFECTS_EXTRACTED is empty — every numeric case is already hand-verified", () => {
    expect(Object.keys(SORCERER_ARCHETYPE_EFFECTS_EXTRACTED)).toEqual([]);
  });

  it("classification table covers all 36 vendored sorcerer archetype features", () => {
    const sorcererEntries = Object.entries(ARCHETYPE_FEATURE_CLASSIFICATION).filter(([id]) =>
      id.startsWith("sorcerer:"),
    );
    expect(sorcererEntries.length).toBe(36);
  });

  it("Sorcerer of Sleep's Pesh Expert and Seeker's Tinkering are the only sorcerer entries bucketed numeric", () => {
    const numericIds = Object.entries(ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([id, entry]) => id.startsWith("sorcerer:") && entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.sort()).toEqual([
      "sorcerer:seeker:tinkering:1",
      "sorcerer:sorcerer-of-sleep:pesh-expert:1",
    ]);
  });
});

describe("Sorcerer of Sleep / Seeker (sorcerer): pre-existing hand-verified entries still resolve correctly", () => {
  it("Pesh Expert still resolves through the hand-verified table (source: 'verified')", () => {
    const resolved = resolveArchetypeFeatureEffect("sorcerer:sorcerer-of-sleep:pesh-expert:1");
    expect(resolved?.source).toBe("verified");
  });

  it("Tinkering still resolves through the hand-verified table (source: 'verified')", () => {
    const resolved = resolveArchetypeFeatureEffect("sorcerer:seeker:tinkering:1");
    expect(resolved?.source).toBe("verified");
  });
});

describe("Mongrel Mage (sorcerer): Mongrel Reservoir is blocked — bloodline-suppression composition gap", () => {
  const mongrelMage = archetypeId("Mongrel Mage", "sorcerer");

  it("classified blocked, not subsystem", () => {
    const entry = ARCHETYPE_FEATURE_CLASSIFICATION["sorcerer:mongrel-mage:mongrel-reservoir:1"];
    expect(entry?.bucket).toBe("blocked");
  });

  it("has no entry in either effects table (nothing to accidentally double-apply)", () => {
    expect(
      resolveArchetypeFeatureEffect("sorcerer:mongrel-mage:mongrel-reservoir:1"),
    ).toBeUndefined();
  });

  it("compute() doesn't crash and applies no stray Change for this archetype", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "sorcerer", level: 5 }], archetypes: [mongrelMage] }),
      ref,
    );
    const archEntry = sheet.activeArchetypes.find((a) => a.id === mongrelMage);
    expect(archEntry?.features.find((f) => f.name === "Mongrel Reservoir")?.detail).toBeUndefined();
  });
});

describe("Nine-Tailed Heir (sorcerer): Magical Tail is blocked — suspected vendored-data bug + bloodline gap", () => {
  it("classified blocked", () => {
    const entry = ARCHETYPE_FEATURE_CLASSIFICATION["sorcerer:nine-tailed-heir:magical-tail:3"];
    expect(entry?.bucket).toBe("blocked");
  });

  it("has no entry in either effects table", () => {
    expect(
      resolveArchetypeFeatureEffect("sorcerer:nine-tailed-heir:magical-tail:3"),
    ).toBeUndefined();
  });
});

describe("Seeker (sorcerer): Tinkering (hand-verified) composes correctly alongside sorcerer.ts's empty extracted table", () => {
  const seeker = archetypeId("Seeker", "sorcerer");

  it("+3 Disable Device at L6 (unaffected by this file's empty extracted table)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "sorcerer", level: 6 }], archetypes: [seeker] }),
      ref,
    );
    const comp = sheet.skills["dev"]?.components.find((c) => c.source === "Tinkering");
    expect(comp?.value).toBe(3);
  });
});
