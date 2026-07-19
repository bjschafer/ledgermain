/**
 * Ability substitution ("use ability X in place of ability Y for <term>") —
 * `ability-substitution.ts`.
 *
 * Two layers are covered:
 *   1. `resolveSubstitution` / `collectAbilitySubstitutions` directly, against
 *      synthetic registry entries. Every slot is exercised here, including the
 *      ones no published content registers yet, so they are live code paths.
 *   2. Mind Over Metal end-to-end through `compute()`, hand-computed against a
 *      real Student of War build.
 */
import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, ItemInstance, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ABILITY_SUBSTITUTIONS,
  collectAbilitySubstitutions,
  compute,
  resolveSubstitution,
  type AbilitySubstitutionDef,
  type ActiveAbilitySubstitution,
} from "../src/index.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  gear?: ItemInstance[];
  weapons?: WeaponInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      ...(over.weapons ? { weapons: over.weapons } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const MODS: Record<AbilityId, number> = { str: 2, dex: 1, con: 0, int: 5, wis: 3, cha: -1 };

function active(def: AbilitySubstitutionDef, source = "Test Feature"): ActiveAbilitySubstitution {
  return { ...def, source };
}

/* ------------------------------------------------------- resolveSubstitution */

describe("resolveSubstitution", () => {
  it("returns the base ability when nothing substitutes", () => {
    const r = resolveSubstitution("ac", "dex", MODS, []);
    expect(r).toEqual({ ability: "dex", mod: 1 });
    expect(r.substitution).toBeUndefined();
  });

  it("substitutes a better ability and records its provenance", () => {
    const sub = active({ slot: "ac", from: "dex", to: "int" }, "Mind Over Metal");
    const r = resolveSubstitution("ac", "dex", MODS, [sub]);
    expect(r.ability).toBe("int");
    expect(r.mod).toBe(5);
    expect(r.substitution?.source).toBe("Mind Over Metal");
  });

  it("never makes the character worse off — a lower substituted mod loses", () => {
    // Cha -1 is worse than the Dex +1 it would replace, so Dex is kept.
    const sub = active({ slot: "ac", from: "dex", to: "cha" });
    expect(resolveSubstitution("ac", "dex", MODS, [sub])).toEqual({ ability: "dex", mod: 1 });
  });

  it("ignores a substitution written for a different base ability", () => {
    // "Wis in place of Str" must not fire on a weapon already using Dex.
    const sub = active({ slot: "attack.melee", from: "str", to: "wis" });
    expect(resolveSubstitution("attack.melee", "dex", MODS, [sub])).toEqual({
      ability: "dex",
      mod: 1,
    });
  });

  it("ignores a substitution written for a different slot", () => {
    const sub = active({ slot: "init", from: "dex", to: "int" });
    expect(resolveSubstitution("ac", "dex", MODS, [sub])).toEqual({ ability: "dex", mod: 1 });
  });

  it("takes the highest when two substitutions compete for one slot", () => {
    const wis = active({ slot: "ac", from: "dex", to: "wis" }, "Wis Feature");
    const int = active({ slot: "ac", from: "dex", to: "int" }, "Int Feature");
    const r = resolveSubstitution("ac", "dex", MODS, [wis, int]);
    expect(r.ability).toBe("int");
    expect(r.substitution?.source).toBe("Int Feature");
  });

  it("covers every slot", () => {
    for (const slot of ["ac", "init", "attack.melee", "attack.ranged", "damage.melee"] as const) {
      const sub = active({ slot, from: "str", to: "int" });
      expect(resolveSubstitution(slot, "str", MODS, [sub]).ability).toBe("int");
    }
  });
});

/* ------------------------------------------------- collectAbilitySubstitutions */

describe("collectAbilitySubstitutions", () => {
  const abilities = { str: 14, dex: 12, con: 12, int: 20, wis: 10, cha: 10 };
  const plate: ItemInstance = {
    equipped: true,
    name: "Full Plate",
    armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3 },
  };

  it("finds a class feature's substitution once its level is reached", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 5 },
        { tag: "studentOfWar", level: 2 },
      ],
      abilities,
      gear: [plate],
    });
    const found = collectAbilitySubstitutions(doc, ref, buildRollData(doc, ref));
    expect(found).toHaveLength(1);
    expect(found[0]!.source).toBe("Mind Over Metal");
    expect(found[0]!.to).toBe("int");
  });

  it("does not find it below the granting level", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 5 },
        { tag: "studentOfWar", level: 1 },
      ],
      abilities,
      gear: [plate],
    });
    expect(collectAbilitySubstitutions(doc, ref, buildRollData(doc, ref))).toHaveLength(0);
  });

  it("drops a substitution whose condition fails (Mind Over Metal needs armor or a shield)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 5 },
        { tag: "studentOfWar", level: 2 },
      ],
      abilities,
      gear: [],
    });
    expect(collectAbilitySubstitutions(doc, ref, buildRollData(doc, ref))).toHaveLength(0);
  });

  it("fires on a shield alone, with no body armor", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 5 },
        { tag: "studentOfWar", level: 2 },
      ],
      abilities,
      gear: [
        {
          equipped: true,
          name: "Heavy Shield",
          armor: { slot: "shield", ac: 2, acp: -2, type: 1 },
        },
      ],
    });
    expect(collectAbilitySubstitutions(doc, ref, buildRollData(doc, ref))).toHaveLength(1);
  });

  it("Mind Over Metal is registered under the feature's exact authored name", () => {
    // The registry is keyed by name slug, so renaming the supplement feature
    // silently unwires the ability — this asserts the link both ways.
    expect(ABILITY_SUBSTITUTIONS["mind-over-metal"]).toBeDefined();
    const feature = Object.values(ref.classFeatures).find((f) => f.name === "Mind Over Metal");
    expect(feature).toBeDefined();
  });
});

