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
import { PayloadTooLargeError, readBodyWithCap } from "./body.js";
import { errorJson, json } from "./http.js";
import { listAllKeys } from "./kv.js";
import { overRateLimit, tooManyRequests, type RateLimitRule } from "./rateLimit.js";

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
 * deleted doc resurfaces as a pull. Implemented as a KV `expirationTtl` so old
 * tombstones self-evict: a device offline longer than this window would
 * re-push a deleted character, an acceptable bound for a single-user tool
 * (nothing here is load-bearing for correctness, only for suppressing a stale
 * resurrection).
 */
const TOMBSTONE_TTL_SECONDS = 90 * 24 * 60 * 60;

/**
 * Per-owner ceiling on live documents. The 2 MB per-doc cap alone bounds a
 * single write and nothing else: a client stuck in a create loop could mint
 * documents until the namespace, not the account, ran out. Checked only when
 * a *new* id appears, so a player at the cap can still edit everything they
 * already have; the only thing they lose is "make one more".
 *
 * 100 is far past any real use (the app's own switcher is unusable well
 * before that) and keeps a full purge or export inside one request's
 * subrequest budget.
 */
const MAX_DOCS_PER_OWNER = 100;

/**
 * Per-owner write budget. Normal play pushes on change with a debounce, so an
 * hour of heavy editing is dozens of writes; a client in a retry loop is
 * hundreds. This catches the second without touching the first.
 */
const WRITE_RATE_LIMIT: RateLimitRule = { max: 240, windowSeconds: 60 * 60 };

/**
 * How many keys one purge call will delete. A purge walks documents *and*
 * tombstones, and tombstones are unbounded by `MAX_DOCS_PER_OWNER` (a user
 * who churns characters accumulates one per delete for 90 days), so the work
 * can exceed a single invocation's subrequest budget. The route reports
 * whether it finished and the caller repeats until it has -- deleting is
 * idempotent, so a resumed purge is just a shorter one.
 */
const PURGE_KEY_BUDGET = 300;

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

/**
 * `GET /api/characters` — list this owner's docs (envelope only:
 * id/version/updatedAt) plus any live delete `tombstones` ({ id, deletedAt }),
 * so an open-sync pass can drop locally-resurfaced deletions in the same round
 * trip it already makes.
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
  // Before the body is read, so a caller over budget doesn't get to stream
  // 2 MB at us first. Keyed by owner, not IP: the session is the thing being
  // spent here, and two players behind one NAT shouldn't share a budget.
  if (await overRateLimit(env.KV, `charput:rl:${ownerId}`, WRITE_RATE_LIMIT)) {
    return tooManyRequests("Too many writes — please try again later", WRITE_RATE_LIMIT);
  }

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
  if (existing.value === null) {
    // Only a new id pays for the count scan, and only up to the cap plus one —
    // enough to answer "are we full?" without listing a whole namespace.
    const owned = await env.CHARACTERS.list({
      prefix: keyFor(ownerId, ""),
      limit: MAX_DOCS_PER_OWNER + 1,
    });
    if (owned.keys.length >= MAX_DOCS_PER_OWNER) {
      return errorJson(
        403,
        `This account already holds ${MAX_DOCS_PER_OWNER} characters — delete one to add another`,
      );
    }
  }
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
 * to other devices via open-sync instead of the character resurfacing.
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

/**
 * `GET /api/me/export` — every document this owner has, as one JSON file.
 *
 * Streamed rather than assembled: the cap above allows 100 documents of up to
 * 2 MB each, which is well past what a Worker may hold in memory at once. The
 * stored blobs are already JSON *text*, so they are spliced in verbatim
 * without a parse/re-serialize round trip — which also keeps this route from
 * so much as looking at the game data it copies.
 *
 * Backpressure comes free from `pull`: the runtime asks for the next document
 * only once the client has taken the last one.
 */
export function exportCharacters(ownerId: string, env: Env): Response {
  const prefix = keyFor(ownerId, "");
  const encoder = new TextEncoder();
  let keys: string[] | null = null;
  let index = 0;

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (keys === null) {
        keys = await listAllKeys(env.CHARACTERS, prefix);
        const head = { ownerId, exportedAt: new Date().toISOString() };
        controller.enqueue(
          encoder.encode(
            `{"ownerId":${JSON.stringify(head.ownerId)},` +
              `"exportedAt":${JSON.stringify(head.exportedAt)},"characters":[`,
          ),
        );
        return;
      }
      if (index >= keys.length) {
        controller.enqueue(encoder.encode("]}"));
        controller.close();
        return;
      }
      const name = keys[index++]!;
      const raw = await env.CHARACTERS.get(name);
      // A document deleted between the listing and this read is simply absent
      // from the export; nothing here is worth failing the whole download for.
      if (raw === null) return;
      controller.enqueue(encoder.encode(index === 1 ? raw : `,${raw}`));
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="ledgermain-export.json"',
    },
  });
}

/**
 * Delete this owner's documents and tombstones, up to {@link PURGE_KEY_BUDGET}
 * keys. Returns what it removed and whether anything was left over, so the
 * caller can call again — see that constant for why one call may not finish.
 *
 * No tombstones are written for the deletions: a tombstone exists to tell
 * another *signed-in* device that a character is gone, and a purge revokes
 * every session on its way out, so there is nobody left to tell.
 */
export async function purgeCharacters(
  ownerId: string,
  env: Env,
): Promise<{ deleted: number; complete: boolean }> {
  const docKeys = await listAllKeys(env.CHARACTERS, keyFor(ownerId, ""));
  const tombKeys = await listAllKeys(env.CHARACTERS, tombKeyFor(ownerId, ""));
  const all = [...docKeys, ...tombKeys];
  const batch = all.slice(0, PURGE_KEY_BUDGET);
  await Promise.all(batch.map((key) => env.CHARACTERS.delete(key)));
  return { deleted: batch.length, complete: batch.length === all.length };
}
