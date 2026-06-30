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
import { createEmptyDoc, migrateDoc } from "../model/doc.js";

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

// Which character is "active" is recorded explicitly in localStorage (shared
// synchronously across same-origin tabs), not derived from `updatedAt`
// recency. Recency alone lets a tab that's merely autosaving edits to
// character A silently steal "active" status back from a tab that explicitly
// switched to character B. localStorage may be unavailable (private
// browsing, disabled storage) — treat that as "no explicit choice recorded"
// and fall back to recency.
const ACTIVE_ID_KEY = "pf1-tracker:activeCharacterId";

function getStoredActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

function setStoredActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch {
    // Storage unavailable — active-character tracking degrades to recency-only.
  }
}

/** Mark a document as the explicitly active one, then return it unchanged. */
function rememberActive(doc: CharacterDoc): CharacterDoc {
  setStoredActiveId(doc.id);
  return doc;
}

// Concurrent calls (e.g. React StrictMode's mount→unmount→remount double-invoke
// of the load effect) would otherwise race the read-then-create below and each
// create their own blank character. Share one in-flight promise so a second
// caller awaits the first instead of creating a duplicate.
let activeLoadPromise: Promise<CharacterDoc> | null = null;

/** Load the most-recently-updated document, creating one if the store is empty. */
export async function loadOrCreateActive(): Promise<CharacterDoc> {
  if (!activeLoadPromise) {
    activeLoadPromise = (async () => {
      const storedId = getStoredActiveId();
      const stored = storedId ? await db.characters.get(storedId) : undefined;
      if (stored) return rememberActive(migrateDoc(stored));
      const existing = await db.characters.orderBy("updatedAt").last();
      if (existing) return rememberActive(migrateDoc(existing));
      return createCharacter();
    })().finally(() => {
      activeLoadPromise = null;
    });
  }
  return activeLoadPromise;
}

/** Lightweight summary for the character switcher — avoids shipping full docs around. */
export interface CharacterSummary {
  id: string;
  name: string;
  updatedAt: string;
}

/** List all saved characters, most-recently-active first. */
export async function listCharacters(): Promise<CharacterSummary[]> {
  const all = await db.characters.orderBy("updatedAt").reverse().toArray();
  return all.map((doc) => ({
    id: doc.id,
    name: doc.identity.name,
    updatedAt: doc.updatedAt,
  }));
}

/** Load a specific saved character by id and mark it active (bumps `updatedAt`). */
export async function loadCharacter(id: string): Promise<CharacterDoc> {
  const doc = await db.characters.get(id);
  if (!doc) throw new Error(`No saved character with id ${id}`);
  const next = { ...migrateDoc(doc), updatedAt: new Date().toISOString() };
  await db.characters.put(next);
  return rememberActive(next);
}

/** Create a brand-new blank character and make it active. */
export async function createCharacter(): Promise<CharacterDoc> {
  const fresh = createEmptyDoc(crypto.randomUUID());
  await db.characters.put(fresh);
  return rememberActive(fresh);
}

/**
 * Import a document exported from this app. Overwrites an existing character
 * if `doc.id` matches one already stored (re-importing the same export
 * updates it in place) and inserts it as a new character otherwise. Becomes
 * the active character either way.
 */
export async function importCharacter(doc: CharacterDoc): Promise<CharacterDoc> {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  await db.characters.put(next);
  return rememberActive(next);
}

/** Wipe every saved character and start over with one fresh blank doc. */
export async function resetAllCharacters(): Promise<CharacterDoc> {
  await db.characters.clear();
  return createCharacter();
}

/**
 * Delete a single saved character. The next most-recently-active remaining
 * character becomes active, or a fresh blank one if none remain.
 */
export async function deleteCharacter(id: string): Promise<CharacterDoc> {
  await db.characters.delete(id);
  return loadOrCreateActive();
}
