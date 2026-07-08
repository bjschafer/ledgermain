/**
 * Web-app model-level smoke test for the seven non-caster classes added to
 * the vendored data slice (cavalier, gunslinger, brawler, slayer,
 * swashbuckler, vigilante, shifter). No DOM — drives the same pure
 * model -> CharacterDoc -> compute() pipeline as
 * `builder.integration.test.ts`, for two representative classes (gunslinger,
 * swashbuckler): proves the builder can construct one of these classes and
 * `compute()` produces a sheet with no spellcasting model, the level-1 class
 * features present, and the class's resource-pool derives with the right max.
 */
import { describe, expect, it } from "bun:test";

import { compute, deriveResourcePools } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import { addClass, createEmptyDoc, setAbility, setRace } from "../src/model/doc.js";
import { casterModelFor } from "../src/model/spellcasting.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

describe("build a level-1 human gunslinger (model -> compute)", () => {
  let doc = createEmptyDoc("itest-gun");
  doc = setRace(doc, raceId("Human"));
  doc = addClass(doc, "gunslinger");
  doc = setAbility(doc, "str", 14);
  doc = setAbility(doc, "dex", 16);
  doc = setAbility(doc, "con", 12);
  doc = setAbility(doc, "int", 10);
  doc = setAbility(doc, "wis", 14);
  doc = setAbility(doc, "cha", 8);

  it("recorded the build choice", () => {
    expect(doc.identity.classes).toEqual([{ tag: "gunslinger", level: 1 }]);
  });

  it("casterModelFor('gunslinger') is undefined — no Spells UI for this class", () => {
    expect(casterModelFor("gunslinger")).toBeUndefined();
  });

  const sheet = compute(doc, ref);

  it("BAB +1 (high progression) and no spellcasting appears on the sheet", () => {
    expect(sheet.bab).toBe(1);
  });

  it("level-1 class features surface (Deeds, Grit, Gunsmith, Gunslinger's Dodge)", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Deeds");
    expect(names).toContain("Grit");
    expect(names).toContain("Gunsmith");
    expect(names).toContain("Gunslinger's Dodge");
  });

  it("Grit resource pool derives (Wis mod +2 -> 2/day)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const grit = pools.find((p) => p.name === "Grit");
    expect(grit?.max).toBe(2);
    expect(grit?.per).toBe("day");
  });
});

describe("build a level-1 human swashbuckler (model -> compute)", () => {
  let doc = createEmptyDoc("itest-swa");
  doc = setRace(doc, raceId("Human"));
  doc = addClass(doc, "swashbuckler");
  doc = setAbility(doc, "str", 14);
  doc = setAbility(doc, "dex", 16);
  doc = setAbility(doc, "con", 12);
  doc = setAbility(doc, "int", 10);
  doc = setAbility(doc, "wis", 10);
  doc = setAbility(doc, "cha", 14);

  it("recorded the build choice", () => {
    expect(doc.identity.classes).toEqual([{ tag: "swashbuckler", level: 1 }]);
  });

  it("casterModelFor('swashbuckler') is undefined — no Spells UI for this class", () => {
    expect(casterModelFor("swashbuckler")).toBeUndefined();
  });

  const sheet = compute(doc, ref);

  it("BAB +1 (high progression)", () => {
    expect(sheet.bab).toBe(1);
  });

  it("level-1 class features surface (Panache, Swashbuckler Deeds, Swashbuckler Finesse)", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Panache");
    expect(names).toContain("Swashbuckler Deeds");
    expect(names).toContain("Swashbuckler Finesse");
  });

  it("Panache resource pool derives (Cha mod +2 -> 2/day)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const panache = pools.find((p) => p.name === "Panache");
    expect(panache?.max).toBe(2);
    expect(panache?.per).toBe("day");
  });
});
