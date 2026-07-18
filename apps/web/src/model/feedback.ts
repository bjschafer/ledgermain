/**
 * Pure logic for the in-app feedback form (the thin view is
 * `components/FeedbackButton.tsx`; submission goes through `feedback/client.ts`
 * to the Worker's `POST /api/feedback`, which opens a GitHub issue as a bot).
 *
 * Everything here is DOM-free and unit-tested: the category list, draft
 * validation, and assembling the request payload.
 *
 * The issue is public, so the always-attached `context` is limited to
 * non-identifying, disclosed fields (browser, app version, viewport, which mode
 * the user was in). The user's character is attached *only* when they tick the
 * box — see `FeedbackDraft.includeBuild`.
 */
import type { CharacterDoc } from "@pf1/schema";

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
/**
 * Ceiling on the attached CharacterDoc JSON. A doc is normally a few KB; this
 * only guards the pathological case, and mirrors the server's own cap so an
 * oversized build is dropped locally (submission still goes through) rather
 * than bouncing off the Worker with an error the user can't act on.
 */
export const MAX_BUILD_LENGTH = 48_000;

export interface FeedbackDraft {
  category: string;
  message: string;
  /** Optional opt-in follow-up handle (Discord/email/etc.). */
  contact: string;
  /** Opt-in: attach the character JSON so a rules bug can be reproduced exactly. */
  includeBuild: boolean;
}

export interface FeedbackContext {
  /** e.g. `"build"`, `"play"`, `"settings"` — where the user was. */
  mode: string;
  /** Browser user-agent — disclosed in the form; helps triage bug reports. */
  userAgent: string;
  /** Short git SHA of the deployed app (see `vite.config.ts`'s `__APP_VERSION__`). */
  appVersion: string;
  /** Viewport in CSS pixels, e.g. `"1440x900"` — layout bugs are size-dependent. */
  viewport: string;
}

export interface FeedbackRequest {
  category: string;
  message: string;
  contact?: string;
  /** A short, human-readable one-liner folded into the issue body. */
  context: string;
  /** Raw user-agent; the Worker tucks it into a collapsed block. */
  userAgent?: string;
  /** Opt-in CharacterDoc JSON; the Worker tucks it into a collapsed block. */
  build?: string;
  turnstileToken: string;
}

export function emptyDraft(): FeedbackDraft {
  return { category: DEFAULT_CATEGORY, message: "", contact: "", includeBuild: false };
}

/**
 * Seed a feedback draft from a picker's empty search (issue #88, `SearchMiss`)
 * — pre-filed under "missing content" with the query and which picker it came
 * from folded into the message, so the report is actionable without the
 * player re-typing what they already searched.
 */
export function buildSearchMissDraft(query: string, pickerLabel: string): FeedbackDraft {
  return {
    category: DEFAULT_CATEGORY,
    message: `Can't find a ${pickerLabel} for "${query}".`,
    contact: "",
    includeBuild: false,
  };
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

/** Friendly names for the app modes; anything unrecognized passes through as-is. */
const MODE_LABELS: Record<string, string> = {
  build: "Build mode",
  play: "Play mode",
  settings: "Settings",
};

/**
 * Browser families we bother to name, most specific first: every Chromium
 * derivative also claims "Chrome", and Chrome/Edge both claim "Safari", so
 * order *is* the disambiguation. Deliberately shallow — this exists to make an
 * issue skimmable, not to fingerprint; the raw UA rides along untouched for the
 * rare report where the exact string matters.
 */
const BROWSER_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "Edge", re: /\bEdgi?A?\/(\d+)/ },
  { name: "Opera", re: /\bOPR\/(\d+)/ },
  { name: "Firefox", re: /\bFirefox\/(\d+)/ },
  { name: "Chrome", re: /\bChrome\/(\d+)/ },
  { name: "Safari", re: /\bVersion\/(\d+).*\bSafari\// },
];

const OS_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "Windows", re: /\bWindows NT\b/ },
  { name: "Android", re: /\bAndroid\b/ },
  { name: "iOS", re: /\b(iPhone|iPad|iPod)\b/ },
  { name: "macOS", re: /\bMac OS X\b/ },
  { name: "Linux", re: /\bLinux\b/ },
];

/**
 * Reduce a user-agent to something a human can read at a glance, e.g.
 * `"Firefox 152 on Windows"`. Returns the raw string when nothing matches —
 * an unrecognized UA is more interesting than a shrug, not less.
 */
export function describeUserAgent(userAgent: string): string {
  const browser = BROWSER_PATTERNS.find((b) => b.re.test(userAgent));
  const os = OS_PATTERNS.find((o) => o.re.test(userAgent));
  if (!browser) return userAgent;
  const version = browser.re.exec(userAgent)![1];
  const name = `${browser.name} ${version}`;
  return os ? `${name} on ${os.name}` : name;
}

/** Render the disclosed context fields into the one-liner sent with the issue. */
export function formatContext(context: FeedbackContext): string {
  const parts = [
    MODE_LABELS[context.mode] ?? context.mode,
    describeUserAgent(context.userAgent),
    `viewport ${context.viewport}`,
    `app ${context.appVersion}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

/**
 * Build the request payload from a (validated) draft, context, and a fresh
 * Turnstile token. Trims fields and omits an empty contact. `doc` is attached
 * only when the draft opts in — and dropped if it somehow exceeds the cap.
 */
export function buildRequest(
  draft: FeedbackDraft,
  context: FeedbackContext,
  turnstileToken: string,
  doc?: CharacterDoc,
): FeedbackRequest {
  const contact = draft.contact.trim();
  const build = draft.includeBuild && doc ? JSON.stringify(doc, null, 2) : undefined;
  return {
    category: draft.category,
    message: draft.message.trim(),
    ...(contact ? { contact } : {}),
    context: formatContext(context),
    userAgent: context.userAgent,
    ...(build && build.length <= MAX_BUILD_LENGTH ? { build } : {}),
    turnstileToken,
  };
}
