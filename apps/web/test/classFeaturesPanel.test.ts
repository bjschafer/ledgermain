import { describe, expect, it } from "bun:test";

import type { DerivedArchetypeFeature, DerivedClassFeature } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import type { ClassFeaturePanelEntry } from "../src/model/classFeaturesPanel.js";
import { filterClassFeatures, groupClassFeatures } from "../src/model/classFeaturesPanel.js";

const ref = loadRefData();

function feature(overrides: Partial<DerivedClassFeature>): ClassFeaturePanelEntry {
  return {
    kind: "base",
    feature: {
      level: 1,
      classTag: "witch",
      featureId: "stub",
      name: "Stub Feature",
      applied: true,
      ...overrides,
    },
  };
}

function archetypeFeature(
  archetypeName: string,
  overrides: Partial<DerivedArchetypeFeature>,
): ClassFeaturePanelEntry {
  return {
    kind: "archetype",
    archetypeName,
    feature: {
      level: 1,
      featureId: "stub-archetype-feature",
      name: "Stub Archetype Feature",
      ambiguous: false,
      ...overrides,
    },
  };
}

describe("model/classFeaturesPanel — groupClassFeatures", () => {
  it("groups a hex under its own origin label rather than the level it was picked at", () => {
    const entries = [
      feature({ level: 1, name: "Witch's Familiar" }),
      feature({
        level: 1,
        name: "Cackle",
        origin: { kind: "hex", label: "Hex" },
        detail: "Extend a hex's duration by cackling as a move action.",
      }),
      feature({
        level: 12,
        name: "Slumber",
        origin: { kind: "hex", label: "Major Hex" },
        detail: "Put a target to sleep.",
      }),
    ];

    const groups = groupClassFeatures(entries, ref);
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Hex");
    expect(labels).toContain("Major Hex");

    const hexGroup = groups.find((g) => g.label === "Hex")!;
    expect(hexGroup.entries.map((e) => e.feature.name)).toEqual(["Cackle"]);

    const baseGroup = groups.find((g) => g.label !== "Hex" && g.label !== "Major Hex")!;
    expect(baseGroup.entries.map((e) => e.feature.name)).toEqual(["Witch's Familiar"]);
  });

  it("groups base class features under the granting class's display name, keyed separately per class", () => {
    const entries = [
      feature({ classTag: "witch", name: "Witch's Familiar" }),
      feature({ classTag: "fighter", name: "Bravery", level: 2 }),
    ];

    const groups = groupClassFeatures(entries, ref);
    const witchClass = Object.values(ref.classes).find((c) => c.tag === "witch")!;
    const fighterClass = Object.values(ref.classes).find((c) => c.tag === "fighter")!;

    expect(groups.some((g) => g.label === witchClass.name)).toBe(true);
    expect(groups.some((g) => g.label === fighterClass.name)).toBe(true);
  });

  it("groups an archetype's features under the archetype's name", () => {
    const entries = [
      feature({ classTag: "witch", name: "Witch's Familiar" }),
      archetypeFeature("Mountain Witch", { level: 2, name: "Earth Sense" }),
      archetypeFeature("Mountain Witch", { level: 0, name: "Patron" }),
    ];

    const groups = groupClassFeatures(entries, ref);
    const arch = groups.find((g) => g.label === "Mountain Witch")!;
    expect(arch.entries.map((e) => e.feature.name)).toEqual(["Patron", "Earth Sense"]);
  });

  it("sorts groups by their lowest-level entry, and entries within a group by level then name", () => {
    const entries = [
      feature({ level: 12, name: "Slumber", origin: { kind: "hex", label: "Hex" } }),
      feature({ level: 1, name: "Cackle", origin: { kind: "hex", label: "Hex" } }),
      feature({ level: 6, name: "Ward", origin: { kind: "hex", label: "Hex" } }),
    ];

    const groups = groupClassFeatures(entries, ref);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.entries.map((e) => e.feature.name)).toEqual(["Cackle", "Ward", "Slumber"]);
  });

  it("floats an archetype with a level-0 baseline alteration ahead of level-1 base features", () => {
    const entries = [
      feature({ level: 1, name: "Witch's Familiar" }),
      archetypeFeature("Mountain Witch", { level: 0, name: "Patron" }),
    ];

    const groups = groupClassFeatures(entries, ref);
    expect(groups[0]!.label).toBe("Mountain Witch");
  });

  it("falls back to the raw class tag when the class isn't found in RefData", () => {
    const entries = [feature({ classTag: "not-a-real-class", name: "Mystery Feature" })];
    const groups = groupClassFeatures(entries, ref);
    expect(groups[0]!.label).toBe("not-a-real-class");
  });
});

describe("model/classFeaturesPanel — filterClassFeatures", () => {
  const entries = [
    feature({ name: "Cackle", origin: { kind: "hex", label: "Hex" } }),
    feature({ name: "Slumber", origin: { kind: "hex", label: "Major Hex" }, detail: "Fort save" }),
    feature({ name: "Rage", origin: undefined }),
    archetypeFeature("Mountain Witch", {
      name: "Earth Sense",
      detail: "+2 Perception underground",
    }),
  ];

  it("returns every entry for an empty query", () => {
    expect(filterClassFeatures(entries, "")).toHaveLength(4);
    expect(filterClassFeatures(entries, "   ")).toHaveLength(4);
  });

  it("matches on feature name, case-insensitively", () => {
    const result = filterClassFeatures(entries, "cackle");
    expect(result.map((e) => e.feature.name)).toEqual(["Cackle"]);
  });

  it("matches on origin label", () => {
    const result = filterClassFeatures(entries, "major hex");
    expect(result.map((e) => e.feature.name)).toEqual(["Slumber"]);
  });

  it("matches an archetype feature on its archetype's name", () => {
    const result = filterClassFeatures(entries, "mountain witch");
    expect(result.map((e) => e.feature.name)).toEqual(["Earth Sense"]);
  });

  it("matches on detail text", () => {
    const result = filterClassFeatures(entries, "fort save");
    expect(result.map((e) => e.feature.name)).toEqual(["Slumber"]);
  });

  it("returns nothing for a query with no matches", () => {
    expect(filterClassFeatures(entries, "nonexistent")).toHaveLength(0);
  });
});
