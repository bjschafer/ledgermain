/**
 * Hand-computed fixture tests for the skald's Raging Song pool and its
 * flagship Inspired Rage toggle (issue #65). RAW numbers verified against
 * aonprd.com's live Skald class page (2026-07-08): Raging Song rounds/day =
 * 3 + Cha mod at 1st, +2/level thereafter (matches the vendored
 * `uses.maxFormula` exactly — no hand-authoring needed for the pool itself).
 * Inspired Rage: +2 morale Str/Con, +1 morale Will, -1 AC at 1st; Will
 * increases by 1 every 4 levels; Str/Con increases by 2 at 8th and 16th.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  RAGING_SONG_DETAIL,
  SKALD_INSPIRED_RAGE,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  level: number;
  abilities?: CharacterDoc["abilities"];
  activeBuffs?: ActiveBuff[];
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
      classes: [{ tag: "skald", level: opts.level }],
    },
    abilities: opts.abilities ?? { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 16 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function inspiredRageBuff(): ActiveBuff {
  return {
    instanceId: "buff-inspired-rage",
    effectTag: SKALD_INSPIRED_RAGE.id,
    name: SKALD_INSPIRED_RAGE.name,
    changes: SKALD_INSPIRED_RAGE.changes,
    contextNotes: SKALD_INSPIRED_RAGE.contextNotes,
  };
}

describe("deriveResourcePools: Raging Song pool (skald)", () => {
  it("skald L1, Cha 16 (+3): 3 + 3 = 6 rounds/day (matches vendored uses.maxFormula)", () => {
    const doc = makeDoc({ level: 1 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const song = pools.find((p) => p.name === "Raging Song");
    expect(song).toBeDefined();
    expect(song!.max).toBe(6);
    expect(song!.per).toBe("day");
    expect(song!.detail).toBe(RAGING_SONG_DETAIL);
    expect(song!.tableOptions).toHaveLength(1);
    expect(song!.tableOptions![0]!.id).toBe("ragingSong:inspiredRage");
  });

  it("skald L5, Cha 16 (+3): 3 + 3 + 2*4 = 14 rounds/day", () => {
    const doc = makeDoc({ level: 5 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const song = pools.find((p) => p.name === "Raging Song");
    expect(song!.max).toBe(14);
  });
});

describe("Inspired Rage changes through compute()", () => {
  it("L1: +2 morale Str/Con, +1 morale Will, -1 AC", () => {
    const noBuff = compute(makeDoc({ level: 1 }), ref);
    const withBuff = compute(makeDoc({ level: 1, activeBuffs: [inspiredRageBuff()] }), ref);
    expect(withBuff.abilities.str.total).toBe(noBuff.abilities.str.total + 2);
    expect(withBuff.abilities.con.total).toBe(noBuff.abilities.con.total + 2);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 1);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal - 1);
  });

  it("L8: Str/Con jump to +4, Will to +3 (1 + floor(8/4))", () => {
    const noBuff = compute(makeDoc({ level: 8 }), ref);
    const withBuff = compute(makeDoc({ level: 8, activeBuffs: [inspiredRageBuff()] }), ref);
    expect(withBuff.abilities.str.total).toBe(noBuff.abilities.str.total + 4);
    expect(withBuff.abilities.con.total).toBe(noBuff.abilities.con.total + 4);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 3);
  });

  it("L16: Str/Con reach +6, Will to +5 (1 + floor(16/4))", () => {
    const noBuff = compute(makeDoc({ level: 16 }), ref);
    const withBuff = compute(makeDoc({ level: 16, activeBuffs: [inspiredRageBuff()] }), ref);
    expect(withBuff.abilities.str.total).toBe(noBuff.abilities.str.total + 6);
    expect(withBuff.abilities.con.total).toBe(noBuff.abilities.con.total + 6);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 5);
  });

  it("L20: Str/Con stay +6 (max), Will reaches +6", () => {
    const noBuff = compute(makeDoc({ level: 20 }), ref);
    const withBuff = compute(makeDoc({ level: 20, activeBuffs: [inspiredRageBuff()] }), ref);
    expect(withBuff.abilities.str.total).toBe(noBuff.abilities.str.total + 6);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 6);
  });

  it("carries context notes about the single-character/ally-sharing simplification", () => {
    expect(SKALD_INSPIRED_RAGE.contextNotes?.length).toBeGreaterThan(0);
  });
});