/* ------------------------------------------------------ end-to-end via compute */

describe("compute: Student of War Mind Over Metal", () => {
  // Fighter 5 / Student of War 2. Int 20 (+5), Dex 12 (+1).
  const abilities = { str: 14, dex: 12, con: 12, int: 20, wis: 10, cha: 10 };
  const breastplate: ItemInstance = {
    equipped: true,
    name: "Breastplate",
    armor: { slot: "armor", ac: 6, maxDex: 3, acp: -4, type: 2 },
  };
  const classes = [
    { tag: "fighter", level: 5 },
    { tag: "studentOfWar", level: 2 },
  ];

  it("substitutes Int for Dex in AC, capped by the armor's max Dex bonus", () => {
    const sheet = compute(makeDoc({ classes, abilities, gear: [breastplate] }), ref);
    // 10 base + 6 armor + 4 = 20. Int +5 is capped, but at 4 rather than the
    // breastplate's printed maxDex 3: Fighter 5 has Armor Training 1, which
    // raises the worn armor's max Dex bonus by 1.
    expect(sheet.ac.normal).toBe(20);
    const line = sheet.ac.components.find((c) => c.category === "dex");
    expect(line?.source).toBe("Intelligence (Mind Over Metal)");
    expect(line?.value).toBe(4);
  });

  it("uses the full Int bonus when the armor's cap is generous enough", () => {
    const doc = makeDoc({
      classes,
      abilities,
      gear: [
        {
          equipped: true,
          name: "Studded Leather",
          armor: { slot: "armor", ac: 3, maxDex: 5, acp: -1, type: 1 },
        },
      ],
    });
    // 10 base + 3 armor + 5 Int (maxDex 5 doesn't bind) = 18.
    expect(compute(doc, ref).ac.normal).toBe(18);
  });

  it("falls back to Dex with no armor or shield equipped", () => {
    const sheet = compute(makeDoc({ classes, abilities, gear: [] }), ref);
    expect(sheet.ac.normal).toBe(11); // 10 base + dex 1
    expect(sheet.ac.components.find((c) => c.category === "dex")?.source).toBe("Dexterity");
  });

  it("leaves CMD on Dexterity — the ability substitutes for AC only", () => {
    const sheet = compute(makeDoc({ classes, abilities, gear: [breastplate] }), ref);
    // 10 + bab 7 + str 2 + dex 1 (not Int) + size 0 = 20.
    expect(sheet.cmd).toBe(20);
  });

  it("leaves initiative and attack lines alone", () => {
    const sheet = compute(makeDoc({ classes, abilities, gear: [breastplate] }), ref);
    expect(sheet.initiative.total).toBe(1); // Dex, not Int
    expect(sheet.attack.melee.components.find((c) => c.type === "ability")?.source).toBe(
      "Strength",
    );
  });

  it("keeps a Weapon-Finesse'd Dex weapon on Dex — the substitution is AC-only", () => {
    const doc = makeDoc({
      classes,
      abilities,
      gear: [breastplate],
      weapons: [{ name: "Rapier", attackAbility: "dex", damageAbility: "none" }],
    });
    const attack = compute(doc, ref).attacks[0]!;
    expect(attack.attack.components.find((c) => c.type === "ability")?.source).toBe("Dexterity");
  });
});
