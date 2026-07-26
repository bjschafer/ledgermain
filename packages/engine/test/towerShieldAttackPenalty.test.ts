/**
 * Hand-computed fixture tests for the tower shield's separate −2 penalty on
 * attack rolls (CRB p.153, Tower Shield: "While using a tower shield, you
 * take a –2 penalty on attack rolls because it is so unwieldy"). This is
 * independent of the shield's own max-Dex-to-AC cap (already modeled — see
 * `compute.test.ts`'s "a shield's own max-Dex cap applies" fixture) and
 * independent of the armor-check-penalty-on-attack non-proficiency rule
 * (issue #81, `proficiency.test.ts`) — a proficient tower shield wielder
 * still eats the flat -2, and a non-proficient one eats both penalties at
 * once (see the "stacks with" fixture below).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

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

function makeDoc(over: {
  gear?: ItemInstance[];
  weapons?: WeaponInstance[];
  feats?: string[];
  classes?: { tag: string; level: number }[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "tower-shield-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: over.classes ?? [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 8 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      weapons: over.weapons ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// A Fighter (proficient with all shields, including tower — Fighter's
// Weapon and Armor Proficiency grants "all... shields (except tower
// shields)" per RAW, but for this fixture we grant Tower Shield
// Proficiency explicitly so the -2 shows up in isolation from any
// non-proficiency ACP penalty.
const towerShield: ItemInstance = {
  equipped: true,
  name: "Tower Shield",
  armor: { slot: "shield", ac: 4, acp: 0, maxDex: 2, shieldTier: "tower" },
};

describe("compute(): tower shield's flat -2 attack penalty (CRB p.153)", () => {
  it("proficient tower shield wielder still takes -2 on the base melee/ranged attack lines", () => {
    const doc = makeDoc({
      feats: [featId("Tower Shield Proficiency")],
      gear: [towerShield],
    });
    const sheet = compute(doc, ref);
    // BAB(1) + STR(2) - tower shield(2) = 1
    expect(sheet.attack.melee.total).toBe(1);
    const comp = sheet.attack.melee.components.find((c) => c.source === "Tower shield");
    expect(comp?.value).toBe(-2);
    expect(comp?.applied).toBe(true);
  });

  it("applies to per-weapon attack lines too", () => {
    const sword: WeaponInstance = { name: "Longsword", attackAbility: "str", damageDice: "1d8" };
    const doc = makeDoc({
      feats: [featId("Tower Shield Proficiency")],
      gear: [towerShield],
      weapons: [sword],
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.attack.total).toBe(1); // BAB(1) + STR(2) - 2
    const comp = sheet.attacks[0]!.attack.components.find((c) => c.source === "Tower shield");
    expect(comp?.value).toBe(-2);
  });

  it("no penalty when no tower shield is equipped", () => {
    const doc = makeDoc({});
    const sheet = compute(doc, ref);
    expect(sheet.attack.melee.components.some((c) => c.source === "Tower shield")).toBe(false);
    expect(sheet.attack.melee.total).toBe(3); // BAB(1) + STR(2)
  });

  it("stacks with the non-proficient shield ACP penalty (issue #81) rather than replacing it", () => {
    const nonProficientTower: ItemInstance = {
      equipped: true,
      name: "Tower Shield",
      armor: { slot: "shield", ac: 4, acp: -10, shieldTier: "tower" },
    };
    // Barbarian is proficient with shields generally ("shl") but NOT tower
    // shields specifically ("twr" is its own grant — proficiency.ts) — so
    // this wielder eats the -10 ACP-on-attack penalty (issue #81),
    // independent of and in addition to the flat -2 tower shield penalty.
    const doc = makeDoc({
      gear: [nonProficientTower],
      classes: [{ tag: "barbarian", level: 1 }],
    });
    const sheet = compute(doc, ref);
    const towerPenalty = sheet.attack.melee.components.find((c) => c.source === "Tower shield");
    const nonProfPenalty = sheet.attack.melee.components.find((c) =>
      c.source.includes("non-proficient"),
    );
    expect(towerPenalty?.value).toBe(-2);
    expect(nonProfPenalty?.value).toBe(-10);
    // BAB(1) + STR(2) - tower(2) - non-proficient shield ACP(10) = -9.
    expect(sheet.attack.melee.total).toBe(1 + 2 - 2 - 10);
  });

  it("an ordinary (non-tower) shield never incurs the -2", () => {
    const heavyShield: ItemInstance = {
      equipped: true,
      name: "Heavy Steel Shield",
      armor: { slot: "shield", ac: 2, acp: -1, shieldTier: "heavy" },
    };
    const doc = makeDoc({
      feats: [featId("Shield Proficiency")],
      gear: [heavyShield],
    });
    const sheet = compute(doc, ref);
    expect(sheet.attack.melee.components.some((c) => c.source === "Tower shield")).toBe(false);
  });
});
