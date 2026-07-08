import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  babForLevels,
  compute,
  deriveResourcePools,
  hypnoticStarePenalty,
  painfulStareBonus,
  saveForLevels,
} from "../src/index.js";

/**
 * Hand-computed fixtures for the three Occult Adventures 6-level psychic
 * casters (Mesmerist/Cha, Occultist/Int, Spiritualist/Wis) — BAB/saves (both
 * generic, driven off the vendored `classes.json` bab/saves tiers, no
 * per-class engine code needed), plus the class-specific bits: Painful
 * Stare/Hypnotic Stare display details (mesmerist), the Mental Focus/
 * Mesmerist Tricks resource pools (both ride the generic vendored
 * `uses.maxFormula` pipeline for free), and Consummate Liar's Bluff bonus
 * (rides the generic vendored `changes[]` pipeline for free). RefData is
 * always looked up by `tag`, never bare class `name` (a prior wave hit a
 * name-collision bug doing the latter).
 */
const ref = loadRefData();

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  skillRanks?: Record<string, number>;
}): CharacterDoc {
  const humanId = Object.entries(ref.races).find(([, r]) => r.name === "Human")![0];
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: humanId,
      classes: over.classes,
    },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
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

describe("Occult Adventures classes are vendored with the expected BAB/save tiers", () => {
  it("mesmerist: med BAB, fort=low/ref=high/will=high", () => {
    const def = Object.values(ref.classes).find((c) => c.tag === "mesmerist");
    expect(def).toBeDefined();
    expect(def!.bab).toBe("med");
    expect(def!.saves).toEqual({ fort: "low", ref: "high", will: "high" });
  });

  it("occultist: med BAB, fort=high/ref=low/will=high", () => {
    const def = Object.values(ref.classes).find((c) => c.tag === "occultist");
    expect(def).toBeDefined();
    expect(def!.bab).toBe("med");
    expect(def!.saves).toEqual({ fort: "high", ref: "low", will: "high" });
  });

  it("spiritualist: med BAB, fort=high/ref=low/will=high", () => {
    const def = Object.values(ref.classes).find((c) => c.tag === "spiritualist");
    expect(def).toBeDefined();
    expect(def!.bab).toBe("med");
    expect(def!.saves).toEqual({ fort: "high", ref: "low", will: "high" });
  });
});

describe("compute(): mesmerist L5 (Cha 16)", () => {
  const doc = makeDoc({
    classes: [{ tag: "mesmerist", level: 5 }],
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 16 },
    skillRanks: { blf: 5 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(babForLevels("med", 5));
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort low + Con mod (+2), Ref high + Dex mod (+5), Will high + Wis mod + Towering Ego/Cha mod (+7)", () => {
    // Con +1, Dex +1, Wis +0: fort=1+1=2, ref=4+1=5.
    // Will also picks up "Towering Ego" (a real mesmerist L2 class feature,
    // vendored `changes[]`: untyped bonus = @abilities.cha.mod) on top of the
    // base save + Wis mod: will = 4 (base) + 0 (wis) + 3 (cha mod, Towering
    // Ego) = 7.
    expect(sheet.saves.fort.total).toBe(saveForLevels("low", 5) + 1);
    expect(sheet.saves.ref.total).toBe(saveForLevels("high", 5) + 1);
    expect(sheet.saves.will.total).toBe(saveForLevels("high", 5) + 0 + 3);
    expect(sheet.saves.fort.total).toBe(2);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(7);
  });

  it("Consummate Liar: Bluff gets ranks + Cha mod + class-skill bonus + max(1, floor(level/2))", () => {
    // 5 ranks + cha3 + classSkill3 + max(1, floor(5/2))=2 => 13.
    expect(sheet.skills.blf!.total).toBe(13);
    expect(sheet.skills.blf!.classSkill).toBe(true);
  });

  it("Painful Stare class feature carries a hand-authored display detail", () => {
    const feature = sheet.classFeatures.find((f) => f.name === "Painful Stare");
    expect(feature).toBeDefined();
    expect(painfulStareBonus(5)).toBe(2);
    expect(feature?.detail).toBe("+2 dmg vs. stared target");
  });

  it("Hypnotic Stare class feature carries a hand-authored display detail (-2 below 8th level)", () => {
    const feature = sheet.classFeatures.find((f) => f.name === "Hypnotic Stare");
    expect(feature).toBeDefined();
    expect(feature?.detail).toBe(`-${hypnoticStarePenalty(5)} Will save on stared target`);
    expect(feature?.detail).toBe("-2 Will save on stared target");
  });

  it("Mesmerist Tricks resource pool: max(1, floor(level/2)) + Cha mod", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const tricks = pools.find((p) => p.name === "Mesmerist Tricks");
    expect(tricks).toBeDefined();
    expect(tricks?.max).toBe(5); // max(1, floor(5/2))=2, +3 cha = 5
    expect(tricks?.per).toBe("day");
  });
});

