/**
 * Session + OAuth-state storage in the `KV` binding. Sessions map an opaque
 * bearer token to a stable `ownerId` (DESIGN.md §2.1: "identity stays
 * boring" — no JWT signing, no cookies; just a random token the client keeps
 * in localStorage and sends as `Authorization: Bearer <token>`). OAuth state
 * nonces are a short-lived KV entry rather than a signed value, since a KV
 * round trip is cheap and this avoids needing another secret.
 */

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10 minutes — just long enough for the GitHub redirect round trip

export interface Session {
  ownerId: string;
  createdAt: string;
}

function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(kv: KVNamespace, ownerId: string): Promise<string> {
  const token = randomToken(32);
  const session: Session = { ownerId, createdAt: new Date().toISOString() };
  await kv.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return token;
}

export async function getSession(kv: KVNamespace, token: string): Promise<Session | null> {
  return kv.get<Session>(`session:${token}`, "json");
}

export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`session:${token}`);
}

/**
 * Resolve the caller's `ownerId` from the `Authorization: Bearer <token>`
 * header. Returns `null` for a missing/malformed header or an unknown/expired
 * token — callers turn that into a 401, never a crash.
 */
export async function ownerIdFromRequest(request: Request, kv: KVNamespace): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  const session = await getSession(kv, token);
  return session?.ownerId ?? null;
}

// --- OAuth state (CSRF nonce + redirect_uri round-trip) ---------------------

export async function createOAuthState(kv: KVNamespace, redirectUri: string): Promise<string> {
  const nonce = randomToken(16);
  await kv.put(`oauthstate:${nonce}`, redirectUri, { expirationTtl: OAUTH_STATE_TTL_SECONDS });
  return nonce;
}

/** Consume (read-then-delete, single use) the `redirect_uri` stashed for an OAuth `state` nonce. */
export async function consumeOAuthState(kv: KVNamespace, nonce: string): Promise<string | null> {
  const key = `oauthstate:${nonce}`;
  const redirectUri = await kv.get(key);
  if (redirectUri) await kv.delete(key);
  return redirectUri;
}
