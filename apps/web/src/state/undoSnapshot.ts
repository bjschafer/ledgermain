/**
 * Undo history bookkeeping. Pure state machine — no React, no Dexie, no
 * persistence — so the tricky invariants (bounded depth, no oscillation, never
 * leaks across characters) are unit-testable without a DOM.
 * `state/useCharacter.ts` owns an instance of `UndoHistoryState` in a ref and
 * is the only caller.
 *
 * Undo is scoped to the session log: every step is a change that wrote a log
 * line, and undoing it takes that line back out. A change the log doesn't
 * record (a build edit, a note) is never a step of its own. It is carried
 * forward into every step already on the stack instead (`rebaseHistory`), so
 * walking back a logged hit restores the HP without also reverting the note
 * typed after it.
 *
 * Rules:
 *   - `recordSnapshot` pushes, dropping the oldest entry past `HISTORY_LIMIT`.
 *   - `consumeSnapshot` pops. Popping is what keeps undo from oscillating: the
 *     doc it returns is never pushed back. It is not a redo stack.
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

export interface UndoStep {
  /** The doc as it was before the step: what undoing it restores. */
  doc: CharacterDoc;
  /** The session-log line the step wrote. */
  logEntryId: string;
}

export interface UndoHistoryState {
  /** Oldest first; the last entry is what the next undo restores. */
  history: UndoStep[];
}

export function createUndoHistoryState(): UndoHistoryState {
  return { history: [] };
}

/**
 * Record `before` as an undo point ahead of a logged transition.
 *
 * Idempotent for a document already on top of the stack: every transition
 * produces a fresh document, so a second push of the same object can only be
 * the same transition seen twice.
 */
export function recordSnapshot(
  state: UndoHistoryState,
  before: CharacterDoc,
  logEntryId: string,
): void {
  if (state.history[state.history.length - 1]?.doc === before) return;
  state.history.push({ doc: before, logEntryId });
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `target` with every part that moved between `before` and `after` taken from
 * `after`. Docs are immutable with structural sharing, so reference equality
 * finds exactly what a transition touched; it recurses through plain objects
 * and replaces arrays and leaves whole.
 */
export function carryChanges<T>(target: T, before: T, after: T): T {
  if (before === after) return target;
  if (!isPlainObject(before) || !isPlainObject(after) || !isPlainObject(target)) return after;
  let out: Record<string, unknown> | undefined;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] === after[key]) continue;
    out ??= { ...target };
    if (key in after) out[key] = carryChanges(target[key], before[key], after[key]);
    else delete out[key];
  }
  return (out ?? target) as T;
}

/**
 * Fold an unlogged transition (`before` → `after`) into every step on the
 * stack, so no later undo reverts it.
 */
export function rebaseHistory(
  state: UndoHistoryState,
  before: CharacterDoc,
  after: CharacterDoc,
): void {
  if (before === after) return;
  for (const step of state.history) step.doc = carryChanges(step.doc, before, after);
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
export function consumeSnapshot(state: UndoHistoryState, activeId: string): UndoStep | null {
  const snapshot = state.history.pop();
  if (!snapshot) return null;
  if (snapshot.doc.id !== activeId) {
    state.history = [];
    return null;
  }
  return snapshot;
}
