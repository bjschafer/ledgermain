/**
 * Local persistence for character documents via Dexie (IndexedDB). Online-first
 * but local-only for Stage 3; this sets up Stage 5 cross-device sync (the doc
 * already carries `ownerId`/`version`/`updatedAt`). No server here.
 *
 * `save()` bumps the optimistic-concurrency `version` and `updatedAt` so Stage 5
 * can reject stale writes without changing the storage shape.
 */
import Dexie, { type Table } from "dexie";

import type { CharacterDoc } from "@pf1/schema";
import { createEmptyDoc } from "../model/doc.js";

class CharacterDb extends Dexie {
  characters!: Table<CharacterDoc, string>;

  constructor() {
    super("pf1-tracker");
    this.version(1).stores({ characters: "id, updatedAt" });
  }
}

export const db = new CharacterDb();

/** Persist a document, bumping its sync metadata. Returns the saved doc. */
export async function saveCharacter(doc: CharacterDoc): Promise<CharacterDoc> {
  const next: CharacterDoc = {
    ...doc,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await db.characters.put(next);
  return next;
}

/** Load the most-recently-updated document, creating one if the store is empty. */
export async function loadOrCreateActive(): Promise<CharacterDoc> {
  const existing = await db.characters.orderBy("updatedAt").last();
  if (existing) return existing;
  const fresh = createEmptyDoc(crypto.randomUUID());
  await db.characters.put(fresh);
  return fresh;
}
