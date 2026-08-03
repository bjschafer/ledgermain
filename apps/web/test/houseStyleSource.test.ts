/**
 * House style bans em and en dashes in player-facing copy, and most strings in
 * this app's source are player-facing (labels, hints, toasts, import reports).
 * This walks every string literal, template chunk, and JSX text node in
 * `src/` with the TypeScript parser, so code comments never trip it and
 * `—`-style escapes can't sneak the character in. A string that is
 * exactly "—" is allowed: that's the empty-value placeholder glyph, a UI
 * symbol rather than prose.
 *
 * There is deliberately no companion check for "(issue #N)" citations: it
 * can't be told apart from legitimate book citations (an Adventure Path
 * issue number), so that ban stays a review convention.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

const SRC_DIR = join(import.meta.dir, "..", "src");
const DASH = /[—–]/;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (/\.tsx?$/.test(entry.name)) yield full;
  }
}

function violationsIn(file: string, text: string): string[] {
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const isStringy =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (isStringy && DASH.test(node.text) && node.text.trim() !== "—") {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      found.push(
        `${relative(SRC_DIR, file)}:${line + 1}: ${JSON.stringify(node.text.trim().slice(0, 120))}`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("house style: src strings", () => {
  test("no em or en dashes outside the bare placeholder glyph", () => {
    const violations: string[] = [];
    for (const file of sourceFiles(SRC_DIR)) {
      const text = readFileSync(file, "utf8");
      if (!DASH.test(text)) continue;
      violations.push(...violationsIn(file, text));
    }
    if (violations.length > 0) {
      throw new Error(
        `Em/en dash in player-facing copy; restructure with a colon, a period, or ` +
          `a pair of commas (never a "--" substitute):\n  ${violations.join("\n  ")}`,
      );
    }
    expect(violations).toEqual([]);
  });
});
