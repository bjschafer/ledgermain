/**
 * Validation for character documents coming from outside the app (file import).
 * Kept separate from `doc.ts` migrations since this is the one place untrusted
 * JSON enters the system — a malformed or foreign blob must be rejected before
 * it ever reaches Dexie or the engine.
 */
import type { CharacterDoc } from "@pf1/schema";

import { migrateDoc } from "./doc.js";

/**
 * Parse and validate an imported character export, then run it through the
 * same migration path as documents loaded from IndexedDB so older exports
 * still load. Throws a descriptive Error when the shape doesn't look like a
 * character document, so the import UI can explain the rejection.
 */
export function parseImportedDoc(value: unknown): CharacterDoc {
  if (!looksLikeCharacterDoc(value)) {
    throw new Error("That file doesn't look like a Ledgermain character export.");
  }
  return migrateDoc(value);
}

function looksLikeCharacterDoc(value: unknown): value is CharacterDoc {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.schemaVersion === "number" &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isPlainObject(value.identity) &&
    typeof value.identity.name === "string" &&
    isPlainObject(value.abilities) &&
    isPlainObject(value.build) &&
    isPlainObject(value.live)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
