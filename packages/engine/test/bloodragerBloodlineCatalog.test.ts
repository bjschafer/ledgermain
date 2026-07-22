import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  BLOODRAGER_BLOODLINE_TAGS,
  BLOODRAGER_BLOODLINES,
  mergedBloodragerBloodlineCatalog,
  resolveBloodragerBloodline,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `bloodrager-bloodlines.ts`'s "vendored catalog overlay" section doc
 * comment for the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedBloodragerBloodlineCatalog", () => {
  const merged = mergedBloodragerBloodlineCatalog(ref);
  const byTag = new Map(merged.map((b) => [b.tag, b]));

  it("has one row per vendored entry — every hand-authored bloodline matched one by name", () => {
    const vendoredCount = Object.keys(ref.bloodragerBloodlines).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 10 hand-authored bloodlines matched a vendored entry by name and kept their own powers", () => {
    for (const tag of BLOODRAGER_BLOODLINE_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.powers).toEqual(BLOODRAGER_BLOODLINES[tag]!.powers);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("Aberrant has no hand-authored bloodrager counterpart (unlike sorcerer) and resolves display-only", () => {
    const entry = byTag.get("Aberrant")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.powers).toEqual([]);
    expect(entry.description).toBeDefined();
    expect(BLOODRAGER_BLOODLINES.Aberrant).toBeUndefined();
  });

  it("every tag is unique", () => {
    const tags = merged.map((b) => b.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveBloodragerBloodline", () => {
  it("prefers the hand-authored table for a matched tag", () => {
    const bloodline = resolveBloodragerBloodline("Abyssal", ref);
    expect(bloodline?.displayOnly).toBe(false);
    expect(bloodline?.powers).toEqual(BLOODRAGER_BLOODLINES.Abyssal!.powers);
  });

  it("falls back to the vendored catalog for a vendored-only tag", () => {
    const bloodline = resolveBloodragerBloodline("Aberrant", ref);
    expect(bloodline?.displayOnly).toBe(true);
    expect(bloodline?.name).toBe("Aberrant");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveBloodragerBloodline("not-a-real-bloodline", ref)).toBeUndefined();
  });
});
