import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { archetypeConflictWarnings, checkArchetypeConflict } from "../src/model/archetypes.js";
import {
  addClass,
  createEmptyDoc,
  migrateDoc,
  setArchetypes,
  setClassLevel,
} from "../src/model/doc.js";

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

describe("checkArchetypeConflict()", () => {
  it("blocks a second archetype that swaps the same base-feature slot", () => {
    const armoredHulk = byName(ref.archetypes, "Armored Hulk");
    const brutalPugilist = byName(ref.archetypes, "Brutal Pugilist");
    const result = checkArchetypeConflict(ref, [armoredHulk.id], brutalPugilist.id);
    expect(result.blocked).toBe(true);
    expect(result.conflictsWith).toBe("Armored Hulk");
  });

  it("allows two archetypes that don't overlap any swapped slot (different classes)", () => {
    const armoredHulk = byName(ref.archetypes, "Armored Hulk"); // barbarian
    const twoHanded = byName(ref.archetypes, "Two-Handed Fighter"); // fighter
    const result = checkArchetypeConflict(ref, [armoredHulk.id], twoHanded.id);
    expect(result.blocked).toBe(false);
  });

  it("never blocks re-selecting the same archetype", () => {
    const thf = byName(ref.archetypes, "Two-Handed Fighter");
    expect(checkArchetypeConflict(ref, [thf.id], thf.id).blocked).toBe(false);
  });
});

describe("archetypeConflictWarnings() — cleric/wizard soft-warning fallback (issue #5)", () => {
  it("confirms the data gap this warning exists to cover: cleric/wizard archetype features carry no pairedBaseFeatureUuid at all", () => {
    const clericFeatures = Object.values(ref.archetypeFeatures).filter(
      (f) => f.classTag === "cleric",
    );
    const wizardFeatures = Object.values(ref.archetypeFeatures).filter(
      (f) => f.classTag === "wizard",
    );
    expect(clericFeatures.length).toBeGreaterThan(0);
    expect(wizardFeatures.length).toBeGreaterThan(0);
    expect(clericFeatures.every((f) => f.pairedBaseFeatureUuid == null)).toBe(true);
    expect(wizardFeatures.every((f) => f.pairedBaseFeatureUuid == null)).toBe(true);
    // ...and checkArchetypeConflict is consequently blind to any real overlap.
    const cloistered = byName(ref.archetypes, "Cloistered Cleric");
    const crusader = byName(ref.archetypes, "Crusader");
    expect(checkArchetypeConflict(ref, [cloistered.id], crusader.id).blocked).toBe(false);
  });

  it("warns when 2 cleric archetypes are chosen together", () => {
    const cloistered = byName(ref.archetypes, "Cloistered Cleric");
    const crusader = byName(ref.archetypes, "Crusader");
    let doc = addClass(createEmptyDoc("t"), "cleric");
    doc = setClassLevel(doc, "cleric", 5);
    doc = setArchetypes(doc, [cloistered.id, crusader.id]);

    const warnings = archetypeConflictWarnings(doc, ref);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Cloistered Cleric");
    expect(warnings[0]).toContain("Crusader");
  });

  it("warns when 2 wizard archetypes are chosen together", () => {
    const spellslinger = byName(ref.archetypes, "Spellslinger");
    const runesage = byName(ref.archetypes, "Runesage");
    let doc = addClass(createEmptyDoc("t"), "wizard");
    doc = setClassLevel(doc, "wizard", 5);
    doc = setArchetypes(doc, [spellslinger.id, runesage.id]);

    const warnings = archetypeConflictWarnings(doc, ref);
    expect(warnings).toHaveLength(1);
  });

  it("no warning with only 1 archetype chosen", () => {
    const cloistered = byName(ref.archetypes, "Cloistered Cleric");
    let doc = addClass(createEmptyDoc("t"), "cleric");
    doc = setClassLevel(doc, "cleric", 5);
    doc = setArchetypes(doc, [cloistered.id]);

    expect(archetypeConflictWarnings(doc, ref)).toEqual([]);
  });

  it("no warning for classes with real pairing data (fighter) — the hard block already covers those", () => {
    const armoredHulk = byName(ref.archetypes, "Armored Hulk"); // barbarian, has pairing data
    const twoHanded = byName(ref.archetypes, "Two-Handed Fighter"); // fighter, has pairing data
    let doc = addClass(createEmptyDoc("t"), "fighter");
    doc = addClass(doc, "barbarian");
    doc = setClassLevel(doc, "fighter", 5);
    doc = setClassLevel(doc, "barbarian", 5);
    doc = setArchetypes(doc, [armoredHulk.id, twoHanded.id]);

    expect(archetypeConflictWarnings(doc, ref)).toEqual([]);
  });

  it("no warning across different classes even both structurally unpaired-eligible (cleric + wizard, only 1 each)", () => {
    const cloistered = byName(ref.archetypes, "Cloistered Cleric");
    const spellslinger = byName(ref.archetypes, "Spellslinger");
    let doc = addClass(createEmptyDoc("t"), "cleric");
    doc = addClass(doc, "wizard");
    doc = setClassLevel(doc, "cleric", 5);
    doc = setClassLevel(doc, "wizard", 5);
    doc = setArchetypes(doc, [cloistered.id, spellslinger.id]);

    expect(archetypeConflictWarnings(doc, ref)).toEqual([]);
  });
});
