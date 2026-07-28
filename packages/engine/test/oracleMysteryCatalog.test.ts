import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedOracleMysteryCatalog,
  ORACLE_MYSTERIES,
  ORACLE_MYSTERY_TAGS,
  resolveOracleMystery,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74) — see
 * `oracle-mysteries.ts`'s "vendored catalog overlay" section doc comment for
 * the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedOracleMysteryCatalog", () => {
  const merged = mergedOracleMysteryCatalog(ref);
  const byTag = new Map(merged.map((m) => [m.tag, m]));

  it("has one row per vendored entry — every hand-authored mystery matched one by name", () => {
    const vendoredCount = Object.keys(ref.oracleMysteries).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 10 hand-authored mysteries matched a vendored entry by name and kept their own mechanics", () => {
    for (const tag of ORACLE_MYSTERY_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.classSkills).toEqual(ORACLE_MYSTERIES[tag]!.classSkills);
      expect(entry!.bonusSpells).toEqual(ORACLE_MYSTERIES[tag]!.bonusSpells);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("no vendored-only mysteries remain — every vendored tag has a hand-authored entry", () => {
    // Issue #74's Phase 2 authored the remaining 23, so the merged catalog's
    // display-only fallback now only exists for a future data bump that
    // vendors a mystery this table hasn't caught up with.
    for (const entry of merged) {
      expect(ORACLE_MYSTERIES[entry.tag], entry.tag).toBeDefined();
      expect(entry.displayOnly, entry.tag).toBe(false);
    }
  });

  it("every tag is unique", () => {
    const tags = merged.map((m) => m.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveOracleMystery", () => {
  it("prefers the hand-authored table for a matched tag", () => {
    const mystery = resolveOracleMystery("battle", ref);
    expect(mystery?.displayOnly).toBe(false);
    expect(mystery?.classSkills).toEqual(ORACLE_MYSTERIES.battle!.classSkills);
  });

  it("resolves a formerly vendored-only tag through the hand table now", () => {
    const mystery = resolveOracleMystery("ancestor", ref);
    expect(mystery?.displayOnly).toBe(false);
    expect(mystery?.name).toBe("Ancestor");
    expect(mystery?.classSkills).toEqual(ORACLE_MYSTERIES.ancestor!.classSkills);
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveOracleMystery("not-a-real-mystery", ref)).toBeUndefined();
  });
});
