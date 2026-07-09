import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  antipaladinCrueltiesNeedWarning,
  antipaladinLevel,
  chosenAntipaladinCrueltyCount,
  expectedAntipaladinCrueltyCount,
  hasAntipaladinCruelty,
  toggleAntipaladinCruelty,
} from "../src/model/antipaladinCruelties.js";

const ref = loadRefData();

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  antipaladinCruelties?: string[];
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
      classes: over.classes ?? [{ tag: "antipaladin", level: 6 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      antipaladinCruelties: over.antipaladinCruelties,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/antipaladinCruelties: toggleAntipaladinCruelty", () => {
  it("adds a cruelty id not yet present", () => {
    const doc = toggleAntipaladinCruelty(makeDoc({}), "fatigued");
    expect(doc.build.antipaladinCruelties).toEqual(["fatigued"]);
    expect(hasAntipaladinCruelty(doc, "fatigued")).toBe(true);
  });

  it("adds to an undefined antipaladinCruelties array (back-compat docs)", () => {
    const doc = toggleAntipaladinCruelty(makeDoc({ antipaladinCruelties: undefined }), "fatigued");
    expect(doc.build.antipaladinCruelties).toEqual(["fatigued"]);
  });

  it("removes a cruelty id already present", () => {
    const doc = toggleAntipaladinCruelty(
      makeDoc({ antipaladinCruelties: ["fatigued", "shaken"] }),
      "fatigued",
    );
    expect(doc.build.antipaladinCruelties).toEqual(["shaken"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "antipaladin", level: 3 }],
      antipaladinCruelties: ["fatigued"],
    });
    const withExtra = toggleAntipaladinCruelty(doc, "shaken");
    expect(withExtra.build.antipaladinCruelties).toEqual(["fatigued", "shaken"]);
  });
});

describe("model/antipaladinCruelties: antipaladinLevel", () => {
  it("returns the antipaladin class level", () => {
    expect(antipaladinLevel(makeDoc({ classes: [{ tag: "antipaladin", level: 9 }] }))).toBe(9);
  });

  it("returns 0 for a non-antipaladin", () => {
    expect(antipaladinLevel(makeDoc({ classes: [{ tag: "fighter", level: 9 }] }))).toBe(0);
  });
});

describe("model/antipaladinCruelties: expectedAntipaladinCrueltyCount (APG progression)", () => {
  it("0 for a non-antipaladin", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "fighter", level: 10 }] })),
    ).toBe(0);
  });

  it("level 1-2: 0 (first cruelty is 3rd level)", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "antipaladin", level: 2 }] })),
    ).toBe(0);
  });

  it("level 3: 1 cruelty", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "antipaladin", level: 3 }] })),
    ).toBe(1);
  });

  it("level 5: still 1 (next gain is 6th)", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "antipaladin", level: 5 }] })),
    ).toBe(1);
  });

  it("level 6: 2 cruelties", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "antipaladin", level: 6 }] })),
    ).toBe(2);
  });

  it("level 18: 6 cruelties (all six thresholds reached)", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "antipaladin", level: 18 }] })),
    ).toBe(6);
  });

  it("level 20: still 6 (no further cruelty gains beyond 18th)", () => {
    expect(
      expectedAntipaladinCrueltyCount(makeDoc({ classes: [{ tag: "antipaladin", level: 20 }] })),
    ).toBe(6);
  });
});

describe("model/antipaladinCruelties: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "antipaladin", level: 6 }],
      antipaladinCruelties: ["fatigued", "shaken"],
    });
    expect(chosenAntipaladinCrueltyCount(doc)).toBe(expectedAntipaladinCrueltyCount(doc));
    expect(antipaladinCrueltiesNeedWarning(doc)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "antipaladin", level: 3 }],
      antipaladinCruelties: ["fatigued", "shaken"],
    });
    expect(antipaladinCrueltiesNeedWarning(doc)).toBe(true);
  });

  it("empty selection needs no warning", () => {
    expect(antipaladinCrueltiesNeedWarning(makeDoc({}))).toBe(false);
  });
});

describe("model/antipaladinCruelties: no 'Extra Cruelty' feat exists (sanity check against vendored data)", () => {
  it("no feat named 'Extra Cruelty' in the vendored slice", () => {
    const hit = Object.values(ref.feats).find((f) => f.name === "Extra Cruelty");
    expect(hit).toBeUndefined();
  });
});
