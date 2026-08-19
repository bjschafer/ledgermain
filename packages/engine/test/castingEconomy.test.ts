/**
 * Drift guards and resolution fixtures for the casting-economy adjustment
 * tables (`src/casting-economy/`). Table content ships via the #132 wave;
 * the resolution paths are exercised with injected tables, same posture as
 * `spellLikeAbilities.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_BONUS_KNOWN_SPELLS,
  ARCHETYPE_CASTING_ADJUSTMENTS,
  CHARACTER_TRAIT_CASTING_ADJUSTMENTS,
  CLASS_FEATURE_CASTING_ADJUSTMENTS,
  compute,
  FEAT_CASTING_ADJUSTMENTS,
  RACIAL_TRAIT_CASTING_ADJUSTMENTS,
  RACIAL_TRAITS,
  resolveBonusKnownSpells,
  resolveCastingAdjustments,
  spellIdByName,
  type CastingAdjustmentDef,
  type CastingAdjustmentTables,
} from "../src/index.js";
import { collectGrantedFeatures } from "../src/archetypes.js";
import { featNameSlug } from "../src/feat-effects.js";
import { resolveTraitDef } from "../src/traits.js";

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

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ALL_TABLES: [string, Readonly<Record<string, readonly CastingAdjustmentDef[]>>][] = [
  ["classFeature", CLASS_FEATURE_CASTING_ADJUSTMENTS],
  ["archetypeFeature", ARCHETYPE_CASTING_ADJUSTMENTS],
  ["feat", FEAT_CASTING_ADJUSTMENTS],
  ["characterTrait", CHARACTER_TRAIT_CASTING_ADJUSTMENTS],
  ["racialTrait", RACIAL_TRAIT_CASTING_ADJUSTMENTS],
];

describe("casting-adjustment table drift guards", () => {
  it("every key resolves against its source store", () => {
    const featSlugs = new Set(Object.values(ref.feats).map((f) => featNameSlug(f.name)));
    for (const key of Object.keys(CLASS_FEATURE_CASTING_ADJUSTMENTS)) {
      expect(ref.classFeatures[key], `classFeature key ${key} not vendored`).toBeDefined();
    }
    for (const key of Object.keys(ARCHETYPE_CASTING_ADJUSTMENTS)) {
      expect(ref.archetypeFeatures[key], `archetypeFeature key ${key} not vendored`).toBeDefined();
    }
    for (const key of Object.keys(FEAT_CASTING_ADJUSTMENTS)) {
      expect(featSlugs.has(key), `feat key ${key} matches no vendored feat slug`).toBe(true);
    }
    for (const key of Object.keys(CHARACTER_TRAIT_CASTING_ADJUSTMENTS)) {
      expect(resolveTraitDef(key, ref), `characterTrait key ${key} unresolvable`).toBeDefined();
    }
    for (const key of Object.keys(RACIAL_TRAIT_CASTING_ADJUSTMENTS)) {
      expect(
        ref.racialTraits[key] !== undefined || RACIAL_TRAITS[key] !== undefined,
        `racialTrait key ${key} unresolvable`,
      ).toBe(true);
    }
  });

  it("defs are sane: kebab unique slugs, nonzero integer deltas, valid levels, classTag where required", () => {
    for (const [table, entries] of ALL_TABLES) {
      for (const [key, defs] of Object.entries(entries)) {
        expect(defs.length, `${table}:${key} has an empty def list`).toBeGreaterThan(0);
        const slugs = new Set<string>();
        for (const def of defs) {
          expect(def.slug, `${table}:${key}: slug not kebab-case`).toMatch(KEBAB);
          expect(slugs.has(def.slug), `${table}:${key}: duplicate slug ${def.slug}`).toBe(false);
          slugs.add(def.slug);
          expect(
            Number.isInteger(def.delta) && def.delta !== 0,
            `${table}:${key}:${def.slug}: bad delta`,
          ).toBe(true);
          if (def.spellLevels !== "each") {
            expect(
              def.spellLevels.length,
              `${table}:${key}:${def.slug}: empty levels`,
            ).toBeGreaterThan(0);
            for (const level of def.spellLevels) {
              expect(
                Number.isInteger(level) && level >= 0 && level <= 9,
                `${table}:${key}:${def.slug}: bad level ${level}`,
              ).toBe(true);
            }
          }
          if (table === "feat" || table === "characterTrait" || table === "racialTrait") {
            expect(def.classTag, `${table}:${key}:${def.slug}: classTag required`).toBeDefined();
          }
        }
      }
    }
  });
});

describe("resolution paths (injected tables)", () => {
  const emptyTables: CastingAdjustmentTables = {
    classFeature: {},
    archetypeFeature: {},
    feat: {},
    characterTrait: {},
    racialTrait: {},
  };

  it("class-feature defs default classTag to the granting class and gate minLevel on its level", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "cleric", level: 4 }] },
    });
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.length).toBeGreaterThan(0);
    const featureId = granted[0]!.grant.featureId;
    const tables: CastingAdjustmentTables = {
      ...emptyTables,
      classFeature: {
        [featureId]: [
          { slug: "extra-slot", kind: "slots", spellLevels: [1], delta: 1 },
          { slug: "late-slot", kind: "slots", spellLevels: [2], delta: 1, minLevel: 5 },
        ],
      },
    };
    const adjs = resolveCastingAdjustments(doc, ref, tables);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]!.id).toBe(`castadj:${featureId}:extra-slot`);
    expect(adjs[0]!.classTag).toBe("cleric");
    expect(adjs[0]!.spellLevels).toEqual([1]);
  });

  it("archetype defs gate on the archetype being chosen and its feature level", () => {
    const af = Object.values(ref.archetypeFeatures).find((f) => f.level === 3);
    expect(af).toBeDefined();
    const tables: CastingAdjustmentTables = {
      ...emptyTables,
      archetypeFeature: {
        [af!.id]: [{ slug: "fewer-known", kind: "known", spellLevels: "each", delta: -1 }],
      },
    };
    const withArchetype = (level: number) =>
      baseDoc({
        identity: {
          name: "Test",
          race: raceId("Human"),
          classes: [{ tag: af!.classTag, level }],
        },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [af!.archetypeId],
        },
      });
    expect(resolveCastingAdjustments(withArchetype(2), ref, tables)).toEqual([]);
    const adjs = resolveCastingAdjustments(withArchetype(3), ref, tables);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]!.classTag).toBe(af!.classTag);
    expect(adjs[0]!.spellLevels).toBe("each");
    expect(adjs[0]!.delta).toBe(-1);
    // Not chosen → nothing, even at level.
    const noArch = baseDoc({
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: af!.classTag, level: 3 }] },
    });
    expect(resolveCastingAdjustments(noArch, ref, tables)).toEqual([]);
  });

  it("feat defs require classTag, apply once for duplicate copies, and gate on character level", () => {
    const feat = Object.values(ref.feats)[0]!;
    const slug = featNameSlug(feat.name);
    const tables: CastingAdjustmentTables = {
      ...emptyTables,
      feat: {
        [slug]: [
          { slug: "with-class", kind: "slots", spellLevels: [1], delta: 1, classTag: "sorcerer" },
          { slug: "no-class", kind: "slots", spellLevels: [1], delta: 1 },
          {
            slug: "too-high",
            kind: "slots",
            spellLevels: [1],
            delta: 1,
            classTag: "sorcerer",
            minLevel: 9,
          },
        ],
      },
    };
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [
          { tag: "sorcerer", level: 3 },
          { tag: "fighter", level: 2 },
        ],
      },
      build: {
        feats: [feat.id, feat.id],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const adjs = resolveCastingAdjustments(doc, ref, tables);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]!.id).toBe(`castadj:feat:${slug}:with-class`);
    expect(adjs[0]!.classTag).toBe("sorcerer");
    expect(adjs[0]!.source).toBe(feat.name);
  });

  it("character-trait defs resolve merged-catalog ids; compute() emits the sheet field only when non-empty", () => {
    const traitId = Object.keys(ref.traits)[0]!;
    const tables: CastingAdjustmentTables = {
      ...emptyTables,
      characterTrait: {
        [traitId]: [
          { slug: "bonus-slot", kind: "slots", spellLevels: [1], delta: 1, classTag: "bard" },
        ],
      },
    };
    const doc = baseDoc({
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        traits: [traitId],
      },
    });
    const adjs = resolveCastingAdjustments(doc, ref, tables);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]!.source).toBe(resolveTraitDef(traitId, ref)!.name);

    // Real tables are consulted by compute(); with none matching, the sheet
    // field is omitted entirely.
    const sheet = compute(baseDoc({}), ref);
    if (sheet.castingAdjustments !== undefined) {
      expect(sheet.castingAdjustments.length).toBeGreaterThan(0);
    }
  });
});

describe("bonus-known-spell table drift guards", () => {
  it("keys resolve, spells resolve, levels are sane", () => {
    for (const [key, def] of Object.entries(ARCHETYPE_BONUS_KNOWN_SPELLS)) {
      expect(ref.archetypeFeatures[key], `bonus-known key ${key} not vendored`).toBeDefined();
      expect(def.spells.length, `bonus-known ${key}: empty spell list`).toBeGreaterThan(0);
      for (const grant of def.spells) {
        expect(
          spellIdByName(ref, grant.spell),
          `bonus-known ${key}: unresolvable spell "${grant.spell}"`,
        ).toBeDefined();
        expect(
          Number.isInteger(grant.atLevel) && grant.atLevel >= 1 && grant.atLevel <= 20,
          `bonus-known ${key}: bad atLevel ${grant.atLevel}`,
        ).toBe(true);
        if (grant.spellLevel !== undefined) {
          expect(
            Number.isInteger(grant.spellLevel) && grant.spellLevel >= 0 && grant.spellLevel <= 9,
            `bonus-known ${key}: bad spellLevel ${grant.spellLevel}`,
          ).toBe(true);
        }
      }
      if (def.replacesMysteryBonusSpellLevels !== undefined) {
        expect(
          ref.archetypeFeatures[key]!.classTag,
          `bonus-known ${key}: mystery replacement on a non-oracle feature`,
        ).toBe("oracle");
      }
    }
  });
});

describe("resolveBonusKnownSpells (injected table)", () => {
  it("gates on archetype + atLevel, resolves ids and class-list levels, unions replaced levels", () => {
    const af = Object.values(ref.archetypeFeatures).find(
      (f) => f.classTag === "oracle" && f.level <= 2,
    );
    expect(af).toBeDefined();
    const cureId = spellIdByName(ref, "Cure Light Wounds");
    expect(cureId).toBeDefined();
    const table = {
      [af!.id]: {
        spells: [
          { spell: "Cure Light Wounds", atLevel: 2 },
          { spell: "Cure Light Wounds", atLevel: 10 },
        ],
        replacesMysteryBonusSpellLevels: [2, 4],
      },
    };
    const withOracle = (level: number) =>
      baseDoc({
        identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "oracle", level }] },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [af!.archetypeId],
        },
      });
    const resolved = resolveBonusKnownSpells(withOracle(4), ref, table);
    expect(resolved).toBeDefined();
    // The atLevel-10 copy is not yet gained at oracle 4.
    expect(resolved!.spells).toHaveLength(1);
    expect(resolved!.spells[0]!.spellId).toBe(cureId!);
    expect(resolved!.spells[0]!.classTag).toBe("oracle");
    // Cure Light Wounds is a 1st-level oracle (cleric-list) spell.
    expect(resolved!.spells[0]!.level).toBe(1);
    expect(resolved!.mysteryReplacedLevels).toEqual([2, 4]);

    // Archetype not chosen → nothing.
    const noArch = baseDoc({
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "oracle", level: 4 }] },
    });
    expect(resolveBonusKnownSpells(noArch, ref, table)).toBeUndefined();
  });
});
