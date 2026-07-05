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

/**
 * Retention window for delete tombstones (90 days). A tombstone lets another
 * device (or this one, on its next open-sync) distinguish "this character was
 * deleted" from "this character was never synced here yet" — without one, a
 * deleted doc resurfaces as a pull (issue #39). Implemented as a KV
 * `expirationTtl` so old tombstones self-evict: a device offline longer than
 * this window would re-push a deleted character, an acceptable bound for a
 * single-user tool (nothing here is load-bearing for correctness, only for
 * suppressing a stale resurrection).
 */
const TOMBSTONE_TTL_SECONDS = 90 * 24 * 60 * 60;

interface StoredMeta {
  version: number;
  updatedAt: string;
}

interface TombstoneMeta {
  deletedAt: string;
}

function keyFor(ownerId: string, id: string): string {
  return `${ownerId}::${id}`;
}

// Tombstones live under a distinct `tomb::`-prefixed namespace so they never
// collide with, or show up in, the `<ownerId>::` document-list scan.
function tombKeyFor(ownerId: string, id: string): string {
  return `tomb::${ownerId}::${id}`;
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
    // oxlint-disable-next-line no-await-in-loop -- stream chunks are inherently sequential
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      // oxlint-disable-next-line no-await-in-loop -- abort path, loop exits here
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

/**
 * `GET /api/characters` — list this owner's docs (envelope only:
 * id/version/updatedAt) plus any live delete `tombstones` ({ id, deletedAt }),
 * so an open-sync pass can drop locally-resurfaced deletions in the same round
 * trip it already makes (issue #39).
 */
export async function listCharacters(ownerId: string, env: Env): Promise<Response> {
  const prefix = keyFor(ownerId, "");
  const tombPrefix = tombKeyFor(ownerId, "");
  const [list, tombList] = await Promise.all([
    env.CHARACTERS.list<StoredMeta>({ prefix }),
    env.CHARACTERS.list<TombstoneMeta>({ prefix: tombPrefix }),
  ]);
  const characters = list.keys.map((k) => ({
    id: k.name.slice(prefix.length),
    version: k.metadata?.version ?? 0,
    updatedAt: k.metadata?.updatedAt ?? "",
  }));
  const tombstones = tombList.keys.map((k) => ({
    id: k.name.slice(tombPrefix.length),
    deletedAt: k.metadata?.deletedAt ?? "",
  }));
  return json({ characters, tombstones });
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
  // A live document authoritatively cancels any earlier tombstone for the same
  // id — e.g. a device that edited the character concurrently with another's
  // delete re-pushes it here, and the write should win over the stale
  // tombstone rather than the character flickering back out on next open-sync.
  await env.CHARACTERS.delete(tombKeyFor(ownerId, id));
  return json({ id, version, updatedAt }, { status: 200 });
}

/**
 * `DELETE /api/characters/:id` — idempotent; succeeds even if already absent.
 * Leaves a tombstone (see `TOMBSTONE_TTL_SECONDS`) so the deletion propagates
 * to other devices via open-sync instead of the character resurfacing (#39).
 */
export async function deleteCharacter(ownerId: string, id: string, env: Env): Promise<Response> {
  await env.CHARACTERS.delete(keyFor(ownerId, id));
  const meta: TombstoneMeta = { deletedAt: new Date().toISOString() };
  await env.CHARACTERS.put(tombKeyFor(ownerId, id), "", {
    metadata: meta,
    expirationTtl: TOMBSTONE_TTL_SECONDS,
  });
  return new Response(null, { status: 204 });
}
