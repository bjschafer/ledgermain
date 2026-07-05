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
  | { kind: "same"; id: string }
  | { kind: "delete-local"; id: string };

/**
 * Decide what one character id needs, on app open (DESIGN.md §2.1: "each
 * device pulls the latest on open and pushes on change"). `version` is a
 * monotonic counter bumped on every local save (`db/characters.ts
 * saveCharacter`) and on every successful server write, so "higher version
 * wins" is unambiguous in either direction — there is no merge, only a
 * choice of which side is already caught up:
 *
 * - `tombstoned` (the server holds a delete record for this id, issue #39) →
 *   the deletion wins: drop any local copy, and never pull it back. This is a
 *   deliberate delete-wins policy — a character deleted on one device
 *   propagates to the others rather than resurfacing, even if another device
 *   had unsynced edits to it (acceptable for a single-user tool). A device
 *   that legitimately revives a character re-pushes it, which clears the
 *   server tombstone (`apps/api` putCharacter), so this only ever fires for a
 *   genuinely-deleted id.
 * - No remote copy at all → this device has the only copy; push it up.
 * - No local copy → another device created/owns it; pull it down.
 * - Local ahead → push. Remote ahead → pull. Equal → nothing to do.
 */
export function planAction(
  local: VersionedSummary | undefined,
  remote: VersionedSummary | undefined,
  id: string,
  tombstoned = false,
): SyncAction {
  if (tombstoned) return local ? { kind: "delete-local", id } : { kind: "same", id };
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
  tombstones: { id: string }[] = [],
): SyncAction[] {
  const localById = new Map(locals.map((l) => [l.id, l]));
  const remoteById = new Map(remotes.map((r) => [r.id, r]));
  const tombstonedIds = new Set(tombstones.map((t) => t.id));
  const ids = new Set([...localById.keys(), ...remoteById.keys()]);
  return [...ids].map((id) =>
    planAction(localById.get(id), remoteById.get(id), id, tombstonedIds.has(id)),
  );
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
