import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  collectCompanionMasterEffects,
  companionEffectiveLevel,
  deriveCompanion,
} from "../src/index.js";

const ref = loadRefData();

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  animalCompanion?: CharacterDoc["build"]["animalCompanion"];
  abilities?: Partial<Record<AbilityId, number>>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Master",
      race: Object.entries(ref.races).find(([, r]) => r.name === "Human")![0],
      classes: overrides.classes,
    },
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      ...overrides.abilities,
    },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: overrides.archetypes,
      animalCompanion: overrides.animalCompanion,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Strong Bond (ranger horse-lord / jungle-lord): removes the -3 offset at 12th", () => {
  it("horse-lord: ranger level - 3 below 12th, ranger level at 12th", () => {
    // "The ranger's effective druid level for his mount is now equal to his
    // ranger level. This ability replaces camouflage."
    // (archetype-features.json, ranger:horse-lord:strong-bond:12)
    const at11 = makeDoc({
      classes: [{ tag: "ranger", level: 11 }],
      archetypes: ["ranger:horse-lord"],
      animalCompanion: { speciesId: "wolf", name: "Steed", source: ["hunters-bond"] },
    });
    expect(companionEffectiveLevel(at11, false, collectCompanionMasterEffects(at11, ref))).toBe(8);

    const at12 = makeDoc({
      classes: [{ tag: "ranger", level: 12 }],
      archetypes: ["ranger:horse-lord"],
      animalCompanion: { speciesId: "wolf", name: "Steed", source: ["hunters-bond"] },
    });
    expect(companionEffectiveLevel(at12, false, collectCompanionMasterEffects(at12, ref))).toBe(12);
  });

  it("jungle-lord: same +3 undoes hunter's bond's -3 at 12th, and requires the archetype", () => {
    // "the jungle lord's effective druid level for his animal companions is
    // now equal to his ranger level" (archetype-features.json,
    // ranger:jungle-lord:strong-bond:12)
    const at12 = makeDoc({
      classes: [{ tag: "ranger", level: 12 }],
      archetypes: ["ranger:jungle-lord"],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["hunters-bond"] },
    });
    expect(companionEffectiveLevel(at12, false, collectCompanionMasterEffects(at12, ref))).toBe(12);

    const noArchetype = makeDoc({
      classes: [{ tag: "ranger", level: 12 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["hunters-bond"] },
    });
    expect(
      companionEffectiveLevel(noArchetype, false, collectCompanionMasterEffects(noArchetype, ref)),
    ).toBe(9);
  });
});

describe("Feathered Companion (ranger falconer): 1st-level bird grant, ranger level 1:1", () => {
  it("grants a companion at 1st level with no -3 offset, plus an honest half-HP note", () => {
    // "This ability functions like the druid animal companion ability...
    // but the falconer must take the bird... animal companion, and that
    // companion has only half the normal hit points." (archetype-features.json,
    // ranger:falconer:feathered-companion:1) — unlike every other ranger
    // companion variant in this file, the text never restates the usual
    // "ranger level - 3" offset, and hunter's-bond:4 explicitly grants no
    // new companion or levels for a falconer ("he does not gain a new
    // companion at 4th level"), which only holds together if the falconer
    // already tracks full ranger level from 1st on.
    const doc = makeDoc({
      classes: [{ tag: "ranger", level: 1 }],
      archetypes: ["ranger:falconer"],
      animalCompanion: { speciesId: "bird", name: "Kestrel", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(1);
    expect(companionEffectiveLevel(doc, false, master)).toBe(1);

    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion).toBeDefined();
    // ANIMAL_COMPANION_PROGRESSION level 1: HD 2; BAB floor(2 * 3/4) = 1.
    expect(companion!.hd).toBe(2);
    expect(companion!.bab).toBe(1);
    expect(companion!.specialNotes).toContain(
      "This companion has only half its normal hit points until 4th level. Hit points are not adjustable through this table, so the reduction is not reflected on the sheet.",
    );
  });

  it("requires the archetype to be chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "ranger", level: 1 }],
      animalCompanion: { speciesId: "bird", name: "Kestrel", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(0);
    expect(companionEffectiveLevel(doc, false, master)).toBe(0);
  });
});

describe("Bonded Eagle (paladin scion of Talmandor): 1:1 paladin-level bird grant", () => {
  it("grants a companion at 5th level, paladin level 1:1", () => {
    // "This ability functions like the druid animal companion ability,
    // using the scion's paladin level as her effective druid level."
    // (archetype-features.json, paladin:scion-of-talmandor:bonded-eagle:5)
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 5 }],
      archetypes: ["paladin:scion-of-talmandor"],
      animalCompanion: { speciesId: "bird", name: "Talon", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(5);
    expect(companionEffectiveLevel(doc, false, master)).toBe(5);
  });

  it("gates on 5th level", () => {
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 4 }],
      archetypes: ["paladin:scion-of-talmandor"],
      animalCompanion: { speciesId: "bird", name: "Talon", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(0);
    expect(companionEffectiveLevel(doc, false, master)).toBe(0);
  });
});

