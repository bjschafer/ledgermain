/**
 * GitHub OAuth login (DESIGN.md §2.1: "GitHub OAuth or email magic-link").
 * Picked GitHub since the target audience (this project's owner + players)
 * are developers who already have accounts, and it needs no email-sending
 * infrastructure. The Worker never sees the user's GitHub password; it only
 * exchanges an authorization `code` for an access token, reads the stable
 * numeric account id, and immediately discards the GitHub token — this app
 * has no ongoing use for the GitHub API beyond identifying the user once.
 */
import { allowedOrigins } from "./cors.js";
import { consumeOAuthState, createOAuthState, createSession } from "./session.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

/**
 * `GET /auth/github/start?redirect_uri=<web app origin>`
 *
 * Redirects to GitHub's OAuth consent screen. `redirect_uri` must match one
 * of `ALLOWED_APP_ORIGINS` exactly (by origin) — never trust an
 * arbitrary caller-supplied redirect, that's an open-redirect / token-theft
 * vector. It's round-tripped via GitHub's own `state` param (stored
 * server-side against a random nonce) so the callback knows where to send
 * the signed-in user back to.
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

  const state = await createOAuthState(env.KV, redirectUri);
  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", new URL("/auth/github/callback", url).toString());
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  return Response.redirect(authorize.toString(), 302);
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
 * Exchanges `code` for a GitHub access token, reads the stable numeric
 * GitHub user id (never the mutable login/email — DESIGN §2.1 wants a
 * durable `ownerId`), mints a session, and redirects back to the app with
 * the session token in the URL **fragment** (`#session=...`), never a query
 * string — fragments are not sent to servers/proxies/Referer headers. The
 * client-side sync module reads `location.hash`, moves the token into
 * localStorage, and strips it from the URL.
 */
export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return new Response("Missing code or state", { status: 400 });

  const redirectUri = await consumeOAuthState(env.KV, state);
  if (!redirectUri) return new Response("Invalid or expired OAuth state", { status: 400 });

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

  const dest = new URL(redirectUri);
  dest.hash = `session=${token}`;
  return Response.redirect(dest.toString(), 302);
}
