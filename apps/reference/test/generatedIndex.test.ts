/**
 * The one test that touches the real generator and the real vendored data: it
 * proves the index covers every in-scope entry, and that an id picked out of the
 * index actually lands in the shard the client would fetch for it.
 */
import type { Feat, RefDataMeta, RuleEntry } from "@pf1/schema";
import { beforeAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CONDITION_IDS } from "../../../packages/engine/src/conditions.js";
import { bucketForId, shardPath } from "../src/shared/bucketing.js";
import { COLLECTIONS } from "../src/shared/collections.js";
import { decodeIndex, type EncodedIndex, type RefIndex } from "../src/shared/indexCodec.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const refDir = join(appRoot, "public/ref");
const dataDir = join(appRoot, "../../packages/data-pipeline/data");

/** Collections read out of `meta.json` — conditions come from the engine instead. */
const FROM_DATA = [
  "spells",
  "feats",
  "weapons",
  "armors",
  "items",
  "monsters",
  "monster-templates",
  "rules",
] as const;

let index: RefIndex;
let meta: RefDataMeta;

beforeAll(() => {
  // Unconditionally, in a fraction of a second: an index left from an earlier
  // data pin otherwise fails here as an unexplained version mismatch.
  execFileSync("bun", ["scripts/build-ref-index.ts"], { cwd: appRoot, stdio: "ignore" });
  index = decodeIndex(JSON.parse(readFileSync(join(refDir, "index.json"), "utf8")) as EncodedIndex);
  meta = JSON.parse(readFileSync(join(dataDir, "meta.json"), "utf8")) as RefDataMeta;
});

/** Section rows ("Use a Scroll" inside Use Magic Device) point into a page; they aren't entries. */
const pages = () => index.entries.filter((e) => e.anchor === undefined);

describe("generated index", () => {
  it("indexes every in-scope entry", () => {
    const expected =
      FROM_DATA.reduce((n, c) => n + (meta.counts[c] ?? 0), 0) + CONDITION_IDS.length;
    expect(pages()).toHaveLength(expected);
  });

  it("matches the per-collection counts from meta.json", () => {
    for (const collection of FROM_DATA) {
      const got = pages().filter((e) => e.collection === collection).length;
      expect(got).toBe(meta.counts[collection] ?? 0);
    }
    expect(pages().filter((e) => e.collection === "conditions")).toHaveLength(CONDITION_IDS.length);
  });

  it("points every section row at a section its page really has", () => {
    const sections = index.entries.filter((e) => e.anchor !== undefined);
    expect(sections.length).toBeGreaterThan(0);
    const numBuckets = index.buckets.rules ?? 1;
    for (const entry of sections) {
      expect(entry.collection).toBe("rules");
      const path = shardPath("rules", bucketForId(entry.id, numBuckets));
      const shard = JSON.parse(readFileSync(join(refDir, path), "utf8")) as Record<
        string,
        RuleEntry
      >;
      expect(shard[entry.id]?.sections).toContainEqual({
        id: entry.anchor ?? "",
        title: entry.name,
      });
    }
  });

  it("names a rules contents page that exists", () => {
    expect(pages().some((e) => e.collection === "rules" && e.id === index.rulesRoot)).toBe(true);
  });

  it("lists rules chapters that each name a rules page", () => {
    const rulePages = new Set(
      pages()
        .filter((e) => e.collection === "rules")
        .map((e) => e.id),
    );
    expect(index.rulesChapters.length).toBeGreaterThan(0);
    for (const id of index.rulesChapters) expect(rulePages.has(id)).toBe(true);
  });

  it("addresses entries by name slug, never by Foundry id", () => {
    const idOf = (collection: string, name: string) =>
      pages().find((e) => e.collection === collection && e.name === name)?.id;
    expect(idOf("spells", "Mage Armor")).toBe("mage-armor");
    expect(idOf("feats", "Power Attack")).toBe("power-attack");
    expect(idOf("items", "Ring of Protection +2")).toBe("ring-of-protection-2");
    // A name-slug clash suffixes every entry in it with its source.
    expect(idOf("items", "Bag of Tricks (Gray)")).toBe("bag-of-tricks-gray-aquatic-adventures");
  });

  it("links feat prerequisites to the prerequisite's own URL id", () => {
    const numBuckets = index.buckets.feats ?? 1;
    const shard = JSON.parse(
      readFileSync(join(refDir, shardPath("feats", bucketForId("cleave", numBuckets))), "utf8"),
    ) as Record<string, Feat>;
    expect(shard.cleave?.prerequisites.feats.map((ref) => ref.id)).toContain("power-attack");
  });

  it("names every spellcasting class tag a spell lists", () => {
    expect(index.classNames.summonerUnchained).toBe("Summoner (Unchained)");
    expect(index.classNames.wizard).toBe("Wizard");
  });

  it("carries the pinned dataset versions", () => {
    expect(index.meta.dataVersion).toBe(meta.dataVersion);
    expect(index.meta.contentVersion).toBe(meta.contentVersion);
  });

  it("declares a bucket count for every collection", () => {
    for (const collection of COLLECTIONS) {
      expect(index.buckets[collection]).toBeGreaterThan(0);
    }
  });

  it("places every entry in the shard the client recomputes for it", () => {
    // One entry per (collection, bucket) pair is enough to cover every shard file
    // without re-reading 250 of them per assertion.
    const seen = new Set<string>();
    for (const entry of pages()) {
      const numBuckets = index.buckets[entry.collection] ?? 1;
      const path = shardPath(entry.collection, bucketForId(entry.id, numBuckets));
      if (seen.has(path)) continue;
      seen.add(path);
      const shard = JSON.parse(readFileSync(join(refDir, path), "utf8")) as Record<
        string,
        { name: string }
      >;
      expect(shard[entry.id]?.name).toBe(entry.name);
    }
    expect(seen.size).toBe(
      COLLECTIONS.reduce((n, collection) => n + (index.buckets[collection] ?? 0), 0),
    );
  });

  it("mirrors the condition ladders so the client needs no engine import", () => {
    expect(index.ladders.length).toBeGreaterThan(0);
    const ids = new Set(
      index.entries.filter((e) => e.collection === "conditions").map((e) => e.id),
    );
    for (const ladder of index.ladders) {
      for (const id of ladder) expect(ids.has(id)).toBe(true);
    }
  });
});
