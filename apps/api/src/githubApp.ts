/**
 * Minimal GitHub App authentication + issue creation, hand-rolled on WebCrypto
 * so the Worker pulls in no Octokit dependency (its `index.ts` states the "no
 * framework — a dependency would cost more than it saves" rule; this surface is
 * small enough to honor it). The reference behavior is `gr2m`'s
 * cloudflare-worker-github-app-example — read as an oracle, not copied.
 *
 * Why a GitHub App and not a personal token: issues open as the App's bot
 * identity (`<app-name>[bot]`), never the owner's account, and the credential
 * the Worker holds is a *short-lived* installation token minted on demand —
 * not a long-lived secret that can open issues as a human. The only durable
 * secret is the App's private key.
 *
 * Flow (GitHub App auth):
 *  1. Sign a short (~10 min) RS256 JWT with the App's private key — proves
 *     "I am this App".
 *  2. Exchange it for an installation access token scoped to the one repo the
 *     App is installed on. Installation tokens live ~1 hour.
 *  3. Cache the installation token in KV until shortly before it expires, so
 *     the JWT sign + exchange only happen a few times an hour, not per request.
 */

/** base64url (no padding) of raw bytes — the JWT segment encoding. */
function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlJson(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

/**
 * Import a PKCS#8 PEM private key for RSASSA-PKCS1-v1_5 / SHA-256 signing.
 * GitHub issues App keys in PKCS#1 (`BEGIN RSA PRIVATE KEY`); WebCrypto only
 * accepts PKCS#8 (`BEGIN PRIVATE KEY`), so the owner converts once with
 * `openssl pkcs8 -topk8` before storing it as the `GITHUB_APP_PRIVATE_KEY`
 * secret (see README setup). A PKCS#1 key lands here as an unparseable base64
 * body and throws — surfaced as a 500, not a silent wrong signature.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * A GitHub App JWT: `iss` is the App id, valid for a short window. `iat` is
 * backdated 60s to tolerate minor clock skew between us and GitHub (GitHub's
 * documented guidance), `exp` capped at the 10-minute maximum GitHub allows.
 */
export async function signAppJwt(
  appId: string,
  privateKeyPem: string,
  nowSeconds: number,
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: nowSeconds - 60, exp: nowSeconds + 600, iss: appId };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

// GitHub requires a User-Agent on every request; it recommends the App name.
const USER_AGENT = "ledgermain-feedback";
const GITHUB_API = "https://api.github.com";

interface InstallationTokenResponse {
  token: string;
  expires_at: string;
}

/**
 * Exchange a signed App JWT for an installation access token. Separated from
 * {@link getInstallationToken} so it can be exercised with a mocked `fetch`
 * without touching KV.
 */
export async function fetchInstallationToken(
  jwt: string,
  installationId: string,
): Promise<InstallationTokenResponse> {
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: "application/vnd.github+json",
      "user-agent": USER_AGENT,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`installation token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as InstallationTokenResponse;
}

const TOKEN_CACHE_KEY = "github:installation-token";
// Refresh a minute before GitHub's ~1h expiry so a cached token never goes
// stale mid-request.
const TOKEN_SKEW_SECONDS = 60;

/**
 * A valid installation access token, minted on demand and cached in KV until
 * just before it expires. `nowSeconds` is injectable for tests; production
 * passes `Date.now() / 1000`.
 */
export async function getInstallationToken(env: Env, nowSeconds: number): Promise<string> {
  const cached = await env.KV.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const jwt = await signAppJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, nowSeconds);
  const { token, expires_at } = await fetchInstallationToken(jwt, env.GITHUB_APP_INSTALLATION_ID);

  const expiresInSeconds = Math.floor(new Date(expires_at).getTime() / 1000 - nowSeconds);
  const ttl = expiresInSeconds - TOKEN_SKEW_SECONDS;
  // KV's minimum TTL is 60s; only cache when there's a worthwhile window left.
  if (ttl >= 60) {
    await env.KV.put(TOKEN_CACHE_KEY, token, { expirationTtl: ttl });
  }
  return token;
}

export interface NewIssue {
  title: string;
  body: string;
  /** Best-effort: unknown labels are silently dropped by the create endpoint. */
  labels?: string[];
}

export interface CreatedIssue {
  number: number;
  htmlUrl: string;
}

/** Create an issue in `env.GITHUB_FEEDBACK_REPO` (`owner/repo`) as the App. */
export async function createIssue(env: Env, token: string, issue: NewIssue): Promise<CreatedIssue> {
  const res = await fetch(`${GITHUB_API}/repos/${env.GITHUB_FEEDBACK_REPO}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": USER_AGENT,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({ title: issue.title, body: issue.body, labels: issue.labels }),
  });
  if (!res.ok) {
    throw new Error(`create issue failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, htmlUrl: data.html_url };
}
