import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  currentMediumSpirit,
  endSeance,
  gainMediumInfluence,
  hasInfluencePenalty,
  isMedium,
  loseMediumInfluence,
  mediumInfluence,
  mediumLevel,
  performSeance,
  setMediumInfluence,
  spiritHasTakenOver,
} from "../src/model/mediumSpirits.js";

function makeDoc(
  classTag = "medium",
  level = 5,
  mediumSpirit?: string,
  mediumInfluence?: number,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [{ tag: classTag, level }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      mediumSpirit,
      mediumInfluence,
    },
  };
}

describe("model/mediumSpirits — level/class helpers", () => {
  it("isMedium/mediumLevel reflect the medium class level", () => {
    expect(isMedium(makeDoc("medium", 7))).toBe(true);
    expect(mediumLevel(makeDoc("medium", 7))).toBe(7);
  });

  it("a non-medium character is not a medium, regardless of stale live fields", () => {
    const doc = makeDoc("rogueUnchained", 7, "guardian", 4);
    expect(isMedium(doc)).toBe(false);
    expect(mediumLevel(doc)).toBe(0);
  });
});

describe("model/mediumSpirits — performSeance / endSeance", () => {
  it("undefined mediumSpirit means no séance performed yet", () => {
    expect(currentMediumSpirit(makeDoc())).toBeUndefined();
  });

  it("performSeance sets the spirit and resets influence to 0", () => {
    const doc = performSeance(makeDoc("medium", 5, "guardian", 4), "trickster");
    expect(currentMediumSpirit(doc)).toBe("trickster");
    expect(mediumInfluence(doc)).toBe(0);
  });

  it("re-performing a séance with the SAME spirit still resets influence (a deliberate 'renew')", () => {
    const doc = performSeance(makeDoc("medium", 5, "guardian", 4), "guardian");
    expect(currentMediumSpirit(doc)).toBe("guardian");
    expect(mediumInfluence(doc)).toBe(0);
  });

  it("endSeance clears both the spirit and influence", () => {
    const doc = endSeance(makeDoc("medium", 5, "champion", 3));
    expect(currentMediumSpirit(doc)).toBeUndefined();
    expect(mediumInfluence(doc)).toBe(0);
  });
});

describe("model/mediumSpirits — influence counter (0-5, clamped)", () => {
  it("defaults to 0 when unset", () => {
    expect(mediumInfluence(makeDoc())).toBe(0);
  });

  it("gainMediumInfluence increments, capped at 5", () => {
    let doc = makeDoc("medium", 5, "guardian", 4);
    doc = gainMediumInfluence(doc);
    expect(mediumInfluence(doc)).toBe(5);
    doc = gainMediumInfluence(doc);
    expect(mediumInfluence(doc)).toBe(5);
  });

  it("loseMediumInfluence decrements, floored at 0", () => {
    let doc = makeDoc("medium", 5, "guardian", 1);
    doc = loseMediumInfluence(doc);
    expect(mediumInfluence(doc)).toBe(0);
    doc = loseMediumInfluence(doc);
    expect(mediumInfluence(doc)).toBe(0);
  });

  it("setMediumInfluence clamps out-of-range and NaN values", () => {
    expect(mediumInfluence(setMediumInfluence(makeDoc(), 9))).toBe(5);
    expect(mediumInfluence(setMediumInfluence(makeDoc(), -3))).toBe(0);
    expect(mediumInfluence(setMediumInfluence(makeDoc(), Number.NaN))).toBe(0);
  });

  it("hasInfluencePenalty is true at 3+, false below", () => {
    expect(hasInfluencePenalty(makeDoc("medium", 5, "guardian", 2))).toBe(false);
    expect(hasInfluencePenalty(makeDoc("medium", 5, "guardian", 3))).toBe(true);
    expect(hasInfluencePenalty(makeDoc("medium", 5, "guardian", 5))).toBe(true);
  });

  it("spiritHasTakenOver is true only at the 5-point ceiling", () => {
    expect(spiritHasTakenOver(makeDoc("medium", 5, "guardian", 4))).toBe(false);
    expect(spiritHasTakenOver(makeDoc("medium", 5, "guardian", 5))).toBe(true);
  });
});
