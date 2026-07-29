import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { bloodragerBloodlineVariantLabel } from "../src/bloodrager-bloodlines.js";
import { collectModifiers } from "../src/collect.js";
import { compute, deriveResourcePools, resolveClassFeatures } from "../src/index.js";
import { BLOODRAGE_BUFF_ID } from "../src/bloodrage.js";
import { evaluateFormula } from "../src/formula.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeBloodrager(
  level: number,
  bloodragerBloodline?: string,
  abilities: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>> = {},
  bloodragerBloodlineVariant?: string,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "bloodrager", level }],
    },
    abilities: {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 12,
      ...abilities,
    },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(bloodragerBloodline ? { bloodragerBloodline } : {}),
      ...(bloodragerBloodlineVariant ? { bloodragerBloodlineVariant } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function bloodlineFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "bloodline")
    .map((f) => f.name)
    .sort();
}

describe("bloodrager bloodline powers (collectGrantedFeatures / resolveClassFeatures)", () => {
  it("a level-1 Draconic bloodrager gets only the 1st-level power", () => {
    expect(bloodlineFeatureNames(makeBloodrager(1, "Draconic"))).toEqual(["Claws"]);
  });

  it("a level-8 Draconic bloodrager gets 1st/4th/8th-level powers, not 12th/16th/20th", () => {
    expect(bloodlineFeatureNames(makeBloodrager(8, "Draconic"))).toEqual([
      "Breath Weapon",
      "Claws",
      "Draconic Resistance",
    ]);
  });

  it("a level-20 Draconic bloodrager gets all 6 powers, each tagged with the bloodline origin", () => {
    const doc = makeBloodrager(20, "Draconic");
    expect(bloodlineFeatureNames(doc)).toEqual([
      "Breath Weapon",
      "Claws",
      "Draconic Resistance",
      "Dragon Form",
      "Dragon Wings",
      "Power of Wyrms",
    ]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const claws = classFeatures.find((f) => f.name === "Claws")!;
    expect(claws.origin).toEqual({ kind: "bloodline", label: "Draconic Bloodline" });
  });

  it("an unknown bloodline tag is ignored, not an error", () => {
    const doc = makeBloodrager(7, "NotARealBloodline");
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("bloodragerBloodline:"))).toBe(false);
  });

  it("a non-bloodrager with a stale bloodline field gets nothing", () => {
    const doc: CharacterDoc = {
      ...makeBloodrager(7, "Draconic"),
      identity: { ...makeBloodrager(7).identity, classes: [{ tag: "fighter", level: 7 }] },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("bloodragerBloodline:"))).toBe(false);
  });

  it("Draconic's natural armor bonus scales +1 at 4th, +2 at 8th, +4 at 16th", () => {
    // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Draconic):
    // "+1 natural armor bonus ... increases to +2 [at 8th] ... to +4 [at
    // 16th]."
    const low = collectModifiers(
      makeBloodrager(3, "Draconic"),
      ref,
      buildRollData(makeBloodrager(3, "Draconic"), ref),
    );
    expect(low.some((m) => m.target === "nac")).toBe(false);

    for (const [level, expected] of [
      [4, 1],
      [8, 2],
      [16, 4],
    ] as const) {
      const doc = makeBloodrager(level, "Draconic");
      const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
      expect(mods.find((m) => m.target === "nac")!.value, `level ${level}`).toBe(expected);
    }
  });

  it("Draconic Resistance: the dragon-type variant sets the energy, resist 5 then 10 at 8th (blue → electricity)", () => {
    // Same RAW citation as above: "resistance 5 against your energy type ...
    // increases to 10 [at 8th]" — and no 16th-level step for the resistance.
    const doc4 = makeBloodrager(4, "Draconic", {}, "blue");
    const at4 = collectModifiers(doc4, ref, buildRollData(doc4, ref));
    expect(at4.find((m) => m.target === "eres.electricity")!.value).toBe(5);

    const doc16 = makeBloodrager(16, "Draconic", {}, "blue");
    const at16 = collectModifiers(doc16, ref, buildRollData(doc16, ref));
    expect(at16.find((m) => m.target === "eres.electricity")!.value).toBe(10);

    // No stored variant → the natural armor still applies, the resistance
    // doesn't.
    const noVariant = makeBloodrager(8, "Draconic");
    const mods = collectModifiers(noVariant, ref, buildRollData(noVariant, ref));
    expect(mods.find((m) => m.target === "nac")!.value).toBe(2);
    expect(mods.some((m) => m.target.startsWith("eres."))).toBe(false);
  });

  it("Elemental Resistance: flat 10 to the chosen element's energy (earth → acid), no scaling step", () => {
    // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Elemental):
    // "At 4th level, you gain energy resistance 10 against your energy
    // type." — flat, unlike the sorcerer power's 20 at 9th.
    const doc4 = makeBloodrager(4, "Elemental", {}, "earth");
    const at4 = collectModifiers(doc4, ref, buildRollData(doc4, ref));
    expect(at4.find((m) => m.target === "eres.acid")!.value).toBe(10);

    const doc20 = makeBloodrager(20, "Elemental", {}, "earth");
    const at20 = collectModifiers(doc20, ref, buildRollData(doc20, ref));
    expect(at20.find((m) => m.target === "eres.acid")!.value).toBe(10);
  });

  it("Elemental Movement at 8th: air flies 60, water swims 60, fire adds 30 ft. land speed", () => {
    const air = compute(makeBloodrager(8, "Elemental", {}, "air"), ref);
    expect(air.speeds.fly).toBe(60);
    const water = compute(makeBloodrager(8, "Elemental", {}, "water"), ref);
    expect(water.speeds.swim).toBe(60);
    const fire = compute(makeBloodrager(8, "Elemental", {}, "fire"), ref);
    const baseline = compute(makeBloodrager(8, "Elemental"), ref);
    expect(fire.speeds.land).toBe(baseline.speeds.land! + 30);
    // Below the 8th-level gate the movement power hasn't arrived.
    const below = compute(makeBloodrager(7, "Elemental", {}, "air"), ref);
    expect(below.speeds.fly ?? 0).toBe(0);
  });

  it("Celestial's eres.acid/cold scales from 5 to 10 at 12th level", () => {
    const doc8 = makeBloodrager(8, "Celestial");
    const at8 = collectModifiers(doc8, ref, buildRollData(doc8, ref));
    expect(at8.find((m) => m.target === "eres.acid")!.value).toBe(5);

    const doc12 = makeBloodrager(12, "Celestial");
    const at12 = collectModifiers(doc12, ref, buildRollData(doc12, ref));
    expect(at12.find((m) => m.target === "eres.acid")!.value).toBe(10);
    expect(at12.find((m) => m.target === "eres.cold")!.value).toBe(10);
  });

  it("Destined's luck AC/save bonus scales +1 at 4th, +1 every 4 levels, max +5 at 20th", () => {
    const doc4 = makeBloodrager(4, "Destined");
    const at4 = collectModifiers(doc4, ref, buildRollData(doc4, ref));
    expect(at4.find((m) => m.target === "ac" && m.type === "luck")!.value).toBe(1);
    expect(at4.find((m) => m.target === "allSavingThrows" && m.type === "luck")!.value).toBe(1);

    const doc20 = makeBloodrager(20, "Destined");
    const at20 = collectModifiers(doc20, ref, buildRollData(doc20, ref));
    expect(at20.find((m) => m.target === "ac" && m.type === "luck")!.value).toBe(5);
  });

  it("Infernal's fire resistance scales from 5 to 10 at 8th level", () => {
    const doc4 = makeBloodrager(4, "Infernal");
    const at4 = collectModifiers(doc4, ref, buildRollData(doc4, ref));
    expect(at4.find((m) => m.target === "eres.fire")!.value).toBe(5);

    const doc8 = makeBloodrager(8, "Infernal");
    const at8 = collectModifiers(doc8, ref, buildRollData(doc8, ref));
    expect(at8.find((m) => m.target === "eres.fire")!.value).toBe(10);
  });

  it("Undead's Death's Gift grants flat eres.cold 10 at 8th level", () => {
    const doc8 = makeBloodrager(8, "Undead");
    const at8 = collectModifiers(doc8, ref, buildRollData(doc8, ref));
    expect(at8.find((m) => m.target === "eres.cold")!.value).toBe(10);
  });

  it("Martyred's Martyr's Resistances scales fire resistance from 5 to 10 at 8th level", () => {
    const doc4 = makeBloodrager(4, "Martyred");
    const at4 = collectModifiers(doc4, ref, buildRollData(doc4, ref));
    expect(at4.find((m) => m.target === "eres.fire")!.value).toBe(5);

    const doc8 = makeBloodrager(8, "Martyred");
    const at8 = collectModifiers(doc8, ref, buildRollData(doc8, ref));
    expect(at8.find((m) => m.target === "eres.fire")!.value).toBe(10);
  });

  it("Martyred offers a good/evil variant so neutral bloodragers can lock in an aligned damage type", () => {
    expect(bloodragerBloodlineVariantLabel("Martyred", "good")).toBe("Good-aligned");
    expect(bloodragerBloodlineVariantLabel("Martyred", "evil")).toBe("Evil-aligned");
    expect(bloodragerBloodlineVariantLabel("Martyred", undefined)).toBeUndefined();
  });

  it("a level-20 Martyred bloodrager gets all 6 powers, tagged with the bloodline origin", () => {
    expect(bloodlineFeatureNames(makeBloodrager(20, "Martyred"))).toEqual([
      "Ancestral Champion",
      "Ancestral Strikes",
      "Eternal Martyr",
      "Forebear's Reserves",
      "Martyr's Resistances",
      "Sacrificial Exchange",
    ]);
  });

  it("a level-20 Aberrant bloodrager gets all 6 powers, tagged with the bloodline origin", () => {
    expect(bloodlineFeatureNames(makeBloodrager(20, "Aberrant"))).toEqual([
      "Aberrant Form",
      "Aberrant Fortitude",
      "Aberrant Resistance",
      "Abnormal Reach",
      "Staggering Strike",
      "Unusual Anatomy",
    ]);
  });

  it("Aberrant contributes nothing numeric before its capstone — every earlier power is bloodrage-gated", () => {
    const doc16 = makeBloodrager(16, "Aberrant");
    const at16 = collectModifiers(doc16, ref, buildRollData(doc16, ref));
    expect(at16.some((m) => m.sourceId?.startsWith("bloodragerBloodline:"))).toBe(false);
  });

  it("Aberrant Form grants blindsight 60 ft. and +1 DR at 20th, the one power that's always on", () => {
    const doc20 = makeBloodrager(20, "Aberrant");
    const at20 = collectModifiers(doc20, ref, buildRollData(doc20, ref));
    expect(at20.find((m) => m.target === "sensebs")!.value).toBe(60);
    expect(at20.find((m) => m.target === "dr")!.value).toBe(1);
  });

  it("Arcane has no unconditional numeric Changes at any level (all powers are activated/situational)", () => {
    const doc = makeBloodrager(20, "Arcane");
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    expect(mods.some((m) => m.sourceId?.startsWith("bloodragerBloodline:"))).toBe(false);
  });
});

