import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  barbarianLevel,
  chosenRagePowerCount,
  expectedRagePowerCount,
  hasRagePower,
  ragePowersNeedWarning,
  toggleRagePower,
} from "../src/model/ragePowers.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  ragePowers?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "barbarian", level: 5 }] },
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ragePowers: over.ragePowers,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/ragePowers: toggleRagePower", () => {
  it("adds a power id not yet present", () => {
    const doc = toggleRagePower(makeDoc({}), "animalFury");
    expect(doc.build.ragePowers).toEqual(["animalFury"]);
    expect(hasRagePower(doc, "animalFury")).toBe(true);
  });

  it("adds to an undefined ragePowers array (back-compat docs)", () => {
    const doc = toggleRagePower(makeDoc({ ragePowers: undefined }), "guardedStance");
    expect(doc.build.ragePowers).toEqual(["guardedStance"]);
  });

  it("removes a power id already present", () => {
    const doc = toggleRagePower(
      makeDoc({ ragePowers: ["animalFury", "guardedStance"] }),
      "animalFury",
    );
    expect(doc.build.ragePowers).toEqual(["guardedStance"]);
    expect(hasRagePower(doc, "animalFury")).toBe(false);
  });
});

describe("model/ragePowers: barbarianLevel", () => {
  it("0 for a non-barbarian", () => {
    expect(barbarianLevel(makeDoc({ classes: [{ tag: "fighter", level: 5 }] }))).toBe(0);
  });

  it("chained barbarian's own level", () => {
    expect(barbarianLevel(makeDoc({ classes: [{ tag: "barbarian", level: 7 }] }))).toBe(7);
  });

  it("sums chained + Unchained if a character somehow has both", () => {
    const doc = makeDoc({
      classes: [
        { tag: "barbarian", level: 3 },
        { tag: "barbarianUnchained", level: 4 },
      ],
    });
    expect(barbarianLevel(doc)).toBe(7);
  });
});

describe("model/ragePowers: expectedRagePowerCount", () => {
  it("0 below 2nd level", () => {
    const doc = makeDoc({ classes: [{ tag: "barbarian", level: 1 }] });
    expect(expectedRagePowerCount(doc, ref)).toBe(0);
  });

  it("1 at 2nd level, +1 every 2 levels (5 at 10th, 10 at 20th)", () => {
    expect(
      expectedRagePowerCount(makeDoc({ classes: [{ tag: "barbarian", level: 2 }] }), ref),
    ).toBe(1);
    expect(
      expectedRagePowerCount(makeDoc({ classes: [{ tag: "barbarian", level: 10 }] }), ref),
    ).toBe(5);
    expect(
      expectedRagePowerCount(makeDoc({ classes: [{ tag: "barbarian", level: 20 }] }), ref),
    ).toBe(10);
  });

  it("Unchained barbarian follows the identical cadence", () => {
    const doc = makeDoc({ classes: [{ tag: "barbarianUnchained", level: 10 }] });
    expect(expectedRagePowerCount(doc, ref)).toBe(5);
  });

  it("each copy of Extra Rage Power adds one more", () => {
    const featId = idByName("Extra Rage Power");
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 2 }],
      feats: [featId, featId],
    });
    expect(expectedRagePowerCount(doc, ref)).toBe(3);
  });
});

describe("model/ragePowers: ragePowersNeedWarning", () => {
  it("false when at or under budget", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 2 }],
      ragePowers: ["animalFury"],
    });
    expect(chosenRagePowerCount(doc)).toBe(1);
    expect(ragePowersNeedWarning(doc, ref)).toBe(false);
  });

  it("true when over budget", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 2 }],
      ragePowers: ["animalFury", "guardedStance"],
    });
    expect(ragePowersNeedWarning(doc, ref)).toBe(true);
  });
});
