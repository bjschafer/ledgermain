/**
 * Hand-computed fixtures for modifiers that reach a derived check through a
 * rule rather than a direct target: CMB taking general attack-roll modifiers,
 * initiative taking ability-check penalties, Haste's dodge bonus and speed,
 * negative levels on CMB/CMD/initiative, and size on Stealth and Fly.
 *
 * Base character: Human Fighter 1, Str 16 (+3), Dex 14 (+2), BAB +1, so CMB
 * +4, CMD 16, initiative +2, AC 12 before any effect below.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function idByName<T extends { name: string }>(coll: Record<string, T>, name: string): string {
  const entry = Object.entries(coll).find(([, v]) => v.name === name);
  if (!entry) throw new Error(`not found: ${name}`);
  return entry[0];
}

function vendoredBuff(name: string, casterLevel: number): ActiveBuff {
  const id = idByName(ref.buffs, name);
  const buff = ref.buffs[id]!;
  return { instanceId: name, buffId: id, name, changes: buff.changes, casterLevel };
}

function makeDoc(opts: {
  race?: string;
  buffs?: ActiveBuff[];
  conditions?: string[];
  negativeLevels?: number;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "check-modifiers-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: idByName(ref.races, opts.race ?? "Human"),
      classes: [{ tag: "fighter", level: 1 }],
    },
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
      conditions: opts.conditions ?? [],
      activeBuffs: opts.buffs ?? [],
      resources: {},
      ...(opts.negativeLevels ? { negativeLevels: { temporary: opts.negativeLevels } } : {}),
    },
  };
}

describe("CMB takes general attack-roll modifiers (CRB p. 199)", () => {
  it("Bless's +1 morale on attack rolls: CMB 4 + 1 = 5", () => {
    expect(compute(makeDoc({ buffs: [vendoredBuff("Bless", 1)] }), ref).cmb).toBe(5);
  });

  it("shaken's -2 on attack rolls: CMB 4 - 2 = 2", () => {
    expect(compute(makeDoc({ conditions: ["shaken"] }), ref).cmb).toBe(2);
  });

  it("grappled's -2 applies to every maneuver but grapple (CRB p. 567)", () => {
    const sheet = compute(makeDoc({ conditions: ["grappled"] }), ref);
    expect(sheet.cmb).toBe(2);
    expect(sheet.cmbConditionals).toContainEqual(
      expect.objectContaining({ total: 4, categories: ["grapple"] }),
    );
  });
});

describe("initiative takes ability-check penalties (CRB p. 178: a Dexterity check)", () => {
  it("shaken: +2 - 2 = 0 (CRB p. 568)", () => {
    expect(compute(makeDoc({ conditions: ["shaken"] }), ref).initiative.total).toBe(0);
  });

  it("sickened: +2 - 2 = 0 (CRB p. 568)", () => {
    expect(compute(makeDoc({ conditions: ["sickened"] }), ref).initiative.total).toBe(0);
  });
});

describe("one negative level (CRB p. 562)", () => {
  const sheet = compute(makeDoc({ negativeLevels: 1 }), ref);

  it("-1 on CMB: 4 - 1 = 3, counted once", () => {
    expect(sheet.cmb).toBe(3);
  });

  it("-1 on CMD: 16 - 1 = 15", () => {
    expect(sheet.cmd).toBe(15);
  });

  it("-1 on initiative, an ability check: 2 - 1 = 1", () => {
    expect(sheet.initiative.total).toBe(1);
  });
});

describe("Haste (CRB p. 294)", () => {
  const sheet = compute(makeDoc({ buffs: [vendoredBuff("Haste", 5)] }), ref);

  it("+1 dodge to AC: 13, lost when flat-footed with Dex: 10", () => {
    expect(sheet.ac.normal).toBe(13);
    expect(sheet.ac.flatFooted).toBe(10);
  });

  it("the dodge bonus reaches CMD: 17, flat-footed 10 + 1 + 3 = 14", () => {
    expect(sheet.cmd).toBe(17);
    expect(sheet.cmdFlatFooted).toBe(14);
  });

  it("+30 ft. land speed, capped at twice normal: 60", () => {
    expect(sheet.speeds.land).toBe(60);
  });
});

describe("size modifies Stealth and Fly (CRB pp. 97, 106)", () => {
  it("a Small halfling, Dex 16 (+3): Stealth 3 + 4 = 7, Fly 3 + 2 = 5", () => {
    const sheet = compute(makeDoc({ race: "Halfling" }), ref);
    expect(sheet.skills.ste!.total).toBe(7);
    expect(sheet.skills.fly!.total).toBe(5);
  });

  it("an enlarged human, Dex 12 (+1): Stealth 1 - 4 = -3, Fly 1 - 2 = -1", () => {
    const sheet = compute(makeDoc({ buffs: [vendoredBuff("Enlarge Person", 1)] }), ref);
    expect(sheet.skills.ste!.total).toBe(-3);
    expect(sheet.skills.fly!.total).toBe(-1);
  });
});