/**
 * 20th-level capstone immunities/senses/DR, newly wired to real Change
 * targets (imm.<type>/immEffect.<slug>/sense*) rather than left display-only.
 * RAW citations live on each entry in `bloodrager-bloodlines.ts`; expected
 * values hand-computed from the quoted text. Every capstone says "constantly,
 * even while not bloodraging", so none of these are gated on the Bloodrage
 * buff.
 */
describe("bloodrager bloodline capstone immunities/senses (20th level)", () => {
  const immune = (doc: CharacterDoc, qualifier: string) =>
    compute(doc, ref).defenses?.immunities?.some((i) => i.qualifier === qualifier) ?? false;
  const effectImmune = (doc: CharacterDoc, qualifier: string) =>
    compute(doc, ref).defenses?.effectImmunities?.some((i) => i.qualifier === qualifier) ?? false;
  const senseRange = (doc: CharacterDoc, kind: string) =>
    compute(doc, ref).senses.find((s) => s.kind === kind)?.range;

  it("Demonic Immunities (Abyssal): immune to electricity and poison", () => {
    // RAW: "you're immune to electricity and poison."
    const doc = makeBloodrager(20, "Abyssal");
    expect(immune(doc, "electricity")).toBe(true);
    expect(effectImmune(doc, "poison")).toBe(true);
  });

  it("Ascension (Celestial): immune to acid and cold (petrification has no matching slug)", () => {
    // RAW: "You gain immunity to acid, cold, and petrification."
    const doc = makeBloodrager(20, "Celestial");
    expect(immune(doc, "acid")).toBe(true);
    expect(immune(doc, "cold")).toBe(true);
  });

  it("Victory or Death (Destined): immune to paralysis (petrification/stunned/dazed/staggered have no matching slugs)", () => {
    // RAW: "You are immune to paralysis and petrification, as well as to the
    // stunned, dazed, and staggered conditions."
    const doc = makeBloodrager(20, "Destined");
    expect(effectImmune(doc, "paralysis")).toBe(true);
  });

  it("Power of Wyrms (Draconic): immune to paralysis, sleep, and your energy type; blindsense 60 (blue → electricity)", () => {
    // RAW: "you gain immunity to paralysis, sleep, and damage from your
    // energy type. You also gain blindsense with a range of 60 feet."
    const doc = makeBloodrager(20, "Draconic", {}, "blue");
    expect(effectImmune(doc, "paralysis")).toBe(true);
    expect(effectImmune(doc, "sleep")).toBe(true);
    expect(immune(doc, "electricity")).toBe(true);
    expect(senseRange(doc, "blindsense")).toBe(60);
    const noVariant = makeBloodrager(20, "Draconic");
    expect(immune(noVariant, "electricity")).toBe(false);
    expect(effectImmune(noVariant, "paralysis")).toBe(true);
  });

  it("Elemental Body: immune to precision damage, critical hits, and your energy type (earth → acid)", () => {
    // RAW: "You gain immunity to sneak attacks, critical hits, and damage
    // from your energy type."
    const doc = makeBloodrager(20, "Elemental", {}, "earth");
    expect(effectImmune(doc, "precisionDamage")).toBe(true);
    expect(effectImmune(doc, "criticalHits")).toBe(true);
    expect(immune(doc, "acid")).toBe(true);
  });

  it("Fiend of the Pit (Infernal): immune to fire and poison, sees in darkness", () => {
    // RAW: "you gain immunity to fire and poison. ... and gain the see in
    // darkness ability."
    const doc = makeBloodrager(20, "Infernal");
    expect(immune(doc, "fire")).toBe(true);
    expect(effectImmune(doc, "poison")).toBe(true);
    expect(compute(doc, ref).senses.some((s) => s.kind === "seeInDarkness")).toBe(true);
  });

  it("One Foot in the Grave (Undead): immune to cold, paralysis, sleep; DR increases to 8", () => {
    // RAW: "you gain immunity to cold, nonlethal damage, paralysis, and
    // sleep. The DR from your damage reduction ability increases to 8."
    const doc = makeBloodrager(20, "Undead");
    expect(immune(doc, "cold")).toBe(true);
    expect(effectImmune(doc, "paralysis")).toBe(true);
    expect(effectImmune(doc, "sleep")).toBe(true);
    expect(compute(doc, ref).defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(8);
  });

  it("Eternal Martyr (Martyred): can't be raised as undead (death effects have no matching slug)", () => {
    // RAW: "You become immune to death effects. ... Your body cannot be
    // turned into an undead creature, as though you were affected by a
    // permanent hallow effect."
    const doc = makeBloodrager(20, "Martyred");
    expect(effectImmune(doc, "undeath")).toBe(true);
  });

  it("Aberrant Form: immune to critical hits and precision damage too (same pair as the sorcerer sibling)", () => {
    // RAW: "You are immune to critical hits and sneak attacks. In addition,
    // you gain blindsight with a range of 60 feet and your bloodrager damage
    // reduction increases by 1."
    const doc = makeBloodrager(20, "Aberrant");
    expect(effectImmune(doc, "criticalHits")).toBe(true);
    expect(effectImmune(doc, "precisionDamage")).toBe(true);
    expect(senseRange(doc, "blindsight")).toBe(60);
    expect(compute(doc, ref).defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(1);
  });
});

describe("bloodrager bloodline resource pools (Destined Strike, Hellfire Strike, ...)", () => {
  it("a Destined bloodrager gets a 3/day Destined Strike pool at 1st level", () => {
    const doc = makeBloodrager(1, "Destined");
    const pools = deriveResourcePools(doc, ref);
    const pool = pools.find((p) => p.name === "Destined Strike");
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(3);
  });

  it("an Infernal bloodrager's Hellfire Strike pool grows from 3/day to 5/day at 12th", () => {
    const doc11 = makeBloodrager(11, "Infernal");
    const at11 = deriveResourcePools(doc11, ref).find((p) => p.name === "Hellfire Strike");
    expect(at11!.max).toBe(3);

    const doc12 = makeBloodrager(12, "Infernal");
    const at12 = deriveResourcePools(doc12, ref).find((p) => p.name === "Hellfire Strike");
    expect(at12!.max).toBe(5);
  });

  it("a Martyred bloodrager's Ancestral Strikes pool grows from 3/day to 5/day at 8th", () => {
    const doc4 = makeBloodrager(4, "Martyred");
    const at4 = deriveResourcePools(doc4, ref).find((p) => p.name === "Ancestral Strikes");
    expect(at4!.max).toBe(3);

    const doc8 = makeBloodrager(8, "Martyred");
    const at8 = deriveResourcePools(doc8, ref).find((p) => p.name === "Ancestral Strikes");
    expect(at8!.max).toBe(5);
  });
});

describe("Bloodrage resource pool + linked buff (issue #65)", () => {
  it("a level-1 bloodrager's Bloodrage pool is 4 + Con mod rounds/day", () => {
    const doc = makeBloodrager(1, undefined, { con: 14 }); // +2 mod
    const pools = deriveResourcePools(doc, ref);
    const pool = pools.find((p) => p.name === "Bloodrage");
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(6); // 4 + 2
  });

  it("the Bloodrage pool grows by 2 rounds/day per level after 1st", () => {
    const doc = makeBloodrager(5, undefined, { con: 14 });
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Bloodrage");
    expect(pool!.max).toBe(14); // 4 + 2 + 2*4
  });

  it("the Bloodrage pool links to the hand-authored Bloodrage buff id (not the vendored Rage buff)", () => {
    const doc = makeBloodrager(1);
    const pool = deriveResourcePools(doc, ref).find((p) => p.name === "Bloodrage");
    expect(pool!.linkedBuffIds).toEqual([BLOODRAGE_BUFF_ID]);
  });
});

describe("BLOODRAGE_BUFF formula (bloodrage.ts)", () => {
  it("grants +4 Str/Con morale, +2 Will morale, -2 AC below 11th level", () => {
    const rollData = buildRollData(makeBloodrager(10), ref);
    expect(evaluateFormula("4 + (floor((@classes.bloodrager.level - 2) / 9) * 2)", rollData)).toBe(
      4,
    );
    expect(evaluateFormula("2 + floor((@classes.bloodrager.level - 2) / 9)", rollData)).toBe(2);
  });

  it("Greater Bloodrage bumps to +6 Str/Con, +3 Will at 11th level", () => {
    const rollData = buildRollData(makeBloodrager(11), ref);
    expect(evaluateFormula("4 + (floor((@classes.bloodrager.level - 2) / 9) * 2)", rollData)).toBe(
      6,
    );
    expect(evaluateFormula("2 + floor((@classes.bloodrager.level - 2) / 9)", rollData)).toBe(3);
  });

  it("Mighty Bloodrage bumps to +8 Str/Con, +4 Will at 20th level", () => {
    const rollData = buildRollData(makeBloodrager(20), ref);
    expect(evaluateFormula("4 + (floor((@classes.bloodrager.level - 2) / 9) * 2)", rollData)).toBe(
      8,
    );
    expect(evaluateFormula("2 + floor((@classes.bloodrager.level - 2) / 9)", rollData)).toBe(4);
  });
});
