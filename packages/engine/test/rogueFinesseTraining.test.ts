import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture coverage for Rogue (Unchained) Finesse Training's Dex-to-damage
 * substitution (issue #65 — previously deferred, see IMPLEMENTATION_PLAN.md's
 * Rogue (Unchained) as-built section). PF1 RAW: "at 3rd level ... she can
 * select any one type of weapon that can be used with Weapon Finesse ...
 * whenever she makes a successful melee attack with the selected weapon, she
 * adds her Dexterity modifier instead of her Strength modifier to the damage
 * roll" (verified against aonprd.com/d20pfsrd.com's Rogue (Unchained) class
 * page). `build.rogueFinesseWeapons` stores the free-text weapon TYPE picked
 * at each of the three tiers (3rd/11th/19th — `ROGUE_FINESSE_TRAINING_LEVELS`);
 * `computeWeaponAttacks` in `compute.ts` matches a pick against an equipped
 * `WeaponInstance`'s `name`/`group` (case-insensitive) and swaps the damage
 * ability to Dex automatically, unless the player has explicitly set
 * `damageAbility` themselves.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITIES = { str: 10, dex: 18, con: 12, int: 10, wis: 10, cha: 10 } as const;

function rapier(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    name: "Rapier",
    category: "melee",
    attackAbility: "dex",
    critRange: 18,
    ...overrides,
  };
}

function makeDoc(
  level: number,
  rogueFinesseWeapons: string[],
  weapons: WeaponInstance[],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "rogueUnchained", level }] },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      rogueFinesseWeapons,
      weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Rogue (Unchained) L3 Finesse Training: rapier gets Dex to damage", () => {
  it("swaps STR for DEX on a matching weapon's damage bonus", () => {
    const doc = makeDoc(3, ["rapier"], [rapier()]);
    const sheet = compute(doc, ref);
    const attack = sheet.attacks[0]!;
    // str 10 -> mod 0; dex 18 -> mod +4. Damage should reflect +4 (Dex), not +0 (Str).
    expect(attack.damageBonus.total).toBe(4);
    expect(attack.damageBonus.components.some((c) => c.source === "Dexterity")).toBe(true);
    expect(attack.damageBonus.components.some((c) => c.source === "Strength")).toBe(false);
  });

  it("does not apply below 3rd level (tier not yet unlocked)", () => {
    const doc = makeDoc(2, ["rapier"], [rapier()]);
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("does not apply to a non-matching weapon", () => {
    const doc = makeDoc(3, ["rapier"], [rapier({ name: "Longsword", group: "longsword" })]);
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("does not apply to a ranged weapon even if the name matches", () => {
    const doc = makeDoc(3, ["rapier"], [rapier({ category: "ranged" })]);
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("an explicit player-set damageAbility of 'none' overrides the automatic Dex swap", () => {
    const doc = makeDoc(3, ["rapier"], [rapier({ damageAbility: "none" })]);
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("matches via the weapon's free-text group tag too, not just its name", () => {
    const doc = makeDoc(
      3,
      ["main-gauche"],
      [rapier({ name: "Custom Blade", group: "main-gauche" })],
    );
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });

  it("only 1 pick is unlocked at 3rd level even if 2 entries are stored (2nd tier not reached)", () => {
    const doc = makeDoc(3, ["rapier", "dagger"], [rapier({ name: "Dagger", group: "dagger" })]);
    // "dagger" is index 1 (the 11th-level tier) — not unlocked yet at L3.
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });
});
