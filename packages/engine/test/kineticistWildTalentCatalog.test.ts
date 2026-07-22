import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  eligibleCompositeBlasts,
  KINETICIST_COMPOSITE_BLASTS,
  KINETICIST_WILD_TALENTS,
  mergedCompositeBlastCatalog,
  mergedKineticistWildTalentCatalog,
  resolveKineticistWildTalent,
} from "../src/index.js";

/**
 * Coverage for the kineticist-wild-talent + composite-blast vendored-catalog
 * overlays (issue #74 Phase 3b) — mirrors `ragePowerCatalog.test.ts`'s
 * pattern. See `kineticist-wild-talents.ts`'s "vendored catalog overlay" doc
 * comment for the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedKineticistWildTalentCatalog", () => {
  const merged = mergedKineticistWildTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored infusion/utility entry — every hand-authored entry matched, no orphan to append", () => {
    const vendoredInfusionUtilityCount = Object.values(ref.kineticWildTalents).filter(
      (t) => t.kind === "infusion" || t.kind === "utility",
    ).length;
    expect(merged).toHaveLength(vendoredInfusionUtilityCount);
  });

  it("a matched entry keeps the hand-authored def's own mechanics but picks up vendored prose", () => {
    const entry = byId.get("universal:extendedRange")!;
    expect(entry).toBeDefined();
    expect(entry.level).toBe(KINETICIST_WILD_TALENTS["universal:extendedRange"]!.level);
    expect(entry.burn).toBe(KINETICIST_WILD_TALENTS["universal:extendedRange"]!.burn);
    expect(entry.description).toBeDefined();
  });

  it("the 3 alias-mapped 'Greater' entries matched despite the hand table's 'X, Greater' vs. the source's 'Greater X' naming", () => {
    expect(byId.get("universal:skilledKineticistGreater")?.description).toBeDefined();
    expect(byId.get("universal:elementalWhispersGreater")?.description).toBeDefined();
    expect(byId.get("aether:selfTelekinesisGreater")?.description).toBeDefined();
  });

  it("a vendored-only entry (Absentia, no hand-authored counterpart) resolves display-only with its own vendored-key id + real level/burn gate", () => {
    const entry = byId.get("absentia")!;
    expect(entry.level).toBe(4);
    expect(entry.burn).toBe(0);
    expect(entry.category).toBe("utility");
    expect(entry.elements).toEqual(["void"]);
    expect(KINETICIST_WILD_TALENTS.absentia).toBeUndefined();
  });

  it("a vendored-only MULTI-element entry (Cloud, no hand-authored counterpart) keeps every element, not just the first", () => {
    const entry = byId.get("cloud")!;
    expect(entry.elements).toEqual(["air", "water"]);
    expect(KINETICIST_WILD_TALENTS.cloud).toBeUndefined();
  });

  it("simple/composite blasts and defense talents are excluded from this merge (see file doc comment)", () => {
    expect(byId.has("air_blast")).toBe(false);
    expect(byId.has("aetheric_boost")).toBe(false);
    expect(byId.has("enveloping_winds")).toBe(false);
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveKineticistWildTalent", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const talent = resolveKineticistWildTalent("universal:extendedRange", ref);
    expect(talent?.level).toBe(KINETICIST_WILD_TALENTS["universal:extendedRange"]!.level);
    expect(talent?.summary).toBe(KINETICIST_WILD_TALENTS["universal:extendedRange"]!.summary);
  });

  it("falls back to the vendored catalog (infusion/utility only) for a vendored-only id", () => {
    const talent = resolveKineticistWildTalent("absentia", ref);
    expect(talent?.name).toBe("Absentia");
    expect(talent?.category).toBe("utility");
  });

  it("returns undefined for a vendored simple/composite blast or defense talent id (not infusion/utility)", () => {
    expect(resolveKineticistWildTalent("air_blast", ref)).toBeUndefined();
    expect(resolveKineticistWildTalent("aetheric_boost", ref)).toBeUndefined();
    expect(resolveKineticistWildTalent("enveloping_winds", ref)).toBeUndefined();
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveKineticistWildTalent("bogus:notReal", ref)).toBeUndefined();
  });
});

describe("mergedCompositeBlastCatalog / eligibleCompositeBlasts", () => {
  it("has exactly one row per vendored composite-blast entry — all 13 hand-authored entries matched", () => {
    const catalog = mergedCompositeBlastCatalog(ref);
    const vendoredCount = Object.values(ref.kineticWildTalents).filter(
      (t) => t.kind === "compositeBlast",
    ).length;
    expect(catalog).toHaveLength(vendoredCount);
    const byId = new Map(catalog.map((cb) => [cb.id, cb]));
    expect(byId.get("aethericBoost")?.description).toBeDefined();
  });

  it("every vendored-only composite blast requires a later-splatbook element (void/wood) — the full 5-core-element set is already covered by the 13 hand-authored entries (confirmed by the collision audit)", () => {
    const catalog = mergedCompositeBlastCatalog(ref);
    const handIds = new Set(KINETICIST_COMPOSITE_BLASTS.map((cb) => cb.id));
    const CORE = new Set(["aether", "air", "earth", "fire", "water"]);
    const vendoredOnly = catalog.filter((cb) => !handIds.has(cb.id));
    expect(vendoredOnly.length).toBeGreaterThan(0);
    for (const cb of vendoredOnly) {
      expect(cb.requiredElements.some((el) => !CORE.has(el))).toBe(true);
    }
  });

  it("eligibleCompositeBlasts still returns the hand-authored core-element entries via the merged catalog, same as via the default hand-only list", () => {
    const catalog = mergedCompositeBlastCatalog(ref);
    const viaMerged = eligibleCompositeBlasts("air", ["earth"], catalog).map((cb) => cb.name);
    const viaDefault = eligibleCompositeBlasts("air", ["earth"]).map((cb) => cb.name);
    expect(viaMerged).toEqual(expect.arrayContaining(viaDefault));
    expect(viaMerged).toContain("Sandstorm Blast");
  });
});
