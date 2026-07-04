/** Pure helpers for exporting a character document to a downloadable file. */
import { featNameSlug } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

/** Serialize a character document for export, pretty-printed for readability. */
export function characterExportJson(doc: CharacterDoc): string {
  return JSON.stringify(doc, null, 2);
}

/** A filesystem-safe filename for a character's export, derived from its name. */
export function characterExportFilename(doc: CharacterDoc): string {
  const slug = featNameSlug(doc.identity.name);
  return `${slug || "character"}.ledgermain.json`;
}
