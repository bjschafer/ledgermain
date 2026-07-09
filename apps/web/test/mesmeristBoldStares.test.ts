import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  chosenMesmeristBoldStareCount,
  expectedMesmeristBoldStareCount,
  hasMesmeristBoldStare,
  mesmeristBoldStaresNeedWarning,
  mesmeristLevel,
  toggleMesmeristBoldStare,
} from "../src/model/mesmeristBoldStares.js";

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  mesmeristBoldStares?: string[];
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
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      mesmeristBoldStares: over.mesmeristBoldStares,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/mesmeristBoldStares: toggleMesmeristBoldStare", () => {
  it("adds a stare id not yet present", () => {
    const doc = toggleMesmeristBoldStare(makeDoc({}), "disorientation");
    expect(doc.build.mesmeristBoldStares).toEqual(["disorientation"]);
    expect(hasMesmeristBoldStare(doc, "disorientation")).toBe(true);
  });

  it("adds to an undefined mesmeristBoldStares array (back-compat docs)", () => {
    const doc = toggleMesmeristBoldStare(
      makeDoc({ mesmeristBoldStares: undefined }),
      "disorientation",
    );
    expect(doc.build.mesmeristBoldStares).toEqual(["disorientation"]);
  });

  it("removes a stare id already present", () => {
    const doc = toggleMesmeristBoldStare(
      makeDoc({ mesmeristBoldStares: ["disorientation", "timidity"] }),
      "disorientation",
    );
    expect(doc.build.mesmeristBoldStares).toEqual(["timidity"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 3 }],
      mesmeristBoldStares: ["disorientation"],
    });
    const withExtra = toggleMesmeristBoldStare(doc, "timidity");
    expect(withExtra.build.mesmeristBoldStares).toEqual(["disorientation", "timidity"]);
  });
});

describe("model/mesmeristBoldStares: mesmeristLevel", () => {
  it("returns the mesmerist class level", () => {
    expect(mesmeristLevel(makeDoc({ classes: [{ tag: "mesmerist", level: 12 }] }))).toBe(12);
  });

  it("returns 0 for a non-mesmerist", () => {
    expect(mesmeristLevel(makeDoc({ classes: [{ tag: "fighter", level: 12 }] }))).toBe(0);
  });
});

describe("model/mesmeristBoldStares: expectedMesmeristBoldStareCount (OA progression)", () => {
  it("0 for a non-mesmerist", () => {
    expect(
      expectedMesmeristBoldStareCount(makeDoc({ classes: [{ tag: "fighter", level: 10 }] })),
    ).toBe(0);
  });

  it("level 1-2: 0 (first bold stare is 3rd level)", () => {
    expect(
      expectedMesmeristBoldStareCount(makeDoc({ classes: [{ tag: "mesmerist", level: 2 }] })),
    ).toBe(0);
  });

  it("level 3: 1 bold stare", () => {
    expect(
      expectedMesmeristBoldStareCount(makeDoc({ classes: [{ tag: "mesmerist", level: 3 }] })),
    ).toBe(1);
  });

  it("level 6: still 1 (next gain is 7th)", () => {
    expect(
      expectedMesmeristBoldStareCount(makeDoc({ classes: [{ tag: "mesmerist", level: 6 }] })),
    ).toBe(1);
  });

  it("level 19: 5 bold stares (all five thresholds reached)", () => {
    expect(
      expectedMesmeristBoldStareCount(makeDoc({ classes: [{ tag: "mesmerist", level: 19 }] })),
    ).toBe(5);
  });
});

describe("model/mesmeristBoldStares: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 3 }],
      mesmeristBoldStares: ["disorientation"],
    });
    expect(chosenMesmeristBoldStareCount(doc)).toBe(expectedMesmeristBoldStareCount(doc));
    expect(mesmeristBoldStaresNeedWarning(doc)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "mesmerist", level: 1 }],
      mesmeristBoldStares: ["disorientation"],
    });
    expect(mesmeristBoldStaresNeedWarning(doc)).toBe(true);
  });

  it("empty selection needs no warning", () => {
    expect(mesmeristBoldStaresNeedWarning(makeDoc({}))).toBe(false);
  });
});
