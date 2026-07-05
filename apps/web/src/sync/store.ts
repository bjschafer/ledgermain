/**
 * The only place `backgroundSync.ts`'s storage interface meets the real
 * Dexie database — kept separate so `backgroundSync.ts`/`planSync.ts` stay
 * testable against a fake `SyncStore` with no IndexedDB involved.
 */
import { db, listVersions } from "../db/characters.js";
import { migrateDoc } from "../model/doc.js";
import type { SyncStore } from "./backgroundSync.js";

export const dexieSyncStore: SyncStore = {
  list: listVersions,
  get: (id) => db.characters.get(id),
  // A doc pulled from another device may predate this device's schema
  // version — migrate it on the way in, same as every other read path
  // (db/characters.ts's loadCharacter/loadOrCreateActive).
  put: async (doc) => {
    await db.characters.put(migrateDoc(doc));
  },
  // Local drop of a server-tombstoned character during open-sync (#39). This
  // deletes only from Dexie — it never re-hits the API (the tombstone is
  // already the server's authoritative state).
  delete: (id) => db.characters.delete(id),
};
