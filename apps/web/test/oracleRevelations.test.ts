import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenOracleRevelationCount,
  expectedOracleRevelationCount,
  hasOracleRevelation,
  oracleLevel,
  oracleRevelationChoice,
  oracleRevelationsNeedWarning,
  setOracleRevelationChoice,
  toggleOracleRevelation,
} from "../src/model/oracleRevelations.js";
import { oracleMysteryChoice, setOracleMystery, setOracleMysteryChoice } from "../src/model/doc.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  oracleMystery?: string;
  oracleRevelations?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "oracle", level: 7 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      oracleMystery: over.oracleMystery,
      oracleRevelations: over.oracleRevelations,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/oracleRevelations: toggleOracleRevelation", () => {
  it("adds a revelation id not yet present", () => {
    const doc = toggleOracleRevelation(makeDoc({}), "life:channel");
    expect(doc.build.oracleRevelations).toEqual(["life:channel"]);
    expect(hasOracleRevelation(doc, "life:channel")).toBe(true);
  });

  it("adds to an undefined oracleRevelations array (back-compat docs)", () => {
    const doc = toggleOracleRevelation(makeDoc({ oracleRevelations: undefined }), "life:channel");
    expect(doc.build.oracleRevelations).toEqual(["life:channel"]);
  });

  it("removes a revelation id already present", () => {
    const doc = toggleOracleRevelation(
      makeDoc({ oracleRevelations: ["life:channel", "life:combatHealer"] }),
      "life:channel",
    );
    expect(doc.build.oracleRevelations).toEqual(["life:combatHealer"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 1 }],
      oracleMystery: "life",
      oracleRevelations: ["life:channel"],
    });
    const withExtra = toggleOracleRevelation(doc, "life:combatHealer");
    expect(withExtra.build.oracleRevelations).toEqual(["life:channel", "life:combatHealer"]);
  });
});

describe("model/oracleRevelations: choose-one selections (build.pickChoices)", () => {
  it("setOracleRevelationChoice stores the pick under the oracleRevelation:<id> key", () => {
    const doc = setOracleRevelationChoice(
      makeDoc({ oracleRevelations: ["apocalypse:defyElements"] }),
      "apocalypse:defyElements",
      "sonic",
    );
    expect(doc.build.pickChoices).toEqual({ "oracleRevelation:apocalypse:defyElements": "sonic" });
    expect(oracleRevelationChoice(doc, "apocalypse:defyElements")).toBe("sonic");
  });

  it("setOracleRevelationChoice with undefined clears the stored pick", () => {
    let doc = setOracleRevelationChoice(makeDoc({}), "elemental:elementalAegis", "earth");
    doc = setOracleRevelationChoice(doc, "elemental:elementalAegis", undefined);
    expect(doc.build.pickChoices).toEqual({});
    expect(oracleRevelationChoice(doc, "elemental:elementalAegis")).toBeUndefined();
  });

  it("setOracleRevelationChoice is a no-op (same object) when the value is unchanged", () => {
    const doc = setOracleRevelationChoice(makeDoc({}), "apocalypse:defyElements", "acid");
    expect(setOracleRevelationChoice(doc, "apocalypse:defyElements", "acid")).toBe(doc);
    expect(setOracleRevelationChoice(makeDoc({}), "apocalypse:defyElements", undefined)).toEqual(
      makeDoc({}),
    );
  });

  it("removing a declaring revelation drops its stored choice (no ghost pick on re-add)", () => {
    let doc = makeDoc({ oracleRevelations: ["apocalypse:defyElements"] });
    doc = setOracleRevelationChoice(doc, "apocalypse:defyElements", "cold");
    doc = toggleOracleRevelation(doc, "apocalypse:defyElements");
    expect(doc.build.oracleRevelations).toEqual([]);
    expect(doc.build.pickChoices).toEqual({});
  });

  it("removing a revelation leaves other stored choices (and the mystery-level pick) alone", () => {
    let doc = makeDoc({
      oracleMystery: "dragon",
      oracleRevelations: ["dragon:draconicResistance", "apocalypse:defyElements"],
    });
    doc = setOracleMysteryChoice(doc, "dragon", "fire");
    doc = setOracleRevelationChoice(doc, "apocalypse:defyElements", "cold");
    // Removing Draconic Resistance (a choiceFromMystery reader that stores
    // nothing of its own) must not disturb either stored pick.
    doc = toggleOracleRevelation(doc, "dragon:draconicResistance");
    expect(doc.build.pickChoices).toEqual({
      "oracleMystery:dragon": "fire",
      "oracleRevelation:apocalypse:defyElements": "cold",
    });
  });
});

