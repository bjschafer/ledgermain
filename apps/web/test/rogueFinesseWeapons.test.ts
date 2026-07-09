/**
 * Unit tests for `model/rogueFinesseWeapons.ts` (issue #65 — previously
 * deferred Rogue (Unchained) Finesse Training). Mirrors
 * `doc.weaponTrainingGroup.test.ts`'s pattern for the free-text tier setter.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  rogueUnchainedLevel,
  setRogueFinesseWeapon,
  unlockedRogueFinesseTiers,
} from "../src/model/rogueFinesseWeapons.js";

function doc() {
  return createEmptyDoc("t");
}

function withRogueUnchained(level: number) {
  const d = doc();
  return { ...d, identity: { ...d.identity, classes: [{ tag: "rogueUnchained", level }] } };
}

describe("setRogueFinesseWeapon()", () => {
  it("sets tier 0 (3rd level)", () => {
    expect(setRogueFinesseWeapon(doc(), 0, "rapier").build.rogueFinesseWeapons).toEqual(["rapier"]);
  });

  it("sets a later tier, filling earlier ones with empty placeholders", () => {
    const d = setRogueFinesseWeapon(doc(), 2, "dagger");
    expect(d.build.rogueFinesseWeapons).toEqual(["", "", "dagger"]);
  });

  it("trims surrounding whitespace", () => {
    expect(setRogueFinesseWeapon(doc(), 0, "  rapier  ").build.rogueFinesseWeapons).toEqual([
      "rapier",
    ]);
  });

  it("clearing the only/last tier drops the whole array", () => {
    const withPick = setRogueFinesseWeapon(doc(), 0, "rapier");
    expect(setRogueFinesseWeapon(withPick, 0, null).build.rogueFinesseWeapons).toBeUndefined();
  });

  it("out-of-range tierIndex is a no-op (only 3 tiers: 0-2)", () => {
    expect(setRogueFinesseWeapon(doc(), -1, "rapier").build.rogueFinesseWeapons).toBeUndefined();
    expect(setRogueFinesseWeapon(doc(), 3, "rapier").build.rogueFinesseWeapons).toBeUndefined();
  });

  it("a fresh document has no picks set", () => {
    expect(doc().build.rogueFinesseWeapons).toBeUndefined();
  });
});

describe("rogueUnchainedLevel() / unlockedRogueFinesseTiers()", () => {
  it("0 for a non-rogueUnchained character", () => {
    expect(rogueUnchainedLevel(doc())).toBe(0);
    expect(unlockedRogueFinesseTiers(doc())).toBe(0);
  });

  it("unlocks tiers at 3rd/11th/19th level", () => {
    expect(unlockedRogueFinesseTiers(withRogueUnchained(2))).toBe(0);
    expect(unlockedRogueFinesseTiers(withRogueUnchained(3))).toBe(1);
    expect(unlockedRogueFinesseTiers(withRogueUnchained(10))).toBe(1);
    expect(unlockedRogueFinesseTiers(withRogueUnchained(11))).toBe(2);
    expect(unlockedRogueFinesseTiers(withRogueUnchained(19))).toBe(3);
    expect(unlockedRogueFinesseTiers(withRogueUnchained(20))).toBe(3);
  });
});
