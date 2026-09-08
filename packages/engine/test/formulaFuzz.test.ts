/**
 * Property tests for the formula DSL. `formula.test.ts` covers the dialect
 * with hand-written cases; this covers the contract those cases assume but
 * never state, which is what `collect.ts` and the sheet actually rely on:
 *
 * 1. Hostile input fails in a declared way. `parseFormula` is reachable from
 *    the homebrew change editor and from every vendored `formula` string a
 *    data bump brings in, so the only exception allowed to escape it is
 *    `FormulaSyntaxError` — the one `collect.ts` and the editor catch. A
 *    `TypeError` or a bare `RangeError` from the same input is a crash.
 * 2. Well-formed input never throws at all. Anything the grammar can build,
 *    `tryEvaluateFormula` resolves to a number or to `null` for a dice term.
 *    That is the promise that keeps a damage formula from taking down the
 *    static sheet.
 *
 * Known and accepted: the parser and evaluator are both recursive, so a
 * formula nested about ten thousand parens deep overflows the stack with a
 * `RangeError`. The longest formula in the vendored data is 200 characters,
 * and both generators here stay inside a realistic length, so that boundary
 * is out of scope rather than unnoticed.
 *
 * Runs are seeded, so a failure reported by CI reproduces exactly.
 */
import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  DiceTermError,
  evaluateFormula,
  FormulaSyntaxError,
  parseFormula,
  tryEvaluateFormula,
} from "../src/index.js";

const SEED = 20260907;
const RUNS = 2000;

/** The characters the tokenizer has rules for, plus a few it must reject. */
const FORMULA_CHARS = "0123456789+-*/%(),.@[]d abcxyzifgtelmn_$#\"'\\{}";

const rawFormula = fc.string({
  unit: fc.constantFrom(...FORMULA_CHARS.split("")),
  minLength: 0,
  maxLength: 60,
});

const rollData = {
  classes: { fighter: { level: 7 } },
  abilities: { str: { mod: 4 }, con: { mod: 2 } },
  skills: { "crf.alchemy": { rank: 3 } },
  item: { level: 9 },
};

/**
 * `letrec`'s tie is untyped by construction (the arbitraries it returns are
 * still being defined); every recursive slot here produces a formula string.
 */
const expr = (tie: (key: string) => fc.Arbitrary<unknown>): fc.Arbitrary<string> =>
  tie("expr") as fc.Arbitrary<string>;

/** Well-formed formulas: the grammar's own shapes, bounded in depth. */
const wellFormed: fc.Arbitrary<string> = fc.letrec((tie) => ({
  expr: fc.oneof(
    { maxDepth: 4, withCrossShrink: true },
    fc.oneof(
      fc.integer({ min: -99, max: 99 }).map(String),
      fc.constantFrom(
        "@classes.fighter.level",
        "@abilities.str.mod",
        "@skills.crf.alchemy.rank",
        "@item.level",
        // A path with no value behind it: resolves to 0, Foundry's behavior.
        "@nothing.here.at.all",
        "1d6",
        "2d8",
        "sizeRoll(1, 6)",
      ),
    ),
    fc
      .tuple(expr(tie), fc.constantFrom("+", "-", "*", "/", "%"), expr(tie))
      .map(([l, op, r]) => `${l} ${op} ${r}`),
    expr(tie).map((e) => `(${e})`),
    expr(tie).map((e) => `-${e}`),
    // Flavor annotations are skipped by the tokenizer, not evaluated.
    expr(tie).map((e) => `${e}[flavor]`),
    fc
      .tuple(fc.constantFrom("floor", "ceil", "round", "abs", "sign", "not"), expr(tie))
      .map(([fn, a]) => `${fn}(${a})`),
    fc
      .tuple(
        fc.constantFrom("min", "max", "mins", "eq", "ne", "gt", "gte", "lt", "lte", "and", "or"),
        expr(tie),
        expr(tie),
      )
      .map(([fn, a, b]) => `${fn}(${a}, ${b})`),
    fc
      .tuple(
        fc.constantFrom("if", "ifelse", "clamp", "clamped", "lookup"),
        expr(tie),
        expr(tie),
        expr(tie),
      )
      .map(([fn, a, b, c]) => `${fn}(${a}, ${b}, ${c})`),
  ),
})).expr;

/**
 * Near-misses: a well-formed formula with a few characters deleted, doubled,
 * or replaced. Random strings almost all die in the tokenizer on the first
 * bad character, so they never reach the parser; a corrupted real formula
 * lands on the interesting failures instead — an unbalanced paren, a call
 * with a missing argument, a path that stops mid-segment, trailing tokens.
 */
const mutatedFormula: fc.Arbitrary<string> = wellFormed.chain((src) =>
  fc
    .array(
      fc.record({
        at: fc.nat({ max: Math.max(0, src.length - 1) }),
        edit: fc.oneof(
          fc.constant<{ kind: "delete" }>({ kind: "delete" }),
          fc
            .constantFrom(...FORMULA_CHARS.split(""))
            .map((ch) => ({ kind: "replace" as const, ch })),
          fc
            .constantFrom(...FORMULA_CHARS.split(""))
            .map((ch) => ({ kind: "insert" as const, ch })),
        ),
      }),
      { minLength: 1, maxLength: 3 },
    )
    .map((edits) => {
      let out = src;
      for (const { at, edit } of edits) {
        const i = Math.min(at, Math.max(0, out.length - 1));
        if (edit.kind === "delete") out = out.slice(0, i) + out.slice(i + 1);
        else if (edit.kind === "replace") out = out.slice(0, i) + edit.ch + out.slice(i + 1);
        else out = out.slice(0, i) + edit.ch + out.slice(i);
      }
      return out;
    }),
);

describe("formula fuzz: arbitrary input", () => {
  test("parseFormula throws nothing but FormulaSyntaxError", () => {
    fc.assert(
      fc.property(fc.oneof(rawFormula, mutatedFormula), (src) => {
        try {
          parseFormula(src);
        } catch (err) {
          if (!(err instanceof FormulaSyntaxError)) {
            throw new Error(
              `parseFormula(${JSON.stringify(src)}) threw ${(err as Error).name}: ` +
                `${(err as Error).message}. Callers only catch FormulaSyntaxError.`,
            );
          }
        }
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test("tryEvaluateFormula throws nothing but FormulaSyntaxError", () => {
    fc.assert(
      fc.property(fc.oneof(rawFormula, mutatedFormula), (src) => {
        let value: number | null;
        try {
          value = tryEvaluateFormula(src, rollData);
        } catch (err) {
          if (!(err instanceof FormulaSyntaxError)) {
            throw new Error(
              `tryEvaluateFormula(${JSON.stringify(src)}) threw ${(err as Error).name}: ` +
                `${(err as Error).message}. Callers only catch FormulaSyntaxError.`,
            );
          }
          return;
        }
        // A dice term is the only reason to get null; everything else is a
        // number, NaN and Infinity included (0/0 and min() are legal here).
        expect(value === null || typeof value === "number").toBe(true);
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});

describe("formula fuzz: well-formed input", () => {
  test("anything the grammar builds parses and evaluates without throwing", () => {
    fc.assert(
      fc.property(wellFormed, (src) => {
        const value = tryEvaluateFormula(src, rollData);
        expect(value === null || typeof value === "number").toBe(true);
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test("a dice term is the only thing that makes evaluation return null", () => {
    fc.assert(
      fc.property(wellFormed, (src) => {
        if (tryEvaluateFormula(src, rollData) !== null) return;
        expect(() => evaluateFormula(src, rollData)).toThrow(DiceTermError);
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});
