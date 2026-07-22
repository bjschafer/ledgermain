import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  INVESTIGATOR_TALENT_IDS,
  INVESTIGATOR_TALENTS,
  mergedInvestigatorTalentCatalog,
  resolveInvestigatorTalent,
} from "../src/index.js";

/**
 * Coverage for the investigator-talent vendored-catalog overlay (issue #74
 * Phase 3b) — mirrors `ragePowerCatalog.test.ts`'s pattern.
 */
const ref = loadRefData();

describe("mergedInvestigatorTalentCatalog", () => {
  const merged = mergedInvestigatorTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every hand-authored entry matched, no orphan to append", () => {
    expect(merged).toHaveLength(Object.keys(ref.investigatorTalents).length);
  });

  it("all 28 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of INVESTIGATOR_TALENT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(INVESTIGATOR_TALENTS[id]!.changes);
      expect(entry!.minLevel).toBe(INVESTIGATOR_TALENTS[id]!.minLevel);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(28);
  });

  it("a vendored-only entry resolves display-only with its own id + prose, bucketed by the source's own category label", () => {
    // Not a hand-authored entry: any studied-strike-labeled vendored-only talent.
    const entry = [...byId.values()].find(
      (t) => t.vendorCategory === "Other Studied Strike Talents",
    )!;
    expect(entry).toBeDefined();
    expect(entry.category).toBe("studiedStrike");
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveInvestigatorTalent", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const talent = resolveInvestigatorTalent("blindingStrike", ref);
    expect(talent).toBe(INVESTIGATOR_TALENTS.blindingStrike);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const talent = resolveInvestigatorTalent("domino_effect", ref);
    expect(talent?.displayOnly).toBe(true);
    expect(talent?.name).toBe("Domino Effect");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveInvestigatorTalent("not-a-real-talent", ref)).toBeUndefined();
  });
});
