/**
 * Content-based dispatcher for the Settings "Import character…" file picker:
 * auto-detects a native Ledgermain export, a Pathbuilder 1e HTML stat-block
 * export, a Pathbuilder 1e JSON export, a Hero Lab classic `.por` portfolio,
 * or a bare Hero Lab statblock XML from the raw file contents and routes to
 * the matching parser, so the UI needs only one file input. See
 * `importCharacter.ts`, `importPathbuilderHtml.ts`, `importPathbuilder.ts`,
 * and `importHeroLab.ts` for what each format assumes.
 *
 * Detection reads BYTES rather than text because a `.por` is a ZIP archive —
 * decoding one as UTF-8 first would mangle it. Everything else is text, and
 * is decoded here once the ZIP check has ruled a portfolio out.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import type { ImportReport } from "./externalImport.js";
import { parseImportedDoc } from "./importCharacter.js";
import { importHeroLabPortfolio, importHeroLabXml } from "./importHeroLab.js";
import { importPathbuilderJson } from "./importPathbuilder.js";
import { importPathbuilderHtml, isPathbuilderStatBlockHtml } from "./importPathbuilderHtml.js";
import { looksLikeZip } from "./zip.js";

export interface ImportedCharacter {
  doc: CharacterDoc;
  /** Undefined for a native Ledgermain export — there's nothing to report on. */
  report?: ImportReport;
}

/**
 * Parse a picked file's bytes as whichever of the supported formats it looks
 * like:
 *  - ZIP magic (`PK\x03\x04`) → a Hero Lab classic `.por` portfolio.
 *  - Content-sniffed as a Pathbuilder 1e HTML stat block (has both
 *    `stat-block-title` and `stat-block-1` markers) → the HTML importer.
 *    Checked BEFORE the generic `<`-leading check below, since a stat block
 *    is itself HTML (starts with `<!DOCTYPE html`) and would otherwise be
 *    misread as Hero Lab XML.
 *  - Leading `<` (after trimming whitespace) → Hero Lab classic XML.
 *  - Otherwise, JSON: tried first as a native Ledgermain export (the
 *    strictest shape check), then as a Pathbuilder 1e export.
 *
 * Throws a descriptive `Error` when the content isn't valid JSON/XML/HTML/ZIP
 * at all, or is valid JSON but an object shape neither importer can use (e.g.
 * a JSON array or a bare string/number) — every other case degrades to a
 * best-effort `ImportReport` rather than a thrown error.
 */
export async function importCharacterFile(
  bytes: Uint8Array,
  refData: RefData,
): Promise<ImportedCharacter> {
  if (looksLikeZip(bytes)) {
    return await importHeroLabPortfolio(bytes, refData);
  }

  const text = new TextDecoder().decode(bytes);
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
    throw new Error("That file isn't valid JSON or XML: couldn't read it as any supported format.");
  }

  try {
    return { doc: parseImportedDoc(parsed) };
  } catch {
    return importPathbuilderJson(parsed, refData);
  }
}
