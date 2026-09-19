/**
 * Hand-computed fixtures for threat-range widening (`crit-range.ts`).
 *
 * Expected ranges come straight from the rule the published feat states:
 * the threat range doubles, so an 18-20 rapier (3 numbers) becomes 15-20
 * (6 numbers) and a 20 weapon becomes 19-20. Swashbuckler Weapon Training
 * (Advanced Class Guide, swashbuckler 5th) grants that benefit "while
 * wielding" a one-handed or light piercing melee weapon; the feat's own text
 * forbids stacking it with any other threat-range expansion (keen).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

/** The vendored catalog id for a mundane weapon, by name. */
function weaponId(name: string): string {
  const found = Object.entries(ref.weapons).find(([, w]) => w.name === name);
  if (!found) throw new Error(`weapon "${name}" not found in ref data`);
  return found[0];
}

const RAPIER = weaponId("Rapier");
const LONGSWORD = weaponId("Longsword");
const DAGGER = weaponId("Dagger");
/** Improved Critical, as taken by a player (its choice is a `group` slug). */
const IMPROVED_CRITICAL = Object.entries(ref.feats).find(
  ([, f]) => f.name === "Improved Critical",
)![0];

/** A rapier as the weapon picker stores it: catalog id, catalog 18-20 threat. */
function rapier(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    name: "Rapier",
    weaponId: RAPIER,
    group: "rapier",
    attackAbility: "str",
    damageDice: "1d6",
    critRange: 18,
    critMult: 2,
    category: "melee",
    ...overrides,
  };
}

function makeDoc(
  classes: CharacterDoc["identity"]["classes"],
  weapons: WeaponInstance[],
  build: Partial<CharacterDoc["build"]> = {},
): CharacterDoc {
  const humanId = Object.entries(ref.races).find(([, r]) => r.name === "Human")![0];
  return {
    schemaVersion: 1,
    id: "crit-range-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test Blade", race: humanId, classes },
    abilities: { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 12 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
      ...build,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function attack(doc: CharacterDoc) {
  return compute(doc, ref).attacks[0]!;
}

describe("Swashbuckler Weapon Training", () => {
  it("doubles a rapier's 18-20 threat range to 15-20 at 5th level", () => {
    const atk = attack(makeDoc([{ tag: "swashbuckler", level: 5 }], [rapier()]));
    expect(atk.crit).toBe("15–20/×2");
    expect(atk.critWidenedBy).toBe("Swashbuckler Weapon Training");
  });

  it("does nothing at 4th level", () => {
    const atk = attack(makeDoc([{ tag: "swashbuckler", level: 4 }], [rapier()]));
    expect(atk.crit).toBe("18–20/×2");
    expect(atk.critWidenedBy).toBeUndefined();
  });

  it("leaves a slashing weapon alone, granted Improved Critical notwithstanding", () => {
    // The class grant expands Improved Critical into the feat list, but with
    // no chosen weapon — a longsword must not pick it up.
    const longsword: WeaponInstance = {
      name: "Longsword",
      weaponId: LONGSWORD,
      group: "longsword",
      attackAbility: "str",
      critRange: 19,
      critMult: 2,
    };
    const atk = attack(makeDoc([{ tag: "swashbuckler", level: 5 }], [longsword]));
    expect(atk.crit).toBe("19–20/×2");
    expect(atk.critWidenedBy).toBeUndefined();
  });

  it("covers a light piercing weapon too (dagger, 19-20 to 17-20)", () => {
    const dagger: WeaponInstance = {
      name: "Dagger",
      weaponId: DAGGER,
      group: "dagger",
      attackAbility: "str",
      critRange: 19,
      critMult: 2,
    };
    const atk = attack(makeDoc([{ tag: "swashbuckler", level: 5 }], [dagger]));
    expect(atk.crit).toBe("17–20/×2");
  });

  it("does not stack with keen: a keen rapier keeps its 15-20", () => {
    // The weapon picker already doubled 18 to 15 when `keen` was added.
    const atk = attack(
      makeDoc(
        [{ tag: "swashbuckler", level: 5 }],
        [rapier({ critRange: 15, enhancement: 1, abilities: ["keen"] })],
      ),
    );
    expect(atk.crit).toBe("15–20/×2");
    expect(atk.critWidenedBy).toBeUndefined();
  });

  it("leaves a hand-entered custom weapon alone (no catalog range to double)", () => {
    const custom: WeaponInstance = {
      name: "Heirloom Rapier",
      group: "rapier",
      attackAbility: "str",
      critRange: 18,
      critMult: 2,
    };
    const atk = attack(makeDoc([{ tag: "swashbuckler", level: 5 }], [custom]));
    expect(atk.crit).toBe("18–20/×2");
    expect(atk.critWidenedBy).toBeUndefined();
  });

  it("is gone for a mysterious avenger, who trades it away", () => {
    const atk = attack(
      makeDoc([{ tag: "swashbuckler", level: 5 }], [rapier()], {
        archetypes: ["swashbuckler:mysterious-avenger"],
      }),
    );
    expect(atk.crit).toBe("18–20/×2");
  });

  it("narrows to rapiers for an inspired blade", () => {
    const dagger: WeaponInstance = {
      name: "Dagger",
      weaponId: DAGGER,
      group: "dagger",
      attackAbility: "str",
      critRange: 19,
      critMult: 2,
    };
    const doc = makeDoc([{ tag: "swashbuckler", level: 5 }], [rapier(), dagger], {
      archetypes: ["swashbuckler:inspired-blade"],
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.crit).toBe("15–20/×2");
    expect(sheet.attacks[0]!.critWidenedBy).toBe("Rapier Training");
    expect(sheet.attacks[1]!.crit).toBe("19–20/×2");
  });
});

describe("Improved Critical (taken as a feat)", () => {
  it("doubles the chosen weapon's range", () => {
    const longsword: WeaponInstance = {
      name: "Longsword",
      weaponId: LONGSWORD,
      group: "longsword",
      attackAbility: "str",
      critRange: 19,
      critMult: 2,
    };
    const atk = attack(
      makeDoc([{ tag: "fighter", level: 8 }], [longsword], {
        feats: [IMPROVED_CRITICAL],
        featChoices: { [IMPROVED_CRITICAL]: "longsword" },
      }),
    );
    expect(atk.crit).toBe("17–20/×2");
    expect(atk.critWidenedBy).toBe("Improved Critical");
  });

  it("leaves a weapon the feat wasn't chosen for alone", () => {
    const dagger: WeaponInstance = {
      name: "Dagger",
      weaponId: DAGGER,
      group: "dagger",
      attackAbility: "str",
      critRange: 19,
      critMult: 2,
    };
    const atk = attack(
      makeDoc([{ tag: "fighter", level: 8 }], [dagger], {
        feats: [IMPROVED_CRITICAL],
        featChoices: { [IMPROVED_CRITICAL]: "longsword" },
      }),
    );
    expect(atk.crit).toBe("19–20/×2");
  });

  it("widens a 20-only weapon to 19-20", () => {
    const club = Object.entries(ref.weapons).find(([, w]) => w.name === "Club")!;
    const weapon: WeaponInstance = {
      name: "Club",
      weaponId: club[0],
      group: "club",
      attackAbility: "str",
      critMult: 2,
    };
    const atk = attack(
      makeDoc([{ tag: "fighter", level: 8 }], [weapon], {
        feats: [IMPROVED_CRITICAL],
        featChoices: { [IMPROVED_CRITICAL]: "club" },
      }),
    );
    expect(atk.crit).toBe("19–20/×2");
  });
});
