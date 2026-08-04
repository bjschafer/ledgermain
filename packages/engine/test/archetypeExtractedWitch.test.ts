import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { archetypeModeledEffectTier, compute } from "../src/index.js";
import {
  WITCH_ARCHETYPE_EFFECTS_EXTRACTED,
  WITCH_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/witch.js";

/**
 * The witch slice of the prose->Change extraction pipeline, mirroring the
 * fighter pilot's methodology (`archetype-extracted/fighter.ts`) and the
 * barbarian wave's test structure. Unlike the barbarian wave,
 * `WITCH_ARCHETYPE_EFFECTS_EXTRACTED` IS already merged into
 * `archetype-extracted/index.ts`'s aggregator (this wave's own footprint
 * includes that one-import-one-spread wiring change), so the numeric fixture
 * tests below run through the real `compute()` pipeline end-to-end rather
 * than evaluating formulas in isolation.
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

function makeDoc(over: {
  level: number;
  archetypes?: string[];
  abilities?: CharacterDoc["abilities"];
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
      classes: [{ tag: "witch", level: over.level }],
    },
    abilities: over.abilities ?? { str: 12, dex: 14, con: 14, int: 16, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
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

describe("classification table covers every vendored witch archetype feature", () => {
  it("has exactly 188 entries", () => {
    expect(Object.keys(WITCH_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(188);
  });

  it("every classification key matches a real vendored archetype-feature id", () => {
    for (const id of Object.keys(WITCH_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(ref.archetypeFeatures[id]).toBeDefined();
    }
  });

  it("every vendored witch archetype feature has a classification entry", () => {
    const vendoredWitchIds = Object.keys(ref.archetypeFeatures).filter((id) =>
      id.startsWith("witch:"),
    );
    for (const id of vendoredWitchIds) {
      expect(WITCH_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(vendoredWitchIds.length).toBe(188);
  });

  it("the one blocked entry is Seducer's Otherworldly Allure (Int-to-Cha casting substitution)", () => {
    const blocked = Object.entries(WITCH_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, e]) => e.bucket === "blocked")
      .map(([id]) => id);
    expect(blocked).toEqual(["witch:seducer:otherworldly-allure:0"]);
  });

  it("no witch feature id collides with the hand-verified table", () => {
    // No witch entries exist in archetype-effects.ts today, but assert the
    // invariant explicitly so a future hand-verified witch entry can't
    // silently double up with this table's own extracted entries.
    for (const id of Object.keys(WITCH_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(WITCH_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("WITCH_ARCHETYPE_EFFECTS_EXTRACTED shape", () => {
  it("has exactly 2 entries", () => {
    expect(Object.keys(WITCH_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(2);
  });

  it("every entry carries a non-empty provenance sentence and an honest confidence", () => {
    for (const entry of Object.values(WITCH_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(entry.provenance.length).toBeGreaterThan(10);
      expect(["high", "medium", "low"]).toContain(entry.confidence);
    }
  });
});

describe("Hagbound: Hunched Muscle grants a flat, scaling size bonus to Strength (Blood of the Coven p. 16)", () => {
  const hagbound = archetypeId("Hagbound");

  it("+2 at 2nd level", () => {
    const sheet = compute(makeDoc({ level: 2, archetypes: [hagbound] }), ref);
    expect(sheet.abilities.str.total).toBe(12 + 2);
  });

  it("+4 at 8th level", () => {
    const sheet = compute(makeDoc({ level: 8, archetypes: [hagbound] }), ref);
    expect(sheet.abilities.str.total).toBe(12 + 4);
  });

  it("+6 (max) at 14th level, no further scaling at 20th", () => {
    const sheet14 = compute(makeDoc({ level: 14, archetypes: [hagbound] }), ref);
    expect(sheet14.abilities.str.total).toBe(12 + 6);
    const sheet20 = compute(makeDoc({ level: 20, archetypes: [hagbound] }), ref);
    expect(sheet20.abilities.str.total).toBe(12 + 6);
  });

  it("matches the entry's own detail string at 8th level", () => {
    const entry = WITCH_ARCHETYPE_EFFECTS_EXTRACTED["witch:hagbound:hunched-muscle:2"]!;
    expect(entry.detail?.(8)).toBe("+4 size bonus to Strength");
  });

  it("archetypeModeledEffectTier reports 'extracted' for Hagbound", () => {
    expect(archetypeModeledEffectTier(ref, hagbound)).toBe("extracted");
  });

  it("without the archetype, no size bonus applies", () => {
    const sheet = compute(makeDoc({ level: 8 }), ref);
    expect(sheet.abilities.str.total).toBe(12);
  });
});

describe("Herb Witch: Herb Lore grants half class level on Profession (herbalist) (Ultimate Wilderness p. 89)", () => {
  const herbWitch = archetypeId("Herb Witch");

  it("+0 at 1st level (no stated minimum, unlike Breadth of Knowledge)", () => {
    const sheet = compute(makeDoc({ level: 1, archetypes: [herbWitch] }), ref);
    const comp = sheet.skills["pro.herbalist"]?.components.find((c) => c.source === "Herb Lore");
    expect(comp?.value).toBe(0);
  });

  it("+4 at 8th level", () => {
    const sheet = compute(makeDoc({ level: 8, archetypes: [herbWitch] }), ref);
    const comp = sheet.skills["pro.herbalist"]?.components.find((c) => c.source === "Herb Lore");
    expect(comp?.value).toBe(4);
  });

  it("+10 at 20th level", () => {
    const sheet = compute(makeDoc({ level: 20, archetypes: [herbWitch] }), ref);
    const comp = sheet.skills["pro.herbalist"]?.components.find((c) => c.source === "Herb Lore");
    expect(comp?.value).toBe(10);
  });

  it("matches the entry's own detail string at 8th level", () => {
    const entry = WITCH_ARCHETYPE_EFFECTS_EXTRACTED["witch:herb-witch:herb-lore:0"]!;
    expect(entry.detail?.(8)).toBe("+4 Profession (herbalist)");
  });

  it("archetypeModeledEffectTier reports 'extracted' for Herb Witch", () => {
    expect(archetypeModeledEffectTier(ref, herbWitch)).toBe("extracted");
  });
});

describe("every other witch archetype reports 'none' (no modeled numeric effect)", () => {
  it("40 of the 42 vendored witch archetypes are unmodeled", () => {
    const witchArchetypes = Object.values(ref.archetypes).filter((a) => a.classTag === "witch");
    expect(witchArchetypes.length).toBe(42);
    const tiers = witchArchetypes.map((a) => ({
      name: a.name,
      tier: archetypeModeledEffectTier(ref, a.id),
    }));
    const modeled = tiers.filter((t) => t.tier !== "none").map((t) => t.name);
    expect(modeled.sort()).toEqual(["Hagbound", "Herb Witch"]);
  });
});
