/**
 * Fixture tests for fighter's base Weapon Training group picks (the "Fighter
 * weapon training group choices" item; the engine expresses a semantic
 * weapon-group target). See `packages/engine/src/tables.ts`'s
 * `weaponTrainingBonus` for the formula and `collect.ts`'s "Weapon Training
 * group picks" section for the wiring.
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

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

function makeDoc(over: {
  fighterLevel: number;
  weaponTrainingGroups?: string[];
  archetypes?: string[];
  weapons: WeaponInstance[];
  gear?: ItemInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "weapon-training-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: over.fighterLevel }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      weapons: over.weapons,
      archetypes: over.archetypes ?? [],
      weaponTrainingGroups: over.weaponTrainingGroups,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const longbow: WeaponInstance = {
  name: "Longbow",
  attackAbility: "dex",
  damageDice: "1d8",
  category: "ranged",
  weaponGroups: ["bows"],
};

const warhammer: WeaponInstance = {
  name: "Warhammer",
  attackAbility: "str",
  damageDice: "1d8",
  category: "melee",
  weaponGroups: ["hammers"],
};

describe("Weapon Training group picks", () => {
  it("L5 with one group picked: +1 attack/damage on a matching weapon", () => {
    const base = makeDoc({ fighterLevel: 5, weapons: [longbow] });
    const withPick = makeDoc({
      fighterLevel: 5,
      weaponTrainingGroups: ["bows"],
      weapons: [longbow],
    });
    const baseSheet = compute(base, ref);
    const sheet = compute(withPick, ref);
    expect(sheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
    expect(sheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total).toBe(1);
  });

  it("no bonus before 5th level", () => {
    const base = makeDoc({ fighterLevel: 4, weapons: [longbow] });
    const withPick = makeDoc({
      fighterLevel: 4,
      weaponTrainingGroups: ["bows"],
      weapons: [longbow],
    });
    expect(compute(withPick, ref).attacks[0]!.attack.total).toBe(
      compute(base, ref).attacks[0]!.attack.total,
    );
  });

  it("L9 with two groups picked: the 5th-level pick grows to +2, the 9th-level pick starts at +1", () => {
    const doc = makeDoc({
      fighterLevel: 9,
      weaponTrainingGroups: ["bows", "hammers"],
      weapons: [longbow, warhammer],
    });
    const base = makeDoc({ fighterLevel: 9, weapons: [longbow, warhammer] });
    const sheet = compute(doc, ref);
    const baseSheet = compute(base, ref);
    expect(sheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(2); // bows, grant L5
    expect(sheet.attacks[1]!.attack.total - baseSheet.attacks[1]!.attack.total).toBe(1); // hammers, grant L9
  });

  it("a not-yet-unlocked tier (index 1, grant L9) contributes nothing at L5", () => {
    const doc = makeDoc({
      fighterLevel: 5,
      weaponTrainingGroups: ["bows", "hammers"],
      weapons: [longbow, warhammer],
    });
    const base = makeDoc({ fighterLevel: 5, weapons: [longbow, warhammer] });
    const sheet = compute(doc, ref);
    const baseSheet = compute(base, ref);
    expect(sheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1); // bows OK
    expect(sheet.attacks[1]!.attack.total).toBe(baseSheet.attacks[1]!.attack.total); // hammers not yet
  });

  it("suppressed when an active archetype has replaced Weapon Training (Archer)", () => {
    const archer = archetypeId("Archer", "fighter");
    const doc = makeDoc({
      fighterLevel: 5,
      weaponTrainingGroups: ["hammers"],
      archetypes: [archer],
      weapons: [warhammer],
    });
    const withoutPick = makeDoc({
      fighterLevel: 5,
      archetypes: [archer],
      weapons: [warhammer],
    });
    // Archer's Expert Archer only targets bows, so a hammers pick should
    // contribute nothing once the base feature is suppressed.
    expect(compute(doc, ref).attacks[0]!.attack.total).toBe(
      compute(withoutPick, ref).attacks[0]!.attack.total,
    );
  });

  it("suppressed for Brawler (Close Combatant), despite its mispaired vendored uuid", () => {
    const brawler = archetypeId("Brawler", "fighter");
    const doc = makeDoc({
      fighterLevel: 5,
      weaponTrainingGroups: ["hammers"],
      archetypes: [brawler],
      weapons: [warhammer],
    });
    const withoutPick = makeDoc({
      fighterLevel: 5,
      archetypes: [brawler],
      weapons: [warhammer],
    });
    expect(compute(doc, ref).attacks[0]!.attack.total).toBe(
      compute(withoutPick, ref).attacks[0]!.attack.total,
    );
  });

  it("a weapon with no matching group gets nothing", () => {
    const doc = makeDoc({
      fighterLevel: 5,
      weaponTrainingGroups: ["bows"],
      weapons: [warhammer],
    });
    const base = makeDoc({ fighterLevel: 5, weapons: [warhammer] });
    expect(compute(doc, ref).attacks[0]!.attack.total).toBe(
      compute(base, ref).attacks[0]!.attack.total,
    );
  });
});

function itemId(name: string): string {
  const entry = Object.entries(ref.items).find(([, it]) => it.name === name);
  if (!entry) throw new Error(`item not found: ${name}`);
  return entry[0];
}

function disarmCmd(doc: CharacterDoc): number | undefined {
  return compute(doc, ref).cmdConditionals?.find((c) => c.categories.includes("disarm"))?.total;
}

// CRB p. 56: the weapon training bonus "also applies to the fighter's Combat
// Maneuver Defense when defending against disarm and sunder attempts made
// against weapons from this group".
describe("Weapon Training CMD vs disarm and sunder", () => {
  it("carries the best picked tier: +2 at L9 with bows (+2) and hammers (+1)", () => {
    const doc = makeDoc({
      fighterLevel: 9,
      weaponTrainingGroups: ["bows", "hammers"],
      weapons: [longbow, warhammer],
    });
    const sheet = compute(doc, ref);
    // 10 + BAB 9, no Str/Dex: headline CMD is untouched.
    expect(sheet.cmd).toBe(19);
    const line = sheet.cmdConditionals?.find((c) => c.categories.includes("disarm"));
    expect(line?.total).toBe(21);
    expect(line?.categories).toEqual(["disarm", "sunder"]);
  });

  it("no line before weapon training unlocks", () => {
    expect(
      disarmCmd(makeDoc({ fighterLevel: 4, weaponTrainingGroups: ["bows"], weapons: [longbow] })),
    ).toBeUndefined();
  });
});

// Gloves of Dueling (Ultimate Equipment p. 236): "a +4 bonus to her CMD
// against disarm attacks, attempts to sunder her wielded weapons ... her
// weapon training bonus increases by +2."
describe("Gloves of Dueling", () => {
  const gloves: ItemInstance = { equipped: true, itemId: itemId("Gloves of Dueling") };

  it("raises every picked group's attack and damage by 2", () => {
    const base = makeDoc({ fighterLevel: 9, weapons: [longbow, warhammer] });
    const doc = makeDoc({
      fighterLevel: 9,
      weaponTrainingGroups: ["bows", "hammers"],
      weapons: [longbow, warhammer],
      gear: [gloves],
    });
    const sheet = compute(doc, ref);
    const baseSheet = compute(base, ref);
    // bows: WT +2, gloves +2; hammers: WT +1, gloves +2
    expect(sheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(4);
    expect(sheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total).toBe(4);
    expect(sheet.attacks[1]!.attack.total - baseSheet.attacks[1]!.attack.total).toBe(3);
    expect(sheet.attacks[1]!.damageBonus.total - baseSheet.attacks[1]!.damageBonus.total).toBe(3);
    const source = sheet.attacks[0]!.attack.components.find(
      (c) => c.source === "Gloves of Dueling",
    );
    expect(source?.value).toBe(2);
  });

  it("CMD vs disarm and sunder: 19 + WT 2 + gloves' WT raise 2 + gloves' own 4", () => {
    const doc = makeDoc({
      fighterLevel: 9,
      weaponTrainingGroups: ["bows", "hammers"],
      weapons: [longbow, warhammer],
      gear: [gloves],
    });
    expect(compute(doc, ref).cmd).toBe(19);
    expect(disarmCmd(doc)).toBe(27);
  });

  it("without weapon training only the +4 CMD applies", () => {
    const base = makeDoc({ fighterLevel: 4, weapons: [longbow] });
    const doc = makeDoc({ fighterLevel: 4, weapons: [longbow], gear: [gloves] });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.attack.total).toBe(compute(base, ref).attacks[0]!.attack.total);
    expect(disarmCmd(doc)).toBe(sheet.cmd + 4);
  });
});
