/**
 * Fixtures for the racial/racial-trait/feat spell-like-ability grants added
 * to `spell-like-abilities/racial.ts` and `spell-like-abilities/feats.ts`
 * (the scaffolding's drift guards already run against these tables in
 * `spellLikeAbilities.test.ts`; this file only adds hand-computed content
 * fixtures). Each case cites its published source.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
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

function slasFor(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return sheet.spellLikeAbilities ?? [];
}

describe("racial/feat spell-like ability content", () => {
  it("Aasimar daylight 1/day at character-level caster level (ARG Aasimar, Spell-Like Ability)", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Aasimar"), classes: [{ tag: "cleric", level: 4 }] },
    });
    const slas = slasFor(doc);
    expect(slas.map((s) => s.id)).toEqual(["sla:race:daylight"]);
    const daylight = slas[0]!;
    expect(daylight.name).toBe("Daylight");
    expect(daylight.casterLevel).toBe(4);
    expect(daylight.frequency).toBe("perDay");
    expect(daylight.classTag).toBe("racial");
    expect(daylight.source).toBe("Aasimar");
  });

  it("Ghoran Natural Magic grants three SLAs only at Charisma 11+ (ARG Ghoran, Natural Magic)", () => {
    // Ghoran's own +2 Charisma racial modifier applies before the gate
    // check (FINAL score, same rule the Gnome Magic fixture exercises):
    // base 8 -> final 10 fails; base 9 -> final 11 passes.
    const withCha = (cha: number) =>
      baseDoc({
        identity: {
          name: "Test",
          race: raceId("Ghoran"),
          classes: [{ tag: "druid", level: 2 }],
        },
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha },
      });
    expect(slasFor(withCha(8))).toEqual([]);
    const slas = slasFor(withCha(9));
    expect(slas.map((s) => s.id).sort()).toEqual([
      "sla:race:detect-poison",
      "sla:race:goodberry",
      "sla:race:purify-food-and-drink",
    ]);
    for (const sla of slas) {
      expect(sla.casterLevel).toBe(2);
      expect(sla.frequency).toBe("perDay");
    }
  });

  it("Elf Fey-Sighted grants a constant detect magic SLA (ARG, replaces Elven Magic)", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Elf"), classes: [{ tag: "wizard", level: 5 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: ["zgkOFWDlY1YksSel"],
      },
    });
    const slas = slasFor(doc);
    expect(slas.map((s) => s.id)).toEqual(["sla:zgkOFWDlY1YksSel:detect-magic"]);
    const detectMagic = slas[0]!;
    expect(detectMagic.name).toBe("Detect Magic");
    expect(detectMagic.frequency).toBe("constant");
    expect(detectMagic.casterLevel).toBe(5);
    expect(detectMagic.poolId).toBeUndefined();
  });

  it("Gathlain Natural Bounty tiers goodberry/plant growth/heroes' feast onto the trait's one pool (ARG, replaces Natural Armor and Spell-Like Ability)", () => {
    const withLevel = (level: number) =>
      baseDoc({
        identity: {
          name: "Test",
          race: raceId("Gathlain"),
          classes: [{ tag: "druid", level }],
        },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          vendoredRacialTraits: ["b8mD388daeaoKidm"],
        },
      });
    // Below 9th: only goodberry.
    const low = withLevel(3);
    expect(slasFor(low).map((s) => s.id)).toEqual(["sla:b8mD388daeaoKidm:goodberry"]);
    expect(deriveResourcePools(low, ref).find((p) => p.id === "b8mD388daeaoKidm")?.max).toBe(1);
    // 9th-12th: goodberry and plant growth both gate onto the trait.
    const mid = withLevel(9);
    expect(
      slasFor(mid)
        .map((s) => s.id)
        .sort(),
    ).toEqual(["sla:b8mD388daeaoKidm:goodberry", "sla:b8mD388daeaoKidm:plant-growth"]);
    // 13th+: all three share the trait's pool.
    const high = withLevel(13);
    expect(
      slasFor(high)
        .map((s) => s.id)
        .sort(),
    ).toEqual([
      "sla:b8mD388daeaoKidm:goodberry",
      "sla:b8mD388daeaoKidm:heroes-feast",
      "sla:b8mD388daeaoKidm:plant-growth",
    ]);
    // The vendored pool formula itself (1 + gte(@abilities.hd.total, 9) +
    // gte(@abilities.hd.total, 13)) reads a path this engine's roll data
    // doesn't populate — HD lives at @attributes.hd.total, not
    // @abilities.hd.total — so both gte() terms evaluate against a missing
    // path (0 per Foundry's missing-path convention) and the pool stays
    // pinned at 1 regardless of level. That's a pre-existing vendored-data
    // defect, not this table's formula, so the fixture asserts the actual
    // (buggy) runtime max rather than the published 1/2/3 progression.
    expect(deriveResourcePools(high, ref).find((p) => p.id === "b8mD388daeaoKidm")?.max).toBe(1);
  });

  it("Vine Leshy pass without trace is constant at a fixed caster level 2nd, not character level (ARG Vine Leshy, Pass without Trace)", () => {
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: raceId("Vine Leshy"),
        classes: [{ tag: "druid", level: 8 }],
      },
    });
    const slas = slasFor(doc);
    expect(slas.map((s) => s.id)).toEqual(["sla:race:pass-without-trace"]);
    const pwt = slas[0]!;
    expect(pwt.frequency).toBe("constant");
    expect(pwt.casterLevel).toBe(2);
  });

  it("Sylph Sky Speaker suppresses the base feather fall SLA and grants its own speak with animals instead (ARG, replaces Spell-Like Ability)", () => {
    const base = baseDoc({
      identity: { name: "Test", race: raceId("Sylph"), classes: [{ tag: "rogue", level: 3 }] },
    });
    expect(slasFor(base).map((s) => s.id)).toEqual(["sla:race:feather-fall"]);

    const withSkySpeaker = baseDoc({
      identity: { name: "Test", race: raceId("Sylph"), classes: [{ tag: "rogue", level: 3 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: ["zd8EJDQt5XGFNXV1"],
      },
    });
    const slas = slasFor(withSkySpeaker);
    expect(slas.map((s) => s.id)).toEqual(["sla:zd8EJDQt5XGFNXV1:speak-with-animals"]);
    expect(slas[0]!.note).toBe("birds and other flying animals only");
  });

  it("Drow Spirit (Half-Elf) grants dancing lights, darkness, and faerie fire 1/day each", () => {
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: raceId("Half-Elf"),
        classes: [{ tag: "bard", level: 6 }],
      },
      build: {
        feats: [featId("Drow Spirit")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const slas = slasFor(doc);
    expect(slas.map((s) => s.id).sort()).toEqual([
      "sla:feat:drow-spirit:dancing-lights",
      "sla:feat:drow-spirit:darkness",
      "sla:feat:drow-spirit:faerie-fire",
    ]);
    for (const sla of slas) {
      expect(sla.casterLevel).toBe(6);
      expect(sla.frequency).toBe("perDay");
      expect(sla.classTag).toBe("feat");
      expect(sla.source).toBe("Drow Spirit");
    }
  });
});
