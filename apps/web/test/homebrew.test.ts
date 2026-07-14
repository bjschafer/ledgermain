/**
 * Homebrew races/feats foundation (phase 1: schema + model, no UI). Covers
 * the RefData overlay, id helpers, and the doc transitions in
 * `src/model/homebrew.ts`, plus one integration-shaped test that a homebrew
 * race actually drives `compute()`.
 */
import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, Feat, Race } from "@pf1/schema";

import { createEmptyDoc, setFlexibleAbility, setRace } from "../src/model/doc.js";
import {
  homebrewId,
  isHomebrewId,
  removeHomebrewFeat,
  removeHomebrewRace,
  resolveRefData,
  upsertHomebrewFeat,
  upsertHomebrewRace,
} from "../src/model/homebrew.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN_ID = raceId("Human");

function makeRace(over: Partial<Race> = {}): Race {
  return {
    id: "hb-race-fixture",
    name: "Homebrew Sprite",
    uuid: "hb-race-fixture",
    size: "sm",
    speeds: { land: 20, fly: 40 },
    languages: ["common"],
    creatureTypes: ["fey"],
    creatureSubtypes: [],
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "-2", target: "str", type: "racial" },
    ],
    contextNotes: [],
    ...over,
  };
}

function makeFeat(over: Partial<Feat> = {}): Feat {
  return {
    id: "hb-feat-fixture",
    name: "Homebrew Grit",
    uuid: "hb-feat-fixture",
    tags: [],
    prerequisites: { abilities: [], feats: [], skills: [] },
    ...over,
  };
}

describe("homebrewId() / isHomebrewId()", () => {
  it("produces hb-prefixed ids", () => {
    expect(homebrewId().startsWith("hb-")).toBe(true);
  });

  it("produces unique ids across calls", () => {
    expect(homebrewId()).not.toBe(homebrewId());
  });

  it("isHomebrewId() is true for hb- ids and false for vendored ids", () => {
    expect(isHomebrewId(homebrewId())).toBe(true);
    expect(isHomebrewId(HUMAN_ID)).toBe(false);
  });
});

describe("resolveRefData()", () => {
  it("returns the SAME reference when the doc has no homebrew field", () => {
    const doc = createEmptyDoc("t");
    expect(resolveRefData(doc, ref)).toBe(ref);
  });

  it("returns the SAME reference when homebrew races/feats are both absent", () => {
    const doc: CharacterDoc = {
      ...createEmptyDoc("t"),
      build: { ...createEmptyDoc("t").build, homebrew: {} },
    };
    expect(resolveRefData(doc, ref)).toBe(ref);
  });

  it("merges a homebrew race in without disturbing vendored races", () => {
    const id = homebrewId();
    const race = makeRace();
    const doc = upsertHomebrewRace(createEmptyDoc("t"), id, race);
    const overlaid = resolveRefData(doc, ref);
    expect(overlaid).not.toBe(ref);
    expect(overlaid.races[id]).toEqual(race);
    expect(overlaid.races[HUMAN_ID]).toBe(ref.races[HUMAN_ID]);
    expect(Object.keys(overlaid.races).length).toBe(Object.keys(ref.races).length + 1);
    // Other RefData tables are untouched (same references).
    expect(overlaid.feats).toBe(ref.feats);
    expect(overlaid.classes).toBe(ref.classes);
  });

  it("merges a homebrew feat in without disturbing vendored feats", () => {
    const id = homebrewId();
    const feat = makeFeat();
    const doc = upsertHomebrewFeat(createEmptyDoc("t"), id, feat);
    const overlaid = resolveRefData(doc, ref);
    expect(overlaid).not.toBe(ref);
    expect(overlaid.feats[id]).toEqual(feat);
    expect(overlaid.races).toBe(ref.races);
  });

  it("merges both races and feats together", () => {
    const raceIdKey = homebrewId();
    const featIdKey = homebrewId();
    let doc = createEmptyDoc("t");
    doc = upsertHomebrewRace(doc, raceIdKey, makeRace());
    doc = upsertHomebrewFeat(doc, featIdKey, makeFeat());
    const overlaid = resolveRefData(doc, ref);
    expect(overlaid.races[raceIdKey]).toBeDefined();
    expect(overlaid.feats[featIdKey]).toBeDefined();
  });
});

