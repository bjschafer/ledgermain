/**
 * Hand-computed fixture tests for `computeSenses` against the real vendored
 * slice: race senses (mechanized by the data-pipeline's
 * `SUPPLEMENTAL_RACE_SENSES`), vendored alternate racial traits that carry
 * their own `sensedv`/`sensesc` changes, and sense-granting buffs — plus the
 * one rule that makes senses different from every other change target,
 * longest-range-wins rather than typed stacking.
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

function traitId(name: string): string {
  const entry = Object.values(ref.racialTraits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored racial trait not found: ${name}`);
  return entry.id;
}

function activeBuff(name: string, casterLevel: number): ActiveBuff {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  const [id, buff] = entry;
  return {
    instanceId: `inst-${id}`,
    buffId: id,
    name: buff.name,
    changes: buff.changes,
    casterLevel,
  };
}

function makeDoc(
  raceName: string,
  opts: { traits?: string[]; buffs?: ActiveBuff[] } = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `senses-test-${raceName}`,
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(raceName),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vendoredRacialTraits: (opts.traits ?? []).map(traitId),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.buffs ?? [],
      resources: {},
    },
  };
}

/** `[kind, range]` pairs, the shape most of these assertions care about. */
function senseList(doc: CharacterDoc): [string, number | undefined][] {
  return compute(doc, ref).senses.map((s) => [s.kind, s.range]);
}

describe("race senses reach the sheet", () => {
  it("a dwarf has darkvision 60 ft.", () => {
    expect(senseList(makeDoc("Dwarf"))).toEqual([["darkvision", 60]]);
  });

  it("an elf has low-light vision, which carries no range", () => {
    expect(senseList(makeDoc("Elf"))).toEqual([["lowLight", undefined]]);
  });

  it("a drow's superior darkvision reads 120, not 60", () => {
    expect(senseList(makeDoc("Drow"))).toEqual([["darkvision", 120]]);
  });

  it("a svirfneblin has both, in display order", () => {
    expect(senseList(makeDoc("Svirfneblin"))).toEqual([
      ["darkvision", 120],
      ["lowLight", undefined],
    ]);
  });

  it("a human has no senses at all — an empty list, so the UI renders no row", () => {
    expect(compute(makeDoc("Human"), ref).senses).toEqual([]);
  });

  it("provenance names the race", () => {
    const [darkvision] = compute(makeDoc("Dwarf"), ref).senses;
    expect(darkvision?.label).toBe("Darkvision");
    expect(darkvision?.components).toEqual([
      {
        source: "Dwarf",
        sourceId: raceId("Dwarf"),
        type: "racial",
        value: 60,
        applied: true,
      },
    ]);
  });
});

describe("competing sources: longest range wins, losers kept for provenance", () => {
  it("Acute Darkvision (90 ft.) beats the half-orc's own 60 ft.", () => {
    const sheet = compute(makeDoc("Half-Orc", { traits: ["Acute Darkvision"] }), ref);
    expect(sheet.senses).toHaveLength(1);
    const darkvision = sheet.senses[0]!;
    expect(darkvision.range).toBe(90);
    expect(darkvision.components.map((c) => [c.source, c.value, c.applied])).toEqual([
      ["Half-Orc", 60, false],
      ["Acute Darkvision", 90, true],
    ]);
  });

  it("a shorter grant loses to the race's own range rather than replacing it", () => {
    // Blessing of the Mole grants darkvision 30 ft. — strictly worse than a
    // dwarf's 60, and PF1 senses of a kind don't stack, so 60 still stands.
    const sheet = compute(
      makeDoc("Dwarf", { buffs: [activeBuff("Blessing of the Mole", 1)] }),
      ref,
    );
    expect(sheet.senses[0]!.range).toBe(60);
    expect(sheet.senses[0]!.components.map((c) => [c.source, c.value, c.applied])).toEqual([
      ["Dwarf", 60, true],
      ["Blessing of the Mole", 30, false],
    ]);
  });

  it("Darkvision, Greater (120 ft.) beats a dwarf's 60", () => {
    const sheet = compute(makeDoc("Dwarf", { buffs: [activeBuff("Darkvision, Greater", 5)] }), ref);
    expect(sheet.senses[0]!.range).toBe(120);
  });
});

describe("non-vision senses and conditional formulas", () => {
  it("a rougarou's scent lands alongside low-light vision", () => {
    expect(senseList(makeDoc("Rougarou"))).toEqual([
      ["lowLight", undefined],
      ["scent", 30],
    ]);
  });

  it("caligni see-in-darkness is a flag, not a range", () => {
    expect(senseList(makeDoc("Caligni"))).toEqual([["seeInDarkness", undefined]]);
  });

  it("a sahuagin's blindsense 30 ft. shows below its darkvision", () => {
    expect(senseList(makeDoc("Sahuagin"))).toEqual([
      ["darkvision", 60],
      ["blindsense", 30],
    ]);
  });

  it("a change that evaluates to 0 does not materialize a sense line", () => {
    // Animal Focus (Bat): darkvision `ifelse(lte(@item.level, 8), 30, 60)` at
    // any level, but blindsense only `if(gte(@item.level, 15), 10)` — at
    // effect level 1 the blindsense change collects as 0 and must be dropped.
    const sheet = compute(makeDoc("Human", { buffs: [activeBuff("Animal Focus (Bat)", 1)] }), ref);
    expect(sheet.senses.map((s) => s.kind)).toEqual(["darkvision"]);
    expect(sheet.senses[0]!.range).toBe(30);
  });

  it("the same buff at effect level 15 grants both", () => {
    const sheet = compute(makeDoc("Human", { buffs: [activeBuff("Animal Focus (Bat)", 15)] }), ref);
    expect(sheet.senses.map((s) => [s.kind, s.range])).toEqual([
      ["darkvision", 60],
      ["blindsense", 10],
    ]);
  });
});
