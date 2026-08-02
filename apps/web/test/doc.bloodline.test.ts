/**
 * Unit tests for Stage 1 (sorcerer bloodline spells) additions to
 * model/doc.ts: `setSorcererBloodline`, plus the `setSorcererBloodlineVariant`
 * (Draconic dragon type / Elemental element pick).
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  createEmptyDoc,
  parentBloodlineTagOf,
  setSorcererBloodline,
  setSorcererBloodlineVariant,
} from "../src/model/doc.js";

const ref = loadRefData();

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

describe("parentBloodlineTagOf() (wildblooded mutation)", () => {
  it("returns a base bloodline tag unchanged", () => {
    expect(parentBloodlineTagOf(ref, "Arcane")).toBe("Arcane");
  });

  it("resolves a mutation id to its parent's tag", () => {
    expect(parentBloodlineTagOf(ref, "arcane-sage")).toBe("Arcane");
  });

  it("returns the tag unchanged for one that resolves to neither (soft-warning posture)", () => {
    expect(parentBloodlineTagOf(ref, "not-a-real-bloodline")).toBe("not-a-real-bloodline");
  });

  it("setSorcererBloodline stores a mutation id directly, same field as a base tag", () => {
    const withMutation = setSorcererBloodline(doc(), "arcane-sage");
    expect(withMutation.build.sorcererBloodline).toBe("arcane-sage");
    expect(parentBloodlineTagOf(ref, withMutation.build.sorcererBloodline!)).toBe("Arcane");
  });
});
