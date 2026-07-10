/**
 * Hand-computed fixture tests for polymorph forms (issue #70): the
 * `POLYMORPH_TIERS` table's ability/natural-armor numbers (verified against
 * aonprd.com/d20pfsrd.com — see `polymorph.ts`'s doc comment), the Wild Shape
 * level-gated tier mapping, natural-attack math, and — the load-bearing
 * part — `compute()` end-to-end for a druid with an active form: Str/Dex/
 * AC/attack/CMB/CMD all flowing through the normal typed-bonus stacker.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/compute.js";
import {
  computePolymorphAttacks,
  polymorphFormOption,
  POLYMORPH_TIERS,
  wildShapeTiersForLevel,
} from "../src/polymorph.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDruid(level: number, abilities: CharacterDoc["abilities"]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "druid", level }] },
    abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("polymorph table lookups", () => {
  it("Beast Shape I: Small animal +2 Dex/+1 NA, Medium animal +2 Str/+2 NA", () => {
    const sm = polymorphFormOption("beastShapeI", "animal", "sm");
    const med = polymorphFormOption("beastShapeI", "animal", "med");
    expect(sm).toEqual({
      creatureType: "animal",
      size: "sm",
      label: "Small animal",
      abilityAdjustments: [{ ability: "dex", type: "size", value: 2 }],
      naturalArmor: 1,
    });
    expect(med?.abilityAdjustments).toEqual([{ ability: "str", type: "size", value: 2 }]);
    expect(med?.naturalArmor).toBe(2);
  });

  it("Beast Shape III: Huge animal +6 Str/-4 Dex/+6 NA", () => {
    const huge = polymorphFormOption("beastShapeIII", "animal", "huge");
    expect(huge?.abilityAdjustments).toEqual([
      { ability: "str", type: "size", value: 6 },
      { ability: "dex", type: "size", value: -4 },
    ]);
    expect(huge?.naturalArmor).toBe(6);
  });

  it("Beast Shape III/IV magical-beast rows", () => {
    expect(polymorphFormOption("beastShapeIII", "magicalBeast", "sm")?.abilityAdjustments).toEqual([
      { ability: "dex", type: "size", value: 4 },
    ]);
    expect(polymorphFormOption("beastShapeIV", "magicalBeast", "lg")?.abilityAdjustments).toEqual([
      { ability: "str", type: "size", value: 6 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 2 },
    ]);
    // Beast Shape I/II never offer a magical-beast row.
    expect(polymorphFormOption("beastShapeI", "magicalBeast", "sm")).toBeUndefined();
  });

  it("Elemental Body IV: Huge earth +8 Str/-2 Dex/+4 Con/+6 NA", () => {
    const earth = polymorphFormOption("elementalBodyIV", "elemental", "huge", "earth");
    expect(earth?.abilityAdjustments).toEqual([
      { ability: "str", type: "size", value: 8 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 4 },
    ]);
    expect(earth?.naturalArmor).toBe(6);
  });

  it("Elemental Body tiers are NOT cumulative across sizes (each tier = one fixed size)", () => {
    expect(polymorphFormOption("elementalBodyII", "elemental", "sm", "air")).toBeUndefined();
    expect(polymorphFormOption("elementalBodyII", "elemental", "med", "air")).toBeDefined();
  });

  it("Plant Shape Medium: +2 Str size, +2 Con ENHANCEMENT (the one published outlier)", () => {
    const med = polymorphFormOption("plantShapeI", "plant", "med");
    expect(med?.abilityAdjustments).toEqual([
      { ability: "str", type: "size", value: 2 },
      { ability: "con", type: "enhancement", value: 2 },
    ]);
  });

  it("Plant Shape III: Huge plant +8 Str/-2 Dex/+4 Con/+6 NA", () => {
    const huge = polymorphFormOption("plantShapeIII", "plant", "huge");
    expect(huge?.abilityAdjustments).toEqual([
      { ability: "str", type: "size", value: 8 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 4 },
    ]);
    expect(huge?.naturalArmor).toBe(6);
  });

  it("unknown tier/combo resolves to undefined, never throws", () => {
    expect(polymorphFormOption("notATier", "animal", "med")).toBeUndefined();
    expect(polymorphFormOption("beastShapeI", "animal", "huge")).toBeUndefined();
  });

  it("every tier is present in POLYMORPH_TIERS with at least one option", () => {
    for (const def of Object.values(POLYMORPH_TIERS)) {
      expect(def.options.length).toBeGreaterThan(0);
    }
  });
});

describe("wildShapeTiersForLevel (druid Wild Shape progression, verified against AoN + d20pfsrd)", () => {
  it("below 4th: no tiers", () => {
    expect(wildShapeTiersForLevel(1)).toEqual([]);
    expect(wildShapeTiersForLevel(3)).toEqual([]);
  });

  it("4th: Beast Shape I only", () => {
    expect(wildShapeTiersForLevel(4)).toEqual(["beastShapeI"]);
  });

  it("6th: adds Beast Shape II + Elemental Body I", () => {
    expect(wildShapeTiersForLevel(6)).toEqual(["beastShapeI", "beastShapeII", "elementalBodyI"]);
  });

  it("8th: adds Beast Shape III + Elemental Body II + Plant Shape I", () => {
    expect(wildShapeTiersForLevel(8)).toEqual([
      "beastShapeI",
      "beastShapeII",
      "elementalBodyI",
      "beastShapeIII",
      "elementalBodyII",
      "plantShapeI",
    ]);
  });

  it("10th: adds Elemental Body III + Plant Shape II (NOT Beast Shape IV)", () => {
    const tiers = wildShapeTiersForLevel(10);
    expect(tiers).toContain("elementalBodyIII");
    expect(tiers).toContain("plantShapeII");
    expect(tiers).not.toContain("beastShapeIV");
  });

  it("12th: adds Elemental Body IV + Plant Shape III", () => {
    const tiers = wildShapeTiersForLevel(12);
    expect(tiers).toContain("elementalBodyIV");
    expect(tiers).toContain("plantShapeIII");
  });

  it("never grants Beast Shape IV or any magical-beast form at any level (core Wild Shape caps at Beast Shape III/animal)", () => {
    expect(wildShapeTiersForLevel(20)).not.toContain("beastShapeIV");
  });
});

describe("computePolymorphAttacks", () => {
  it("primary attack: full Str mod to damage, no attack penalty", () => {
    const [bite] = computePolymorphAttacks(6, 5, -2, [
      { name: "Bite", damageDice: "2d6", kind: "primary" },
    ]);
    expect(bite).toEqual({
      name: "Bite",
      count: 1,
      kind: "primary",
      attackBonus: 9, // 6 bab + 5 str - 2 size
      damageBonus: 5,
      damageDice: "2d6",
    });
  });

  it("secondary attack: -5 to hit, half Str (floored) to damage", () => {
    const [claw] = computePolymorphAttacks(6, 5, -2, [
      { name: "Claw", count: 2, damageDice: "1d8", kind: "secondary" },
    ]);
    expect(claw).toEqual({
      name: "Claw",
      count: 2,
      kind: "secondary",
      attackBonus: 4, // 9 - 5
      damageBonus: 2, // floor(5/2)
      damageDice: "1d8",
    });
  });

  it("secondary attack with a Strength PENALTY applies the full penalty, not half", () => {
    const [claw] = computePolymorphAttacks(3, -3, 2, [{ name: "Claw", kind: "secondary" }]);
    expect(claw?.damageBonus).toBe(-3);
  });

  it("defaults: no kind = primary, no count = 1", () => {
    const [attack] = computePolymorphAttacks(0, 0, 0, [{ name: "Slam" }]);
    expect(attack?.kind).toBe("primary");
    expect(attack?.count).toBe(1);
  });
});

describe("compute(): druid 8, Str 14 / Dex 14 / Con 12, Beast Shape III Huge animal", () => {
  const doc = makeDruid(8, { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 10 });
  doc.live.activeForm = {
    tier: "beastShapeIII",
    creatureType: "animal",
    size: "huge",
    formName: "Dire Wolf",
    naturalAttacks: [
      { name: "Bite", damageDice: "2d6", kind: "primary" },
      { name: "Claw", count: 2, damageDice: "1d8", kind: "secondary" },
    ],
  };
  const sheet = compute(doc, ref);

  it("BAB +6 (medium progression, druid 8)", () => {
    expect(sheet.bab).toBe(6);
  });

  it("Str 14 -> 20 (+6 size), mod +5; Dex 14 -> 10 (-4 size), mod +0", () => {
    expect(sheet.abilities.str.total).toBe(20);
    expect(sheet.abilities.str.mod).toBe(5);
    expect(sheet.abilities.dex.total).toBe(10);
    expect(sheet.abilities.dex.mod).toBe(0);
  });

  it("effective size is Huge", () => {
    expect(sheet.size).toBe("huge");
  });

  it("AC 14 (10 base + 0 dex - 2 size + 6 NA), touch 8, flat-footed 14", () => {
    expect(sheet.ac.normal).toBe(14);
    expect(sheet.ac.touch).toBe(8);
    expect(sheet.ac.flatFooted).toBe(14);
  });

  it("CMB +13 (6 bab + 5 str + 2 special-size), CMD 23 (10 + 6 + 5 + 0 + 2)", () => {
    expect(sheet.cmb).toBe(13);
    expect(sheet.cmd).toBe(23);
  });

  it("resolved natural attacks: Bite +9/+5 dmg, 2 Claws +4/+2 dmg", () => {
    const attacks = sheet.activeForm?.attacks ?? [];
    expect(attacks).toHaveLength(2);
    expect(attacks[0]).toMatchObject({ name: "Bite", attackBonus: 9, damageBonus: 5 });
    expect(attacks[1]).toMatchObject({ name: "Claw", count: 2, attackBonus: 4, damageBonus: 2 });
  });

  it("sheet.activeForm resolved (not unresolved), naturalArmor 6, tierName Beast Shape III", () => {
    expect(sheet.activeForm?.unresolved).toBe(false);
    expect(sheet.activeForm?.naturalArmor).toBe(6);
    expect(sheet.activeForm?.tierName).toBe("Beast Shape III");
  });
});

describe("compute(): no activeForm leaves size/AC/attacks unaffected (back-compat)", () => {
  const doc = makeDruid(8, { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 10 });
  const sheet = compute(doc, ref);

  it("size stays Medium (race base), no activeForm on the sheet", () => {
    expect(sheet.size).toBe("med");
    expect(sheet.activeForm).toBeUndefined();
  });
});

describe("compute(): unresolved activeForm still overrides size but adds no ability/NA adjustment", () => {
  const doc = makeDruid(8, { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 10 });
  doc.live.activeForm = {
    tier: "beastShapeI",
    creatureType: "animal",
    size: "huge", // beastShapeI doesn't offer a Huge animal row
    formName: "Something Huge",
  };
  const sheet = compute(doc, ref);

  it("size overrides to Huge regardless", () => {
    expect(sheet.size).toBe("huge");
  });

  it("Str/Dex are unaffected (no matching table row)", () => {
    expect(sheet.abilities.str.total).toBe(14);
    expect(sheet.abilities.dex.total).toBe(14);
  });

  it("sheet.activeForm.unresolved is true, naturalArmor 0", () => {
    expect(sheet.activeForm?.unresolved).toBe(true);
    expect(sheet.activeForm?.naturalArmor).toBe(0);
  });
});
