import { describe, expect, it } from "bun:test";

import {
  containsDice,
  DiceTermError,
  evaluateFormula,
  formatDiceFormula,
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

  it("resolves a parameterized skill instance id's own embedded dot", () => {
    // rolldata.ts stores Craft/Perform/Profession instances under a FLAT key
    // that is the whole id ("crf.alchemy"), not a nested "crf" -> "alchemy"
    // object — a rank-gated formula like Skill Focus (Craft)'s must resolve
    // the id as one unit rather than walking it segment by segment.
    const skillCtx = { skills: { "crf.alchemy": { rank: 12 }, acr: { rank: 3 } } };
    expect(evaluateFormula("@skills.crf.alchemy.rank", skillCtx)).toBe(12);
    expect(evaluateFormula("if(gte(@skills.crf.alchemy.rank, 10), 6, 3)", skillCtx)).toBe(6);
    // A 2nd-level instance id ("prf.oratory-2") still resolves as one unit.
    const collision = { skills: { "prf.oratory-2": { rank: 1 } } };
    expect(evaluateFormula("@skills.prf.oratory-2.rank", collision)).toBe(1);
    // Unrelated 2-segment skill paths are unaffected.
    expect(evaluateFormula("@skills.acr.rank", skillCtx)).toBe(3);
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
    expect(
      evaluateFormula(formula, { abilities: { con: { mod: 3 } }, class: { unlevel: 1 } }),
    ).toBe(7);
    // L5 barbarian, Con 14 (+2): 4 + 2 + (2 * 4) = 14
    expect(
      evaluateFormula(formula, { abilities: { con: { mod: 2 } }, class: { unlevel: 5 } }),
    ).toBe(14);
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

describe("formula: size-scaled dice (sizeRoll)", () => {
  // `sizeRoll(count, faces, size)` is a dice term whose die steps with the
  // creature's size; the first two arguments are the Medium dice, which is the
  // only size this engine models.
  it("reads as an ordinary dice term (Ghost Whip's 1d3)", () => {
    const node = parseFormula("sizeRoll(1, 3, @size)");
    expect(containsDice(node)).toBe(true);
    expect(formatDiceFormula("sizeRoll(1, 3, @size)", {})).toBe("1d3");
    expect(tryEvaluateFormula("sizeRoll(1, 3, @size)", {})).toBeNull();
  });

  it("evaluates @-scaled count and faces sub-expressions (monk unarmed damage)", () => {
    // SRD Table: Monk Unarmed Damage (Medium) — 1d6 at L1, 1d8 at L4, 2d6 at L12.
    const f = "sizeRoll(ceil(@class.unlevel / 11), 6 + floor(@class.unlevel / 4) % 3 * 2, @size)";
    expect(formatDiceFormula(f, { class: { unlevel: 1 } })).toBe("1d6");
    expect(formatDiceFormula(f, { class: { unlevel: 4 } })).toBe("1d8");
    expect(formatDiceFormula(f, { class: { unlevel: 12 } })).toBe("2d6");
  });
});

describe("formula: flavor annotations", () => {
  it("ignores a bracketed label on a term (Splintered Spear at wizard L6)", () => {
    expect(
      formatDiceFormula("sizeRoll(1, 6, @size) + floor(@class.unlevel / 6)[Enhancement]", {
        class: { unlevel: 6 },
      }),
    ).toBe("1d6+1");
  });

  it("ignores one on a plain numeric formula (Coin Shot at CL 9)", () => {
    expect(formatDiceFormula("1d8 + min(floor(@cl / 2), 10)[CL/2]", { cl: 9 })).toBe("1d8+4");
    expect(evaluateFormula("4[Enhancement] + 2")).toBe(6);
  });

  it("throws on an unclosed bracket", () => {
    expect(() => parseFormula("1d6 + 2[Enhancement")).toThrow(FormulaSyntaxError);
  });
});

describe("formula: symbolic dice display (formatDiceFormula)", () => {
  it("evaluates the numeric part of a dice+modifier sum, keeping dice symbolic (Acid Dart at wizard L4)", () => {
    expect(formatDiceFormula("1d6 + floor(@class.unlevel / 2)", { class: { unlevel: 4 } })).toBe(
      "1d6+2",
    );
  });

  it("evaluates a dice-count sub-expression (Channel Energy at cleric L7)", () => {
    expect(formatDiceFormula("(ceil(@class.unlevel / 2))d6", { class: { unlevel: 7 } })).toBe(
      "4d6",
    );
  });

  it("handles a negative modifier", () => {
    expect(formatDiceFormula("1d8 - 1", {})).toBe("1d8-1");
  });

  it("returns null for a formula with no dice term at all", () => {
    expect(
      formatDiceFormula("10 + floor(@class.unlevel / 2)", { class: { unlevel: 6 } }),
    ).toBeNull();
  });

  it("returns null rather than throwing when a formula can't be isolated (dice multiplied by a factor)", () => {
    expect(formatDiceFormula("2 * (1d6)", {})).toBeNull();
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
