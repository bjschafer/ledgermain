import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, collectCompanionMasterEffects, deriveCompanion } from "../src/index.js";

const ref = loadRefData();

// Copied from test/companionMasterEffects.test.ts (see its own doc comment) —
// kept independent so this file's fixtures don't depend on that one's shape.
function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  animalCompanion?: CharacterDoc["build"]["animalCompanion"];
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
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
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

describe("OTHER_CLASS_COMPANION_EFFECTS — new-source / level-offset companion grants", () => {
  const cases: {
    label: string;
    classTag: string;
    archetypeId: string;
    level: number;
    expectedGrant: number;
    quote: string;
  }[] = [
    {
      label: "alchemist:winged-marauder Flying Beast Tamer (1:1)",
      classTag: "alchemist",
      archetypeId: "alchemist:winged-marauder",
      level: 6,
      expectedGrant: 6,
      quote: "The marauder's effective druid level is equal to his alchemist level.",
    },
    {
      label: "barbarian:mad-dog War Beast (1:1)",
      classTag: "barbarian",
      archetypeId: "barbarian:mad-dog",
      level: 5,
      expectedGrant: 5,
      quote:
        "a mad dog gains the service of an animal companion, using the barbarian's level as her effective druid level.",
    },
    {
      label: "barbarian:mounted-fury Bestial Mount (level - 4)",
      classTag: "barbarian",
      archetypeId: "barbarian:mounted-fury",
      level: 8,
      expectedGrant: 4,
      quote:
        "This ability functions as a druid's animal companion, using the barbarian's level -4 as her effective druid level.",
    },
    {
      label: "barbarian:shoanti-burn-rider Mount (level - 3)",
      classTag: "barbarian",
      archetypeId: "barbarian:shoanti-burn-rider",
      level: 7,
      expectedGrant: 4,
      quote: "her effective druid level is equal to her Shoanti burn rider level - 3.",
    },
    {
      label: "barbarianUnchained:mad-dog War Beast (1:1, same text as chained)",
      classTag: "barbarianUnchained",
      archetypeId: "barbarianUnchained:mad-dog",
      level: 5,
      expectedGrant: 5,
      quote:
        "a mad dog gains the service of an animal companion, using the barbarian's level as her effective druid level.",
    },
    {
      label: "barbarianUnchained:mounted-fury Bestial Mount (level - 4, same text as chained)",
      classTag: "barbarianUnchained",
      archetypeId: "barbarianUnchained:mounted-fury",
      level: 8,
      expectedGrant: 4,
      quote:
        "This ability functions as a druid's animal companion, using the barbarian's level -4 as her effective druid level.",
    },
    {
      label: "barbarianUnchained:shoanti-burn-rider Mount (level - 3, same text as chained)",
      classTag: "barbarianUnchained",
      archetypeId: "barbarianUnchained:shoanti-burn-rider",
      level: 7,
      expectedGrant: 4,
      quote: "her effective druid level is equal to her Shoanti burn rider level - 3.",
    },
    {
      label: "bloodrager:bloodrider Feral Mount (level - 4)",
      classTag: "bloodrager",
      archetypeId: "bloodrager:bloodrider",
      level: 9,
      expectedGrant: 5,
      quote:
        "This ability functions as the druid's animal companion, using the bloodrager's level - 4 as his effective druid level.",
    },
    {
      label: "brawler:wild-child Animal Companion (1:1)",
      classTag: "brawler",
      archetypeId: "brawler:wild-child",
      level: 6,
      expectedGrant: 6,
      quote: "The wild child uses his brawler level as his effective druid level.",
    },
    {
      label: "inquisitor:sacred-huntsmaster Animal Companion (1:1, hunter's own formula)",
      classTag: "inquisitor",
      archetypeId: "inquisitor:sacred-huntsmaster",
      level: 6,
      expectedGrant: 6,
      quote:
        "This ability works as the hunter class feature of the same name, using her inquisitor level as her hunter level.",
    },
    {
      label: "kineticist:cinderlands-adept Mount (level - 3)",
      classTag: "kineticist",
      archetypeId: "kineticist:cinderlands-adept",
      level: 7,
      expectedGrant: 4,
      quote: "her effective druid level is equal to her cinterlands adept level -3 [sic].",
    },
    {
      label: "vigilante:mounted-fury Mount (1:1)",
      classTag: "vigilante",
      archetypeId: "vigilante:mounted-fury",
      level: 6,
      expectedGrant: 6,
      quote:
        "This mount functions as a druid's animal companion, using the mounted fury's vigilante level as his effective druid level.",
    },
    {
      label: "warpriest:divine-commander Mount (1:1)",
      classTag: "warpriest",
      archetypeId: "warpriest:divine-commander",
      level: 6,
      expectedGrant: 6,
      quote:
        "This mount functions as a druid's animal companion, using the divine commander's level as her effective druid level.",
    },
  ];

  for (const c of cases) {
    it(`${c.label}: creates a companion with grantLevels ${c.expectedGrant} at ${c.classTag} ${c.level} ("${c.quote}")`, () => {
      const doc = makeDoc({
        classes: [{ tag: c.classTag, level: c.level }],
        archetypes: [c.archetypeId],
        animalCompanion: { speciesId: "wolf", name: "Companion", source: [] },
      });
      const master = collectCompanionMasterEffects(doc, ref);
      expect(master.grantLevels).toBe(c.expectedGrant);
      const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
      expect(companion).toBeDefined();
      expect(companion!.level).toBe(c.expectedGrant);
    });
  }

  it("requires the archetype to be chosen (barbarian:mad-dog War Beast)", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 5 }],
      animalCompanion: { speciesId: "wolf", name: "Companion", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(0);
  });

  it("Mount (barbarian:shoanti-burn-rider) gates on minLevel — no grant below 4th", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 3 }],
      archetypes: ["barbarian:shoanti-burn-rider"],
      animalCompanion: { speciesId: "wolf", name: "Companion", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(0);
  });
});

