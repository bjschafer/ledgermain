import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { abilityTypeSuffix, abilityTypeTag } from "../src/model/abilityTypes.js";

const ref = loadRefData();

describe("abilityTypeTag", () => {
  it("maps the three PF1 ability types to their statblock abbreviations", () => {
    expect(abilityTypeTag("ex")?.label).toBe("Ex");
    expect(abilityTypeTag("su")?.label).toBe("Su");
    expect(abilityTypeTag("sp")?.label).toBe("Sp");
  });

  it("tolerates casing, since the tag is display data and not a key", () => {
    expect(abilityTypeTag("Su")?.code).toBe("su");
    expect(abilityTypeTag("SP")?.code).toBe("sp");
  });

  it("returns null for an untagged or unrecognized feature rather than guessing", () => {
    expect(abilityTypeTag(undefined)).toBeNull();
    expect(abilityTypeTag(null)).toBeNull();
    expect(abilityTypeTag("")).toBeNull();
    expect(abilityTypeTag("nat")).toBeNull();
  });

  it("names the play consequence that makes each tag worth showing", () => {
    expect(abilityTypeTag("ex")!.tip).toContain("antimagic field");
    expect(abilityTypeTag("su")!.tip).toContain("antimagic field");
    expect(abilityTypeTag("su")!.tip).toContain("Spell resistance");
    expect(abilityTypeTag("sp")!.tip).toContain("attacks of opportunity");
  });
});

describe("abilityTypeSuffix", () => {
  it("parenthesizes a known tag and drops an absent one", () => {
    expect(abilityTypeSuffix("su")).toBe("(Su)");
    expect(abilityTypeSuffix(undefined)).toBeNull();
  });
});

describe("vendored class-feature ability types", () => {
  it("carries no value outside the three the UI knows how to render", () => {
    const unknown = new Set<string>();
    for (const f of Object.values(ref.classFeatures)) {
      if (f.abilityType && !abilityTypeTag(f.abilityType)) unknown.add(f.abilityType);
    }
    expect([...unknown]).toEqual([]);
  });

  it("still leaves a real share of entries untagged, which must render as nothing", () => {
    const all = Object.values(ref.classFeatures);
    const untagged = all.filter((f) => !f.abilityType);
    expect(untagged.length).toBeGreaterThan(0);
    expect(untagged.every((f) => abilityTypeSuffix(f.abilityType) === null)).toBe(true);
  });

  it("tags the features whose type players actually check at the table", () => {
    const byName = (name: string) =>
      Object.values(ref.classFeatures).filter((f) => f.name === name);
    // Rage is (Ex): it keeps working in an antimagic field. Ki Pool and Lay on
    // Hands are (Su): they do not. Core Rulebook class entries.
    expect(byName("Rage").some((f) => f.abilityType === "ex")).toBe(true);
    expect(byName("Ki Pool").every((f) => f.abilityType === "su")).toBe(true);
    expect(byName("Lay on Hands").every((f) => f.abilityType === "su")).toBe(true);
  });
});
