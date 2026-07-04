/**
 * Dumb persistence for opaque `CharacterDoc` blobs (DESIGN.md §2.1 / the
 * project's one non-negotiable rule: the server never computes or
 * interprets game data). The only fields this module ever reads are the
 * three envelope fields the schema already carries for this exact purpose —
 * `id`, `version`, `updatedAt` — plus writing `ownerId` (server-assigned,
 * never trusted from the client). Everything else in the JSON body passes
 * through untouched.
 *
 * Storage: one `CHARACTERS` KV entry per document, keyed `<ownerId>::<id>`
 * so a `list({ prefix })` scan is naturally scoped to one owner. `version`/
 * `updatedAt` are duplicated into the KV entry's `metadata` so listing is a
 * single KV `list` call — no need to fetch and parse every owned blob just
 * to show a character switcher.
 */
import { errorJson, json } from "./http.js";

/**
 * 2 MB — generous for a fully-built character (deep gear list, full
 * spellbook, many saved rolls) while still bounding KV storage and abuse.
 * A fixed constant (not a config var) is the simplest choice consistent with
 * DESIGN §2.1's "envelope-level checks only" posture — this cap, like the
 * JSON-well-formedness check, is a size/shape check, never a peek at game
 * content.
 */
const MAX_DOC_BYTES = 2_000_000;

interface StoredMeta {
  version: number;
  updatedAt: string;
}

function keyFor(ownerId: string, id: string): string {
  return `${ownerId}::${id}`;
}

class PayloadTooLargeError extends Error {}

/**
 * Read the request body as text, aborting the stream (never buffering
 * unbounded input in memory) the moment it exceeds `maxBytes` — the
 * workers-best-practices "stream large/unknown payloads" rule applied to a
 * body whose *expected* size is small but whose *actual* size is
 * client-controlled.
 */
async function readBodyWithCap(request: Request, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let out = "";
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

/** `GET /api/characters` — list this owner's docs (envelope only: id/version/updatedAt). */
export async function listCharacters(ownerId: string, env: Env): Promise<Response> {
  const prefix = keyFor(ownerId, "");
  const list = await env.CHARACTERS.list<StoredMeta>({ prefix });
  const characters = list.keys.map((k) => ({
    id: k.name.slice(prefix.length),
    version: k.metadata?.version ?? 0,
    updatedAt: k.metadata?.updatedAt ?? "",
  }));
  return json({ characters });
}

/** `GET /api/characters/:id` — fetch the full opaque document. */
export async function getCharacter(ownerId: string, id: string, env: Env): Promise<Response> {
  const raw = await env.CHARACTERS.get(keyFor(ownerId, id));
  if (raw === null) return errorJson(404, "Not found");
  return new Response(raw, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * `PUT /api/characters/:id` — push a document.
 *
 * Optimistic concurrency (DESIGN §2.1): the pushed `version` must be
 * strictly greater than whatever is currently stored (or nothing may be
 * stored yet). Otherwise this is a stale write — respond `409` with the
 * currently-stored document so the client can implement "a newer version
 * exists on another device — reload?" (or let the user force-overwrite by
 * re-pushing with a bumped version).
 */
export async function putCharacter(
  ownerId: string,
  id: string,
  request: Request,
  env: Env,
): Promise<Response> {
  let raw: string;
  try {
    raw = await readBodyWithCap(request, MAX_DOC_BYTES);
  } catch (e) {
    if (e instanceof PayloadTooLargeError) {
      return errorJson(413, `Document exceeds the ${MAX_DOC_BYTES}-byte limit`);
    }
    throw e;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return errorJson(400, "Body is not valid JSON");
  }

  // Envelope-only validation — the Worker never looks at `identity`/`build`/
  // `live`. `id`/`version`/`updatedAt` are exactly the three fields
  // CharacterDoc carries for this purpose (packages/schema/src/character.ts).
  if (body["id"] !== id) return errorJson(400, "Body `id` must match the URL path");
  const version = body["version"];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return errorJson(400, "Body `version` must be a positive integer");
  }
  const updatedAt = body["updatedAt"];
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) {
    return errorJson(400, "Body `updatedAt` must be an ISO-8601 timestamp string");
  }

  const key = keyFor(ownerId, id);
  const existing = await env.CHARACTERS.getWithMetadata<StoredMeta>(key, "text");
  if (existing.metadata && existing.metadata.version >= version) {
    return json(
      {
        error: "conflict: a newer version exists on another device",
        current: existing.value ? JSON.parse(existing.value) : null,
      },
      { status: 409 },
    );
  }

  // The server owns `ownerId` — never trust the client's copy of this field,
  // or a caller could write into another user's namespace. Everything else
  // in `body` is opaque and passes through unmodified.
  body["ownerId"] = ownerId;
  const stored = JSON.stringify(body);
  const meta: StoredMeta = { version, updatedAt };
  await env.CHARACTERS.put(key, stored, { metadata: meta });
  return json({ id, version, updatedAt }, { status: 200 });
}

/** `DELETE /api/characters/:id` — idempotent; succeeds even if already absent. */
export async function deleteCharacter(ownerId: string, id: string, env: Env): Promise<Response> {
  await env.CHARACTERS.delete(keyFor(ownerId, id));
  return new Response(null, { status: 204 });
}
