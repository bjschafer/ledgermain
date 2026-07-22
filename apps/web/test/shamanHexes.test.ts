import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenGeneralShamanHexCount,
  chosenShamanHexCount,
  expectedShamanHexCount,
  hasShamanHex,
  shamanHexesNeedWarning,
  shamanLevel,
  toggleShamanHex,
} from "../src/model/shamanHexes.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  shamanSpirit?: string;
  shamanHexes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "shaman", level: 7 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      shamanSpirit: over.shamanSpirit,
      shamanHexes: over.shamanHexes,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/shamanHexes: toggleShamanHex", () => {
  it("adds a hex id not yet present", () => {
    const doc = toggleShamanHex(makeDoc({}), "life:channel");
    expect(doc.build.shamanHexes).toEqual(["life:channel"]);
    expect(hasShamanHex(doc, "life:channel")).toBe(true);
  });

  it("adds to an undefined shamanHexes array (back-compat docs)", () => {
    const doc = toggleShamanHex(makeDoc({ shamanHexes: undefined }), "life:lifeSight");
    expect(doc.build.shamanHexes).toEqual(["life:lifeSight"]);
  });

  it("removes a hex id already present", () => {
    const doc = toggleShamanHex(
      makeDoc({ shamanHexes: ["life:lifeSight", "life:lifeLink"] }),
      "life:lifeSight",
    );
    expect(doc.build.shamanHexes).toEqual(["life:lifeLink"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "shaman", level: 2 }],
      shamanSpirit: "life",
      shamanHexes: ["life:lifeSight"],
    });
    const withExtra = toggleShamanHex(doc, "life:lifeLink");
    expect(withExtra.build.shamanHexes).toEqual(["life:lifeSight", "life:lifeLink"]);
  });
});

describe("model/shamanHexes: shamanLevel", () => {
  it("returns the shaman class level", () => {
    expect(shamanLevel(makeDoc({ classes: [{ tag: "shaman", level: 11 }] }))).toBe(11);
  });

  it("returns 0 for a non-shaman", () => {
    expect(shamanLevel(makeDoc({ classes: [{ tag: "fighter", level: 11 }] }))).toBe(0);
  });
});

describe("model/shamanHexes: chosenShamanHexCount (per-spirit scoping)", () => {
  it("0 with no spirit chosen, even with hex ids present", () => {
    const doc = makeDoc({ shamanHexes: ["life:lifeSight"] });
    expect(chosenShamanHexCount(doc)).toBe(0);
  });

  it("counts only ids matching the current spirit", () => {
    const doc = makeDoc({
      shamanSpirit: "life",
      shamanHexes: ["life:lifeSight", "life:lifeLink", "battle:battleMaster"],
    });
    expect(chosenShamanHexCount(doc)).toBe(2);
  });
});

describe("model/shamanHexes: expectedShamanHexCount (ACG progression)", () => {
  it("0 for a non-shaman", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 10 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(0);
  });

  it("level 1: 0 hexes (first gain is 2nd)", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 1 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(0);
  });

  it("level 2: 1 hex", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 2 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(1);
  });

  it("level 3: still 1 (next gain is 4th)", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 3 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(1);
  });

  it("level 4: 2 hexes", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 4 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(2);
  });

  it("level 7: still 2 (next gain is 8th)", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 7 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(2);
  });

  it("level 8: 3 hexes", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 8 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(3);
  });

  it("level 20: 8 hexes (all eight thresholds reached)", () => {
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 20 }] });
    expect(expectedShamanHexCount(doc, ref)).toBe(8);
  });

  it("Extra Hex feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "shaman", level: 4 }],
      feats: [idByName("Extra Hex")],
    });
    expect(expectedShamanHexCount(doc, ref)).toBe(3);
  });

  it("two copies of Extra Hex each count (stackable feat)", () => {
    const featId = idByName("Extra Hex");
    const doc = makeDoc({ classes: [{ tag: "shaman", level: 4 }], feats: [featId, featId] });
    expect(expectedShamanHexCount(doc, ref)).toBe(4);
  });
});

describe("model/shamanHexes: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "shaman", level: 4 }],
      shamanSpirit: "life",
      shamanHexes: ["life:lifeSight", "life:lifeLink"],
    });
    expect(chosenShamanHexCount(doc)).toBe(expectedShamanHexCount(doc, ref));
    expect(shamanHexesNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "shaman", level: 2 }],
      shamanSpirit: "life",
      shamanHexes: ["life:lifeSight", "life:lifeLink"],
    });
    expect(shamanHexesNeedWarning(doc, ref)).toBe(true);
  });

  it("under the expected count needs no warning (never blocks under-selection either)", () => {
    const doc = makeDoc({
      classes: [{ tag: "shaman", level: 8 }],
      shamanSpirit: "life",
      shamanHexes: ["life:lifeSight"],
    });
    expect(shamanHexesNeedWarning(doc, ref)).toBe(false);
  });

  it("empty selection needs no warning", () => {
    expect(shamanHexesNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});

describe("model/shamanHexes: chosenGeneralShamanHexCount (issue #74 Phase 3b vendored catalog)", () => {
  it("counts a picked id from the vendored general-hex catalog, regardless of spirit", () => {
    const doc = makeDoc({ shamanSpirit: "life", shamanHexes: ["fury"] });
    expect(chosenGeneralShamanHexCount(doc, ref)).toBe(1);
    // Not counted by the spirit-scoped counter (it isn't a spirit hex id).
    expect(chosenShamanHexCount(doc)).toBe(0);
  });

  it("does not double-count a spirit-scoped id", () => {
    const doc = makeDoc({ shamanSpirit: "life", shamanHexes: ["life:lifeSight"] });
    expect(chosenGeneralShamanHexCount(doc, ref)).toBe(0);
    expect(chosenShamanHexCount(doc)).toBe(1);
  });

  it("a general-hex pick counts toward the total budget warning, same as a spirit hex", () => {
    const doc = makeDoc({
      classes: [{ tag: "shaman", level: 2 }],
      shamanSpirit: "life",
      shamanHexes: ["life:lifeSight", "fury"],
    });
    expect(shamanHexesNeedWarning(doc, ref)).toBe(true);
  });
});
