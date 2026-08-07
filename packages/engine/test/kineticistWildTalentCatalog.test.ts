import { describe, expect, it } from "bun:test";

import type { RefData } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  eligibleCompositeBlasts,
  KINETICIST_COMPOSITE_BLASTS,
  KINETICIST_WILD_TALENTS,
  mergedCompositeBlastCatalog,
  mergedKineticistWildTalentCatalog,
  resolveKineticistWildTalent,
  wildTalentPrereqText,
  wildTalentRequirementFragments,
} from "../src/index.js";

/**
 * Coverage for the kineticist-wild-talent + composite-blast vendored-catalog
 * overlays — mirrors `ragePowerCatalog.test.ts`'s pattern. See
 * `kineticist-wild-talents.ts`'s "vendored catalog overlay" doc comment for
 * the collision-audit narrative this asserts against.
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

  it("a vendored-only entry (Basic Telekinesis, no hand-authored counterpart — it's auto-granted as aether's basicUtility instead) resolves display-only with its own vendored-key id + real level/burn gate", () => {
    const entry = byId.get("basic_telekinesis")!;
    expect(entry.level).toBe(1);
    expect(entry.burn).toBe(0);
    expect(entry.category).toBe("utility");
    expect(entry.elements).toEqual(["aether"]);
    expect(KINETICIST_WILD_TALENTS.basic_telekinesis).toBeUndefined();
  });

  it("every element's auto-granted 'Basic <Element>kinesis' talent is the only intentional vendored-only gap (all 7, one per element)", () => {
    const orphans = merged.filter((e) => !(e.id in KINETICIST_WILD_TALENTS));
    expect(orphans).toHaveLength(7);
    expect(new Set(orphans.map((o) => o.elements[0]))).toEqual(
      new Set(["aether", "air", "earth", "fire", "water", "void", "wood"]),
    );
    for (const o of orphans) expect(o.name).toMatch(/^Basic \w+kinesis$/);
  });

  it("a vendored-only MULTI-element entry keeps every element, not just the first (synthetic fixture — the real catalog has no naturally-occurring orphan with 2+ elements after full parity)", () => {
    const synthetic: RefData = {
      ...ref,
      kineticWildTalents: {
        ...ref.kineticWildTalents,
        synthetic_multi_element: {
          id: "synthetic_multi_element",
          uuid: "test:synthetic_multi_element",
          name: "Synthetic Multi-Element Fixture",
          kind: "utility",
          elements: ["air", "water"],
          level: 3,
          burn: 0,
          description: "<p>Test fixture only — not a real published talent.</p>",
        },
      },
    };
    const syntheticMerged = mergedKineticistWildTalentCatalog(synthetic);
    const entry = syntheticMerged.find((e) => e.id === "synthetic_multi_element")!;
    expect(entry).toBeDefined();
    expect(entry.elements).toEqual(["air", "water"]);
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

  it("falls back to the vendored catalog (infusion/utility only) for a vendored-only id (Basic Telekinesis — auto-granted, not hand-authored as a separate pick)", () => {
    const talent = resolveKineticistWildTalent("basic_telekinesis", ref);
    expect(talent?.name).toBe("Basic Telekinesis");
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

describe("wildTalentPrereqText", () => {
  const merged = mergedKineticistWildTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("undefined for a talent whose description states no prerequisite", () => {
    const extendedRange = byId.get("universal:extendedRange")!;
    expect(wildTalentPrereqText(extendedRange.description)).toBeUndefined();
  });

  it("extracts the Prerequisite clause, HTML-stripped, for a gated talent", () => {
    const maelstrom = byId.get("water:maelstrom")!;
    expect(wildTalentPrereqText(maelstrom.description)).toBe("extended range");
  });

  it("stops at the next stat label rather than swallowing it (Associated Blasts/Saving Throw)", () => {
    const maelstrom = byId.get("water:maelstrom")!;
    expect(wildTalentPrereqText(maelstrom.description)).not.toMatch(
      /Associated Blasts|Saving Throw/,
    );
  });

  it("undefined for undefined/empty input", () => {
    expect(wildTalentPrereqText(undefined)).toBeUndefined();
    expect(wildTalentPrereqText("")).toBeUndefined();
  });
});

describe("wildTalentRequirementFragments", () => {
  const merged = mergedKineticistWildTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("matches a fragment naming another wild talent by exact (case-insensitive) name", () => {
    const fragments = wildTalentRequirementFragments("extended range", merged);
    expect(fragments).toEqual([{ text: "extended range", talentId: "universal:extendedRange" }]);
  });

  it("matches a fragment naming a wild talent with a trailing 'wild talent' suffix", () => {
    const fragments = wildTalentRequirementFragments("kinetic healer wild talent", merged);
    expect(fragments[0]!.talentId).toBeDefined();
  });

  it("leaves an unresolvable fragment (a race, an archetype, an element clause) as prose only", () => {
    const fragments = wildTalentRequirementFragments(
      "kinetic fist, member of the Monastery of Unfolding Wind",
      merged,
    );
    expect(fragments[0]).toEqual({ text: "kinetic fist", talentId: "universal:kineticFist" });
    expect(fragments[1]!.talentId).toBeUndefined();
    expect(fragments[1]!.text).toBe("member of the Monastery of Unfolding Wind");
  });

  it("real fixture: Unfolding Wind Infusion's prereq resolves Kinetic Fist as a matched requirement", () => {
    const talent = byId.get("air:unfoldingWindInfusion")!;
    const prereqText = wildTalentPrereqText(talent.description)!;
    const fragments = wildTalentRequirementFragments(prereqText, merged);
    expect(fragments.some((f) => f.talentId === "universal:kineticFist")).toBe(true);
  });
});

describe("mergedCompositeBlastCatalog / eligibleCompositeBlasts", () => {
  it("has exactly one row per vendored composite-blast entry — all 22 hand-authored entries matched, full parity", () => {
    const catalog = mergedCompositeBlastCatalog(ref);
    const vendoredCount = Object.values(ref.kineticWildTalents).filter(
      (t) => t.kind === "compositeBlast",
    ).length;
    expect(vendoredCount).toBe(22);
    expect(KINETICIST_COMPOSITE_BLASTS).toHaveLength(22);
    expect(catalog).toHaveLength(vendoredCount);
    const byId = new Map(catalog.map((cb) => [cb.id, cb]));
    expect(byId.get("aethericBoost")?.description).toBeDefined();
    // Every entry in the merged catalog carries vendored prose — no
    // vendored-only orphan remains once void/wood are hand-authored too.
    for (const cb of catalog) expect(cb.description).toBeDefined();
  });

  it("the 9 void/wood-gated composite blasts (Autumn/Gravitic Boost/Negative Admixture/Positive Admixture/Spring/Summer/Verdant/Void/Winter Blast) all resolve via the merged catalog", () => {
    const catalog = mergedCompositeBlastCatalog(ref);
    const byId = new Map(catalog.map((cb) => [cb.id, cb]));
    for (const id of [
      "autumnBlast",
      "graviticBoost",
      "negativeAdmixture",
      "positiveAdmixture",
      "springBlast",
      "summerBlast",
      "verdantBlast",
      "voidBlast",
      "winterBlast",
    ]) {
      expect(byId.get(id)?.description).toBeDefined();
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
