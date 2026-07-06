import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Issue #45 (ranger wave 2 of the prose→Change extraction pipeline): fixture
 * tests for `archetype-extracted/ranger.ts`'s `RANGER_ARCHETYPE_EFFECTS_EXTRACTED`,
 * hand-computed against the real vendored data slice via `loadRefData()`,
 * same posture as `archetypeEffectsExtracted.test.ts` (fighter's pilot).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  gear?: CharacterDoc["build"]["gear"];
  skillRanks?: CharacterDoc["build"]["skillRanks"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: over.classes,
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Elemental Envoy (ranger): Combat Style Feat restricted-list reflavor", () => {
  const elementalEnvoy = archetypeId("Elemental Envoy", "ranger");

  it("same bonusFeats schedule as the base ability at L2 and L10", () => {
    const at2 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 2 }], archetypes: [elementalEnvoy] }),
      ref,
    );
    const at10 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 10 }], archetypes: [elementalEnvoy] }),
      ref,
    );
    const feature2 = at2.activeArchetypes
      .find((a) => a.id === elementalEnvoy)
      ?.features.find((f) => f.name === "Combat Style Feat");
    const feature10 = at10.activeArchetypes
      .find((a) => a.id === elementalEnvoy)
      ?.features.find((f) => f.name === "Combat Style Feat");
    expect(feature2?.detail).toBe("1 elemental combat style bonus feat(s)");
    expect(feature10?.detail).toBe("3 elemental combat style bonus feat(s)");
    expect(feature2?.effectSource).toBe("extracted");
  });
});

describe("Hooded Champion (ranger): Combat Style Feat archery reflavor", () => {
  const hoodedChampion = archetypeId("Hooded Champion", "ranger");

  it("same schedule at L18, swashbuckler deeds noted but not modeled", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 18 }], archetypes: [hoodedChampion] }),
      ref,
    );
    const feature = sheet.activeArchetypes
      .find((a) => a.id === hoodedChampion)
      ?.features.find((f) => f.name === "Combat Style Feat");
    expect(feature?.detail).toBe(
      "5 archery bonus feat(s); swashbuckler grace/evasive deeds (9th) and edge/cheat death deeds (16th) not modeled",
    );
  });
});

describe("Wave Warden (ranger): aquatic Combat Style bonus feats", () => {
  const waveWarden = archetypeId("Wave Warden", "ranger");

  it("2 bonus feats by L6 (same schedule as base)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 6 }], archetypes: [waveWarden] }),
      ref,
    );
    const feature = sheet.activeArchetypes
      .find((a) => a.id === waveWarden)
      ?.features.find((f) => f.name === "Aquatic Prowess Feat");
    expect(feature?.detail).toBe("2 aquatic combat style bonus feat(s)");
  });
});

describe("Fortune-Finder (ranger): Hinterlander grants unconditional Climb/Swim", () => {
  const fortuneFinder = archetypeId("Fortune-Finder", "ranger");

  it("+2 Climb and Swim at L4 (floor(4/2)=2)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 4 }], archetypes: [fortuneFinder] }),
      ref,
    );
    expect(sheet.skills["clm"]?.components.find((c) => c.source === "Hinterlander")?.value).toBe(2);
    expect(sheet.skills["swm"]?.components.find((c) => c.source === "Hinterlander")?.value).toBe(2);
  });

  it("minimum +1 at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 1 }], archetypes: [fortuneFinder] }),
      ref,
    );
    expect(sheet.skills["clm"]?.components.find((c) => c.source === "Hinterlander")?.value).toBe(1);
  });
});

describe("Freebooter (ranger): Fast Swimmer grants a flat +2 Swim", () => {
  const freebooter = archetypeId("Freebooter", "ranger");

  it("+2 Swim regardless of level (flat, unconditional)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 7 }], archetypes: [freebooter] }),
      ref,
    );
    expect(sheet.skills["swm"]?.components.find((c) => c.source === "Fast Swimmer")?.value).toBe(2);
  });
});

describe("Groom (ranger): Scout the Area grants a flat +4 Knowledge (local)", () => {
  const groom = archetypeId("Groom", "ranger");

  it("+4 skill.klo", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 3 }], archetypes: [groom] }),
      ref,
    );
    expect(sheet.skills["klo"]?.components.find((c) => c.source === "Scout the Area")?.value).toBe(
      4,
    );
  });
});

describe("Realm Wanderer (ranger): Deceptive Subtlety grants Diplomacy/Bluff", () => {
  const realmWanderer = archetypeId("Realm Wanderer", "ranger");

  it("+3 Diplomacy/Bluff at L7 (floor(7/2)=3)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 7 }], archetypes: [realmWanderer] }),
      ref,
    );
    expect(
      sheet.skills["dip"]?.components.find((c) => c.source === "Deceptive Subtlety")?.value,
    ).toBe(3);
    expect(
      sheet.skills["blf"]?.components.find((c) => c.source === "Deceptive Subtlety")?.value,
    ).toBe(3);
  });
});

