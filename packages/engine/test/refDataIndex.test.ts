import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  archetypeFeaturesOf,
  classByTag,
  classFeatureByTag,
  domainByTag,
  refDataIndex,
  subdomainByTag,
} from "../src/refdata-index.js";

const ref = loadRefData();

describe("refDataIndex", () => {
  it("builds once per RefData object", () => {
    expect(refDataIndex(ref)).toBe(refDataIndex(ref));
  });

  it("survives a partial RefData (the shape tests and callers hand in)", () => {
    const partial = { classes: ref.classes } as unknown as typeof ref;
    expect(classByTag(partial, "cleric")?.name).toBe("Cleric");
    expect(classFeatureByTag(partial, "burn")).toBeUndefined();
    expect(archetypeFeaturesOf(partial, "anything")).toEqual([]);
  });

  it("resolves the same class a linear scan would", () => {
    for (const tag of ["cleric", "barbarian", "kineticist", "vigilante", "shifter"]) {
      const scanned = Object.values(ref.classes).find((c) => c.tag === tag);
      expect(classByTag(ref, tag)).toBe(scanned!);
    }
    expect(classByTag(ref, "not-a-class")).toBeUndefined();
  });

  it("resolves the same class feature a linear scan would", () => {
    const scanned = Object.values(ref.classFeatures).find((f) => f.tag === "burn");
    expect(classFeatureByTag(ref, "burn")).toBe(scanned!);
  });

  it("resolves the same domain and subdomain a linear scan would", () => {
    expect(domainByTag(ref, "Fire")).toBe(
      Object.values(ref.domains).find((d) => d.tag === "Fire")!,
    );
    expect(subdomainByTag(ref, "Ash")).toBe(
      Object.values(ref.subdomains).find((s) => s.tag === "Ash")!,
    );
  });

  it("groups every archetype feature under its parent, in collection order", () => {
    const grouped = refDataIndex(ref).archetypeFeaturesByArchetype;
    const total = [...grouped.values()].reduce((sum, g) => sum + g.length, 0);
    expect(total).toBe(Object.keys(ref.archetypeFeatures).length);

    // Order is load-bearing: several callers apply swaps last-wins over this
    // list, so a group must read exactly like the filtered scan it replaced.
    for (const archetypeId of [...grouped.keys()].slice(0, 25)) {
      const scanned = Object.values(ref.archetypeFeatures).filter(
        (f) => f.archetypeId === archetypeId,
      );
      expect(archetypeFeaturesOf(ref, archetypeId)).toEqual(scanned);
    }
  });

  it("returns an empty group for an unknown archetype", () => {
    expect(archetypeFeaturesOf(ref, "no-such-archetype")).toEqual([]);
  });
});