describe("OTHER_CLASS_COMPANION_EFFECTS — landSpeed stat-mod", () => {
  // "the mounted fury gains the service of a feral mount... using the
  // barbarian's level -4 as her effective druid level" (Bestial Mount)
  // pairs with "The speed of any mount the barbarian rides is increased by
  // 10 feet" (Fast Rider) — both barbarian:mounted-fury, so choosing the
  // archetype at 5th level creates a level-1 wolf companion AND applies the
  // unconditional +10 ft. landSpeed bonus.
  it("Fast Rider (barbarian:mounted-fury): +10 ft. landSpeed, wolf base 50 -> 60", () => {
    const withArch = makeDoc({
      classes: [{ tag: "barbarian", level: 5 }],
      archetypes: ["barbarian:mounted-fury"],
      animalCompanion: { speciesId: "wolf", name: "Steed", source: [] },
    });
    const master = collectCompanionMasterEffects(withArch, ref);
    const companion = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(companion).toBeDefined();
    expect(companion!.speeds.land).toBe(60);
  });

  it("requires the archetype to be chosen — no companion, no bonus", () => {
    const noArch = makeDoc({
      classes: [{ tag: "barbarian", level: 5 }],
      animalCompanion: { speciesId: "wolf", name: "Steed", source: [] },
    });
    const master = collectCompanionMasterEffects(noArch, ref);
    const companion = deriveCompanion(noArch, buildRollData(noArch, ref), false, false, master);
    expect(companion).toBeUndefined();
  });
});

describe("OTHER_CLASS_COMPANION_EFFECTS — bonusTricks flat count", () => {
  // "his animal companion also learns a trick to make use of this combat
  // maneuver... This bonus trick doesn't count against the animal
  // companion's total tricks known" (Maneuver Training, brawler:wild-child,
  // 3rd level). CRB table: level-2 companion has 1 base bonus trick,
  // level-3 has 2 — Maneuver Training adds +1 on top starting at 3rd.
  it("Maneuver Training adds +1 bonusTricks at 3rd level", () => {
    const at3 = makeDoc({
      classes: [{ tag: "brawler", level: 3 }],
      archetypes: ["brawler:wild-child"],
      animalCompanion: { speciesId: "wolf", name: "Buddy", source: [] },
    });
    const master = collectCompanionMasterEffects(at3, ref);
    expect(master.bonusTricks).toBe(1);
    const companion = deriveCompanion(at3, buildRollData(at3, ref), false, false, master);
    expect(companion).toBeDefined();
    expect(companion!.bonusTricks).toBe(3); // CRB base 2 (level 3) + 1
  });

  it("gates on minLevel — no bonus trick below 3rd (Animal Companion itself still applies)", () => {
    const at2 = makeDoc({
      classes: [{ tag: "brawler", level: 2 }],
      archetypes: ["brawler:wild-child"],
      animalCompanion: { speciesId: "wolf", name: "Buddy", source: [] },
    });
    const master = collectCompanionMasterEffects(at2, ref);
    expect(master.bonusTricks).toBe(0);
    const companion = deriveCompanion(at2, buildRollData(at2, ref), false, false, master);
    expect(companion).toBeDefined();
    expect(companion!.bonusTricks).toBe(1); // CRB base at level 2, no archetype bonus yet
  });
});
