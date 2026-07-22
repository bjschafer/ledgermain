import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  BLOODLINE_TAGS,
  BLOODLINES,
  mergedSorcererBloodlineCatalog,
  resolveSorcererBloodline,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `bloodlines.ts`'s "vendored catalog overlay" section doc comment for the
 * collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedSorcererBloodlineCatalog", () => {
  const merged = mergedSorcererBloodlineCatalog(ref);
  const byTag = new Map(merged.map((b) => [b.tag, b]));

  it("has one row per vendored entry — every hand-authored bloodline matched one by name", () => {
    const vendoredCount = Object.keys(ref.sorcererBloodlines).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 10 hand-authored bloodlines matched a vendored entry by name and kept their own powers/arcana", () => {
    for (const tag of BLOODLINE_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.powers).toEqual(BLOODLINES[tag]!.powers);
      expect(entry!.arcana).toEqual(BLOODLINES[tag]!.arcana);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only bloodline (no hand-authored counterpart) resolves display-only with its own prose", () => {
    const entry = byTag.get("Accursed")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.powers).toEqual([]);
    expect(entry.bonusFeatSlugs).toEqual([]);
    expect(entry.description).toBeDefined();
    expect(BLOODLINES.Accursed).toBeUndefined();
  });

  it("every tag is unique", () => {
    const tags = merged.map((b) => b.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveSorcererBloodline", () => {
  it("prefers the hand-authored table for a matched tag", () => {
    const bloodline = resolveSorcererBloodline("Aberrant", ref);
    expect(bloodline?.displayOnly).toBe(false);
    expect(bloodline?.powers).toEqual(BLOODLINES.Aberrant!.powers);
  });

  it("falls back to the vendored catalog for a vendored-only tag", () => {
    const bloodline = resolveSorcererBloodline("Accursed", ref);
    expect(bloodline?.displayOnly).toBe(true);
    expect(bloodline?.name).toBe("Accursed");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveSorcererBloodline("not-a-real-bloodline", ref)).toBeUndefined();
  });
});
