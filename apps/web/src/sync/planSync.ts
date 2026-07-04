/**
 * Pure decision logic for background sync — no `fetch`, no Dexie, no React.
 * Kept separate from `backgroundSync.ts` (the thin orchestration layer) so
 * the actual sync *rules* are unit-testable without mocking I/O.
 */
import type { CharacterDoc } from "@pf1/schema";

export interface VersionedSummary {
  id: string;
  version: number;
}

export type SyncAction =
  | { kind: "push"; id: string }
  | { kind: "pull"; id: string }
  | { kind: "same"; id: string };

/**
 * Decide what one character id needs, on app open (DESIGN.md §2.1: "each
 * device pulls the latest on open and pushes on change"). `version` is a
 * monotonic counter bumped on every local save (`db/characters.ts
 * saveCharacter`) and on every successful server write, so "higher version
 * wins" is unambiguous in either direction — there is no merge, only a
 * choice of which side is already caught up:
 *
 * - No remote copy at all → this device has the only copy; push it up.
 * - No local copy → another device created/owns it; pull it down.
 * - Local ahead → push. Remote ahead → pull. Equal → nothing to do.
 *
 * Known v1 gap (documented, not silently swallowed): a character deleted on
 * one device but never deleted remotely (e.g. offline at delete time) will
 * resurface as a "pull" here, since there's no tombstone to distinguish
 * "never existed yet" from "existed and was deleted." Acceptable for a
 * single-user tool; would need explicit tombstones to fix.
 */
export function planAction(
  local: VersionedSummary | undefined,
  remote: VersionedSummary | undefined,
  id: string,
): SyncAction {
  if (!remote) return { kind: "push", id };
  if (!local) return { kind: "pull", id };
  if (local.version > remote.version) return { kind: "push", id };
  if (remote.version > local.version) return { kind: "pull", id };
  return { kind: "same", id };
}

/** Plan a full on-open sync pass across every character known locally and/or remotely. */
export function planSync(
  locals: VersionedSummary[],
  remotes: VersionedSummary[],
): SyncAction[] {
  const localById = new Map(locals.map((l) => [l.id, l]));
  const remoteById = new Map(remotes.map((r) => [r.id, r]));
  const ids = new Set([...localById.keys(), ...remoteById.keys()]);
  return [...ids].map((id) => planAction(localById.get(id), remoteById.get(id), id));
}

/**
 * A push attempt's server-reported conflict (DESIGN §2.1: "the server
 * rejects a stale write and the client prompts 'a newer version exists on
 * another device — reload?'"). This module only models the two possible
 * resolutions; the UI decides which one the user picked (`useCharacter.ts`
 * exposes both, never auto-picks one — DESIGN requires a prompt, not a
 * silent merge).
 */
export interface SyncConflict {
  local: CharacterDoc;
  remote: CharacterDoc;
}

/** "Reload": discard the local unsynced edits and adopt the server's copy. */
export function acceptRemoteDoc(conflict: SyncConflict): CharacterDoc {
  return conflict.remote;
}

/**
 * "Overwrite": keep the local edits, but bump `version` past the remote's so
 * the next push attempt is no longer stale. This is a deliberate user choice
 * ("my local edits win"), never an automatic fallback.
 */
export function forceOverwriteDoc(conflict: SyncConflict): CharacterDoc {
  return {
    ...conflict.local,
    version: Math.max(conflict.local.version, conflict.remote.version) + 1,
  };
}
