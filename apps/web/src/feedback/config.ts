/**
 * Config for the in-app feedback feature. Mirrors `sync/config.ts`'s "one file
 * that knows the env" convention.
 *
 * Feedback needs two things wired up: the persistence API (which hosts the
 * `POST /api/feedback` endpoint) and a Cloudflare Turnstile **sitekey** (the
 * public half of the CAPTCHA; the secret half lives only in the Worker). When
 * either is absent the whole feature is hidden — there's no point showing a
 * form that can't produce a verifiable submission. So local dev and any deploy
 * that hasn't set `VITE_TURNSTILE_SITEKEY` simply have no feedback button,
 * exactly like sync degrades to a no-op without `VITE_API_URL`.
 */
import { apiBaseUrl } from "../sync/config.js";

export function turnstileSitekey(): string | undefined {
  const raw = import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Both the API and a Turnstile sitekey must be configured for feedback to work. */
export function feedbackEnabled(): boolean {
  return Boolean(apiBaseUrl()) && Boolean(turnstileSitekey());
}
