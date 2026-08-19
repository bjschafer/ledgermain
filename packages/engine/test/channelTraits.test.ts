/**
 * Hand-computed fixtures for the two newly-promoted `abilityDC.channel`
 * community traits in `trait-effects-extracted.ts` (Flames of Hell, Student
 * of Faith), plus the non-stacking check that motivated leaving the
 * vendored Sacred Conduit duplicate unwired: both promoted entries carry a
 * `"trait"`-typed `Change` (matching the hand-authored Sacred Conduit entry
 * in `traits.ts`), and same-type bonuses don't stack (`stacking.ts`:
 * `"trait"` is not in `STACKING_TYPES`, so same-target trait bonuses resolve
 * to the highest, not a sum).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Look up a vendored character `Trait`'s id by its name. */
function traitIdByName(name: string): string {
  const entry = Object.values(ref.traits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored trait not found: ${name}`);
  return entry.id;
}

/** Cleric 5, Human, Cha 14, no gear — base Channel DC 14 (10 + half level 2 + Cha mod 2), matching featAbilityDCs.test.ts's own baseline. */
function makeDoc(traits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "channel-trait-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "cleric", level: 5 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      traits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function channelDc(doc: CharacterDoc): number | undefined {
  return compute(doc, ref).abilityDCs?.find((d) => d.key === "channel")?.dc;
}

describe("Flames of Hell", () => {
  const id = traitIdByName("Flames of Hell (Any Archdevil)");

  it("cleric 5, Cha 14: base Channel DC 14, +1 from the trait -> 15", () => {
    expect(channelDc(makeDoc())).toBe(14);
    expect(channelDc(makeDoc([id]))).toBe(15);
  });
});

describe("Student of Faith", () => {
  const id = traitIdByName("Student of Faith (Rise of the Runelords)");

  it("cleric 5, Cha 14: base Channel DC 14, +1 from the trait's channel-DC half -> 15", () => {
    expect(channelDc(makeDoc())).toBe(14);
    expect(channelDc(makeDoc([id]))).toBe(15);
  });
});

describe("Flames of Hell + Student of Faith together", () => {
  const flames = traitIdByName("Flames of Hell (Any Archdevil)");
  const student = traitIdByName("Student of Faith (Rise of the Runelords)");

  it("both +1 trait bonuses target abilityDC.channel but do not stack (trait type resolves to the highest, not a sum) -> still 15", () => {
    expect(channelDc(makeDoc([flames, student]))).toBe(15);
  });
});
