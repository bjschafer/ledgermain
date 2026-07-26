import { describe, expect, it } from "bun:test";

import {
  bucketCount,
  bucketForId,
  ENTRIES_PER_BUCKET,
  fnv1a,
  shardPath,
} from "../src/shared/bucketing.js";

describe("fnv1a", () => {
  it("matches the published FNV-1a 32-bit test vectors", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
  });

  it("is deterministic and stays in 32-bit unsigned range", () => {
    for (const id of ["01MUL5N0meygR4Am", "0cIAkfoDAK5Pq2XU", "shaken", "x".repeat(200)]) {
      const hash = fnv1a(id);
      expect(hash).toBe(fnv1a(id));
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("bucketCount", () => {
  it("never returns zero, even for an empty collection", () => {
    expect(bucketCount(0)).toBe(1);
  });

  it("targets ENTRIES_PER_BUCKET entries per shard", () => {
    expect(bucketCount(ENTRIES_PER_BUCKET)).toBe(1);
    expect(bucketCount(ENTRIES_PER_BUCKET + 1)).toBe(2);
    expect(bucketCount(3026)).toBe(95);
  });
});

describe("bucketForId", () => {
  it("collapses to bucket 0 for a single-shard collection", () => {
    expect(bucketForId("anything", 1)).toBe(0);
  });

  it("assigns every id to a valid bucket, and always the same one", () => {
    const ids = Array.from({ length: 500 }, (_, i) => `id-${i}-${i * 7919}`);
    const numBuckets = bucketCount(ids.length);
    for (const id of ids) {
      const bucket = bucketForId(id, numBuckets);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(numBuckets);
      expect(bucketForId(id, numBuckets)).toBe(bucket);
    }
  });

  it("round-trips: writing ids into shards then re-deriving finds every one", () => {
    const ids = Array.from({ length: 300 }, (_, i) => `entry${i}`);
    const numBuckets = bucketCount(ids.length);
    const shards: string[][] = Array.from({ length: numBuckets }, () => []);
    for (const id of ids) shards[bucketForId(id, numBuckets)]?.push(id);

    expect(shards.reduce((n, s) => n + s.length, 0)).toBe(ids.length);
    for (const id of ids) {
      expect(shards[bucketForId(id, numBuckets)]).toContain(id);
    }
  });

  it("spreads ids across shards rather than piling them into one", () => {
    const ids = Array.from({ length: 320 }, (_, i) => `entry${i}`);
    const numBuckets = bucketCount(ids.length);
    const used = new Set(ids.map((id) => bucketForId(id, numBuckets)));
    expect(used.size).toBe(numBuckets);
  });
});

describe("shardPath", () => {
  it("is relative to the generated ref root", () => {
    expect(shardPath("spells", 12)).toBe("shards/spells/12.json");
  });
});
