/**
 * Drift guards and fixtures for the spell-like-ability grant tables
 * (`spell-like-abilities/`). Guards: every def's spell name must resolve
 * against the vendored spell slice, slugs are kebab-case and unique within
 * their source, each def carries exactly one metering shape, and every
 * table key resolves to a real store entry (with a real uses surface when
 * the def attaches to it). Fixtures are hand-computed against the published
 * racial text (CRB Gnome Magic, ARG tiefling, Blood of Fiends heritages,
 * Blood of the Night dhampir).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_SLA_GRANTS,
  ARCHETYPE_SLA_GRANTS_AM,
  ARCHETYPE_SLA_GRANTS_NZ,
  CLASS_FEATURE_SLA_GRANTS,
  compute,
  deriveResourcePools,
  deriveSlaResourcePools,
  deriveSpellLikeAbilities,
  FEAT_SLA_GRANTS,
  RACE_SLA_GRANTS,
  RACIAL_TRAIT_SLA_GRANTS,
  RACIAL_TRAITS,
  slaClaimedPoolIds,
  type SlaGrantDef,
  type SlaSourceTables,
} from "../src/index.js";
import { collectGrantedFeatures } from "../src/archetypes.js";
import { featNameSlug } from "../src/feat-effects.js";

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
    identity: { name: "Test", race: raceId("Gnome"), classes: [{ tag: "bard", level: 3 }] },
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

function slasFor(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return sheet.spellLikeAbilities ?? [];
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ALL_TABLES: [string, Readonly<Record<string, readonly SlaGrantDef[]>>][] = [
  ["race", RACE_SLA_GRANTS],
  ["racialTrait", RACIAL_TRAIT_SLA_GRANTS],
  ["classFeature", CLASS_FEATURE_SLA_GRANTS],
  ["archetypeFeature", ARCHETYPE_SLA_GRANTS],
  ["feat", FEAT_SLA_GRANTS],
];

describe("SLA grant table drift guards", () => {
  const spellNames = new Set(Object.values(ref.spells).map((s) => s.name.toLowerCase()));

  it("every def's spell resolves against the vendored spell slice", () => {
    for (const [table, entries] of ALL_TABLES) {
      for (const [key, defs] of Object.entries(entries)) {
        for (const def of defs) {
          expect(
            spellNames.has(def.spell.toLowerCase()),
            `${table}:${key}:${def.slug} names unresolvable spell "${def.spell}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("slugs are kebab-case and unique within their source; defs carry exactly one metering shape", () => {
    for (const [table, entries] of ALL_TABLES) {
      for (const [key, defs] of Object.entries(entries)) {
        expect(defs.length, `${table}:${key} has an empty def list`).toBeGreaterThan(0);
        const slugs = new Set<string>();
        for (const def of defs) {
          expect(def.slug, `${table}:${key}: slug "${def.slug}" is not kebab-case`).toMatch(KEBAB);
          expect(slugs.has(def.slug), `${table}:${key}: duplicate slug "${def.slug}"`).toBe(false);
          slugs.add(def.slug);
          const shapes = [
            def.uses !== undefined,
            def.frequency !== undefined,
            def.attachToSourcePool === true,
          ].filter(Boolean).length;
          expect(
            shapes,
            `${table}:${key}:${def.slug} must carry exactly one of uses/frequency/attachToSourcePool`,
          ).toBe(1);
        }
      }
    }
  });

  it("race table keys name real vendored races", () => {
    const raceNames = new Set(Object.values(ref.races).map((r) => r.name));
    for (const name of Object.keys(RACE_SLA_GRANTS)) {
      expect(raceNames.has(name), `RACE_SLA_GRANTS keys unknown race "${name}"`).toBe(true);
    }
  });

  it("racial-trait keys resolve, and attached defs have a real uses surface", () => {
    for (const [id, defs] of Object.entries(RACIAL_TRAIT_SLA_GRANTS)) {
      const vendored = ref.racialTraits[id];
      const hand = RACIAL_TRAITS[id];
      expect(
        vendored !== undefined || hand !== undefined,
        `RACIAL_TRAIT_SLA_GRANTS keys unknown trait id "${id}"`,
      ).toBe(true);
      for (const def of defs) {
        if (!def.attachToSourcePool) continue;
        const surface = vendored?.uses?.maxFormula ?? hand?.resourcePool?.usesFormula;
        expect(
          surface,
          `${id}:${def.slug} attaches to a source with no uses formula — no pool derives`,
        ).toBeTruthy();
      }
    }
  });

  it("class-feature keys resolve to vendored classFeatures (uses surface required to attach)", () => {
    for (const [id, defs] of Object.entries(CLASS_FEATURE_SLA_GRANTS)) {
      const feature = ref.classFeatures[id];
      expect(feature, `CLASS_FEATURE_SLA_GRANTS keys unknown feature id "${id}"`).toBeDefined();
      for (const def of defs) {
        if (def.attachToSourcePool) {
          expect(
            feature?.uses?.maxFormula,
            `${id}:${def.slug} attaches but the vendored feature has no uses.maxFormula`,
          ).toBeTruthy();
        }
      }
    }
  });

  it("archetype keys resolve, never attach (the pack has no uses field), and merge without collisions", () => {
    expect(Object.keys(ARCHETYPE_SLA_GRANTS).length).toBe(
      Object.keys(ARCHETYPE_SLA_GRANTS_AM).length + Object.keys(ARCHETYPE_SLA_GRANTS_NZ).length,
    );
    for (const [id, defs] of Object.entries(ARCHETYPE_SLA_GRANTS)) {
      expect(
        ref.archetypeFeatures[id],
        `ARCHETYPE_SLA_GRANTS keys unknown archetype feature id "${id}"`,
      ).toBeDefined();
      for (const def of defs) {
        expect(
          def.attachToSourcePool,
          `${id}:${def.slug} attaches — archetype features carry no vendored uses block`,
        ).not.toBe(true);
      }
    }
  });

  it("feat keys are real vendored feat name slugs", () => {
    const featSlugs = new Set(Object.values(ref.feats).map((f) => featNameSlug(f.name)));
    for (const slug of Object.keys(FEAT_SLA_GRANTS)) {
      expect(featSlugs.has(slug), `FEAT_SLA_GRANTS keys unknown feat slug "${slug}"`).toBe(true);
    }
  });
});

describe("racial spell-like abilities", () => {
  it("gnome with Charisma 11: the four Gnome Magic SLAs at CL = character level", () => {
    const doc = baseDoc({});
    const slas = slasFor(doc);
    expect(slas.map((s) => s.id).sort()).toEqual([
      "sla:race:dancing-lights",
      "sla:race:ghost-sound",
      "sla:race:prestidigitation",
      "sla:race:speak-with-animals",
    ]);
    for (const sla of slas) {
      expect(sla.casterLevel).toBe(3);
      expect(sla.frequency).toBe("perDay");
      expect(sla.poolId).toBe(sla.id);
      expect(sla.spellId, `${sla.name} did not resolve`).toBeDefined();
      expect(sla.classTag).toBe("racial");
      expect(sla.source).toBe("Gnome");
      // DC ability defaults to Charisma; base 11 + gnome racial +2 = 13 -> +1.
      expect(sla.abilityMod).toBe(1);
    }
    // Each 1/day meter derives its own synthetic pool.
    const pools = deriveResourcePools(doc, ref);
    for (const sla of slas) {
      const pool = pools.find((p) => p.id === sla.id);
      expect(pool?.max).toBe(1);
      expect(pool?.per).toBe("day");
      expect(pool?.classTag).toBe("racial");
    }
  });

  it("gnome below Charisma 11 gets none (CRB gate reads the FINAL score: base 8 + racial +2 = 10)", () => {
    const doc = baseDoc({
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 8 },
    });
    expect(slasFor(doc)).toEqual([]);
  });

  it("an alternate trait replacing Gnome Magic suppresses all four (rows and pools)", () => {
    const utilitarian = Object.values(ref.racialTraits).find(
      (t) => t.name === "Utilitarian Magic" && t.race.includes("Gnome"),
    );
    expect(utilitarian).toBeDefined();
    const doc = baseDoc({
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: [utilitarian!.id],
      },
    });
    expect(slasFor(doc)).toEqual([]);
    expect(deriveSlaResourcePools(doc, ref)).toEqual([]);
  });

  it("tiefling fighter 5: darkness 1/day at CL 5, spell level 2, resolved against the real spell", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Tiefling"), classes: [{ tag: "fighter", level: 5 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    });
    const slas = slasFor(doc);
    expect(slas).toHaveLength(1);
    const darkness = slas[0]!;
    expect(darkness.id).toBe("sla:race:darkness");
    expect(darkness.name).toBe("Darkness");
    expect(darkness.casterLevel).toBe(5);
    // Darkness is sor/wiz 2 in the vendored slice; DC ability mod is Cha
    // (base 14 + tiefling racial -2 = 12 -> +1).
    expect(darkness.spellLevel).toBe(2);
    expect(darkness.abilityMod).toBe(1);
    expect(darkness.spellId).toBeDefined();
    expect(ref.spells[darkness.spellId!]?.name).toBe("Darkness");
  });

  it("a heritage Spell-Like Ability trait replaces the base darkness and attaches to its own vendored pool", () => {
    // Beastbrood: Detect Thoughts 1/day (Blood of Fiends), vendored trait
    // id ETapFH3D6SF1WwVn with its own 1/day uses block.
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Tiefling"), classes: [{ tag: "fighter", level: 4 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: ["ETapFH3D6SF1WwVn"],
      },
    });
    const slas = slasFor(doc);
    expect(slas.map((s) => s.id)).toEqual(["sla:ETapFH3D6SF1WwVn:detect-thoughts"]);
    const detect = slas[0]!;
    expect(detect.name).toBe("Detect Thoughts");
    expect(detect.casterLevel).toBe(4);
    expect(detect.poolId).toBe("ETapFH3D6SF1WwVn");
    // The vendored trait's own pool row is the only counter — no synthetic twin.
    const pools = deriveResourcePools(doc, ref);
    expect(pools.find((p) => p.id === "ETapFH3D6SF1WwVn")?.max).toBe(1);
    expect(pools.filter((p) => p.id.startsWith("sla:"))).toEqual([]);
    // And the claimed-pool helper hands the tracker exactly that id.
    expect([...slaClaimedPoolIds(slas)]).toEqual(["ETapFH3D6SF1WwVn"]);
  });

  it("dhampir Ancient-Born: Doom rides the vendored 3/day pool", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Dhampir"), classes: [{ tag: "rogue", level: 2 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: ["09c76EsW9zGXAEZ0"],
      },
    });
    const slas = slasFor(doc);
    const doom = slas.find((s) => s.id === "sla:09c76EsW9zGXAEZ0:doom");
    expect(doom?.poolId).toBe("09c76EsW9zGXAEZ0");
    expect(deriveResourcePools(doc, ref).find((p) => p.id === "09c76EsW9zGXAEZ0")?.max).toBe(3);
  });
});

describe("class-feature / archetype / feat grant paths (injected tables)", () => {
  const emptyTables: SlaSourceTables = {
    race: {},
    racialTrait: {},
    classFeature: {},
    archetypeFeature: {},
    feat: {},
  };

  it("a class-feature grant evaluates uses and CL against the granting class's level", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "barbarian", level: 6 }] },
    });
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.length).toBeGreaterThan(0);
    const featureId = granted[0]!.grant.featureId;
    const tables: SlaSourceTables = {
      ...emptyTables,
      classFeature: {
        [featureId]: [
          { slug: "test-sla", spell: "Darkness", uses: { formula: "@class.unlevel", per: "day" } },
        ],
      },
    };
    const slas = deriveSpellLikeAbilities(doc, ref, undefined, tables);
    expect(slas).toHaveLength(1);
    expect(slas[0]!.casterLevel).toBe(6);
    expect(slas[0]!.classTag).toBe("barbarian");
    const pools = deriveSlaResourcePools(doc, ref, undefined, tables);
    expect(pools).toHaveLength(1);
    expect(pools[0]!.max).toBe(6);
  });

  it("an archetype grant gates on the feature's level and the archetype being chosen", () => {
    const af = Object.values(ref.archetypeFeatures).find((f) => f.level === 3);
    expect(af).toBeDefined();
    const tables: SlaSourceTables = {
      ...emptyTables,
      archetypeFeature: {
        [af!.id]: [{ slug: "test-sla", spell: "Darkness", uses: { formula: "1", per: "day" } }],
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
    expect(deriveSpellLikeAbilities(withArchetype(2), ref, undefined, tables)).toEqual([]);
    const slas = deriveSpellLikeAbilities(withArchetype(3), ref, undefined, tables);
    expect(slas).toHaveLength(1);
    expect(slas[0]!.id).toBe(`sla:${af!.id}:test-sla`);
    // Without the archetype chosen, nothing derives even at level.
    const noArch = baseDoc({
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: af!.classTag, level: 3 }] },
    });
    expect(deriveSpellLikeAbilities(noArch, ref, undefined, tables)).toEqual([]);
  });

  it("a feat grant keys by name slug and uses character-level CL; duplicate copies grant once", () => {
    const feat = Object.values(ref.feats)[0]!;
    const slug = featNameSlug(feat.name);
    const tables: SlaSourceTables = {
      ...emptyTables,
      feat: { [slug]: [{ slug: "test-sla", spell: "Darkness", uses: { formula: "1" } }] },
    };
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [
          { tag: "fighter", level: 2 },
          { tag: "rogue", level: 3 },
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
    const slas = deriveSpellLikeAbilities(doc, ref, undefined, tables);
    expect(slas).toHaveLength(1);
    expect(slas[0]!.casterLevel).toBe(5);
    expect(slas[0]!.classTag).toBe("feat");
    expect(slas[0]!.source).toBe(feat.name);
  });
});
