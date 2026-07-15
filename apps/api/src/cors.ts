/**
 * CORS for the SPA calling this API cross-origin. Auth is a bearer token in
 * `Authorization` (see `session.ts`), never a cookie, so there is no
 * `Access-Control-Allow-Credentials` / SameSite dance to do — just an
 * explicit origin allow-list (`ALLOWED_APP_ORIGINS`, comma-separated; never
 * reflect `*`, so a legitimate caller can be named exactly) plus the
 * headers/methods this API actually uses.
 */
const ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const ALLOWED_HEADERS = "authorization,content-type";

export function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_APP_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * The bare hostnames of the allowed origins (`http://localhost:5173` ->
 * `localhost`). Used by the feedback endpoint to assert the hostname a
 * Turnstile token was solved on is one of ours — a stronger "from our app"
 * signal than the (forgeable) `Origin` header. Malformed entries are skipped.
 */
export function allowedHostnames(env: Env): string[] {
  const hosts: string[] = [];
  for (const origin of allowedOrigins(env)) {
    try {
      hosts.push(new URL(origin).hostname);
    } catch {
      // A non-URL entry in the allow-list contributes no hostname.
    }
  }
  return hosts;
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins(env).includes(origin)) {
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
