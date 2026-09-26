import { afterEach, describe, expect, test } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import { pushOnChange, runOpenSync, type SyncStore } from "../src/sync/backgroundSync.js";
import { isUnauthorized } from "../src/sync/client.js";

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
function fakeStore(
  initial: CharacterDoc[] = [],
  initialSynced: Record<string, number> = {},
): SyncStore & { docs: Map<string, CharacterDoc>; synced: Map<string, number> } {
  const docs = new Map(initial.map((d) => [d.id, d]));
  const synced = new Map(Object.entries(initialSynced));
  return {
    docs,
    synced,
    list: () =>
      Promise.resolve(
        [...docs.values()].map((d) => {
          const syncedVersion = synced.get(d.id);
          return syncedVersion === undefined
            ? { id: d.id, version: d.version }
            : { id: d.id, version: d.version, syncedVersion };
        }),
      ),
    get: (id) => Promise.resolve(docs.get(id)),
    put: (doc) => {
      docs.set(doc.id, doc);
      return Promise.resolve();
    },
    delete: (id) => {
      docs.delete(id);
      synced.delete(id);
      return Promise.resolve();
    },
    markSynced: (id, version) => {
      synced.set(id, version);
      return Promise.resolve();
    },
    syncedVersion: (id) => Promise.resolve(synced.get(id)),
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
    expect(result).toEqual({
      pulled: ["only-remote"],
      pushed: [],
      deleted: [],
      conflicts: [],
      errors: [],
    });
    expect(store.docs.get("only-remote")).toEqual(remoteDoc);
    expect(store.synced.get("only-remote")).toBe(1);
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
    expect(result).toEqual({
      pulled: [],
      pushed: ["only-local"],
      deleted: [],
      conflicts: [],
      errors: [],
    });
    expect(store.synced.get("only-local")).toBe(localDoc.version);
  });

  test("does nothing for a character already in sync", async () => {
    const inSync = createEmptyDoc("in-sync");
    jsonHandler({
      "/api/characters": () =>
        Response.json({
          characters: [{ id: "in-sync", version: inSync.version, updatedAt: inSync.updatedAt }],
        }),
    });
    const store = fakeStore([inSync], { "in-sync": inSync.version });
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result).toEqual({ pulled: [], pushed: [], deleted: [], conflicts: [], errors: [] });
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
    expect(result).toEqual({
      pulled: [],
      pushed: [],
      deleted: ["tombstoned"],
      conflicts: [],
      errors: [],
    });
    expect(store.docs.has("tombstoned")).toBe(false);
  });

  test("surfaces both-sides-edited as a conflict instead of pulling over local work", async () => {
    const local = { ...createEmptyDoc("both"), version: 25 };
    const remote = {
      ...createEmptyDoc("both"),
      version: 30,
      identity: { ...local.identity, name: "Edited elsewhere" },
    };
    jsonHandler({
      "/api/characters": () =>
        Response.json({ characters: [{ id: "both", version: 30, updatedAt: remote.updatedAt }] }),
      "/api/characters/both": () => Response.json(remote),
    });
    const store = fakeStore([local], { both: 10 });
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result.conflicts).toEqual([{ local, remote }]);
    expect(result.pulled).toEqual([]);
    expect(store.docs.get("both")).toBe(local);
    expect(store.synced.get("both")).toBe(10);
  });

  test("adopts the server's copy without asking when only the envelope differs", async () => {
    const local = { ...createEmptyDoc("same"), version: 4 };
    const remote = { ...local, version: 7, updatedAt: "2030-01-01T00:00:00.000Z" };
    jsonHandler({
      "/api/characters": () =>
        Response.json({ characters: [{ id: "same", version: 7, updatedAt: remote.updatedAt }] }),
      "/api/characters/same": () => Response.json(remote),
    });
    const store = fakeStore([local]);
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result.conflicts).toEqual([]);
    expect(result.pulled).toEqual(["same"]);
    expect(store.synced.get("same")).toBe(7);
  });

  test("sends the last-synced version with a push", async () => {
    const local = { ...createEmptyDoc("ahead"), version: 5 };
    const baseHeaders: (string | null)[] = [];
    globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/characters")
        return Promise.resolve(
          Response.json({ characters: [{ id: "ahead", version: 3, updatedAt: local.updatedAt }] }),
        );
      baseHeaders.push(new Headers(init?.headers).get("x-base-version"));
      return Promise.resolve(
        Response.json({ id: "ahead", version: 5, updatedAt: local.updatedAt }),
      );
    }) as typeof fetch;
    const store = fakeStore([local], { ahead: 3 });
    const result = await runOpenSync(API_BASE, TOKEN, store);
    expect(result.pushed).toEqual(["ahead"]);
    expect(baseHeaders).toEqual(["3"]);
    expect(store.synced.get("ahead")).toBe(5);
  });

  test("throws on an expired session instead of burying it in per-doc errors", async () => {
    jsonHandler({
      "/api/characters": () => new Response("Not authenticated", { status: 401 }),
    });
    const err: unknown = await runOpenSync(API_BASE, TOKEN, fakeStore()).catch((e: unknown) => e);
    expect(isUnauthorized(err)).toBe(true);
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
    expect(await pushOnChange(API_BASE, TOKEN, doc, fakeStore())).toEqual({ kind: "ok" });
  });

  test("resolves a conflict without throwing", async () => {
    const local = createEmptyDoc("char-1");
    const remote = { ...createEmptyDoc("char-1"), version: 9 };
    jsonHandler({
      "/api/characters/char-1": () =>
        Response.json({ error: "conflict", current: remote }, { status: 409 }),
    });
    expect(await pushOnChange(API_BASE, TOKEN, local, fakeStore())).toEqual({
      kind: "conflict",
      conflict: { local, remote },
    });
  });

  test("resolves an error result instead of throwing on a network/API failure", async () => {
    jsonHandler({
      "/api/characters/char-1": () => new Response("boom", { status: 500 }),
    });
    const outcome = await pushOnChange(API_BASE, TOKEN, createEmptyDoc("char-1"), fakeStore());
    expect(outcome.kind).toBe("error");
  });

  test("records the pushed version as synced", async () => {
    const doc = { ...createEmptyDoc("char-1"), version: 4 };
    jsonHandler({
      "/api/characters/char-1": () =>
        Response.json({ id: "char-1", version: 4, updatedAt: doc.updatedAt }),
    });
    const store = fakeStore([doc], { "char-1": 2 });
    expect(await pushOnChange(API_BASE, TOKEN, doc, store)).toEqual({ kind: "ok" });
    expect(store.synced.get("char-1")).toBe(4);
  });

  test("never re-sends a copy older than one already synced", async () => {
    jsonHandler({});
    const doc = { ...createEmptyDoc("char-1"), version: 4 };
    const store = fakeStore([doc], { "char-1": 6 });
    expect(await pushOnChange(API_BASE, TOKEN, doc, store)).toEqual({ kind: "ok" });
  });

  test("reports an expired session distinctly", async () => {
    jsonHandler({
      "/api/characters/char-1": () => new Response("Not authenticated", { status: 401 }),
    });
    const outcome = await pushOnChange(API_BASE, TOKEN, createEmptyDoc("char-1"), fakeStore());
    expect(outcome).toEqual({ kind: "unauthorized" });
  });
});
