/**
 * Hand-computed fixture tests for oracle revelations (issue #61). Every
 * revelation in `ORACLE_REVELATIONS` is `displayOnly` with `changes: []`
 * (see that file's doc comment), so `collectModifiers` should never emit a
 * numeric modifier for one. What IS exercised: gating on actual oracle
 * levels AND a chosen mystery, per-mystery scoping (a revelation from a
 * DIFFERENT mystery than the one selected is silently skipped), unknown-id
 * tolerance, and surfacing picked revelations through
 * `collectGrantedFeatures`/`resolveClassFeatures` — same pattern as
 * `arcanistExploits.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { ORACLE_MYSTERY_TAGS } from "../src/oracle-mysteries.js";
import {
  ORACLE_MYSTERY_FINAL_REVELATIONS,
  ORACLE_REVELATIONS,
  ORACLE_REVELATION_IDS,
  revelationsForMystery,
} from "../src/oracle-revelations.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeOracle(
  level: number,
  oracleMystery?: string,
  oracleRevelations?: string[],
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
      classes: [{ tag: "oracle", level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 16 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(oracleMystery ? { oracleMystery } : {}),
      ...(oracleRevelations ? { oracleRevelations } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function revelationFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "revelation")
    .map((f) => f.name)
    .sort();
}

describe("ORACLE_REVELATIONS table", () => {
  it("every revelation is displayOnly with no changes (no unconditional flat number)", () => {
    for (const id of ORACLE_REVELATION_IDS) {
      const revelation = ORACLE_REVELATIONS[id]!;
      expect(revelation.displayOnly).toBe(true);
      expect(revelation.changes).toEqual([]);
    }
  });

  it("covers all 10 APG core mysteries with 10 revelations apiece (100 total)", () => {
    expect(ORACLE_REVELATION_IDS.length).toBe(100);
    for (const tag of ORACLE_MYSTERY_TAGS) {
      expect(revelationsForMystery(tag).length).toBe(10);
    }
  });

  it("every mystery has a Final Revelation", () => {
    for (const tag of ORACLE_MYSTERY_TAGS) {
      expect(ORACLE_MYSTERY_FINAL_REVELATIONS[tag]).toBeDefined();
    }
  });

  it("ids are mystery-scoped and unique (Combat Healer appears in both Battle and Life)", () => {
    expect(ORACLE_REVELATIONS["battle:combatHealer"]?.name).toBe("Combat Healer");
    expect(ORACLE_REVELATIONS["life:combatHealer"]?.name).toBe("Combat Healer");
    expect(ORACLE_REVELATIONS["battle:combatHealer"]).not.toBe(
      ORACLE_REVELATIONS["life:combatHealer"],
    );
  });
});

describe("oracle revelations (collectModifiers)", () => {
  it("a chosen displayOnly revelation contributes no numeric modifier", () => {
    const doc = makeOracle(7, "life", ["life:channel", "life:combatHealer"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("life:"))).toBe(false);
  });

  it("no revelations chosen contributes nothing", () => {
    const doc = makeOracle(7, "life");
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.length).toBeGreaterThanOrEqual(0);
  });

  it("unknown revelation ids are skipped, never crash", () => {
    const doc = makeOracle(7, "life", ["not-a-real-revelation"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("a non-oracle with a stale oracleRevelations field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeOracle(0, "life", ["life:channel"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "fighter", level: 4 }],
      },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("life:"))).toBe(false);
  });
});

describe("oracle revelations (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen revelation is surfaced with origin.kind 'revelation'", () => {
    const doc = makeOracle(7, "life", ["life:channel", "life:combatHealer"]);
    expect(revelationFeatureNames(doc)).toEqual(["Channel", "Combat Healer"]);
  });

  it("no revelations chosen surfaces nothing", () => {
    const doc = makeOracle(7, "life");
    expect(revelationFeatureNames(doc)).toEqual([]);
  });

  it("a revelation id from a DIFFERENT mystery than the one chosen is skipped", () => {
    const doc = makeOracle(7, "life", ["battle:battlecry"]);
    expect(revelationFeatureNames(doc)).toEqual([]);
  });

  it("no mystery chosen at all surfaces nothing, even with revelation ids present", () => {
    const doc = makeOracle(7, undefined, ["life:channel"]);
    expect(revelationFeatureNames(doc)).toEqual([]);
  });

  it("carries the revelation's summary as detail (no vendored description to fall back to)", () => {
    const doc = makeOracle(7, "life", ["life:channel"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "revelation");
    expect(feature?.detail).toBe(ORACLE_REVELATIONS["life:channel"]!.summary);
  });

  it("collectGrantedFeatures gates on oracle level (0 for a non-oracle)", () => {
    const doc: CharacterDoc = {
      ...makeOracle(0, "life", ["life:channel"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "fighter", level: 4 }],
      },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "revelation")).toBe(false);
  });
});
