/**
 * Hand-computed fixture tests for magus arcana (issue #61). Every base arcana
 * in `MAGUS_ARCANA` is `displayOnly` with `changes: []` (see that file's doc
 * comment — none of the base UM arcana grant an unconditional flat number),
 * so `collectModifiers` should never emit a numeric modifier for one. What IS
 * exercised: gating on actual magus levels, unknown-id tolerance, and
 * surfacing picked arcana through `collectGrantedFeatures`/
 * `resolveClassFeatures` — same pattern as `arcanistExploits.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { MAGUS_ARCANA, MAGUS_ARCANA_IDS } from "../src/magus-arcana.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeMagus(level: number, magusArcana?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "magus", level }],
    },
    abilities: { str: 14, dex: 12, con: 12, int: 16, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(magusArcana ? { magusArcana } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function arcanaFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "arcana")
    .map((f) => f.name)
    .sort();
}

describe("MAGUS_ARCANA table", () => {
  it("every base arcana is displayOnly with no changes (no unconditional flat number)", () => {
    for (const id of MAGUS_ARCANA_IDS) {
      const arcana = MAGUS_ARCANA[id]!;
      expect(arcana.displayOnly).toBe(true);
      expect(arcana.changes).toEqual([]);
    }
  });

  it("includes the base UM roster's well-known entries", () => {
    expect(MAGUS_ARCANA.familiar?.name).toBe("Familiar");
    expect(MAGUS_ARCANA.spellBlending?.name).toBe("Spell Blending");
    expect(MAGUS_ARCANA.poolStrike?.name).toBe("Pool Strike");
  });

  it("covers the 20 base Ultimate Magic arcana (later-book arcana out of scope)", () => {
    expect(MAGUS_ARCANA_IDS.length).toBe(20);
  });

  it("every entry has a minLevel of at least 3 (no arcana before 3rd level)", () => {
    for (const id of MAGUS_ARCANA_IDS) {
      expect(MAGUS_ARCANA[id]!.minLevel).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("magus arcana (collectModifiers)", () => {
  it("a chosen displayOnly arcana contributes no numeric modifier", () => {
    const doc = makeMagus(6, ["familiar", "spellShield", "poolStrike"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("arcana:"))).toBe(false);
  });

  it("no arcana chosen contributes nothing", () => {
    const doc = makeMagus(6);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("arcana:"))).toBe(false);
  });

  it("unknown arcana ids are skipped, never crash", () => {
    const doc = makeMagus(6, ["not-a-real-arcana"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("a non-magus with a stale magusArcana field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeMagus(0, ["familiar"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "fighter", level: 4 }],
      },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("arcana:"))).toBe(false);
  });
});

describe("magus arcana (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen arcana is surfaced with origin.kind 'arcana'", () => {
    const doc = makeMagus(6, ["familiar", "spellShield"]);
    expect(arcanaFeatureNames(doc)).toEqual(["Familiar", "Spell Shield"]);
  });

  it("no arcana chosen surfaces nothing", () => {
    const doc = makeMagus(6);
    expect(arcanaFeatureNames(doc)).toEqual([]);
  });

  it("carries the arcana's summary as detail (no vendored description to fall back to)", () => {
    const doc = makeMagus(6, ["familiar"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "arcana");
    expect(feature?.detail).toBe(MAGUS_ARCANA.familiar!.summary);
  });

  it("collectGrantedFeatures gates on magus level (0 for a non-magus)", () => {
    const doc: CharacterDoc = {
      ...makeMagus(0, ["familiar"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "fighter", level: 4 }],
      },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "arcana")).toBe(false);
  });
});
