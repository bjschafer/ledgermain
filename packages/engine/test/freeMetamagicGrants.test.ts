import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  characterFreeMetamagicGrants,
  compute,
  deriveResourcePools,
  FREE_METAMAGIC_GRANTS,
  freeMetamagicGrantPoolId,
  metamagicDef,
} from "../src/index.js";

/**
 * Per-day pools for the selections that mimic a named metamagic feat
 * (`free-metamagic-grants.ts`). Expected values are read straight off the
 * published text:
 *   - Magus arcana (Ultimate Magic, e.g. Empowered Magic): "the magus can
 *     cast one spell per day as if it were modified by the Empower Spell
 *     feat. This does not increase the casting time or the level of the
 *     spell." One use per day, flat.
 *   - Guiding Star (APG, Heavens mystery; repeated verbatim as the ACG
 *     Heavens spirit hex): "once per night while outdoors, you can cast one
 *     spell as if it were modified by the Empower Spell, Extend Spell, Silent
 *     Spell, or Still Spell feat without increasing the spell's casting time
 *     or level."
 */
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
    identity: { name: "Test", race: raceId("Human"), classes: [] },
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

function pools(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return deriveResourcePools(doc, ref, sheet.abilities);
}

describe("FREE_METAMAGIC_GRANTS", () => {
  it("names only real metamagic feats, with unique pool ids", () => {
    const ids = new Set<string>();
    for (const grant of FREE_METAMAGIC_GRANTS) {
      expect(grant.featSlugs.length).toBeGreaterThan(0);
      for (const slug of grant.featSlugs) expect(metamagicDef(slug)).toBeDefined();
      const poolId = freeMetamagicGrantPoolId(grant);
      expect(ids.has(poolId)).toBe(false);
      ids.add(poolId);
    }
  });

  it("covers the six metamagic arcana Ultimate Magic lists", () => {
    const arcana = FREE_METAMAGIC_GRANTS.filter((g) => g.kind === "magusArcana").map(
      (g) => g.selectionId,
    );
    expect(arcana.sort()).toEqual([
      "empoweredMagic",
      "maximizedMagic",
      "quickenedMagic",
      "reachMagic",
      "silentMagic",
      "stillMagic",
    ]);
  });
});

describe("free-metamagic grant pools", () => {
  it("derives one use per day per selected magus arcanum", () => {
    const doc = baseDoc({
      identity: { name: "Kess", race: raceId("Human"), classes: [{ tag: "magus", level: 12 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        magusArcana: ["empoweredMagic", "maximizedMagic", "arcaneAccuracy"],
      },
    });
    const derived = pools(doc);
    const empowered = derived.find((p) => p.id === "freeMetamagic:magusArcana:empoweredMagic");
    expect(empowered).toMatchObject({
      name: "Empowered Magic",
      max: 1,
      restValue: 1,
      per: "day",
      classTag: "magus",
    });
    expect(derived.some((p) => p.id === "freeMetamagic:magusArcana:maximizedMagic")).toBe(true);
    // Arcane Accuracy spends the Arcane Pool, not a pool of its own.
    expect(derived.some((p) => p.id === "freeMetamagic:magusArcana:arcaneAccuracy")).toBe(false);
  });

  it("derives Guiding Star for the oracle revelation and the shaman hex alike", () => {
    const oracle = baseDoc({
      identity: { name: "Sela", race: raceId("Human"), classes: [{ tag: "oracle", level: 7 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        oracleMystery: "heavens",
        oracleRevelations: ["heavens:guidingStar"],
      },
    });
    expect(
      pools(oracle).find((p) => p.id === "freeMetamagic:oracleRevelation:heavens:guidingStar"),
    ).toMatchObject({ name: "Guiding Star", max: 1, per: "day", classTag: "oracle" });

    const shaman = baseDoc({
      identity: { name: "Bram", race: raceId("Human"), classes: [{ tag: "shaman", level: 7 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        shamanSpirit: "heavens",
        shamanHexes: ["heavens:guidingStar"],
      },
    });
    expect(
      pools(shaman).find((p) => p.id === "freeMetamagic:shamanHex:heavens:guidingStar"),
    ).toMatchObject({ name: "Guiding Star", max: 1, per: "day", classTag: "shaman" });
  });

  it("grants nothing once the granting class is gone from the loadout", () => {
    const doc = baseDoc({
      identity: { name: "Kess", race: raceId("Human"), classes: [{ tag: "fighter", level: 12 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        magusArcana: ["empoweredMagic"],
      },
    });
    expect(characterFreeMetamagicGrants(doc)).toEqual([]);
    expect(pools(doc).some((p) => p.id.startsWith("freeMetamagic:"))).toBe(false);
  });
});
