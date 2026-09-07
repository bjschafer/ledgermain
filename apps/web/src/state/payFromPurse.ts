/**
 * The "Pay from purse" preference, shared by every add flow in the build.
 *
 * A module-level store rather than per-picker state, because the choice is
 * about how the table plays (does anyone track gold?) and not about the
 * particular thing being added: ticking it while buying a potion has to hold
 * when the same player adds a longsword two panels away. Persisted, for the
 * same reason.
 *
 * Follows `state/toast.ts`: a tiny pub/sub read through `useSyncExternalStore`,
 * so no provider has to be threaded through the builder tree.
 */
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lm:pref:payFromPurse";

type Listener = () => void;

const listeners = new Set<Listener>();

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Off by default: gear is routinely entered for a character whose starting
// wealth was never filled in, and a default-on toggle would report a shortfall
// on every add.
let payFromPurse = read();

export function setPayFromPurse(value: boolean): void {
  payFromPurse = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* quota exceeded / storage disabled — the session still works */
  }
  for (const listener of listeners) listener();
}

export function getPayFromPurse(): boolean {
  return payFromPurse;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `[payFromPurse, setPayFromPurse]`, live across every picker in the tree. */
export function usePayFromPurse(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getPayFromPurse, getPayFromPurse);
  const set = useCallback((next: boolean) => setPayFromPurse(next), []);
  return [value, set];
}
