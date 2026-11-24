/**
 * Pure logic for the feedback form (`components/FeedbackButton.tsx`; I/O in
 * `data/feedback.ts`). Submissions go to the API Worker's `POST /api/feedback`,
 * which opens a public GitHub issue, so the attached context is limited to
 * disclosed, non-identifying fields.
 */

export interface FeedbackCategory {
  id: string;
  label: string;
}

/** `id`s must stay in the API Worker's category allow-list; unknown ids file as "Other". */
export const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  { id: "missing-content", label: "Missing content (a spell, monster, rule…)" },
  { id: "wrong-numbers", label: "Wrong rules, numbers, or text" },
  { id: "bug", label: "Something's broken" },
  { id: "idea", label: "Idea or suggestion" },
  { id: "other", label: "Other" },
];

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CONTACT_LENGTH = 200;
/** The Worker rejects a context over 500 chars; the page is its only unbounded part. */
export const MAX_PAGE_LENGTH = 200;

export interface FeedbackDraft {
  category: string;
  message: string;
  /** Optional follow-up handle; the Worker keeps it off the public issue. */
  contact: string;
}

export interface FeedbackContext {
  /** The hash route being viewed, e.g. `#/spell/fireball`. */
  page: string;
  userAgent: string;
  /** Short git SHA of the deployed bundle. */
  appVersion: string;
  /** CSS pixels, e.g. `"1440x900"`. */
  viewport: string;
}

export interface FeedbackRequest {
  category: string;
  message: string;
  contact?: string;
  context: string;
  userAgent: string;
  turnstileToken: string;
}

export function emptyDraft(): FeedbackDraft {
  return { category: "missing-content", message: "", contact: "" };
}

/** An error to show the user, or `null` when the draft can be sent. */
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

export function formatContext(context: FeedbackContext): string {
  const raw = context.page || "#/";
  const page = raw.length > MAX_PAGE_LENGTH ? `${raw.slice(0, MAX_PAGE_LENGTH - 1)}…` : raw;
  return [
    "Reference site",
    `page ${page}`,
    `viewport ${context.viewport}`,
    `ref ${context.appVersion}`,
  ].join(" · ");
}

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
    userAgent: context.userAgent,
    turnstileToken,
  };
}
