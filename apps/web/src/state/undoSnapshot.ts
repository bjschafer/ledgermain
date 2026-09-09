/**
 * Undo history bookkeeping. Pure state machine — no React, no Dexie, no
 * persistence — so the tricky invariants (bounded depth, no oscillation, never
 * leaks across characters) are unit-testable without a DOM.
 * `state/useCharacter.ts` owns an instance of `UndoHistoryState` in a ref and
 * is the only caller.
 *
 * A stack, not a single slot: two damage taps in a fight used to leave only
 * the second one undoable, which is the wrong answer at exactly the moment a
 * player needs it. It is still not a redo stack — undo pops, and a popped
 * snapshot is gone.
 *
 * Rules:
 *   - `recordSnapshot` pushes, dropping the oldest entry past `HISTORY_LIMIT`.
 *   - `consumeSnapshot` pops. Popping is what keeps undo from oscillating: the
 *     doc it returns is never pushed back.
 *   - A snapshot for a different character than the one on screen is discarded
 *     rather than returned, and the whole stack is dropped by
 *     `invalidateSnapshot` on anything that swaps the active character out
 *     (switch/create/import/reset/delete, a remote pull/delete landing on the
 *     active doc, conflict resolution) — without it, undo could restore
 *     character A's doc onto character B.
 */
import type { CharacterDoc } from "@pf1/schema";

/**
 * How many steps back undo can go. Deep enough to walk out of a round's worth
 * of taps, shallow enough that a stack of whole documents stays small.
 */
export const HISTORY_LIMIT = 20;

export interface UndoHistoryState {
  /** Oldest first; the last entry is what the next undo restores. */
  history: CharacterDoc[];
}

export function createUndoHistoryState(): UndoHistoryState {
  return { history: [] };
}

/**
 * Record `before` as an undo point ahead of a just-committed transition.
 *
 * Idempotent for a document already on top of the stack. The caller records
 * from inside a `setDoc` updater, and React does not promise to invoke one
 * exactly once — under StrictMode it always runs them twice. Two pushes of the
 * *same object* are always that, never two real transitions: every transition
 * produces a fresh document, so a genuine second edit can never arrive
 * reference-equal to the first. Without this guard one tap would cost two
 * presses to walk back, the second of them a visible no-op.
 */
export function recordSnapshot(state: UndoHistoryState, before: CharacterDoc): void {
  if (state.history[state.history.length - 1] === before) return;
  state.history.push(before);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
}

/** Drop the whole history (the active character is about to change out from under it). */
export function invalidateSnapshot(state: UndoHistoryState): void {
  state.history = [];
}

/** How many steps back undo can currently go. */
export function undoDepth(state: UndoHistoryState): number {
  return state.history.length;
}

/**
 * Pop one step for undo. Returns `null` — restoring nothing — when the history
 * is empty, or when the newest snapshot belongs to a different character than
 * `activeId` (belt-and-suspenders: callers already invalidate on every
 * character switch, but this guarantees the cross-character write can never
 * happen even if one is missed). A mismatched snapshot is discarded along with
 * the rest of the history rather than left to be hit again on the next press.
 */
export function consumeSnapshot(state: UndoHistoryState, activeId: string): CharacterDoc | null {
  const snapshot = state.history.pop();
  if (!snapshot) return null;
  if (snapshot.id !== activeId) {
    state.history = [];
    return null;
  }
  return snapshot;
}
