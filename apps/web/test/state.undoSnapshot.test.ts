/**
 * `state/undoSnapshot.ts` is the pure bookkeeping extracted from
 * `useCharacter.ts`'s one-step undo (feedback/toasts+undo audit slice) so its
 * invariants — single-step, no oscillation, never leaks across characters —
 * are testable without a DOM/React harness (the hook itself has no existing
 * test coverage; see `apps/web/test/` for the established "logic in
 * model/state, tested directly" pattern this mirrors).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  consumeSnapshot,
  createUndoSnapshotState,
  invalidateSnapshot,
  recordSnapshot,
} from "../src/state/undoSnapshot.js";

describe("undoSnapshot", () => {
  it("consumeSnapshot restores the recorded (pre-transition) doc", () => {
    const state = createUndoSnapshotState();
    const before = createEmptyDoc("char-1");
    recordSnapshot(state, before);

    const restored = consumeSnapshot(state, "char-1");
    expect(restored).toBe(before);
  });

  it("is single-step: consuming twice returns null the second time (no oscillation)", () => {
    const state = createUndoSnapshotState();
    const before = createEmptyDoc("char-1");
    recordSnapshot(state, before);

    expect(consumeSnapshot(state, "char-1")).toBe(before);
    expect(consumeSnapshot(state, "char-1")).toBeNull();
  });

  it("recordSnapshot only keeps one level deep — a second record overwrites the first", () => {
    const state = createUndoSnapshotState();
    const first = createEmptyDoc("char-1");
    const second = { ...createEmptyDoc("char-1"), identity: { ...first.identity, name: "Second" } };
    recordSnapshot(state, first);
    recordSnapshot(state, second);

    expect(consumeSnapshot(state, "char-1")).toBe(second);
  });

  it("invalidateSnapshot clears the pointer without returning it (switching characters)", () => {
    const state = createUndoSnapshotState();
    recordSnapshot(state, createEmptyDoc("char-1"));
    invalidateSnapshot(state);

    expect(consumeSnapshot(state, "char-1")).toBeNull();
  });

  it("never restores a snapshot recorded for a different character (belt-and-suspenders)", () => {
    const state = createUndoSnapshotState();
    const charADoc = createEmptyDoc("char-A");
    recordSnapshot(state, charADoc);

    // Even without an explicit invalidate call, a mismatched active id refuses
    // to hand back char A's doc — and still clears the pointer.
    expect(consumeSnapshot(state, "char-B")).toBeNull();
    expect(consumeSnapshot(state, "char-A")).toBeNull();
  });

  it("consumeSnapshot on an empty state returns null", () => {
    const state = createUndoSnapshotState();
    expect(consumeSnapshot(state, "char-1")).toBeNull();
  });
});
