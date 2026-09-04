import { describe, expect, it } from "bun:test";

import { cacheKey, cachedJson, planPrune, type RefDataCache } from "../src/refdata/cache.js";

/** In-memory stand-in for the IndexedDB-backed store, recording what it was offered. */
function fakeStore(seed: Record<string, string> = {}): RefDataCache & {
  stored: Map<string, string>;
} {
  const hits = new Map(Object.entries(seed));
  const stored = new Map<string, string>();
  return {
    stored,
    get(file) {
      const json = hits.get(file);
      hits.delete(file);
      return json;
    },
    put(file, json) {
      stored.set(file, json);
    },
    flush() {},
  };
}

describe("cacheKey", () => {
  it("separates the same file at two content hashes", () => {
    expect(cacheKey("feats.json", "aaa")).not.toBe(cacheKey("feats.json", "bbb"));
  });
});

describe("planPrune", () => {
  it("drops rows the current dataset no longer wants", () => {
    const wanted = new Set([cacheKey("feats.json", "new"), cacheKey("races.json", "same")]);
    const stale = planPrune(
      [
        cacheKey("feats.json", "old"),
        cacheKey("feats.json", "new"),
        cacheKey("races.json", "same"),
      ],
      wanted,
    );
    expect(stale).toEqual([cacheKey("feats.json", "old")]);
  });

  it("keeps everything when the dataset is unchanged", () => {
    const keys = [cacheKey("feats.json", "a"), cacheKey("races.json", "b")];
    expect(planPrune(keys, new Set(keys))).toEqual([]);
  });
});

describe("cachedJson", () => {
  it("serves a stored collection without fetching", async () => {
    const store = fakeStore({ "races.json": '{"elf":1}' });
    let fetched = 0;
    const getJson = cachedJson(store, async (file) => {
      fetched += 1;
      return `{"fetched":"${file}"}`;
    });
    expect(await getJson<Record<string, number>>("races.json")).toEqual({ elf: 1 });
    expect(fetched).toBe(0);
    expect(store.stored.size).toBe(0);
  });

  it("fetches a missing collection and offers it for storing", async () => {
    const store = fakeStore();
    const getJson = cachedJson(store, async () => '{"halfling":2}');
    expect(await getJson<Record<string, number>>("races.json")).toEqual({ halfling: 2 });
    expect(store.stored.get("races.json")).toBe('{"halfling":2}');
  });

  it("falls back to the network when a stored row will not parse", async () => {
    const store = fakeStore({ "races.json": "{truncated" });
    const getJson = cachedJson(store, async () => '{"gnome":3}');
    expect(await getJson<Record<string, number>>("races.json")).toEqual({ gnome: 3 });
    expect(store.stored.get("races.json")).toBe('{"gnome":3}');
  });

  it("never stores a response that will not parse", async () => {
    const store = fakeStore();
    const getJson = cachedJson(store, async () => "<!doctype html>");
    await expect(getJson<Record<string, number>>("races.json")).rejects.toThrow();
    expect(store.stored.size).toBe(0);
  });
});
