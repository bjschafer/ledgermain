/**
 * Fixture tests for the "Accurate Stance doesn't apply to touch attacks" bug
 * report. The actual defect had two parts:
 *
 * 1. `tattack` (Foundry/PF1's target for THROWN weapon attack rolls, not
 *    touch attacks — PF1 has no separate touch-attack change target; an
 *    ordinary melee/ranged attack roll compared against touch AC already
 *    uses `mattack`/`rattack`) was mislabeled "touch attack rolls" in the
 *    UI (`targets.ts`/`names.ts`).
 * 2. `tattack` was never consumed by `computeWeaponAttacks`, so the bonus
 *    silently never applied to any attack roll at all, regardless of label.
 *
 * These fixtures cover the fix: `tattack`/`twdamage` now join a weapon's
 * attack/damage stack when — and only when — that weapon instance is BOTH
 * category "ranged" AND tagged "thrown" in its vendored `weaponGroups`. This
 * app models one weapon instance with a single fixed category, so a melee
 * weapon that merely CAN be thrown (a dagger) does not pick up the
 * thrown-only bonus on its melee line — see compute.ts's `isThrownAttack`
 * doc comment for the reasoning.
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

function buffByName(name: string) {
  const entry = Object.values(ref.buffs).find((b) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry;
}

function tattackBuff(formula = "3"): ActiveBuff {
  return {
    instanceId: "tattack-buff",
    name: "Test Thrown Buff",
    changes: [{ target: "tattack", type: "competence", formula }],
  };
}

function twdamageBuff(formula = "2"): ActiveBuff {
  return {
    instanceId: "twdamage-buff",
    name: "Test Thrown Damage Buff",
    changes: [{ target: "twdamage", type: "untyped", formula }],
  };
}

function makeDoc(over: {
  weapons: WeaponInstance[];
  buffs?: ActiveBuff[];
  classTag?: string;
  level?: number;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "thrown-weapon-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Thrower",
      race: raceId("Human"),
      classes: [{ tag: over.classTag ?? "fighter", level: over.level ?? 4 }],
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

// Vendored: category "ranged", weaponGroups ["spears", "thrown"].
const javelin: WeaponInstance = {
  name: "Javelin",
  attackAbility: "str",
  damageDice: "1d6",
  category: "ranged",
  weaponGroups: ["spears", "thrown"],
};

// Vendored: category "ranged", weaponGroups ["bows"] — no "thrown".
const longbow: WeaponInstance = {
  name: "Longbow",
  attackAbility: "dex",
  damageDice: "1d8",
  category: "ranged",
  weaponGroups: ["bows"],
};

// Vendored: category "melee" by default, but weaponGroups includes "thrown"
// (a dagger can be thrown) — this instance represents swinging it, not
// throwing it.
const dagger: WeaponInstance = {
  name: "Dagger",
  attackAbility: "str",
  damageDice: "1d4",
  category: "melee",
  weaponGroups: ["bladesLight", "thrown", "tribal"],
};

describe("tattack (thrown weapon attack rolls)", () => {
  it("a thrown weapon (javelin: ranged + thrown group) gains a tattack competence bonus", () => {
    const base = compute(makeDoc({ weapons: [javelin] }), ref);
    const buffed = compute(makeDoc({ weapons: [javelin], buffs: [tattackBuff("3")] }), ref);
    expect(buffed.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(3);
    const comp = buffed.attacks[0]!.attack.components.find((c) => c.source === "Test Thrown Buff");
    expect(comp?.applied).toBe(true);
  });

  it("a non-thrown ranged weapon (longbow: ranged, bows group only) does NOT gain the tattack bonus", () => {
    const base = compute(makeDoc({ weapons: [longbow] }), ref);
    const buffed = compute(makeDoc({ weapons: [longbow], buffs: [tattackBuff("3")] }), ref);
    expect(buffed.attacks[0]!.attack.total).toBe(base.attacks[0]!.attack.total);
  });

  it("a melee-category weapon that CAN be thrown (dagger swung in melee) does NOT gain the tattack bonus on its melee line", () => {
    const base = compute(makeDoc({ weapons: [dagger] }), ref);
    const buffed = compute(makeDoc({ weapons: [dagger], buffs: [tattackBuff("3")] }), ref);
    expect(buffed.attacks[0]!.attack.total).toBe(base.attacks[0]!.attack.total);
  });

  it("the same dagger set up as a ranged (thrown) instance DOES gain the bonus — the player's own category choice decides it", () => {
    const thrownDagger: WeaponInstance = { ...dagger, category: "ranged" };
    const base = compute(makeDoc({ weapons: [thrownDagger] }), ref);
    const buffed = compute(makeDoc({ weapons: [thrownDagger], buffs: [tattackBuff("3")] }), ref);
    expect(buffed.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(3);
  });
});

describe("twdamage (thrown weapon damage)", () => {
  it("a thrown weapon (javelin) gains a twdamage bonus", () => {
    const base = compute(makeDoc({ weapons: [javelin] }), ref);
    const buffed = compute(makeDoc({ weapons: [javelin], buffs: [twdamageBuff("2")] }), ref);
    expect(buffed.attacks[0]!.damageBonus.total - base.attacks[0]!.damageBonus.total).toBe(2);
  });

  it("a non-thrown ranged weapon (longbow) does NOT gain the twdamage bonus", () => {
    const base = compute(makeDoc({ weapons: [longbow] }), ref);
    const buffed = compute(makeDoc({ weapons: [longbow], buffs: [twdamageBuff("2")] }), ref);
    expect(buffed.attacks[0]!.damageBonus.total).toBe(base.attacks[0]!.damageBonus.total);
  });

  it("a melee-category dagger does NOT gain the twdamage bonus", () => {
    const base = compute(makeDoc({ weapons: [dagger] }), ref);
    const buffed = compute(makeDoc({ weapons: [dagger], buffs: [twdamageBuff("2")] }), ref);
    expect(buffed.attacks[0]!.damageBonus.total).toBe(base.attacks[0]!.damageBonus.total);
  });
});

describe("Accurate Stance end to end (the actual reported bug)", () => {
  // RAW (Ultimate Combat p.9): "+1 competence bonus on melee attack rolls
  // and thrown weapon attack rolls. This bonus increases by 1 for every 4
  // levels the barbarian has." Vendored as a real buff (RefData.buffs id
  // CjQ4VmDIRBb3k7Dg) carrying `mattack`/`tattack` competence Changes with
  // formula "1 + floor(@classes.barbarianUnchained.level / 4)".
  function accurateStanceInstance(): ActiveBuff {
    const buff = buffByName("Accurate Stance");
    return {
      instanceId: "accurate-stance-1",
      buffId: buff.id,
      name: buff.name,
      changes: buff.changes,
    };
  }

  it("a level-4 Unchained Barbarian throwing a javelin gets +2 on the thrown attack roll", () => {
    const doc = makeDoc({
      weapons: [javelin],
      classTag: "barbarianUnchained",
      level: 4,
      buffs: [accurateStanceInstance()],
    });
    const baseline = makeDoc({ weapons: [javelin], classTag: "barbarianUnchained", level: 4 });
    const sheet = compute(doc, ref);
    const base = compute(baseline, ref);
    // 1 + floor(4/4) = 2.
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(2);
  });

  it("the same barbarian's melee weapon also gets the +2 (mattack, unaffected by this fix)", () => {
    const sword: WeaponInstance = {
      name: "Longsword",
      attackAbility: "str",
      damageDice: "1d8",
      category: "melee",
    };
    const doc = makeDoc({
      weapons: [sword],
      classTag: "barbarianUnchained",
      level: 4,
      buffs: [accurateStanceInstance()],
    });
    const baseline = makeDoc({ weapons: [sword], classTag: "barbarianUnchained", level: 4 });
    const sheet = compute(doc, ref);
    const base = compute(baseline, ref);
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(2);
  });
});
