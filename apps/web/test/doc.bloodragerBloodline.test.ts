/**
 * Unit tests for issue #65's model/doc.ts additions: `setBloodragerBloodline`,
 * `setBloodragerBloodlineVariant`, and `setMartialFlexibilityFeat`. Mirrors
 * `doc.bloodline.test.ts`'s coverage exactly (same shape, sorcerer -> bloodrager).
 */
import { describe, expect, it } from "bun:test";

import {
  createEmptyDoc,
  setBloodragerBloodline,
  setBloodragerBloodlineVariant,
  setMartialFlexibilityFeat,
} from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setBloodragerBloodline()", () => {
  it("sets a bloodline tag", () => {
    expect(setBloodragerBloodline(doc(), "Draconic").build.bloodragerBloodline).toBe("Draconic");
  });

  it("clears the bloodline when passed null", () => {
    const withBloodline = setBloodragerBloodline(doc(), "Draconic");
    expect(setBloodragerBloodline(withBloodline, null).build.bloodragerBloodline).toBeUndefined();
  });

  it("strips a blank/whitespace-only tag to undefined", () => {
    expect(setBloodragerBloodline(doc(), "").build.bloodragerBloodline).toBeUndefined();
    expect(setBloodragerBloodline(doc(), "   ").build.bloodragerBloodline).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid tag", () => {
    expect(setBloodragerBloodline(doc(), "  Draconic  ").build.bloodragerBloodline).toBe(
      "Draconic",
    );
  });

  it("a fresh document has no bloodline set", () => {
    expect(doc().build.bloodragerBloodline).toBeUndefined();
  });

  it("changing the bloodline clears any previously-chosen variant", () => {
    const withVariant = setBloodragerBloodlineVariant(
      setBloodragerBloodline(doc(), "Draconic"),
      "red",
    );
    expect(withVariant.build.bloodragerBloodlineVariant).toBe("red");

    const switched = setBloodragerBloodline(withVariant, "Elemental");
    expect(switched.build.bloodragerBloodlineVariant).toBeUndefined();
    expect(switched.build.bloodragerBloodline).toBe("Elemental");
  });
});

describe("setBloodragerBloodlineVariant()", () => {
  it("sets a variant id", () => {
    const withBloodline = setBloodragerBloodline(doc(), "Draconic");
    expect(
      setBloodragerBloodlineVariant(withBloodline, "red").build.bloodragerBloodlineVariant,
    ).toBe("red");
  });

  it("clears the variant when passed null", () => {
    const withBloodline = setBloodragerBloodline(doc(), "Draconic");
    const withVariant = setBloodragerBloodlineVariant(withBloodline, "red");
    expect(
      setBloodragerBloodlineVariant(withVariant, null).build.bloodragerBloodlineVariant,
    ).toBeUndefined();
  });

  it("a fresh document has no variant set", () => {
    expect(doc().build.bloodragerBloodlineVariant).toBeUndefined();
  });

  it("does not require a bloodline to already be set (soft-warning posture)", () => {
    expect(setBloodragerBloodlineVariant(doc(), "red").build.bloodragerBloodlineVariant).toBe(
      "red",
    );
  });
});

describe("setMartialFlexibilityFeat()", () => {
  it("sets a borrowed feat id", () => {
    expect(setMartialFlexibilityFeat(doc(), "abc123").live.martialFlexibilityFeatId).toBe("abc123");
  });

  it("clears the borrowed feat when passed null", () => {
    const withFeat = setMartialFlexibilityFeat(doc(), "abc123");
    expect(setMartialFlexibilityFeat(withFeat, null).live.martialFlexibilityFeatId).toBeUndefined();
  });

  it("strips a blank/whitespace-only id to undefined", () => {
    expect(setMartialFlexibilityFeat(doc(), "").live.martialFlexibilityFeatId).toBeUndefined();
    expect(setMartialFlexibilityFeat(doc(), "   ").live.martialFlexibilityFeatId).toBeUndefined();
  });

  it("a fresh document has no borrowed feat set", () => {
    expect(doc().live.martialFlexibilityFeatId).toBeUndefined();
  });
});
