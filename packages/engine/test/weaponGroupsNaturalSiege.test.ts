/**
 * Fixture tests for the "natural" and "siege-engines" additions to
 * `WEAPON_GROUPS` (Ultimate Combat p.106-107 expands the fighter Weapon
 * Training group list to include Natural and Siege Engines, on top of the
 * APG/CRB set already vendored). No weapon in this app's vendored
 * `weapons.json` slice carries either tag today (verified via
 * `jq -r '.[] | .weaponGroups[]?' packages/data-pipeline/data/weapons.json | sort -u`
 * — see `weapon-groups.ts`'s doc comment), so these tests exercise the
 * targeting MECHANISM (a `WeaponInstance.weaponGroups` entry naming one of
 * the two new groups correctly matches an `attack.weapon.<group>` /
 * `damage.weapon.<group>` Change) rather than any real vendored weapon.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, isKnownWeaponGroup, normalizeWeaponGroup, WEAPON_GROUPS } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(weapon: WeaponInstance, buffs: ActiveBuff[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "weapon-group-natural-siege-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 5 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [weapon],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: buffs,
      resources: {},
    },
  };
}

describe("WEAPON_GROUPS: 'natural' and 'siege-engines' (Ultimate Combat p.106-107)", () => {
  it("both are known slugs", () => {
    expect(WEAPON_GROUPS).toContain("natural");
    expect(WEAPON_GROUPS).toContain("siege-engines");
    expect(isKnownWeaponGroup("natural")).toBe(true);
    expect(isKnownWeaponGroup("siege-engines")).toBe(true);
  });

  it("normalizes the same as any other group slug", () => {
    expect(normalizeWeaponGroup("Natural")).toBe("natural");
    expect(normalizeWeaponGroup("siegeEngines")).toBe("siege-engines");
  });

  it("a weapon tagged 'natural' matches an attack.weapon.natural Change", () => {
    const weapon: WeaponInstance = {
      name: "Bite",
      attackAbility: "str",
      weaponGroups: ["natural"],
    };
    const focus: ActiveBuff = {
      instanceId: "buff-natural-focus",
      name: "Weapon Training (Natural)",
      changes: [{ target: "attack.weapon.natural", type: "untyped", formula: "1" }],
    };
    const sheet = compute(makeDoc(weapon, [focus]), ref);
    const comp = sheet.attacks[0]!.attack.components.find(
      (c) => c.source === "Weapon Training (Natural)",
    );
    expect(comp?.value).toBe(1);
    expect(comp?.applied).toBe(true);
  });

  it("a weapon tagged 'siege-engines' matches a damage.weapon.siege-engines Change", () => {
    const weapon: WeaponInstance = {
      name: "Ballista",
      attackAbility: "str",
      weaponGroups: ["siegeEngines"],
    };
    const training: ActiveBuff = {
      instanceId: "buff-siege-training",
      name: "Weapon Training (Siege Engines)",
      changes: [{ target: "damage.weapon.siege-engines", type: "untyped", formula: "2" }],
    };
    const sheet = compute(makeDoc(weapon, [training]), ref);
    const comp = sheet.attacks[0]!.damageBonus.components.find(
      (c) => c.source === "Weapon Training (Siege Engines)",
    );
    expect(comp?.value).toBe(2);
    expect(comp?.applied).toBe(true);
  });

  it("a 'natural'-targeting Change does not leak onto an unrelated weapon", () => {
    const weapon: WeaponInstance = { name: "Longsword", attackAbility: "str", group: "longsword" };
    const focus: ActiveBuff = {
      instanceId: "buff-natural-focus-2",
      name: "Weapon Training (Natural)",
      changes: [{ target: "attack.weapon.natural", type: "untyped", formula: "1" }],
    };
    const sheet = compute(makeDoc(weapon, [focus]), ref);
    expect(
      sheet.attacks[0]!.attack.components.some((c) => c.source === "Weapon Training (Natural)"),
    ).toBe(false);
  });
});
