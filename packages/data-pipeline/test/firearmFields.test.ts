import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * Firearm/ranged fields (`rangeIncrement`, `misfire`, `capacity`,
 * `firearmEra`) and the pipeline-synthesized `firearmsOneHanded`/
 * `firearmsTwoHanded` weaponGroups tags, asserted against the real vendored
 * `weapons.json` slice.
 */
const ref = loadRefData();

describe("WeaponRef firearm/ranged fields", () => {
  it("Musket: two-handed firearm with range, misfire, capacity, era", () => {
    const musket = ref.weapons["RFfwbr0xWBDWvExu"];
    if (!musket) throw new Error("Musket not found in vendored weapons");
    expect(musket.name).toBe("Musket");
    expect(musket.rangeIncrement).toBe(40);
    expect(musket.misfire).toBe(2);
    expect(musket.capacity).toBe(1);
    expect(musket.firearmEra).toBe("early");
    expect(musket.weaponGroups).toContain("firearms");
    expect(musket.weaponGroups).toContain("firearmsTwoHanded");
    expect(musket.weaponGroups).not.toContain("firearmsOneHanded");
  });

  it("Pistol: one-handed firearm", () => {
    const pistol = ref.weapons["RRh1u2ccgLv1ynu8"];
    if (!pistol) throw new Error("Pistol not found in vendored weapons");
    expect(pistol.name).toBe("Pistol");
    expect(pistol.weaponGroups).toContain("firearmsOneHanded");
    expect(pistol.weaponGroups).not.toContain("firearmsTwoHanded");
    expect(pistol.misfire).toBe(1);
    expect(pistol.capacity).toBe(1);
    expect(pistol.rangeIncrement).toBe(20);
  });

  it("Revolver: advanced-era firearm", () => {
    const revolver = ref.weapons["8swHnPGMoZGkVHjp"];
    if (!revolver) throw new Error("Revolver not found in vendored weapons");
    expect(revolver.name).toBe("Revolver");
    expect(revolver.firearmEra).toBe("advanced");
  });

  it("a bow gets rangeIncrement but no firearm-only fields", () => {
    const longbow = Object.values(ref.weapons).find((w) => w.name === "Longbow");
    if (!longbow) throw new Error("Longbow not found in vendored weapons");
    expect(longbow.rangeIncrement).toBeGreaterThan(0);
    expect(longbow.misfire).toBeUndefined();
    expect(longbow.capacity).toBeUndefined();
    expect(longbow.firearmEra).toBeUndefined();
  });

  it("a melee weapon gets none of the new fields", () => {
    const longsword = Object.values(ref.weapons).find((w) => w.name === "Longsword");
    if (!longsword) throw new Error("Longsword not found in vendored weapons");
    expect(longsword.rangeIncrement).toBeUndefined();
    expect(longsword.misfire).toBeUndefined();
    expect(longsword.capacity).toBeUndefined();
    expect(longsword.firearmEra).toBeUndefined();
  });
});
