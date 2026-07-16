/**
 * `POST /api/feedback` — an in-app "send feedback" submission that opens a
 * GitHub issue as the App bot (see `githubApp.ts`), so non-technical players
 * can report a missing feat / wrong number / bug without a GitHub account and
 * without the owner's email being exposed.
 *
 * This is the one *unauthenticated, public* write on the Worker, so it's
 * defended in depth rather than trusted:
 *  1. Envelope validation — category enum, message length, JSON shape — before
 *     anything downstream runs.
 *  2. Cloudflare Turnstile — the primary anti-abuse gate. A valid token proves
 *     a real browser solved a challenge bound to our sitekey; we additionally
 *     assert the solving `hostname` is one of ours (`allowedHostnames`).
 *  3. A coarse per-IP rate limit in KV — a backstop, not the main defense
 *     (Turnstile is), so its KV eventual-consistency sloppiness is acceptable.
 *
 * Honest limit: a public browser endpoint can't *prove* a caller is our SPA —
 * anything the client holds is visible in devtools. Turnstile + hostname
 * assertion is the strongest practical approximation; it makes scripted abuse
 * defeat a CAPTCHA per submit rather than curl a URL.
 */
import { allowedHostnames } from "./cors.js";
import { createIssue, getInstallationToken } from "./githubApp.js";
import { errorJson, json } from "./http.js";
import { verifyTurnstile } from "./turnstile.js";

const MAX_MESSAGE_CHARS = 4000;
const MAX_CONTACT_CHARS = 200;
const MAX_CONTEXT_CHARS = 500;
const MAX_USER_AGENT_CHARS = 500;
// The opt-in character attachment. A CharacterDoc is normally a few KB; this
// leaves room for a maximal one while staying clear of GitHub's 65536-char
// issue-body limit once the rest of the body is added.
const MAX_BUILD_CHARS = 48_000;
// Overall request-body ceiling — well above the field caps, so an oversized
// body is rejected before we parse rather than buffering unbounded input.
const MAX_BODY_BYTES = 64_000;

// Coarse per-IP limit: submissions per window. Turnstile is the real gate;
// this only blunts a burst from one address that has (somehow) automated the
// challenge.
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

/**
 * Category ids the client may send, mapped to the human label shown in the
 * issue body. Server-authoritative: an unknown id collapses to "Other" rather
 * than being trusted into the issue. Category lives in the body, never as a
 * label, so triage never depends on a repo label existing.
 */
const CATEGORY_LABELS: Record<string, string> = {
  "missing-content": "Missing content (feat, spell, item, class, …)",
  "wrong-numbers": "Wrong rules / numbers",
  bug: "Something's broken",
  idea: "Idea / suggestion",
  other: "Other",
};

interface FeedbackBody {
  category: string;
  message: string;
  contact?: string;
  context?: string;
  /** Raw user-agent; rendered in a collapsed block, out of the way. */
  userAgent?: string;
  /** Opt-in CharacterDoc JSON, attached only when the user ticked the box. */
  build?: string;
  turnstileToken: string;
}

type ParseResult = { ok: true; value: FeedbackBody } | { ok: false; error: string };

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBody(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Malformed request" };
  const body = raw as Record<string, unknown>;

  const message = asTrimmedString(body.message);
  if (!message) return { ok: false, error: "Message is required" };
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, error: "Message is too long" };

  const turnstileToken = asTrimmedString(body.turnstileToken);
  if (!turnstileToken) return { ok: false, error: "Verification is required" };

  const contact = asTrimmedString(body.contact);
  if (contact.length > MAX_CONTACT_CHARS) return { ok: false, error: "Contact is too long" };

  const context = asTrimmedString(body.context);
  if (context.length > MAX_CONTEXT_CHARS) return { ok: false, error: "Context is too long" };

  const userAgent = asTrimmedString(body.userAgent);
  if (userAgent.length > MAX_USER_AGENT_CHARS) return { ok: false, error: "Context is too long" };

  // Dropped rather than rejected when oversized: the attachment is a bonus, and
  // bouncing the whole submission would lose the user's actual words.
  const rawBuild = asTrimmedString(body.build);
  const build = rawBuild.length > MAX_BUILD_CHARS ? "" : rawBuild;

  // Not in the allow-list -> "other"; never trust the raw value into the issue.
  const rawCategory = asTrimmedString(body.category);
  const category = rawCategory in CATEGORY_LABELS ? rawCategory : "other";

  return {
    ok: true,
    value: {
      category,
      message,
      contact: contact || undefined,
      context: context || undefined,
      userAgent: userAgent || undefined,
      build: build || undefined,
      turnstileToken,
    },
  };
}

