/**
 * Unit tests for `model/rogueSkillUnlocks.ts` (issue #65 — previously
 * deferred Rogue's Edge (UC) skill unlocks). Mirrors
 * `doc.weaponTrainingGroup.test.ts`'s pattern for the tier setter.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  rogueUnchainedLevel,
  setRogueSkillUnlock,
  unlockedRogueSkillUnlockTiers,
} from "../src/model/rogueSkillUnlocks.js";

function doc() {
  return createEmptyDoc("t");
}

function withRogueUnchained(level: number) {
  const d = doc();
  return { ...d, identity: { ...d.identity, classes: [{ tag: "rogueUnchained", level }] } };
}

describe("setRogueSkillUnlock()", () => {
  it("sets tier 0 (5th level)", () => {
    expect(setRogueSkillUnlock(doc(), 0, "stl").build.rogueSkillUnlocks).toEqual(["stl"]);
  });

  it("sets a later tier, filling earlier ones with empty placeholders", () => {
    const d = setRogueSkillUnlock(doc(), 3, "acr");
    expect(d.build.rogueSkillUnlocks).toEqual(["", "", "", "acr"]);
  });

  it("clearing the only/last tier drops the whole array", () => {
    const withPick = setRogueSkillUnlock(doc(), 0, "stl");
    expect(setRogueSkillUnlock(withPick, 0, null).build.rogueSkillUnlocks).toBeUndefined();
  });

  it("out-of-range tierIndex is a no-op (only 4 tiers: 0-3)", () => {
    expect(setRogueSkillUnlock(doc(), -1, "stl").build.rogueSkillUnlocks).toBeUndefined();
    expect(setRogueSkillUnlock(doc(), 4, "stl").build.rogueSkillUnlocks).toBeUndefined();
  });

  it("a fresh document has no picks set", () => {
    expect(doc().build.rogueSkillUnlocks).toBeUndefined();
  });
});

describe("unlockedRogueSkillUnlockTiers()", () => {
  it("0 for a non-rogueUnchained character", () => {
    expect(rogueUnchainedLevel(doc())).toBe(0);
    expect(unlockedRogueSkillUnlockTiers(doc())).toBe(0);
  });

  it("unlocks tiers at 5th/10th/15th/20th level", () => {
    expect(unlockedRogueSkillUnlockTiers(withRogueUnchained(4))).toBe(0);
    expect(unlockedRogueSkillUnlockTiers(withRogueUnchained(5))).toBe(1);
    expect(unlockedRogueSkillUnlockTiers(withRogueUnchained(10))).toBe(2);
    expect(unlockedRogueSkillUnlockTiers(withRogueUnchained(15))).toBe(3);
    expect(unlockedRogueSkillUnlockTiers(withRogueUnchained(20))).toBe(4);
  });
});
