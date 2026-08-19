import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture tests for this wave's `CLASS_FEATURE_NATURAL_ATTACKS`/
 * `ARCHETYPE_FEATURE_NATURAL_ATTACKS` entries (`pc-natural-attacks/
 * class-archetype.ts`), run end-to-end through `compute()` against the real
 * vendored data slice (`pcNaturalAttacks.test.ts` already covers the
 * resolver's own math with synthetic tables — this file exercises the real
 * content). Also covers this wave's two adjacent fixes that ride the same
 * `compute()` harness: Storm Caller's Storm's Wings (an archetype-extracted
 * `flySpeed` Change, not a natural-attack grant) and one `immEffect.
 * polymorph` bloodline-power fixture.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === classTag,
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const HUMAN = raceId("Human");

function baseDoc(over: Partial<CharacterDoc> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: [{ tag: "shifter", level: 1 }] },
    abilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
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
    ...over,
  } as CharacterDoc;
}

describe("Shifter Claws (class feature, level-scaled dice)", () => {
  function clawDice(shifterLevel: number): string {
    const sheet = compute(
      baseDoc({
        identity: { name: "Test", race: HUMAN, classes: [{ tag: "shifter", level: shifterLevel }] },
      }),
      ref,
    );
    const claw = sheet.naturalAttacks?.find((a) => a.name === "Claw");
    if (!claw) throw new Error(`no Claw line at shifter level ${shifterLevel}`);
    return claw.damageDice!;
  }

  it("1d4 at 1st level, 2 primary claws at full BAB/Str", () => {
    const sheet = compute(baseDoc(), ref);
    expect(sheet.naturalAttacks).toHaveLength(1);
    const claw = sheet.naturalAttacks![0]!;
    expect(claw.name).toBe("Claw");
    expect(claw.count).toBe(2);
    expect(claw.kind).toBe("primary");
    expect(claw.damageDice).toBe("1d4");
    // shifter 1 has BAB 1 (full progression) + Str mod 3, no secondary penalty (2 claws, both primary-type).
    expect(claw.attackBonus).toBe(4);
    expect(claw.damageBonus).toBe(3);
  });

  it("steps 1d6 at 7th, 1d8 at 11th, 1d10 at 13th", () => {
    expect(clawDice(6)).toBe("1d4");
    expect(clawDice(7)).toBe("1d6");
    expect(clawDice(10)).toBe("1d6");
    expect(clawDice(11)).toBe("1d8");
    expect(clawDice(12)).toBe("1d8");
    expect(clawDice(13)).toBe("1d10");
    expect(clawDice(20)).toBe("1d10");
  });
});

describe("Animal Fury (rage power, buff-gated)", () => {
  const RAGE_BUFF_ID = "UgjpRD8vtiSWRxuL"; // vendored "Rage" buff — see rage-powers.ts's WHILE_RAGING.

  function docWithAnimalFury(raging: boolean): CharacterDoc {
    const buffs: ActiveBuff[] = raging
      ? [{ instanceId: "b1", buffId: RAGE_BUFF_ID, name: "Rage", changes: [] }]
      : [];
    return baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "barbarian", level: 5 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        ragePowers: ["animalFury"],
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: buffs,
        resources: {},
      },
    });
  }

  it("no bite line at all while not raging", () => {
    const sheet = compute(docWithAnimalFury(false), ref);
    expect(sheet.naturalAttacks).toBeUndefined();
  });

  it("a secondary bite (base attack bonus -5, half Strength) appears while raging", () => {
    const sheet = compute(docWithAnimalFury(true), ref);
    expect(sheet.naturalAttacks).toHaveLength(1);
    const bite = sheet.naturalAttacks![0]!;
    expect(bite.name).toBe("Bite");
    expect(bite.kind).toBe("secondary");
    expect(bite.damageDice).toBe("1d4");
    // BAB 5 + Str 3 - 5 (secondary penalty, no Multiattack) = 3.
    expect(bite.attackBonus).toBe(3);
    // half of Str 3 = 1.
    expect(bite.damageBonus).toBe(1);
  });
});

describe("Tiger's Claws (vigilante talent, always on once picked)", () => {
  function docWithTigersClaws(vigilanteLevel: number): CharacterDoc {
    return baseDoc({
      identity: {
        name: "Test",
        race: HUMAN,
        classes: [{ tag: "vigilante", level: vigilanteLevel }],
      },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vigilanteTalents: ["tigersClaws"],
      },
    });
  }

  it("2 primary claws at 1d4, no buff needed (extendable at will)", () => {
    const sheet = compute(docWithTigersClaws(4), ref);
    expect(sheet.naturalAttacks).toHaveLength(1);
    const claws = sheet.naturalAttacks![0]!;
    expect(claws.name).toBe("Claw");
    expect(claws.count).toBe(2);
    expect(claws.kind).toBe("primary");
    expect(claws.damageDice).toBe("1d4");
  });

  it("claw dice step to 1d6 at vigilante 11", () => {
    const sheet = compute(docWithTigersClaws(11), ref);
    expect(sheet.naturalAttacks![0]!.damageDice).toBe("1d6");
  });
});

