import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import { featNameSlug } from "../src/feat-effects.js";

/**
 * Fixture coverage for the Weapon Finesse family — the feats whose whole
 * content is "use Dex instead of Str on this weapon's attack and/or damage"
 * (`dex-weapon-feats.ts`). Expected values are hand-computed from the
 * published text of each feat, quoted in the registry itself.
 *
 * The shared fixture is a 1st-level fighter (BAB +1) with Str 12 (+1) and
 * Dex 18 (+4), so every substituted line moves by a visible 3 and a failed
 * substitution is never mistakable for a successful one.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const slug = featNameSlug(name);
  const entry = Object.entries(ref.feats).find(([, f]) => featNameSlug(f.name) === slug);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

const STR_MOD = 1;
const DEX_MOD = 4;

function makeDoc(
  feats: string[],
  weapons: WeaponInstance[],
  opts: { abilities?: CharacterDoc["abilities"]; featChoices?: Record<string, string> } = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: opts.abilities ?? { str: 12, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: feats.map(featId),
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
      ...(opts.featChoices
        ? {
            featChoices: Object.fromEntries(
              Object.entries(opts.featChoices).map(([name, choice]) => [featId(name), choice]),
            ),
          }
        : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** A weapon left at the defaults a freshly-picked one carries: Str to hit, Str to damage. */
function weapon(
  name: string,
  group: string,
  overrides: Partial<WeaponInstance> = {},
): WeaponInstance {
  return {
    name,
    group,
    category: "melee",
    attackAbility: "str",
    damageAbility: "str",
    ...overrides,
  };
}

const rapier = (o: Partial<WeaponInstance> = {}) =>
  weapon("Rapier", "rapier", { weaponId: "LA6TC5679iOXDNwq", ...o });
const scimitar = (o: Partial<WeaponInstance> = {}) =>
  weapon("Scimitar", "scimitar", { weaponId: "SjYkpvZqfgvh0EAd", ...o });
const longsword = (o: Partial<WeaponInstance> = {}) =>
  weapon("Longsword", "longsword", { weaponId: "zWRlna42PMJVX6un", ...o });
const dagger = (o: Partial<WeaponInstance> = {}) =>
  weapon("Dagger", "dagger", { weaponId: "fOSuWwRSZLTrROch", ...o });

function lines(doc: CharacterDoc) {
  const a = compute(doc, ref).attacks[0]!;
  return {
    attack: a.attack.total,
    damage: a.damageBonus.total,
    attackSources: a.attack.components.map((c) => c.source),
    damageSources: a.damageBonus.components.map((c) => c.source),
  };
}

describe("Weapon Finesse: Dex on the attack line", () => {
  it("promotes a rapier's attack ability without touching damage", () => {
    const l = lines(makeDoc(["Weapon Finesse"], [rapier()]));
    expect(l.attack).toBe(1 + DEX_MOD);
    expect(l.damage).toBe(STR_MOD);
    expect(l.attackSources).toContain("Dexterity (Weapon Finesse)");
    expect(l.damageSources).toContain("Strength");
  });

  it("promotes a light weapon, identified through the vendored catalog's weaponSubtype", () => {
    expect(lines(makeDoc(["Weapon Finesse"], [dagger()])).attack).toBe(1 + DEX_MOD);
  });

  it("leaves a weapon the feat doesn't name alone (a longsword is neither light nor listed)", () => {
    const l = lines(makeDoc(["Weapon Finesse"], [longsword()]));
    expect(l.attack).toBe(1 + STR_MOD);
    expect(l.attackSources).toContain("Strength");
  });

  it("does nothing without the feat", () => {
    expect(lines(makeDoc([], [rapier()])).attack).toBe(1 + STR_MOD);
  });

  it("leaves a hand-set Dex attack ability unlabelled (the player's own choice, not ours)", () => {
    const l = lines(makeDoc(["Weapon Finesse"], [rapier({ attackAbility: "dex" })]));
    expect(l.attack).toBe(1 + DEX_MOD);
    expect(l.attackSources).toContain("Dexterity");
  });
});

