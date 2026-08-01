/**
 * Hand-computed fixture tests for situational save totals on the tracked
 * creatures, which build their saves from their own progression tables rather
 * than through `compute.ts` (see `save-categories.ts`'s `resolveSave`).
 *
 * Two things are covered. Devotion (CRB: "+4 morale bonus on Will saves
 * against enchantment spells and effects"), unlocked by the animal companion
 * and eidolon at their 6th-level progression rows and by the phantom at 6th,
 * has to raise the Will line against enchantment without touching the number
 * the creature rolls by default. And a shared buff that is itself scoped to a
 * category has to stay out of the creature's headline saves exactly as it does
 * on the master's sheet.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, deriveCompanion, deriveEidolon, derivePhantom } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Master with all abilities 10, plus whichever creature build is under test. */
function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  build?: Partial<CharacterDoc["build"]>;
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  live?: Partial<CharacterDoc["live"]>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Master",
      race: raceId("Human"),
      classes: overrides.classes,
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...overrides.build,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: overrides.activeBuffs ?? [],
      resources: {},
      ...overrides.live,
    },
  } as CharacterDoc;
}

describe("companion Devotion (+4 morale on Will vs. enchantment)", () => {
  const doc = makeDoc({
    classes: [{ tag: "druid", level: 7 }],
    build: { animalCompanion: { speciesId: "wolf", name: "Fang", source: ["nature-bond"] } },
  });
  const wolf = deriveCompanion(doc, buildRollData(doc, ref))!;

  it("leaves the headline Will save alone", () => {
    // HD 6 poor Will (+2) + Wis 12 (mod +1) = +3, unchanged by Devotion.
    expect(wolf.saves.will).toBe(3);
  });

  it("adds an enchantment line at +4 over the headline", () => {
    expect(wolf.saveConditionals?.will).toEqual([
      { total: 7, categories: ["enchantment"], labels: ["enchantment"] },
    ]);
  });

  it("puts nothing on Fortitude or Reflex", () => {
    // Enchantment is a Will-only category.
    expect(wolf.saveConditionals?.fort).toBeUndefined();
    expect(wolf.saveConditionals?.ref).toBeUndefined();
  });

  it("a companion below the Devotion row has no situational totals at all", () => {
    // Ranger 7 is effective level 4; Devotion unlocks at 6th.
    const early = makeDoc({
      classes: [{ tag: "ranger", level: 7 }],
      build: { animalCompanion: { speciesId: "dog", name: "Rex", source: ["hunters-bond"] } },
    });
    const dog = deriveCompanion(early, buildRollData(early, ref))!;
    expect(dog.specialAbilities.map((a) => a.name)).not.toContain("Devotion");
    expect(dog.saveConditionals).toBeUndefined();
  });
});

describe("eidolon Devotion", () => {
  const doc = makeDoc({
    classes: [{ tag: "summoner", level: 7 }],
    build: { eidolon: { baseForm: "biped", name: "Grix", evolutions: [] } },
  });
  const eidolon = deriveEidolon(doc, buildRollData(doc, ref))!;

  it("leaves the headline Will save alone", () => {
    // Biped has good Will: HD 6 (+5) + Wis 10 (mod +0) = +5.
    expect(eidolon.saves.will).toBe(5);
  });

  it("adds an enchantment line at +4 over the headline", () => {
    expect(eidolon.saveConditionals?.will).toEqual([
      { total: 9, categories: ["enchantment"], labels: ["enchantment"] },
    ]);
  });

  it("an eidolon below the Devotion row has none", () => {
    const early = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      build: { eidolon: { baseForm: "biped", name: "Grix", evolutions: [] } },
    });
    expect(deriveEidolon(early, buildRollData(early, ref))!.saveConditionals).toBeUndefined();
  });
});

describe("phantom Devotion", () => {
  const doc = makeDoc({
    classes: [{ tag: "spiritualist", level: 7 }],
    build: { phantom: { focus: "anger", name: "Grief" } },
  });
  const phantom = derivePhantom(doc, buildRollData(doc, ref))!;

  it("leaves the headline Will save alone and adds the enchantment line", () => {
    expect(phantom.saves.will).toBe(5);
    expect(phantom.saveConditionals?.will).toEqual([
      { total: 9, categories: ["enchantment"], labels: ["enchantment"] },
    ]);
  });
});

describe("a category-scoped shared buff reaches the creature with its scope intact", () => {
  const buff = {
    instanceId: "resist-1",
    name: "Ward vs. Spells",
    changes: [
      { target: "allSavingThrows", type: "resistance", formula: "3", saveCategories: ["spell"] },
    ],
  };
  const doc = makeDoc({
    classes: [{ tag: "druid", level: 7 }],
    build: { animalCompanion: { speciesId: "wolf", name: "Fang", source: ["nature-bond"] } },
    activeBuffs: [buff as unknown as CharacterDoc["live"]["activeBuffs"][number]],
    live: { animalCompanion: { sharedBuffIds: ["resist-1"] } },
  });
  const wolf = deriveCompanion(doc, buildRollData(doc, ref))!;

  it("does not inflate the headline saves", () => {
    // Same Fort +7 / Ref +8 / Will +3 the unbuffed druid-7 wolf has.
    expect(wolf.saves.fort).toBe(7);
    expect(wolf.saves.ref).toBe(8);
    expect(wolf.saves.will).toBe(3);
  });

  it("shows as a spells line on every save, since a spell can call for any", () => {
    expect(wolf.saveConditionals?.fort).toEqual([
      { total: 10, categories: ["spell"], labels: ["spells"] },
    ]);
    expect(wolf.saveConditionals?.ref).toEqual([
      { total: 11, categories: ["spell"], labels: ["spells"] },
    ]);
  });

  it("merges with Devotion on Will: spells at +3, enchantment at +4", () => {
    expect(wolf.saveConditionals?.will).toEqual([
      { total: 7, categories: ["enchantment"], labels: ["enchantment"] },
      { total: 6, categories: ["spell"], labels: ["spells"] },
    ]);
  });
});
