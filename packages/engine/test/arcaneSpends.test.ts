/**
 * Hand-computed fixture tests for the magus Arcane Pool and arcanist Arcane
 * Reservoir spend toggles (`arcane-spends.ts`), both the derived-pool wiring
 * (`deriveResourcePools`'s `tableOptions`) and the individual toggles'
 * `changes` flowing through `compute` exactly like any other active buff
 * (same pattern as `judgments.test.ts`).
 *
 * RAW numbers verified against aonprd.com's live Magus/Arcanist class pages
 * and archetype-features.json's own text (2026-08-16): Arcane Pool weapon
 * enhancement is 1 + floor((level - 1) / 4), max 5 at 17th (UM p.10); Arcane
 * Accuracy grants an insight bonus to attack equal to Intelligence modifier
 * (magus-arcana.json); Arcane Reservoir's DC-boost spend is +1 per spell cast
 * (+2 with Potent Magic, arcanist-exploits.json); Spell Resistance grants
 * 6 + arcanist level (arcanist-exploits.json).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCANIST_EXPLOITS,
  arcanePoolToggleOptions,
  arcaneReservoirToggleOptions,
  compute,
  deriveResourcePools,
  MAGUS_ARCANA,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  classTag: "magus" | "arcanist";
  level: number;
  abilities?: CharacterDoc["abilities"];
  weapons?: WeaponInstance[];
  activeBuffs?: ActiveBuff[];
  magusArcana?: string[];
  arcanistExploits?: string[];
  archetypes?: string[];
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
      classes: [{ tag: opts.classTag, level: opts.level }],
    },
    abilities: opts.abilities ?? { str: 14, dex: 12, con: 14, int: 18, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: opts.weapons ?? [],
      ...(opts.magusArcana ? { magusArcana: opts.magusArcana } : {}),
      ...(opts.arcanistExploits ? { arcanistExploits: opts.arcanistExploits } : {}),
      ...(opts.archetypes ? { archetypes: opts.archetypes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  } as CharacterDoc;
}

function toggleBuff(id: string, name: string, changes: ActiveBuff["changes"]): ActiveBuff {
  return { instanceId: `buff-${id}`, effectTag: id, name, changes };
}

const sword: WeaponInstance = {
  name: "Longsword",
  category: "melee",
  attackAbility: "str",
  damageDice: "1d8",
};

describe("deriveResourcePools: Arcane Pool (magus)", () => {
  it("magus L5 surfaces the base weapon toggle with the right formula", () => {
    const doc = makeDoc({ classTag: "magus", level: 5 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.name === "Arcane Pool");
    expect(pool).toBeDefined();
    const weapon = pool!.tableOptions?.find((o) => o.id === "arcanePool:weapon");
    expect(weapon).toBeDefined();
    expect(weapon!.changes).toEqual([
      {
        formula: "min(5, 1 + floor((@classes.magus.level - 1) / 4))",
        target: "attack",
        type: "enhancement",
      },
      {
        formula: "min(5, 1 + floor((@classes.magus.level - 1) / 4))",
        target: "wdamage",
        type: "enhancement",
      },
    ]);
  });

  it("armored battlemage swaps the weapon toggle for an armor toggle", () => {
    const options = arcanePoolToggleOptions(5, ["magus:armored-battlemage"], []);
    expect(options.find((o) => o.id === "arcanePool:weapon")).toBeUndefined();
    const armor = options.find((o) => o.id === "arcanePool:armored-battlemage:armor");
    expect(armor).toBeDefined();
    expect(armor!.changes).toEqual([
      {
        formula: "min(5, 1 + floor((@classes.magus.level - 1) / 4))",
        target: "aac",
        type: "enhancement",
      },
    ]);
  });

  it("greensting slayer suppresses the weapon toggle with a context-note-only entry", () => {
    const options = arcanePoolToggleOptions(5, ["magus:greensting-slayer"], []);
    expect(options.find((o) => o.id === "arcanePool:weapon")).toBeUndefined();
    const sneak = options.find((o) => o.id === "arcanePool:greensting-slayer:sneakAttack");
    expect(sneak).toBeDefined();
    expect(sneak!.changes).toEqual([]);
    expect(sneak!.contextNotes?.length).toBeGreaterThan(0);
  });

  it("a magus arcanum with a spendToggle is surfaced as arcanePool:arcana:<id>", () => {
    const options = arcanePoolToggleOptions(5, [], ["arcaneAccuracy", "spellShield", "familiar"]);
    expect(options.map((o) => o.id)).toContain("arcanePool:arcana:arcaneAccuracy");
    expect(options.map((o) => o.id)).toContain("arcanePool:arcana:spellShield");
    // familiar has no spendToggle (display-only, points at the Familiar panel).
    expect(options.map((o) => o.id)).not.toContain("arcanePool:arcana:familiar");
  });
});

describe("Arcane Pool changes through compute() (magus)", () => {
  it("L5 weapon toggle: +2 attack and +2 weapon damage (1 + floor(4/4))", () => {
    const options = arcanePoolToggleOptions(5, [], []);
    const weapon = options.find((o) => o.id === "arcanePool:weapon")!;
    const noBuff = compute(makeDoc({ classTag: "magus", level: 5, weapons: [sword] }), ref);
    const withBuff = compute(
      makeDoc({
        classTag: "magus",
        level: 5,
        weapons: [sword],
        activeBuffs: [toggleBuff(weapon.id, weapon.name, weapon.changes)],
      }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total).toBe(noBuff.attacks[0]!.attack.total + 2);
    const dmg = withBuff.attacks[0]!.damageBonus.total - noBuff.attacks[0]!.damageBonus.total;
    expect(dmg).toBe(2);
  });

  it("L17 weapon toggle: +5 attack and +5 weapon damage, capped (min(5, 1 + floor(16/4)) = 5)", () => {
    const options = arcanePoolToggleOptions(17, [], []);
    const weapon = options.find((o) => o.id === "arcanePool:weapon")!;
    const noBuff = compute(makeDoc({ classTag: "magus", level: 17, weapons: [sword] }), ref);
    const withBuff = compute(
      makeDoc({
        classTag: "magus",
        level: 17,
        weapons: [sword],
        activeBuffs: [toggleBuff(weapon.id, weapon.name, weapon.changes)],
      }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total).toBe(noBuff.attacks[0]!.attack.total + 5);
  });

  it("Arcane Accuracy + Int 18: +4 insight attack bonus", () => {
    const options = arcanePoolToggleOptions(5, [], ["arcaneAccuracy"]);
    const accuracy = options.find((o) => o.id === "arcanePool:arcana:arcaneAccuracy")!;
    expect(accuracy.changes).toEqual([
      { formula: "@abilities.int.mod", target: "attack", type: "insight" },
    ]);
    const noBuff = compute(
      makeDoc({
        classTag: "magus",
        level: 5,
        weapons: [sword],
        abilities: { str: 14, dex: 12, con: 14, int: 18, wis: 10, cha: 10 },
      }),
      ref,
    );
    const withBuff = compute(
      makeDoc({
        classTag: "magus",
        level: 5,
        weapons: [sword],
        abilities: { str: 14, dex: 12, con: 14, int: 18, wis: 10, cha: 10 },
        activeBuffs: [toggleBuff(accuracy.id, accuracy.name, accuracy.changes)],
      }),
      ref,
    );
    // Int 18 -> +4 modifier.
    expect(withBuff.attacks[0]!.attack.total).toBe(noBuff.attacks[0]!.attack.total + 4);
  });
});

describe("MAGUS_ARCANA spendToggle table", () => {
  it("arcaneAccuracy and spellShield each carry a spendToggle", () => {
    expect(MAGUS_ARCANA.arcaneAccuracy?.spendToggle).toBeDefined();
    expect(MAGUS_ARCANA.spellShield?.spendToggle).toBeDefined();
  });

  it("spellShield targets 'sac' (shield-bonus-to-AC), not a bare 'ac' target", () => {
    expect(MAGUS_ARCANA.spellShield!.spendToggle!.changes).toEqual([
      { formula: "@abilities.int.mod", target: "sac", type: "shield" },
    ]);
  });
});

describe("deriveResourcePools: Arcane Reservoir (arcanist)", () => {
  it("arcanist L7 surfaces the base spell-DC toggle at +1 (no Potent Magic)", () => {
    const doc = makeDoc({ classTag: "arcanist", level: 7 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.name === "Arcane Reservoir");
    expect(pool).toBeDefined();
    const dcToggle = pool!.tableOptions?.find((o) => o.id === "arcaneReservoir:spellDC");
    expect(dcToggle).toBeDefined();
    expect(dcToggle!.changes).toEqual([{ formula: "1", target: "spellDC", type: "untyped" }]);
  });

  it("Potent Magic doubles the base spell-DC toggle to +2", () => {
    const options = arcaneReservoirToggleOptions(["potentMagic"]);
    const dcToggle = options.find((o) => o.id === "arcaneReservoir:spellDC")!;
    expect(dcToggle.changes).toEqual([{ formula: "2", target: "spellDC", type: "untyped" }]);
  });

  it("an exploit with a spendToggle is surfaced as arcaneReservoir:exploit:<id>", () => {
    const options = arcaneReservoirToggleOptions(["spellResistance", "acidJet"]);
    expect(options.map((o) => o.id)).toContain("arcaneReservoir:exploit:spellResistance");
    // acidJet has no spendToggle (a rolled attack, not a self-buff).
    expect(options.map((o) => o.id)).not.toContain("arcaneReservoir:exploit:acidJet");
  });

  it("armoredMask surfaces two rows: the base tier and the shield-of-faith tier", () => {
    const options = arcaneReservoirToggleOptions(["armoredMask"]);
    expect(options.map((o) => o.id)).toContain("arcaneReservoir:exploit:armoredMask");
    expect(options.map((o) => o.id)).toContain("arcaneReservoir:exploit:armoredMask:2");
  });
});

describe("Arcane Reservoir changes through compute() (arcanist)", () => {
  it("base spell-DC toggle: spellDCs.all +1 without Potent Magic", () => {
    const options = arcaneReservoirToggleOptions([]);
    const dcToggle = options.find((o) => o.id === "arcaneReservoir:spellDC")!;
    const withBuff = compute(
      makeDoc({
        classTag: "arcanist",
        level: 5,
        activeBuffs: [toggleBuff(dcToggle.id, dcToggle.name, dcToggle.changes)],
      }),
      ref,
    );
    expect(withBuff.spellDCs?.all).toBe(1);
  });

  it("base spell-DC toggle: spellDCs.all +2 with Potent Magic", () => {
    const options = arcaneReservoirToggleOptions(["potentMagic"]);
    const dcToggle = options.find((o) => o.id === "arcaneReservoir:spellDC")!;
    const withBuff = compute(
      makeDoc({
        classTag: "arcanist",
        level: 5,
        arcanistExploits: ["potentMagic"],
        activeBuffs: [toggleBuff(dcToggle.id, dcToggle.name, dcToggle.changes)],
      }),
      ref,
    );
    expect(withBuff.spellDCs?.all).toBe(2);
  });

  it("Spell Resistance toggle at L7: SR 13 (6 + 7)", () => {
    const options = arcaneReservoirToggleOptions(["spellResistance"]);
    const toggle = options.find((o) => o.id === "arcaneReservoir:exploit:spellResistance")!;
    const withBuff = compute(
      makeDoc({
        classTag: "arcanist",
        level: 7,
        activeBuffs: [toggleBuff(toggle.id, toggle.name, toggle.changes)],
      }),
      ref,
    );
    expect(withBuff.defenses?.sr?.total).toBe(13);
  });

  it("Greater Spell Resistance beats Spell Resistance when both toggles are on (highest 'set' wins)", () => {
    const options = arcaneReservoirToggleOptions(["spellResistance", "greaterSpellResistance"]);
    const base = options.find((o) => o.id === "arcaneReservoir:exploit:spellResistance")!;
    const greater = options.find((o) => o.id === "arcaneReservoir:exploit:greaterSpellResistance")!;
    const withBoth = compute(
      makeDoc({
        classTag: "arcanist",
        level: 7,
        activeBuffs: [
          toggleBuff(base.id, base.name, base.changes),
          toggleBuff(greater.id, greater.name, greater.changes),
        ],
      }),
      ref,
    );
    // base would be 13 (6+7), greater is 18 (11+7) — highest set value wins.
    expect(withBoth.defenses?.sr?.total).toBe(18);
  });

  it("Wooden Flesh: +2 natural armor to AC and DR/slashing equal to Cha modifier (min 1)", () => {
    const options = arcaneReservoirToggleOptions(["woodenFlesh"]);
    const toggle = options.find((o) => o.id === "arcaneReservoir:exploit:woodenFlesh")!;
    const abilities: CharacterDoc["abilities"] = {
      str: 14,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 14,
    };
    const noBuff = compute(makeDoc({ classTag: "arcanist", level: 5, abilities }), ref);
    const withBuff = compute(
      makeDoc({
        classTag: "arcanist",
        level: 5,
        abilities,
        activeBuffs: [toggleBuff(toggle.id, toggle.name, toggle.changes)],
      }),
      ref,
    );
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal + 2);
    const drSlashing = withBuff.defenses?.dr.find((d) => d.qualifier === "slashing");
    expect(drSlashing?.total).toBe(2); // Cha 14 -> +2 modifier
  });

  it("Armored Mask both tiers stack: armor +4 with no worn armor, deflection tier per formula", () => {
    const options = arcaneReservoirToggleOptions(["armoredMask"]);
    const base = options.find((o) => o.id === "arcaneReservoir:exploit:armoredMask")!;
    const tier2 = options.find((o) => o.id === "arcaneReservoir:exploit:armoredMask:2")!;
    expect(base.changes).toEqual([{ formula: "4", target: "aac", type: "untyped" }]);

    const noBuff = compute(makeDoc({ classTag: "arcanist", level: 6 }), ref);
    const withBase = compute(
      makeDoc({
        classTag: "arcanist",
        level: 6,
        activeBuffs: [toggleBuff(base.id, base.name, base.changes)],
      }),
      ref,
    );
    expect(withBase.ac.normal).toBe(noBuff.ac.normal + 4);

    // L6: min(5, 2 + floor(6/6)) = 3.
    const withBoth = compute(
      makeDoc({
        classTag: "arcanist",
        level: 6,
        activeBuffs: [
          toggleBuff(base.id, base.name, base.changes),
          toggleBuff(tier2.id, tier2.name, tier2.changes),
        ],
      }),
      ref,
    );
    expect(withBoth.ac.normal).toBe(noBuff.ac.normal + 4 + 3);
  });
});

describe("ARCANIST_EXPLOITS spendToggle table", () => {
  it("potentMagic itself carries no spendToggle (it modifies the base reservoir spend, not a self-buff)", () => {
    expect(ARCANIST_EXPLOITS.potentMagic?.spendToggle).toBeUndefined();
  });

  it("spellResistance, greaterSpellResistance, woodenFlesh, armoredMask each carry a spendToggle", () => {
    expect(ARCANIST_EXPLOITS.spellResistance?.spendToggle).toBeDefined();
    expect(ARCANIST_EXPLOITS.greaterSpellResistance?.spendToggle).toBeDefined();
    expect(ARCANIST_EXPLOITS.woodenFlesh?.spendToggle).toBeDefined();
    expect(ARCANIST_EXPLOITS.armoredMask?.spendToggle).toBeDefined();
    expect(ARCANIST_EXPLOITS.armoredMask?.spendToggleTier2).toBeDefined();
  });
});
