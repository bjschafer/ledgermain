/**
 * Unit tests for the firearm pick-time snapshot: `addWeaponFromRef` copies
 * `rangeIncrement`/`misfire`/`capacity`/`firearmEra` off a vendored
 * `WeaponRef` onto the stored `WeaponInstance`, omitting any that are absent
 * (matching the `weight` field's existing optional-when-truthy idiom).
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { addWeaponFromRef, createEmptyDoc } from "../src/model/doc.js";

const ref = loadRefData();

function doc(): CharacterDoc {
  return createEmptyDoc("t");
}

const revolverRef = Object.values(ref.weapons).find((w) => w.name === "Revolver")!;
const longswordRef = Object.values(ref.weapons).find((w) => w.name === "Longsword")!;

describe("addWeaponFromRef() firearm snapshot", () => {
  it("copies rangeIncrement, misfire, capacity, and firearmEra for a firearm", () => {
    const d = addWeaponFromRef(doc(), revolverRef);
    const w = d.build.weapons![0]!;
    expect(w.rangeIncrement).toBe(20);
    expect(w.misfire).toBe(1);
    expect(w.capacity).toBe(6);
    expect(w.firearmEra).toBe("advanced");
  });

  it("carries the firearm group tag through for Gun Training pick matching", () => {
    const d = addWeaponFromRef(doc(), revolverRef);
    const w = d.build.weapons![0]!;
    expect(w.group).toBe("revolver");
    expect(w.weaponGroups).toContain("firearms");
  });

  it("omits all four fields entirely for a non-firearm weapon (melee, no range data)", () => {
    const d = addWeaponFromRef(doc(), longswordRef);
    const w = d.build.weapons![0]!;
    expect(w.rangeIncrement).toBeUndefined();
    expect(w.misfire).toBeUndefined();
    expect(w.capacity).toBeUndefined();
    expect(w.firearmEra).toBeUndefined();
    expect("rangeIncrement" in w).toBe(false);
    expect("misfire" in w).toBe(false);
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addWeaponFromRef(d, revolverRef);
    expect(d.build.weapons).toBeUndefined();
  });
});
