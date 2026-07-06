import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, companionEffectiveLevel, deriveCompanion } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  animalCompanion?: CharacterDoc["build"]["animalCompanion"];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  sharedBuffIds?: string[];
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
      animalCompanion: overrides.animalCompanion,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: overrides.activeBuffs ?? [],
      resources: {},
      animalCompanion: overrides.sharedBuffIds
        ? { sharedBuffIds: overrides.sharedBuffIds }
        : undefined,
    },
  } as CharacterDoc;
}

describe("deriveCompanion (druid-7 wolf, hand-computed fixture)", () => {
  const doc = makeDoc({
    classes: [{ tag: "druid", level: 7 }],
    animalCompanion: { speciesId: "wolf", name: "Fang", source: ["nature-bond"] },
  });
  const rollData = buildRollData(doc, ref);
  const wolf = deriveCompanion(doc, rollData);

  it("derives a companion at effective level 7", () => {
    expect(wolf).toBeDefined();
    expect(wolf!.level).toBe(7);
    expect(companionEffectiveLevel(doc)).toBe(7);
  });

  it("HD 6, BAB +4 (3/4 HD)", () => {
    expect(wolf!.hd).toBe(6);
    expect(wolf!.bab).toBe(4);
  });

  it("Saves: Fort +7, Ref +8, Will +3 (good/good/poor at HD 6 + ability mods)", () => {
    expect(wolf!.saves.fort).toBe(7);
    expect(wolf!.saves.ref).toBe(8);
    expect(wolf!.saves.will).toBe(3);
  });

  it("grown to Large at level 4+: Str 16, Dex 17, Con 15 (base + table adj + default ASI to Str)", () => {
    expect(wolf!.size).toBe("lg");
    expect(wolf!.abilities.str).toEqual({ score: 16, mod: 3 });
    expect(wolf!.abilities.dex).toEqual({ score: 17, mod: 3 });
    expect(wolf!.abilities.con).toEqual({ score: 15, mod: 2 });
  });

  it("Natural armor 5 (species 1 + table adj 4); AC 17, touch 12, flat-footed 14", () => {
    expect(wolf!.naturalArmor).toBe(5);
    expect(wolf!.ac.normal).toBe(17);
    expect(wolf!.ac.touch).toBe(12);
    expect(wolf!.ac.flatFooted).toBe(14);
  });

  it("CMB +8, CMD 21", () => {
    expect(wolf!.cmb).toBe(8);
    expect(wolf!.cmd).toBe(21);
  });

  it("Attack: bite +6 (1d8+3), grown attack dice", () => {
    const bite = wolf!.attacks.find((a) => a.name === "Bite");
    expect(bite).toMatchObject({ attack: 6, damageDice: "1d8", damageBonus: 3 });
  });

  it("HP max 39 (floor(4.5*6) + 2*6)", () => {
    expect(wolf!.hp.max).toBe(39);
    expect(wolf!.hp.current).toBe(39);
  });

  it("special abilities at level 7: Link, Share Spells, Evasion, Devotion (unlocked at 6th, cumulative) — not Ability Score Increase", () => {
    const names = wolf!.specialAbilities.map((a) => a.name);
    expect(names).toEqual(expect.arrayContaining(["Link", "Share Spells", "Evasion", "Devotion"]));
    expect(names).not.toContain("Ability Score Increase");
  });

  it("shared Barkskin (+2 natural armor) raises AC and flat-footed but not touch", () => {
    const withBuff: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "barkskin-1",
            name: "Barkskin",
            changes: [{ target: "nac", type: "enhancement", formula: "2" }],
          },
        ],
        animalCompanion: { sharedBuffIds: ["barkskin-1"] },
      },
    };
    const buffed = deriveCompanion(withBuff, rollData);
    expect(buffed!.ac.normal).toBe(19);
    expect(buffed!.ac.touch).toBe(12);
    expect(buffed!.ac.flatFooted).toBe(16);
  });
});

