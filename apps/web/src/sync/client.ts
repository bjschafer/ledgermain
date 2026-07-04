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

/** `GET /api/characters` — envelope-only summaries for every doc this account owns. */
export async function listRemoteCharacters(
  apiBase: string,
  token: string,
): Promise<RemoteCharacterSummary[]> {
  const res = await authedFetch(apiBase, "/api/characters", token);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = (await res.json()) as { characters: RemoteCharacterSummary[] };
  return body.characters;
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
