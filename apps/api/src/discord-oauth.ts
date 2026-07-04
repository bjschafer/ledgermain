/**
 * Discord OAuth login (DESIGN.md §2.1: "GitHub OAuth or email magic-link";
 * Discord was picked over GitHub because the actual target audience — TTRPG
 * players, not developers — overwhelmingly already has a Discord account,
 * while a GitHub account is a dev-tool assumption that doesn't hold broadly.
 * It also needs no email-sending infrastructure. The Worker never sees the
 * user's Discord password; it only exchanges an authorization `code` for an
 * access token, reads the stable numeric (snowflake) account id, and
 * immediately discards the Discord token — this app has no ongoing use for
 * the Discord API beyond identifying the user once.
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

const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";

/**
 * `__Host-` prefix: the browser only accepts the cookie with `Secure`,
 * `Path=/`, and no `Domain` attribute, guaranteeing it can't be planted by
 * a subdomain or over plain HTTP. Path=/ (required by the prefix) is
 * broader than the two /auth/discord/* endpoints, but the cookie is
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
 * `GET /auth/discord/start?redirect_uri=<web app origin>`
 *
 * Redirects to Discord's OAuth consent screen. `redirect_uri` must match one
 * of `ALLOWED_APP_ORIGINS` exactly (by origin) — never trust an
 * arbitrary caller-supplied redirect, that's an open-redirect / token-theft
 * vector. It's round-tripped via Discord's own `state` param (stored
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
  const authorize = new URL(DISCORD_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", new URL("/auth/discord/callback", url).toString());
  authorize.searchParams.set("scope", "identify");
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

interface DiscordTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface DiscordUserResponse {
  id?: string; // snowflake, always a numeric string — never parse it as a JS number
}

/**
 * `GET /auth/discord/callback?code=...&state=...`
 *
 * Verifies the browser-nonce cookie against the KV state record (login-CSRF
 * defense — see module doc comment), exchanges `code` for a Discord access
 * token, reads the stable snowflake user id (never the mutable username —
 * DESIGN §2.1 wants a durable `ownerId`), mints a session, and redirects
 * back to the app with the session token in the URL **fragment**
 * (`#session=...`), never a query string — fragments are not sent to
 * servers/proxies/Referer headers. The client-side sync module reads
 * `location.hash`, moves the token into localStorage, and strips it from
 * the URL.
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

  // Discord's token endpoint is a standard OAuth2 token endpoint — it wants
  // application/x-www-form-urlencoded, not JSON (unlike GitHub's, which
  // accepts either).
  const tokenRes = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: new URL("/auth/discord/callback", url).toString(),
    }),
  });
  if (!tokenRes.ok) return new Response("Discord token exchange failed", { status: 502 });
  const tokenBody = (await tokenRes.json()) as DiscordTokenResponse;
  if (!tokenBody.access_token) {
    const detail = tokenBody.error_description ?? tokenBody.error ?? "unknown error";
    return new Response(`Discord token exchange failed: ${detail}`, { status: 502 });
  }

  const userRes = await fetch(DISCORD_USER_URL, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (!userRes.ok) return new Response("Discord user lookup failed", { status: 502 });
  const user = (await userRes.json()) as DiscordUserResponse;
  if (typeof user.id !== "string" || !user.id) {
    return new Response("Discord user lookup returned no id", { status: 502 });
  }

  const ownerId = `discord:${user.id}`;
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