describe("deriveCompanion (ranger-7 dog, effective level 4)", () => {
  const doc = makeDoc({
    classes: [{ tag: "ranger", level: 7 }],
    animalCompanion: { speciesId: "dog", name: "Rex", source: ["hunters-bond"] },
  });
  const rollData = buildRollData(doc, ref);
  const dog = deriveCompanion(doc, rollData);

  it("effective level = ranger level - 3 = 4", () => {
    expect(companionEffectiveLevel(doc)).toBe(4);
    expect(dog!.level).toBe(4);
  });

  it("HD 4, BAB +3", () => {
    expect(dog!.hd).toBe(4);
    expect(dog!.bab).toBe(3);
  });

  it("Saves: Fort +6, Ref +8, Will +2 (base HD-4 good/good/poor + ability mods)", () => {
    expect(dog!.saves.fort).toBe(6);
    expect(dog!.saves.ref).toBe(8);
    expect(dog!.saves.will).toBe(2);
  });

  it("grown to Medium: Str 15, Dex 18, Con 15", () => {
    expect(dog!.size).toBe("med");
    expect(dog!.abilities.str).toEqual({ score: 15, mod: 2 });
    expect(dog!.abilities.dex).toEqual({ score: 18, mod: 4 });
  });

  it("AC 17, touch 14, flat-footed 13", () => {
    expect(dog!.ac.normal).toBe(17);
    expect(dog!.ac.touch).toBe(14);
    expect(dog!.ac.flatFooted).toBe(13);
  });

  it("CMB +5, CMD 19", () => {
    expect(dog!.cmb).toBe(5);
    expect(dog!.cmd).toBe(19);
  });

  it("Attack: bite +7 (1d6+2)", () => {
    const bite = dog!.attacks.find((a) => a.name === "Bite");
    expect(bite).toMatchObject({ attack: 7, damageDice: "1d6", damageBonus: 2 });
  });

  it("HP max 26", () => {
    expect(dog!.hp.max).toBe(26);
  });
});

describe("deriveCompanion edge cases", () => {
  it("returns undefined with no build.animalCompanion", () => {
    const doc = makeDoc({ classes: [{ tag: "druid", level: 5 }] });
    const rollData = buildRollData(doc, ref);
    expect(deriveCompanion(doc, rollData)).toBeUndefined();
  });

  it("returns undefined for an unknown species id (soft fail, no crash)", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 5 }],
      animalCompanion: { speciesId: "owlbear", name: "Gronk", source: ["nature-bond"] },
    });
    const rollData = buildRollData(doc, ref);
    expect(deriveCompanion(doc, rollData)).toBeUndefined();
  });

  it("returns undefined when no source is chosen (Nature Bond spent on a domain instead)", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 5 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: [] },
    });
    const rollData = buildRollData(doc, ref);
    expect(deriveCompanion(doc, rollData)).toBeUndefined();
    expect(companionEffectiveLevel(doc)).toBe(0);
  });

  it("ranger below 4th level has no companion yet (effective level 0)", () => {
    const doc = makeDoc({
      classes: [{ tag: "ranger", level: 3 }],
      animalCompanion: { speciesId: "dog", name: "Rex", source: ["hunters-bond"] },
    });
    const rollData = buildRollData(doc, ref);
    expect(deriveCompanion(doc, rollData)).toBeUndefined();
  });

  it("multiclass druid/ranger with both sources sums their contributions", () => {
    const doc = makeDoc({
      classes: [
        { tag: "druid", level: 2 },
        { tag: "ranger", level: 7 },
      ],
      animalCompanion: {
        speciesId: "wolf",
        name: "Fang",
        source: ["nature-bond", "hunters-bond"],
      },
    });
    // druid 2 + (ranger 7 - 3) = 2 + 4 = 6
    expect(companionEffectiveLevel(doc)).toBe(6);
  });

  it("Boon Companion adds +4 effective level, capped at total character level", () => {
    const doc = makeDoc({
      classes: [
        { tag: "druid", level: 1 },
        { tag: "fighter", level: 3 },
      ],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["nature-bond"] },
    });
    // base 1 + 4 = 5, but total character level is only 4 -> capped at 4.
    expect(companionEffectiveLevel(doc, true)).toBe(4);
    expect(companionEffectiveLevel(doc, false)).toBe(1);
  });

  it("Boon Companion does nothing without an existing companion source", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 10 }],
    });
    expect(companionEffectiveLevel(doc, true)).toBe(0);
  });

  it("player-assigned ability increase routes to the chosen ability instead of the Str default", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 4 }],
      animalCompanion: {
        speciesId: "wolf",
        name: "Fang",
        source: ["nature-bond"],
        abilityIncreases: ["dex"],
      },
    });
    const rollData = buildRollData(doc, ref);
    const wolf = deriveCompanion(doc, rollData)!;
    // level 4 row: abilityAdj +1 to both Str/Dex; the single ASI slot goes to Dex.
    expect(wolf.abilities.str).toEqual({ score: 14, mod: 2 });
    expect(wolf.abilities.dex).toEqual({ score: 17, mod: 3 });
  });
});
