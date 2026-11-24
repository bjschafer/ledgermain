/**
 * CORS for the SPAs calling this API cross-origin. Auth is a bearer token in
 * `Authorization` (see `session.ts`), never a cookie, so there is no
 * `Access-Control-Allow-Credentials` / SameSite dance to do — just explicit
 * origin allow-lists (never reflect `*`, so a legitimate caller can be named
 * exactly) plus the headers/methods this API actually uses.
 *
 * Two lists, split by how much each origin is trusted with:
 *  - `ALLOWED_APP_ORIGINS`: the sheet. CORS on every route, and a valid
 *    post-login redirect target (it receives a real session token).
 *  - `FEEDBACK_ONLY_ORIGINS`: sites that only send feedback (the reference
 *    site). CORS on `POST /api/feedback` alone, and never a login redirect.
 * Both feed the Turnstile hostname assertion.
 */
const ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const ALLOWED_HEADERS = "authorization,content-type,x-base-version";

const FEEDBACK_PATH = "/api/feedback";

function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Origins trusted with the whole API, including the post-login redirect. */
export function allowedOrigins(env: Env): string[] {
  return parseList(env.ALLOWED_APP_ORIGINS);
}

function feedbackOnlyOrigins(env: Env): string[] {
  return parseList(env.FEEDBACK_ONLY_ORIGINS);
}

/**
 * The bare hostnames of every origin allowed to submit feedback
 * (`http://localhost:5173` -> `localhost`). Used by the feedback endpoint to
 * assert the hostname a Turnstile token was solved on is one of ours — a
 * stronger "from our app" signal than the (forgeable) `Origin` header.
 * Malformed entries are skipped.
 */
export function allowedHostnames(env: Env): string[] {
  const hosts: string[] = [];
  for (const origin of [...allowedOrigins(env), ...feedbackOnlyOrigins(env)]) {
    try {
      hosts.push(new URL(origin).hostname);
    } catch {
      // A non-URL entry in the allow-list contributes no hostname.
    }
  }
  return hosts;
}

function isAllowedOrigin(origin: string, request: Request, env: Env): boolean {
  if (allowedOrigins(env).includes(origin)) return true;
  return (
    new URL(request.url).pathname === FEEDBACK_PATH && feedbackOnlyOrigins(env).includes(origin)
  );
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin, request, env)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", ALLOWED_METHODS);
    headers.set("access-control-allow-headers", ALLOWED_HEADERS);
    headers.set("vary", "origin");
  }
  return headers;
}

/** Wrap a handler's response with CORS headers for the request's origin (if allowed). */
export function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  corsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Handle a CORS preflight `OPTIONS` request. */
export function handlePreflight(request: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
