import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  ApiError,
  createShare,
  deleteRemoteCharacter,
  fetchShared,
  listShares,
  revokeShare,
  fetchAccountExport,
  fetchMe,
  fetchRemoteCharacter,
  listRemoteCharacters,
  logout,
  logoutEverywhere,
  purgeAccount,
  pushCharacter,
} from "../src/sync/client.js";

const API_BASE = "https://api.test";
const TOKEN = "test-token";

let calls: { url: string; init?: RequestInit }[];
const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Response): void {
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    calls.push({ url: href, init });
    return Promise.resolve(handler(href, init));
  }) as typeof fetch;
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("listRemoteCharacters", () => {
  test("sends a bearer token and parses the envelope list plus tombstones", async () => {
    mockFetch(() =>
      Response.json({
        characters: [{ id: "a", version: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        tombstones: [{ id: "b", deletedAt: "2026-01-02T00:00:00.000Z" }],
      }),
    );
    const result = await listRemoteCharacters(API_BASE, TOKEN);
    expect(result).toEqual({
      characters: [{ id: "a", version: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
      tombstones: [{ id: "b", deletedAt: "2026-01-02T00:00:00.000Z" }],
    });
    expect(calls[0]?.url).toBe(`${API_BASE}/api/characters`);
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
  });

  test("defaults tombstones to [] when the API omits the field (older deployment)", async () => {
    mockFetch(() =>
      Response.json({
        characters: [{ id: "a", version: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
      }),
    );
    const result = await listRemoteCharacters(API_BASE, TOKEN);
    expect(result.tombstones).toEqual([]);
  });

  test("throws ApiError on a non-OK response", async () => {
    mockFetch(() => new Response("nope", { status: 500 }));
    await expect(listRemoteCharacters(API_BASE, TOKEN)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("fetchRemoteCharacter", () => {
  test("returns null on 404 instead of throwing", async () => {
    mockFetch(() => new Response("not found", { status: 404 }));
    expect(await fetchRemoteCharacter(API_BASE, TOKEN, "missing")).toBeNull();
  });

  test("returns the parsed document on 200", async () => {
    const doc = createEmptyDoc("char-1");
    mockFetch(() => Response.json(doc));
    expect(await fetchRemoteCharacter(API_BASE, TOKEN, "char-1")).toEqual(doc);
  });
});

describe("pushCharacter", () => {
  test("PUTs the document and resolves ok on 200", async () => {
    const doc = createEmptyDoc("char-1");
    mockFetch((url, init) => {
      expect(init?.method).toBe("PUT");
      expect(url).toBe(`${API_BASE}/api/characters/char-1`);
      return Response.json({ id: "char-1", version: doc.version, updatedAt: doc.updatedAt });
    });
    const result = await pushCharacter(API_BASE, TOKEN, doc);
    expect(result).toEqual({ kind: "ok", version: doc.version, updatedAt: doc.updatedAt });
  });

  test("resolves a conflict (409) instead of throwing", async () => {
    const local = createEmptyDoc("char-1");
    const remote = { ...createEmptyDoc("char-1"), version: 9 };
    mockFetch(() => Response.json({ error: "conflict", current: remote }, { status: 409 }));
    const result = await pushCharacter(API_BASE, TOKEN, local);
    expect(result).toEqual({ kind: "conflict", current: remote });
  });

  test("throws ApiError on other failures (e.g. 413)", async () => {
    mockFetch(() => new Response("too big", { status: 413 }));
    await expect(pushCharacter(API_BASE, TOKEN, createEmptyDoc("char-1"))).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("deleteRemoteCharacter", () => {
  test("resolves on 204", async () => {
    mockFetch((_url, init) => {
      expect(init?.method).toBe("DELETE");
      return new Response(null, { status: 204 });
    });
    await expect(deleteRemoteCharacter(API_BASE, TOKEN, "char-1")).resolves.toBeUndefined();
  });

  test("treats 404 as success (idempotent delete)", async () => {
    mockFetch(() => new Response(null, { status: 404 }));
    await expect(deleteRemoteCharacter(API_BASE, TOKEN, "char-1")).resolves.toBeUndefined();
  });

  test("throws ApiError on an unexpected failure", async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    await expect(deleteRemoteCharacter(API_BASE, TOKEN, "char-1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("fetchMe", () => {
  test("returns the ownerId on 200", async () => {
    mockFetch(() => Response.json({ ownerId: "discord:1" }));
    expect(await fetchMe(API_BASE, TOKEN)).toBe("discord:1");
  });

  test("returns null on 401 instead of throwing", async () => {
    mockFetch(() => new Response("unauthorized", { status: 401 }));
    expect(await fetchMe(API_BASE, TOKEN)).toBeNull();
  });
});

describe("logout", () => {
  test("POSTs to /auth/logout with the bearer token", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(`${API_BASE}/auth/logout`);
      expect(init?.method).toBe("POST");
      return new Response(null, { status: 204 });
    });
    await logout(API_BASE, TOKEN);
    expect(calls.length).toBe(1);
  });
});

describe("logoutEverywhere", () => {
  test("POSTs to /auth/logout-all and returns the count", async () => {
    mockFetch(() => Response.json({ revoked: 3 }));
    expect(await logoutEverywhere(API_BASE, TOKEN)).toBe(3);
    expect(calls[0]!.url).toBe(`${API_BASE}/auth/logout-all`);
    expect(calls[0]!.init?.method).toBe("POST");
  });

  test("throws an ApiError on a failure", async () => {
    mockFetch(() => new Response("nope", { status: 500 }));
    expect(logoutEverywhere(API_BASE, TOKEN)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("fetchAccountExport", () => {
  test("returns the response body as a blob", async () => {
    mockFetch(() => Response.json({ ownerId: "discord:1", characters: [] }));
    const blob = await fetchAccountExport(API_BASE, TOKEN);
    expect(JSON.parse(await blob.text())).toMatchObject({ ownerId: "discord:1" });
    expect(calls[0]!.url).toBe(`${API_BASE}/api/me/export`);
  });
});

describe("purgeAccount", () => {
  test("stops as soon as the server reports it finished", async () => {
    mockFetch(() => Response.json({ deleted: 4, complete: true }));
    await purgeAccount(API_BASE, TOKEN);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.method).toBe("DELETE");
  });

  test("keeps calling while the purge is still incomplete", async () => {
    // The route deletes a bounded number of keys per call, so a large account
    // takes several passes; the client's job is to keep asking.
    mockFetch(() => Response.json({ deleted: 300, complete: calls.length >= 3 }));
    await purgeAccount(API_BASE, TOKEN);
    expect(calls).toHaveLength(3);
  });

  test("gives up rather than looping forever on a server that never completes", async () => {
    mockFetch(() => Response.json({ deleted: 0, complete: false }));
    expect(purgeAccount(API_BASE, TOKEN)).rejects.toBeInstanceOf(ApiError);
  });

  test("throws on an error status", async () => {
    mockFetch(() => new Response("nope", { status: 401 }));
    expect(purgeAccount(API_BASE, TOKEN)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("share links", () => {
  const SHARE = "ab".repeat(32);
  const summary = {
    token: SHARE,
    characterId: "c1",
    kind: "live",
    createdAt: "2026-09-12T00:00:00Z",
  };

  test("listShares reads the owner's list with a bearer token", async () => {
    mockFetch(() => Response.json({ shares: [summary] }));
    expect(await listShares(API_BASE, TOKEN)).toEqual([summary] as never);
    expect(calls[0]!.url).toBe(`${API_BASE}/api/me/shares`);
    expect(new Headers(calls[0]!.init?.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
  });

  test("createShare posts the character and kind", async () => {
    mockFetch(() => Response.json(summary, { status: 201 }));
    expect((await createShare(API_BASE, TOKEN, "c1", "live")).token).toBe(SHARE);
    expect(calls[0]!.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init?.body as string)).toEqual({ characterId: "c1", kind: "live" });
  });

  test("createShare throws on a character the server doesn't hold", async () => {
    mockFetch(() => new Response("nope", { status: 404 }));
    await expect(createShare(API_BASE, TOKEN, "c1", "snapshot")).rejects.toBeInstanceOf(ApiError);
  });

  test("revokeShare deletes, and tolerates a 404", async () => {
    mockFetch(() => new Response(null, { status: 404 }));
    await revokeShare(API_BASE, TOKEN, SHARE);
    expect(calls[0]!.url).toBe(`${API_BASE}/api/me/shares/${SHARE}`);
    expect(calls[0]!.init?.method).toBe("DELETE");
  });

  test("fetchShared sends no credential", async () => {
    const doc = createEmptyDoc("c1");
    mockFetch(() => Response.json({ kind: "snapshot", createdAt: "x", doc }));
    const read = await fetchShared(API_BASE, SHARE);
    expect(read).toEqual({ status: "ok", share: { kind: "snapshot", createdAt: "x", doc } });
    expect(calls[0]!.url).toBe(`${API_BASE}/api/shared/${SHARE}`);
    expect(new Headers(calls[0]!.init?.headers).get("authorization")).toBeNull();
  });

  test("fetchShared polls with since, and maps 204 and 404", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    expect(await fetchShared(API_BASE, SHARE, 7)).toEqual({ status: "unchanged" });
    expect(calls[0]!.url).toBe(`${API_BASE}/api/shared/${SHARE}?since=7`);

    mockFetch(() => new Response("gone", { status: 404 }));
    expect(await fetchShared(API_BASE, SHARE)).toEqual({ status: "gone" });
  });
});
