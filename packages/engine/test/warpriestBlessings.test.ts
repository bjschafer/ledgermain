import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { resolveClassFeatures } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeWarpriest(level: number, blessings: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "warpriest", level }],
    },
    abilities: { str: 14, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      blessings,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function blessingFeatures(doc: CharacterDoc) {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures.filter((f) => f.origin?.kind === "blessing");
}

/**
 * PF1 Advanced Class Guide p.65, "Blessings": "Each warpriest can select two
 * blessings from among those granted by his deity ... Each blessing grants a
 * minor power at 1st level and a major power at 10th level." Nobility (p.67,
 * Abadar) and Sun (p.68, Iomedae/Sarenrae) are used here as two arbitrary,
 * unrelated blessings — nothing about the fixture depends on their deity
 * overlap.
 */
describe("warpriest blessing powers", () => {
  it("a 1st-level warpriest with two blessings sees only their minor powers", () => {
    const doc = makeWarpriest(1, ["nobility", "sun"]);
    const names = blessingFeatures(doc)
      .map((f) => f.name)
      .sort();
    expect(names).toEqual(["Blinding Strike", "Inspiring Word"]);
  });

  it("a 10th-level warpriest with two blessings sees both minor and major powers", () => {
    const doc = makeWarpriest(10, ["nobility", "sun"]);
    const names = blessingFeatures(doc)
      .map((f) => f.name)
      .sort();
    expect(names).toEqual([
      "Blinding Strike",
      "Cleansing Fire",
      "Inspiring Word",
      "Lead by Example",
    ]);
  });

  it("a 9th-level warpriest does not yet see the major power", () => {
    const doc = makeWarpriest(9, ["nobility"]);
    const names = blessingFeatures(doc).map((f) => f.name);
    expect(names).toEqual(["Inspiring Word"]);
  });

  it("gates each power's level and resolves its full prose via the registered classFeatures stub", () => {
    const doc = makeWarpriest(10, ["nobility"]);
    const features = blessingFeatures(doc);
    const minor = features.find((f) => f.name === "Inspiring Word")!;
    const major = features.find((f) => f.name === "Lead by Example")!;
    expect(minor.level).toBe(1);
    expect(major.level).toBe(10);
    expect(minor.origin).toEqual({ kind: "blessing", label: "Nobility Blessing" });
    expect(major.origin).toEqual({ kind: "blessing", label: "Nobility Blessing" });
    expect(minor.classTag).toBe("warpriest");
    // ClassFeaturesList shows full prose via `refData.classFeatures[featureId]
    // .description` — never a mere one-line `detail` — so the registered stub
    // must actually resolve, the same way a domain's granted power does.
    expect(ref.classFeatures[minor.featureId]?.description).toContain("morale bonus");
    expect(ref.classFeatures[major.featureId]?.description).toContain("morale bonus");
  });

  it("no chosen blessing grants no blessing-origin features", () => {
    expect(blessingFeatures(makeWarpriest(10, []))).toEqual([]);
  });

  it("an unresolvable blessing id grants nothing, not an error", () => {
    expect(blessingFeatures(makeWarpriest(10, ["not-a-real-blessing"]))).toEqual([]);
  });

  it("a non-warpriest with a stale blessings field gets nothing", () => {
    const doc = makeWarpriest(0, ["nobility"]);
    doc.identity.classes = [{ tag: "fighter", level: 5 }];
    expect(blessingFeatures(doc)).toEqual([]);
  });
});