describe("Cinderwalker (ranger): Inured grants a scaling fire resistance", () => {
  const cinderwalker = archetypeId("Cinderwalker", "ranger");

  it("no Defenses section below L8 (formula evaluates to 0, dropped per the dr-at-0 fix)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 4 }], archetypes: [cinderwalker] }),
      ref,
    );
    expect(sheet.defenses).toBeUndefined();
  });

  it("fire resistance 10 at L8, 20 at L12, 30 at L16", () => {
    const at8 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 8 }], archetypes: [cinderwalker] }),
      ref,
    );
    expect(at8.defenses?.resistances.find((e) => e.qualifier === "fire")?.total).toBe(10);

    const at12 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 12 }], archetypes: [cinderwalker] }),
      ref,
    );
    expect(at12.defenses?.resistances.find((e) => e.qualifier === "fire")?.total).toBe(20);

    const at16 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 16 }], archetypes: [cinderwalker] }),
      ref,
    );
    expect(at16.defenses?.resistances.find((e) => e.qualifier === "fire")?.total).toBe(30);
  });
});

describe("Wild Stalker (ranger): Strong Senses grants a scaling Perception bonus", () => {
  const wildStalker = archetypeId("Wild Stalker", "ranger");

  it("+1 at L1, +2 at L4, +6 by L20 (breakpoints at 4/8/12/16/20)", () => {
    const at1 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 1 }], archetypes: [wildStalker] }),
      ref,
    );
    expect(at1.skills["per"]?.components.find((c) => c.source === "Strong Senses")?.value).toBe(1);

    const at4 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 4 }], archetypes: [wildStalker] }),
      ref,
    );
    expect(at4.skills["per"]?.components.find((c) => c.source === "Strong Senses")?.value).toBe(2);

    const at20 = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 20 }], archetypes: [wildStalker] }),
      ref,
    );
    expect(at20.skills["per"]?.components.find((c) => c.source === "Strong Senses")?.value).toBe(6);
  });
});

describe("Wilderness Medic (ranger): Herbalist Training grants Heal/Profession (herbalism)", () => {
  const wildernessMedic = archetypeId("Wilderness Medic", "ranger");

  it("+3 Heal at L6, and +3 Profession (herbalism) once that skill instance exists on the doc", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "ranger", level: 6 }],
        archetypes: [wildernessMedic],
        skillRanks: { "pro.herbalism": 1 },
      }),
      ref,
    );
    expect(
      sheet.skills["hea"]?.components.find((c) => c.source === "Herbalist Training")?.value,
    ).toBe(3);
    expect(
      sheet.skills["pro.herbalism"]?.components.find((c) => c.source === "Herbalist Training")
        ?.value,
    ).toBe(3);
  });
});

describe("blocked composition trap: partial-tier Combat Style Feat swaps (issue #45)", () => {
  // Beast Master's Improved Empathic Link (L6) claims to replace only "the
  // 6th-level combat style feat" — a single tier of Combat Style Feat's
  // atomic, single-formula bonus-feat schedule — but is UNPAIRED (no
  // pairedBaseFeatureUuid), so `activeArchetypeSwaps` never suppresses the
  // base grant at all. Classified `blocked` rather than backfilled: the base
  // formula just keeps applying in full for every tier (RAW-imperfect — a
  // real character would lose the 6th-level pick specifically — but not a
  // double-count), same shape as fighter's Unbreakable (Armor Training).
  const beastMaster = archetypeId("Beast Master", "ranger");

  it("Improved Empathic Link has no entry in either effects table", () => {
    expect(
      resolveArchetypeFeatureEffect("ranger:beast-master:improved-empathic-link:6"),
    ).toBeUndefined();
  });

  it("base Combat Style Feat keeps applying in full at L18 — no suppression, no backfilled number", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 18 }], archetypes: [beastMaster] }),
      ref,
    );
    const feature = sheet.classFeatures.find(
      (f) => f.name === "Combat Style Feat" && f.level === 2,
    );
    expect(feature?.applied).toBe(true); // never suppressed — no paired swap exists at all
    expect(feature?.replacedBy).toBeUndefined();

    const archEntry = sheet.activeArchetypes.find((a) => a.id === beastMaster);
    expect(
      archEntry?.features.find((f) => f.name === "Improved Empathic Link")?.detail,
    ).toBeUndefined();
  });
});

describe("suppression-composition case: Sable Company Marine's additive feature vs. Combat Style Feat's atomic pairing (issue #45)", () => {
  // Hippogriff Companion (L2) is purely ADDITIVE prose ("adds Monstrous
  // Mount to the list of bonus feats... regardless of the style chosen") but
  // IS paired to Combat Style Feat's base-feature uuid in the vendored data —
  // a vendored-data bug. `MISPAIRED_ADDITIVE_FEATURES` in `archetypes.ts`
  // ignores that pairing, so the base bonus-feat progression stays applied.
  const sableCompanyMarine = archetypeId("Sable Company Marine", "ranger");

  it("base Combat Style Feat bonus feats stay applied despite the mispaired vendored swap", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "ranger", level: 18 }], archetypes: [sableCompanyMarine] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "ranger", level: 18 }] }), ref);
    const featureWith = withArchetype.classFeatures.find(
      (f) => f.name === "Combat Style Feat" && f.level === 2,
    );
    const featureWithout = withoutArchetype.classFeatures.find(
      (f) => f.name === "Combat Style Feat" && f.level === 2,
    );
    expect(featureWithout?.applied).toBe(true);
    expect(featureWith?.applied).toBe(true);
    expect(featureWith?.replacedBy).toBeUndefined();
  });
});
