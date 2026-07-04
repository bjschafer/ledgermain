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

import { fetchRemoteCharacter, listRemoteCharacters, pushCharacter } from "./client.js";
import { planSync, type SyncConflict, type VersionedSummary } from "./planSync.js";

export interface SyncStore {
  list(): Promise<VersionedSummary[]>;
  get(id: string): Promise<CharacterDoc | undefined>;
  put(doc: CharacterDoc): Promise<void>;
}

export interface OpenSyncResult {
  pulled: string[];
  pushed: string[];
  errors: { id: string; message: string }[];
}

/**
 * DESIGN.md §2.1's "each device pulls the latest on open" half. Meant to run
 * once per app load, in the background — never await this before rendering
 * the UI (the app must stay fully usable offline/before this resolves).
 */
export async function runOpenSync(
  apiBase: string,
  token: string,
  store: SyncStore,
): Promise<OpenSyncResult> {
  const result: OpenSyncResult = { pulled: [], pushed: [], errors: [] };
  const [locals, remotes] = await Promise.all([store.list(), listRemoteCharacters(apiBase, token)]);
  const actions = planSync(locals, remotes);

  /* oxlint-disable no-await-in-loop -- per-doc actions are deliberately
     sequential: the count is small (one user's characters), failures stay
     isolated per doc, and it avoids a request burst on app open. */
  for (const action of actions) {
    try {
      if (action.kind === "pull") {
        const remoteDoc = await fetchRemoteCharacter(apiBase, token, action.id);
        if (remoteDoc) {
          await store.put(remoteDoc);
          result.pulled.push(action.id);
        }
      } else if (action.kind === "push") {
        const localDoc = await store.get(action.id);
        if (!localDoc) continue; // planned from a since-changed local summary; nothing left to push
        const pushResult = await pushCharacter(apiBase, token, localDoc);
        if (pushResult.kind === "ok") {
          result.pushed.push(action.id);
        } else {
          // A genuine race (another device pushed between our list() call
          // and this push) — surface it rather than silently picking a
          // side. The next open-sync pass, or the user's next edit
          // triggering `pushOnChange`, will reconcile it through the normal
          // conflict path.
          result.errors.push({ id: action.id, message: "conflict during open-sync push" });
        }
      }
    } catch (e) {
      result.errors.push({ id: action.id, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}

export type PushOutcome =
  | { kind: "ok" }
  | { kind: "conflict"; conflict: SyncConflict }
  | { kind: "error"; message: string };

/**
 * DESIGN §2.1's "and pushes on change" half — call after every local save.
 * Never throws: a flaky connection or a stale-version 409 both resolve to a
 * `PushOutcome` for the caller to inspect, rather than bubbling into the
 * doc-editing path. This is what makes sync genuinely best-effort — nothing
 * here can block or fail a local edit.
 */
export async function pushOnChange(
  apiBase: string,
  token: string,
  doc: CharacterDoc,
): Promise<PushOutcome> {
  try {
    const result = await pushCharacter(apiBase, token, doc);
    if (result.kind === "ok") return { kind: "ok" };
    return { kind: "conflict", conflict: { local: doc, remote: result.current } };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
