/**
 * Session + OAuth-state storage in the `KV` binding. Sessions map an opaque
 * bearer token to a stable `ownerId` (DESIGN.md §2.1: "identity stays
 * boring" — no JWT signing, no cookies; just a random token the client keeps
 * in localStorage and sends as `Authorization: Bearer <token>`). OAuth state
 * nonces are a short-lived KV entry rather than a signed value, since a KV
 * round trip is cheap and this avoids needing another secret.
 */
import { listAllKeys } from "./kv.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10 minutes — just long enough for the Discord redirect round trip

export interface Session {
  ownerId: string;
  createdAt: string;
}

/** Random lowercase-hex token of `bytes` bytes; the id primitive for anything opaque. */
export function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Reverse index for "sign out everywhere": `session:<token>` alone can only be
 * read by someone who already holds the token, so revoking an owner's other
 * devices needs a second entry keyed the other way round. Value is empty --
 * the key name carries everything. `::` separates the parts because an
 * `ownerId` is `discord:<snowflake>`, which contains single colons but never a
 * doubled one (same convention as the CHARACTERS keys).
 */
function ownerSessionKey(ownerId: string, token: string): string {
  return `ownersession::${ownerId}::${token}`;
}

export async function createSession(kv: KVNamespace, ownerId: string): Promise<string> {
  const token = randomToken(32);
  const session: Session = { ownerId, createdAt: new Date().toISOString() };
  await Promise.all([
    kv.put(`session:${token}`, JSON.stringify(session), {
      expirationTtl: SESSION_TTL_SECONDS,
    }),
    kv.put(ownerSessionKey(ownerId, token), "", { expirationTtl: SESSION_TTL_SECONDS }),
  ]);
  return token;
}

export async function getSession(kv: KVNamespace, token: string): Promise<Session | null> {
  return kv.get<Session>(`session:${token}`, "json");
}

/**
 * Sign out one device. Reads the session first so the owner index entry goes
 * with it -- an orphaned index key would make a later "sign out everywhere"
 * report a device that is already gone.
 */
export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  const session = await getSession(kv, token);
  await Promise.all([
    kv.delete(`session:${token}`),
    session ? kv.delete(ownerSessionKey(session.ownerId, token)) : Promise.resolve(),
  ]);
}

/**
 * Sign out every device: delete all of this owner's sessions, including the
 * one making the call. Returns how many were revoked.
 *
 * Honest limit: this can only see sessions that carry an index entry, so any
 * token minted before that index existed survives until its 30-day TTL runs
 * out. That window closes on its own and cannot reopen.
 */
export async function revokeAllSessions(kv: KVNamespace, ownerId: string): Promise<number> {
  const prefix = ownerSessionKey(ownerId, "");
  const keys = await listAllKeys(kv, prefix);
  await Promise.all(
    keys.flatMap((key) => [kv.delete(key), kv.delete(`session:${key.slice(prefix.length)}`)]),
  );
  return keys.length;
}

/**
 * Resolve the caller's `ownerId` from the `Authorization: Bearer <token>`
 * header. Returns `null` for a missing/malformed header or an unknown/expired
 * token — callers turn that into a 401, never a crash.
 */
export async function ownerIdFromRequest(
  request: Request,
  kv: KVNamespace,
): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  const session = await getSession(kv, token);
  return session?.ownerId ?? null;
}

// --- OAuth state (CSRF nonce + redirect_uri round-trip) ---------------------

/**
 * What `/auth/discord/start` stashes in KV against the OAuth `state` param.
 * `browserNonce` is the login-CSRF binding: a second random value that only
 * ever travels in a short-lived HttpOnly cookie set on the *initiating*
 * browser (see `discord-oauth.ts`). Without it, an attacker could start
 * their own OAuth flow, capture the valid `state`, and get a victim's
 * browser to complete the callback — logging the victim into the
 * attacker's account. The callback requires cookie == stored nonce before
 * consuming the state, which an attacker can't satisfy on someone else's
 * browser.
 */
export interface OAuthState {
  redirectUri: string;
  browserNonce: string;
}

export async function createOAuthState(kv: KVNamespace, state: OAuthState): Promise<string> {
  const nonce = randomToken(16);
  await kv.put(`oauthstate:${nonce}`, JSON.stringify(state), {
    expirationTtl: OAUTH_STATE_TTL_SECONDS,
  });
  return nonce;
}

/** Consume (read-then-delete, single use) the record stashed for an OAuth `state` nonce. */
export async function consumeOAuthState(
  kv: KVNamespace,
  nonce: string,
): Promise<OAuthState | null> {
  const key = `oauthstate:${nonce}`;
  const raw = await kv.get(key);
  if (raw === null) return null;
  await kv.delete(key);
  // Parse + shape-check defensively (a malformed/legacy entry reads as
  // "invalid state" — a 400 at the callback — never a thrown 500).
  try {
    const state = JSON.parse(raw) as OAuthState;
    if (typeof state !== "object" || state === null) return null;
    if (typeof state.redirectUri !== "string" || typeof state.browserNonce !== "string") {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

/** Generate a fresh browser nonce for {@link OAuthState.browserNonce}. */
export function newBrowserNonce(): string {
  return randomToken(16);
}

/**
 * Constant-time string equality for nonce comparison (workers-best-practices:
 * never compare secret values with `===`). Length is checked first because
 * `crypto.subtle.timingSafeEqual` throws on unequal lengths — and length
 * isn't secret here (both sides are fixed-size generated nonces).
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}
