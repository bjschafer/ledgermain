/**
 * Undo history bookkeeping. Pure state machine — no React, no Dexie, no
 * persistence — so the tricky invariants (bounded depth, no oscillation, never
 * leaks across characters) are unit-testable without a DOM.
 * `state/useCharacter.ts` owns an instance of `UndoHistoryState` in a ref and
 * is the only caller.
 *
 * Undo is scoped to the session log: every step is a change that wrote a log
 * line, and undoing it takes that line back out. A change the log doesn't
 * record (a build edit, a note, the round clock) is never a step of its own.
 *
 * Undo is exact or unavailable, never approximately right. An unlogged change
 * is copied into each step already on the stack only where that step's own
 * change is not pending: wherever the step's saved doc still holds the very
 * same object the unlogged change started from. Where it doesn't, the two
 * changes touched the same thing and no copy could be trusted, so that step
 * and every step older than it are dropped (`rebaseHistory`).
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

/** Returned by {@link carryExact} when `target` can't take the change exactly. */
export const CONFLICT: unique symbol = Symbol("undo conflict");

/**
 * `target` with the change from `before` to `after` applied, or `CONFLICT`.
 *
 * Docs are immutable with structural sharing, so wherever `target` holds the
 * same object as `before`, nothing else changed it there and `after` drops in
 * exactly. Plain objects are descended into key by key to find those spots;
 * anything else that moved (a list, a number) where `target` differs from
 * `before` is a conflict. Nothing is merged.
 */
export function carryExact<T>(target: T, before: T, after: T): T | typeof CONFLICT {
  if (before === after) return target;
  if (target === before) return after;
  if (!isPlainObject(before) || !isPlainObject(after) || !isPlainObject(target)) return CONFLICT;
  const out: Record<string, unknown> = { ...target };
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] === after[key]) continue;
    const next = carryExact(target[key], before[key], after[key]);
    if (next === CONFLICT) return CONFLICT;
    if (key in after) out[key] = next;
    else delete out[key];
  }
  return out as T;
}

/**
 * Every edit bumps `version` (and saving stamps `updatedAt`), so those two
 * would read as a conflict on every carry. They are sync bookkeeping, not
 * character state, and undo re-stamps `version` when it restores anyway.
 */
function withoutSyncStamp(doc: CharacterDoc): CharacterDoc {
  return { ...doc, version: 0, updatedAt: "" };
}

/**
 * Fold an unlogged transition (`before` → `after`) into the stack. Steps it
 * carries into exactly are kept; the newest step it conflicts with is
 * dropped together with everything older, since undoing past it would mean
 * restoring through the conflict.
 */
export function rebaseHistory(
  state: UndoHistoryState,
  before: CharacterDoc,
  after: CharacterDoc,
): void {
  if (before === after) return;
  const from = withoutSyncStamp(before);
  const to = withoutSyncStamp(after);
  const kept: UndoStep[] = [];
  for (let i = state.history.length - 1; i >= 0; i--) {
    const step = state.history[i]!;
    const doc = carryExact(withoutSyncStamp(step.doc), from, to);
    if (doc === CONFLICT) break;
    kept.unshift({
      ...step,
      doc: { ...doc, version: step.doc.version, updatedAt: step.doc.updatedAt },
    });
  }
  state.history = kept;
}

/**
 * Feed one committed transition to the history: a logged one (`logEntryId`
 * set) becomes a step, an unlogged one is folded into the steps already there.
 */
export function observeTransition(
  state: UndoHistoryState,
  before: CharacterDoc,
  after: CharacterDoc,
  logEntryId: string | null,
): void {
  if (logEntryId === null) rebaseHistory(state, before, after);
  else recordSnapshot(state, before, logEntryId);
}

/** Drop the whole history (the active character is about to change out from under it). */
export function invalidateSnapshot(state: UndoHistoryState): void {
  state.history = [];
}

/** The log line the next undo would take back, if there is a step to undo. */
export function nextUndoLine(state: UndoHistoryState): string | undefined {
  return state.history[state.history.length - 1]?.logEntryId;
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