describe("Skilled Rider (paladin shining knight): mount saves += master's Cha modifier", () => {
  it("adds the paladin's Cha modifier to the mount's saves", () => {
    // "any mount she is riding gains the benefit of her divine grace class
    // feature, adding her Charisma bonus (if any) to its saving throws"
    // (archetype-features.json, paladin:shining-knight:skilled-rider:3) —
    // the exact same Change the vendored Divine Grace class feature itself
    // carries (`@abilities.cha.mod` untyped on `allSavingThrows`).
    const shared = {
      classes: [
        { tag: "paladin", level: 3 },
        { tag: "druid", level: 4 },
      ],
      animalCompanion: { speciesId: "wolf", name: "Charger", source: ["nature-bond"] },
      abilities: { cha: 16 },
    } satisfies Parameters<typeof makeDoc>[0];
    const plainDoc = makeDoc(shared);
    const archDoc = makeDoc({ ...shared, archetypes: ["paladin:shining-knight"] });

    const plain = deriveCompanion(plainDoc, buildRollData(plainDoc, ref), false, false);
    const master = collectCompanionMasterEffects(archDoc, ref);
    expect(master.buffs).toHaveLength(1);
    const withArch = deriveCompanion(archDoc, buildRollData(archDoc, ref), false, false, master);

    // Cha 16 -> +3 modifier, untyped (sums onto the companion's own saves).
    expect(withArch!.saves.fort).toBe(plain!.saves.fort + 3);
    expect(withArch!.saves.ref).toBe(plain!.saves.ref + 3);
    expect(withArch!.saves.will).toBe(plain!.saves.will + 3);
  });

  it("gates on 3rd level", () => {
    const doc = makeDoc({
      classes: [
        { tag: "paladin", level: 2 },
        { tag: "druid", level: 4 },
      ],
      archetypes: ["paladin:shining-knight"],
      animalCompanion: { speciesId: "wolf", name: "Charger", source: ["nature-bond"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.buffs).toEqual([]);
  });
});

describe("Corpse Rider (antipaladin seal-breaker): 1:1 antipaladin-level undead mount grant", () => {
  it("grants a mount at 5th level, antipaladin level 1:1, with an honest undead-swap note", () => {
    // "This corpse mount functions as a druid's animal companion using the
    // seal-breaker's level as his effective druid level." (archetype-features.json,
    // antipaladin:seal-breaker:corpse-rider:5)
    const doc = makeDoc({
      classes: [{ tag: "antipaladin", level: 5 }],
      archetypes: ["antipaladin:seal-breaker"],
      animalCompanion: { speciesId: "horse", name: "Bones", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(5);
    expect(companionEffectiveLevel(doc, false, master)).toBe(5);
    expect(master.notes).toContain(
      "This mount is undead: it uses Charisma where the base creature would use Constitution, and its saving throws follow the undead array (good Will, poor Fortitude and Reflex) rather than the standard companion one. Neither swap is reflected here.",
    );
  });

  it("gates on 5th level", () => {
    const doc = makeDoc({
      classes: [{ tag: "antipaladin", level: 4 }],
      archetypes: ["antipaladin:seal-breaker"],
      animalCompanion: { speciesId: "horse", name: "Bones", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(0);
    expect(companionEffectiveLevel(doc, false, master)).toBe(0);
  });
});
