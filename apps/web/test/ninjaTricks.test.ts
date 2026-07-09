import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenNinjaTrickCount,
  expectedNinjaTrickCount,
  hasNinjaTrick,
  ninjaLevel,
  ninjaTricksNeedWarning,
  toggleNinjaTrick,
} from "../src/model/ninjaTricks.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  ninjaTricks?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "ninja", level: 4 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ninjaTricks: over.ninjaTricks,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/ninjaTricks: toggleNinjaTrick", () => {
  it("adds a trick id not yet present", () => {
    const doc = toggleNinjaTrick(makeDoc({}), "fastStealth");
    expect(doc.build.ninjaTricks).toEqual(["fastStealth"]);
    expect(hasNinjaTrick(doc, "fastStealth")).toBe(true);
  });

  it("adds to an undefined ninjaTricks array (back-compat docs)", () => {
    const doc = toggleNinjaTrick(makeDoc({ ninjaTricks: undefined }), "fastStealth");
    expect(doc.build.ninjaTricks).toEqual(["fastStealth"]);
  });

  it("removes a trick id already present", () => {
    const doc = toggleNinjaTrick(
      makeDoc({ ninjaTricks: ["fastStealth", "wallClimber"] }),
      "fastStealth",
    );
    expect(doc.build.ninjaTricks).toEqual(["wallClimber"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({ classes: [{ tag: "ninja", level: 2 }], ninjaTricks: ["fastStealth"] });
    const withExtra = toggleNinjaTrick(doc, "wallClimber");
    expect(withExtra.build.ninjaTricks).toEqual(["fastStealth", "wallClimber"]);
  });
});

describe("model/ninjaTricks: ninjaLevel", () => {
  it("returns the ninja class level", () => {
    expect(ninjaLevel(makeDoc({ classes: [{ tag: "ninja", level: 12 }] }))).toBe(12);
  });

  it("returns 0 for a non-ninja", () => {
    expect(ninjaLevel(makeDoc({ classes: [{ tag: "fighter", level: 12 }] }))).toBe(0);
  });
});

describe("model/ninjaTricks: expectedNinjaTrickCount (UC progression)", () => {
  it("0 for a non-ninja", () => {
    expect(
      expectedNinjaTrickCount(makeDoc({ classes: [{ tag: "fighter", level: 10 }] }), ref),
    ).toBe(0);
  });

  it("level 1: 0 (first trick is 2nd level)", () => {
    expect(expectedNinjaTrickCount(makeDoc({ classes: [{ tag: "ninja", level: 1 }] }), ref)).toBe(
      0,
    );
  });

  it("level 2: 1 trick", () => {
    expect(expectedNinjaTrickCount(makeDoc({ classes: [{ tag: "ninja", level: 2 }] }), ref)).toBe(
      1,
    );
  });

  it("level 3: still 1 (next gain is 4th)", () => {
    expect(expectedNinjaTrickCount(makeDoc({ classes: [{ tag: "ninja", level: 3 }] }), ref)).toBe(
      1,
    );
  });

  it("level 10: 5 tricks", () => {
    expect(expectedNinjaTrickCount(makeDoc({ classes: [{ tag: "ninja", level: 10 }] }), ref)).toBe(
      5,
    );
  });

  it("level 20: 10 tricks (all ten thresholds reached)", () => {
    expect(expectedNinjaTrickCount(makeDoc({ classes: [{ tag: "ninja", level: 20 }] }), ref)).toBe(
      10,
    );
  });

  it("Extra Ninja Trick feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "ninja", level: 4 }],
      feats: [idByName("Extra Ninja Trick")],
    });
    expect(expectedNinjaTrickCount(doc, ref)).toBe(3);
  });

  it("two copies of Extra Ninja Trick each count (stackable feat)", () => {
    const featId = idByName("Extra Ninja Trick");
    const doc = makeDoc({ classes: [{ tag: "ninja", level: 4 }], feats: [featId, featId] });
    expect(expectedNinjaTrickCount(doc, ref)).toBe(4);
  });
});

describe("model/ninjaTricks: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "ninja", level: 4 }],
      ninjaTricks: ["fastStealth", "wallClimber"],
    });
    expect(chosenNinjaTrickCount(doc)).toBe(expectedNinjaTrickCount(doc, ref));
    expect(ninjaTricksNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "ninja", level: 2 }],
      ninjaTricks: ["fastStealth", "wallClimber"],
    });
    expect(ninjaTricksNeedWarning(doc, ref)).toBe(true);
  });

  it("empty selection needs no warning", () => {
    expect(ninjaTricksNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});
