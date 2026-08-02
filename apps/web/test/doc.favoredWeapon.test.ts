/**
 * Unit tests for the deity's-favored-weapon choice in model/doc.ts:
 * `setDeityFavoredWeapon` and the `favoredWeaponOptions` picker list.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc, favoredWeaponOptions, setDeityFavoredWeapon } from "../src/model/doc.js";

const ref = loadRefData();

function doc() {
  return createEmptyDoc("t");
}

describe("setDeityFavoredWeapon()", () => {
  it("sets a weapon slug", () => {
    expect(setDeityFavoredWeapon(doc(), "longsword").build.deityFavoredWeapon).toBe("longsword");
  });

  it("clears the pick when passed null or a blank string", () => {
    const picked = setDeityFavoredWeapon(doc(), "longsword");
    expect(setDeityFavoredWeapon(picked, null).build.deityFavoredWeapon).toBeUndefined();
    expect(setDeityFavoredWeapon(picked, "  ").build.deityFavoredWeapon).toBeUndefined();
  });

  it("trims surrounding whitespace", () => {
    expect(setDeityFavoredWeapon(doc(), " rapier ").build.deityFavoredWeapon).toBe("rapier");
  });

  it("replaces a previous pick (single choice, not additive)", () => {
    let d = setDeityFavoredWeapon(doc(), "longsword");
    d = setDeityFavoredWeapon(d, "warhammer");
    expect(d.build.deityFavoredWeapon).toBe("warhammer");
  });

  it("a fresh document has no favored weapon set", () => {
    expect(doc().build.deityFavoredWeapon).toBeUndefined();
  });
});

describe("favoredWeaponOptions()", () => {
  const options = favoredWeaponOptions(ref);

  it("offers exactly one entry per weapon group slug", () => {
    expect(options.length).toBeGreaterThan(300);
    expect(new Set(options.map((o) => o.slug)).size).toBe(options.length);
  });

  it("labels a slug by its canonical base type, not each variant's name", () => {
    // Longbow, Composite Longbow and Horse Bow all group as "longbow" — one
    // pick covers all three, so it reads as the base type.
    const longbows = options.filter((o) => o.slug === "longbow");
    expect(longbows).toEqual([{ slug: "longbow", label: "Longbow", proficiency: "martial" }]);
  });

  it("carries the proficiency category the picker groups by", () => {
    expect(new Set(options.map((o) => o.proficiency))).toEqual(
      new Set(["simple", "martial", "exotic"]),
    );
  });
});
