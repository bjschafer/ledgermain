import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  ApiError,
  deleteRemoteCharacter,
  fetchMe,
  fetchRemoteCharacter,
  listRemoteCharacters,
  logout,
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
