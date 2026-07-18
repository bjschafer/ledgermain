/**
 * Fixture tests for issue #81 (weapon/armor/shield proficiency): class
 * grants, proficiency feats (including the Martial/Exotic Weapon
 * Proficiency weapon pick), the five racial grants, the standalone
 * `isWeaponProficient`/`isArmorTypeProficient`/`isShieldTierProficient`
 * checks, and the engine's actual attack-roll penalties.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveProficiencies,
  isArmorTypeProficient,
  isShieldTierProficient,
  isWeaponProficient,
} from "../src/index.js";

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
  race?: string;
  classes?: { tag: string; level: number }[];
  feats?: string[];
  featChoices?: Record<string, string>;
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
  weapons?: WeaponInstance[];
  gear?: ItemInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "prof-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: over.race ?? raceId("Human"),
      classes: over.classes ?? [],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      extraFeats: over.extraFeats,
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

describe("deriveProficiencies: class grants", () => {
  it("Fighter gets simple + martial weapon categories, and every armor/shield tier", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }] });
    const prof = deriveProficiencies(doc, ref);
    const weaponLabels = prof.weapons.map((w) => w.label).sort();
    expect(weaponLabels).toEqual(["Martial Weapons", "Simple Weapons"]);
    expect(prof.weapons.find((w) => w.category === "simple")?.grants[0]).toEqual({
      source: "Fighter",
      sourceType: "class",
    });
    const armorTiers = prof.armor.map((a) => a.tier).sort();
    expect(armorTiers).toEqual(["heavy", "light", "medium", "shield", "tower-shield"]);
  });

  it("Wizard gets only its specific named weapons, no armor at all", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const prof = deriveProficiencies(doc, ref);
    expect(prof.weapons.every((w) => w.category === undefined)).toBe(true);
    const slugs = prof.weapons.map((w) => w.weaponSlug).sort();
    expect(slugs).toEqual(["club", "dagger", "heavy-crossbow", "light-crossbow", "quarterstaff"]);
    expect(prof.armor).toEqual([]);
  });

  it("a multiclass character unions both classes' grants", () => {
    const doc = makeDoc({
      classes: [
        { tag: "wizard", level: 1 },
        { tag: "fighter", level: 1 },
      ],
    });
    const prof = deriveProficiencies(doc, ref);
    // Fighter's whole-category grant is present alongside wizard's named list.
    expect(prof.weapons.some((w) => w.category === "martial")).toBe(true);
    expect(prof.weapons.some((w) => w.weaponSlug === "dagger")).toBe(true);
  });

  it("a class with 0 levels taken (multiclass builder scratch entry) contributes nothing", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 0 }] });
    const prof = deriveProficiencies(doc, ref);
    expect(prof.weapons).toEqual([]);
    expect(prof.armor).toEqual([]);
  });
});

describe("deriveProficiencies: proficiency feats", () => {
  it("Simple Weapon Proficiency grants the simple category", () => {
    const doc = makeDoc({ feats: [featId("Simple Weapon Proficiency")] });
    const prof = deriveProficiencies(doc, ref);
    expect(prof.weapons).toEqual([
      {
        label: "Simple Weapons",
        category: "simple",
        grants: [{ source: "Simple Weapon Proficiency", sourceType: "feat" }],
      },
    ]);
  });

  it("Martial Weapon Proficiency's weapon choice grants that specific weapon", () => {
    const mwpId = featId("Martial Weapon Proficiency");
    const doc = makeDoc({
      feats: [mwpId],
      featChoices: { [mwpId]: "battle-axe" },
      weapons: [
        { name: "Battleaxe", attackAbility: "str", group: "battle-axe", proficiency: "martial" },
      ],
    });
    const prof = deriveProficiencies(doc, ref);
    expect(prof.weapons).toEqual([
      {
        label: "Battleaxe",
        weaponSlug: "battle-axe",
        grants: [{ source: "Martial Weapon Proficiency", sourceType: "feat" }],
      },
    ]);
  });

  it("Martial/Exotic Weapon Proficiency grant nothing until a choice is stored", () => {
    const doc = makeDoc({ feats: [featId("Martial Weapon Proficiency")] });
    expect(deriveProficiencies(doc, ref).weapons).toEqual([]);
  });

  it("a second Exotic Weapon Proficiency instance (extraFeats, issue #58) grants its own weapon", () => {
    const ewpId = featId("Exotic Weapon Proficiency");
    const doc = makeDoc({
      feats: [ewpId],
      featChoices: { [ewpId]: "katana" },
      extraFeats: [{ instanceId: "extra-1", featId: ewpId, choiceId: "kama" }],
    });
    const prof = deriveProficiencies(doc, ref);
    const slugs = prof.weapons.map((w) => w.weaponSlug).sort();
    expect(slugs).toEqual(["kama", "katana"]);
  });

  it("Armor/Shield/Tower Shield Proficiency each grant their own tier", () => {
    const doc = makeDoc({
      feats: [
        featId("Armor Proficiency, Light"),
        featId("Armor Proficiency, Medium"),
        featId("Shield Proficiency"),
        featId("Tower Shield Proficiency"),
      ],
    });
    const prof = deriveProficiencies(doc, ref);
    const tiers = prof.armor.map((a) => a.tier).sort();
    expect(tiers).toEqual(["light", "medium", "shield", "tower-shield"]);
    expect(prof.armor.find((a) => a.tier === "medium")?.grants[0]?.source).toBe(
      "Armor Proficiency, Medium",
    );
  });
});

describe("deriveProficiencies: racial grants", () => {
  it("Elf gets longbow/shortbow/longsword/rapier", () => {
    const doc = makeDoc({ race: raceId("Elf") });
    const prof = deriveProficiencies(doc, ref);
    const slugs = prof.weapons.map((w) => w.weaponSlug).sort();
    expect(slugs).toEqual(["longbow", "longsword", "rapier", "shortbow"]);
    expect(prof.weapons[0]?.grants[0]).toEqual({ source: "Elf", sourceType: "race" });
  });

  it("Dwarf gets battleaxe/heavy pick/warhammer plus the exotic waraxe and urgrosh", () => {
    const doc = makeDoc({ race: raceId("Dwarf") });
    const prof = deriveProficiencies(doc, ref);
    const slugs = prof.weapons.map((w) => w.weaponSlug).sort();
    expect(slugs).toEqual([
      "battle-axe",
      "dwarven-urgrosh",
      "dwarven-waraxe",
      "heavy-pick",
      "warhammer",
    ]);
  });

  it("Gnome gets the gnome hooked hammer", () => {
    const doc = makeDoc({ race: raceId("Gnome") });
    const prof = deriveProficiencies(doc, ref);
    expect(prof.weapons.map((w) => w.weaponSlug)).toEqual(["gnome-hooked-hammer"]);
  });

  it("Half-Orc and Orc both get greataxe/falchion", () => {
    for (const name of ["Half-Orc", "Orc"]) {
      const doc = makeDoc({ race: raceId(name) });
      const prof = deriveProficiencies(doc, ref);
      const slugs = prof.weapons.map((w) => w.weaponSlug).sort();
      expect(slugs).toEqual(["falchion", "greataxe"]);
    }
  });

  it("a race with no grant table (e.g. Human) contributes no racial weapon lines", () => {
    const doc = makeDoc({ race: raceId("Human") });
    expect(deriveProficiencies(doc, ref).weapons).toEqual([]);
  });
});

describe("isWeaponProficient / isArmorTypeProficient / isShieldTierProficient", () => {
  const prof = deriveProficiencies(makeDoc({ classes: [{ tag: "fighter", level: 1 }] }), ref);

  it("a category-covered weapon is proficient", () => {
    expect(isWeaponProficient(prof, { proficiency: "martial", group: "longsword" })).toBe(true);
    expect(isWeaponProficient(prof, { proficiency: "simple", group: "dagger" })).toBe(true);
  });

  it("an exotic weapon is never covered by a category grant", () => {
    expect(isWeaponProficient(prof, { proficiency: "exotic", group: "katana" })).toBe(false);
  });

  it("a weapon with no proficiency tag reads as proficient (unknown, don't penalize)", () => {
    expect(isWeaponProficient(prof, {})).toBe(true);
  });

  it("a semantic weaponGroups tag matches too (e.g. a named 'Firearms' class grant)", () => {
    const gunslinger = deriveProficiencies(
      makeDoc({ classes: [{ tag: "gunslinger", level: 1 }] }),
      ref,
    );
    expect(
      isWeaponProficient(gunslinger, {
        proficiency: "exotic",
        group: "some-unlisted-pistol",
        weaponGroups: ["firearms"],
      }),
    ).toBe(true);
  });

  it("armor type proficiency checks the right tier only", () => {
    expect(isArmorTypeProficient(prof, 3)).toBe(true); // fighter: heavy
    const lightOnly = deriveProficiencies(makeDoc({ classes: [{ tag: "rogue", level: 1 }] }), ref);
    expect(isArmorTypeProficient(lightOnly, 1)).toBe(true);
    expect(isArmorTypeProficient(lightOnly, 3)).toBe(false);
  });

  it("no armor equipped (type undefined/0) always reads as proficient", () => {
    const nothing = deriveProficiencies(makeDoc({}), ref);
    expect(isArmorTypeProficient(nothing, undefined)).toBe(true);
    expect(isArmorTypeProficient(nothing, 0)).toBe(true);
  });

  it("tower shield proficiency is independent of the general shield grant", () => {
    const shieldOnly = deriveProficiencies(
      makeDoc({ classes: [{ tag: "cleric", level: 1 }] }),
      ref,
    );
    expect(isShieldTierProficient(shieldOnly, "light")).toBe(true);
    expect(isShieldTierProficient(shieldOnly, "tower")).toBe(false);
  });
});

describe("compute(): non-proficient weapon attack penalty (issue #81)", () => {
  const longsword: WeaponInstance = {
    name: "Longsword",
    attackAbility: "str",
    group: "longsword",
    category: "melee",
    proficiency: "martial",
  };

  it("a Fighter with a longsword takes no penalty", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], weapons: [longsword] });
    const sheet = compute(doc, ref);
    const atk = sheet.attacks[0]!;
    expect(atk.attack.components.some((c) => c.source.includes("non-proficient"))).toBe(false);
    // BAB(1) + Str(0) = 1, no proficiency penalty.
    expect(atk.attack.total).toBe(1);
  });

  it("a Wizard with the same longsword eats the flat -4", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], weapons: [longsword] });
    const sheet = compute(doc, ref);
    const atk = sheet.attacks[0]!;
    const penalty = atk.attack.components.find((c) => c.source === "Longsword (non-proficient)");
    expect(penalty).toEqual({
      source: "Longsword (non-proficient)",
      type: "penalty",
      value: -4,
      applied: true,
    });
    // BAB(0, wizard is low progression at L1) + Str(0) - 4 = -4.
    expect(atk.attack.total).toBe(-4);
  });

  it("Martial Weapon Proficiency (chosen for this weapon's group) removes the penalty", () => {
    const mwpId = featId("Martial Weapon Proficiency");
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      weapons: [longsword],
      feats: [mwpId],
      featChoices: { [mwpId]: "longsword" },
    });
    const sheet = compute(doc, ref);
    const atk = sheet.attacks[0]!;
    expect(atk.attack.components.some((c) => c.source.includes("non-proficient"))).toBe(false);
  });

  it("an unset weapon.proficiency (legacy document) is never penalized", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      weapons: [{ name: "Mystery Weapon", attackAbility: "str", group: "mystery" }],
    });
    const sheet = compute(doc, ref);
    expect(
      sheet.attacks[0]!.attack.components.some((c) => c.source.includes("non-proficient")),
    ).toBe(false);
  });
});

describe("compute(): non-proficient armor/shield attack penalty (issue #81)", () => {
  const heavyArmor: ItemInstance = {
    equipped: true,
    name: "Full Plate",
    armor: { slot: "armor", ac: 9, acp: -6, type: 3 },
  };
  const towerShield: ItemInstance = {
    equipped: true,
    name: "Tower Shield",
    armor: { slot: "shield", ac: 4, acp: -10, shieldTier: "tower" },
  };

  it("a Wizard (no armor proficiency at all) suffers the ACP on attack rolls", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], gear: [heavyArmor] });
    const sheet = compute(doc, ref);
    const penalty = sheet.attack.melee.components.find((c) => c.source.includes("non-proficient"));
    expect(penalty?.value).toBe(-6);
    expect(sheet.attack.melee.total).toBe(-6);
    expect(sheet.attack.ranged.total).toBe(-6);
  });

  it("the same non-proficient ACP is NOT double-applied to Str-based skills (already unconditional)", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], gear: [heavyArmor] });
    const sheet = compute(doc, ref);
    // Climb (Str-based, uses ACP) reads exactly the armor's ACP once, same as
    // it would for a PROFICIENT wearer — RAW applies ACP to skills regardless
    // of proficiency; only the attack-roll application is proficiency-gated.
    expect(sheet.skills.clm!.acp).toBe(-6);
  });

  it("a Fighter (proficient with heavy armor) takes no attack penalty from it", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], gear: [heavyArmor] });
    const sheet = compute(doc, ref);
    expect(sheet.attack.melee.components.some((c) => c.source.includes("non-proficient"))).toBe(
      false,
    );
    expect(sheet.attack.melee.total).toBe(1); // BAB(1) + Str(0), no penalty
  });

  it("tower shield non-proficiency is independent of general shield proficiency", () => {
    const shieldProfId = featId("Shield Proficiency");
    const doc = makeDoc({ feats: [shieldProfId], gear: [towerShield] });
    const sheet = compute(doc, ref);
    // Has Shield Proficiency, but NOT Tower Shield Proficiency — still penalized.
    const penalty = sheet.attack.melee.components.find((c) => c.source.includes("non-proficient"));
    expect(penalty?.value).toBe(-10);
  });

  it("non-proficient armor AND shield stack (two separate components)", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      gear: [heavyArmor, towerShield],
    });
    const sheet = compute(doc, ref);
    const penalties = sheet.attack.melee.components.filter((c) =>
      c.source.includes("non-proficient"),
    );
    expect(penalties.map((p) => p.value).sort()).toEqual([-10, -6]);
    expect(sheet.attack.melee.total).toBe(-16);
  });
});
