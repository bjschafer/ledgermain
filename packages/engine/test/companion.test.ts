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

  it("ACG hunter's own Animal Companion feature (issue #65): effective level equals hunter level 1:1, no -3 offset", () => {
    const doc = makeDoc({
      classes: [{ tag: "hunter", level: 5 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["hunter-companion"] },
    });
    expect(companionEffectiveLevel(doc)).toBe(5);
    const rollData = buildRollData(doc, ref);
    const wolf = deriveCompanion(doc, rollData);
    expect(wolf?.level).toBe(5);
  });

  it("a 1st-level hunter already has a companion (unlike a ranger, which needs 4th)", () => {
    const doc = makeDoc({
      classes: [{ tag: "hunter", level: 1 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["hunter-companion"] },
    });
    expect(companionEffectiveLevel(doc)).toBe(1);
  });

  it("cavalier's Mount (issue #68): effective level equals cavalier level 1:1, from 1st level", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 3 }],
      animalCompanion: { speciesId: "horse", name: "Comet", source: ["cavalier-mount"] },
    });
    expect(companionEffectiveLevel(doc)).toBe(3);
    const rollData = buildRollData(doc, ref);
    const horse = deriveCompanion(doc, rollData);
    expect(horse?.level).toBe(3);
  });

  it("samurai's Mount (issue #68): effective level equals samurai level 1:1, from 1st level", () => {
    const doc = makeDoc({
      classes: [{ tag: "samurai", level: 1 }],
      animalCompanion: { speciesId: "horse", name: "Comet", source: ["samurai-mount"] },
    });
    expect(companionEffectiveLevel(doc)).toBe(1);
  });

  it("stacks with another source, per the Hunter's own vendored rules text", () => {
    const doc = makeDoc({
      classes: [
        { tag: "druid", level: 2 },
        { tag: "hunter", level: 3 },
      ],
      animalCompanion: {
        speciesId: "wolf",
        name: "Fang",
        source: ["nature-bond", "hunter-companion"],
      },
    });
    expect(companionEffectiveLevel(doc)).toBe(5);
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

describe("deriveCompanion skill-rank investment (issue #68)", () => {
  it("badger at druid-6: skill points = hd * max(1, 2+intMod); ranks clamp to hd; class-skill +3 kicks in at 1+ rank", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 6 }],
      animalCompanion: {
        speciesId: "badger",
        name: "Digger",
        source: ["nature-bond"],
        skillRanks: { per: 3, ste: 10 }, // ste over-invested past hd (6) — clamped, not blocked
      },
    });
    const rollData = buildRollData(doc, ref);
    const badger = deriveCompanion(doc, rollData)!;
    expect(badger.hd).toBe(6);
    expect(badger.abilities.int.mod).toBe(-4);
    expect(badger.skillPointsAvailable).toBe(6); // hd(6) * max(1, 2-4)
    expect(badger.skillPointsSpent).toBe(9); // 3 + clamp(10, 0, 6)

    const per = badger.skills.per!;
    expect(per.ranks).toBe(3);
    expect(per.total).toBe(7); // Wis mod(+1) + ranks(3) + class skill(+3)

    const ste = badger.skills.ste!;
    expect(ste.ranks).toBe(6); // clamped from 10 to hd
    expect(ste.total).toBe(13); // Dex mod(+4) + ranks(6) + class skill(+3) + size(0, Medium)
  });

  it("no skillRanks entry: unchanged pure ability-mod/racial/size total (0 ranks, no class-skill bonus)", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 6 }],
      animalCompanion: { speciesId: "badger", name: "Digger", source: ["nature-bond"] },
    });
    const rollData = buildRollData(doc, ref);
    const badger = deriveCompanion(doc, rollData)!;
    expect(badger.skills.per!.ranks).toBe(0);
    expect(badger.skills.per!.total).toBe(1); // Wis mod(+1) only
    expect(badger.skillPointsSpent).toBe(0);
  });
});

describe("deriveCompanion primary/secondary natural attacks (issue #68)", () => {
  it("horse (2 hooves, single attack form): both hooves stay primary, no −5/half-Str reduction", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 1 }],
      animalCompanion: { speciesId: "horse", name: "Silver", source: ["nature-bond"] },
    });
    const rollData = buildRollData(doc, ref);
    const horse = deriveCompanion(doc, rollData)!;
    // HD 2, BAB +1; Str 16 (mod +3); size Large (−1 attack); bab 1 + str 3 − 1 = 3.
    expect(horse.bab).toBe(1);
    expect(horse.abilities.str.mod).toBe(3);
    const hoof = horse.attacks.find((a) => a.name === "Hoof")!;
    expect(hoof).toMatchObject({ attackType: "primary", attack: 3, damageBonus: 3 });
  });

  it("badger (Bite + 2 Claws) below Multiattack: Bite primary, Claw secondary at −5/half Str", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 6 }],
      animalCompanion: { speciesId: "badger", name: "Digger", source: ["nature-bond"] },
    });
    const rollData = buildRollData(doc, ref);
    const badger = deriveCompanion(doc, rollData)!;
    expect(badger.bab).toBe(4);
    expect(badger.abilities.str.mod).toBe(1);
    expect(badger.specialAbilities.map((a) => a.name)).not.toContain("Multiattack");
    const bite = badger.attacks.find((a) => a.name === "Bite")!;
    const claw = badger.attacks.find((a) => a.name === "Claw")!;
    expect(bite).toMatchObject({ attackType: "primary", attack: 8, damageBonus: 1 });
    // secondary: −5 attack penalty, half Str (floor(1/2) = 0).
    expect(claw).toMatchObject({ attackType: "secondary", attack: 3, damageBonus: 0 });
  });

  it("badger at 9th (Multiattack unlocked): Claw's secondary penalty softens from −5 to −2", () => {
    const doc = makeDoc({
      classes: [{ tag: "druid", level: 9 }],
      animalCompanion: { speciesId: "badger", name: "Digger", source: ["nature-bond"] },
    });
    const rollData = buildRollData(doc, ref);
    const badger = deriveCompanion(doc, rollData)!;
    expect(badger.bab).toBe(6);
    expect(badger.abilities.str.mod).toBe(2);
    expect(badger.specialAbilities.map((a) => a.name)).toContain("Multiattack");
    const bite = badger.attacks.find((a) => a.name === "Bite")!;
    const claw = badger.attacks.find((a) => a.name === "Claw")!;
    expect(bite).toMatchObject({ attackType: "primary", attack: 11, damageBonus: 2 });
    // secondary: −2 attack penalty (Multiattack), half Str (floor(2/2) = 1).
    expect(claw).toMatchObject({ attackType: "secondary", attack: 9, damageBonus: 1 });
  });
});
