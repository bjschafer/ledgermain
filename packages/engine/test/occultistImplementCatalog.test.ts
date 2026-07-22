import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedOccultistImplementCatalog,
  OCCULTIST_SCHOOL_TAGS,
  OCCULTIST_SCHOOLS,
  resolveOccultistImplement,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `occultist-implements.ts`'s "vendored catalog overlay" section doc
 * comment. Same chassis two-shape merge as psychic disciplines: a
 * vendored-only school carries no base/resonant/focus powers.
 */
const ref = loadRefData();

describe("mergedOccultistImplementCatalog", () => {
  const merged = mergedOccultistImplementCatalog(ref);
  const byTag = new Map(merged.map((s) => [s.tag, s]));

  it("has exactly one row per vendored entry — every one of the 8 hand-authored schools matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.occultistImplements).length);
  });

  it("every hand-authored school matched a vendored entry, kept its own tag + powers, and is NOT vendoredOnly", () => {
    for (const tag of OCCULTIST_SCHOOL_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.vendoredOnly).toBe(false);
      if (!entry!.vendoredOnly) {
        expect(entry!.basePower).toEqual(OCCULTIST_SCHOOLS[tag]!.basePower);
        expect(entry!.resonantPower).toEqual(OCCULTIST_SCHOOLS[tag]!.resonantPower);
        expect(entry!.focusPowers).toEqual(OCCULTIST_SCHOOLS[tag]!.focusPowers);
      }
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only Panoply school is honestly display-only — no base/resonant/focus powers", () => {
    const entry = byTag.get("mages_paraphernalia")!;
    expect(entry.vendoredOnly).toBe(true);
    expect(entry.name).toBe("Mage's Paraphernalia (Panoply)");
    expect("basePower" in entry).toBe(false);
    expect("focusPowers" in entry).toBe(false);
    expect(OCCULTIST_SCHOOLS.mages_paraphernalia).toBeUndefined();
  });

  it("every tag is unique", () => {
    const tags = merged.map((s) => s.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveOccultistImplement", () => {
  it("prefers the hand-authored table for a matched tag, attaching vendored prose", () => {
    const entry = resolveOccultistImplement("abjuration", ref);
    expect(entry?.vendoredOnly).toBe(false);
    expect(entry?.name).toBe("Abjuration");
  });

  it("falls back to a vendored-only stub for a Panoply school", () => {
    const entry = resolveOccultistImplement("mages_paraphernalia", ref);
    expect(entry?.vendoredOnly).toBe(true);
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveOccultistImplement("not-a-real-school", ref)).toBeUndefined();
  });
});
