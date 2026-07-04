import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { deriveResourcePools, resolveClassFeatures } from "../src/index.js";
import { buildRollData, type AbilityView } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeSorcerer(level: number, sorcererBloodline?: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "sorcerer", level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(sorcererBloodline ? { sorcererBloodline } : {}),
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

describe("sorcerer bloodline arcana (collectModifiers)", () => {
  it("a Draconic sorcerer L7 gets +7 HP with provenance", () => {
    const doc = makeSorcerer(7, "Draconic");
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    const hpMods = mods.filter((m) => m.target === "hp");
    expect(hpMods).toHaveLength(1);
    expect(hpMods[0]!.value).toBe(7);
    expect(hpMods[0]!.source).toContain("Draconic");
  });

  it("a Draconic sorcerer L1 gets +1 HP (scales with level, not a flat constant)", () => {
    const doc = makeSorcerer(1, "Draconic");
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    const hpMod = mods.find((m) => m.target === "hp");
    expect(hpMod!.value).toBe(1);
  });

  it("no bloodline chosen grants no bloodline modifiers", () => {
    const doc = makeSorcerer(7);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("bloodline:"))).toBe(false);
  });

  it("an unknown bloodline tag is ignored, not an error", () => {
    const doc = makeSorcerer(7, "NotARealBloodline");
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("bloodline:"))).toBe(false);
  });

  it("a non-sorcerer with a stale bloodline field gets nothing", () => {
    const doc: CharacterDoc = {
      ...makeSorcerer(7, "Draconic"),
      identity: { ...makeSorcerer(7).identity, classes: [{ tag: "fighter", level: 7 }] },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("bloodline:"))).toBe(false);
  });

  it("Abyssal grants an inherent Strength bonus only once level 9 is reached", () => {
    const low = collectModifiers(
      makeSorcerer(8, "Abyssal"),
      ref,
      buildRollData(makeSorcerer(8, "Abyssal"), ref),
    );
    expect(low.some((m) => m.target === "str")).toBe(false);

    const doc9 = makeSorcerer(9, "Abyssal");
    const high = collectModifiers(doc9, ref, buildRollData(doc9, ref));
    const strMod = high.find((m) => m.target === "str");
    expect(strMod).toBeDefined();
    expect(strMod!.value).toBe(2);
    expect(strMod!.type).toBe("inherent");
  });
});

describe("sorcerer bloodline powers (collectGrantedFeatures / resolveClassFeatures)", () => {
  it("a level-1 Draconic sorcerer gets only the 1st-level power", () => {
    expect(bloodlineFeatureNames(makeSorcerer(1, "Draconic"))).toEqual(["Claws"]);
  });

  it("a level-9 Draconic sorcerer gets 1st/3rd/9th-level powers, not 15th/20th", () => {
    expect(bloodlineFeatureNames(makeSorcerer(9, "Draconic"))).toEqual([
      "Breath Weapon",
      "Claws",
      "Dragon Resistances",
    ]);
  });

  it("a level-20 Draconic sorcerer gets all 5 powers, each tagged with the bloodline origin", () => {
    const doc = makeSorcerer(20, "Draconic");
    expect(bloodlineFeatureNames(doc)).toEqual([
      "Breath Weapon",
      "Claws",
      "Dragon Resistances",
      "Power of Wyrms",
      "Wings",
    ]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const claws = classFeatures.find((f) => f.name === "Claws")!;
    expect(claws.origin).toEqual({ kind: "bloodline", label: "Draconic Bloodline" });
    expect(claws.classTag).toBe("sorcerer");
    expect(claws.level).toBe(1);
  });

  it("no bloodline chosen grants no bloodline-origin features", () => {
    expect(bloodlineFeatureNames(makeSorcerer(20))).toEqual([]);
  });

  it("an unknown bloodline tag grants nothing, not an error", () => {
    expect(bloodlineFeatureNames(makeSorcerer(20, "NotARealBloodline"))).toEqual([]);
  });

  it("a non-sorcerer with a stale bloodline field gets nothing", () => {
    const doc: CharacterDoc = {
      ...makeSorcerer(20, "Draconic"),
      identity: { ...makeSorcerer(20).identity, classes: [{ tag: "fighter", level: 20 }] },
    };
    expect(bloodlineFeatureNames(doc)).toEqual([]);
  });
});

describe("sorcerer bloodline power resource pools (deriveResourcePools)", () => {
  it("Elemental Ray surfaces as a pool with max = 3 + Cha mod at 1st level", () => {
    const doc = makeSorcerer(1, "Elemental");
    const abilities: Record<string, AbilityView> = { cha: { base: 18, total: 18, mod: 4 } };
    const pools = deriveResourcePools(doc, ref, abilities);
    const ray = pools.find((p) => p.name === "Elemental Ray");
    expect(ray).toBeDefined();
    expect(ray!.max).toBe(7);
    expect(ray!.per).toBe("day");
    expect(ray!.classTag).toBe("sorcerer");
  });

  it("Elemental Blast is 1/day at 9th, 2/day at 17th, 3/day at 20th", () => {
    const abilities: Record<string, AbilityView> = { cha: { base: 18, total: 18, mod: 4 } };
    const at9 = deriveResourcePools(makeSorcerer(9, "Elemental"), ref, abilities);
    expect(at9.find((p) => p.name === "Elemental Blast")!.max).toBe(1);

    const at17 = deriveResourcePools(makeSorcerer(17, "Elemental"), ref, abilities);
    expect(at17.find((p) => p.name === "Elemental Blast")!.max).toBe(2);

    const at20 = deriveResourcePools(makeSorcerer(20, "Elemental"), ref, abilities);
    expect(at20.find((p) => p.name === "Elemental Blast")!.max).toBe(3);
  });

  it("no bloodline chosen derives no bloodline pools", () => {
    const pools = deriveResourcePools(makeSorcerer(20), ref);
    expect(pools).toEqual([]);
  });
});