/**
 * Neutralize GitHub @mentions in untrusted text so a submission can't ping
 * arbitrary users: a zero-width space after `@` breaks the mention without
 * visibly changing the text. (GitHub also sanitizes raw HTML in markdown, so
 * that isn't a separate concern here.)
 */
function neutralizeMentions(text: string): string {
  return text.replace(/@(?=[A-Za-z0-9])/g, "@\u200B");
}

/**
 * Short per-category title tags. These carry the signal the `feedback` label
 * can't: every submission is feedback, so tagging them all "[Feedback]" says
 * nothing. Only the fallthrough keeps the generic tag.
 */
const CATEGORY_TAGS: Record<string, string> = {
  "missing-content": "Missing",
  "wrong-numbers": "Rules",
  bug: "Bug",
  idea: "Idea",
  other: "Feedback",
};

const TITLE_MAX_CHARS = 100;

/**
 * A concise, single-line issue title: category tag + first line of the message.
 * Truncation is word-boundary, not mid-word — the full text is quoted verbatim
 * in the body anyway, so a title that stops cleanly at a word costs nothing and
 * reads like a sentence instead of a crash.
 */
export function issueTitle(category: string, message: string): string {
  const firstLine = message.split("\n", 1)[0]!.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  let summary = firstLine;
  if (summary.length > TITLE_MAX_CHARS) {
    const clipped = summary.slice(0, TITLE_MAX_CHARS - 1);
    const lastSpace = clipped.lastIndexOf(" ");
    // Guard the degenerate case (one very long "word"): fall back to the hard
    // cut rather than emitting a bare ellipsis.
    summary = `${lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped}…`;
  }
  const tag = CATEGORY_TAGS[category] ?? "Feedback";
  return neutralizeMentions(`[${tag}] ${summary || "(no summary)"}`);
}

/** Wrap untrusted text in a collapsed block so it never dominates the issue. */
function details(summary: string, lang: string, text: string): string {
  // A fence long enough that fenced content inside `text` can't break out.
  const fence = "``````";
  return [
    `<details><summary>${summary}</summary>`,
    "",
    `${fence}${lang}`,
    text,
    fence,
    "",
    "</details>",
  ].join("\n");
}

export function issueBody(value: FeedbackBody): string {
  const parts = [
    // Blockquote the free text; mentions already neutralized.
    neutralizeMentions(value.message)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
    "",
    `**Category:** ${CATEGORY_LABELS[value.category]}`,
  ];
  if (value.context) {
    parts.push(`**Context:** ${neutralizeMentions(value.context)}`);
  }
  if (value.contact) {
    parts.push(`**Contact (opt-in):** ${neutralizeMentions(value.contact)}`);
  }
  if (value.userAgent) {
    // Inside a code fence, so no mention-neutralizing needed.
    parts.push("", details("User agent", "", value.userAgent));
  }
  if (value.build) {
    parts.push("", details("Attached character (opt-in)", "json", value.build));
  }
  parts.push("", "---", "_Submitted via the in-app feedback form._");
  return parts.join("\n");
}

/**
 * Coarse per-IP rate limit backed by KV. Returns true when the caller is over
 * budget. KV's eventual consistency makes this approximate — acceptable, since
 * Turnstile is the real gate and this is only a burst backstop.
 */
async function isRateLimited(env: Env, ip: string): Promise<boolean> {
  const key = `feedback:rl:${ip}`;
  const current = Number((await env.KV.get(key)) ?? "0");
  if (current >= RATE_LIMIT_MAX) return true;
  await env.KV.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS });
  return false;
}

export async function handleFeedback(request: Request, env: Env): Promise<Response> {
  // Reject oversized bodies up front when the caller declares a length.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) return errorJson(413, "Request too large");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorJson(400, "Invalid JSON");
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) return errorJson(400, parsed.error);
  const value = parsed.value;

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const verdict = await verifyTurnstile(env.TURNSTILE_SECRET, value.turnstileToken, ip);
  if (!verdict.success) return errorJson(403, "Verification failed");
  // Assert the challenge was solved on one of our own hostnames.
  const hostnames = allowedHostnames(env);
  if (verdict.hostname && hostnames.length > 0 && !hostnames.includes(verdict.hostname)) {
    return errorJson(403, "Verification failed");
  }

  if (await isRateLimited(env, ip)) {
    return errorJson(429, "Too many submissions — please try again later");
  }

  const token = await getInstallationToken(env, Math.floor(Date.now() / 1000));
  const created = await createIssue(env, token, {
    title: issueTitle(value.category, value.message),
    body: issueBody(value),
    labels: ["feedback"],
  });

  return json({ ok: true, url: created.htmlUrl, number: created.number }, { status: 201 });
}
