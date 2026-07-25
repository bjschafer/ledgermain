import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveDamage } from "../src/index.js";

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

describe("Resist Energy's per-element variants grant eres.<energy> (vendored changes[] was empty)", () => {
  // Published progression: resistance 10, 20 at CL 7, 30 at CL 11. The
  // boundaries are the point — the vendored description's own formula steps a
  // level early at CL 6.
  it.each([
    [1, 10],
    [6, 10],
    [7, 20],
    [10, 20],
    [11, 30],
    [20, 30],
  ])("CL %i → resist fire %i", (cl, expected) => {
    const sheet = compute(makeDoc([activeAt("Resist Energy (Fire)", cl)]), ref);
    expect(sheet.defenses?.resistances).toEqual([
      {
        total: expected,
        qualifier: "fire",
        components: [
          {
            source: "Resist Energy (Fire)",
            sourceId: "inst-" + buffByName("Resist Energy (Fire)").id,
            type: "untyped",
            value: expected,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("each element variant lands on its own qualifier", () => {
    for (const [name, qualifier] of [
      ["Resist Energy (Acid)", "acid"],
      ["Resist Energy (Cold)", "cold"],
      ["Resist Energy (Electricity)", "electricity"],
      ["Resist Energy (Sonic)", "sonic"],
    ] as const) {
      const sheet = compute(makeDoc([activeAt(name, 7)]), ref);
      expect(sheet.defenses?.resistances).toEqual([
        { total: 20, qualifier, components: [expect.objectContaining({ source: name })] },
      ]);
    }
  });

  it("the granted resistance actually comes off matching damage", () => {
    const sheet = compute(makeDoc([activeAt("Resist Energy (Fire)", 7)]), ref);
    expect(resolveDamage([{ amount: 25, type: "fire" }], sheet.defenses).final).toBe(5);
    expect(resolveDamage([{ amount: 25, type: "cold" }], sheet.defenses).final).toBe(25);
  });
});

describe("imm.<type> derivation (this engine's own change target)", () => {
  /** A user-authored buff granting one immunity, as BuffsPanel would build it. */
  function immunityBuff(target: string, formula = "1"): ActiveBuff {
    return {
      instanceId: "inst-imm",
      name: "Test Immunity",
      changes: [{ formula, target, type: "untyped" }],
    };
  }

  it("materializes an immunity entry with provenance", () => {
    const sheet = compute(makeDoc([immunityBuff("imm.fire")]), ref);
    expect(sheet.defenses?.immunities).toEqual([
      {
        qualifier: "fire",
        components: [
          {
            source: "Test Immunity",
            sourceId: "inst-imm",
            type: "untyped",
            value: 1,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("treats any positive value as the flag being on", () => {
    const sheet = compute(makeDoc([immunityBuff("imm.cold", "7")]), ref);
    expect(sheet.defenses?.immunities?.map((i) => i.qualifier)).toEqual(["cold"]);
  });

  it("drops an immunity whose conditional formula evaluates to zero", () => {
    // Same guard as the dr-at-0 wart: a collected-but-inactive change must
    // not materialize a spurious immunity chip.
    const sheet = compute(makeDoc([immunityBuff("imm.fire", "0")]), ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("normalizes the qualifier like every other defense target", () => {
    const sheet = compute(makeDoc([immunityBuff("imm.Fire")]), ref);
    expect(sheet.defenses?.immunities?.[0]?.qualifier).toBe("fire");
  });

  it("actually zeroes matching damage end to end", () => {
    const sheet = compute(makeDoc([immunityBuff("imm.fire")]), ref);
    expect(resolveDamage([{ amount: 40, type: "fire" }], sheet.defenses).final).toBe(0);
    expect(resolveDamage([{ amount: 40, type: "cold" }], sheet.defenses).final).toBe(40);
  });
});
