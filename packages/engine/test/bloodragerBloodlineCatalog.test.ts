import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  BLOODRAGER_BLOODLINE_TAGS,
  BLOODRAGER_BLOODLINES,
  mergedBloodragerBloodlineCatalog,
  resolveBloodragerBloodline,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — see `bloodrager-bloodlines.ts`'s
 * "vendored catalog overlay" section doc comment for the collision-audit
 * narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedBloodragerBloodlineCatalog", () => {
  const merged = mergedBloodragerBloodlineCatalog(ref);
  const byTag = new Map(merged.map((b) => [b.tag, b]));

  it("has one row per vendored entry — every hand-authored bloodline matched one by name", () => {
    const vendoredCount = Object.keys(ref.bloodragerBloodlines).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("every hand-authored bloodline matched a vendored entry by name and kept its own powers", () => {
    expect(BLOODRAGER_BLOODLINE_TAGS).toHaveLength(24);
    for (const tag of BLOODRAGER_BLOODLINE_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.powers).toEqual(BLOODRAGER_BLOODLINES[tag]!.powers);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("no vendored bloodline is left display-only (the whole catalog is hand-authored)", () => {
    expect(merged.filter((b) => b.displayOnly)).toEqual([]);
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

  it("resolves a splatbook tag to its hand-authored entry", () => {
    const bloodline = resolveBloodragerBloodline("Aquatic", ref);
    expect(bloodline?.displayOnly).toBe(false);
    expect(bloodline?.powers.length).toBeGreaterThan(0);
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveBloodragerBloodline("not-a-real-bloodline", ref)).toBeUndefined();
  });
});
