import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { createSession, getSession } from "../src/session.js";

import { authedRequest, request } from "./helpers.js";

function docBody(id: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id,
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: id, race: "human", classes: [] },
    ...overrides,
  };
}

async function put(ownerId: string, id: string, overrides: Record<string, unknown> = {}) {
  return authedRequest(ownerId, `/api/characters/${id}`, {
    method: "PUT",
    body: JSON.stringify(docBody(id, overrides)),
  });
}

/** `request()` with an explicit token, for tests that need one to outlive a call. */
async function withToken(token: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return request(`https://api.test${path}`, { ...init, headers });
}

describe("POST /auth/logout-all", () => {
  const ownerId = "discord:revoke";

  it("401s without a session", async () => {
    const res = await request("https://api.test/auth/logout-all", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("drops every session this owner holds, including the caller's", async () => {
    const [a, b, c] = await Promise.all([
      createSession(env.KV, ownerId),
      createSession(env.KV, ownerId),
      createSession(env.KV, ownerId),
    ]);
    const other = await createSession(env.KV, "discord:someone-else");

    const res = await withToken(a, "/auth/logout-all", { method: "POST" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: 3 });

    expect(await getSession(env.KV, a)).toBeNull();
    expect(await getSession(env.KV, b)).toBeNull();
    expect(await getSession(env.KV, c)).toBeNull();
    // Another account's session is untouched — revocation is owner-scoped.
    expect(await getSession(env.KV, other)).not.toBeNull();
  });

  it("leaves nothing behind for a second call to find", async () => {
    const token = await createSession(env.KV, ownerId);
    await withToken(token, "/auth/logout-all", { method: "POST" });
    const again = await withToken(token, "/auth/logout-all", { method: "POST" });
    expect(again.status).toBe(401);
  });

  it("clears the owner index on a single-device logout too", async () => {
    const token = await createSession(env.KV, ownerId);
    const survivor = await createSession(env.KV, ownerId);
    await withToken(token, "/auth/logout", { method: "POST" });

    const res = await withToken(survivor, "/auth/logout-all", { method: "POST" });
    // Only the one still-live session is counted; the logged-out token would
    // otherwise linger in the index and inflate the tally.
    expect(await res.json()).toEqual({ revoked: 1 });
  });
});

describe("GET /api/me/export", () => {
  const ownerId = "discord:export";

  it("401s without a session", async () => {
    const res = await request("https://api.test/api/me/export");
    expect(res.status).toBe(401);
  });

  it("returns an empty character list for an account with nothing in it", async () => {
    const res = await authedRequest(ownerId, "/api/me/export");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ownerId: string; characters: unknown[] };
    expect(body.ownerId).toBe(ownerId);
    expect(body.characters).toEqual([]);
  });

  it("streams every owned document, and nobody else's", async () => {
    await put(ownerId, "alpha");
    await put(ownerId, "beta");
    await put("discord:not-me", "gamma");

    const res = await authedRequest(ownerId, "/api/me/export");
    expect(res.headers.get("content-disposition")).toContain("ledgermain-export.json");
    const body = (await res.json()) as {
      exportedAt: string;
      characters: { id: string; ownerId: string }[];
    };
    expect(Number.isNaN(Date.parse(body.exportedAt))).toBe(false);
    expect(body.characters.map((c) => c.id).sort()).toEqual(["alpha", "beta"]);
    expect(body.characters.every((c) => c.ownerId === ownerId)).toBe(true);
  });

  it("405s on a write method", async () => {
    const res = await authedRequest(ownerId, "/api/me/export", { method: "POST" });
    expect(res.status).toBe(405);
  });
});

describe("DELETE /api/me", () => {
  const ownerId = "discord:purge";

  it("401s without a session", async () => {
    const res = await request("https://api.test/api/me", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("removes documents, tombstones, and sessions", async () => {
    await put(ownerId, "keep");
    await put(ownerId, "doomed");
    await authedRequest(ownerId, "/api/characters/doomed", { method: "DELETE" });
    const neighbour = await put("discord:bystander", "safe");
    expect(neighbour.status).toBe(200);

    const token = await createSession(env.KV, ownerId);
    const res = await withToken(token, "/api/me", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      deleted: number;
      complete: boolean;
      sessionsRevoked: number;
    };
    expect(body.complete).toBe(true);
    // One live document plus one tombstone.
    expect(body.deleted).toBe(2);
    expect(body.sessionsRevoked).toBeGreaterThanOrEqual(1);
    expect(await getSession(env.KV, token)).toBeNull();

    // A fresh session sees an empty account, with no tombstone left to
    // resurrect the delete on another device.
    const after = await authedRequest(ownerId, "/api/characters");
    expect(await after.json()).toEqual({ characters: [], tombstones: [] });

    // The bystander's document is untouched.
    const other = await authedRequest("discord:bystander", "/api/characters/safe");
    expect(other.status).toBe(200);
  });

  it("is idempotent", async () => {
    await put(ownerId, "one");
    await authedRequest(ownerId, "/api/me", { method: "DELETE" });
    const again = await authedRequest(ownerId, "/api/me", { method: "DELETE" });
    expect(await again.json()).toMatchObject({ deleted: 0, complete: true });
  });

  it("405s on an unsupported method", async () => {
    const res = await authedRequest(ownerId, "/api/me", { method: "PUT" });
    expect(res.status).toBe(405);
  });
});
