/**
 * `state/undoSnapshot.ts` is the pure bookkeeping extracted from
 * `useCharacter.ts`'s undo so its invariants — bounded depth, no oscillation,
 * never leaks across characters — are testable without a DOM/React harness
 * (the hook itself has no existing test coverage; see `apps/web/test/` for the
 * established "logic in model/state, tested directly" pattern this mirrors).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  consumeSnapshot,
  createUndoHistoryState,
  HISTORY_LIMIT,
  invalidateSnapshot,
  recordSnapshot,
  CONFLICT,
  carryExact,
  nextUndoLine,
  rebaseHistory,
  undoDepth,
} from "../src/state/undoSnapshot.js";

/** A distinguishable doc for `id`, so `toBe` identity checks say which one came back. */
function docNamed(id: string, name: string) {
  const doc = createEmptyDoc(id);
  return { ...doc, identity: { ...doc.identity, name } };
}

describe("undoSnapshot", () => {
  it("consumeSnapshot restores the recorded (pre-transition) doc", () => {
    const state = createUndoHistoryState();
    const before = createEmptyDoc("char-1");
    recordSnapshot(state, before, "log");

    expect(consumeSnapshot(state, "char-1")?.doc).toBe(before);
  });

  it("walks back through several steps, newest first", () => {
    const state = createUndoHistoryState();
    const first = docNamed("char-1", "First");
    const second = docNamed("char-1", "Second");
    recordSnapshot(state, first, "log");
    recordSnapshot(state, second, "log");

    expect(undoDepth(state)).toBe(2);
    expect(consumeSnapshot(state, "char-1")?.doc).toBe(second);
    expect(consumeSnapshot(state, "char-1")?.doc).toBe(first);
    expect(consumeSnapshot(state, "char-1")).toBeNull();
  });

  it("ignores a repeat record of the doc already on top (a re-invoked updater)", () => {
    const state = createUndoHistoryState();
    const before = createEmptyDoc("char-1");
    recordSnapshot(state, before, "log");
    recordSnapshot(state, before, "log");

    expect(undoDepth(state)).toBe(1);
  });

  it("still records two transitions that happen to look alike", () => {
    const state = createUndoHistoryState();
    recordSnapshot(state, createEmptyDoc("char-1"), "log");
    recordSnapshot(state, createEmptyDoc("char-1"), "log");

    expect(undoDepth(state)).toBe(2);
  });

  it("pops rather than re-arming: an undone step is gone, not redoable", () => {
    const state = createUndoHistoryState();
    const before = createEmptyDoc("char-1");
    recordSnapshot(state, before, "log");

    expect(consumeSnapshot(state, "char-1")?.doc).toBe(before);
    expect(undoDepth(state)).toBe(0);
  });

  it("drops the oldest entry past the history limit", () => {
    const state = createUndoHistoryState();
    const oldest = docNamed("char-1", "Oldest");
    recordSnapshot(state, oldest, "log");
    for (let i = 0; i < HISTORY_LIMIT; i += 1)
      recordSnapshot(state, docNamed("char-1", `${i}`), "log");

    expect(undoDepth(state)).toBe(HISTORY_LIMIT);
    // Walk all the way back: the very first snapshot fell off the end.
    const seen: unknown[] = [];
    for (let i = 0; i < HISTORY_LIMIT; i += 1) seen.push(consumeSnapshot(state, "char-1")?.doc);
    expect(seen).not.toContain(oldest);
  });

  it("invalidateSnapshot clears the history without returning it (switching characters)", () => {
    const state = createUndoHistoryState();
    recordSnapshot(state, createEmptyDoc("char-1"), "log");
    recordSnapshot(state, createEmptyDoc("char-1"), "log");
    invalidateSnapshot(state);

    expect(consumeSnapshot(state, "char-1")).toBeNull();
  });

  it("never restores a snapshot recorded for a different character (belt-and-suspenders)", () => {
    const state = createUndoHistoryState();
    recordSnapshot(state, createEmptyDoc("char-A"), "log");
    recordSnapshot(state, createEmptyDoc("char-A"), "log");

    // Even without an explicit invalidate call, a mismatched active id refuses
    // to hand back char A's docs — and drops the rest of the history with them,
    // so a second press can't reach the ones underneath either.
    expect(consumeSnapshot(state, "char-B")).toBeNull();
    expect(consumeSnapshot(state, "char-A")).toBeNull();
  });

  it("hands back the log line a step wrote, so undo can take it out", () => {
    const state = createUndoHistoryState();
    recordSnapshot(state, docNamed("char-1", "First"), "log-1");
    recordSnapshot(state, docNamed("char-1", "Second"), "log-2");

    expect(consumeSnapshot(state, "char-1")?.logEntryId).toBe("log-2");
    expect(consumeSnapshot(state, "char-1")?.logEntryId).toBe("log-1");
  });

  it("carries an unlogged edit into every step, so undoing a hit keeps the note", () => {
    const state = createUndoHistoryState();
    const fresh = createEmptyDoc("char-1");
    const hurt = { ...fresh, live: { ...fresh.live, hp: { ...fresh.live.hp, current: 5 } } };
    recordSnapshot(state, fresh, "log-1");
    const noted = { ...hurt, identity: { ...hurt.identity, name: "Renamed" } };
    rebaseHistory(state, hurt, noted);

    const restored = consumeSnapshot(state, "char-1")?.doc;
    expect(restored?.identity.name).toBe("Renamed");
    expect(restored?.live.hp).toBe(fresh.live.hp);
  });

  it("carryExact drops the change in wherever the target still holds the original", () => {
    const shared = { x: 1 };
    // Untouched by the change, so `before` and `after` share it, as real docs do.
    const untouched = [2];
    const target = { a: shared, b: [1], c: 1 } as Record<string, unknown>;
    const before = { a: shared, b: untouched, c: 1 } as Record<string, unknown>;
    const after = { a: { x: 9 }, b: untouched, c: 1 } as Record<string, unknown>;

    expect(carryExact(target, before, after)).toEqual({ a: { x: 9 }, b: [1], c: 1 });
    expect(carryExact(target, before, before)).toBe(target);
  });

  it("carryExact refuses rather than merges when the target changed the same spot", () => {
    const target = { list: [1, 2] } as Record<string, unknown>;
    const before = { list: [1] } as Record<string, unknown>;
    const after = { list: [1, 3] } as Record<string, unknown>;

    expect(carryExact(target, before, after)).toBe(CONFLICT);
  });

  it("a conflict drops that step and everything older, and keeps what's newer", () => {
    const state = createUndoHistoryState();
    const start = createEmptyDoc("char-1");
    const proned = { ...start, live: { ...start.live, conditions: ["prone"] } };
    recordSnapshot(state, start, "prone");
    const hurt = { ...proned, live: { ...proned.live, hp: { ...proned.live.hp, current: 3 } } };
    recordSnapshot(state, proned, "hurt");
    // An unlogged edit to the conditions list collides with the Prone step only.
    const edited = { ...hurt, live: { ...hurt.live, conditions: ["prone", "shaken"] } };
    rebaseHistory(state, hurt, edited);

    expect(undoDepth(state)).toBe(1);
    expect(nextUndoLine(state)).toBe("hurt");
    expect(consumeSnapshot(state, "char-1")?.doc.live.conditions).toEqual(["prone", "shaken"]);
  });

  it("a version bump alone is never a conflict", () => {
    const state = createUndoHistoryState();
    const start = createEmptyDoc("char-1");
    const hurt = {
      ...start,
      version: 2,
      live: { ...start.live, hp: { ...start.live.hp, current: 3 } },
    };
    recordSnapshot(state, start, "hurt");
    const renamed = { ...hurt, version: 3, identity: { ...hurt.identity, name: "Renamed" } };
    rebaseHistory(state, hurt, renamed);

    const restored = consumeSnapshot(state, "char-1")?.doc;
    expect(restored?.identity.name).toBe("Renamed");
    expect(restored?.version).toBe(start.version);
  });

  it("consumeSnapshot on an empty state returns null", () => {
    const state = createUndoHistoryState();
    expect(consumeSnapshot(state, "char-1")).toBeNull();
  });
});
