/**
 * First-party usage/health telemetry via Workers Analytics Engine: one data
 * point per request, carrying route label, method, status, and duration —
 * and nothing else.
 *
 * Deliberately PII-free, to keep the "dumb persistence, privacy-respecting"
 * posture intact: no `ownerId`, no session token, no document id, no request
 * body. Route labels are a fixed enum (see `routeLabel` in index.ts); the raw
 * pathname — which carries the opaque docId — is never written. This still
 * answers the questions worth asking ("how much is this used?", "what's the
 * error/conflict rate?", "how slow are writes?") without becoming tracking.
 *
 * `env.ANALYTICS` is optional-chained so local `wrangler dev` and the
 * vitest-pool-workers suite (where the binding is a Miniflare no-op) never
 * fail on it. `writeDataPoint` is fire-and-forget — no await, no `waitUntil`
 * — so telemetry never adds latency to a response.
 */
export interface RequestRecord {
  route: string;
  method: string;
  status: number;
  durationMs: number;
}

export function recordRequest(env: Env, r: RequestRecord): void {
  env.ANALYTICS?.writeDataPoint({
    // Analytics Engine allows one index (its sampling key, ≤96 bytes): the
    // route label, so per-route rollups stay accurate under sampling.
    indexes: [r.route],
    blobs: [r.route, r.method, String(r.status)],
    doubles: [r.durationMs],
  });
}
