/**
 * Stage 5 persistence Worker (DESIGN.md §2.1). A thin router over three
 * concerns: Discord OAuth login, session lookup, and CRUD on opaque
 * `CharacterDoc` blobs. No framework — the route table is small enough that
 * a dependency would cost more than it saves (workers-best-practices:
 * prefer bindings/small code over unnecessary layers).
 */
import "./env.js";
import { recordRequest } from "./analytics.js";
import { deleteCharacter, getCharacter, listCharacters, putCharacter } from "./characters.js";
import { handlePreflight, withCors } from "./cors.js";
import { handleCallback, handleStart } from "./discord-oauth.js";
import { errorJson, json } from "./http.js";
import { deleteSession, ownerIdFromRequest } from "./session.js";

const CHARACTER_PATH = /^\/api\/characters(?:\/([^/]+))?$/;

/**
 * Coarse, fixed-enum label for a request — for telemetry (analytics.ts) and
 * structured logs. Deliberately never the raw pathname: that carries the
 * opaque docId, which must not land in metrics or logs.
 */
function routeLabel(method: string, pathname: string): string {
  if (method === "OPTIONS") return "preflight";
  if (pathname === "/auth/discord/start") return "auth.start";
  if (pathname === "/auth/discord/callback") return "auth.callback";
  if (pathname === "/auth/logout") return "auth.logout";
  if (pathname === "/api/me") return "me";
  const charMatch = CHARACTER_PATH.exec(pathname);
  if (charMatch) {
    const hasId = Boolean(charMatch[1]);
    if (method === "GET") return hasId ? "characters.get" : "characters.list";
    if (method === "PUT") return "characters.put";
    if (method === "DELETE") return "characters.delete";
    return "characters.other";
  }
  return "other";
}

function bearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return undefined;
  const token = auth.slice("Bearer ".length).trim();
  return token || undefined;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const { method } = request;

  if (method === "OPTIONS") return handlePreflight(request, env);

  if (pathname === "/auth/discord/start" && method === "GET") {
    return handleStart(request, env);
  }
  if (pathname === "/auth/discord/callback" && method === "GET") {
    return handleCallback(request, env);
  }
  if (pathname === "/auth/logout" && method === "POST") {
    const token = bearerToken(request);
    if (token) await deleteSession(env.KV, token);
    return new Response(null, { status: 204 });
  }

  if (pathname === "/api/me" && method === "GET") {
    const ownerId = await ownerIdFromRequest(request, env.KV);
    if (!ownerId) return errorJson(401, "Not authenticated");
    return json({ ownerId });
  }

  const charMatch = CHARACTER_PATH.exec(pathname);
  if (charMatch) {
    const ownerId = await ownerIdFromRequest(request, env.KV);
    if (!ownerId) return errorJson(401, "Not authenticated");
    const id = charMatch[1] ? decodeURIComponent(charMatch[1]) : undefined;

    if (!id && method === "GET") return listCharacters(ownerId, env);
    if (id && method === "GET") return getCharacter(ownerId, id, env);
    if (id && method === "PUT") return putCharacter(ownerId, id, request, env);
    if (id && method === "DELETE") return deleteCharacter(ownerId, id, env);
    return errorJson(405, "Method not allowed");
  }

  return errorJson(404, "Not found");
}

export default {
  // `ctx` is unused (no `waitUntil` work here — every route awaits its own
  // KV/fetch calls before responding) but stays a named parameter so this
  // matches `ExportedHandlerFetchHandler`'s 3-arg signature exactly, rather
  // than relying on JS's "extra call args are ignored" — `satisfies` checks
  // structural compatibility but doesn't widen the literal's own inferred
  // type, so callers (including the vitest-pool-workers tests) need the real
  // arity here.
  async fetch(request, env, ctx): Promise<Response> {
    void ctx;
    const startedAt = Date.now();
    const label = routeLabel(request.method, new URL(request.url).pathname);
    let response: Response;
    try {
      response = withCors(await route(request, env), request, env);
    } catch (err) {
      // Structured (JSON) so Workers Logs filter by `event`/`route` instead of
      // grepping free text. No `ctx.passThroughOnException()` — an explicit
      // try/catch keeps failures visible and debuggable rather than silently
      // falling through.
      console.error(
        JSON.stringify({
          level: "error",
          event: "unhandled_exception",
          route: label,
          method: request.method,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        }),
      );
      response = withCors(errorJson(500, "Internal error"), request, env);
    }
    recordRequest(env, {
      route: label,
      method: request.method,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    return response;
  },
} satisfies ExportedHandler<Env>;
