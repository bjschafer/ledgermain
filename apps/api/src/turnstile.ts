/**
 * Cloudflare Turnstile server-side verification (the `/feedback` endpoint's
 * anti-abuse gate — see `feedback.ts`). A single `fetch` to the siteverify
 * endpoint; no SDK, matching this Worker's "no framework" posture.
 *
 * Two properties matter here beyond "is the token valid":
 *  - Tokens are **single-use** and expire ~5 min after issue, so a replayed
 *    or stale token fails verification — the client must mint a fresh one per
 *    submit (the widget resets after each attempt).
 *  - The response carries the `hostname` that actually solved the challenge.
 *    The caller asserts that hostname against an allow-list, which is a
 *    stronger "came from our app" signal than the request `Origin` (Cloudflare
 *    asserts it; a scripted caller can forge `Origin` but not a hostname-bound
 *    Turnstile solve). This is the closest a public browser endpoint can get
 *    to "only our client may call this" — see feedback.ts for the honest limit.
 */
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  /** Hostname of the page that solved the challenge (present on success). */
  hostname?: string;
  /** Cloudflare error codes (e.g. `timeout-or-duplicate`) when `success` is false. */
  errorCodes: string[];
}

/**
 * The subset of the siteverify response we read. Cloudflare returns more
 * (`challenge_ts`, `action`, `cdata`, …) but this endpoint only needs the
 * verdict and the solving hostname.
 */
interface SiteverifyResponse {
  success: boolean;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);

  let data: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    // A network failure talking to siteverify must fail *closed* (treat as
    // unverified) — never fall through and let an unverified submit reach
    // GitHub.
    return { success: false, errorCodes: ["siteverify-unreachable"] };
  }

  return {
    success: data.success === true,
    hostname: data.hostname,
    errorCodes: data["error-codes"] ?? [],
  };
}
