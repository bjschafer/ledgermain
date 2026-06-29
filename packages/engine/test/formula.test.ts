import { describe, expect, it } from "bun:test";

import {
  containsDice,
  DiceTermError,
  evaluateFormula,
  FormulaSyntaxError,
  parseFormula,
  tryEvaluateFormula,
} from "../src/index.js";

describe("formula: arithmetic + precedence", () => {
  it("respects operator precedence", () => {
    expect(evaluateFormula("2 + 3 * 4")).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4")).toBe(20);
    expect(evaluateFormula("10 - 2 - 3")).toBe(5); // left-associative
    expect(evaluateFormula("12 / 4 / 3")).toBe(1);
  });

  it("handles unary minus and nested parens", () => {
    expect(evaluateFormula("-4")).toBe(-4);
    expect(evaluateFormula("-(2 + 3)")).toBe(-5);
    expect(evaluateFormula("-clamp(5, 0, 4)")).toBe(-4);
  });
});

describe("formula: data-path resolution", () => {
  const ctx = {
    abilities: { con: { mod: 3 } },
    cl: 7,
    class: { unlevel: 5 },
    skills: { acr: { rank: 3 } },
    attributes: { hd: { total: 4 } },
  };

  it("resolves nested @paths", () => {
    expect(evaluateFormula("@abilities.con.mod", ctx)).toBe(3);
    expect(evaluateFormula("@cl", ctx)).toBe(7);
    expect(evaluateFormula("@skills.acr.rank", ctx)).toBe(3);
    expect(evaluateFormula("@attributes.hd.total", ctx)).toBe(4);
  });

  it("resolves a missing @path to 0", () => {
    expect(evaluateFormula("@abilities.str.mod", ctx)).toBe(0);
    expect(evaluateFormula("@nonexistent.path", ctx)).toBe(0);
  });
});

describe("formula: functions", () => {
  it("if / gte / min / max", () => {
    // fighting-defensively AC change: if(gte(@skills.acr.rank, 3), 1) + 2
    const ctx3 = { skills: { acr: { rank: 3 } } };
    const ctx0 = { skills: { acr: { rank: 0 } } };
    expect(evaluateFormula("if(gte(@skills.acr.rank, 3), 1) + 2", ctx3)).toBe(3);
    expect(evaluateFormula("if(gte(@skills.acr.rank, 3), 1) + 2", ctx0)).toBe(2);
    expect(evaluateFormula("min(10, 7)")).toBe(7);
    expect(evaluateFormula("max(10, 7)")).toBe(10);
  });

  it("comparison + boolean siblings", () => {
    expect(evaluateFormula("gt(5, 3)")).toBe(1);
    expect(evaluateFormula("lt(5, 3)")).toBe(0);
    expect(evaluateFormula("lte(3, 3)")).toBe(1);
    expect(evaluateFormula("eq(3, 3)")).toBe(1);
    expect(evaluateFormula("and(gte(2, 1), lt(1, 2))")).toBe(1);
    expect(evaluateFormula("or(0, 0)")).toBe(0);
    expect(evaluateFormula("floor(7 / 2)")).toBe(3);
    expect(evaluateFormula("ceil(7 / 2)")).toBe(4);
    expect(evaluateFormula("abs(-5)")).toBe(5);
  });

  it("evaluates Rage's rounds/day maxFormula", () => {
    // 4 + @abilities.con.mod + (2 * (@class.unlevel - 1))
    const formula = "4 + @abilities.con.mod + (2 * (@class.unlevel - 1))";
    // L1 barbarian, Con 16 (+3): 4 + 3 + 0 = 7
    expect(evaluateFormula(formula, { abilities: { con: { mod: 3 } }, class: { unlevel: 1 } })).toBe(7);
    // L5 barbarian, Con 14 (+2): 4 + 2 + (2 * 4) = 14
    expect(evaluateFormula(formula, { abilities: { con: { mod: 2 } }, class: { unlevel: 5 } })).toBe(14);
  });

  it("evaluates armor-training's clamp formula", () => {
    // clamp(floor((@class.unlevel + 1) / 4), 0, 4)
    const f = "clamp(floor((@class.unlevel + 1) / 4), 0, 4)";
    expect(evaluateFormula(f, { class: { unlevel: 1 } })).toBe(0);
    expect(evaluateFormula(f, { class: { unlevel: 5 } })).toBe(1);
    expect(evaluateFormula(f, { class: { unlevel: 15 } })).toBe(4);
  });
});

describe("formula: dice terms", () => {
  it("parses dice terms without erroring", () => {
    const node = parseFormula("(min(10, @cl))d6");
    expect(containsDice(node)).toBe(true);
  });

  it("throws DiceTermError on numeric evaluation of dice", () => {
    expect(() => evaluateFormula("2d6")).toThrow(DiceTermError);
    expect(tryEvaluateFormula("(min(10, @cl))d6", { cl: 5 })).toBeNull();
  });

  it("still evaluates non-dice formulas via tryEvaluateFormula", () => {
    expect(tryEvaluateFormula("2 + 2")).toBe(4);
  });
});

describe("formula: errors", () => {
  it("throws on unknown function", () => {
    expect(() => evaluateFormula("frobnicate(1)")).toThrow();
  });
  it("throws on malformed input", () => {
    expect(() => parseFormula("2 +")).toThrow(FormulaSyntaxError);
    expect(() => parseFormula("(2 + 3")).toThrow(FormulaSyntaxError);
  });
});
