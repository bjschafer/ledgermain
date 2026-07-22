import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  SHIFTER_ASPECT_IDS,
  SHIFTER_ASPECTS,
  mergedShifterAspectCatalog,
  resolveShifterAspect,
} from "../src/index.js";

/**
 * Coverage for the shifter-aspect vendored-catalog overlay (issue #74 Phase
 * 3c) — mirrors `ragePowerCatalog.test.ts`'s pattern. This catalog is the
 * rare EXACT 1:1 match (30 hand-authored, 30 vendored, zero orphan on either
 * side) — see `shifter-aspects.ts`'s doc comment.
 */
const ref = loadRefData();

describe("mergedShifterAspectCatalog", () => {
  const merged = mergedShifterAspectCatalog(ref);
  const byId = new Map(merged.map((a) => [a.id, a]));

  it("has exactly one row per vendored entry, an exact 1:1 match with the hand-authored table", () => {
    expect(merged).toHaveLength(Object.keys(ref.shifterAspects).length);
    expect(merged).toHaveLength(SHIFTER_ASPECT_IDS.length);
  });

  it("every hand-authored entry matched a vendored entry by name, kept its own id + mechanics, and picked up vendored prose", () => {
    for (const id of SHIFTER_ASPECT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.minorFormChanges).toEqual(SHIFTER_ASPECTS[id]!.minorFormChanges);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a matched entry's prose includes the Major Form paragraph the hand-authored table doesn't carry (Bear)", () => {
    const entry = byId.get("bear")!;
    expect(entry.description).toContain("Major Form");
  });

  it("every id is unique", () => {
    const ids = merged.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveShifterAspect", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const aspect = resolveShifterAspect("bat", ref);
    expect(aspect).toBe(SHIFTER_ASPECTS.bat);
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveShifterAspect("not-a-real-aspect", ref)).toBeUndefined();
  });
});
