/**
 * Unit tests for the Fiendish Boon addition to model/doc.ts:
 * `setAntipaladinBoon` (issue #65 wave B). Mirrors
 * `doc.psychicDiscipline.test.ts`'s pattern for `setPsychicDiscipline`, minus
 * the trim/blank-string handling — `antipaladinBoon` is a closed two-value
 * union, not a free-text RefData tag, so `null` is the only "clear" input.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setAntipaladinBoon } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setAntipaladinBoon()", () => {
  it("sets the weapon boon", () => {
    expect(setAntipaladinBoon(doc(), "weapon").build.antipaladinBoon).toBe("weapon");
  });

  it("sets the servant boon", () => {
    expect(setAntipaladinBoon(doc(), "servant").build.antipaladinBoon).toBe("servant");
  });

  it("clears the boon when passed null", () => {
    const withBoon = setAntipaladinBoon(doc(), "weapon");
    expect(setAntipaladinBoon(withBoon, null).build.antipaladinBoon).toBeUndefined();
  });

  it("a fresh document has no boon set", () => {
    expect(doc().build.antipaladinBoon).toBeUndefined();
  });
});
