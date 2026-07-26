/**
 * Hand-computed fixture tests for `sheet.cmdFlatFooted` — CMD as it stands
 * while flat-footed. RAW (CRB p.199, "Flat-Footed" sidebar): "A character
 * who has not yet acted... loses her Dexterity bonus to AC, if any... The
 * same is true of a creature's CMD" — i.e. flat-footed CMD loses the
 * Dexterity bonus and any dodge bonus, but keeps every other bonus type and
 * any penalty (penalties always apply), mirroring `ac.flatFooted` exactly.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(activeBuffs: ActiveBuff[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "cmd-flatfooted-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Barbarian",
      race: raceId("Human"),
      classes: [{ tag: "barbarian", level: 1 }],
    },
    // STR 16 -> mod +3; DEX 14 -> mod +2.
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

function buff(id: string, target: string, type: string, formula: string): ActiveBuff {
  return { instanceId: id, name: `Test Buff (${id})`, changes: [{ target, type, formula }] };
}

describe("compute(): cmdFlatFooted, no buffs", () => {
  // BAB(1) + Str(3) + Dex(2) + size(0) + 10 = 16; flat-footed loses Dex(2) -> 14.
  const sheet = compute(makeDoc(), ref);

  it("cmd = 10 + BAB(1) + STR(3) + DEX(2) = 16", () => {
    expect(sheet.cmd).toBe(16);
  });

  it("cmdFlatFooted loses the Dex bonus: 10 + BAB(1) + STR(3) + 0 = 14", () => {
    expect(sheet.cmdFlatFooted).toBe(14);
  });
});

describe("compute(): cmdFlatFooted loses a dodge bonus too", () => {
  // A dodge bonus to "ac" auto-derives into CMD (CMD_AC_TYPES) same as any
  // other named AC bonus type — see the CMB/CMD block in compute.ts.
  const dodge = buff("dodge", "ac", "dodge", "2");
  const sheet = compute(makeDoc([dodge]), ref);

  it("cmd includes the dodge bonus: 16 + 2 = 18", () => {
    expect(sheet.cmd).toBe(18);
  });

  it("cmdFlatFooted excludes the dodge bonus too — stays at the Dex-less baseline (14)", () => {
    // The dodge bonus never enters flatFootedCmdStack at all, so it's not a
    // further subtraction from 14 — it's simply absent, same as it never
    // having applied in the first place.
    expect(sheet.cmdFlatFooted).toBe(14);
  });
});

describe("compute(): cmdFlatFooted keeps a non-dodge bonus type (morale)", () => {
  // A morale bonus to "ac" also auto-derives into CMD, but morale is not
  // Dex/dodge — flat-footed does not strip it (CRB p.199 only names Dex and
  // dodge as lost).
  const morale = buff("morale", "ac", "morale", "1");
  const sheet = compute(makeDoc([morale]), ref);

  it("cmd includes the morale bonus: 16 + 1 = 17", () => {
    expect(sheet.cmd).toBe(17);
  });

  it("cmdFlatFooted keeps the morale bonus: 14 + 1 = 15", () => {
    expect(sheet.cmdFlatFooted).toBe(15);
  });
});

describe("compute(): cmdFlatFooted keeps a penalty (penalties always apply)", () => {
  // Any "ac" PENALTY (negative value, any type) auto-applies to CMD
  // regardless of type (CRB p.199: "any penalties to a creature's AC also
  // apply to its CMD") and is never stripped by flat-footed.
  const penalty = buff("shaken-ish", "ac", "untyped", "-2");
  const sheet = compute(makeDoc([penalty]), ref);

  it("cmd includes the penalty: 16 - 2 = 14", () => {
    expect(sheet.cmd).toBe(14);
  });

  it("cmdFlatFooted still includes the penalty: 14 - 2 = 12", () => {
    expect(sheet.cmdFlatFooted).toBe(12);
  });
});

describe("compute(): cmdFlatFooted keeps a Dex PENALTY (flat-footed CMD never exceeds normal CMD)", () => {
  function makeDexPenaltyDoc(): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "cmd-flatfooted-dex-penalty",
      ownerId: "tester",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Clumsy Barbarian",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: 1 }],
      },
      // DEX 8 -> mod -1 (a penalty).
      abilities: { str: 16, dex: 8, con: 14, int: 10, wis: 12, cha: 8 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        weapons: [],
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }
  const sheet = compute(makeDexPenaltyDoc(), ref);

  it("cmd = 10 + BAB(1) + STR(3) + DEX(-1) = 13", () => {
    expect(sheet.cmd).toBe(13);
  });

  it("cmdFlatFooted keeps the Dex penalty (does not exceed normal cmd): 13", () => {
    expect(sheet.cmdFlatFooted).toBe(13);
  });
});
