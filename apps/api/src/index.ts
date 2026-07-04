/**
 * Stage 5 persistence Worker (DESIGN.md §2.1). A thin router over three
 * concerns: GitHub OAuth login, session lookup, and CRUD on opaque
 * `CharacterDoc` blobs. No framework — the route table is small enough that
 * a dependency would cost more than it saves (workers-best-practices:
 * prefer bindings/small code over unnecessary layers).
 */
import "./env.js";
import {
  deleteCharacter,
  getCharacter,
  listCharacters,
  putCharacter,
} from "./characters.js";
import { handlePreflight, withCors } from "./cors.js";
import { handleCallback, handleStart } from "./github-oauth.js";
import { errorJson, json } from "./http.js";
import { deleteSession, ownerIdFromRequest } from "./session.js";

const CHARACTER_PATH = /^\/api\/characters(?:\/([^/]+))?$/;

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

  if (pathname === "/auth/github/start" && method === "GET") {
    return handleStart(request, env);
  }
  if (pathname === "/auth/github/callback" && method === "GET") {
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
    try {
      const response = await route(request, env);
      return withCors(response, request, env);
    } catch (err) {
      // No `ctx.passThroughOnException()` — an explicit try/catch is the
      // best-practices-recommended way to keep failures visible/debuggable
      // rather than silently falling through.
      console.error("Unhandled error in ledgermain-api", err);
      return withCors(errorJson(500, "Internal error"), request, env);
    }
  },
} satisfies ExportedHandler<Env>;
