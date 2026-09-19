/**
 * Class grants whose pick the published text names outright ("gains Weapon
 * Focus (rapier) as a bonus feat"). The feat's effect is `build(choiceId)`, so
 * a grant with no stored pick resolves to nothing at all — these fixtures
 * check the number actually arrives, and that a player's own copy of the same
 * feat is neither clobbered nor doubled.
 *
 * Expected values from the feats themselves: Weapon Focus +1 attack with the
 * chosen weapon (CRB p.136), Skill Focus +3 on the chosen skill below 10
 * ranks (CRB p.134).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, grantedFeats } from "../src/index.js";

const ref = loadRefData();

const featId = (name: string): string =>
  Object.entries(ref.feats).find(([, f]) => f.name === name)![0];
const WEAPON_FOCUS = featId("Weapon Focus");

function weapon(name: string, group: string, catalogName = name): WeaponInstance {
  const [id, w] = Object.entries(ref.weapons).find(([, x]) => x.name === catalogName)!;
  return {
    name,
    weaponId: id,
    group,
    attackAbility: "str",
    category: "melee",
    ...(w.critRange !== undefined && w.critRange !== 20 ? { critRange: w.critRange } : {}),
  };
}

function makeDoc(
  classes: CharacterDoc["identity"]["classes"],
  weapons: WeaponInstance[] = [],
  build: Partial<CharacterDoc["build"]> = {},
): CharacterDoc {
  const humanId = Object.entries(ref.races).find(([, r]) => r.name === "Human")![0];
  return {
    schemaVersion: 1,
    id: "granted-choice-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: humanId, classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
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

const inspiredBlade = (level: number, build: Partial<CharacterDoc["build"]> = {}) =>
  makeDoc([{ tag: "swashbuckler", level }], [weapon("Rapier", "rapier")], {
    archetypes: ["swashbuckler:inspired-blade"],
    ...build,
  });

describe("an inspired blade's granted Weapon Focus (rapier)", () => {
  it("adds its +1 to the rapier's attack line", () => {
    const base = compute(
      makeDoc([{ tag: "swashbuckler", level: 1 }], [weapon("Rapier", "rapier")]),
      ref,
    );
    const withArchetype = compute(inspiredBlade(1), ref);
    expect(withArchetype.attacks[0]!.attack.total).toBe(base.attacks[0]!.attack.total + 1);
  });

  it("is reported as a granted feat carrying the pick the text fixed", () => {
    const granted = grantedFeats(inspiredBlade(1), ref);
    const focus = granted.find((g) => g.featId === WEAPON_FOCUS);
    expect(focus?.choiceId).toBe("rapier");
  });

  it("does not double when the player bought Weapon Focus (rapier) as well", () => {
    const bought = compute(
      inspiredBlade(1, { feats: [WEAPON_FOCUS], featChoices: { [WEAPON_FOCUS]: "rapier" } }),
      ref,
    );
    expect(bought.attacks[0]!.attack.total).toBe(
      compute(inspiredBlade(1), ref).attacks[0]!.attack.total,
    );
  });

  it("keeps the player's own different pick and applies the granted one too", () => {
    const longsword = weapon("Longsword", "longsword");
    const doc = makeDoc(
      [{ tag: "swashbuckler", level: 1 }],
      [weapon("Rapier", "rapier"), longsword],
      {
        archetypes: ["swashbuckler:inspired-blade"],
        feats: [WEAPON_FOCUS],
        featChoices: { [WEAPON_FOCUS]: "longsword" },
      },
    );
    const plain = makeDoc(
      [{ tag: "swashbuckler", level: 1 }],
      [weapon("Rapier", "rapier"), longsword],
    );
    const sheet = compute(doc, ref);
    const baseline = compute(plain, ref);
    // Both weapons gain exactly +1: the rapier from the class, the longsword
    // from the player's own copy.
    expect(sheet.attacks[0]!.attack.total).toBe(baseline.attacks[0]!.attack.total + 1);
    expect(sheet.attacks[1]!.attack.total).toBe(baseline.attacks[1]!.attack.total + 1);
  });
});

describe("other fixed-pick grants", () => {
  it("a kapenia dancer's Weapon Focus lands on the bladed scarf", () => {
    const scarf = weapon("Bladed Scarf", "bladed-scarf");
    const doc = makeDoc([{ tag: "magus", level: 1 }], [scarf], {
      archetypes: ["magus:kapenia-dancer"],
    });
    const base = compute(makeDoc([{ tag: "magus", level: 1 }], [scarf]), ref);
    expect(compute(doc, ref).attacks[0]!.attack.total).toBe(base.attacks[0]!.attack.total + 1);
  });

  it("a dragoon's Skill Focus (Ride) is +3 on Ride", () => {
    const doc = makeDoc([{ tag: "fighter", level: 1 }], [], { archetypes: ["fighter:dragoon"] });
    const base = compute(makeDoc([{ tag: "fighter", level: 1 }]), ref);
    const rideOf = (s: ReturnType<typeof compute>) => s.skills["rid"]!.total;
    expect(rideOf(compute(doc, ref))).toBe(rideOf(base) + 3);
  });

  it("a chirurgeon's Skill Focus (Heal) arrives at 5th level, not before", () => {
    const chirurgeon = (level: number) =>
      makeDoc([{ tag: "alchemist", level }], [], { archetypes: ["alchemist:chirurgeon"] });
    const healOf = (doc: CharacterDoc) => compute(doc, ref).skills["hea"]!.total;
    expect(healOf(chirurgeon(5))).toBe(healOf(makeDoc([{ tag: "alchemist", level: 5 }])) + 3);
    expect(healOf(chirurgeon(4))).toBe(healOf(makeDoc([{ tag: "alchemist", level: 4 }])));
  });
});
