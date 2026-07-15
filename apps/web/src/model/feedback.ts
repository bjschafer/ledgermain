/**
 * Pure logic for the in-app feedback form (the thin view is
 * `components/FeedbackButton.tsx`; submission goes through `feedback/client.ts`
 * to the Worker's `POST /api/feedback`, which opens a GitHub issue as a bot).
 *
 * Everything here is DOM-free and unit-tested: the category list, draft
 * validation, and assembling the request payload. Deliberately minimal
 * `context` — the issue is public, so only non-identifying, disclosed fields
 * (the browser UA and which app mode the user was in) are attached; the user's
 * character build is never sent.
 */

export interface FeedbackCategory {
  id: string;
  /** Shown in the form's category picker. */
  label: string;
}

/** Categories the picker offers. `id`s mirror the server's allow-list (feedback.ts). */
export const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  { id: "missing-content", label: "Missing content (a feat, spell, item, class…)" },
  { id: "wrong-numbers", label: "Wrong rules or numbers" },
  { id: "bug", label: "Something's broken" },
  { id: "idea", label: "Idea or suggestion" },
  { id: "other", label: "Other" },
];

export const DEFAULT_CATEGORY = "missing-content";

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CONTACT_LENGTH = 200;

export interface FeedbackDraft {
  category: string;
  message: string;
  /** Optional opt-in follow-up handle (Discord/email/etc.). */
  contact: string;
}

export interface FeedbackContext {
  /** e.g. `"build"`, `"play"`, `"settings"` — where the user was. */
  mode: string;
  /** Browser user-agent — disclosed in the form; helps triage bug reports. */
  userAgent: string;
}

export interface FeedbackRequest {
  category: string;
  message: string;
  contact?: string;
  /** A short, human-readable one-liner folded into the issue body. */
  context: string;
  turnstileToken: string;
}

export function emptyDraft(): FeedbackDraft {
  return { category: DEFAULT_CATEGORY, message: "", contact: "" };
}

/**
 * Validate a draft for submission. Returns an error string to show the user,
 * or `null` when the draft is submittable. The Turnstile token is checked
 * separately by the component (it gates the submit button on the widget).
 */
export function validateDraft(draft: FeedbackDraft): string | null {
  const message = draft.message.trim();
  if (!message) return "Please describe your feedback.";
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Please keep it under ${MAX_MESSAGE_LENGTH} characters.`;
  }
  if (draft.contact.trim().length > MAX_CONTACT_LENGTH) {
    return `Contact is too long (max ${MAX_CONTACT_LENGTH} characters).`;
  }
  return null;
}

/** Render the disclosed context fields into the one-liner sent with the issue. */
export function formatContext(context: FeedbackContext): string {
  return `mode=${context.mode}; ${context.userAgent}`;
}

/**
 * Build the request payload from a (validated) draft, context, and a fresh
 * Turnstile token. Trims fields and omits an empty contact.
 */
export function buildRequest(
  draft: FeedbackDraft,
  context: FeedbackContext,
  turnstileToken: string,
): FeedbackRequest {
  const contact = draft.contact.trim();
  return {
    category: draft.category,
    message: draft.message.trim(),
    ...(contact ? { contact } : {}),
    context: formatContext(context),
    turnstileToken,
  };
}
