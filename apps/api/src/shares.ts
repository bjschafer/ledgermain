/**
 * Read-only share links: a random token that lets anyone holding it read one
 * character, with no session.
 *
 * The player picks what the token resolves to when they publish it:
 *  - `snapshot`: a copy of the stored document, taken at publish time and
 *    never updated afterwards.
 *  - `live`: a pointer to the stored document, so the reader follows every
 *    later push until the share is revoked.
 *
 * The token is the whole security boundary on the read path, so it is 32
 * random bytes, never derived from the owner or the character, and nothing
 * that lists tokens is reachable without the owner's session.
 *
 * Storage, all in `CHARACTERS` next to the documents they point at:
 *  - `share::<token>`: the record the public read path resolves. Metadata
 *    names the owner, character and kind; a snapshot's value is its frozen
 *    document, a live share's value is empty.
 *  - `ownershare::<ownerId>::<token>`: the owner-side index, so listing,
 *    revoking a character's shares on delete, and the account purge never
 *    need a namespace-wide scan.
 *
 * Revoking deletes both keys. KV reads are cached at the edge for up to a
 * minute, so a revoked token can keep resolving in some colos for that long,
 * and no longer.
 */
import { PayloadTooLargeError, readBodyWithCap } from "./body.js";
import { errorJson, json } from "./http.js";
import { listAllKeys } from "./kv.js";
import { overRateLimit, tooManyRequests, type RateLimitRule } from "./rateLimit.js";
import { randomToken } from "./session.js";

export type ShareKind = "snapshot" | "live";

interface ShareMeta {
  ownerId: string;
  characterId: string;
  kind: ShareKind;
  createdAt: string;
}

type OwnerShareMeta = Omit<ShareMeta, "ownerId">;

/** 64 lowercase hex characters, the shape `randomToken(32)` emits. */
export const SHARE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Enough for a share per character and a spare, on an account well past real
 * use. Each share is two keys, so this also keeps a purge's work bounded.
 */
const MAX_SHARES_PER_OWNER = 50;

/** Publishing is a deliberate click; a loop minting links is not. */
const CREATE_RATE_LIMIT: RateLimitRule = { max: 60, windowSeconds: 60 * 60 };

/** `{ characterId, kind }` is a few dozen bytes; anything near this is not a request we want. */
const MAX_CREATE_BODY_BYTES = 4_096;

function shareKey(token: string): string {
  return `share::${token}`;
}

function ownerShareKey(ownerId: string, token: string): string {
  return `ownershare::${ownerId}::${token}`;
}

// Mirrors `keyFor` in characters.ts. Duplicated rather than exported so that
// module's storage layout stays its own; the shape is pinned by the tests.
function docKey(ownerId: string, characterId: string): string {
  return `${ownerId}::${characterId}`;
}

/**
 * The stored document with the server-assigned `ownerId` removed. That field
 * is a Discord account id, which a reader of someone else's character has no
 * business learning. It is the only field touched: everything else is the
 * opaque game data the player chose to publish.
 */
function withoutOwner(raw: string): string {
  const doc = JSON.parse(raw) as Record<string, unknown>;
  delete doc["ownerId"];
  return JSON.stringify(doc);
}

