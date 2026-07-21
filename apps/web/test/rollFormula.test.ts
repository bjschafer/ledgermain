import { describe, expect, it } from "bun:test";

import {
  d20Formula,
  d20FormulaFor,
  damageFormula,
  formulaPreview,
} from "../src/model/rollFormula.js";

describe("d20Formula", () => {
  it("formats a positive total as a pasteable formula", () => {
    expect(d20Formula([10])).toBe("1d20 + 10");
  });

  it("uses an ASCII minus for a penalty", () => {
    expect(d20Formula([-2])).toBe("1d20 - 2");
  });

  it("drops the operator entirely at +0", () => {
    expect(d20Formula([0])).toBe("1d20");
  });

  it("emits one line per iterative attack", () => {
    expect(d20Formula([11, 6])).toBe("1d20 + 11\n1d20 + 6");
  });

  it("falls back to a bare d20 with no totals", () => {
    expect(d20Formula([])).toBe("1d20");
  });
});

describe("d20FormulaFor", () => {
  it("uses the sequence when there is one", () => {
    expect(d20FormulaFor(11, [11, 6])).toBe("1d20 + 11\n1d20 + 6");
  });

  it("falls back to the total when the sequence is absent or a single attack", () => {
    expect(d20FormulaFor(4)).toBe("1d20 + 4");
    expect(d20FormulaFor(4, [4])).toBe("1d20 + 4");
  });
});

describe("damageFormula", () => {
  it("joins dice and bonus", () => {
    expect(damageFormula("1d8", 6)).toBe("1d8 + 6");
  });

  it("omits a zero bonus", () => {
    expect(damageFormula("2d6", 0)).toBe("2d6");
  });

  it("subtracts a negative bonus", () => {
    expect(damageFormula("1d6", -1)).toBe("1d6 - 1");
  });

  it("falls back to the bare bonus when there are no dice", () => {
    expect(damageFormula(undefined, 3)).toBe("3");
    expect(damageFormula("", 3)).toBe("3");
  });
});

describe("formulaPreview", () => {
  it("quotes a single formula", () => {
    expect(formulaPreview("1d20 + 10")).toBe('"1d20 + 10"');
  });

  it("counts a multi-attack sequence instead of echoing it", () => {
    expect(formulaPreview("1d20 + 11\n1d20 + 6")).toBe("2 rolls");
  });
});
