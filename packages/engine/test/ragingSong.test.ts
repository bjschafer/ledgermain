/**
 * Hand-computed fixture tests for the skald's Raging Song pool and its
 * five performance-type toggles. RAW numbers verified against aonprd.com's
 * live Skald class page (Inspired Rage 2026-07-08; Song of Marching, Song of
 * Strength, Dirge of Doom, Song of the Fallen 2026-08-15): Raging Song
 * rounds/day = 3 + Cha mod at 1st, +2/level thereafter (matches the vendored
 * `uses.maxFormula` exactly, no hand-authoring needed for the pool itself).
 * Inspired Rage: +2 morale Str/Con, +1 morale Will, -1 AC at 1st; Will
 * increases by 1 every 4 levels; Str/Con increases by 2 at 8th and 16th.
 * Song of Strength (6th): allies add max(1, floor(skald level / 2)) on
 * Climb/Swim (`skill.clm`/`skill.swm`, confirmed against other engine
 * modules' use of the same ids, e.g. familiars.ts, rage-powers.ts).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";
// Imported directly from the module rather than `../src/index.js`: the new
// performance-type exports (everything but `SKALD_INSPIRED_RAGE` and
// `RAGING_SONG_DETAIL`) aren't wired into the barrel file yet.
import {
  RAGING_SONG_DETAIL,
  ragingSongToggleOptions,
  SKALD_DIRGE_OF_DOOM,
  SKALD_INSPIRED_RAGE,
  SKALD_SONG_OF_MARCHING,
  SKALD_SONG_OF_STRENGTH,
  SKALD_SONG_OF_THE_FALLEN,
} from "../src/raging-song.js";

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

describe("ragingSongToggleOptions: level-gated performance types", () => {
  it("skald L1 sees only Inspired Rage", () => {
    const options = ragingSongToggleOptions(1);
    expect(options.map((o) => o.id)).toEqual(["ragingSong:inspiredRage"]);
  });

  it("skald L5 sees Inspired Rage and Song of Marching only (Song of Strength unlocks at 6th)", () => {
    const options = ragingSongToggleOptions(5);
    expect(options.map((o) => o.id)).toEqual([
      "ragingSong:inspiredRage",
      "ragingSong:songOfMarching",
    ]);
  });

  it("skald L14 sees all five performance types", () => {
    const options = ragingSongToggleOptions(14);
    expect(options.map((o) => o.id)).toEqual([
      "ragingSong:inspiredRage",
      "ragingSong:songOfMarching",
      "ragingSong:songOfStrength",
      "ragingSong:dirgeOfDoom",
      "ragingSong:songOfTheFallen",
    ]);
  });

  it("every option id is unique and prefixed with ragingSong:", () => {
    const options = ragingSongToggleOptions(20);
    const ids = options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith("ragingSong:")).toBe(true);
  });
});

function activeBuffFor(option: typeof SKALD_SONG_OF_STRENGTH): ActiveBuff {
  return {
    instanceId: `buff-${option.id}`,
    effectTag: option.id,
    name: option.name,
    changes: option.changes,
    contextNotes: option.contextNotes,
  };
}

describe("Song of Strength changes through compute()", () => {
  it("L7: max(1, floor(7/2)) = 3 on Climb and Swim", () => {
    const noBuff = compute(makeDoc({ level: 7 }), ref);
    const withBuff = compute(
      makeDoc({ level: 7, activeBuffs: [activeBuffFor(SKALD_SONG_OF_STRENGTH)] }),
      ref,
    );
    expect(withBuff.skills["clm"]!.total - noBuff.skills["clm"]!.total).toBe(3);
    expect(withBuff.skills["swm"]!.total - noBuff.skills["swm"]!.total).toBe(3);
  });

  it("L6 (unlock level): max(1, floor(6/2)) = 3 on Climb and Swim, the max(1, ...) floor never actually binds since the ability doesn't unlock before 6th", () => {
    const noBuff = compute(makeDoc({ level: 6 }), ref);
    const withBuff = compute(
      makeDoc({ level: 6, activeBuffs: [activeBuffFor(SKALD_SONG_OF_STRENGTH)] }),
      ref,
    );
    expect(withBuff.skills["clm"]!.total - noBuff.skills["clm"]!.total).toBe(3);
    expect(withBuff.skills["swm"]!.total - noBuff.skills["swm"]!.total).toBe(3);
  });
});

describe("Note-tier performance types: empty changes, non-empty notes", () => {
  it("Song of Marching has no Change entries and at least one context note", () => {
    expect(SKALD_SONG_OF_MARCHING.changes).toEqual([]);
    expect(SKALD_SONG_OF_MARCHING.contextNotes?.length).toBeGreaterThan(0);
  });

  it("Dirge of Doom has no Change entries and at least one context note", () => {
    expect(SKALD_DIRGE_OF_DOOM.changes).toEqual([]);
    expect(SKALD_DIRGE_OF_DOOM.contextNotes?.length).toBeGreaterThan(0);
  });

  it("Song of the Fallen has no Change entries and at least one context note", () => {
    expect(SKALD_SONG_OF_THE_FALLEN.changes).toEqual([]);
    expect(SKALD_SONG_OF_THE_FALLEN.contextNotes?.length).toBeGreaterThan(0);
  });
});

describe("RAGING_SONG_DETAIL reflects multiple toggle options", () => {
  it("no longer names Inspired Rage exclusively", () => {
    expect(RAGING_SONG_DETAIL).not.toContain("Inspired Rage");
  });
});
