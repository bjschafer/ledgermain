/**
 * Hand-computed fixture tests for this wave's two pool-spend toggles:
 * warpriest Sacred Weapon (`sacred-weapon-spends.ts`) and occultist Mental
 * Focus's Legacy Weapon base power (`mental-focus-spends.ts`). Pattern
 * follows `judgments.test.ts` / `bardicPerformances.test.ts` (loadRefData()
 * fixture, hand-built `ActiveBuff` with a `tableOptions`-shaped `effectTag`).
 *
 * RAW numbers verified against aonprd.com's live Warpriest and Occultist
 * class pages (2026-08-16): Sacred Weapon (Advanced Class Guide) "+1
 * enhancement bonus [at 4th], +1 per 4 levels beyond 4th, max +5 at 20th";
 * Legacy Weapon (Occult Adventures) "enhancement bonus of 1 + 1 for every 6
 * occultist levels (max +4 at 18th)"; Aegis (Occult Adventures), same
 * schedule as Legacy Weapon, applied to armor/a shield instead of a weapon.
 *
 * Aegis/Inspired Assault/Sudden Speed are occultist MENU focus powers
 * (`build.occultistFocusPowers`), not base powers — `resources.ts`'s call
 * into `mentalFocusToggleOptions` only forwards known implement schools, not
 * picked menu powers, so these three carry `spendToggle` data with no path
 * onto the Mental Focus pool's `tableOptions` yet (see `mental-focus-
 * spends.ts`'s doc comment). The tests below exercise their stored
 * `spendToggle.changes` directly through `compute()`, the same numeric
 * verification a pool-driven toggle would get, without pretending
 * `deriveResourcePools` surfaces them.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  findOccultistFocusPower,
  mentalFocusToggleOptions,
  OCCULTIST_SCHOOLS,
  sacredWeaponToggleOptions,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const sword: WeaponInstance = {
  name: "Longsword",
  category: "melee",
  attackAbility: "str",
  damageDice: "1d8",
};

function makeWarpriestDoc(opts: {
  level: number;
  archetypes?: string[];
  activeBuffs?: ActiveBuff[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "warpriest", level: opts.level }],
    },
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 14, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [sword],
      archetypes: opts.archetypes ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function makeOccultistDoc(opts: {
  level: number;
  occultistImplements?: string[];
  activeBuffs?: ActiveBuff[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "occultist", level: opts.level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 16, wis: 10, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [sword],
      occultistImplements: opts.occultistImplements ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function makeFighterDoc(level: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level }] },
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [sword],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("sacredWeaponToggleOptions", () => {
  it("empty below 4th level (defensive: the vendored pool already reads 0 rounds/day)", () => {
    expect(sacredWeaponToggleOptions(1, [])).toEqual([]);
    expect(sacredWeaponToggleOptions(3, [])).toEqual([]);
  });

  it("one option at 4th level with no archetype", () => {
    const options = sacredWeaponToggleOptions(4, []);
    expect(options).toHaveLength(1);
    expect(options[0]!.id).toBe("sacredWeapon:enhance");
  });

  it("suppressed for archetypes that remove or reshape the enhancement bonus", () => {
    expect(sacredWeaponToggleOptions(10, ["warpriest:sacred-fist"])).toEqual([]);
    expect(sacredWeaponToggleOptions(10, ["warpriest:mantis-zealot"])).toEqual([]);
    expect(sacredWeaponToggleOptions(10, ["warpriest:champion-of-the-faith"])).toEqual([]);
    expect(sacredWeaponToggleOptions(10, ["warpriest:shieldbearer"])).toEqual([]);
  });

  it("NOT suppressed for an archetype that only caps the separate damage-die table", () => {
    const options = sacredWeaponToggleOptions(10, ["warpriest:molthuni-arsenal-chaplain"]);
    expect(options).toHaveLength(1);
  });
});

describe("deriveResourcePools: Sacred Weapon pool (warpriest)", () => {
  it("warpriest L4: 4 rounds/day (vendored uses.maxFormula), 1 tableOption", () => {
    const doc = makeWarpriestDoc({ level: 4 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.name === "Sacred Weapon");
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(4);
    expect(pool!.per).toBe("day");
    expect(pool!.tableOptions).toHaveLength(1);
  });

  it("warpriest L1-3: pool doesn't derive at all (0 rounds/day)", () => {
    const doc = makeWarpriestDoc({ level: 3 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Sacred Weapon")).toBeUndefined();
  });

  it("warpriest L20: 20 rounds/day", () => {
    const doc = makeWarpriestDoc({ level: 20 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Sacred Weapon")!.max).toBe(20);
  });
});

function sacredWeaponBuff(): ActiveBuff {
  const [option] = sacredWeaponToggleOptions(4, []);
  return {
    instanceId: "buff-sacredWeapon",
    effectTag: option!.id,
    name: option!.name,
    changes: option!.changes,
    contextNotes: option!.contextNotes,
  };
}

describe("Sacred Weapon enhancement through compute()", () => {
  it("L4: +1 enhancement attack and weapon damage (1 + floor((4-4)/4))", () => {
    const noBuff = compute(makeWarpriestDoc({ level: 4 }), ref);
    const withBuff = compute(
      makeWarpriestDoc({ level: 4, activeBuffs: [sacredWeaponBuff()] }),
      ref,
    );
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 1);
    const comp = withBuff.attacks[0]!.damageBonus.components.find((c) => c.type === "enhancement");
    expect(comp?.value).toBe(1);
    expect(withBuff.attacks[0]!.damageBonus.total).toBe(noBuff.attacks[0]!.damageBonus.total + 1);
  });

  it("L20: +5 enhancement (capped, min(5, 1 + floor((20-4)/4)) = min(5, 5))", () => {
    const noBuff = compute(makeWarpriestDoc({ level: 20 }), ref);
    const withBuff = compute(
      makeWarpriestDoc({ level: 20, activeBuffs: [sacredWeaponBuff()] }),
      ref,
    );
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 5);
    expect(withBuff.attacks[0]!.damageBonus.total).toBe(noBuff.attacks[0]!.damageBonus.total + 5);
  });
});

describe("mentalFocusToggleOptions: Legacy Weapon (occultist transmutation base power)", () => {
  it("surfaces mentalFocus:transmutation:base when transmutation is a known school", () => {
    const options = mentalFocusToggleOptions(5, ["transmutation"]);
    expect(options.map((o) => o.id)).toContain("mentalFocus:transmutation:base");
  });

  it("omits it when transmutation isn't known", () => {
    const options = mentalFocusToggleOptions(5, ["abjuration"]);
    expect(options.map((o) => o.id)).not.toContain("mentalFocus:transmutation:base");
  });

  it("dedupes and ignores unknown school tags without throwing", () => {
    const options = mentalFocusToggleOptions(5, ["transmutation", "transmutation", "not-a-school"]);
    expect(options.filter((o) => o.id === "mentalFocus:transmutation:base")).toHaveLength(1);
  });
});

describe("deriveResourcePools: Mental Focus pool (occultist) surfaces Legacy Weapon", () => {
  it("occultist with a transmutation implement gets the Legacy Weapon toggle on the pool", () => {
    const doc = makeOccultistDoc({ level: 6, occultistImplements: ["transmutation"] });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.name === "Mental Focus");
    expect(pool).toBeDefined();
    expect(pool!.tableOptions?.map((o) => o.id)).toContain("mentalFocus:transmutation:base");
  });
});

function legacyWeaponBuff(): ActiveBuff {
  const toggle = OCCULTIST_SCHOOLS.transmutation!.basePower.spendToggle!;
  return {
    instanceId: "buff-legacyWeapon",
    effectTag: "mentalFocus:transmutation:base",
    name: "Legacy Weapon",
    changes: toggle.changes,
    contextNotes: toggle.contextNotes,
  };
}

describe("Legacy Weapon enhancement through compute()", () => {
  it("occultist L1: +1 enhancement attack and weapon damage (min(4, 1 + floor(1/6)))", () => {
    const withTransmutation = { occultistImplements: ["transmutation"] };
    const noBuff = compute(makeOccultistDoc({ level: 1, ...withTransmutation }), ref);
    const withBuff = compute(
      makeOccultistDoc({ level: 1, ...withTransmutation, activeBuffs: [legacyWeaponBuff()] }),
      ref,
    );
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 1);
    expect(withBuff.attacks[0]!.damageBonus.total).toBe(noBuff.attacks[0]!.damageBonus.total + 1);
  });

  it("occultist L18: +4 enhancement (capped, min(4, 1 + floor(18/6)) = min(4, 4))", () => {
    const withTransmutation = { occultistImplements: ["transmutation"] };
    const noBuff = compute(makeOccultistDoc({ level: 18, ...withTransmutation }), ref);
    const withBuff = compute(
      makeOccultistDoc({ level: 18, ...withTransmutation, activeBuffs: [legacyWeaponBuff()] }),
      ref,
    );
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 4);
    expect(withBuff.attacks[0]!.damageBonus.total).toBe(noBuff.attacks[0]!.damageBonus.total + 4);
  });
});

describe("Occultist menu focus power spendToggle data (not yet wired onto the pool)", () => {
  it("Aegis at L7: +2 AC enhancement (min(4, 1 + floor(7/6)) = min(4, 2))", () => {
    const found = findOccultistFocusPower("abjuration:aegis");
    expect(found?.power.spendToggle).toBeDefined();
    const buff: ActiveBuff = {
      instanceId: "buff-aegis",
      name: "Aegis",
      changes: found!.power.spendToggle!.changes,
    };
    const noBuff = compute(makeOccultistDoc({ level: 7 }), ref);
    const withBuff = compute(makeOccultistDoc({ level: 7, activeBuffs: [buff] }), ref);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal + 2);
  });

  it("Inspired Assault at L6: +2 morale attack and +2 morale fear save (1 + floor(6/6))", () => {
    const found = findOccultistFocusPower("enchantment:inspired-assault");
    expect(found?.power.spendToggle).toBeDefined();
    const buff: ActiveBuff = {
      instanceId: "buff-inspiredAssault",
      name: "Inspired Assault",
      changes: found!.power.spendToggle!.changes,
    };
    const noBuff = compute(makeOccultistDoc({ level: 6 }), ref);
    const withBuff = compute(makeOccultistDoc({ level: 6, activeBuffs: [buff] }), ref);
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 2);
    const fear = withBuff.saves.will.conditionals?.find((c) => c.categories.includes("fear"));
    expect(fear?.total).toBe(noBuff.saves.will.total + 2);
  });

  it("Sudden Speed: +30 untyped land speed", () => {
    const found = findOccultistFocusPower("transmutation:sudden-speed");
    expect(found?.power.spendToggle).toBeDefined();
    const buff: ActiveBuff = {
      instanceId: "buff-suddenSpeed",
      name: "Sudden Speed",
      changes: found!.power.spendToggle!.changes,
    };
    const noBuff = compute(makeOccultistDoc({ level: 5 }), ref);
    const withBuff = compute(makeOccultistDoc({ level: 5, activeBuffs: [buff] }), ref);
    expect(withBuff.speeds.land).toBe((noBuff.speeds.land ?? 0) + 30);
  });

  it("Energy Ward carries no spendToggle (residue: chosen energy type has no picker)", () => {
    const found = findOccultistFocusPower("evocation:energy-ward");
    expect(found?.power.spendToggle).toBeUndefined();
  });

  it("the Mental Focus pool does NOT surface Aegis even when picked (no build.occultistFocusPowers seam yet)", () => {
    const doc = makeOccultistDoc({ level: 7, occultistImplements: ["abjuration"] });
    doc.build.occultistFocusPowers = ["abjuration:aegis"];
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.name === "Mental Focus");
    expect(pool!.tableOptions?.some((o) => o.id.includes("aegis"))).not.toBe(true);
  });
});

describe("a class with no relevant pools derives unchanged", () => {
  it("fighter: no Sacred Weapon or Mental Focus pool row", () => {
    const doc = makeFighterDoc(10);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Sacred Weapon")).toBeUndefined();
    expect(pools.find((p) => p.name === "Mental Focus")).toBeUndefined();
  });
});
