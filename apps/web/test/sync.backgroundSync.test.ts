import { afterEach, describe, expect, test } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import { pushOnChange, runOpenSync, type SyncStore } from "../src/sync/backgroundSync.js";

const API_BASE = "https://api.test";
const TOKEN = "test-token";

const originalFetch = globalThis.fetch;

function jsonHandler(routes: Record<string, () => Response>) {
  globalThis.fetch = ((url: string | URL | Request) => {
    const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    const path = new URL(href).pathname;
    const handler = routes[path];
    if (!handler) throw new Error(`Unexpected fetch to ${href}`);
    return Promise.resolve(handler());
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** An in-memory `SyncStore` fake — no Dexie/IndexedDB involved. */
function fakeStore(initial: CharacterDoc[] = []): SyncStore & { docs: Map<string, CharacterDoc> } {
  const docs = new Map(initial.map((d) => [d.id, d]));
  return {
    docs,
    list: () => Promise.resolve([...docs.values()].map((d) => ({ id: d.id, version: d.version }))),
    get: (id) => Promise.resolve(docs.get(id)),
    put: (doc) => {
      docs.set(doc.id, doc);
      return Promise.resolve();
    },
    delete: (id) => {
      docs.delete(id);
      return Promise.resolve();
    },
  };
}

describe("runOpenSync", () => {
  test("pulls a character that exists only on the server", async () => {
    const remoteDoc = createEmptyDoc("only-remote");
    jsonHandler({
      "/api/characters": () =>
        Response.json({
          characters: [{ id: "only-remote", version: 1, updatedAt: remoteDoc.updatedAt }],
        }),
      "/api/characters/only-remote": () => Response.json(remoteDoc),
    });
    const store = fakeStore();
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result).toEqual({ pulled: ["only-remote"], pushed: [], deleted: [], errors: [] });
    expect(store.docs.get("only-remote")).toEqual(remoteDoc);
  });

  test("pushes a character that exists only locally", async () => {
    const localDoc = createEmptyDoc("only-local");
    jsonHandler({
      "/api/characters": () => Response.json({ characters: [] }),
      "/api/characters/only-local": () =>
        Response.json({
          id: "only-local",
          version: localDoc.version,
          updatedAt: localDoc.updatedAt,
        }),
    });
    const store = fakeStore([localDoc]);
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result).toEqual({ pulled: [], pushed: ["only-local"], deleted: [], errors: [] });
  });

  test("does nothing for a character already in sync", async () => {
    const inSync = createEmptyDoc("in-sync");
    jsonHandler({
      "/api/characters": () =>
        Response.json({
          characters: [{ id: "in-sync", version: inSync.version, updatedAt: inSync.updatedAt }],
        }),
    });
    const store = fakeStore([inSync]);
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result).toEqual({ pulled: [], pushed: [], deleted: [], errors: [] });
  });

  test("drops a locally-present character the server has tombstoned", async () => {
    const local = createEmptyDoc("tombstoned");
    jsonHandler({
      "/api/characters": () =>
        Response.json({
          characters: [],
          tombstones: [{ id: "tombstoned", deletedAt: "2026-01-02T00:00:00.000Z" }],
        }),
    });
    const store = fakeStore([local]);
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result).toEqual({ pulled: [], pushed: [], deleted: ["tombstoned"], errors: [] });
    expect(store.docs.has("tombstoned")).toBe(false);
  });

  test("records an error instead of throwing when a fetch fails", async () => {
    jsonHandler({
      "/api/characters": () =>
        Response.json({
          characters: [{ id: "boom", version: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        }),
      "/api/characters/boom": () => new Response("server error", { status: 500 }),
    });
    const store = fakeStore();
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result.pulled).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.id).toBe("boom");
  });
});

describe("pushOnChange", () => {
  test("resolves ok on a successful push", async () => {
    const doc = createEmptyDoc("char-1");
    jsonHandler({
      "/api/characters/char-1": () =>
        Response.json({ id: "char-1", version: doc.version, updatedAt: doc.updatedAt }),
    });
    expect(await pushOnChange(API_BASE, TOKEN, doc)).toEqual({ kind: "ok" });
  });

  test("resolves a conflict without throwing", async () => {
    const local = createEmptyDoc("char-1");
    const remote = { ...createEmptyDoc("char-1"), version: 9 };
    jsonHandler({
      "/api/characters/char-1": () =>
        Response.json({ error: "conflict", current: remote }, { status: 409 }),
    });
    expect(await pushOnChange(API_BASE, TOKEN, local)).toEqual({
      kind: "conflict",
      conflict: { local, remote },
    });
  });

  test("resolves an error result instead of throwing on a network/API failure", async () => {
    jsonHandler({
      "/api/characters/char-1": () => new Response("boom", { status: 500 }),
    });
    const outcome = await pushOnChange(API_BASE, TOKEN, createEmptyDoc("char-1"));
    expect(outcome.kind).toBe("error");
  });
});
