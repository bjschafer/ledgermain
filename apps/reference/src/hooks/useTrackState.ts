import { useCallback, useState } from "react";

import {
  decodeTrackState,
  EMPTY_TRACK,
  encodeTrackState,
  isTrackEmpty,
  type TrackState,
} from "../model/track.js";

const keyFor = (monsterId: string) => `track:${monsterId}`;

function read(monsterId: string): TrackState {
  try {
    return decodeTrackState(sessionStorage.getItem(keyFor(monsterId)));
  } catch {
    return EMPTY_TRACK;
  }
}

function write(monsterId: string, state: TrackState): void {
  try {
    if (isTrackEmpty(state)) sessionStorage.removeItem(keyFor(monsterId));
    else sessionStorage.setItem(keyFor(monsterId), encodeTrackState(state));
  } catch {
    // Blocked storage: tracking still works, it just won't survive a reload.
  }
}

/**
 * Tracker state backed by sessionStorage, one record per monster id. Session
 * scope is the point: every browser tab is its own instance of the creature
 * (a fight is one tab per monster), state survives a reload, and closing the
 * tab is how an encounter ends.
 *
 * The id is captured on mount; callers must remount on an id change (key the
 * component by the monster id).
 */
export function useTrackState(
  monsterId: string,
): [TrackState, (patch: Partial<TrackState>) => void] {
  const [state, setState] = useState<TrackState>(() => read(monsterId));
  const update = useCallback(
    (patch: Partial<TrackState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        write(monsterId, next);
        return next;
      });
    },
    [monsterId],
  );
  return [state, update];
}
