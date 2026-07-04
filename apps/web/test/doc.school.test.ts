/**
 * Unit tests for Stage 2 (wizard specialization schools) additions to
 * model/doc.ts: `setWizardSchool` and `setWizardOppositionSchools`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setWizardOppositionSchools, setWizardSchool } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setWizardSchool()", () => {
  it("sets a specialist school tag", () => {
    expect(setWizardSchool(doc(), "evo").build.wizardSchool).toBe("evo");
  });

  it("sets Universalist", () => {
    expect(setWizardSchool(doc(), "uni").build.wizardSchool).toBe("uni");
  });

  it("clears the school when passed null", () => {
    const withSchool = setWizardSchool(doc(), "evo");
    expect(setWizardSchool(withSchool, null).build.wizardSchool).toBeUndefined();
  });

  it('setting "uni" clears wizardOppositionSchools', () => {
    let d = setWizardSchool(doc(), "evo");
    d = setWizardOppositionSchools(d, ["enc", "nec"]);
    expect(d.build.wizardOppositionSchools).toEqual(["enc", "nec"]);

    d = setWizardSchool(d, "uni");
    expect(d.build.wizardOppositionSchools).toEqual([]);
  });

  it("setting a specialist school leaves existing opposition alone", () => {
    let d = setWizardSchool(doc(), "evo");
    d = setWizardOppositionSchools(d, ["enc", "nec"]);
    d = setWizardSchool(d, "ill");
    expect(d.build.wizardOppositionSchools).toEqual(["enc", "nec"]);
  });

  it("a fresh document has no school set (Universalist by omission)", () => {
    expect(doc().build.wizardSchool).toBeUndefined();
  });
});

describe("setWizardOppositionSchools()", () => {
  it("sets up to two opposition tags", () => {
    expect(setWizardOppositionSchools(doc(), ["enc", "nec"]).build.wizardOppositionSchools).toEqual(
      ["enc", "nec"],
    );
  });

  it("caps at two opposition schools", () => {
    const out = setWizardOppositionSchools(doc(), ["enc", "nec", "ill", "con"]);
    expect(out.build.wizardOppositionSchools).toEqual(["enc", "nec"]);
  });

  it("ignores blanks", () => {
    const out = setWizardOppositionSchools(doc(), ["enc", "", "nec"]);
    expect(out.build.wizardOppositionSchools).toEqual(["enc", "nec"]);
  });

  it("clears with null or an empty array", () => {
    let d = setWizardOppositionSchools(doc(), ["enc", "nec"]);
    d = setWizardOppositionSchools(d, null);
    expect(d.build.wizardOppositionSchools).toEqual([]);
  });

  it("a fresh document has no opposition schools set", () => {
    expect(doc().build.wizardOppositionSchools).toBeUndefined();
  });
});
