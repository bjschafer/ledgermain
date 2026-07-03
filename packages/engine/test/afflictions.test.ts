import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Barbarian L5, human, no armor — same fixture shape as compute.test.ts. */
function makeDoc(over: {
  abilities: CharacterDoc["abilities"];
  skillRanks?: Record<string, number>;
  live?: Partial<CharacterDoc["live"]>;
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
      classes: [{ tag: "barbarian", level: 5 }],
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
      ...over.live,
    },
  };
}

const BASE_ABILITIES = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };

describe("afflictions: ability damage (issue #18)", () => {
  it("Con damage reduces max HP by level × floor(dmg/2)", () => {
    // Barbarian L5, Con 14 (mod +2). Base HP: L1 max d12 (12) + con2, plus
    // 4 levels avg d12 (floor(12/2)+1=7) + con2 each = 14 + 4*9 = 50.
    const base = makeDoc({ abilities: BASE_ABILITIES });
    const baseSheet = compute(base, ref);
    expect(baseSheet.hp.max).toBe(50);

    // 4 points of Con damage → floor(4/2) = 2 off the Con modifier (2 → 0).
    // Recomputed HP: 12 + 4*7 = 40. Diff = 10 = level(5) × floor(4/2)=2.
    const damaged = makeDoc({
      abilities: BASE_ABILITIES,
      live: { abilityDamage: { con: 4 } },
    });
    const damagedSheet = compute(damaged, ref);
    expect(damagedSheet.hp.max).toBe(40);
    expect(baseSheet.hp.max - damagedSheet.hp.max).toBe(10);
  });

  it("odd damage (3 points) → -1 mod; even damage (4 points) → -2 mod", () => {
    const base = makeDoc({ abilities: BASE_ABILITIES });
    const baseSheet = compute(base, ref);
    expect(baseSheet.abilities.str.mod).toBe(3); // (16-10)/2 = 3

    const dmg3 = makeDoc({ abilities: BASE_ABILITIES, live: { abilityDamage: { str: 3 } } });
    const dmg3Sheet = compute(dmg3, ref);
    expect(dmg3Sheet.abilities.str.mod).toBe(2); // floor(3/2)=1 off
    // total drops by an even number (2*floor(3/2)=2), score itself untouched
    // per RAW (base stays 16; only .total/.mod carry the effect).
    expect(dmg3Sheet.abilities.str.base).toBe(16);
    expect(baseSheet.abilities.str.total - dmg3Sheet.abilities.str.total).toBe(2);

    const dmg4 = makeDoc({ abilities: BASE_ABILITIES, live: { abilityDamage: { str: 4 } } });
    const dmg4Sheet = compute(dmg4, ref);
    expect(dmg4Sheet.abilities.str.mod).toBe(1); // floor(4/2)=2 off
    expect(baseSheet.abilities.str.total - dmg4Sheet.abilities.str.total).toBe(4);
  });

  it("ability damage carries provenance (source 'Ability damage', applied)", () => {
    const doc = makeDoc({ abilities: BASE_ABILITIES, live: { abilityDamage: { str: 4 } } });
    const sheet = compute(doc, ref);
    const comp = sheet.abilities.str.components.find((c) => c.source === "Ability damage");
    expect(comp).toBeDefined();
    expect(comp!.applied).toBe(true);
    expect(comp!.value).toBe(-4); // 2*floor(4/2)
  });

  it("zero/absent ability damage = no change", () => {
    const base = compute(makeDoc({ abilities: BASE_ABILITIES }), ref);
    const zero = compute(
      makeDoc({ abilities: BASE_ABILITIES, live: { abilityDamage: { str: 0 } } }),
      ref,
    );
    expect(zero.abilities.str.total).toBe(base.abilities.str.total);
    expect(zero.abilities.str.components.find((c) => c.source === "Ability damage")).toBeUndefined();
  });
});