describe("model/doc: mystery-level choose-one (oracleMystery:<tag>)", () => {
  it("setOracleMysteryChoice stores and clears the mystery-level pick", () => {
    let doc = setOracleMysteryChoice(makeDoc({ oracleMystery: "dragon" }), "dragon", "acid");
    expect(doc.build.pickChoices).toEqual({ "oracleMystery:dragon": "acid" });
    expect(oracleMysteryChoice(doc, "dragon")).toBe("acid");
    doc = setOracleMysteryChoice(doc, "dragon", undefined);
    expect(doc.build.pickChoices).toEqual({});
  });

  it("changing away from a mystery drops its stored pick (no ghost element)", () => {
    let doc = setOracleMysteryChoice(makeDoc({ oracleMystery: "dragon" }), "dragon", "fire");
    doc = setOracleMystery(doc, "life");
    expect(doc.build.oracleMystery).toBe("life");
    expect(doc.build.pickChoices).toEqual({});
  });

  it("clearing the mystery drops its stored pick too, but re-setting the SAME mystery keeps it", () => {
    let doc = setOracleMysteryChoice(makeDoc({ oracleMystery: "dragon" }), "dragon", "fire");
    const sameAgain = setOracleMystery(doc, "dragon");
    expect(sameAgain.build.pickChoices).toEqual({ "oracleMystery:dragon": "fire" });
    doc = setOracleMystery(doc, null);
    expect(doc.build.oracleMystery).toBeUndefined();
    expect(doc.build.pickChoices).toEqual({});
  });
});

describe("model/oracleRevelations: oracleLevel", () => {
  it("returns the oracle class level", () => {
    expect(oracleLevel(makeDoc({ classes: [{ tag: "oracle", level: 11 }] }))).toBe(11);
  });

  it("returns 0 for a non-oracle", () => {
    expect(oracleLevel(makeDoc({ classes: [{ tag: "fighter", level: 11 }] }))).toBe(0);
  });
});

describe("model/oracleRevelations: chosenOracleRevelationCount (per-mystery scoping)", () => {
  it("0 with no mystery chosen, even with revelation ids present", () => {
    const doc = makeDoc({ oracleRevelations: ["life:channel"] });
    expect(chosenOracleRevelationCount(doc)).toBe(0);
  });

  it("counts only ids matching the current mystery", () => {
    const doc = makeDoc({
      oracleMystery: "life",
      oracleRevelations: ["life:channel", "life:combatHealer", "battle:battlecry"],
    });
    expect(chosenOracleRevelationCount(doc)).toBe(2);
  });
});

describe("model/oracleRevelations: expectedOracleRevelationCount (APG progression)", () => {
  it("0 for a non-oracle", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 10 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(0);
  });

  it("level 1: 1 revelation (gained at 1st)", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 1 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(1);
  });

  it("level 2: still 1 (next gain is 3rd)", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 2 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(1);
  });

  it("level 3: 2 revelations", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 3 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(2);
  });

  it("level 6: still 2 (next gain is 7th)", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 6 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(2);
  });

  it("level 7: 3 revelations", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 7 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(3);
  });

  it("level 11: 4 revelations", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 11 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(4);
  });

  it("level 19: 6 revelations (all six thresholds reached)", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 19 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(6);
  });

  it("level 20: still 6 (the Final Revelation isn't one of the budgeted six)", () => {
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 20 }] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(6);
  });

  it("Extra Revelation feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 7 }],
      feats: [idByName("Extra Revelation")],
    });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(4);
  });

  it("two copies of Extra Revelation each count (stackable feat)", () => {
    const featId = idByName("Extra Revelation");
    const doc = makeDoc({ classes: [{ tag: "oracle", level: 7 }], feats: [featId, featId] });
    expect(expectedOracleRevelationCount(doc, ref)).toBe(5);
  });
});

describe("model/oracleRevelations: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 7 }],
      oracleMystery: "life",
      oracleRevelations: ["life:channel", "life:combatHealer", "life:healingHands"],
    });
    expect(chosenOracleRevelationCount(doc)).toBe(expectedOracleRevelationCount(doc, ref));
    expect(oracleRevelationsNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 1 }],
      oracleMystery: "life",
      oracleRevelations: ["life:channel", "life:combatHealer"],
    });
    expect(oracleRevelationsNeedWarning(doc, ref)).toBe(true);
  });

  it("under the expected count needs no warning (never blocks under-selection either)", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 7 }],
      oracleMystery: "life",
      oracleRevelations: ["life:channel"],
    });
    expect(oracleRevelationsNeedWarning(doc, ref)).toBe(false);
  });

  it("empty selection needs no warning", () => {
    expect(oracleRevelationsNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});