describe("compute(): mesmerist L8 — Hypnotic Stare escalates to -3", () => {
  const doc = makeDoc({
    classes: [{ tag: "mesmerist", level: 8 }],
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 14 },
  });
  const sheet = compute(doc, ref);

  it("Hypnotic Stare detail reads -3 at 8th level", () => {
    const feature = sheet.classFeatures.find((f) => f.name === "Hypnotic Stare");
    expect(feature?.detail).toBe("-3 Will save on stared target");
  });

  it("Painful Stare detail reads +4 (1/2 of 8)", () => {
    const feature = sheet.classFeatures.find((f) => f.name === "Painful Stare");
    expect(feature?.detail).toBe("+4 dmg vs. stared target");
  });
});

describe("compute(): occultist L6 (Int 18)", () => {
  const doc = makeDoc({
    classes: [{ tag: "occultist", level: 6 }],
    abilities: { str: 10, dex: 12, con: 12, int: 18, wis: 10, cha: 10 },
  });
  const sheet = compute(doc, ref);

  it("BAB +4 (3/4 progression: floor(6*3/4))", () => {
    expect(sheet.bab).toBe(babForLevels("med", 6));
    expect(sheet.bab).toBe(4);
  });

  it("saves: Fort high + Con mod (+6), Ref low + Dex mod (+3), Will high + Wis mod (+5)", () => {
    // Con +1, Dex +1, Wis +0: fort=5+1=6, ref=2+1=3, will=5+0=5.
    expect(sheet.saves.fort.total).toBe(saveForLevels("high", 6) + 1);
    expect(sheet.saves.ref.total).toBe(saveForLevels("low", 6) + 1);
    expect(sheet.saves.will.total).toBe(saveForLevels("high", 6) + 0);
    expect(sheet.saves.fort.total).toBe(6);
    expect(sheet.saves.ref.total).toBe(3);
    expect(sheet.saves.will.total).toBe(5);
  });

  it("Mental Focus resource pool: occultist level + Int mod", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const focus = pools.find((p) => p.name === "Mental Focus");
    expect(focus).toBeDefined();
    expect(focus?.max).toBe(10); // 6 + 4
    expect(focus?.per).toBe("day");
  });
});

describe("compute(): spiritualist L4 (Wis 14)", () => {
  const doc = makeDoc({
    classes: [{ tag: "spiritualist", level: 4 }],
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 14, cha: 10 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 progression: floor(4*3/4))", () => {
    expect(sheet.bab).toBe(babForLevels("med", 4));
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort high + Con mod (+5), Ref low + Dex mod (+2), Will high + Wis mod (+6)", () => {
    // Con +1, Dex +1, Wis +2: fort=4+1=5, ref=1+1=2, will=4+2=6.
    expect(sheet.saves.fort.total).toBe(saveForLevels("high", 4) + 1);
    expect(sheet.saves.ref.total).toBe(saveForLevels("low", 4) + 1);
    expect(sheet.saves.will.total).toBe(saveForLevels("high", 4) + 2);
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.ref.total).toBe(2);
    expect(sheet.saves.will.total).toBe(6);
  });
});
