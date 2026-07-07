import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenMagusArcanaCount,
  expectedMagusArcanaCount,
  hasMagusArcana,
  magusArcanaNeedWarning,
  magusLevel,
  toggleMagusArcana,
} from "../src/model/magusArcana.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  magusArcana?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "magus", level: 6 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      magusArcana: over.magusArcana,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/magusArcana: toggleMagusArcana", () => {
  it("adds an arcana id not yet present", () => {
    const doc = toggleMagusArcana(makeDoc({}), "familiar");
    expect(doc.build.magusArcana).toEqual(["familiar"]);
    expect(hasMagusArcana(doc, "familiar")).toBe(true);
  });

  it("adds to an undefined magusArcana array (back-compat docs)", () => {
    const doc = toggleMagusArcana(makeDoc({ magusArcana: undefined }), "familiar");
    expect(doc.build.magusArcana).toEqual(["familiar"]);
  });

  it("removes an arcana id already present", () => {
    const doc = toggleMagusArcana(makeDoc({ magusArcana: ["familiar", "poolStrike"] }), "familiar");
    expect(doc.build.magusArcana).toEqual(["poolStrike"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 3 }],
      magusArcana: ["familiar"],
    });
    const withExtra = toggleMagusArcana(doc, "poolStrike");
    expect(chosenMagusArcanaCount(withExtra)).toBe(2);
  });
});

describe("model/magusArcana: magusLevel", () => {
  it("returns the magus class level", () => {
    expect(magusLevel(makeDoc({ classes: [{ tag: "magus", level: 9 }] }))).toBe(9);
  });

  it("returns 0 for a non-magus", () => {
    expect(magusLevel(makeDoc({ classes: [{ tag: "fighter", level: 9 }] }))).toBe(0);
  });
});

describe("model/magusArcana: expectedMagusArcanaCount (UM progression)", () => {
  it("0 for a non-magus", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 10 }] });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(0);
  });

  it("levels 1-2: 0 arcana (first gain is 3rd)", () => {
    expect(expectedMagusArcanaCount(makeDoc({ classes: [{ tag: "magus", level: 1 }] }), ref)).toBe(
      0,
    );
    expect(expectedMagusArcanaCount(makeDoc({ classes: [{ tag: "magus", level: 2 }] }), ref)).toBe(
      0,
    );
  });

  it("level 3: 1 arcana", () => {
    const doc = makeDoc({ classes: [{ tag: "magus", level: 3 }] });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(1);
  });

  it("level 5: still 1 (next gain is 6th)", () => {
    const doc = makeDoc({ classes: [{ tag: "magus", level: 5 }] });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(1);
  });

  it("level 6: 2 arcana", () => {
    const doc = makeDoc({ classes: [{ tag: "magus", level: 6 }] });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(2);
  });

  it("level 9: 3 arcana", () => {
    const doc = makeDoc({ classes: [{ tag: "magus", level: 9 }] });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(3);
  });

  it("Extra Arcana feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 6 }],
      feats: [idByName("Extra Arcana")],
    });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(3);
  });

  it("two copies of Extra Arcana each count (stackable feat)", () => {
    const featId = idByName("Extra Arcana");
    const doc = makeDoc({ classes: [{ tag: "magus", level: 6 }], feats: [featId, featId] });
    expect(expectedMagusArcanaCount(doc, ref)).toBe(4);
  });
});

describe("model/magusArcana: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 6 }],
      magusArcana: ["familiar", "poolStrike"],
    });
    expect(chosenMagusArcanaCount(doc)).toBe(expectedMagusArcanaCount(doc, ref));
    expect(magusArcanaNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 6 }],
      magusArcana: ["familiar", "poolStrike", "spellShield"],
    });
    expect(magusArcanaNeedWarning(doc, ref)).toBe(true);
  });

  it("under the expected count needs no warning (never blocks under-selection either)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 9 }],
      magusArcana: ["familiar"],
    });
    expect(magusArcanaNeedWarning(doc, ref)).toBe(false);
  });

  it("empty selection needs no warning", () => {
    expect(magusArcanaNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});
