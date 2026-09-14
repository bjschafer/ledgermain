/**
 * House style bans em and en dashes in player-facing copy, and most strings in
 * this app's source are player-facing (labels, hints, toasts, import reports).
 * This walks every string literal, template chunk, and JSX text node in
 * `src/` with oxc's parser, so code comments never trip it and
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
import { parseSync } from "oxc-parser";

const SRC_DIR = join(import.meta.dir, "..", "src");
const DASH = /[—–]/;

interface Node {
  type: string;
  start: number;
  [key: string]: unknown;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (/\.tsx?$/.test(entry.name)) yield full;
  }
}

function* walk(value: unknown): Generator<Node> {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) yield* walk(item);
    return;
  }
  const node = value as Node;
  if (typeof node.type === "string") yield node;
  for (const [key, child] of Object.entries(node)) {
    if (key !== "type") yield* walk(child);
  }
}

/** The authored text of a node that carries copy, or `undefined` for anything else. */
function copy(node: Node): string | undefined {
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateElement") {
    const value = node.value as { cooked: string | null; raw: string };
    return value.cooked ?? value.raw;
  }
  if (node.type === "JSXText") return node.value as string;
  return undefined;
}

function violationsIn(file: string, text: string): string[] {
  const parsed = parseSync(file, text, { lang: file.endsWith(".tsx") ? "tsx" : "ts" });
  // A parse this walk can't trust would go quietly green on an empty AST.
  if (parsed.errors.length > 0) {
    throw new Error(`${relative(SRC_DIR, file)}: ${parsed.errors[0]?.message}`);
  }
  const found: string[] = [];
  for (const node of walk(parsed.program)) {
    const value = copy(node);
    if (value === undefined || !DASH.test(value) || value.trim() === "—") continue;
    const line = text.slice(0, node.start).split("\n").length;
    found.push(`${relative(SRC_DIR, file)}:${line}: ${JSON.stringify(value.trim().slice(0, 120))}`);
  }
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
