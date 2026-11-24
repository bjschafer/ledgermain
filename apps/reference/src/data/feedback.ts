/**
 * The feedback form's config and its one request. Both build-time values come
 * from Workers Builds build variables (see `.env.example`); with either unset
 * the form is hidden rather than offered without a way to verify a submit.
 */
import type { FeedbackRequest } from "../model/feedback.js";

function env(name: "VITE_API_URL" | "VITE_TURNSTILE_SITEKEY"): string | undefined {
  const raw = import.meta.env[name] as string | undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function apiBaseUrl(): string | undefined {
  return env("VITE_API_URL")?.replace(/\/+$/, "");
}

export function turnstileSitekey(): string | undefined {
  return env("VITE_TURNSTILE_SITEKEY");
}

export function feedbackEnabled(): boolean {
  return Boolean(apiBaseUrl()) && Boolean(turnstileSitekey());
}

export interface FeedbackResponse {
  ok: true;
  /** The created GitHub issue. */
  url?: string;
}

/** Carries the Worker's `{ error }` text, which is written for the user. */
export class FeedbackError extends Error {}

export async function submitFeedback(
  apiBase: string,
  body: FeedbackRequest,
): Promise<FeedbackResponse> {
  const res = await fetch(`${apiBase}/api/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Non-JSON body: keep the status-based message.
    }
    throw new FeedbackError(message);
  }
  return (await res.json()) as FeedbackResponse;
}
