import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenPsychicAmplificationCount,
  expectedPsychicAmplificationCount,
  hasPsychicAmplification,
  psychicAmplificationsNeedWarning,
  psychicLevel,
  togglePsychicAmplification,
} from "../src/model/psychicAmplifications.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  psychicAmplifications?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "psychic", level: 4 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      psychicAmplifications: over.psychicAmplifications,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/psychicAmplifications: togglePsychicAmplification", () => {
  it("adds an amplification id not yet present", () => {
    const doc = togglePsychicAmplification(makeDoc({}), "biokineticHealing");
    expect(doc.build.psychicAmplifications).toEqual(["biokineticHealing"]);
    expect(hasPsychicAmplification(doc, "biokineticHealing")).toBe(true);
  });

  it("adds to an undefined psychicAmplifications array (back-compat docs)", () => {
    const doc = togglePsychicAmplification(
      makeDoc({ psychicAmplifications: undefined }),
      "biokineticHealing",
    );
    expect(doc.build.psychicAmplifications).toEqual(["biokineticHealing"]);
  });

  it("removes an amplification id already present", () => {
    const doc = togglePsychicAmplification(
      makeDoc({ psychicAmplifications: ["biokineticHealing", "focusedForce"] }),
      "biokineticHealing",
    );
    expect(doc.build.psychicAmplifications).toEqual(["focusedForce"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      psychicAmplifications: ["biokineticHealing"],
    });
    const withExtra = togglePsychicAmplification(doc, "focusedForce");
    expect(withExtra.build.psychicAmplifications).toEqual(["biokineticHealing", "focusedForce"]);
  });
});

describe("model/psychicAmplifications: psychicLevel", () => {
  it("returns the psychic class level", () => {
    expect(psychicLevel(makeDoc({ classes: [{ tag: "psychic", level: 12 }] }))).toBe(12);
  });

  it("returns 0 for a non-psychic", () => {
    expect(psychicLevel(makeDoc({ classes: [{ tag: "fighter", level: 12 }] }))).toBe(0);
  });
});

describe("model/psychicAmplifications: expectedPsychicAmplificationCount (OA progression)", () => {
  it("0 for a non-psychic", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "fighter", level: 10 }] }), ref),
    ).toBe(0);
  });

  it("level 1: 1 amplification (first is 1st level)", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "psychic", level: 1 }] }), ref),
    ).toBe(1);
  });

  it("level 2: still 1 (next gain is 3rd)", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "psychic", level: 2 }] }), ref),
    ).toBe(1);
  });

  it("level 19: 6 amplifications (all six thresholds reached)", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "psychic", level: 19 }] }), ref),
    ).toBe(6);
  });

  it("Extra Amplification feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      feats: [idByName("Extra Amplification")],
    });
    expect(expectedPsychicAmplificationCount(doc, ref)).toBe(2);
  });

  it("two copies of Extra Amplification each count (stackable feat)", () => {
    const featId = idByName("Extra Amplification");
    const doc = makeDoc({ classes: [{ tag: "psychic", level: 1 }], feats: [featId, featId] });
    expect(expectedPsychicAmplificationCount(doc, ref)).toBe(3);
  });
});

describe("model/psychicAmplifications: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      psychicAmplifications: ["biokineticHealing"],
    });
    expect(chosenPsychicAmplificationCount(doc)).toBe(expectedPsychicAmplificationCount(doc, ref));
    expect(psychicAmplificationsNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      psychicAmplifications: ["biokineticHealing", "focusedForce"],
    });
    expect(psychicAmplificationsNeedWarning(doc, ref)).toBe(true);
  });

  it("empty selection needs no warning", () => {
    expect(psychicAmplificationsNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});
