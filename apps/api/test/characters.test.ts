import { describe, expect, it } from "vitest";

import { authedRequest, request } from "./helpers.js";

function docBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schemaVersion: 1,
    id: "char-1",
    ownerId: "someone-else", // must be ignored/overwritten by the server
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test Character", race: "human", classes: [] },
    ...overrides,
  };
}

describe("character CRUD", () => {
  const ownerId = "github:1";

  it("rejects unauthenticated requests", async () => {
    const res = await request("https://api.test/api/characters");
    expect(res.status).toBe(401);
  });

  it("404s on a character that doesn't exist yet", async () => {
    const res = await authedRequest(ownerId, "/api/characters/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("creates, lists, fetches, and deletes a character", async () => {
    const putRes = await authedRequest(ownerId, "/api/characters/char-1", {
      method: "PUT",
      body: JSON.stringify(docBody()),
    });
    expect(putRes.status).toBe(200);
    expect(await putRes.json()).toMatchObject({ id: "char-1", version: 1 });

    const listRes = await authedRequest(ownerId, "/api/characters");
    expect(listRes.status).toBe(200);
    const { characters } = (await listRes.json()) as {
      characters: { id: string; version: number }[];
    };
    expect(characters).toEqual([{ id: "char-1", version: 1, updatedAt: "2026-01-01T00:00:00.000Z" }]);

    const getRes = await authedRequest(ownerId, "/api/characters/char-1");
    expect(getRes.status).toBe(200);
    const stored = await getRes.json();
    // The server owns `ownerId` — the client's copy must never be trusted.
    expect(stored).toMatchObject({ id: "char-1", ownerId, version: 1 });

    const deleteRes = await authedRequest(ownerId, "/api/characters/char-1", { method: "DELETE" });
    expect(deleteRes.status).toBe(204);

    const afterDelete = await authedRequest(ownerId, "/api/characters/char-1");
    expect(afterDelete.status).toBe(404);
  });

  it("rejects a stale write with 409 and returns the current document", async () => {
    await authedRequest(ownerId, "/api/characters/char-2", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "char-2", version: 1 })),
    });
    // Bump to version 2 first.
    await authedRequest(ownerId, "/api/characters/char-2", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "char-2", version: 2 })),
    });

    // A client that only saw version 1 tries to push version 1 again (stale).
    const staleRes = await authedRequest(ownerId, "/api/characters/char-2", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "char-2", version: 1 })),
    });
    expect(staleRes.status).toBe(409);
    const body = (await staleRes.json()) as { current: { version: number } };
    expect(body.current.version).toBe(2);

    // Pushing version 3 (newer than stored) succeeds.
    const okRes = await authedRequest(ownerId, "/api/characters/char-2", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "char-2", version: 3 })),
    });
    expect(okRes.status).toBe(200);
  });

  it("scopes documents per owner", async () => {
    await authedRequest(ownerId, "/api/characters/char-3", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "char-3", version: 1 })),
    });
    const otherOwnerRes = await authedRequest("github:999", "/api/characters/char-3");
    expect(otherOwnerRes.status).toBe(404);
  });

  it("rejects a body whose id doesn't match the URL", async () => {
    const res = await authedRequest(ownerId, "/api/characters/char-4", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "wrong-id", version: 1 })),
    });
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const res = await authedRequest(ownerId, "/api/characters/char-5", {
      method: "PUT",
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-integer/zero version", async () => {
    const res = await authedRequest(ownerId, "/api/characters/char-6", {
      method: "PUT",
      body: JSON.stringify(docBody({ id: "char-6", version: 0 })),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an oversized body", async () => {
    const huge = docBody({ id: "char-7", version: 1, padding: "x".repeat(3_000_000) });
    const res = await authedRequest(ownerId, "/api/characters/char-7", {
      method: "PUT",
      body: JSON.stringify(huge),
    });
    expect(res.status).toBe(413);
  });

  it("DELETE is idempotent for a character that never existed", async () => {
    const res = await authedRequest(ownerId, "/api/characters/never-existed", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});

describe("CORS", () => {
  it("reflects an allowed origin and omits headers for a disallowed one", async () => {
    const allowed = await request("https://api.test/api/me", {
      headers: { origin: "http://localhost:5173" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");

    const disallowed = await request("https://api.test/api/me", {
      headers: { origin: "https://evil.example" },
    });
    expect(disallowed.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers an OPTIONS preflight", async () => {
    const res = await request("https://api.test/api/characters", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:5173" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("PUT");
  });
});
