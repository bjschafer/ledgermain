import { useEffect } from "react";

import { dismissToast, useToastSubscription } from "../state/toast.js";

/** How long a toast stays up before auto-dismissing. */
const AUTO_DISMISS_MS = 6000;

/**
 * Mounts once (in `App.tsx`) and renders the single current toast, if any,
 * bottom-center. `role="status"`/`aria-live="polite"` so screen readers
 * announce it without stealing focus; `Escape` and a click anywhere on the
 * toast both dismiss it early. Auto-dismisses after `AUTO_DISMISS_MS`, with
 * the timer reset whenever the toast identity (`toast.id`) changes — a
 * fresh `showToast()` call gets its own full window rather than inheriting
 * whatever was left on the previous one's clock.
 */
export function ToastHost() {
  const toast = useToastSubscription();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, AUTO_DISMISS_MS);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissToast();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="toast-host">
      <div
        className={`toast${toast.tone ? ` toast--${toast.tone}` : ""}`}
        role="status"
        aria-live="polite"
        onClick={() => dismissToast()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") dismissToast();
        }}
      >
        <span className="toast-message">{toast.message}</span>
        {toast.action ? (
          <button
            type="button"
            className="toast-action"
            onClick={(e) => {
              e.stopPropagation();
              toast.action!.onAction();
              dismissToast();
            }}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
