/**
 * Hand-computed fixtures for the two-weapon penalty table (PF1 CRB p. 202):
 *
 *                              primary   off-hand
 *   normal                       -6        -10
 *   off-hand weapon is light     -4         -8
 *   Two-Weapon Fighting          -4         -4
 *   both                         -2         -2
 */

import { describe, expect, it } from "bun:test";

import { TWF_CHAIN_SLUGS, twoWeaponProfile } from "../src/index.js";

const NONE = new Set<string>();
const chainOwned = (...slugs: string[]) => new Set(slugs);

describe("twoWeaponProfile", () => {
  describe("the penalty table", () => {
    it("no feats, one-handed off-hand: -6 / -10", () => {
      const p = twoWeaponProfile("one-handed", NONE);
      expect(p.primaryPenalty).toBe(-6);
      expect(p.offHandPenalty).toBe(-10);
    });

    it("no feats, light off-hand: -4 / -8", () => {
      const p = twoWeaponProfile("light", NONE);
      expect(p.primaryPenalty).toBe(-4);
      expect(p.offHandPenalty).toBe(-8);
    });

    it("Two-Weapon Fighting, one-handed off-hand: -4 / -4", () => {
      const p = twoWeaponProfile("one-handed", chainOwned("two-weapon-fighting"));
      expect(p.primaryPenalty).toBe(-4);
      expect(p.offHandPenalty).toBe(-4);
    });

    it("Two-Weapon Fighting + light off-hand: -2 / -2", () => {
      const p = twoWeaponProfile("light", chainOwned("two-weapon-fighting"));
      expect(p.primaryPenalty).toBe(-2);
      expect(p.offHandPenalty).toBe(-2);
    });
  });

  describe("the off-hand sequence", () => {
    it("one off-hand attack without any feats", () => {
      expect(twoWeaponProfile("light", NONE).offHandOffsets).toEqual([0]);
    });

    it("Improved adds a second at -5, Greater a third at -10", () => {
      const owned = chainOwned(
        "two-weapon-fighting",
        "improved-two-weapon-fighting",
        "greater-two-weapon-fighting",
      );
      expect(twoWeaponProfile("light", owned).offHandOffsets).toEqual([0, -5, -10]);
    });

    it("Greater without Improved grants nothing extra (prereq gating)", () => {
      const owned = chainOwned("two-weapon-fighting", "greater-two-weapon-fighting");
      expect(twoWeaponProfile("light", owned).offHandOffsets).toEqual([0]);
    });

    it("Improved without the base feat grants nothing extra, and no penalty relief", () => {
      const p = twoWeaponProfile("light", chainOwned("improved-two-weapon-fighting"));
      expect(p.offHandOffsets).toEqual([0]);
      expect(p.primaryPenalty).toBe(-4);
    });
  });

  describe("off-hand damage", () => {
    it("is half ability damage by default", () => {
      expect(twoWeaponProfile("light", NONE).offHandDamageMultiplier).toBe(0.5);
    });

    it("is full ability damage with Double Slice", () => {
      const owned = chainOwned("two-weapon-fighting", "double-slice");
      expect(twoWeaponProfile("light", owned).offHandDamageMultiplier).toBe(1);
    });

    it("Double Slice without the base feat does nothing", () => {
      expect(twoWeaponProfile("light", chainOwned("double-slice")).offHandDamageMultiplier).toBe(
        0.5,
      );
    });
  });

  describe("the annotated chain", () => {
    it("marks what the character owns, and which of those move a number", () => {
      const owned = chainOwned("two-weapon-fighting", "two-weapon-rend");
      const chain = twoWeaponProfile("light", owned).chain;
      const byslug = Object.fromEntries(chain.map((f) => [f.slug, f]));
      expect(byslug["two-weapon-fighting"]).toMatchObject({ owned: true, numeric: true });
      // Rend is a once/round rider — owned, but a reminder rather than a number.
      expect(byslug["two-weapon-rend"]).toMatchObject({ owned: true, numeric: false });
      expect(byslug["double-slice"]).toMatchObject({ owned: false });
    });

    it("an owned feat whose prerequisite is missing is listed but inert", () => {
      const chain = twoWeaponProfile("light", chainOwned("greater-two-weapon-fighting")).chain;
      const greater = chain.find((f) => f.slug === "greater-two-weapon-fighting")!;
      expect(greater).toMatchObject({ owned: true, numeric: false });
    });

    it("TWF_CHAIN_SLUGS covers every chain entry", () => {
      const chain = twoWeaponProfile("light", NONE).chain;
      expect(chain.every((f) => TWF_CHAIN_SLUGS.has(f.slug))).toBe(true);
      expect(TWF_CHAIN_SLUGS.size).toBe(chain.length);
    });
  });
});
