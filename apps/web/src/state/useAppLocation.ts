/**
 * Binds `model/appLocation`'s pure location to the URL fragment, so a place
 * can be linked to and a reload lands where you were.
 *
 * A load with no fragment of ours waits for `fallback` (which needs the
 * character) and settles on it once; a later build edit never moves the reader.
 */
import { useCallback, useEffect, useState } from "react";

import {
  formatLocationHash,
  parseLocationHash,
  sameLocation,
  type AppLocation,
  type Mode,
} from "../model/appLocation.js";

export interface AppLocationStore {
  /** Null until the fragment named a place or `fallback` became known. */
  location: AppLocation | null;
  /**
   * Where this page load started — captured once so the restore scroll has a
   * stable target even after scroll tracking starts overwriting `location`.
   * Null when the load carried no fragment of ours: nothing to restore.
   */
  initial: AppLocation | null;
  setMode: (mode: Mode) => void;
  /**
   * Record the section currently under the reader, from a nav's scroll spy.
   * Ignored when `mode` no longer matches — a nav that's on its way out
   * shouldn't get the last word about where the reader is.
   */
  setSection: (mode: Mode, section: string) => void;
}

export function useAppLocation(fallback: AppLocation | null): AppLocationStore {
  const [chosen, setChosen] = useState<AppLocation | null>(() =>
    parseLocationHash(window.location.hash),
  );
  const [initial] = useState(chosen);
  const location = chosen ?? fallback;

  useEffect(() => {
    if (!chosen && fallback) setChosen(fallback);
  }, [chosen, fallback]);

  useEffect(() => {
    if (!chosen) return;
    const hash = formatLocationHash(chosen);
    // Never stomp a fragment that isn't ours: the OAuth callback's
    // `#session=<token>` is consumed later in the load (sync/session.ts,
    // after RefData resolves) and losing it would break signing in.
    const current = window.location.hash;
    if (current === hash) return;
    if (current && !parseLocationHash(current)) return;
    // replaceState, not assignment: scrolling past a dozen sections shouldn't
    // bury the page the reader actually came from under a dozen back presses.
    window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);
  }, [chosen]);

  // Someone edits the fragment, or uses back/forward across a real navigation.
  // (Our own replaceState never fires this.)
  useEffect(() => {
    const onHashChange = () => {
      const next = parseLocationHash(window.location.hash);
      if (next) setChosen((prev) => (prev && sameLocation(prev, next) ? prev : next));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setMode = useCallback((mode: Mode) => {
    // Switching tabs drops the remembered section: the reader asked for the
    // top of a different tab, not for wherever they last were in it.
    setChosen((prev) => (prev?.mode === mode && !prev.section ? prev : { mode }));
  }, []);

  const setSection = useCallback((mode: Mode, section: string) => {
    setChosen((prev) =>
      prev?.mode !== mode || prev.section === section ? prev : { mode, section },
    );
  }, []);

  return { location, initial, setMode, setSection };
}
