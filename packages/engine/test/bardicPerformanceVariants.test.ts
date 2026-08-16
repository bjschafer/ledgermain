import { describe, expect, test } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { BARD_PERFORMANCE_VARIANTS } from "../src/bardic-performance-variants/index.js";
import {
  type ArchetypePerformanceVariant,
  mergePerformanceDefs,
} from "../src/bardic-performance-variants/types.js";
import { BARD_PERFORMANCES, bardicPerformanceToggleOptions } from "../src/bardic-performances.js";
import { RAGING_SONG_VARIANTS } from "../src/raging-song-variants.js";
import { ragingSongToggleOptions } from "../src/raging-song.js";

const refData = loadRefData();

const BASE_BARD_TAGS = new Set(BARD_PERFORMANCES.map((p) => p.tag));
const BASE_SKALD_TAGS = new Set([
  "inspiredRage",
  "songOfMarching",
  "songOfStrength",
  "dirgeOfDoom",
  "songOfTheFallen",
]);

function driftGuards(
  variants: readonly ArchetypePerformanceVariant[],
  classTag: string,
  baseTags: ReadonlySet<string>,
) {
  const seen = new Set<string>();
  for (const v of variants) {
    // One entry per archetype — a second shard adding the same archetype
    // would silently double its performances.
    expect(seen.has(v.archetypeId)).toBe(false);
    seen.add(v.archetypeId);

    // The archetype id must resolve in the vendored data, for the right class.
    expect(refData.archetypes[v.archetypeId]?.classTag).toBe(classTag);

    for (const tag of v.removesTags ?? []) expect(baseTags.has(tag)).toBe(true);

    const perfTags = new Set<string>();
    for (const p of v.performances) {
      expect(perfTags.has(p.tag)).toBe(false);
      perfTags.add(p.tag);
      expect(p.minLevel).toBeGreaterThanOrEqual(1);
      expect(p.minLevel).toBeLessThanOrEqual(20);
    }
  }
}

describe("performance-variant drift guards", () => {
  test("bard variant entries resolve and stay internally consistent", () => {
    driftGuards(BARD_PERFORMANCE_VARIANTS, "bard", BASE_BARD_TAGS);
  });

  test("skald variant entries resolve and stay internally consistent", () => {
    driftGuards(RAGING_SONG_VARIANTS, "skald", BASE_SKALD_TAGS);
  });

  test("removesInspireCourage is bard-only", () => {
    for (const v of RAGING_SONG_VARIANTS) expect(v.removesInspireCourage).toBeUndefined();
  });
});

describe("mergePerformanceDefs", () => {
  const SYNTHETIC: ArchetypePerformanceVariant[] = [
    {
      archetypeId: "bard:synthetic-test",
      removesTags: ["suggestion", "massSuggestion"],
      performances: [
        {
          tag: "testSong",
          name: "Test Song",
          summary: "synthetic",
          minLevel: 6,
          changes: [],
        },
      ],
    },
  ];

  test("inactive variants change nothing", () => {
    const merged = mergePerformanceDefs(BARD_PERFORMANCES, SYNTHETIC, [], 20);
    expect(merged.map((m) => m.idSuffix)).toEqual(BARD_PERFORMANCES.map((p) => p.tag));
  });

  test("active variant drops removed tags and appends its own, level-gated", () => {
    const at20 = mergePerformanceDefs(BARD_PERFORMANCES, SYNTHETIC, ["bard:synthetic-test"], 20);
    const suffixes = at20.map((m) => m.idSuffix);
    expect(suffixes).not.toContain("suggestion");
    expect(suffixes).not.toContain("massSuggestion");
    expect(suffixes).toContain("synthetic-test:testSong");

    const at5 = mergePerformanceDefs(BARD_PERFORMANCES, SYNTHETIC, ["bard:synthetic-test"], 5);
    expect(at5.map((m) => m.idSuffix)).not.toContain("synthetic-test:testSong");
  });
});

describe("toggle factories with archetypes", () => {
  test("unknown archetype ids leave the bard list unchanged", () => {
    const base = bardicPerformanceToggleOptions(20);
    const withUnknown = bardicPerformanceToggleOptions(20, ["bard:no-such-archetype"]);
    expect(withUnknown.map((o) => o.id)).toEqual(base.map((o) => o.id));
  });

  test("unknown archetype ids leave the skald list unchanged", () => {
    const base = ragingSongToggleOptions(20);
    const withUnknown = ragingSongToggleOptions(20, ["skald:no-such-archetype"]);
    expect(withUnknown.map((o) => o.id)).toEqual(base.map((o) => o.id));
  });
});
