import type { SyncConflict } from "./planSync.js";

/**
 * What `useCharacter.ts` surfaces to the UI about background sync.
 * `"disabled"` (no `VITE_API_URL` configured) and `"signed-out"` (configured,
 * but no valid session) are kept distinct rather than collapsed, since the
 * UI needs to know whether to show a sign-in prompt at all.
 */
export type SyncStatus =
  | { kind: "disabled" }
  | { kind: "signed-out" }
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; conflict: SyncConflict };
