/**
 * Thin orchestration over `client.ts` (HTTP) and `planSync.ts` (pure
 * decisions) — the only sync module that talks to both I/O *and* decision
 * logic at once, kept this small precisely so `planSync.ts` stays testable
 * without mocking `fetch`. `useCharacter.ts` is the only caller; storage
 * access is injected via `SyncStore` so this module never imports Dexie
 * directly (see `sync/store.ts` for the real adapter, and
 * `test/sync.backgroundSync.test.ts` for a fake one).
 */
import type { CharacterDoc } from "@pf1/schema";

import { migrateDoc } from "../model/migrations.js";

import {
  fetchRemoteCharacter,
  isUnauthorized,
  listRemoteCharacters,
  pushCharacter,
} from "./client.js";
import { planSync, sameContent, type LocalSummary, type SyncConflict } from "./planSync.js";

export interface SyncStore {
  list(): Promise<LocalSummary[]>;
  get(id: string): Promise<CharacterDoc | undefined>;
  put(doc: CharacterDoc): Promise<void>;
  delete(id: string): Promise<void>;
  /** Record that this device and the server agree on `version` for `id`. */
  markSynced(id: string, version: number): Promise<void>;
  syncedVersion(id: string): Promise<number | undefined>;
}

export interface OpenSyncResult {
  pulled: string[];
  pushed: string[];
  /** Locally-dropped ids because the server holds a delete tombstone. */
  deleted: string[];
  /** Both sides edited since they last agreed; the user has to pick. */
  conflicts: SyncConflict[];
  errors: { id: string; message: string }[];
}

/**
 * A full reconcile pass: DESIGN.md §2.1's "each device pulls the latest on
 * open", also re-run whenever the app regains focus or connectivity so a tab
 * left open for days catches up, and so edits a failed push left behind go
 * out. Never await this before rendering the UI (the app must stay fully
 * usable offline/before this resolves).
 *
 * Throws on a rejected session (`isUnauthorized`), even mid-pass: that is
 * the one failure the caller must surface loudly rather than log per doc.
 */
export async function runOpenSync(
  apiBase: string,
  token: string,
  store: SyncStore,
): Promise<OpenSyncResult> {
  const result: OpenSyncResult = {
    pulled: [],
    pushed: [],
    deleted: [],
    conflicts: [],
    errors: [],
  };
  const [locals, listing] = await Promise.all([store.list(), listRemoteCharacters(apiBase, token)]);
  const actions = planSync(locals, listing.characters, listing.tombstones);
  const localById = new Map(locals.map((l) => [l.id, l]));

  /* oxlint-disable no-await-in-loop -- per-doc actions are deliberately
     sequential: the count is small (one user's characters), failures stay
     isolated per doc, and it avoids a request burst on app open. */
  for (const action of actions) {
    try {
      if (action.kind === "pull") {
        const remoteDoc = await fetchRemoteCharacter(apiBase, token, action.id);
        if (remoteDoc) {
          await store.put(remoteDoc);
          await store.markSynced(action.id, remoteDoc.version);
          result.pulled.push(action.id);
        }
      } else if (action.kind === "delete-local") {
        // The server holds a delete tombstone for a character we still have
        // locally — drop it here rather than pushing it back up.
        await store.delete(action.id);
        result.deleted.push(action.id);
      } else if (action.kind === "push") {
        const localDoc = await store.get(action.id);
        if (!localDoc) continue; // planned from a since-changed local summary; nothing left to push
        const pushResult = await pushCharacter(
          apiBase,
          token,
          localDoc,
          localById.get(action.id)?.syncedVersion,
        );
        if (pushResult.kind === "ok") {
          await store.markSynced(action.id, localDoc.version);
          result.pushed.push(action.id);
        } else {
          // Another device pushed between our list() call and this push.
          result.conflicts.push({ local: localDoc, remote: pushResult.current });
        }
      } else if (action.kind === "conflict") {
        const [localDoc, remoteDoc] = await Promise.all([
          store.get(action.id),
          fetchRemoteCharacter(apiBase, token, action.id),
        ]);
        if (!localDoc || !remoteDoc) continue; // one side vanished mid-pass; the next pass replans
        // Migrated first so a copy last written by an older build doesn't
        // read as an edit.
        if (sameContent(migrateDoc(localDoc), migrateDoc(remoteDoc))) {
          // Diverged in envelope only, e.g. a device that never synced since
          // this was tracked: adopt the server's copy, nothing to ask about.
          await store.put(remoteDoc);
          await store.markSynced(action.id, remoteDoc.version);
          result.pulled.push(action.id);
        } else {
          result.conflicts.push({ local: localDoc, remote: remoteDoc });
        }
      }
    } catch (e) {
      if (isUnauthorized(e)) throw e;
      result.errors.push({ id: action.id, message: e instanceof Error ? e.message : String(e) });
    }
  }
  /* oxlint-enable no-await-in-loop */
  return result;
}

export type PushOutcome =
  | { kind: "ok" }
  | { kind: "conflict"; conflict: SyncConflict }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

/**
 * DESIGN §2.1's "and pushes on change" half — call after every local save.
 * Never throws: a flaky connection, a stale-version 409, and a rejected
 * session all resolve to a `PushOutcome` for the caller to inspect, rather
 * than bubbling into the doc-editing path. This is what makes sync genuinely
 * best-effort — nothing here can block or fail a local edit.
 */
export async function pushOnChange(
  apiBase: string,
  token: string,
  doc: CharacterDoc,
  store: SyncStore,
): Promise<PushOutcome> {
  try {
    const base = await store.syncedVersion(doc.id);
    // A sync pass already sent this version or a later one; re-sending an
    // older copy would roll the server back.
    if (base !== undefined && doc.version <= base) return { kind: "ok" };
    const result = await pushCharacter(apiBase, token, doc, base);
    if (result.kind === "ok") {
      await store.markSynced(doc.id, doc.version);
      return { kind: "ok" };
    }
    return { kind: "conflict", conflict: { local: doc, remote: result.current } };
  } catch (e) {
    if (isUnauthorized(e)) return { kind: "unauthorized" };
    return { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
