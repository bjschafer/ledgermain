/**
 * Unit tests for Stage 1 (sorcerer bloodline spells) additions to model/doc.ts:
 * `setSorcererBloodline`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setSorcererBloodline } from "../src/model/doc.js";

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
});
