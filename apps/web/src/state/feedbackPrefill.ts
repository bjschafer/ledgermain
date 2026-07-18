/**
 * Requests the masthead's single `FeedbackButton` instance open pre-filled —
 * used by `SearchMiss` (issue #88), which renders deep inside picker dialogs
 * with no direct line to that one instance. Mirrors `state/toast.ts`'s
 * "module-scoped pub/sub, subscribed via useSyncExternalStore" shape so any
 * component can request a prefilled open without threading a
 * context/provider through every panel.
 *
 * Not a queue: a second request before the first is consumed replaces it
 * (matches toast's last-wins policy) — a player firing off several searches
 * before opening the form should only see the most recent one.
 */
import { useSyncExternalStore } from "react";

import type { FeedbackDraft } from "../model/feedback.js";

let pending: FeedbackDraft | null = null;
const listeners = new Set<() => void>();

/** Ask the feedback form to open with this draft pre-filled. */
export function requestFeedbackPrefill(draft: FeedbackDraft): void {
  pending = draft;
  for (const listener of listeners) listener();
}

/** `FeedbackButton` calls this once it has applied a pending prefill. */
export function clearFeedbackPrefill(): void {
  pending = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FeedbackDraft | null {
  return pending;
}

/** The pending prefill request (or `null`), reactively — used by `FeedbackButton`. */
export function useFeedbackPrefillSubscription(): FeedbackDraft | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
