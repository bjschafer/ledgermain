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

/** A local character's envelope, plus the server version this device last agreed with. */
export interface LocalSummary extends VersionedSummary {
  /** Absent for a character this device has never synced (or synced before this was tracked). */
  syncedVersion?: number;
}

export type SyncAction =
  | { kind: "push"; id: string }
  | { kind: "pull"; id: string }
  | { kind: "same"; id: string }
  | { kind: "delete-local"; id: string }
  | { kind: "conflict"; id: string };

/**
 * Decide what one character id needs (DESIGN.md §2.1: "each device pulls the
 * latest on open and pushes on change"). `version` is a monotonic counter
 * bumped on every local edit, and `syncedVersion` is the server version this
 * device last pushed or pulled: the common ancestor. Comparing both sides to
 * it is what tells "only one side moved" from "both did". Comparing the two
 * versions to each other can't: a device that made more edits offline would
 * look "ahead" and silently overwrite the other device's work, or be
 * silently overwritten by it.
 *
 * - `tombstoned` (the server holds a delete record for this id) → the deletion
 *   wins: drop any local copy, and never pull it back. This is a deliberate
 *   delete-wins policy — a character deleted on one device propagates to the
 *   others rather than resurfacing, even if another device had unsynced edits
 *   to it (acceptable for a single-user tool). A device that legitimately
 *   revives a character re-pushes it, which clears the server tombstone
 *   (`apps/api` putCharacter), so this only ever fires for a genuinely-deleted
 *   id.
 * - No remote copy at all → this device has the only copy; push it up.
 * - No local copy → another device created/owns it; pull it down.
 * - Only local moved since the last sync → push. Only remote moved → pull.
 *   Neither → nothing to do.
 * - Both moved, or there's no record of a last sync to tell → conflict. Equal
 *   versions don't rule that out: five edits on each device from the same
 *   base land both on the same number. The caller compares contents before
 *   asking the user, so a conflict that isn't one costs a fetch, not a prompt.
 */
export function planAction(
  local: LocalSummary | undefined,
  remote: VersionedSummary | undefined,
  id: string,
  tombstoned = false,
): SyncAction {
  if (tombstoned) return local ? { kind: "delete-local", id } : { kind: "same", id };
  if (!remote) return { kind: "push", id };
  if (!local) return { kind: "pull", id };
  const base = local.syncedVersion;
  if (base === undefined) return { kind: "conflict", id };
  const localMoved = local.version !== base;
  const remoteMoved = remote.version !== base;
  if (localMoved && remoteMoved) return { kind: "conflict", id };
  if (localMoved) return { kind: "push", id };
  return remoteMoved ? { kind: "pull", id } : { kind: "same", id };
}

/** Plan a full on-open sync pass across every character known locally and/or remotely. */
export function planSync(
  locals: LocalSummary[],
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
 * True when two copies differ only in their sync envelope. Two devices that
 * made no real edits, or the same one, don't need the user to pick a side.
 */
export function sameContent(a: CharacterDoc, b: CharacterDoc): boolean {
  const strip = ({ version: _v, updatedAt: _u, ownerId: _o, ...rest }: CharacterDoc) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
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
 * "Keep both": the other device's copy keeps this id, and the local edits
 * become a separate character, so nothing either device did is lost.
 */
export function splitConflict(
  conflict: SyncConflict,
  newId: string,
  now: string,
): { remote: CharacterDoc; copy: CharacterDoc } {
  const { local } = conflict;
  return {
    remote: conflict.remote,
    copy: {
      ...local,
      id: newId,
      identity: { ...local.identity, name: `${local.identity.name || "Unnamed"} (copy)` },
      version: 1,
      updatedAt: now,
    },
  };
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
