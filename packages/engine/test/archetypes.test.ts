import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { archetypeSwappedUuids, resolveClassFeatures } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: over.classes,
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function byName<T extends { name: string }>(map: Record<string, T>, name: string): T {
  const entry = Object.values(map).find((e) => e.name === name);
  if (!entry) throw new Error(`not found: ${name}`);
  return entry;
}

describe("resolveClassFeatures: no archetype chosen", () => {
  const doc = makeDoc({ classes: [{ tag: "fighter", level: 7 }] });
  const { classFeatures, activeArchetypes } = resolveClassFeatures(doc, ref);

  it("every base feature is applied (no strike-through)", () => {
    expect(classFeatures.length).toBeGreaterThan(0);
    expect(classFeatures.every((f) => f.applied)).toBe(true);
    expect(classFeatures.every((f) => f.replacedBy === undefined)).toBe(true);
  });

  it("no active archetypes", () => {
    expect(activeArchetypes).toEqual([]);
  });
});

describe("resolveClassFeatures: Two-Handed Fighter swaps Bravery for Shattering Strike", () => {
  const thf = byName(ref.archetypes, "Two-Handed Fighter");
  const doc = makeDoc({
    classes: [{ tag: "fighter", level: 7 }],
    archetypes: [thf.id],
  });
  const { classFeatures, activeArchetypes } = resolveClassFeatures(doc, ref);

  it("Bravery (the swapped base feature) is struck through", () => {
    const bravery = classFeatures.find((f) => f.name === "Bravery")!;
    expect(bravery).toBeDefined();
    expect(bravery.applied).toBe(false);
    expect(bravery.replacedBy).toBe("Shattering Strike");
  });

  it("other base features are untouched", () => {
    const armorTraining1 = classFeatures.find(
      (f) => f.name === "Armor Training" && f.level === 3,
    )!;
    expect(armorTraining1.applied).toBe(false); // swapped by Overhand Chop at L3
    expect(armorTraining1.replacedBy).toBe("Overhand Chop");
  });

  it("activeArchetypes carries the resolved swap map", () => {
    expect(activeArchetypes).toHaveLength(1);
    const swappedBraveryUuid = activeArchetypes[0]!.swappedSlots[2];
    const fighterDef = Object.values(ref.classes).find((c) => c.tag === "fighter")!;
    const braveryGrant = fighterDef.features.find((f) => f.name === "Bravery")!;
    expect(swappedBraveryUuid).toBe(braveryGrant.uuid);
  });

  it("archetype's own features are listed, unambiguous ones flagged not-ambiguous", () => {
    const shatteringStrike = activeArchetypes[0]!.features.find(
      (f) => f.name === "Shattering Strike",
    )!;
    expect(shatteringStrike.ambiguous).toBe(false);
  });
});

describe("resolveClassFeatures: level gating", () => {
  it("archetype features above current class level are excluded", () => {
    const thf = byName(ref.archetypes, "Two-Handed Fighter");
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      archetypes: [thf.id],
    });
    const { classFeatures, activeArchetypes } = resolveClassFeatures(doc, ref);

    // Shattering Strike (L2) hasn't been granted yet at fighter level 1.
    expect(activeArchetypes[0]!.features.some((f) => f.name === "Shattering Strike")).toBe(false);
    // Bravery is granted at L2 too, so at L1 it isn't in classFeatures at all.
    expect(classFeatures.some((f) => f.name === "Bravery")).toBe(false);
  });
});

describe("resolveClassFeatures: ambiguous archetype features never strike through", () => {
  it("cleric archetype features (never pair) surface as ambiguous, not as swaps", () => {
    const clericArchetype = Object.values(ref.archetypes).find((a) => a.classTag === "cleric");
    if (!clericArchetype) return; // dataset shape guard; skip if no cleric archetypes vendored
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 20 }],
      archetypes: [clericArchetype.id],
    });
    const { classFeatures, activeArchetypes } = resolveClassFeatures(doc, ref);

    const archEntry = activeArchetypes.find((a) => a.id === clericArchetype.id)!;
    expect(archEntry.features.length).toBeGreaterThan(0);
    expect(archEntry.features.every((f) => f.ambiguous)).toBe(true);
    expect(Object.keys(archEntry.swappedSlots)).toHaveLength(0);
    expect(classFeatures.every((f) => f.applied)).toBe(true);
  });
});

describe("resolveClassFeatures: Acrobat (rogue archetype) swaps Trap Sense for Second Chance", () => {
  // Closes out issue #13's "check archetype slice picks up the new class"
  // item — Rogue UC.csv archetypes are vendored alongside the base class.
  const acrobat = byName(ref.archetypes, "Acrobat");
  const doc = makeDoc({
    classes: [{ tag: "rogue", level: 5 }],
    archetypes: [acrobat.id],
  });
  const { classFeatures, activeArchetypes } = resolveClassFeatures(doc, ref);

  it("activeArchetypes carries one resolved rogue archetype", () => {
    expect(activeArchetypes).toHaveLength(1);
    expect(activeArchetypes[0]!.classTag).toBe("rogue");
    expect(activeArchetypes[0]!.name).toBe("Acrobat");
  });

  it("Trap Sense (the swapped base feature) is struck through", () => {
    const trapSense = classFeatures.find((f) => f.name === "Trap Sense")!;
    expect(trapSense).toBeDefined();
    expect(trapSense.applied).toBe(false);
    expect(trapSense.replacedBy).toBe("Second Chance");
  });

  it("archetype's own features are listed, including the unpaired L1 grant", () => {
    const expertAcrobat = activeArchetypes[0]!.features.find(
      (f) => f.name === "Expert Acrobat",
    )!;
    expect(expertAcrobat).toBeDefined();
    expect(expertAcrobat.ambiguous).toBe(true);
  });
});

describe("archetypeSwappedUuids", () => {
  it("two barbarian archetypes that both swap the same rage-power slot share a uuid", () => {
    const armoredHulk = byName(ref.archetypes, "Armored Hulk");
    const brutalPugilist = byName(ref.archetypes, "Brutal Pugilist");
    const a = archetypeSwappedUuids(ref, armoredHulk.id);
    const b = archetypeSwappedUuids(ref, brutalPugilist.id);
    const overlap = [...a].filter((u) => b.has(u));
    expect(overlap.length).toBeGreaterThan(0);
  });

  it("Two-Handed Fighter's swapped uuids include Bravery's grant", () => {
    const thf = byName(ref.archetypes, "Two-Handed Fighter");
    const fighterDef = Object.values(ref.classes).find((c) => c.tag === "fighter")!;
    const braveryGrant = fighterDef.features.find((f) => f.name === "Bravery")!;
    expect(archetypeSwappedUuids(ref, thf.id).has(braveryGrant.uuid)).toBe(true);
  });

  it("unknown archetype id yields an empty set", () => {
    expect(archetypeSwappedUuids(ref, "not-a-real-id").size).toBe(0);
  });
});
