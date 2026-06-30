import { readFileSync } from "node:fs";

import { parse } from "csv-parse/sync";

/**
 * Read a CSV file into header-name-keyed row objects. Column order and presence
 * vary across the archetype dataset's per-class files (e.g. some omit a "Base
 * Feature" column), so callers must look up fields by name, never by index —
 * `columns: true` gives us that for free.
 *
 * Read as latin1: the source files use extended-ASCII bytes (smart quotes etc.)
 * that aren't valid UTF-8; latin1 maps every byte 1:1 so nothing throws, and the
 * handful of non-ASCII punctuation characters are display-only (HTML prose),
 * not consumed structurally.
 */
export function readCsv(filePath: string): Record<string, string | undefined>[] {
  const text = readFileSync(filePath, "latin1");
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string | undefined>[];
}
