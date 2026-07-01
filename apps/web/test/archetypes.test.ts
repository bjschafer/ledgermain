import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, migrateDoc, setArchetypes, setClassLevel } from "../src/model/doc.js";

const ref = loadRefData();

function byName<T extends { name: string; id: string }>(map: Record<string, T>, name: string): T {
  const entry = Object.values(map).find((e) => e.name === name);
  if (!entry) throw new Error(`not found: ${name}`);
  return entry;
}

function fresh(): CharacterDoc {
  return createEmptyDoc("t");
}

describe("setArchetypes()", () => {
  it("replaces the whole list", () => {
    let doc = setArchetypes(fresh(), ["fighter:two-handed-fighter"]);
    expect(doc.build.archetypes).toEqual(["fighter:two-handed-fighter"]);
    doc = setArchetypes(doc, ["fighter:shielded-fighter"]);
    expect(doc.build.archetypes).toEqual(["fighter:shielded-fighter"]);
  });

  it("drops empty strings, no cap on count", () => {
    const doc = setArchetypes(fresh(), ["a", "", "b", "c"]);
    expect(doc.build.archetypes).toEqual(["a", "b", "c"]);
  });

  it("[] clears the selection", () => {
    const doc = setArchetypes(setArchetypes(fresh(), ["a"]), []);
    expect(doc.build.archetypes).toEqual([]);
  });
});

describe("migrateDoc() backfills build.archetypes", () => {
  it("adds an empty archetypes array to a pre-Stage-11.3 doc", () => {
    const legacy = { ...fresh(), build: { ...fresh().build } } as CharacterDoc;
    delete (legacy.build as { archetypes?: string[] }).archetypes;
    const migrated = migrateDoc(legacy);
    expect(migrated.build.archetypes).toEqual([]);
  });

  it("is a no-op for an already-current doc", () => {
    const doc = fresh();
    expect(migrateDoc(doc)).toBe(doc);
  });
});

describe("archetype selection -> compute() (model -> engine integration)", () => {
  it("Two-Handed Fighter strikes through Bravery on the computed sheet", () => {
    const thf = byName(ref.archetypes, "Two-Handed Fighter");
    let doc = addClass(fresh(), "fighter");
    doc = setClassLevel(doc, "fighter", 7);
    doc = setArchetypes(doc, [thf.id]);

    const sheet = compute(doc, ref);
    const bravery = sheet.classFeatures.find((f) => f.name === "Bravery")!;
    expect(bravery.applied).toBe(false);
    expect(bravery.replacedBy).toBe("Shattering Strike");
    expect(sheet.activeArchetypes).toHaveLength(1);
    expect(sheet.activeArchetypes[0]!.name).toBe("Two-Handed Fighter");
  });

  it("no archetype chosen -> classFeatures all applied, activeArchetypes empty", () => {
    let doc = addClass(fresh(), "fighter");
    doc = setClassLevel(doc, "fighter", 7);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.length).toBeGreaterThan(0);
    expect(sheet.classFeatures.every((f) => f.applied)).toBe(true);
    expect(sheet.activeArchetypes).toEqual([]);
  });
});
