/**
 * GitHub OAuth login (DESIGN.md §2.1: "GitHub OAuth or email magic-link").
 * Picked GitHub since the target audience (this project's owner + players)
 * are developers who already have accounts, and it needs no email-sending
 * infrastructure. The Worker never sees the user's GitHub password; it only
 * exchanges an authorization `code` for an access token, reads the stable
 * numeric account id, and immediately discards the GitHub token — this app
 * has no ongoing use for the GitHub API beyond identifying the user once.
 *
 * Login-CSRF defense: the OAuth `state` alone only proves the callback came
 * from a flow *someone* started — not that the browser completing it is the
 * browser that started it. So `/start` also sets a short-lived HttpOnly
 * cookie (`__Host-oauth_nonce`) whose value is stored inside the KV state
 * record, and `/callback` requires cookie == stored nonce before honoring
 * the state. An attacker who starts their own flow gets a valid `state`,
 * but can't plant the matching cookie on a victim's browser, so they can't
 * log the victim into the attacker's account. These two endpoints are
 * top-level browser navigations on the API origin, so a SameSite=Lax cookie
 * works here even though API sessions themselves stay bearer-token.
 */
import { allowedOrigins } from "./cors.js";
import {
  consumeOAuthState,
  createOAuthState,
  createSession,
  newBrowserNonce,
  timingSafeStringEqual,
} from "./session.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

/**
 * `__Host-` prefix: the browser only accepts the cookie with `Secure`,
 * `Path=/`, and no `Domain` attribute, guaranteeing it can't be planted by
 * a subdomain or over plain HTTP. Path=/ (required by the prefix) is
 * broader than the two /auth/github/* endpoints, but the cookie is
 * HttpOnly, 10-minute, and meaningless outside the callback check, so the
 * wider path costs nothing. Browsers treat localhost as a secure context,
 * so `wrangler dev` over http://localhost still works.
 */
const NONCE_COOKIE = "__Host-oauth_nonce";
const NONCE_COOKIE_TTL_SECONDS = 60 * 10; // matches the KV state record's TTL

function nonceCookie(value: string, maxAge: number): string {
  return `${NONCE_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

/** Read the browser-nonce cookie off a request; undefined when absent. */
function readNonceCookie(request: Request): string | undefined {
  const cookies = request.headers.get("cookie");
  if (!cookies) return undefined;
  for (const part of cookies.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === NONCE_COOKIE) return part.slice(eq + 1).trim();
  }
  return undefined;
}

/**
 * `GET /auth/github/start?redirect_uri=<web app origin>`
 *
 * Redirects to GitHub's OAuth consent screen. `redirect_uri` must match one
 * of `ALLOWED_APP_ORIGINS` exactly (by origin) — never trust an
 * arbitrary caller-supplied redirect, that's an open-redirect / token-theft
 * vector. It's round-tripped via GitHub's own `state` param (stored
 * server-side against a random nonce) so the callback knows where to send
 * the signed-in user back to. Also sets the browser-nonce cookie described
 * in the module doc comment.
 */
export async function handleStart(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri");
  if (!redirectUri) {
    return new Response("Missing redirect_uri", { status: 400 });
  }
  let redirectOrigin: string;
  try {
    redirectOrigin = new URL(redirectUri).origin;
  } catch {
    return new Response("Malformed redirect_uri", { status: 400 });
  }
  if (!allowedOrigins(env).includes(redirectOrigin)) {
    return new Response("redirect_uri is not in ALLOWED_APP_ORIGINS", { status: 400 });
  }

  const browserNonce = newBrowserNonce();
  const state = await createOAuthState(env.KV, { redirectUri, browserNonce });
  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", new URL("/auth/github/callback", url).toString());
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  // Built by hand rather than `Response.redirect()` (immutable headers) —
  // the Set-Cookie for the browser nonce has to ride on this redirect.
  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      "set-cookie": nonceCookie(browserNonce, NONCE_COOKIE_TTL_SECONDS),
    },
  });
}

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GithubUserResponse {
  id?: number;
}

/**
 * `GET /auth/github/callback?code=...&state=...`
 *
 * Verifies the browser-nonce cookie against the KV state record (login-CSRF
 * defense — see module doc comment), exchanges `code` for a GitHub access
 * token, reads the stable numeric GitHub user id (never the mutable
 * login/email — DESIGN §2.1 wants a durable `ownerId`), mints a session,
 * and redirects back to the app with the session token in the URL
 * **fragment** (`#session=...`), never a query string — fragments are not
 * sent to servers/proxies/Referer headers. The client-side sync module
 * reads `location.hash`, moves the token into localStorage, and strips it
 * from the URL.
 */
export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return new Response("Missing code or state", { status: 400 });

  // The state record is consumed (deleted) *before* the cookie comparison,
  // so a failed cookie check still burns the state — it stays single-use
  // whether or not the CSRF check passes.
  const stored = await consumeOAuthState(env.KV, state);
  if (!stored) return new Response("Invalid or expired OAuth state", { status: 400 });

  const cookieNonce = readNonceCookie(request);
  if (!cookieNonce || !timingSafeStringEqual(cookieNonce, stored.browserNonce)) {
    // Missing or mismatched browser nonce: this browser did not initiate
    // the flow (a login-CSRF attempt — or cookies disabled/expired).
    return new Response("OAuth flow was not initiated by this browser", { status: 400 });
  }

  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!tokenRes.ok) return new Response("GitHub token exchange failed", { status: 502 });
  const tokenBody = (await tokenRes.json()) as GithubTokenResponse;
  if (!tokenBody.access_token) {
    const detail = tokenBody.error_description ?? tokenBody.error ?? "unknown error";
    return new Response(`GitHub token exchange failed: ${detail}`, { status: 502 });
  }

  const userRes = await fetch(GITHUB_USER_URL, {
    headers: {
      authorization: `Bearer ${tokenBody.access_token}`,
      "user-agent": "ledgermain-api",
      accept: "application/vnd.github+json",
    },
  });
  if (!userRes.ok) return new Response("GitHub user lookup failed", { status: 502 });
  const user = (await userRes.json()) as GithubUserResponse;
  if (typeof user.id !== "number") {
    return new Response("GitHub user lookup returned no id", { status: 502 });
  }

  const ownerId = `github:${user.id}`;
  const token = await createSession(env.KV, ownerId);

  const dest = new URL(stored.redirectUri);
  dest.hash = `session=${token}`;
  // Hand-built (not Response.redirect) so the now-spent nonce cookie can be
  // cleared on the way out.
  return new Response(null, {
    status: 302,
    headers: {
      location: dest.toString(),
      "set-cookie": nonceCookie("", 0),
    },
  });
}
