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
 * finds exactly what a transition touched. Plain objects merge key by key and
 * arrays item by item (`carryArray`), so a change to one buff or one prepared
 * spell never drags its neighbours' state along with it.
 */
export function carryChanges<T>(target: T, before: T, after: T): T {
  if (before === after) return target;
  if (Array.isArray(before) && Array.isArray(after) && Array.isArray(target)) {
    return carryArray(target, before, after) as T;
  }
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

/** The `instanceId` of each item, or `null` unless every item has a distinct one. */
function instanceIds(list: readonly unknown[]): string[] | null {
  const ids = list.map((item) =>
    isPlainObject(item) && typeof item.instanceId === "string" ? item.instanceId : null,
  );
  if (ids.some((id) => id === null)) return null;
  return new Set(ids).size === ids.length ? (ids as string[]) : null;
}

function distinctPrimitives(list: readonly unknown[]): boolean {
  return (
    list.every((item) => item === null || typeof item !== "object") &&
    new Set(list).size === list.length
  );
}

/**
 * Three ways to line items up, strongest first:
 *  - by `instanceId` (active buffs): edits, removals and additions each apply
 *    to the matching item, wherever it sits in `target`.
 *  - as a set (condition ids): drop what `after` dropped, append what it added.
 *  - by position (prepared spells), valid only while `target` still has the
 *    same length as `before`. Same length means items edited in place; a
 *    different length is matched by reference to find what was inserted and
 *    removed.
 * Anything none of them fits takes `after` whole.
 */
function carryArray(target: unknown[], before: unknown[], after: unknown[]): unknown[] {
  if (target === before) return after;

  const targetIds = instanceIds(target);
  const beforeIds = instanceIds(before);
  const afterIds = instanceIds(after);
  if (targetIds && beforeIds && afterIds) {
    const was = new Map(beforeIds.map((id, i) => [id, before[i]]));
    const is = new Map(afterIds.map((id, i) => [id, after[i]]));
    const out: unknown[] = [];
    targetIds.forEach((id, i) => {
      const prior = was.get(id);
      const next = is.get(id);
      if (prior === undefined) out.push(target[i]);
      else if (next !== undefined) out.push(carryChanges(target[i], prior, next));
    });
    const present = new Set(targetIds);
    afterIds.forEach((id, i) => {
      if (!was.has(id) && !present.has(id)) out.push(after[i]);
    });
    return out;
  }

  if (distinctPrimitives(target) && distinctPrimitives(before) && distinctPrimitives(after)) {
    const was = new Set(before);
    const is = new Set(after);
    const out = target.filter((item) => !was.has(item) || is.has(item));
    for (const item of after) if (!was.has(item) && !out.includes(item)) out.push(item);
    return out;
  }

  if (target.length !== before.length) return after;
  if (before.length === after.length) {
    return target.map((item, i) => carryChanges(item, before[i], after[i]));
  }
  return spliceByReference(target, before, after);
}

/**
 * Replay the inserts and removals that turned `before` into `after` onto
 * `target`, a same-length sibling of `before`. Items are matched by
 * reference along a longest common subsequence; each kept `before` item
 * stands in for the `target` item at the same index.
 */
function spliceByReference(target: unknown[], before: unknown[], after: unknown[]): unknown[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        before[i] === after[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: unknown[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      out.push(target[i]);
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) {
      out.push(after[j]);
      j++;
    } else {
      i++;
    }
  }
  return out;
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