describe("afflictions: ability drain (issue #18)", () => {
  it("Dex drain actually lowers the score and flows to AC/init/Reflex", () => {
    const base = makeDoc({ abilities: BASE_ABILITIES });
    const baseSheet = compute(base, ref);
    expect(baseSheet.abilities.dex.mod).toBe(2); // (14-10)/2 = 2

    // 4 points of drain: 14 → 10, mod 2 → 0.
    const drained = makeDoc({ abilities: BASE_ABILITIES, live: { abilityDrain: { dex: 4 } } });
    const drainedSheet = compute(drained, ref);
    expect(drainedSheet.abilities.dex.total).toBe(10);
    expect(drainedSheet.abilities.dex.mod).toBe(0);

    const modDiff = baseSheet.abilities.dex.mod - drainedSheet.abilities.dex.mod; // 2
    expect(baseSheet.ac.normal - drainedSheet.ac.normal).toBe(modDiff);
    expect(baseSheet.initiative.total - drainedSheet.initiative.total).toBe(modDiff);
    expect(baseSheet.saves.ref.total - drainedSheet.saves.ref.total).toBe(modDiff);
  });

  it("drain carries provenance (source 'Ability drain', applied)", () => {
    const doc = makeDoc({ abilities: BASE_ABILITIES, live: { abilityDrain: { dex: 4 } } });
    const sheet = compute(doc, ref);
    const comp = sheet.abilities.dex.components.find((c) => c.source === "Ability drain");
    expect(comp).toBeDefined();
    expect(comp!.applied).toBe(true);
    expect(comp!.value).toBe(-4);
    // Base score field itself is untouched by the change (only the total is).
    expect(sheet.abilities.dex.base).toBe(14);
  });
});

describe("afflictions: ability penalty (issue #18)", () => {
  it("penalty applies the same -1-per-2-points math as damage", () => {
    const base = compute(makeDoc({ abilities: BASE_ABILITIES }), ref);
    const penalized = compute(
      makeDoc({ abilities: BASE_ABILITIES, live: { abilityPenalty: { wis: 3 } } }),
      ref,
    );
    expect(base.abilities.wis.mod - penalized.abilities.wis.mod).toBe(1); // floor(3/2)=1
    const comp = penalized.abilities.wis.components.find((c) => c.source === "Ability penalty");
    expect(comp).toBeDefined();
    expect(comp!.value).toBe(-2); // 2*floor(3/2)
  });
});

describe("afflictions: negative levels (issue #19)", () => {
  it("total negative levels (temp + perm) hit attack, all saves, skills, and max HP", () => {
    const base = makeDoc({ abilities: BASE_ABILITIES, skillRanks: { acr: 3 } });
    const baseSheet = compute(base, ref);

    const doc = makeDoc({
      abilities: BASE_ABILITIES,
      skillRanks: { acr: 3 },
      live: { negativeLevels: { temporary: 2, permanent: 1 } },
    });
    const sheet = compute(doc, ref);
    const total = 3; // 2 temp + 1 perm

    expect(baseSheet.attack.melee.total - sheet.attack.melee.total).toBe(total);
    expect(baseSheet.attack.ranged.total - sheet.attack.ranged.total).toBe(total);
    expect(baseSheet.saves.fort.total - sheet.saves.fort.total).toBe(total);
    expect(baseSheet.saves.ref.total - sheet.saves.ref.total).toBe(total);
    expect(baseSheet.saves.will.total - sheet.saves.will.total).toBe(total);
    expect(baseSheet.skills.acr!.total - sheet.skills.acr!.total).toBe(total);
    expect(baseSheet.hp.max - sheet.hp.max).toBe(5 * total);
  });

  it("negative-level HP penalty reduces max HP, not current HP", () => {
    const doc = makeDoc({
      abilities: BASE_ABILITIES,
      live: {
        hp: { current: 30, temp: 0, nonlethal: 0 },
        negativeLevels: { temporary: 1 },
      },
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.current).toBe(30); // untouched — live state passes through
    expect(sheet.hp.max).toBe(45); // 50 base - 5
  });

  it("negative levels carry provenance (source 'Negative levels') on hp", () => {
    const doc = makeDoc({
      abilities: BASE_ABILITIES,
      live: { negativeLevels: { permanent: 2 } },
    });
    const sheet = compute(doc, ref);
    const comp = sheet.hp.components.find((c) => c.source === "Negative levels");
    expect(comp).toBeDefined();
    expect(comp!.value).toBe(-10);
  });

  it("zero/absent negative levels = no change", () => {
    const base = compute(makeDoc({ abilities: BASE_ABILITIES }), ref);
    const zero = compute(
      makeDoc({ abilities: BASE_ABILITIES, live: { negativeLevels: { temporary: 0, permanent: 0 } } }),
      ref,
    );
    expect(zero.attack.melee.total).toBe(base.attack.melee.total);
    expect(zero.hp.max).toBe(base.hp.max);
    expect(zero.hp.components.find((c) => c.source === "Negative levels")).toBeUndefined();
  });
});
