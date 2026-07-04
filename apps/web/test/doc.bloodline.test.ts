/**
 * Unit tests for Stage 1 (sorcerer bloodline spells) additions to model/doc.ts:
 * `setSorcererBloodline`, plus issue #34's `setSorcererBloodlineVariant`
 * (Draconic dragon type / Elemental element pick).
 */
import { describe, expect, it } from "bun:test";

import {
  createEmptyDoc,
  setSorcererBloodline,
  setSorcererBloodlineVariant,
} from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setSorcererBloodline()", () => {
  it("sets a bloodline tag", () => {
    expect(setSorcererBloodline(doc(), "Draconic").build.sorcererBloodline).toBe("Draconic");
  });

  it("clears the bloodline when passed null", () => {
    const withBloodline = setSorcererBloodline(doc(), "Draconic");
    expect(setSorcererBloodline(withBloodline, null).build.sorcererBloodline).toBeUndefined();
  });

  it("strips a blank/whitespace-only tag to undefined", () => {
    expect(setSorcererBloodline(doc(), "").build.sorcererBloodline).toBeUndefined();
    expect(setSorcererBloodline(doc(), "   ").build.sorcererBloodline).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid tag", () => {
    expect(setSorcererBloodline(doc(), "  Draconic  ").build.sorcererBloodline).toBe("Draconic");
  });

  it("a fresh document has no bloodline set", () => {
    expect(doc().build.sorcererBloodline).toBeUndefined();
  });

  it("changing the bloodline clears any previously-chosen variant", () => {
    const withVariant = setSorcererBloodlineVariant(setSorcererBloodline(doc(), "Draconic"), "red");
    expect(withVariant.build.sorcererBloodlineVariant).toBe("red");

    const switched = setSorcererBloodline(withVariant, "Elemental");
    expect(switched.build.sorcererBloodlineVariant).toBeUndefined();
    expect(switched.build.sorcererBloodline).toBe("Elemental");
  });
});

describe("setSorcererBloodlineVariant()", () => {
  it("sets a variant id", () => {
    const withBloodline = setSorcererBloodline(doc(), "Draconic");
    expect(setSorcererBloodlineVariant(withBloodline, "red").build.sorcererBloodlineVariant).toBe(
      "red",
    );
  });

  it("clears the variant when passed null", () => {
    const withBloodline = setSorcererBloodline(doc(), "Draconic");
    const withVariant = setSorcererBloodlineVariant(withBloodline, "red");
    expect(
      setSorcererBloodlineVariant(withVariant, null).build.sorcererBloodlineVariant,
    ).toBeUndefined();
  });

  it("strips a blank/whitespace-only variant to undefined", () => {
    expect(setSorcererBloodlineVariant(doc(), "").build.sorcererBloodlineVariant).toBeUndefined();
    expect(
      setSorcererBloodlineVariant(doc(), "   ").build.sorcererBloodlineVariant,
    ).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid variant id", () => {
    expect(setSorcererBloodlineVariant(doc(), "  red  ").build.sorcererBloodlineVariant).toBe(
      "red",
    );
  });

  it("a fresh document has no variant set", () => {
    expect(doc().build.sorcererBloodlineVariant).toBeUndefined();
  });

  it("does not require a bloodline to already be set (soft-warning posture)", () => {
    expect(setSorcererBloodlineVariant(doc(), "red").build.sorcererBloodlineVariant).toBe("red");
  });
});
