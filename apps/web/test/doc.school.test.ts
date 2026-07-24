/**
 * Unit tests for Stage 2 (wizard specialization schools) additions to
 * model/doc.ts: `setWizardSchool`, `setWizardOppositionSchools` and
 * `setWizardOppositionElement`.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  createEmptyDoc,
  setWizardOppositionElement,
  setWizardOppositionSchools,
  setWizardSchool,
} from "../src/model/doc.js";

const ref = loadRefData();

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

  it("an elemental school clears the two-school opposition (it opposes one element instead)", () => {
    let d = setWizardSchool(doc(), "evo");
    d = setWizardOppositionSchools(d, ["enc", "nec"]);
    d = setWizardSchool(d, "air-elemental", ref);
    expect(d.build.wizardSchool).toBe("air-elemental");
    expect(d.build.wizardOppositionSchools).toEqual([]);
  });

  it("an elemental school with one fixed opposite sets it; a choice leaves it unset", () => {
    expect(setWizardSchool(doc(), "air-elemental", ref).build.wizardOppositionElement).toBe(
      "earth-elemental",
    );
    // Earth opposes Air (APG) or Wood (UM) — the player picks.
    expect(
      setWizardSchool(doc(), "earth-elemental", ref).build.wizardOppositionElement,
    ).toBeUndefined();
  });

  it("switching back to a standard school clears the opposition element", () => {
    let d = setWizardSchool(doc(), "air-elemental", ref);
    d = setWizardSchool(d, "evo", ref);
    expect(d.build.wizardOppositionElement).toBeUndefined();
  });

  it("without refData an elemental pick still clears opposition, just auto-selects nothing", () => {
    const d = setWizardSchool(doc(), "air-elemental");
    expect(d.build.wizardSchool).toBe("air-elemental");
    expect(d.build.wizardOppositionElement).toBeUndefined();
  });
});

describe("setWizardOppositionElement()", () => {
  it("sets and clears the opposed element", () => {
    let d = setWizardOppositionElement(
      setWizardSchool(doc(), "void-elemental", ref),
      "fire-elemental",
    );
    expect(d.build.wizardOppositionElement).toBe("fire-elemental");
    d = setWizardOppositionElement(d, null);
    expect(d.build.wizardOppositionElement).toBeUndefined();
  });

  it("a fresh document has no opposition element set", () => {
    expect(doc().build.wizardOppositionElement).toBeUndefined();
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