describe("Feral Mutagen (alchemist discovery, mutagen-buff-gated)", () => {
  const MUTAGEN_STR_BUFF_ID = "a3P821aUxxJbSpVV"; // vendored "Mutagen, Str" buff.

  function docWithFeralMutagen(mutagenActive: boolean): CharacterDoc {
    const buffs: ActiveBuff[] = mutagenActive
      ? [{ instanceId: "b1", buffId: MUTAGEN_STR_BUFF_ID, name: "Mutagen, Str", changes: [] }]
      : [];
    return baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "alchemist", level: 8 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        alchemistDiscoveries: ["feralMutagen"],
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: buffs,
        resources: {},
      },
    });
  }

  it("absent until the mutagen buff is active", () => {
    expect(compute(docWithFeralMutagen(false), ref).naturalAttacks).toBeUndefined();
  });

  it("2 claws (1d6) + 1 bite (1d8), all primary, while a mutagen is active", () => {
    const sheet = compute(docWithFeralMutagen(true), ref);
    expect(sheet.naturalAttacks).toHaveLength(2);
    const claw = sheet.naturalAttacks!.find((a) => a.name === "Claw")!;
    const bite = sheet.naturalAttacks!.find((a) => a.name === "Bite")!;
    expect(claw.count).toBe(2);
    expect(claw.kind).toBe("primary");
    expect(claw.damageDice).toBe("1d6");
    expect(bite.kind).toBe("primary");
    expect(bite.damageDice).toBe("1d8");
  });
});

describe("Savage Bite (barbarian archetype Feral Gnasher, archetype-keyed + level-scaled)", () => {
  const feralGnasher = archetypeId("Feral Gnasher", "barbarian");

  function bite(barbarianLevel: number) {
    const sheet = compute(
      baseDoc({
        identity: {
          name: "Test",
          race: HUMAN,
          classes: [{ tag: "barbarian", level: barbarianLevel }],
        },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [feralGnasher],
        },
      }),
      ref,
    );
    return sheet.naturalAttacks?.find((a) => a.name === "Bite");
  }

  it("1d4 below 10th level", () => {
    expect(bite(1)!.damageDice).toBe("1d4");
    expect(bite(9)!.damageDice).toBe("1d4");
  });

  it("steps to 1d6 at 10th level", () => {
    expect(bite(10)!.damageDice).toBe("1d6");
    expect(bite(15)!.damageDice).toBe("1d6");
  });

  it("does nothing for a barbarian without the archetype", () => {
    const sheet = compute(
      baseDoc({
        identity: { name: "Test", race: HUMAN, classes: [{ tag: "barbarian", level: 10 }] },
      }),
      ref,
    );
    expect(sheet.naturalAttacks).toBeUndefined();
  });
});

describe("Claws of the Hag (bloodrager archetype Hag-Riven) and Terrible Slam (Rageshaper)", () => {
  const hagRiven = archetypeId("Hag-Riven", "bloodrager");
  const rageshaper = archetypeId("Rageshaper", "bloodrager");

  function clawsFor(archetype: string, bloodragerLevel: number) {
    const sheet = compute(
      baseDoc({
        identity: {
          name: "Test",
          race: HUMAN,
          classes: [{ tag: "bloodrager", level: bloodragerLevel }],
        },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [archetype],
        },
      }),
      ref,
    );
    return sheet.naturalAttacks;
  }

  it("Hag-Riven's claws step 1d4 -> 1d6 (5th) -> 1d8 (16th)", () => {
    expect(clawsFor(hagRiven, 1)!.find((a) => a.name === "Claw")!.damageDice).toBe("1d4");
    expect(clawsFor(hagRiven, 5)!.find((a) => a.name === "Claw")!.damageDice).toBe("1d6");
    expect(clawsFor(hagRiven, 16)!.find((a) => a.name === "Claw")!.damageDice).toBe("1d8");
  });

  it("Rageshaper's Terrible Slam mirrors Shifter Claws' progression, named Slam", () => {
    expect(clawsFor(rageshaper, 1)!.find((a) => a.name === "Slam")!.damageDice).toBe("1d4");
    expect(clawsFor(rageshaper, 7)!.find((a) => a.name === "Slam")!.damageDice).toBe("1d6");
    expect(clawsFor(rageshaper, 11)!.find((a) => a.name === "Slam")!.damageDice).toBe("1d8");
    expect(clawsFor(rageshaper, 13)!.find((a) => a.name === "Slam")!.damageDice).toBe("1d10");
  });
});

describe("Storm Caller: Storm's Wings (archetype-extracted flySpeed, not a natural attack)", () => {
  const stormCaller = archetypeId("Storm Caller", "summoner");

  function flySpeed(summonerLevel: number): number {
    const sheet = compute(
      baseDoc({
        identity: {
          name: "Test",
          race: HUMAN,
          classes: [{ tag: "summoner", level: summonerLevel }],
        },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [stormCaller],
        },
      }),
      ref,
    );
    return sheet.speeds.fly ?? 0;
  }

  it("no automatic flight below 10th level", () => {
    expect(flySpeed(6)).toBe(0);
    expect(flySpeed(9)).toBe(0);
  });

  it("a fly speed equal to base land speed (30 ft. for a Human) at 10th level", () => {
    expect(flySpeed(10)).toBe(30);
    expect(flySpeed(15)).toBe(30);
  });
});

describe("immEffect.polymorph: sorcerer Protean bloodline's Avatar of Chaos (20th level)", () => {
  function effectImmunities(sorcererLevel: number, bloodline?: string): string[] {
    const sheet = compute(
      baseDoc({
        identity: {
          name: "Test",
          race: HUMAN,
          classes: [{ tag: "sorcerer", level: sorcererLevel }],
        },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          ...(bloodline ? { sorcererBloodline: bloodline } : {}),
        },
      }),
      ref,
    );
    return (sheet.defenses?.effectImmunities ?? []).map((e) => e.qualifier).sort();
  }

  it("a Protean sorcerer 20 is immune to acid, petrification, and polymorph effects", () => {
    expect(effectImmunities(20, "Protean")).toEqual(["petrification", "polymorph"]);
  });

  it("a Protean sorcerer below 20th has neither", () => {
    expect(effectImmunities(19, "Protean")).toEqual([]);
  });
});
