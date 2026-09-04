import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { FORMULA_FUNCTION_NAMES } from "../src/index.js";

/**
 * Every function name used by any `formula` string in the vendored data must
 * exist in the evaluator. `collect.ts` drops a change whose formula fails to
 * parse rather than crashing the sheet, so without this test a new function
 * arriving with a data bump would make its modifier vanish with no signal.
 */
const ref = loadRefData();

// `sizeRoll` is a dice term the parser rewrites, not a numeric function.
const KNOWN = new Set([...FORMULA_FUNCTION_NAMES, "sizeRoll"]);

function collectFormulas(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectFormulas(item, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "formula" && typeof value === "string") out.push(value);
      else collectFormulas(value, out);
    }
  }
}

describe("vendored formulas only call functions the evaluator knows", () => {
  it("finds no unknown function names", () => {
    const formulas: string[] = [];
    collectFormulas(ref, formulas);
    expect(formulas.length).toBeGreaterThan(1000);

    const unknown = new Map<string, string>();
    for (const f of formulas) {
      for (const m of f.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
        const name = m[1]!;
        if (!KNOWN.has(name) && !unknown.has(name)) unknown.set(name, f);
      }
    }
    expect([...unknown.entries()]).toEqual([]);
  });
});
