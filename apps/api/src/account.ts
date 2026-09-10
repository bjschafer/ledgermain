/**
 * Whole-account operations: take everything out, or take everything away.
 *
 * These are the two things a stranger with an account is entitled to and the
 * per-character routes can't express. Both are owner-scoped by the session
 * alone — there is no admin path, no impersonation, and no way to name another
 * owner in a request.
 */
import { purgeCharacters } from "./characters.js";
import { json } from "./http.js";
import { revokeAllSessions } from "./session.js";

/**
 * `DELETE /api/me` — remove this owner's whole footprint: every document,
 * every tombstone, and every session.
 *
 * Idempotent and resumable. A purge may run out of budget before it runs out
 * of keys (see `PURGE_KEY_BUDGET`), so the response says whether it finished
 * and the caller repeats until it has. Sessions are revoked only on the pass
 * that completes: dropping the caller's own token earlier would leave them
 * unable to finish their own purge.
 */
export async function purgeAccount(ownerId: string, env: Env): Promise<Response> {
  const { deleted, complete } = await purgeCharacters(ownerId, env);
  if (!complete) return json({ deleted, complete: false, sessionsRevoked: 0 });
  const sessionsRevoked = await revokeAllSessions(env.KV, ownerId);
  return json({ deleted, complete: true, sessionsRevoked });
}
