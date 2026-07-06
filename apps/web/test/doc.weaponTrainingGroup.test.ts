/**
 * Unit tests for the Weapon Training group pick addition to model/doc.ts:
 * `setWeaponTrainingGroup`. Mirrors `doc.oracleMysteryCurse.test.ts`'s
 * pattern for the free-choice-tag setters.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setWeaponTrainingGroup } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setWeaponTrainingGroup()", () => {
  it("sets tier 0 (5th level)", () => {
    expect(setWeaponTrainingGroup(doc(), 0, "bows").build.weaponTrainingGroups).toEqual(["bows"]);
  });

  it("sets a later tier, filling earlier ones with empty placeholders", () => {
    const d = setWeaponTrainingGroup(doc(), 2, "spears");
    expect(d.build.weaponTrainingGroups).toEqual(["", "", "spears"]);
  });

  it("trims surrounding whitespace", () => {
    expect(setWeaponTrainingGroup(doc(), 0, "  bows  ").build.weaponTrainingGroups).toEqual([
      "bows",
    ]);
  });

  it("clearing the only/last tier drops the whole array", () => {
    const withPick = setWeaponTrainingGroup(doc(), 0, "bows");
    expect(setWeaponTrainingGroup(withPick, 0, null).build.weaponTrainingGroups).toBeUndefined();
  });

  it("clearing a middle tier leaves an empty placeholder, not a hole", () => {
    const withTwo = setWeaponTrainingGroup(setWeaponTrainingGroup(doc(), 0, "bows"), 1, "hammers");
    const cleared = setWeaponTrainingGroup(withTwo, 0, null);
    expect(cleared.build.weaponTrainingGroups).toEqual(["", "hammers"]);
  });

  it("clearing a blank/whitespace-only group also counts as clearing", () => {
    const withPick = setWeaponTrainingGroup(doc(), 0, "bows");
    expect(setWeaponTrainingGroup(withPick, 0, "   ").build.weaponTrainingGroups).toBeUndefined();
  });

  it("out-of-range tierIndex is a no-op", () => {
    expect(setWeaponTrainingGroup(doc(), -1, "bows").build.weaponTrainingGroups).toBeUndefined();
    expect(setWeaponTrainingGroup(doc(), 4, "bows").build.weaponTrainingGroups).toBeUndefined();
  });

  it("setting multiple tiers independently accumulates them", () => {
    const d = setWeaponTrainingGroup(
      setWeaponTrainingGroup(setWeaponTrainingGroup(doc(), 0, "bows"), 1, "hammers"),
      2,
      "spears",
    );
    expect(d.build.weaponTrainingGroups).toEqual(["bows", "hammers", "spears"]);
  });

  it("a fresh document has no groups set", () => {
    expect(doc().build.weaponTrainingGroups).toBeUndefined();
  });
});
