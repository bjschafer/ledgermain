/**
 * Fixture tests for the three `DOMAIN_POWER_PATCHES` entries added alongside
 * the proof entry in `grantedPowerEffects.test.ts` (Guarded Mind): Eyes of
 * the Hawk (Feather subdomain), Perfected Form (Self-Realization subdomain,
 * Liberation/Strength), and Fire Hardened (Plane of Fire nature-bond
 * domain, druid).
 */

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

const HUMAN = raceId("Human");

/** Human cleric, Wis 16 (+3 mod), Con 12 (+1 mod), chosen domains as given. */
function makeCleric(level: number, clericDomains: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "granted-power-domains-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "cleric", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      clericDomains,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

/** Human druid, no ability score bonuses needed for the fire-resistance check. */
function makeDruid(level: number, druidNatureBondDomain: string | undefined): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "granted-power-domains-druid-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Druid",
      race: HUMAN,
      classes: [{ tag: "druid", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      druidNatureBondDomain,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Eyes of the Hawk (Feather subdomain, racial Perception bonus)", () => {
  // "You gain a racial bonus on Perception checks equal to 1/2 your cleric
  // level (minimum +1)." (Advanced Player's Guide p. 90). No Perception
  // ranks and Wis 16 (+3 mod); Perception isn't a cleric class skill.
  it("odd level (3): floor(3/2) = 1, no minimum needed", () => {
    const sheet = compute(makeCleric(3, ["Feather"]), ref);
    expect(sheet.skills.per!.total).toBe(3 + 1);
  });

  it("even level (6): floor(6/2) = 3", () => {
    const sheet = compute(makeCleric(6, ["Feather"]), ref);
    expect(sheet.skills.per!.total).toBe(3 + 3);
  });

  it("level 1: the minimum +1 floor kicks in (floor(1/2) = 0 alone would give +0)", () => {
    const sheet = compute(makeCleric(1, ["Feather"]), ref);
    expect(sheet.skills.per!.total).toBe(3 + 1);
  });
});

describe("Perfected Form (Self-Realization subdomain, +N sacred vs. polymorph/petrification/transmutation)", () => {
  // "You gain a +1 sacred ... bonus on saving throws against polymorph,
  // petrification, and transmutation effects. This bonus increases by 1 for
  // every 5 cleric levels you have (maximum +5)." (Pathfinder Society Field
  // Guide p. 26). Granted by the Self-Realization subdomain of Liberation
  // (or Strength). Cleric Fort/Will are good saves (2 + floor(level/2));
  // Reflex is poor (floor(level/3)). Con +1, Dex +0, Wis +3.
  it("level 4: +1 bonus, all three categories present on the applicable saves", () => {
    // Fort floor = (2+2) + 1 = 5. Ref floor = 1 + 0 = 1. Will floor = (2+2) + 3 = 7.
    const sheet = compute(makeCleric(4, ["Self-Realization (Liberation)"]), ref);
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.fort.conditionals).toEqual([
      {
        total: 6,
        categories: ["petrification", "polymorph", "transmutation"],
        labels: ["petrification", "polymorph", "transmutation"],
      },
    ]);
    // Reflex can't take a petrification or polymorph save in PF1, so only
    // transmutation (the school spans both saves) reaches this line.
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: 2, categories: ["transmutation"], labels: ["transmutation"] },
    ]);
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: 8,
        categories: ["polymorph", "transmutation"],
        labels: ["polymorph", "transmutation"],
      },
    ]);
  });

  it("level 15: +4 bonus (1 + floor(15/5) = 4, under the +5 cap)", () => {
    // Fort floor = (2+7) + 1 = 10. Ref floor = 5 + 0 = 5. Will floor = (2+7) + 3 = 12.
    const sheet = compute(makeCleric(15, ["Self-Realization (Strength)"]), ref);
    expect(sheet.saves.fort.conditionals).toEqual([
      {
        total: 14,
        categories: ["petrification", "polymorph", "transmutation"],
        labels: ["petrification", "polymorph", "transmutation"],
      },
    ]);
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: 9, categories: ["transmutation"], labels: ["transmutation"] },
    ]);
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: 16,
        categories: ["polymorph", "transmutation"],
        labels: ["polymorph", "transmutation"],
      },
    ]);
  });
});

describe("Fire Hardened (Plane of Fire nature-bond domain, druid, fire resistance 5)", () => {
  it("a druid with the Plane of Fire nature bond gets fire resistance 5", () => {
    const sheet = compute(makeDruid(1, "Plane of Fire"), ref);
    const fireRes = sheet.defenses?.resistances.find((r) => r.qualifier === "fire");
    expect(fireRes?.total).toBe(5);
  });

  it("a druid with a different nature bond gets no fire resistance", () => {
    const sheet = compute(makeDruid(1, "Frog"), ref);
    const fireRes = sheet.defenses?.resistances.find((r) => r.qualifier === "fire");
    expect(fireRes).toBeUndefined();
  });

  it("a druid with no nature-bond domain at all computes cleanly with no fire resistance", () => {
    const sheet = compute(makeDruid(5, undefined), ref);
    const fireRes = sheet.defenses?.resistances.find((r) => r.qualifier === "fire");
    expect(fireRes).toBeUndefined();
  });
});

describe("negative: a cleric with an unrelated domain gets none of the three", () => {
  it("Fire domain grants no Perception racial bonus and no save conditionals", () => {
    const sheet = compute(makeCleric(10, ["Fire"]), ref);
    // Perception has no racial component: just the Wis +3 mod.
    expect(sheet.skills.per!.total).toBe(3);
    // A plain cleric with no other class features carries no situational
    // save totals at all, so `conditionals` is omitted rather than empty
    // (`compute.ts`'s `conditionals.length > 0 ? {...} : {...}`).
    expect(sheet.saves.fort.conditionals).toBeUndefined();
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });
});
