import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { CharacterDoc } from "@pf1/schema";

import { feedbackEnabled, turnstileSitekey } from "../feedback/config.js";
import { FeedbackError, submitFeedback } from "../feedback/client.js";
import { useTurnstile } from "../hooks/useTurnstile.js";
import {
  buildRequest,
  emptyDraft,
  FEEDBACK_CATEGORIES,
  MAX_MESSAGE_LENGTH,
  validateDraft,
  type FeedbackDraft,
} from "../model/feedback.js";
import { clearFeedbackPrefill, useFeedbackPrefillSubscription } from "../state/feedbackPrefill.js";
import { apiBaseUrl } from "../sync/config.js";

type SubmitState =
  | { kind: "editing"; error?: string }
  | { kind: "submitting" }
  | { kind: "done"; url?: string };

/**
 * Global "Send feedback" control (masthead) + its modal. Renders nothing unless
 * both the API and a Turnstile sitekey are configured (see `feedback/config`),
 * so local dev and un-provisioned deploys show no button at all. The heavy
 * lifting — validation, payload shape — lives in `model/feedback.ts`; this is a
 * thin view over it, matching the app's model/view split.
 */
export function FeedbackButton({ mode, doc }: { mode: string; doc?: CharacterDoc }) {
  const [open, setOpen] = useState(false);
  const [initialDraft, setInitialDraft] = useState<FeedbackDraft>();
  // A picker's "Report this gap" (SearchMiss, issue #88) asks this instance
  // to open pre-filled — there's no other line from deep inside a picker
  // dialog to the one FeedbackButton in the masthead. See state/feedbackPrefill.ts.
  const pendingPrefill = useFeedbackPrefillSubscription();

  useEffect(() => {
    if (pendingPrefill) {
      setInitialDraft(pendingPrefill);
      setOpen(true);
      clearFeedbackPrefill();
    }
  }, [pendingPrefill]);

  if (!feedbackEnabled()) return null;

  return (
    <>
      <button
        type="button"
        className="btn-ghost feedback-open"
        onClick={() => {
          setInitialDraft(undefined);
          setOpen(true);
        }}
        title="Send feedback"
      >
        Feedback
      </button>
      {open && (
        <FeedbackModal
          mode={mode}
          doc={doc}
          initialDraft={initialDraft}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FeedbackModal({
  mode,
  doc,
  initialDraft,
  onClose,
}: {
  mode: string;
  doc?: CharacterDoc;
  initialDraft?: FeedbackDraft;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FeedbackDraft>(() => initialDraft ?? emptyDraft());
  const [state, setState] = useState<SubmitState>({ kind: "editing" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sitekey = turnstileSitekey()!;
  const turnstile = useTurnstile(sitekey);

  // Focus the message field on open, and close on Escape (unless mid-submit).
  useEffect(() => {
    textareaRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.kind !== "submitting") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, state.kind]);

  const submitting = state.kind === "submitting";

  const submit = async () => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setState({ kind: "editing", error: validationError });
      return;
    }
    // Capture into a const so the narrowing survives the setState call below
    // (TS resets property narrowing across intervening function calls).
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
          mode,
          userAgent: navigator.userAgent,
          appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown",
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
        token,
        doc,
      );
      const res = await submitFeedback(apiBaseUrl()!, request);
      setState({ kind: "done", url: res.url });
    } catch (err) {
      const message =
        err instanceof FeedbackError
          ? err.message
          : "Couldn't send feedback. Please try again in a moment.";
      // Turnstile tokens are single-use — re-arm so a retry gets a fresh one.
      turnstile.reset();
      setState({ kind: "editing", error: message });
    }
  };

  return createPortal(
    <div
      className="feedback-backdrop"
      role="presentation"
      onClick={(e) => {
        // Only a click on the backdrop itself closes; clicks inside the modal
        // bubble up with a different target.
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
          <div id="feedback-title" className="feedback-title">
            Send feedback
          </div>
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
          <div className="feedback-done">
            <p>Thanks — your feedback was sent. 🎲</p>
            {state.url && (
              <p className="hint">
                You can follow it here:{" "}
                <a href={state.url} target="_blank" rel="noreferrer noopener">
                  view report
                </a>
                .
              </p>
            )}
            <div className="feedback-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="hint feedback-intro">
              Missing a feat or spell? Numbers look wrong? Tell me here — it opens a report I can
              track. No account needed.
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
                placeholder="e.g. I can't find the Fey Foundling feat, or my AC looks 2 too low when…"
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              />
            </label>

            <label className="feedback-field">
              <span>
                Contact <span className="hint">(optional — if you'd like a reply)</span>
              </span>
              <input
                type="text"
                value={draft.contact}
                disabled={submitting}
                placeholder="Discord handle or email"
                onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
              />
            </label>

            {doc && (
              <label className="feedback-check">
                <input
                  type="checkbox"
                  checked={draft.includeBuild}
                  disabled={submitting}
                  onChange={(e) => setDraft({ ...draft, includeBuild: e.target.checked })}
                />
                <span>
                  Attach my character <span className="hint">(helps me reproduce the numbers)</span>
                </span>
              </label>
            )}

            <div className="feedback-turnstile" ref={turnstile.containerRef} />
            {turnstile.status === "error" && (
              <p className="hint feedback-error">
                Couldn't load the verification widget — check your connection and reopen this form.
              </p>
            )}

            {state.kind === "editing" && state.error && (
              <p className="feedback-error" role="alert">
                {state.error}
              </p>
            )}

            <p className="hint feedback-disclosure">
              Your report is posted to a public issue tracker. Your browser and app version are
              included to help with bugs.{" "}
              {draft.includeBuild
                ? "Your character sheet will be attached to it — including its name and anything you've typed into it."
                : "Your character data is not sent."}
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
