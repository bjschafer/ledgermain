import { describe, expect, it } from "bun:test";

import type { Change, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, isTargetApplied } from "../src/index.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: CharacterDoc["identity"]["classes"];
  abilities?: Partial<CharacterDoc["abilities"]>;
  feats?: string[];
  traits?: string[];
  castingAdvancement?: CharacterDoc["build"]["castingAdvancement"];
  buffChanges?: Change[];
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
      classes: over.classes ?? [{ tag: "wizard", level: 5 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: over.feats ?? [],
      traits: over.traits,
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      castingAdvancement: over.castingAdvancement,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.buffChanges
        ? [{ instanceId: "b1", name: "Test Buff", changes: over.buffChanges }]
        : [],
      resources: {},
    },
  };
}

// Concentration check = 1d20 + caster level + casting ability modifier
// (PF1 CRB p. 206, "Concentration").
describe("concentration check bonus", () => {
  it("wizard 5, Int 18: CL 5 + Int 4 = +9", () => {
    const sheet = compute(makeDoc({ abilities: { int: 18 } }), ref);
    expect(sheet.concentration).toHaveLength(1);
    const wiz = sheet.concentration![0]!;
    expect(wiz.classTag).toBe("wizard");
    expect(wiz.casterLevel).toBe(5);
    expect(wiz.ability).toBe("int");
    expect(wiz.total).toBe(9);
    expect(wiz.conditionals).toBeUndefined();
  });

  it("omitted for a non-caster", () => {
    const sheet = compute(makeDoc({ classes: [{ tag: "fighter", level: 5 }] }), ref);
    expect(sheet.concentration).toBeUndefined();
  });

  it("omitted for alchemists: extracts are drunk, not cast", () => {
    const sheet = compute(makeDoc({ classes: [{ tag: "alchemist", level: 5 }] }), ref);
    expect(sheet.concentration).toBeUndefined();
  });

  it("paladin: nothing before 4th level, then CL = level - 3 (CRB p. 63)", () => {
    const low = compute(makeDoc({ classes: [{ tag: "paladin", level: 3 }] }), ref);
    expect(low.concentration).toBeUndefined();
    const sheet = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 6 }], abilities: { cha: 14 } }),
      ref,
    );
    // CL 3 + Cha 2
    expect(sheet.concentration![0]!.total).toBe(5);
  });

  it("cleric 3 / wizard 4 gets one line per class", () => {
    const sheet = compute(
      makeDoc({
        classes: [
          { tag: "cleric", level: 3 },
          { tag: "wizard", level: 4 },
        ],
        abilities: { wis: 16, int: 12 },
      }),
      ref,
    );
    const byTag = Object.fromEntries(sheet.concentration!.map((c) => [c.classTag, c.total]));
    // Cleric: CL 3 + Wis 3; wizard: CL 4 + Int 1.
    expect(byTag).toEqual({ cleric: 6, wizard: 5 });
  });

  it("Mystic Theurge advancement raises the advanced class's CL", () => {
    const sheet = compute(
      makeDoc({
        classes: [
          { tag: "cleric", level: 3 },
          { tag: "wizard", level: 3 },
          { tag: "mysticTheurge", level: 2 },
        ],
        castingAdvancement: { mysticTheurge: ["wizard", "cleric"] },
      }),
      ref,
    );
    const byTag = Object.fromEntries(sheet.concentration!.map((c) => [c.classTag, c.total]));
    // Each class advanced by the theurge's 2 levels: CL 5, abilities all 10.
    expect(byTag).toEqual({ cleric: 5, wizard: 5 });
  });

  it("Focused Mind trait: +2 trait bonus (Ultimate Campaign)", () => {
    const sheet = compute(makeDoc({ traits: ["focusedMind"] }), ref);
    const wiz = sheet.concentration![0]!;
    expect(wiz.total).toBe(7);
    expect(wiz.components.some((c) => c.source === "Focused Mind" && c.value === 2)).toBe(true);
  });

  it("buffs targeting concentration apply, and the target counts as applied", () => {
    expect(isTargetApplied("concentration")).toBe(true);
    expect(isTargetApplied("concentration.defensive")).toBe(true);
    const sheet = compute(
      makeDoc({ buffChanges: [{ formula: "2", target: "concentration", type: "sacred" }] }),
      ref,
    );
    expect(sheet.concentration![0]!.total).toBe(7);
  });

  it("Combat Casting: +4 only when casting defensively or grappled (CRB p. 119)", () => {
    const sheet = compute(makeDoc({ feats: [featId("Combat Casting")] }), ref);
    const wiz = sheet.concentration![0]!;
    expect(wiz.total).toBe(5);
    expect(wiz.conditionals).toEqual([
      { total: 9, categories: ["defensive", "grappled"], labels: ["defensive", "grappled"] },
    ]);
  });

  it("Combat Casting's conditional total includes general bonuses", () => {
    const sheet = compute(
      makeDoc({ feats: [featId("Combat Casting")], traits: ["focusedMind"] }),
      ref,
    );
    const wiz = sheet.concentration![0]!;
    expect(wiz.total).toBe(7);
    expect(wiz.conditionals![0]!.total).toBe(11);
  });
});