describe("upsertHomebrewRace() / removeHomebrewRace()", () => {
  it("upsert adds the race under build.homebrew.races", () => {
    const id = homebrewId();
    const race = makeRace();
    const doc = upsertHomebrewRace(createEmptyDoc("t"), id, race);
    expect(doc.build.homebrew?.races?.[id]).toEqual(race);
  });

  it("upsert overwrites an existing entry under the same id", () => {
    const id = homebrewId();
    let doc = upsertHomebrewRace(createEmptyDoc("t"), id, makeRace({ name: "First" }));
    doc = upsertHomebrewRace(doc, id, makeRace({ name: "Second" }));
    expect(doc.build.homebrew?.races?.[id]?.name).toBe("Second");
  });

  it("remove drops the entry and prunes homebrew back to undefined when empty", () => {
    const id = homebrewId();
    let doc = upsertHomebrewRace(createEmptyDoc("t"), id, makeRace());
    doc = removeHomebrewRace(doc, id);
    expect(doc.build.homebrew).toBeUndefined();
  });

  it("remove leaves sibling homebrew feats intact", () => {
    const raceIdKey = homebrewId();
    const featIdKey = homebrewId();
    let doc = createEmptyDoc("t");
    doc = upsertHomebrewRace(doc, raceIdKey, makeRace());
    doc = upsertHomebrewFeat(doc, featIdKey, makeFeat());
    doc = removeHomebrewRace(doc, raceIdKey);
    expect(doc.build.homebrew?.races).toBeUndefined();
    expect(doc.build.homebrew?.feats?.[featIdKey]).toBeDefined();
  });

  it("remove of an unknown id is a no-op", () => {
    const doc = createEmptyDoc("t");
    expect(removeHomebrewRace(doc, "hb-nope")).toBe(doc);
  });

  it("removing the currently-selected homebrew race resets the race selection like setRace", () => {
    const id = homebrewId();
    let doc = upsertHomebrewRace(createEmptyDoc("t"), id, makeRace());
    doc = setRace(doc, id);
    doc = setFlexibleAbility(doc, "str");
    doc = {
      ...doc,
      identity: { ...doc.identity, favoredClass2: "fighter" },
      build: { ...doc.build, racialTraits: ["some-trait"] },
    };
    expect(doc.identity.race).toBe(id);

    const removed = removeHomebrewRace(doc, id);
    expect(removed.identity.race).toBe("");
    expect(removed.identity.flexibleAbility).toBeUndefined();
    expect(removed.identity.favoredClass2).toBeUndefined();
    expect(removed.build.racialTraits).toBeUndefined();
    expect(removed.build.homebrew?.races).toBeUndefined();
  });

  it("removing a homebrew race that is NOT selected leaves identity.race untouched", () => {
    const id = homebrewId();
    let doc = upsertHomebrewRace(createEmptyDoc("t"), id, makeRace());
    doc = setRace(doc, HUMAN_ID);
    const removed = removeHomebrewRace(doc, id);
    expect(removed.identity.race).toBe(HUMAN_ID);
  });
});

describe("upsertHomebrewFeat() / removeHomebrewFeat()", () => {
  it("upsert adds the feat under build.homebrew.feats", () => {
    const id = homebrewId();
    const feat = makeFeat();
    const doc = upsertHomebrewFeat(createEmptyDoc("t"), id, feat);
    expect(doc.build.homebrew?.feats?.[id]).toEqual(feat);
  });

  it("remove drops the entry and prunes homebrew back to undefined when empty", () => {
    const id = homebrewId();
    let doc = upsertHomebrewFeat(createEmptyDoc("t"), id, makeFeat());
    doc = removeHomebrewFeat(doc, id);
    expect(doc.build.homebrew).toBeUndefined();
  });

  it("remove of an unknown id is a no-op", () => {
    const doc = createEmptyDoc("t");
    expect(removeHomebrewFeat(doc, "hb-nope")).toBe(doc);
  });

  it("removing a homebrew feat selected as the primary instance deselects it", () => {
    const id = homebrewId();
    let doc = upsertHomebrewFeat(createEmptyDoc("t"), id, makeFeat());
    doc = { ...doc, build: { ...doc.build, feats: [id], featChoices: { [id]: "some-choice" } } };

    const removed = removeHomebrewFeat(doc, id);
    expect(removed.build.feats).not.toContain(id);
    expect(removed.build.featChoices?.[id]).toBeUndefined();
    expect(removed.build.homebrew?.feats).toBeUndefined();
  });

  it("removing a homebrew feat with repeatable extra instances strips ALL of them", () => {
    const id = homebrewId();
    let doc = upsertHomebrewFeat(createEmptyDoc("t"), id, makeFeat());
    doc = {
      ...doc,
      build: {
        ...doc.build,
        feats: [id],
        extraFeats: [
          { instanceId: "i1", featId: id },
          { instanceId: "i2", featId: id, choiceId: "x" },
        ],
      },
    };

    const removed = removeHomebrewFeat(doc, id);
    expect(removed.build.feats).not.toContain(id);
    expect(removed.build.extraFeats).toBeUndefined();
  });

  it("removing a homebrew feat that is NOT selected leaves build.feats untouched", () => {
    const id = homebrewId();
    let doc = upsertHomebrewFeat(createEmptyDoc("t"), id, makeFeat());
    doc = { ...doc, build: { ...doc.build, feats: ["toughness"] } };
    const removed = removeHomebrewFeat(doc, id);
    expect(removed.build.feats).toEqual(doc.build.feats);
  });
});

describe("integration: a homebrew race drives compute()", () => {
  it("produces the race's size, speed, and ability changes in the DerivedSheet", () => {
    const id = homebrewId();
    const race = makeRace({
      size: "sm",
      speeds: { land: 20, fly: 40 },
      changes: [
        { formula: "2", target: "dex", type: "racial" },
        { formula: "-2", target: "str", type: "racial" },
      ],
    });
    let doc = upsertHomebrewRace(createEmptyDoc("t"), id, race);
    doc = setRace(doc, id);
    doc = { ...doc, abilities: { str: 14, dex: 12, con: 10, int: 10, wis: 10, cha: 10 } };

    const overlaid = resolveRefData(doc, ref);
    const sheet = compute(doc, overlaid);

    expect(sheet.size).toBe("sm");
    expect(sheet.speeds.land).toBe(20);
    expect(sheet.speeds.fly).toBe(40);
    // str 14 - 2 racial = 12 (mod +1); dex 12 + 2 racial = 14 (mod +2)
    expect(sheet.abilities.str.total).toBe(12);
    expect(sheet.abilities.str.mod).toBe(1);
    expect(sheet.abilities.dex.total).toBe(14);
    expect(sheet.abilities.dex.mod).toBe(2);
  });

  it("compute() does not crash when RefData is overlaid with no homebrew (reference-stable overlay)", () => {
    const doc = setRace(createEmptyDoc("t"), HUMAN_ID);
    const overlaid = resolveRefData(doc, ref);
    expect(overlaid).toBe(ref);
    expect(() => compute(doc, overlaid)).not.toThrow();
  });
});
