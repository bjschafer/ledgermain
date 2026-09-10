/**
 * Coarse KV-counter rate limits, shared by the public feedback endpoint and
 * the authenticated document write path.
 *
 * KV's eventual consistency makes every count here approximate: two requests
 * landing in different colos can both read the same stale value and both be
 * let through. That is fine for what these limits are for. Neither one is a
 * security boundary (feedback has Turnstile in front of it, and writes need a
 * session), they exist to blunt a runaway client or a burst of abuse before it
 * turns into unbounded KV storage, and being off by a few under contention
 * costs nothing.
 *
 * The window slides rather than tumbling: every counted request re-arms the
 * TTL, so a caller who keeps hammering stays locked out until they go quiet
 * for a full window. That is the harsher of the two readings and the one we
 * want for an abuse backstop.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  max: number;
  windowSeconds: number;
}

/**
 * Count one request against `key` and report whether the caller is already
 * over budget. Returns true when the request should be rejected — in which
 * case nothing is written, so a blocked caller can't extend their own lockout
 * past the window.
 */
export async function overRateLimit(
  kv: KVNamespace,
  key: string,
  rule: RateLimitRule,
): Promise<boolean> {
  const stored = Number((await kv.get(key)) ?? "0");
  // A missing/garbled counter reads as zero rather than NaN, which would make
  // every comparison below false and silently disable the limit.
  const current = Number.isFinite(stored) && stored > 0 ? stored : 0;
  if (current >= rule.max) return true;
  await kv.put(key, String(current + 1), { expirationTtl: rule.windowSeconds });
  return false;
}

/** `429` with the `Retry-After` a client needs to back off correctly. */
export function tooManyRequests(message: string, rule: RateLimitRule): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "retry-after": String(rule.windowSeconds),
    },
  });
}
