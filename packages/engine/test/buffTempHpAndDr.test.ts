import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture coverage for the `SUPPLEMENTAL_BUFF_CHANGES` additions in
 * `packages/data-pipeline/src/supplements.ts`: Divine Power / Heroism,
 * Greater grant temp HP scaling with caster level (vendored `changes[]`
 * omitted it, even though each buff's own description already quotes the
 * number), and Stoneskin grants DR 10/adamantine (vendored `changes` was
 * empty).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffByName(name: string) {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return { id: entry[0], buff: entry[1] };
}

function makeDoc(activeBuffs: ActiveBuff[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 10 }] },
    abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

function activeAt(name: string, casterLevel: number): ActiveBuff {
  const { id, buff } = buffByName(name);
  return {
    instanceId: `inst-${id}`,
    buffId: id,
    name: buff.name,
    changes: buff.changes,
    casterLevel,
  };
}

describe("Divine Power grants +1 temp HP per caster level (was missing from changes[])", () => {
  it("CL 12 → 12 temp HP", () => {
    const sheet = compute(makeDoc([activeAt("Divine Power", 12)]), ref);
    expect(sheet.hp.grantedTemp.total).toBe(12);
  });
});

describe("Heroism, Greater grants temp HP = CL, capped at 20 (was missing from changes[])", () => {
  it("CL 15 → 15 temp HP", () => {
    const sheet = compute(makeDoc([activeAt("Heroism, Greater", 15)]), ref);
    expect(sheet.hp.grantedTemp.total).toBe(15);
  });

  it("CL 25 → capped at 20 temp HP", () => {
    const sheet = compute(makeDoc([activeAt("Heroism, Greater", 25)]), ref);
    expect(sheet.hp.grantedTemp.total).toBe(20);
  });
});

describe("Stoneskin grants DR 10/adamantine (vendored changes[] was empty)", () => {
  it("compute() reports DR 10/adamantine while active", () => {
    const sheet = compute(makeDoc([activeAt("Stoneskin", 12)]), ref);
    expect(sheet.defenses?.dr).toEqual([
      {
        total: 10,
        qualifier: "adamantine",
        components: [
          {
            source: "Stoneskin",
            sourceId: "inst-" + buffByName("Stoneskin").id,
            type: "untyped",
            value: 10,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("no Stoneskin active → no DR line at all", () => {
    const sheet = compute(makeDoc([]), ref);
    expect(sheet.defenses).toBeUndefined();
  });
});
