import { describe, expect, it } from "bun:test";

import {
  decodeIndex,
  encodeIndex,
  rleDecode,
  rleEncode,
  type IndexEntry,
  type RefIndex,
} from "../src/shared/indexCodec.js";

const META = {
  contentVersion: "13.351",
  dataVersion: "11.11+abc",
  generatedAt: "2026-01-01T00:00:00.000Z",
};

function index(entries: IndexEntry[]): RefIndex {
  return {
    meta: META,
    entries,
    buckets: { spells: 95, feats: 112, conditions: 1 },
    ladders: [["shaken", "frightened", "panicked"]],
  };
}

const ENTRIES: IndexEntry[] = [
  { id: "aaa", name: "Fireball", collection: "spells", facet: "Evocation 3 · wiz 3", level: 3 },
  { id: "bbb", name: "Mirror Image", collection: "spells", facet: "Illusion 2 · wiz 2", level: 2 },
  { id: "ccc", name: "Power Attack", collection: "feats", facet: "Combat", level: -1 },
  { id: "shaken", name: "Shaken", collection: "conditions", facet: "Condition", level: -1 },
];

describe("rle", () => {
  it("round-trips", () => {
    for (const values of [[], [0], [0, 0, 0, 1, 1, 2], [-1, -1, 5, -1]]) {
      expect(rleDecode(rleEncode(values))).toEqual(values);
    }
  });

  it("collapses runs to a pair per run", () => {
    expect(rleEncode([0, 0, 0, 1, 1])).toEqual([0, 3, 1, 2]);
  });
});

describe("encodeIndex / decodeIndex", () => {
  it("round-trips every field", () => {
    const decoded = decodeIndex(encodeIndex(index(ENTRIES)));
    expect(decoded.entries).toEqual(ENTRIES);
    expect(decoded.meta).toEqual(META);
    expect(decoded.buckets).toEqual({ spells: 95, feats: 112, conditions: 1 });
    expect(decoded.ladders).toEqual([["shaken", "frightened", "panicked"]]);
  });

  it("survives a JSON round-trip (the actual wire path)", () => {
    const wire = JSON.parse(JSON.stringify(encodeIndex(index(ENTRIES))));
    expect(decodeIndex(wire).entries).toEqual(ENTRIES);
  });

  it("encodes columnar arrays, one slot per entry", () => {
    const encoded = encodeIndex(index(ENTRIES));
    expect(encoded.ids).toEqual(["aaa", "bbb", "ccc", "shaken"]);
    expect(encoded.names).toEqual(["Fireball", "Mirror Image", "Power Attack", "Shaken"]);
    // spells (code 0) ×2, feats (code 1) ×1, conditions (code 5) ×1
    expect(encoded.coll).toEqual([0, 2, 1, 1, 5, 1]);
  });

  it("drops rows whose collection code this build does not know", () => {
    const encoded = encodeIndex(index(ENTRIES));
    encoded.coll = [0, 1, 99, 3];
    const decoded = decodeIndex(encoded);
    expect(decoded.entries).toHaveLength(1);
    expect(decoded.entries[0]?.id).toBe("aaa");
  });

  it("handles an empty index", () => {
    expect(decodeIndex(encodeIndex(index([]))).entries).toEqual([]);
  });
});
