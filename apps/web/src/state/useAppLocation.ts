/**
 * Binds `model/appLocation`'s pure location to the browser: the URL fragment
 * (so a place can be linked to) and localStorage (so a plain reload with no
 * fragment still lands where you were).
 *
 * Mirrors `useTextSize`'s idiom — a device preference, not character state,
 * with every storage touch guarded for private-browsing mode.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_LOCATION,
  formatLocationHash,
  parseLocationHash,
  sameLocation,
  type AppLocation,
  type Mode,
} from "../model/appLocation.js";

const STORAGE_KEY = "lm:location";

/** Stored as the hash string itself, so the parser validates both paths. */
function readStorage(): AppLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseLocationHash(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(hash: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, hash);
  } catch {
    /* quota exceeded / private browsing — the URL still carries it */
  }
}

function readInitial(): AppLocation {
  const fromHash = parseLocationHash(window.location.hash);
  if (fromHash) return fromHash;
  return readStorage() ?? DEFAULT_LOCATION;
}

export interface AppLocationStore {
  location: AppLocation;
  /**
   * Where this page load started — captured once so the restore scroll has a
   * stable target even after scroll tracking starts overwriting `location`.
   */
  initial: AppLocation;
  setMode: (mode: Mode) => void;
  /**
   * Record the section currently under the reader, from a nav's scroll spy.
   * Ignored when `mode` no longer matches — a nav that's on its way out
   * shouldn't get the last word about where the reader is.
   */
  setSection: (mode: Mode, section: string) => void;
}

export function useAppLocation(): AppLocationStore {
  const [location, setLocation] = useState<AppLocation>(readInitial);
  const initial = useRef(location);

  useEffect(() => {
    const hash = formatLocationHash(location);
    writeStorage(hash);
    // Never stomp a fragment that isn't ours: the OAuth callback's
    // `#session=<token>` is consumed later in the load (sync/session.ts,
    // after RefData resolves) and losing it would break signing in. Skipping
    // costs nothing — localStorage already remembers the place.
    const current = window.location.hash;
    if (current === hash) return;
    if (current && !parseLocationHash(current)) return;
    // replaceState, not assignment: scrolling past a dozen sections shouldn't
    // bury the page the reader actually came from under a dozen back presses.
    window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);
  }, [location]);

  // Someone edits the fragment, or uses back/forward across a real navigation.
  // (Our own replaceState never fires this.)
  useEffect(() => {
    const onHashChange = () => {
      const next = parseLocationHash(window.location.hash);
      if (next) setLocation((prev) => (sameLocation(prev, next) ? prev : next));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setMode = useCallback((mode: Mode) => {
    // Switching tabs drops the remembered section: the reader asked for the
    // top of a different tab, not for wherever they last were in it.
    setLocation((prev) => (prev.mode === mode && !prev.section ? prev : { mode }));
  }, []);

  const setSection = useCallback((mode: Mode, section: string) => {
    setLocation((prev) =>
      prev.mode !== mode || prev.section === section ? prev : { mode, section },
    );
  }, []);

  return { location, initial: initial.current, setMode, setSection };
}
