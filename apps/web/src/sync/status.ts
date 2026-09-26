import type { SyncConflict } from "./planSync.js";

/**
 * What `useCharacter.ts` surfaces to the UI about background sync.
 * `"disabled"` (no `VITE_API_URL` configured) and `"signed-out"` (configured,
 * but no valid session) are kept distinct rather than collapsed, since the
 * UI needs to know whether to show a sign-in prompt at all. `"expired"` is
 * signed out too, but not by choice: this device was syncing and the server
 * stopped accepting its session, so edits here have stopped reaching other
 * devices and the player needs to be told, not quietly offered a button.
 */
export type SyncStatus =
  | { kind: "disabled" }
  | { kind: "signed-out" }
  | { kind: "expired" }
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; conflict: SyncConflict; queued: number };
