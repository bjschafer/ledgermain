/**
 * Content-based dispatcher for the Settings "Import character…" file picker
 * (issue #3): auto-detects a native Ledgermain export, a Pathbuilder 1e
 * export, or a Hero Lab classic export from the raw file text and routes to
 * the matching parser, so the UI needs only one file input. See
 * `importCharacter.ts`, `importPathbuilder.ts`, and `importHeroLab.ts` for
 * what each format assumes and how confident we are in that shape.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import type { ImportReport } from "./externalImport.js";
import { parseImportedDoc } from "./importCharacter.js";
import { importHeroLabXml } from "./importHeroLab.js";
import { importPathbuilderJson } from "./importPathbuilder.js";

export interface ImportedCharacter {
  doc: CharacterDoc;
  /** Undefined for a native Ledgermain export — there's nothing to report on. */
  report?: ImportReport;
}

/**
 * Parse `text` (a File's contents) as whichever of the three supported
 * formats it looks like:
 *  - Leading `<` (after trimming whitespace) → Hero Lab classic XML.
 *  - Otherwise, JSON: tried first as a native Ledgermain export (the
 *    strictest shape check), then as a Pathbuilder 1e export.
 *
 * Throws a descriptive `Error` when the content isn't valid JSON/XML at all,
 * or is valid JSON but an object shape neither importer can use (e.g. a JSON
 * array or a bare string/number) — every other case degrades to a best-effort
 * `ImportReport` rather than a thrown error.
 */
export function importCharacterFile(text: string, refData: RefData): ImportedCharacter {
  const trimmed = text.trim();
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
