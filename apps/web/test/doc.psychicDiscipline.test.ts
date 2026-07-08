/**
 * Unit tests for the Psychic Discipline addition to model/doc.ts:
 * `setPsychicDiscipline`. Mirrors `doc.oracleMysteryCurse.test.ts`'s pattern
 * for `setOracleMystery` (the discipline picker is the mystery picker's
 * psychic twin — see DisciplinePicker.tsx).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setPsychicDiscipline } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setPsychicDiscipline()", () => {
  it("sets a discipline tag", () => {
    expect(setPsychicDiscipline(doc(), "faith").build.psychicDiscipline).toBe("faith");
  });

  it("clears the discipline when passed null", () => {
    const withDiscipline = setPsychicDiscipline(doc(), "faith");
    expect(setPsychicDiscipline(withDiscipline, null).build.psychicDiscipline).toBeUndefined();
  });

  it("strips a blank/whitespace-only tag to undefined", () => {
    expect(setPsychicDiscipline(doc(), "").build.psychicDiscipline).toBeUndefined();
    expect(setPsychicDiscipline(doc(), "   ").build.psychicDiscipline).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid tag", () => {
    expect(setPsychicDiscipline(doc(), "  self-perfection  ").build.psychicDiscipline).toBe(
      "self-perfection",
    );
  });

  it("a fresh document has no discipline set", () => {
    expect(doc().build.psychicDiscipline).toBeUndefined();
  });
});
