/**
 * One-deep undo snapshot bookkeeping (UX audit: "feedback: toasts + undo").
 * Pure state machine — no React, no Dexie, no persistence — so the tricky
 * invariants (single-step, no oscillation, never leaks across characters)
 * are unit-testable without a DOM. `state/useCharacter.ts` owns an instance
 * of `UndoSnapshotState` in a ref and is the only caller.
 *
 * Rules:
 *   - `recordSnapshot` overwrites whatever was there — only ever one deep.
 *   - `consumeSnapshot` always clears the pointer, even when it declines to
 *     return a doc (mismatched id) — so a stale snapshot can never be
 *     consumed twice, and undo is genuinely single-step (pressing it twice
 *     doesn't oscillate back to the pre-undo state).
 *   - `invalidateSnapshot` is for anything that swaps the active character
 *     out from under the snapshot (switch/create/import/reset/delete, a
 *     remote pull/delete landing on the active doc, conflict resolution) —
 *     without it, undo could restore character A's doc onto character B.
 */
import type { CharacterDoc } from "@pf1/schema";

export interface UndoSnapshotState {
  snapshot: CharacterDoc | null;
}

export function createUndoSnapshotState(): UndoSnapshotState {
  return { snapshot: null };
}

/** Record `before` as the one-deep undo point ahead of a just-committed transition. */
export function recordSnapshot(state: UndoSnapshotState, before: CharacterDoc): void {
  state.snapshot = before;
}

/** Drop the snapshot without consuming it (the active character is about to change out from under it). */
export function invalidateSnapshot(state: UndoSnapshotState): void {
  state.snapshot = null;
}

/**
 * Consume the snapshot for a one-step undo. Always clears the pointer
 * (single-step: a second call returns `null`). Returns `null` — without
 * restoring anything — if there is no snapshot, or if it belongs to a
 * different character than `activeId` (belt-and-suspenders: callers should
 * already invalidate on every character switch, but this guarantees the
 * cross-character write can never happen even if one is missed).
 */
export function consumeSnapshot(state: UndoSnapshotState, activeId: string): CharacterDoc | null {
  const snapshot = state.snapshot;
  state.snapshot = null;
  if (!snapshot || snapshot.id !== activeId) return null;
  return snapshot;
}
