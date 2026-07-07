/**
 * Content-based dispatcher for the Settings "Import character…" file picker
 * (issue #3): auto-detects a native Ledgermain export, a Pathbuilder 1e HTML
 * stat-block export, a Pathbuilder 1e JSON export, or a Hero Lab classic
 * export from the raw file text and routes to the matching parser, so the UI
 * needs only one file input. See `importCharacter.ts`,
 * `importPathbuilderHtml.ts`, `importPathbuilder.ts`, and `importHeroLab.ts`
 * for what each format assumes and how confident we are in that shape.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import type { ImportReport } from "./externalImport.js";
import { parseImportedDoc } from "./importCharacter.js";
import { importHeroLabXml } from "./importHeroLab.js";
import { importPathbuilderJson } from "./importPathbuilder.js";
import { importPathbuilderHtml, isPathbuilderStatBlockHtml } from "./importPathbuilderHtml.js";

export interface ImportedCharacter {
  doc: CharacterDoc;
  /** Undefined for a native Ledgermain export — there's nothing to report on. */
  report?: ImportReport;
}

/**
 * Parse `text` (a File's contents) as whichever of the four supported
 * formats it looks like:
 *  - Content-sniffed as a Pathbuilder 1e HTML stat block (has both
 *    `stat-block-title` and `stat-block-1` markers) → the HTML importer.
 *    Checked BEFORE the generic `<`-leading check below, since a stat block
 *    is itself HTML (starts with `<!DOCTYPE html`) and would otherwise be
 *    misread as Hero Lab XML.
 *  - Leading `<` (after trimming whitespace) → Hero Lab classic XML.
 *  - Otherwise, JSON: tried first as a native Ledgermain export (the
 *    strictest shape check), then as a Pathbuilder 1e export.
 *
 * Throws a descriptive `Error` when the content isn't valid JSON/XML/HTML at
 * all, or is valid JSON but an object shape neither importer can use (e.g. a
 * JSON array or a bare string/number) — every other case degrades to a
 * best-effort `ImportReport` rather than a thrown error.
 */
export function importCharacterFile(text: string, refData: RefData): ImportedCharacter {
  const trimmed = text.trim();
  if (isPathbuilderStatBlockHtml(trimmed)) {
    return importPathbuilderHtml(trimmed, refData);
  }
  if (trimmed.startsWith("<")) {
    return importHeroLabXml(text, refData);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "That file isn't valid JSON or XML — couldn't read it as any supported format.",
    );
  }

  try {
    return { doc: parseImportedDoc(parsed) };
  } catch {
    return importPathbuilderJson(parsed, refData);
  }
}
