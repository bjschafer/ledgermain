/**
 * `targets.ts` is a hand-maintained allowlist of the `Change.target` strings
 * `compute()` actually consumes. A change aimed at anything else is collected
 * by `collectModifiers` and then dropped on the floor: no number reaches the
 * sheet, no error, no test failure. The Wasting curse shipped a `chaSkills`
 * target that did nothing for months, and the shifter Mantis aspect shipped a
 * `reach` one; both were found by reading, not by a check.
 *
 * This walks every hand-authored `Change` literal in `src/` with the
 * TypeScript parser and fails on any target the allowlist doesn't cover. The
 * discriminator for "this object is a Change" is carrying both `formula` and
 * `target` — a `ContextNote` has `target` and `text`, so notes (the correct
 * home for an effect the sheet has no line for) are left alone.
 *
 * Engine `src/` only: apps/web authors context notes but no changes, and
 * vendored data is not hand-authored — an unapplied target arriving from
 * upstream is the "partial" badge's job, not a build break.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

import { isTargetApplied } from "../src/targets.js";

const SRC_DIR = join(import.meta.dir, "..", "src");

/**
 * An empty target is the documented "this spec grants no change at all"
 * sentinel on `ElementChoiceSpec` (protection from energy absorbs damage
 * through its ablative pool rather than as a resistance value), which shares
 * `Change`'s field names. Nothing is dropped, because nothing is emitted.
 */
const NO_CHANGE_SENTINEL = "";

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (entry.name.endsWith(".ts")) yield full;
  }
}

/**
 * The statically known target of a Change literal, or `undefined` when it
 * can't be read off the source. A template like `` `skill.${id}` `` is
 * checked by its head, which is where the registered prefix lives; a bare
 * identifier (`{ target, formula, type }` built from a variable) is
 * unknowable here and skipped.
 */
function staticTarget(init: ts.Expression): string | undefined {
  if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
  if (ts.isTemplateExpression(init)) return init.head.text;
  return undefined;
}

interface Violation {
  target: string;
  where: string;
}

function violationsIn(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: Violation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const props = new Map<string, ts.Expression>();
      for (const p of node.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
        if (key) props.set(key, p.initializer);
      }
      const target = props.get("target");
      if (target && props.has("formula")) {
        const value = staticTarget(target);
        if (value !== undefined && value !== NO_CHANGE_SENTINEL && !isTargetApplied(value)) {
          const { line } = sf.getLineAndCharacterOfPosition(target.getStart(sf));
          found.push({ target: value, where: `${relative(SRC_DIR, file)}:${line + 1}` });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("hand-authored change targets", () => {
  test("every Change literal in src/ aims at a target compute() applies", () => {
    const violations: Violation[] = [];
    for (const file of sourceFiles(SRC_DIR)) {
      const text = readFileSync(file, "utf8");
      if (!text.includes("target")) continue;
      violations.push(...violationsIn(file, text));
    }
    if (violations.length > 0) {
      const lines = violations.map((v) => `${v.where}: target "${v.target}"`);
      throw new Error(
        `Change targets the engine never reads, so the number is silently dropped. ` +
          `Either teach compute() the target and register it in targets.ts, express the ` +
          `effect with a target that is already applied, or move it to contextNotes so ` +
          `the player at least sees the reminder:\n  ${lines.join("\n  ")}`,
      );
    }
    expect(violations).toEqual([]);
  });

  test("the walk finds the change literals it is meant to police", () => {
    // A guard on the guard: if the Change-literal heuristic ever stops
    // matching (a rename, a helper that builds every change), this test goes
    // quietly green on an empty set and stops protecting anything.
    const sample = `
      const a = { formula: "1", target: "notARealTarget", type: "untyped" };
      const b: ContextNote = { target: "alsoNotReal", text: "a reminder" };
    `;
    const found = violationsIn(join(SRC_DIR, "sample.ts"), sample);
    expect(found.map((v) => v.target)).toEqual(["notARealTarget"]);
  });
});
