import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { deriveResourcePools, resolveClassFeatures } from "../src/index.js";
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

  it("Draconic's natural armor bonus is a flat +1 once 4th level is reached", () => {
    const low = collectModifiers(
      makeBloodrager(3, "Draconic"),
      ref,
      buildRollData(makeBloodrager(3, "Draconic"), ref),
    );
    expect(low.some((m) => m.target === "nac")).toBe(false);

    const doc4 = makeBloodrager(4, "Draconic");
    const high = collectModifiers(doc4, ref, buildRollData(doc4, ref));
    const nacMod = high.find((m) => m.target === "nac");
    expect(nacMod).toBeDefined();
    expect(nacMod!.value).toBe(1);
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

  it("Arcane has no unconditional numeric Changes at any level (all powers are activated/situational)", () => {
    const doc = makeBloodrager(20, "Arcane");
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    expect(mods.some((m) => m.sourceId?.startsWith("bloodragerBloodline:"))).toBe(false);
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
