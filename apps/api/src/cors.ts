/**
 * CORS for the SPA calling this API cross-origin. Auth is a bearer token in
 * `Authorization` (see `session.ts`), never a cookie, so there is no
 * `Access-Control-Allow-Credentials` / SameSite dance to do — just an
 * explicit origin allow-list (`ALLOWED_APP_ORIGINS`, comma-separated; never
 * reflect `*`, so a legitimate caller can be named exactly) plus the
 * headers/methods this API actually uses.
 */
const ALLOWED_METHODS = "GET,PUT,DELETE,OPTIONS";
const ALLOWED_HEADERS = "authorization,content-type";

export function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_APP_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
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