/** `GET /api/me/shares`: every share this owner has published. */
export async function listShares(ownerId: string, env: Env): Promise<Response> {
  const prefix = ownerShareKey(ownerId, "");
  const shares: (OwnerShareMeta & { token: string })[] = [];
  let cursor: string | undefined;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- each page's cursor comes from the previous one
    const page = await env.CHARACTERS.list<OwnerShareMeta>({ prefix, cursor });
    for (const key of page.keys) {
      if (!key.metadata) continue;
      shares.push({ token: key.name.slice(prefix.length), ...key.metadata });
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  shares.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json({ shares });
}

/**
 * `POST /api/me/shares` with `{ characterId, kind }`: publish a share of a
 * character the server already holds. Sharing reads the synced copy, so the
 * client pushes first; a character that was never synced is a 404.
 */
export async function createShare(ownerId: string, request: Request, env: Env): Promise<Response> {
  if (await overRateLimit(env.KV, `sharecreate:rl:${ownerId}`, CREATE_RATE_LIMIT)) {
    return tooManyRequests("Too many share links. Please try again later.", CREATE_RATE_LIMIT);
  }

  let body: { characterId?: unknown; kind?: unknown };
  try {
    body = JSON.parse(await readBodyWithCap(request, MAX_CREATE_BODY_BYTES)) as typeof body;
  } catch (e) {
    if (e instanceof PayloadTooLargeError) return errorJson(413, "Request body too large");
    return errorJson(400, "Body is not valid JSON");
  }
  const { characterId, kind } = body;
  if (typeof characterId !== "string" || !characterId) {
    return errorJson(400, "Body `characterId` must be a non-empty string");
  }
  if (kind !== "snapshot" && kind !== "live") {
    return errorJson(400, "Body `kind` must be `snapshot` or `live`");
  }

  const existing = await env.CHARACTERS.list({
    prefix: ownerShareKey(ownerId, ""),
    limit: MAX_SHARES_PER_OWNER,
  });
  if (existing.keys.length >= MAX_SHARES_PER_OWNER) {
    return errorJson(403, `This account already has ${MAX_SHARES_PER_OWNER} share links`);
  }

  const raw = await env.CHARACTERS.get(docKey(ownerId, characterId));
  if (raw === null) return errorJson(404, "That character isn't synced to this account");

  const token = randomToken(32);
  const createdAt = new Date().toISOString();
  const meta: ShareMeta = { ownerId, characterId, kind, createdAt };
  const ownerMeta: OwnerShareMeta = { characterId, kind, createdAt };
  // The index entry goes first: if the second write fails, the owner can still
  // see and revoke what exists. The reverse order could leave a readable share
  // nobody can find.
  await env.CHARACTERS.put(ownerShareKey(ownerId, token), "", { metadata: ownerMeta });
  await env.CHARACTERS.put(shareKey(token), kind === "snapshot" ? withoutOwner(raw) : "", {
    metadata: meta,
  });
  return json({ token, ...ownerMeta }, { status: 201 });
}

/**
 * `DELETE /api/me/shares/:token`: revoke. Idempotent, and scoped to the
 * caller: a token belonging to someone else is left alone and still answers
 * 204, so the route can't be used to test whether a token exists.
 */
export async function revokeShare(ownerId: string, token: string, env: Env): Promise<Response> {
  const record = await env.CHARACTERS.getWithMetadata<ShareMeta>(shareKey(token));
  const deletes = [env.CHARACTERS.delete(ownerShareKey(ownerId, token))];
  if (record.metadata?.ownerId === ownerId) deletes.push(env.CHARACTERS.delete(shareKey(token)));
  await Promise.all(deletes);
  return new Response(null, { status: 204 });
}

/**
 * `GET /api/shared/:token[?since=<version>]`: the public read path.
 *
 * Responds `{ kind, createdAt, doc }`. A reader following a live share passes
 * the `version` it already has as `since`, and gets a bodiless 204 when
 * nothing moved, so a poll doesn't re-download a portrait every time.
 *
 * Every miss is the same 404, whether the token never existed, was revoked, or
 * points at a character that has since gone.
 */
export async function readShare(token: string, url: URL, env: Env): Promise<Response> {
  const record = await env.CHARACTERS.getWithMetadata<ShareMeta>(shareKey(token));
  const meta = record.metadata;
  if (record.value === null || !meta) return notFound();

  let docJson: string;
  if (meta.kind === "snapshot") {
    docJson = record.value;
  } else {
    const live = await env.CHARACTERS.getWithMetadata<{ version: number }>(
      docKey(meta.ownerId, meta.characterId),
    );
    if (live.value === null) return notFound();
    const since = url.searchParams.get("since");
    if (since !== null && live.metadata && String(live.metadata.version) === since) {
      return new Response(null, { status: 204, headers: noStore() });
    }
    docJson = withoutOwner(live.value);
  }

  // The document is spliced in as text: a snapshot is already stored
  // owner-free, and re-serializing 2 MB just to wrap it buys nothing.
  const head = `{"kind":${JSON.stringify(meta.kind)},"createdAt":${JSON.stringify(meta.createdAt)},"doc":`;
  const headers = noStore();
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(`${head}${docJson}}`, { status: 200, headers });
}

/**
 * A share must stop being readable the moment it is revoked, so nothing
 * between here and the reader may keep a copy.
 */
function noStore(): Headers {
  return new Headers({ "cache-control": "no-store" });
}

function notFound(): Response {
  const res = errorJson(404, "Not found");
  res.headers.set("cache-control", "no-store");
  return res;
}

/** Every share of one character, for `DELETE /api/characters/:id` to take with it. */
export async function deleteSharesForCharacter(
  ownerId: string,
  characterId: string,
  env: Env,
): Promise<void> {
  const prefix = ownerShareKey(ownerId, "");
  const doomed: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- each page's cursor comes from the previous one
    const page = await env.CHARACTERS.list<OwnerShareMeta>({ prefix, cursor });
    for (const key of page.keys) {
      if (key.metadata?.characterId !== characterId) continue;
      doomed.push(shareKey(key.name.slice(prefix.length)), key.name);
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  await Promise.all(doomed.map((key) => env.CHARACTERS.delete(key)));
}

/**
 * Every key an account purge must remove for this owner's shares, public
 * record before index entry for each. A purge that runs out of budget between
 * the two leaves only the index entry behind, which the next pass finds.
 */
export async function shareKeysForPurge(ownerId: string, env: Env): Promise<string[]> {
  const prefix = ownerShareKey(ownerId, "");
  const indexKeys = await listAllKeys(env.CHARACTERS, prefix);
  return indexKeys.flatMap((key) => [shareKey(key.slice(prefix.length)), key]);
}
