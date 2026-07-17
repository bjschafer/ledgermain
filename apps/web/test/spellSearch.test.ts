import { describe, expect, it } from "bun:test";

import type { SpellEntry } from "../src/model/spellSearch.js";
import {
  EMPTY_SPELL_FILTER,
  filterSpells,
  groupSpellsByLevel,
  isFilterActive,
  levelsOf,
  schoolsOf,
} from "../src/model/spellSearch.js";

const entries: SpellEntry[] = [
  { id: "fireball", name: "Fireball", level: 3, school: "evo" },
  { id: "dbf", name: "Delayed Blast Fireball", level: 7, school: "evo" },
  { id: "mirror", name: "Mirror Image", level: 2, school: "ill" },
  { id: "wall", name: "Wall of Mirrors", level: 4, school: "ill" },
  { id: "blur", name: "Blur", level: 2, school: "ill" },
  { id: "shield", name: "Shield", level: 1, school: "abj" },
];

function names(list: SpellEntry[]) {
  return list.map((e) => e.name);
}

describe("filterSpells", () => {
  it("returns everything, level-then-name ordered, with no filter", () => {
    expect(names(filterSpells(entries, EMPTY_SPELL_FILTER))).toEqual([
      "Shield",
      "Blur",
      "Mirror Image",
      "Fireball",
      "Wall of Mirrors",
      "Delayed Blast Fireball",
    ]);
  });

  it("ranks a name-start match above a mid-name match", () => {
    // "Fireball" starts with the query; "Delayed Blast Fireball" only contains
    // it — despite being the higher spell level, Fireball must come first.
    const out = filterSpells(entries, { ...EMPTY_SPELL_FILTER, query: "fireball" });
    expect(names(out)).toEqual(["Fireball", "Delayed Blast Fireball"]);
  });

  it("ranks an exact match above a longer prefix match", () => {
    const out = filterSpells(
      [
        { id: "a", name: "Shield Other", level: 2 },
        { id: "b", name: "Shield", level: 1 },
      ],
      { ...EMPTY_SPELL_FILTER, query: "shield" },
    );
    expect(names(out)).toEqual(["Shield", "Shield Other"]);
  });

  it("ranks a word-boundary match above a mid-word match", () => {
    const out = filterSpells(
      [
        { id: "a", name: "Cornerstone", level: 1 },
        { id: "b", name: "Iron Stone", level: 1 },
      ],
      { ...EMPTY_SPELL_FILTER, query: "stone" },
    );
    expect(names(out)).toEqual(["Iron Stone", "Cornerstone"]);
  });

  it("matches case-insensitively on a substring", () => {
    expect(names(filterSpells(entries, { ...EMPTY_SPELL_FILTER, query: "MIRROR" }))).toEqual([
      "Mirror Image",
      "Wall of Mirrors",
    ]);
  });

  it("filters by school", () => {
    expect(names(filterSpells(entries, { ...EMPTY_SPELL_FILTER, school: "ill" }))).toEqual([
      "Blur",
      "Mirror Image",
      "Wall of Mirrors",
    ]);
  });

  it("filters by level", () => {
    expect(names(filterSpells(entries, { ...EMPTY_SPELL_FILTER, level: 2 }))).toEqual([
      "Blur",
      "Mirror Image",
    ]);
  });

  it("intersects query, school, and level", () => {
    const out = filterSpells(entries, { query: "i", school: "ill", level: 2 });
    expect(names(out)).toEqual(["Mirror Image"]);
  });

  it("returns nothing when the query matches no name", () => {
    expect(filterSpells(entries, { ...EMPTY_SPELL_FILTER, query: "zzz" })).toEqual([]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(names(filterSpells(entries, { ...EMPTY_SPELL_FILTER, query: "  blur  " }))).toEqual([
      "Blur",
    ]);
  });
});

describe("groupSpellsByLevel", () => {
  it("buckets by ascending level, preserving incoming order within a level", () => {
    const groups = groupSpellsByLevel(filterSpells(entries, EMPTY_SPELL_FILTER));
    expect(groups.map((g) => g.level)).toEqual([1, 2, 3, 4, 7]);
    expect(names(groups[1]!.entries)).toEqual(["Blur", "Mirror Image"]);
  });

  it("is empty for an empty list", () => {
    expect(groupSpellsByLevel([])).toEqual([]);
  });
});

describe("schoolsOf / levelsOf", () => {
  it("lists distinct schools sorted by their label", () => {
    const label = (s: string) => ({ abj: "Abjuration", evo: "Evocation", ill: "Illusion" })[s] ?? s;
    expect(schoolsOf(entries, label)).toEqual(["abj", "evo", "ill"]);
  });

  it("lists distinct levels ascending", () => {
    expect(levelsOf(entries)).toEqual([1, 2, 3, 4, 7]);
  });
});

describe("isFilterActive", () => {
  it("is false for the empty filter and true once any facet is set", () => {
    expect(isFilterActive(EMPTY_SPELL_FILTER)).toBe(false);
    expect(isFilterActive({ ...EMPTY_SPELL_FILTER, query: "  " })).toBe(false);
    expect(isFilterActive({ ...EMPTY_SPELL_FILTER, query: "x" })).toBe(true);
    expect(isFilterActive({ ...EMPTY_SPELL_FILTER, school: "ill" })).toBe(true);
    expect(isFilterActive({ ...EMPTY_SPELL_FILTER, level: 0 })).toBe(true);
  });
});
