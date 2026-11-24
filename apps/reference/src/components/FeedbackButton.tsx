import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  FeedbackError,
  apiBaseUrl,
  feedbackEnabled,
  submitFeedback,
  turnstileSitekey,
} from "../data/feedback.js";
import { useTurnstile } from "../hooks/useTurnstile.js";
import {
  FEEDBACK_CATEGORIES,
  MAX_MESSAGE_LENGTH,
  buildRequest,
  emptyDraft,
  validateDraft,
  type FeedbackDraft,
} from "../model/feedback.js";

type SubmitState =
  | { kind: "editing"; error?: string }
  | { kind: "submitting" }
  | { kind: "done"; url?: string };

/** Footer feedback control; renders nothing unless the API and Turnstile are configured. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  if (!feedbackEnabled()) return null;
  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Send feedback
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<FeedbackDraft>(emptyDraft);
  const [state, setState] = useState<SubmitState>({ kind: "editing" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnstile = useTurnstile(turnstileSitekey()!);
  const submitting = state.kind === "submitting";

  useEffect(() => {
    textareaRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  const submit = async () => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setState({ kind: "editing", error: validationError });
      return;
    }
    const token = turnstile.token;
    if (!token) {
      setState({ kind: "editing", error: "Please complete the verification below." });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const request = buildRequest(
        draft,
        {
          page: window.location.hash,
          userAgent: navigator.userAgent,
          appVersion: __APP_VERSION__,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
        token,
      );
      const res = await submitFeedback(apiBaseUrl()!, request);
      setState({ kind: "done", url: res.url });
    } catch (err) {
      turnstile.reset();
      setState({
        kind: "editing",
        error:
          err instanceof FeedbackError
            ? err.message
            : "Couldn't send feedback. Please try again in a moment.",
      });
    }
  };

  return createPortal(
    <div
      className="feedback-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <div className="feedback-header">
          <h2 id="feedback-title" className="feedback-title">
            Send feedback
          </h2>
          <button
            type="button"
            className="feedback-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {state.kind === "done" ? (
          <div>
            <p>Thanks, your feedback was sent.</p>
            {state.url && (
              <p>
                You can follow it here:{" "}
                <a href={state.url} target="_blank" rel="noreferrer noopener">
                  view report
                </a>
                .
              </p>
            )}
            <div className="feedback-actions">
              <button type="button" className="btn-act" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <p>
              Missing a spell or monster? Text or numbers look wrong? Tell me here: it opens a
              report I can track. No account needed.
            </p>

            <label className="feedback-field">
              <span>Topic</span>
              <select
                value={draft.category}
                disabled={submitting}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="feedback-field">
              <span>What's up?</span>
              <textarea
                ref={textareaRef}
                value={draft.message}
                disabled={submitting}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={5}
                placeholder="e.g. I can't find the Fey Foundling feat, or this spell's range looks wrong…"
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              />
            </label>

            <label className="feedback-field">
              <span>
                Contact <span className="feedback-faint">(optional, kept private)</span>
              </span>
              <input
                type="text"
                value={draft.contact}
                disabled={submitting}
                placeholder="Discord handle or email"
                onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
              />
            </label>

            <div className="feedback-turnstile" ref={turnstile.containerRef} />
            {turnstile.status === "error" && (
              <p className="feedback-error">
                Couldn't load the verification widget. Check your connection and reopen this form.
              </p>
            )}

            {state.kind === "editing" && state.error && (
              <p className="feedback-error" role="alert">
                {state.error}
              </p>
            )}

            <p className="feedback-disclosure">
              Your report is posted to a public issue tracker, along with the page you're on, your
              browser, and the site version, to help with bugs. Anything you put in Contact stays
              off it: only I can read that, and it's deleted within six months.
            </p>

            <div className="feedback-actions">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-act"
                onClick={() => void submit()}
                disabled={submitting || !turnstile.token}
              >
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
