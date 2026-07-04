/**
 * The only place in `apps/web` that knows the persistence API's location —
 * mirrors `src/refdata/loader.ts`'s "one file that knows where data lives"
 * convention (see that module's doc comment / CLAUDE.md).
 *
 * Unset `VITE_API_URL` (the default for local dev, and for anyone who
 * hasn't deployed `apps/api`) means **local-only mode**: every function in
 * `src/sync/` becomes a no-op, and the app behaves exactly as it did before
 * Stage 5 — Dexie is the only source of truth, no network round-trip is
 * ever made. This is the "degrade silently when... no API is configured"
 * requirement, satisfied by construction: nothing downstream of this module
 * runs unless it returns a value.
 */
export function apiBaseUrl(): string | undefined {
  // `ImportMetaEnv`'s default index signature is `any`; narrow it once here
  // rather than letting `any` leak into every caller.
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}
