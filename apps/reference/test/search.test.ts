import { describe, expect, it } from "bun:test";

import {
  countByCollection,
  EMPTY_FILTER,
  matchRank,
  searchIndex,
  spellLevels,
  type SearchFilter,
} from "../src/model/search.js";
import type { IndexEntry } from "../src/shared/indexCodec.js";

function spell(name: string, level: number): IndexEntry {
  return {
    id: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    collection: "spells",
    facet: "",
    level,
  };
}

function feat(name: string): IndexEntry {
  return {
    id: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    collection: "feats",
    facet: "",
    level: -1,
  };
}

const ENTRIES: IndexEntry[] = [
  spell("Fireball", 3),
  spell("Delayed Blast Fireball", 7),
  spell("Fire Shield", 4),
  spell("Wall of Fire", 4),
  spell("Mirror Image", 2),
  spell("Wall of Mirrors", 5),
  feat("Fireball Focus"),
  { id: "shaken", name: "Shaken", collection: "conditions", facet: "Condition", level: -1 },
];

const filter = (overrides: Partial<SearchFilter>): SearchFilter => ({
  ...EMPTY_FILTER,
  ...overrides,
});

describe("matchRank", () => {
  it("ranks exact, prefix, word-boundary, then mid-word", () => {
    expect(matchRank("Fire", "fire")).toBe(0);
    expect(matchRank("Fireball", "fire")).toBe(1);
    expect(matchRank("Wall of Fire", "fire")).toBe(2);
    expect(matchRank("Bonfire", "fire")).toBe(3);
  });

  it("treats punctuation as a word boundary", () => {
    expect(matchRank("Cure Light Wounds, Mass", "mass")).toBe(2);
    expect(matchRank("Summon Monster (Greater)", "greater")).toBe(2);
  });

  it("returns -1 for a miss", () => {
    expect(matchRank("Fireball", "acid")).toBe(-1);
  });
});

describe("searchIndex", () => {
  it("puts prefix matches ahead of word-boundary ones, then groups and levels", () => {
    const { entries } = searchIndex(ENTRIES, filter({ query: "fire" }), 50);
    expect(entries.map((e) => e.name)).toEqual([
      // rank 1 (prefix): spells before feats, then by level
      "Fireball",
      "Fire Shield",
      "Fireball Focus",
      // rank 2 (word boundary)
      "Wall of Fire",
      "Delayed Blast Fireball",
    ]);
  });

  it("ranks before it groups by collection", () => {
    const { entries } = searchIndex(ENTRIES, filter({ query: "fireball" }), 50);
    // Both "Fireball" (spell) and "Fireball Focus" (feat) are prefix matches, but
    // the exact one wins the rank outright.
    expect(entries[0]?.name).toBe("Fireball");
    expect(entries[1]?.name).toBe("Fireball Focus");
  });

  it("filters by collection", () => {
    const { entries, total } = searchIndex(
      ENTRIES,
      filter({ query: "fire", collection: "feats" }),
      50,
    );
    expect(total).toBe(1);
    expect(entries.map((e) => e.name)).toEqual(["Fireball Focus"]);
  });

  it("filters by spell level", () => {
    const { entries } = searchIndex(ENTRIES, filter({ collection: "spells", level: 4 }), 50);
    expect(entries.map((e) => e.name)).toEqual(["Fire Shield", "Wall of Fire"]);
  });

  it("caps the rendered slice but reports the true total", () => {
    const { entries, total } = searchIndex(ENTRIES, filter({ query: "fire" }), 2);
    expect(entries).toHaveLength(2);
    expect(total).toBe(5);
  });

  it("browses everything in collection then level then name order when the query is empty", () => {
    const { entries } = searchIndex(ENTRIES, EMPTY_FILTER, 50);
    expect(entries).toHaveLength(ENTRIES.length);
    expect(entries[0]?.name).toBe("Mirror Image");
    expect(entries.at(-1)?.name).toBe("Shaken");
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    const { total } = searchIndex(ENTRIES, filter({ query: "  FIREBALL " }), 50);
    expect(total).toBe(3);
  });
});

describe("countByCollection / spellLevels", () => {
  it("counts per collection", () => {
    expect(countByCollection(ENTRIES)).toEqual({ spells: 6, feats: 1, conditions: 1 });
  });

  it("lists the spell levels present, ascending", () => {
    expect(spellLevels(ENTRIES)).toEqual([2, 3, 4, 5, 7]);
  });
});
