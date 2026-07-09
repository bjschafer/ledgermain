import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenMesmeristTrickCount,
  expectedMesmeristTrickCount,
  hasMesmeristTrick,
  mesmeristLevel,
  mesmeristTricksNeedWarning,
  toggleMesmeristTrick,
} from "../src/model/mesmeristTricks.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  mesmeristTricks?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: "",
      classes: over.classes ?? [{ tag: "mesmerist", level: 4 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      mesmeristTricks: over.mesmeristTricks,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/mesmeristTricks: toggleMesmeristTrick", () => {
  it("adds a trick id not yet present", () => {
    const doc = toggleMesmeristTrick(makeDoc({}), "compelAlacrity");
    expect(doc.build.mesmeristTricks).toEqual(["compelAlacrity"]);
    expect(hasMesmeristTrick(doc, "compelAlacrity")).toBe(true);
  });

  it("adds to an undefined mesmeristTricks array (back-compat docs)", () => {
    const doc = toggleMesmeristTrick(makeDoc({ mesmeristTricks: undefined }), "compelAlacrity");
    expect(doc.build.mesmeristTricks).toEqual(["compelAlacrity"]);
  });

  it("removes a trick id already present", () => {
    const doc = toggleMesmeristTrick(
      makeDoc({ mesmeristTricks: ["compelAlacrity", "falseFlanker"] }),
      "compelAlacrity",
    );
    expect(doc.build.mesmeristTricks).toEqual(["falseFlanker"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 1 }],
      mesmeristTricks: ["compelAlacrity"],
    });
    const withExtra = toggleMesmeristTrick(doc, "falseFlanker");
    expect(withExtra.build.mesmeristTricks).toEqual(["compelAlacrity", "falseFlanker"]);
  });
});

describe("model/mesmeristTricks: mesmeristLevel", () => {
  it("returns the mesmerist class level", () => {
    expect(mesmeristLevel(makeDoc({ classes: [{ tag: "mesmerist", level: 12 }] }))).toBe(12);
  });

  it("returns 0 for a non-mesmerist", () => {
    expect(mesmeristLevel(makeDoc({ classes: [{ tag: "fighter", level: 12 }] }))).toBe(0);
  });
});

describe("model/mesmeristTricks: expectedMesmeristTrickCount (OA progression)", () => {
  it("0 for a non-mesmerist", () => {
    expect(
      expectedMesmeristTrickCount(makeDoc({ classes: [{ tag: "fighter", level: 10 }] }), ref),
    ).toBe(0);
  });

  it("level 1: 1 trick (first trick is 1st level)", () => {
    expect(
      expectedMesmeristTrickCount(makeDoc({ classes: [{ tag: "mesmerist", level: 1 }] }), ref),
    ).toBe(1);
  });

  it("level 2: still 1 (next gain is 3rd)", () => {
    expect(
      expectedMesmeristTrickCount(makeDoc({ classes: [{ tag: "mesmerist", level: 2 }] }), ref),
    ).toBe(1);
  });

  it("level 3: 2 tricks", () => {
    expect(
      expectedMesmeristTrickCount(makeDoc({ classes: [{ tag: "mesmerist", level: 3 }] }), ref),
    ).toBe(2);
  });

  it("level 19: 10 tricks (all ten thresholds reached)", () => {
    expect(
      expectedMesmeristTrickCount(makeDoc({ classes: [{ tag: "mesmerist", level: 19 }] }), ref),
    ).toBe(10);
  });

  it("level 20: still 10 (no 21st threshold)", () => {
    expect(
      expectedMesmeristTrickCount(makeDoc({ classes: [{ tag: "mesmerist", level: 20 }] }), ref),
    ).toBe(10);
  });

  it("Extra Mesmerist Tricks feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 3 }],
      feats: [idByName("Extra Mesmerist Tricks")],
    });
    expect(expectedMesmeristTrickCount(doc, ref)).toBe(3);
  });

  it("two copies of Extra Mesmerist Tricks each count (stackable feat)", () => {
    const featId = idByName("Extra Mesmerist Tricks");
    const doc = makeDoc({ classes: [{ tag: "mesmerist", level: 3 }], feats: [featId, featId] });
    expect(expectedMesmeristTrickCount(doc, ref)).toBe(4);
  });
});

describe("model/mesmeristTricks: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 3 }],
      mesmeristTricks: ["compelAlacrity", "falseFlanker"],
    });
    expect(chosenMesmeristTrickCount(doc)).toBe(expectedMesmeristTrickCount(doc, ref));
    expect(mesmeristTricksNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 1 }],
      mesmeristTricks: ["compelAlacrity", "falseFlanker"],
    });
    expect(mesmeristTricksNeedWarning(doc, ref)).toBe(true);
  });

  it("empty selection needs no warning", () => {
    expect(mesmeristTricksNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});
