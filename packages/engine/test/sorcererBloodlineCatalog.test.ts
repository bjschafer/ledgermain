import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  BLOODLINE_TAGS,
  BLOODLINES,
  mergedSorcererBloodlineCatalog,
  resolveSorcererBloodline,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74) — see
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

  it("every hand-authored bloodline matched a vendored entry by name and kept its own powers/arcana", () => {
    expect(BLOODLINE_TAGS).toHaveLength(51);
    for (const tag of BLOODLINE_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.powers).toEqual(BLOODLINES[tag]!.powers);
      expect(entry!.arcana).toEqual(BLOODLINES[tag]!.arcana);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("no vendored bloodline is left display-only (the whole catalog is hand-authored)", () => {
    expect(merged.filter((b) => b.displayOnly)).toEqual([]);
  });

  it('"Kobold" (spell-list tag) carries the vendored "Kobold Sorcerer" prose via the alias map', () => {
    const entry = byTag.get("Kobold")!;
    expect(entry.displayOnly).toBe(false);
    expect(entry.description).toBeDefined();
    expect(merged.some((b) => b.tag === "Kobold Sorcerer")).toBe(false);
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

  it("resolves a splatbook tag to its hand-authored entry", () => {
    const bloodline = resolveSorcererBloodline("Accursed", ref);
    expect(bloodline?.displayOnly).toBe(false);
    expect(bloodline?.powers.length).toBeGreaterThan(0);
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveSorcererBloodline("not-a-real-bloodline", ref)).toBeUndefined();
  });
});
