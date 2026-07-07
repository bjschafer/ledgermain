/**
 * Minimal transient-toast primitive (UX audit: "feedback: toasts + undo").
 * One toast at a time — last-wins, matching how a single at-the-table
 * notification is actually read. Deliberately dependency-free: a tiny
 * module-level pub/sub that `ToastHost` (mounted once in `App.tsx`)
 * subscribes to via `useSyncExternalStore`, so any component anywhere in the
 * tree can call `showToast()` without threading a context/provider through
 * every panel.
 *
 * Not a queue — a second `showToast()` call while one is showing replaces it
 * immediately (matches the "one transient toast at a time is fine" spec);
 * nothing here tries to preserve or re-show a toast that got pre-empted.
 */
import { useSyncExternalStore } from "react";

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
}

export interface Toast extends ToastOptions {
  /** Unique per `showToast()` call, so `ToastHost` can key its dismiss timer even when the message text repeats. */
  id: number;
}

type Listener = () => void;

let current: Toast | null = null;
let nextId = 0;
const listeners = new Set<Listener>();

/** Show a toast, replacing whatever is currently showing (last-wins). */
export function showToast(options: ToastOptions): void {
  nextId += 1;
  current = { id: nextId, ...options };
  for (const listener of listeners) listener();
}

/** Dismiss the current toast, if any. No-op if nothing is showing. */
export function dismissToast(): void {
  if (current === null) return;
  current = null;
  for (const listener of listeners) listener();
}

/** `useSyncExternalStore` subscribe function. */
export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `useSyncExternalStore` snapshot getter. */
export function getToastSnapshot(): Toast | null {
  return current;
}

/** The current toast (or `null`), reactively — used by `ToastHost`. */
export function useToastSubscription(): Toast | null {
  return useSyncExternalStore(subscribeToast, getToastSnapshot, getToastSnapshot);
}
