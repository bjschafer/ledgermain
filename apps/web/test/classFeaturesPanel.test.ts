import { describe, expect, it } from "bun:test";

import type { DerivedClassFeature } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { filterClassFeatures, groupClassFeatures } from "../src/model/classFeaturesPanel.js";

const ref = loadRefData();

function feature(overrides: Partial<DerivedClassFeature>): DerivedClassFeature {
  return {
    level: 1,
    classTag: "witch",
    featureId: "stub",
    name: "Stub Feature",
    applied: true,
    ...overrides,
  };
}

describe("model/classFeaturesPanel — groupClassFeatures", () => {
  it("groups a hex under its own origin label rather than the level it was picked at", () => {
    const features = [
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

    const groups = groupClassFeatures(features, ref);
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Hex");
    expect(labels).toContain("Major Hex");

    const hexGroup = groups.find((g) => g.label === "Hex")!;
    expect(hexGroup.features.map((f) => f.name)).toEqual(["Cackle"]);

    const baseGroup = groups.find((g) => g.label !== "Hex" && g.label !== "Major Hex")!;
    expect(baseGroup.features.map((f) => f.name)).toEqual(["Witch's Familiar"]);
  });

  it("groups base class features under the granting class's display name, keyed separately per class", () => {
    const features = [
      feature({ classTag: "witch", name: "Witch's Familiar" }),
      feature({ classTag: "fighter", name: "Bravery", level: 2 }),
    ];

    const groups = groupClassFeatures(features, ref);
    const witchClass = Object.values(ref.classes).find((c) => c.tag === "witch")!;
    const fighterClass = Object.values(ref.classes).find((c) => c.tag === "fighter")!;

    expect(groups.some((g) => g.label === witchClass.name)).toBe(true);
    expect(groups.some((g) => g.label === fighterClass.name)).toBe(true);
  });

  it("sorts groups by their lowest-level feature, and features within a group by level then name", () => {
    const features = [
      feature({ level: 12, name: "Slumber", origin: { kind: "hex", label: "Hex" } }),
      feature({ level: 1, name: "Cackle", origin: { kind: "hex", label: "Hex" } }),
      feature({ level: 6, name: "Ward", origin: { kind: "hex", label: "Hex" } }),
    ];

    const groups = groupClassFeatures(features, ref);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.features.map((f) => f.name)).toEqual(["Cackle", "Ward", "Slumber"]);
  });

  it("falls back to the raw class tag when the class isn't found in RefData", () => {
    const features = [feature({ classTag: "not-a-real-class", name: "Mystery Feature" })];
    const groups = groupClassFeatures(features, ref);
    expect(groups[0]!.label).toBe("not-a-real-class");
  });
});

describe("model/classFeaturesPanel — filterClassFeatures", () => {
  const features = [
    feature({ name: "Cackle", origin: { kind: "hex", label: "Hex" } }),
    feature({ name: "Slumber", origin: { kind: "hex", label: "Major Hex" }, detail: "Fort save" }),
    feature({ name: "Rage", origin: undefined }),
  ];

  it("returns every feature for an empty query", () => {
    expect(filterClassFeatures(features, "")).toHaveLength(3);
    expect(filterClassFeatures(features, "   ")).toHaveLength(3);
  });

  it("matches on feature name, case-insensitively", () => {
    const result = filterClassFeatures(features, "cackle");
    expect(result.map((f) => f.name)).toEqual(["Cackle"]);
  });

  it("matches on origin label", () => {
    const result = filterClassFeatures(features, "major hex");
    expect(result.map((f) => f.name)).toEqual(["Slumber"]);
  });

  it("matches on detail text", () => {
    const result = filterClassFeatures(features, "fort save");
    expect(result.map((f) => f.name)).toEqual(["Slumber"]);
  });

  it("returns nothing for a query with no matches", () => {
    expect(filterClassFeatures(features, "nonexistent")).toHaveLength(0);
  });
});
