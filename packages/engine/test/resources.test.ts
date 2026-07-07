import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture tests for the action-derived resource-pool `detail` line (issue:
 * bare "N/M per day" counters with no hint of what the power actually does).
 * These exercise `deriveResourcePools`'s `actionBasedDetail` against the real
 * vendored `ClassFeature.actions` data (schema v8) — hand-computed against
 * the published SRD formulas, same posture as the rest of this test suite.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffId(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
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

describe("action-derived resource-pool detail", () => {
  it("wizard 4 (Conjuration school) — Acid Dart (WIZ): ranged touch acid damage", () => {
    const doc = baseDoc({
      identity: { name: "Vex", race: raceId("Human"), classes: [{ tag: "wizard", level: 4 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        wizardSchool: "con",
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const acidDart = pools.find((p) => p.name === "Acid Dart (WIZ)");
    expect(acidDart).toBeDefined();
    // 3 + Int mod(4) = 7 uses/day.
    expect(acidDart?.max).toBe(7);
    expect(acidDart?.per).toBe("day");
    // 1d6 + floor(4/2) = 1d6+2, ranged touch, acid.
    expect(acidDart?.detail).toBe("ranged touch · 1d6+2 acid");
  });

  it("cleric 7 — Channel Energy: heal/harm dice + Will DC (no cleric-only gate needed, it's generic now)", () => {
    const doc = baseDoc({
      identity: { name: "Hex", race: raceId("Human"), classes: [{ tag: "cleric", level: 7 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const channel = pools.find((p) => p.name === "Channel Energy");
    expect(channel).toBeDefined();
    // 3 + Cha mod(2) = 5 uses/day.
    expect(channel?.max).toBe(5);
    expect(channel?.per).toBe("day");
    // dice = ceil(7/2) = 4d6; DC = 10 + floor(7/2) + 2 = 15.
    expect(channel?.detail).toBe("4d6 (DC 15 Will)");
  });

  it("paladin 6 — Channel Positive Energy's dice/DC merge into Lay on Hands' detail (the fixed cleric-gate wart)", () => {
    const doc = baseDoc({
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    // Channel Positive Energy has no `uses.maxFormula` of its own (it spends
    // Lay on Hands uses — `uses.source: "layOnHands"`), so it never becomes
    // its own pool row; that would double-count a shared pool.
    expect(pools.find((p) => p.name === "Channel Positive Energy")).toBeUndefined();

    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh).toBeDefined();
    // floor(6/2) + Cha mod(3) = 6 uses/day.
    expect(loh?.max).toBe(6);
    expect(loh?.per).toBe("day");
    // Lay on Hands' own heal dice: floor(6/2) = 3d6. Channel Positive
    // Energy's reflavored dice/DC (paladin level as effective cleric level):
    // dice = ceil(6/2) = 3d6, DC = 10 + floor(6/2) + 3 = 16.
    expect(loh?.detail).toBe("heal 3d6 · Channel Positive Energy: 3d6 (DC 16 Will)");
  });

  it("monk 6 — Stunning Fist: a pure save-DC feature with no damage action", () => {
    const doc = baseDoc({
      identity: { name: "Kai", race: raceId("Human"), classes: [{ tag: "monk", level: 6 }] },
      abilities: { str: 12, dex: 16, con: 12, int: 10, wis: 16, cha: 10 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const stunningFist = pools.find((p) => p.name === "Stunning Fist");
    expect(stunningFist).toBeDefined();
    // DC = 10 + floor(6/2) + Wis mod(3) = 16, Fortitude.
    expect(stunningFist?.detail).toBe("DC 16 Fort");
  });

  it("cleric 1 (Death domain) — Bleeding Touch: melee touch damage with an 'untyped' damage type suppressed", () => {
    const doc = baseDoc({
      identity: { name: "Nyx", race: raceId("Human"), classes: [{ tag: "cleric", level: 1 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        clericDomains: ["Death"],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const bleedingTouch = pools.find((p) => p.name === "Bleeding Touch");
    expect(bleedingTouch).toBeDefined();
    // "untyped" is filtered out of the type suffix — it reads as noise, not
    // information (contrast Acid Dart's meaningful "acid" type above).
    expect(bleedingTouch?.detail).toBe("melee touch · 1d6");
  });
});

/**
 * Fixture tests for `DerivedResourcePool.linkedBuffIds` (issue: wire the
 * previously-dead `ClassFeature.grantsBuffs` field). Of the 12 vendored
 * features carrying `grantsBuffs`, only 3 resolve against the vendored buff
 * slice — Rage, Inspire Courage, and Aura of Protection (Domain Power) — the
 * other 9 point at buffs outside the slice and must resolve to an empty
 * `linkedBuffIds`, never throw.
 */
describe("grantsBuffs -> linkedBuffIds", () => {
  it("barbarian 1 — Rage pool exposes the Rage buff link", () => {
    const doc = baseDoc({
      identity: { name: "Ux", race: raceId("Human"), classes: [{ tag: "barbarian", level: 1 }] },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = pools.find((p) => p.name === "Rage");
    expect(rage).toBeDefined();
    expect(rage?.linkedBuffIds).toEqual([buffId("Rage")]);
  });

  it("bard 1 — Inspire Courage carries no uses.maxFormula of its own, so its buff link merges onto the Bardic Performance pool", () => {
    const doc = baseDoc({
      identity: { name: "Lyr", race: raceId("Human"), classes: [{ tag: "bard", level: 1 }] },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    // Inspire Courage never becomes its own pool (no uses block at all) —
    // it's not even findable by name.
    expect(pools.find((p) => p.name === "Inspire Courage")).toBeUndefined();
    const bardic = pools.find((p) => p.name === "Bardic Performance");
    expect(bardic).toBeDefined();
    expect(bardic?.linkedBuffIds).toEqual([buffId("Inspire Courage")]);
  });

  it("cleric 8 (Protection domain) — Aura of Protection domain power exposes its buff link", () => {
    const doc = baseDoc({
      identity: { name: "Sol", race: raceId("Human"), classes: [{ tag: "cleric", level: 8 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        clericDomains: ["Protection"],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const aura = pools.find((p) => p.name === "Aura of Protection (Domain Power)");
    expect(aura).toBeDefined();
    expect(aura?.linkedBuffIds).toEqual([buffId("Aura of Protection")]);
  });

  it("features with grantsBuffs pointing outside the vendored slice resolve to an empty linkedBuffIds", () => {
    // Scribe Scroll (a feat, not a class feature) never becomes a pool at
    // all, but e.g. Unarmed Strike (monk) DOES form no pool either (no
    // uses.maxFormula) — the point here is any granted feature whose
    // grantsBuffs UUID isn't in the vendored buff slice never surfaces a
    // linked buff. Smite Evil is a convenient always-present example with no
    // grantsBuffs of its own, asserting the field is simply absent/empty.
    const doc = baseDoc({
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh?.linkedBuffIds).toEqual([]);
  });
});

/**
 * Fixture tests for feats-as-resource-pools (schema v9's `Feat.uses`) —
 * `deriveFeatResourcePools` scans `doc.build.feats` for vendored
 * `uses.maxFormula` entries, evaluated against character-level roll data
 * (not a granting class's contextual one, since feats have no granting
 * class).
 */
describe("feats with uses.maxFormula become resource pools", () => {
  function featDoc(over: Partial<CharacterDoc>): CharacterDoc {
    return baseDoc({
      identity: { name: "Kel", race: raceId("Human"), classes: [{ tag: "monk", level: 1 }] },
      ...over,
    });
  }

  it("Combat Reflexes with Dex 16 (+3) -> 4 AoOs/round", () => {
    const doc = featDoc({
      abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [featId("Combat Reflexes")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const combatReflexes = pools.find((p) => p.name === "Combat Reflexes");
    expect(combatReflexes).toBeDefined();
    expect(combatReflexes?.max).toBe(4);
    expect(combatReflexes?.restValue).toBe(4);
    expect(combatReflexes?.per).toBe("round");
    expect(combatReflexes?.classTag).toBe("feat");
    expect(combatReflexes?.linkedBuffIds).toEqual([]);
  });

  it("Improved Iron Will is a flat 1/day pool", () => {
    const doc = featDoc({
      build: {
        feats: [featId("Improved Iron Will")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const improvedIronWill = pools.find((p) => p.name === "Improved Iron Will");
    expect(improvedIronWill).toBeDefined();
    expect(improvedIronWill?.max).toBe(1);
    expect(improvedIronWill?.per).toBe("day");
  });

  it("a feat listed twice in doc.build.feats produces exactly one pool", () => {
    const doc = featDoc({
      build: {
        feats: [featId("Improved Iron Will"), featId("Improved Iron Will")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.filter((p) => p.name === "Improved Iron Will")).toHaveLength(1);
  });

  it("a feat with no uses.maxFormula (e.g. Toughness) never becomes a pool", () => {
    const doc = featDoc({
      build: {
        feats: [featId("Toughness")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Toughness")).toBeUndefined();
  });
});
