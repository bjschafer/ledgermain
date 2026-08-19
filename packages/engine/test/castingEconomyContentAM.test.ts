/**
 * Hand-computed fixtures for the #132 casting-economy content wave, classes
 * A-M (`archetypesAM.ts` / `bonus-knownAM.ts`). Drift guards and the generic
 * resolution-path mechanics already live in `castingEconomy.test.ts`; this
 * file only exercises the real wired tables against real vendored data.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_CASTING_ADJUSTMENTS_AM,
  compute,
  resolveBonusKnownSpells,
  resolveCastingAdjustments,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "bard", level: 3 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 11 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...over,
  } as CharacterDoc;
}

function docWith(
  classTag: string,
  level: number,
  archetypeId: string,
  extra?: Partial<CharacterDoc["build"]>,
): CharacterDoc {
  return baseDoc({
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: classTag, level }] },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: [archetypeId],
      ...extra,
    },
  });
}

describe("Diminished Spellcasting family (kind: slots)", () => {
  // CRB magus spells-per-day table: a 4th-level magus has 3/1 slots (1st/2nd
  // level). Diminished Spellcasting cuts each level by 1, uniformly.
  it("magus esoteric: -1 slot of each level", () => {
    const doc = docWith("magus", 4, "magus:esoteric");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({
      kind: "slots",
      classTag: "magus",
      spellLevels: "each",
      delta: -1,
    });
  });

  it("all seven magus Diminished Spellcasting archetypes resolve to the same -1/level slot cut", () => {
    const magusArchetypes = [
      "magus:esoteric",
      "magus:iron-ring-striker",
      "magus:kapenia-dancer",
      "magus:kensai",
      "magus:myrmidarch",
      "magus:skirnir",
      "magus:soul-forger",
    ];
    for (const archetypeId of magusArchetypes) {
      const doc = docWith("magus", 5, archetypeId);
      const adjs = resolveCastingAdjustments(doc, ref);
      expect(adjs, archetypeId).toHaveLength(1);
      expect(adjs[0], archetypeId).toMatchObject({ kind: "slots", delta: -1, spellLevels: "each" });
    }
  });

  it("bard arrowsong-minstrel: -1 slot of each level", () => {
    const doc = docWith("bard", 5, "bard:arrowsong-minstrel");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({ kind: "slots", classTag: "bard", delta: -1 });
  });

  it("cleric angelfire-apostle / cloistered-cleric / crusader each cut -1 slot of each level", () => {
    for (const archetypeId of [
      "cleric:angelfire-apostle",
      "cleric:cloistered-cleric",
      "cleric:crusader",
    ]) {
      const doc = docWith("cleric", 6, archetypeId);
      const adjs = resolveCastingAdjustments(doc, ref);
      expect(adjs, archetypeId).toHaveLength(1);
      expect(adjs[0], archetypeId).toMatchObject({ kind: "slots", classTag: "cleric", delta: -1 });
    }
  });

  it("cleric mendevian-priest (same feature name, no slot cut) grants nothing", () => {
    const doc = docWith("cleric", 6, "cleric:mendevian-priest");
    expect(resolveCastingAdjustments(doc, ref)).toEqual([]);
  });

  it("druid survivor: -1 slot of each level", () => {
    const doc = docWith("druid", 4, "druid:survivor");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({ kind: "slots", classTag: "druid", delta: -1 });
  });

  it("mesmerist umbral-mesmerist: -1 slot of each level", () => {
    const doc = docWith("mesmerist", 5, "mesmerist:umbral-mesmerist");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({ kind: "slots", classTag: "mesmerist", delta: -1 });
  });

  it("alchemist energy-scientist Limited Extracts: -1 extract slot of each level", () => {
    const doc = docWith("alchemist", 4, "alchemist:energy-scientist");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({ kind: "slots", classTag: "alchemist", delta: -1 });
  });
});

describe("known-count edits (kind: known)", () => {
  it("bloodrager bloody-knuckled-rowdy Reduced Spells Known: -1 known of each level", () => {
    const doc = docWith("bloodrager", 3, "bloodrager:bloody-knuckled-rowdy");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({ kind: "known", classTag: "bloodrager", delta: -1 });
  });

  it("medium rivethun-spirit-channeler Mind and Soul: -1 known of each level", () => {
    const doc = docWith("medium", 3, "medium:rivethun-spirit-channeler");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]).toMatchObject({ kind: "known", classTag: "medium", delta: -1 });
  });
});

describe("arcanist eldritch-font Font of Power: paired slots+prepared edit", () => {
  it("gains +1 slot AND -1 prepared of each level from the same feature", () => {
    const doc = docWith("arcanist", 3, "arcanist:eldritch-font");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(2);
    const slots = adjs.find((a) => a.kind === "slots");
    const prepared = adjs.find((a) => a.kind === "prepared");
    expect(slots).toMatchObject({ classTag: "arcanist", delta: 1, spellLevels: "each" });
    expect(prepared).toMatchObject({ classTag: "arcanist", delta: -1, spellLevels: "each" });
  });
});

describe("fixed bonus-known-spell schedules", () => {
  it("bard brazen-deceiver: knows Invoke Vyriavaxus' 2nd- and 6th-level grants at bard 6, not the 10th", () => {
    const doc = docWith("bard", 6, "bard:brazen-deceiver");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    const names = resolved!.spells.map((s) => s.name).sort();
    expect(names).toEqual(["Bleed", "Darkness", "Darkvision", "Touch of Fatigue"]);
    expect(
      resolved!.spells.every((s) => s.name !== "Shadow Conjuration" && s.name !== "Shadow Step"),
    ).toBe(true);
    const darkness = resolved!.spells.find((s) => s.name === "Darkness")!;
    expect(darkness.level).toBe(2);
    expect(darkness.classTag).toBe("bard");
  });

  it("bard brazen-deceiver at 18th: the greater shadow grants resolve as 6th-level bard spells known", () => {
    const doc = docWith("bard", 18, "bard:brazen-deceiver");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    const names = resolved!.spells.map((s) => s.name);
    expect(names).toContain("Shadow Conjuration, Greater");
    expect(names).toContain("Shadow Evocation, Greater");
    const greaterConj = resolved!.spells.find((s) => s.name === "Shadow Conjuration, Greater")!;
    expect(greaterConj.level).toBe(6);
  });

  it("bard flamesinger: Summon Monster I and II both land at 4th level, III not yet at 6th", () => {
    const doc = docWith("bard", 6, "bard:flamesinger");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    const names = resolved!.spells.map((s) => s.name).sort();
    expect(names).toEqual(["Summon Monster I", "Summon Monster II"]);
  });

  it("bard flamesinger at 16th: the full Summon Monster I-VI schedule is known", () => {
    const doc = docWith("bard", 16, "bard:flamesinger");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    expect(resolved!.spells).toHaveLength(6);
    const sixth = resolved!.spells.find((s) => s.name === "Summon Monster VI")!;
    expect(sixth.level).toBe(6);
  });

  it("mesmerist projectionist: only the levels reached so far are forced-known", () => {
    const doc = docWith("mesmerist", 7, "mesmerist:projectionist");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    const names = resolved!.spells.map((s) => s.name).sort();
    expect(names).toEqual(["Enter Image", "Object Possession, Lesser"]);
    expect(resolved!.spells.find((s) => s.name === "Enter Image")!.level).toBe(2);
    expect(resolved!.spells.find((s) => s.name === "Object Possession, Lesser")!.level).toBe(3);
  });

  it("mesmerist projectionist at 16th: Object Possession, Greater is added off-list as a 6th-level spell", () => {
    const doc = docWith("mesmerist", 16, "mesmerist:projectionist");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    const greater = resolved!.spells.find((s) => s.name === "Object Possession, Greater")!;
    expect(greater).toBeDefined();
    expect(greater.level).toBe(6);
  });

  it("investigator ruthless-agent: Discern Lies known as a 3rd-level extract at investigator 7", () => {
    const doc = docWith("investigator", 7, "investigator:ruthless-agent");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    expect(resolved!.spells).toHaveLength(1);
    expect(resolved!.spells[0]).toMatchObject({
      name: "Discern Lies",
      level: 3,
      classTag: "investigator",
    });

    // Not yet reached at investigator 6.
    const early = docWith("investigator", 6, "investigator:ruthless-agent");
    expect(resolveBonusKnownSpells(early, ref)).toBeUndefined();
  });
});

describe("residue: RESTRICTED domain-slot grants stay out of the generic tables", () => {
  it("cleric channeler-of-the-unknown's domain-slot doubling is not wired as a generic slot adjustment", () => {
    expect(
      ARCHETYPE_CASTING_ADJUSTMENTS_AM["cleric:channeler-of-the-unknown:power-of-the-unknown:1"],
    ).toBeUndefined();
    const doc = docWith("cleric", 5, "cleric:channeler-of-the-unknown");
    expect(resolveCastingAdjustments(doc, ref)).toEqual([]);
  });
});

describe("compute() integration", () => {
  it("emits castingAdjustments and bonusKnownSpells on the derived sheet for a magus esoteric", () => {
    const doc = docWith("magus", 4, "magus:esoteric");
    const sheet = compute(doc, ref);
    expect(sheet.castingAdjustments).toBeDefined();
    expect(sheet.castingAdjustments!.some((a) => a.kind === "slots" && a.delta === -1)).toBe(true);
  });

  it("emits bonusKnownSpells for a projectionist mesmerist", () => {
    const doc = docWith("mesmerist", 7, "mesmerist:projectionist");
    const sheet = compute(doc, ref);
    expect(sheet.bonusKnownSpells).toBeDefined();
    expect(sheet.bonusKnownSpells!.spells.map((s) => s.name).sort()).toEqual([
      "Enter Image",
      "Object Possession, Lesser",
    ]);
  });
});