describe("Fencing Grace: Dex on a rapier's damage", () => {
  it("substitutes Dex for Str and names itself as the reason", () => {
    const l = lines(makeDoc(["Weapon Finesse", "Fencing Grace"], [rapier()]));
    expect(l.damage).toBe(DEX_MOD);
    expect(l.damageSources).toContain("Dexterity (Fencing Grace)");
    expect(l.damageSources).not.toContain("Strength");
  });

  it("does not reach a weapon that isn't a rapier", () => {
    expect(lines(makeDoc(["Weapon Finesse", "Fencing Grace"], [longsword()])).damage).toBe(STR_MOD);
  });

  it("is suspended on a two-handed (×1.5) or off-hand (×0.5) grip: the text requires one hand", () => {
    // ×1.5 on a Str mod of +1 floors to +1, same as ×1 would, so the check is
    // the ABILITY on the line, not the number it produces.
    const twoHanded = lines(
      makeDoc(["Weapon Finesse", "Fencing Grace"], [rapier({ damageMultiplier: 1.5 })]),
    );
    expect(twoHanded.damageSources.some((s) => s.startsWith("Strength"))).toBe(true);
    const offHand = lines(
      makeDoc(["Weapon Finesse", "Fencing Grace"], [rapier({ damageMultiplier: 0.5 })]),
    );
    expect(offHand.damageSources.some((s) => s.startsWith("Strength"))).toBe(true);
  });

  it("stays out of the way when Strength is the better ability (the feat says 'can', not 'must')", () => {
    const doc = makeDoc(["Weapon Finesse", "Fencing Grace"], [rapier()], {
      abilities: { str: 18, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
    });
    const l = lines(doc);
    expect(l.damage).toBe(4);
    expect(l.attack).toBe(1 + 4);
    expect(l.damageSources).toContain("Strength");
  });

  it("never overrides a hand-set damage ability", () => {
    const l = lines(
      makeDoc(["Weapon Finesse", "Fencing Grace"], [rapier({ damageAbility: "none" })]),
    );
    expect(l.damage).toBe(0);
  });
});

describe("Dervish Dance: the one that moves both lines", () => {
  it("swaps attack and damage on a scimitar", () => {
    const l = lines(makeDoc(["Weapon Finesse", "Dervish Dance"], [scimitar()]));
    expect(l.attack).toBe(1 + DEX_MOD);
    expect(l.damage).toBe(DEX_MOD);
    expect(l.damageSources).toContain("Dexterity (Dervish Dance)");
  });

  it("leaves a rapier's damage alone: it's a scimitar feat", () => {
    expect(lines(makeDoc(["Weapon Finesse", "Dervish Dance"], [rapier()])).damage).toBe(STR_MOD);
  });
});

describe("Slashing Grace: the weapon the player chose", () => {
  it("applies to the chosen weapon", () => {
    const doc = makeDoc(["Weapon Finesse", "Slashing Grace"], [longsword()], {
      featChoices: { "Slashing Grace": "longsword" },
    });
    expect(lines(doc).damage).toBe(DEX_MOD);
  });

  it("does not apply to a weapon other than the chosen one", () => {
    const doc = makeDoc(["Weapon Finesse", "Slashing Grace"], [scimitar()], {
      featChoices: { "Slashing Grace": "longsword" },
    });
    expect(lines(doc).damage).toBe(STR_MOD);
  });

  it("does nothing until a weapon is chosen", () => {
    expect(lines(makeDoc(["Weapon Finesse", "Slashing Grace"], [longsword()])).damage).toBe(
      STR_MOD,
    );
  });
});

describe("Weapon Finesse (Mythic): inert on its own", () => {
  it("adds Dex to damage for a finessable weapon when Weapon Finesse is also owned", () => {
    const l = lines(makeDoc(["Weapon Finesse", "Weapon Finesse (Mythic)"], [rapier()]));
    expect(l.damage).toBe(DEX_MOD);
    expect(l.damageSources).toContain("Dexterity (Weapon Finesse (Mythic))");
  });

  it("does nothing without Weapon Finesse, which its whole benefit is scoped to", () => {
    expect(lines(makeDoc(["Weapon Finesse (Mythic)"], [rapier()])).damage).toBe(STR_MOD);
  });
});

describe("scope boundaries", () => {
  it("never touches a ranged weapon", () => {
    const bow = weapon("Shortbow", "shortbow", { category: "ranged", attackAbility: "dex" });
    const l = lines(makeDoc(["Weapon Finesse", "Fencing Grace"], [bow]));
    // Ranged ability damage stays "none" at the default (see computeWeaponAttacks).
    expect(l.damage).toBe(0);
  });

  it("leaves a custom weapon the catalog can't identify to the hand-set field", () => {
    const custom = weapon("Grandfather's Blade", "");
    expect(lines(makeDoc(["Weapon Finesse"], [custom])).attack).toBe(1 + STR_MOD);
  });
});
