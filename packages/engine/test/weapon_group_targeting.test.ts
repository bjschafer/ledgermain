/**
 * Fixture tests for the semantic weapon-group targeting fix (issue #45,
 * finding 1 — "the weapon-group-tagging gap"). Before this fix,
 * `attack.weapon.<group>` / `damage.weapon.<group>` only ever matched a
 * weapon's free-text `.group` tag (Weapon Focus/Specialization's mechanism —
 * see `weapon_feats.test.ts`). `computeWeaponAttacks` now ALSO matches a
 * weapon's vendored, normalized `.weaponGroups` (Weapon Training's semantic
 * vocabulary — `weapon-groups.ts`), in addition to `.group`, without
 * double-applying when both paths reach the same target.
 *
 * These fixtures use a hand-authored `live.activeBuffs` entry as the generic
 * "grant an arbitrary Change" mechanism (any `attack.weapon.<group>` source —
 * a feat, an archetype feature, a buff — is collected identically by
 * `collect.ts`), so the targeting logic itself is exercised independent of
 * any specific feature.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buff(target: string, formula: string): ActiveBuff {
  return {
    instanceId: `buff-${target}`,
    name: `Test Buff (${target})`,
    changes: [{ target, type: "untyped", formula }],
  };
}

function makeDoc(over: { weapons: WeaponInstance[]; buffs?: ActiveBuff[] }): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "weapon-group-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 4 }],
    },
    // Abilities all 10 → no ability mod contribution; isolates the targeting logic.
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: over.weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.buffs ?? [],
      resources: {},
    },
  };
}

const longbow: WeaponInstance = {
  name: "Longbow",
  attackAbility: "dex",
  damageDice: "1d8",
  category: "ranged",
  // Deliberately no free-text `group` — this is the vendored-groups-only case.
  weaponGroups: ["bows"],
};

describe("(a) vendored weapon group, no free-text tag", () => {
  it("a bow with weaponGroups: ['bows'] picks up an attack.weapon.bows bonus", () => {
    const base = makeDoc({ weapons: [longbow] });
    const withBuff = makeDoc({ weapons: [longbow], buffs: [buff("attack.weapon.bows", "3")] });
    const baseSheet = compute(base, ref);
    const buffedSheet = compute(withBuff, ref);
    expect(buffedSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(3);
  });

  it("also applies to damage.weapon.<group>", () => {
    const base = makeDoc({ weapons: [longbow] });
    const withBuff = makeDoc({ weapons: [longbow], buffs: [buff("damage.weapon.bows", "4")] });
    const baseSheet = compute(base, ref);
    const buffedSheet = compute(withBuff, ref);
    expect(
      buffedSheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total,
    ).toBe(4);
  });

  it("does not apply to an unrelated group", () => {
    const withBuff = makeDoc({ weapons: [longbow], buffs: [buff("attack.weapon.hammers", "3")] });
    const base = makeDoc({ weapons: [longbow] });
    expect(compute(withBuff, ref).attacks[0]!.attack.total).toBe(
      compute(base, ref).attacks[0]!.attack.total,
    );
  });

  it("normalizes raw vendored (camelCase) group casing too, e.g. 'bladesHeavy'", () => {
    const bastardSword: WeaponInstance = {
      name: "Bastard Sword",
      attackAbility: "str",
      damageDice: "1d10",
      category: "melee",
      // Un-normalized, as it would appear straight from RefData.weapons before
      // the doc.ts snapshot normalizes it — compute.ts must normalize too.
      weaponGroups: ["bladesHeavy"],
    };
    const base = makeDoc({ weapons: [bastardSword] });
    const withBuff = makeDoc({
      weapons: [bastardSword],
      buffs: [buff("attack.weapon.blades-heavy", "2")],
    });
    expect(
      compute(withBuff, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(2);
  });
});

describe("(b) free-text .group tag still works alone", () => {
  const customWarhammer: WeaponInstance = {
    name: "Custom Warhammer",
    attackAbility: "str",
    damageDice: "1d8",
    category: "melee",
    group: "warhammer",
    // No vendored weaponGroups — a hand-entered custom weapon.
  };

  it("a hand-entered weapon with only a free-text group still matches its own tag", () => {
    const base = makeDoc({ weapons: [customWarhammer] });
    const withBuff = makeDoc({
      weapons: [customWarhammer],
      buffs: [buff("attack.weapon.warhammer", "2")],
    });
    expect(
      compute(withBuff, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(2);
  });
});

describe("(c) free-text tag + vendored group together don't double-apply", () => {
  it("a weapon whose free-text tag equals its own normalized vendored group applies the bonus once", () => {
    // Contrived, but exercises the exact double-count risk: .group and one
    // entry of .weaponGroups both resolve to the same target key ("bows").
    const weirdBow: WeaponInstance = {
      name: "Weird Bow",
      attackAbility: "dex",
      damageDice: "1d6",
      category: "ranged",
      group: "bows",
      weaponGroups: ["bows"],
    };
    const base = makeDoc({ weapons: [weirdBow] });
    const withBuff = makeDoc({ weapons: [weirdBow], buffs: [buff("attack.weapon.bows", "3")] });
    expect(
      compute(withBuff, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(3);
  });

  it("a weapon with a distinct free-text tag AND a vendored group each contribute their own bonus, summed once each", () => {
    const compositeBow: WeaponInstance = {
      name: "Masterwork Composite Longbow",
      attackAbility: "dex",
      damageDice: "1d8",
      category: "ranged",
      group: "composite-longbow",
      weaponGroups: ["bows"],
    };
    const base = makeDoc({ weapons: [compositeBow] });
    const withBoth = makeDoc({
      weapons: [compositeBow],
      buffs: [buff("attack.weapon.composite-longbow", "1"), buff("attack.weapon.bows", "3")],
    });
    // +1 (Weapon-Focus-shaped, free-text tag) + 3 (semantic group) = +4, not applied twice.
    expect(
      compute(withBoth, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(4);
  });
});

describe("(d) a weapon in two vendored groups gets a bonus targeted at either", () => {
  // Trident is vendored with weaponGroups: ["spears", "thrown"].
  const trident: WeaponInstance = {
    name: "Trident",
    attackAbility: "str",
    damageDice: "1d8",
    category: "melee",
    weaponGroups: ["spears", "thrown"],
  };

  it("a bonus targeted at 'spears' applies", () => {
    const base = makeDoc({ weapons: [trident] });
    const withBuff = makeDoc({ weapons: [trident], buffs: [buff("attack.weapon.spears", "2")] });
    expect(
      compute(withBuff, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(2);
  });

  it("a bonus targeted at 'thrown' also applies, to the same weapon", () => {
    const base = makeDoc({ weapons: [trident] });
    const withBuff = makeDoc({ weapons: [trident], buffs: [buff("attack.weapon.thrown", "2")] });
    expect(
      compute(withBuff, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(2);
  });

  it("bonuses on both groups stack", () => {
    const base = makeDoc({ weapons: [trident] });
    const withBoth = makeDoc({
      weapons: [trident],
      buffs: [buff("attack.weapon.spears", "2"), buff("attack.weapon.thrown", "1")],
    });
    expect(
      compute(withBoth, ref).attacks[0]!.attack.total - compute(base, ref).attacks[0]!.attack.total,
    ).toBe(3);
  });
});
