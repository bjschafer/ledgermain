/**
 * Thin fetch wrapper over the persistence API (`apps/api`). Every function
 * here takes an explicit `apiBase`/`token` rather than reading `config.ts`/
 * `session.ts` itself, so tests can mock `fetch` without touching
 * `import.meta.env` or `localStorage` (see `test/sync.client.test.ts`).
 */
import type { CharacterDoc } from "@pf1/schema";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RemoteCharacterSummary {
  id: string;
  version: number;
  updatedAt: string;
}

/** A server-side delete record: this id was deleted at `deletedAt`. */
export interface RemoteTombstone {
  id: string;
  deletedAt: string;
}

export interface RemoteListing {
  characters: RemoteCharacterSummary[];
  tombstones: RemoteTombstone[];
}

async function authedFetch(
  apiBase: string,
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return fetch(`${apiBase}${path}`, { ...init, headers });
}

/**
 * `GET /api/characters` — envelope-only summaries for every doc this account
 * owns, plus any delete `tombstones`. `tombstones` defaults to `[]` for
 * tolerance of an older API deployment that predates the field.
 */
export async function listRemoteCharacters(apiBase: string, token: string): Promise<RemoteListing> {
  const res = await authedFetch(apiBase, "/api/characters", token);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = (await res.json()) as {
    characters: RemoteCharacterSummary[];
    tombstones?: RemoteTombstone[];
  };
  return { characters: body.characters, tombstones: body.tombstones ?? [] };
}

/** `GET /api/characters/:id` — `null` on 404 (never thrown; a missing doc is an expected case here). */
export async function fetchRemoteCharacter(
  apiBase: string,
  token: string,
  id: string,
): Promise<CharacterDoc | null> {
  const res = await authedFetch(apiBase, `/api/characters/${encodeURIComponent(id)}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as CharacterDoc;
}

export type PushResult =
  | { kind: "ok"; version: number; updatedAt: string }
  | { kind: "conflict"; current: CharacterDoc };

/**
 * `PUT /api/characters/:id`. A `409` (stale `version`) is a normal, expected
 * outcome here — not an error — so it resolves to `{ kind: "conflict" }`
 * rather than throwing; callers decide what to do (see `planSync.ts`).
 */
export async function pushCharacter(
  apiBase: string,
  token: string,
  doc: CharacterDoc,
): Promise<PushResult> {
  const res = await authedFetch(apiBase, `/api/characters/${encodeURIComponent(doc.id)}`, token, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (res.status === 409) {
    const body = (await res.json()) as { current: CharacterDoc };
    return { kind: "conflict", current: body.current };
  }
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = (await res.json()) as { version: number; updatedAt: string };
  return { kind: "ok", version: body.version, updatedAt: body.updatedAt };
}

/** `DELETE /api/characters/:id` — idempotent; a 404 is not an error here either. */
export async function deleteRemoteCharacter(
  apiBase: string,
  token: string,
  id: string,
): Promise<void> {
  const res = await authedFetch(apiBase, `/api/characters/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, await res.text());
}

/** `GET /api/me` — resolves the signed-in account's `ownerId`, or `null` if the token is invalid/expired. */
export async function fetchMe(apiBase: string, token: string): Promise<string | null> {
  const res = await authedFetch(apiBase, "/api/me", token);
  if (res.status === 401) return null;
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = (await res.json()) as { ownerId: string };
  return body.ownerId;
}

/** `POST /auth/logout` — best-effort; the caller clears the local token regardless. */
export async function logout(apiBase: string, token: string): Promise<void> {
  await authedFetch(apiBase, "/auth/logout", token, { method: "POST" });
}

/** `POST /auth/logout-all` — signs every device out, this one included. */
export async function logoutEverywhere(apiBase: string, token: string): Promise<number> {
  const res = await authedFetch(apiBase, "/auth/logout-all", token, { method: "POST" });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = (await res.json()) as { revoked: number };
  return body.revoked;
}

/** What a share link resolves to: a frozen copy, or the character as it stands now. */
export type ShareKind = "snapshot" | "live";

export interface ShareSummary {
  /** The link's credential. Anyone holding it can read the character. */
  token: string;
  characterId: string;
  kind: ShareKind;
  createdAt: string;
}

/** `GET /api/me/shares` — every share link this account has published, newest first. */
export async function listShares(apiBase: string, token: string): Promise<ShareSummary[]> {
  const res = await authedFetch(apiBase, "/api/me/shares", token);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = (await res.json()) as { shares: ShareSummary[] };
  return body.shares;
}

/**
 * `POST /api/me/shares` — publish a link. The server shares its own synced
 * copy, so push the character first or a snapshot freezes whatever the last
 * push left there.
 */
export async function createShare(
  apiBase: string,
  token: string,
  characterId: string,
  kind: ShareKind,
): Promise<ShareSummary> {
  const res = await authedFetch(apiBase, "/api/me/shares", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ characterId, kind }),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as ShareSummary;
}

/** `DELETE /api/me/shares/:token` — revoke. Idempotent. */
export async function revokeShare(
  apiBase: string,
  token: string,
  shareToken: string,
): Promise<void> {
  const res = await authedFetch(
    apiBase,
    `/api/me/shares/${encodeURIComponent(shareToken)}`,
    token,
    {
      method: "DELETE",
    },
  );
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, await res.text());
}

export interface SharedCharacter {
  kind: ShareKind;
  createdAt: string;
  doc: CharacterDoc;
}

export type SharedRead =
  | { status: "ok"; share: SharedCharacter }
  /** A live poll whose `since` version is still current. */
  | { status: "unchanged" }
  /** Revoked, never existed, or the character was deleted: the server doesn't say which. */
  | { status: "gone" };

/**
 * `GET /api/shared/:token` — the unauthenticated read a share link makes.
 * Pass the version already on screen as `since` to poll a live share without
 * re-downloading it.
 */
export async function fetchShared(
  apiBase: string,
  shareToken: string,
  since?: number,
): Promise<SharedRead> {
  const query = since === undefined ? "" : `?since=${since}`;
  const res = await fetch(`${apiBase}/api/shared/${encodeURIComponent(shareToken)}${query}`, {
    cache: "no-store",
  });
  if (res.status === 404) return { status: "gone" };
  if (res.status === 204) return { status: "unchanged" };
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return { status: "ok", share: (await res.json()) as SharedCharacter };
}

/**
 * `GET /api/me/export` — every character on the account as one JSON blob. The
 * response is a stream on the wire, but the download it feeds is a single
 * file, so it's collected here rather than piped.
 */
export async function fetchAccountExport(apiBase: string, token: string): Promise<Blob> {
  const res = await authedFetch(apiBase, "/api/me/export", token);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.blob();
}

/**
 * `DELETE /api/me` — erase the account's whole server-side footprint.
 *
 * The route deletes a bounded number of keys per call and reports whether it
 * finished, so this repeats until it has. The attempt ceiling is a guard
 * against a server that never reports completion, not a real expectation: one
 * pass clears far more than an account can hold.
 */
export async function purgeAccount(apiBase: string, token: string): Promise<void> {
  /* oxlint-disable no-await-in-loop -- each pass deletes what the last one
     left; running them in parallel would just race the same keys. */
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await authedFetch(apiBase, "/api/me", token, { method: "DELETE" });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    const body = (await res.json()) as { complete: boolean };
    if (body.complete) return;
  }
  /* oxlint-enable no-await-in-loop */
  throw new ApiError(500, "The account wasn't fully erased. Please try again.");
}
