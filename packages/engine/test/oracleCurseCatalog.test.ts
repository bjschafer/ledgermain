import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedOracleCurseCatalog,
  ORACLE_CURSES,
  ORACLE_CURSE_TAGS,
  resolveOracleCurse,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `oracle-curses.ts`'s "vendored catalog overlay" section doc comment for
 * the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedOracleCurseCatalog", () => {
  const merged = mergedOracleCurseCatalog(ref);
  const byTag = new Map(merged.map((c) => [c.tag, c]));

  it("has one row per vendored entry — every hand-authored curse matched one by name", () => {
    const vendoredCount = Object.keys(ref.oracleCurses).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 6 hand-authored curses matched a vendored entry by name and kept their own mechanics", () => {
    for (const tag of ORACLE_CURSE_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(ORACLE_CURSES[tag]!.changes);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only curse (no hand-authored counterpart) resolves display-only with its own prose", () => {
    const entry = byTag.get("aboleth")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
    expect(entry.description).toContain("Penalty");
    expect(ORACLE_CURSES.aboleth).toBeUndefined();
  });

  it("every tag is unique", () => {
    const tags = merged.map((c) => c.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveOracleCurse", () => {
  it("prefers the hand-authored table for a matched tag", () => {
    const curse = resolveOracleCurse("wasting", ref);
    expect(curse?.displayOnly).toBe(false);
    expect(curse?.changes).toEqual(ORACLE_CURSES.wasting!.changes);
  });

  it("falls back to the vendored catalog for a vendored-only tag", () => {
    const curse = resolveOracleCurse("aboleth", ref);
    expect(curse?.displayOnly).toBe(true);
    expect(curse?.name).toBe("Aboleth");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveOracleCurse("not-a-real-curse", ref)).toBeUndefined();
  });
});
