/**
 * Prophet of Kalistrade (PZO9249 p. 42) and Red Mantis Assassin (PZO1138
 * p. 154) cast from a ten-level table of their own: Charisma-based,
 * spontaneous arcane, spell levels 1-4, no cantrips. Expected values are
 * read off each class's published level table and Spells Known table (the
 * two print identical numbers).
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  baseSpellsKnown,
  baseSpellsPerDay,
  castingAdvancementBonus,
  casterLevelForClass,
  compute,
  effectiveCasterClassLevel,
} from "../src/index.js";

const ref = loadRefData();

function makeDoc(
  classes: { tag: string; level: number }[],
  over: Partial<CharacterDoc["build"]> = {},
): CharacterDoc {
  const human = Object.entries(ref.races).find(([, r]) => r.name === "Human")![0];
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: human, classes },
    abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...over,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const perDayRow = (tag: "prophetOfKalistrade" | "redMantisAssassin", level: number) =>
  [0, 1, 2, 3, 4, 5].map((sl) => baseSpellsPerDay(tag, level, sl));
const knownRow = (tag: "prophetOfKalistrade" | "redMantisAssassin", level: number) =>
  [0, 1, 2, 3, 4, 5].map((sl) => baseSpellsKnown(tag, level, sl));

describe("prestige classes with their own spell table", () => {
  for (const tag of ["prophetOfKalistrade", "redMantisAssassin"] as const) {
    it(`${tag}: spells per day and known match the published table`, () => {
      expect(perDayRow(tag, 1)).toEqual([null, 1, null, null, null, null]);
      expect(perDayRow(tag, 4)).toEqual([null, 3, 1, null, null, null]);
      expect(perDayRow(tag, 7)).toEqual([null, 4, 3, 1, null, null]);
      expect(perDayRow(tag, 10)).toEqual([null, 5, 4, 3, 1, null]);
      expect(knownRow(tag, 1)).toEqual([null, 2, null, null, null, null]);
      expect(knownRow(tag, 6)).toEqual([null, 4, 4, null, null, null]);
      expect(knownRow(tag, 10)).toEqual([null, 5, 5, 4, 2, null]);
    });
  }

  it("CL equals prestige class level", () => {
    expect(casterLevelForClass("redMantisAssassin", 1)).toBe(1);
    expect(casterLevelForClass("prophetOfKalistrade", 7)).toBe(7);
  });

  it("an arcane advancement slot can target it, and the table holds its 10th row past 10", () => {
    // Arcane Trickster advances "existing arcane spellcasting class" at every level.
    const doc = makeDoc(
      [
        { tag: "rogue", level: 3 },
        { tag: "redMantisAssassin", level: 10 },
        { tag: "arcaneTrickster", level: 2 },
      ],
      { castingAdvancement: { arcaneTrickster: ["redMantisAssassin"] } },
    );
    expect(castingAdvancementBonus(doc, ref, "redMantisAssassin")).toBe(2);
    const effective = effectiveCasterClassLevel(doc, ref, "redMantisAssassin");
    expect(effective).toBe(12);
    expect(casterLevelForClass("redMantisAssassin", effective)).toBe(12);
    expect(perDayRow("redMantisAssassin", effective)).toEqual([null, 5, 4, 3, 1, null]);
  });

  it("concentration uses Charisma", () => {
    const doc = makeDoc([{ tag: "prophetOfKalistrade", level: 3 }]);
    const line = compute(doc, ref).concentration?.find((c) => c.classTag === "prophetOfKalistrade");
    // CL 3 + Cha 16 (+3).
    expect(line?.total).toBe(6);
  });

  describe("arcane spell failure", () => {
    const LIGHT: ItemInstance = {
      equipped: true,
      name: "Studded Leather",
      armor: { slot: "armor", ac: 3, maxDex: 5, acp: -1, type: 1, asf: 15 },
    };
    const SHIELD: ItemInstance = {
      equipped: true,
      name: "Buckler",
      armor: { slot: "shield", ac: 1, acp: -1, asf: 5 },
    };

    it("Red Mantis Assassin ignores it in light armor", () => {
      const doc = makeDoc([{ tag: "redMantisAssassin", level: 1 }], { gear: [LIGHT] });
      expect(compute(doc, ref).arcaneSpellFailure).toMatchObject({ total: 0, exempt: true });
    });

    it("Red Mantis Assassin still suffers it with a shield", () => {
      const doc = makeDoc([{ tag: "redMantisAssassin", level: 1 }], { gear: [LIGHT, SHIELD] });
      expect(compute(doc, ref).arcaneSpellFailure).toMatchObject({ total: 20, exempt: false });
    });

    it("Prophet of Kalistrade has no armor exemption", () => {
      const doc = makeDoc([{ tag: "prophetOfKalistrade", level: 1 }], { gear: [LIGHT] });
      expect(compute(doc, ref).arcaneSpellFailure).toMatchObject({ total: 15, exempt: false });
    });
  });
});
