import { describe, expect, it } from "bun:test";

import type { CharacterDoc, RefData } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  changeShapeHasEffect,
  isChangeShapeActive,
  isSkinwalker,
  toggleChangeShape,
} from "../src/model/skinwalker.js";

const ref: RefData = loadRefData();

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

function makeDoc(raceName: string, vendoredRacialTraits?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId(raceName), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vendoredRacialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/skinwalker: isSkinwalker", () => {
  it("true for a Skinwalker, false for anything else", () => {
    expect(isSkinwalker(makeDoc("Skinwalker"), ref)).toBe(true);
    expect(isSkinwalker(makeDoc("Human"), ref)).toBe(false);
  });
});

describe("model/skinwalker: toggleChangeShape", () => {
  it("adds a marker buff with no changes of its own, keyed by effectTag", () => {
    const doc = toggleChangeShape(makeDoc("Skinwalker"));
    expect(doc.live.activeBuffs.length).toBe(1);
    const buff = doc.live.activeBuffs[0]!;
    expect(buff.effectTag).toBe("skinwalker:changeShape");
    expect(buff.changes).toEqual([]);
    expect(buff.buffId).toBeUndefined();
    expect(isChangeShapeActive(doc)).toBe(true);
  });

  it("toggling again removes it", () => {
    let doc = toggleChangeShape(makeDoc("Skinwalker"));
    doc = toggleChangeShape(doc);
    expect(doc.live.activeBuffs).toEqual([]);
    expect(isChangeShapeActive(doc)).toBe(false);
  });

  it("off by default on a fresh doc", () => {
    expect(isChangeShapeActive(makeDoc("Skinwalker"))).toBe(false);
  });
});

describe("model/skinwalker: changeShapeHasEffect", () => {
  it("false with no heritage picked", () => {
    expect(changeShapeHasEffect(makeDoc("Skinwalker"), ref)).toBe(false);
  });

  it("true once a -Kin heritage carrying the gated Change is picked", () => {
    const ragebred = traitId("Wereboar-Kin (Ragebred)");
    expect(changeShapeHasEffect(makeDoc("Skinwalker", [ragebred]), ref)).toBe(true);
  });

  it("false for an unrelated vendored trait", () => {
    const graniteSkin = traitId("Granite Skin");
    expect(changeShapeHasEffect(makeDoc("Oread", [graniteSkin]), ref)).toBe(false);
  });
});
