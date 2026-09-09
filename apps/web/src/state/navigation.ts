/**
 * "Take me there" requests, for the handful of places that want to move the
 * reader without being anywhere near the router.
 *
 * Same module-level pub/sub shape as `state/toast.ts`, and for the same
 * reason: the level-up toast is raised from inside `useCharacter`, which sits
 * *above* `useAppLocation` in `App.tsx` and has no way to reach it, and
 * threading a callback down through the store's whole surface to serve one
 * button is worse than a four-line store. `App.tsx` is the only subscriber —
 * it switches mode and hands the section id to the same scroll that restores a
 * reload's place.
 *
 * Last-wins with no queue: two jump requests in the same tick means the reader
 * only ever wanted the second one.
 */
import { useSyncExternalStore } from "react";

import type { AppLocation } from "../model/appLocation.js";

export interface JumpRequest extends AppLocation {
  /** Unique per call, so a repeat request for the same place still moves the reader. */
  id: number;
}

type Listener = () => void;

let current: JumpRequest | null = null;
let nextId = 0;
const listeners = new Set<Listener>();

/** Ask the app to switch to `location.mode` and scroll to `location.section`. */
export function requestJump(location: AppLocation): void {
  nextId += 1;
  current = { id: nextId, ...location };
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): JumpRequest | null {
  return current;
}

/** The pending jump request, reactively. `App.tsx` is the only caller. */
export function useJumpRequest(): JumpRequest | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
