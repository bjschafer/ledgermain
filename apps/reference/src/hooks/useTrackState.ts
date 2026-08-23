import { useCallback, useState } from "react";

import {
  clampCopies,
  copiesStorageKey,
  decodeTrackState,
  EMPTY_TRACK,
  encodeTrackState,
  isTrackEmpty,
  trackStorageKey,
  type TrackState,
} from "../model/track.js";

function readState(monsterId: string, copy: number): TrackState {
  try {
    return decodeTrackState(sessionStorage.getItem(trackStorageKey(monsterId, copy)));
  } catch {
    return EMPTY_TRACK;
  }
}

function writeState(monsterId: string, copy: number, state: TrackState): void {
  try {
    const key = trackStorageKey(monsterId, copy);
    if (isTrackEmpty(state)) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, encodeTrackState(state));
  } catch {
    // Blocked storage: tracking still works, it just won't survive a reload.
  }
}

function readCopies(monsterId: string): number {
  try {
    return clampCopies(Number(sessionStorage.getItem(copiesStorageKey(monsterId)) ?? 1));
  } catch {
    return 1;
  }
}

function writeCopies(monsterId: string, copies: number): void {
  try {
    const key = copiesStorageKey(monsterId);
    if (copies <= 1) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(copies));
  } catch {
    // As above.
  }
}

export interface TrackGroup {
  /** One record per copy of the creature on this page; `states.length` is the copy count. */
  states: readonly TrackState[];
  /** Which copy the hp controls, condition chips, and the statblock's condition effects follow. */
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  addCopy: () => void;
  /** Drops the last copy; its record is cleared. */
  removeCopy: () => void;
  update: (index: number, patch: Partial<TrackState>) => void;
  /** Clears damage and conditions on every copy and collapses back to one; adjustments survive. */
  resetAll: () => void;
}

/**
 * Tracker state backed by sessionStorage, one record per copy of a monster.
 * Session scope is the point: every browser tab is its own fight, state
 * survives a reload, and closing the tab is how an encounter ends. Copies
 * within the tab are for several of the same creature at once (a summon's
 * 1d3 of a kind); each keeps its own hp and conditions.
 *
 * The id is captured on mount; callers must remount on an id change (key the
 * component by the monster id).
 */
export function useTrackGroup(monsterId: string): TrackGroup {
  const [states, setStates] = useState<TrackState[]>(() =>
    Array.from({ length: readCopies(monsterId) }, (_, i) => readState(monsterId, i)),
  );
  const [activeIndex, setActive] = useState(0);

  const setActiveIndex = useCallback(
    (index: number) => {
      setActive(Math.max(0, Math.min(states.length - 1, index)));
    },
    [states.length],
  );

  const update = useCallback(
    (index: number, patch: Partial<TrackState>) => {
      setStates((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = prev.slice();
        next[index] = { ...prev[index]!, ...patch };
        writeState(monsterId, index, next[index]!);
        return next;
      });
    },
    [monsterId],
  );

  const addCopy = useCallback(() => {
    setStates((prev) => {
      const count = clampCopies(prev.length + 1);
      if (count === prev.length) return prev;
      writeCopies(monsterId, count);
      // A fresh copy starts clean, but shares the page's adjustments (those
      // live on copy 0, which the pages read them from).
      return [...prev, EMPTY_TRACK];
    });
  }, [monsterId]);

  const removeCopy = useCallback(() => {
    setStates((prev) => {
      if (prev.length <= 1) return prev;
      const dropped = prev.length - 1;
      writeState(monsterId, dropped, EMPTY_TRACK);
      writeCopies(monsterId, dropped);
      setActive((a) => Math.min(a, dropped - 1));
      return prev.slice(0, dropped);
    });
  }, [monsterId]);

  const resetAll = useCallback(() => {
    setStates((prev) => {
      for (let i = 1; i < prev.length; i++) writeState(monsterId, i, EMPTY_TRACK);
      writeCopies(monsterId, 1);
      const first: TrackState = { ...(prev[0] ?? EMPTY_TRACK), damage: 0, conditions: [] };
      writeState(monsterId, 0, first);
      setActive(0);
      return [first];
    });
  }, [monsterId]);

  return { states, activeIndex, setActiveIndex, addCopy, removeCopy, update, resetAll };
}
