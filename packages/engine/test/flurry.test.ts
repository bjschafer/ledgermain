/**
 * Hand-computed fixtures for Flurry of Blows, checked against the published
 * flurry columns of both monk tables (PF1 CRB, Pathfinder Unchained).
 *
 * Chained monk (medium BAB, flurry at monk-level-as-BAB, flat -2):
 *   L1  -1/-1                       L11 +9/+9/+4/+4/-1
 *   L6  +4/+4/-1                    L15 +13/+13/+8/+8/+3/+3
 *   L8  +6/+6/+1/+1                 L20 +18/+18/+13/+13/+8/+8/+3
 *
 * Unchained monk (full BAB, extra attacks at the highest bonus, no penalty):
 *   L1  +1/+1                       L11 +11/+11/+11/+6/+1
 *   L8  +8/+8/+3                    L20 +20/+20/+20/+15/+10/+5
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  UNARMED_STRIKE_GROUP,
  compute,
  flurryClass,
  flurryMode,
  flurrySequence,
  isFlurryWeapon,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** The bare flurry column: a weapon whose only attack bonus is the character's BAB. */
function column(style: "chained" | "unchained", level: number): number[] {
  const bab = style === "chained" ? Math.floor((level * 3) / 4) : level;
  const mode = flurryMode({ style, level, bab, flurryBab: style === "chained" ? level : bab })!;
  return flurrySequence(mode, bab);
}

describe("flurrySequence — the printed chained-monk flurry column", () => {
  const cases: [number, number[]][] = [
    [1, [-1, -1]],
    [6, [4, 4, -1]],
    [8, [6, 6, 1, 1]],
    [11, [9, 9, 4, 4, -1]],
    [15, [13, 13, 8, 8, 3, 3]],
    [20, [18, 18, 13, 13, 8, 8, 3]],
  ];
  for (const [level, expected] of cases) {
    it(`monk ${level}: ${expected.join("/")}`, () => {
      expect(column("chained", level)).toEqual(expected);
    });
  }
});

describe("flurrySequence — the printed unchained-monk flurry column", () => {
  const cases: [number, number[]][] = [
    [1, [1, 1]],
    [6, [6, 6, 1]],
    [8, [8, 8, 3]],
    [11, [11, 11, 11, 6, 1]],
    [16, [16, 16, 16, 11, 6, 1]],
    [20, [20, 20, 20, 15, 10, 5]],
  ];
  for (const [level, expected] of cases) {
    it(`monk (unchained) ${level}: ${expected.join("/")}`, () => {
      expect(column("unchained", level)).toEqual(expected);
    });
  }
});

describe("flurryMode", () => {
  it("no monk levels, no flurry", () => {
    expect(flurryClass([{ tag: "fighter", level: 20 }])).toBeUndefined();
  });

  it("the chained monk's substitution is a delta off her true BAB", () => {
    // Monk 8: true BAB 6, flurry BAB 8 -> +2, and the flat -2 on every attack.
    const mode = flurryMode({ style: "chained", level: 8, bab: 6, flurryBab: 8 })!;
    expect(mode.babDelta).toBe(2);
    expect(mode.penalty).toBe(-2);
    expect(mode.extraAttacks).toBe(2);
  });

  it("the unchained monk substitutes nothing and takes no penalty", () => {
    const mode = flurryMode({ style: "unchained", level: 11, bab: 11, flurryBab: 11 })!;
    expect(mode.babDelta).toBe(0);
    expect(mode.penalty).toBe(0);
    expect(mode.extraAttacks).toBe(2);
  });

  it("the extra attacks arrive at 1st/8th/15th chained, 1st/11th unchained", () => {
    const chained = (level: number) =>
      flurryMode({ style: "chained", level, bab: 0, flurryBab: level })!.extraAttacks;
    expect([chained(7), chained(8), chained(14), chained(15)]).toEqual([1, 2, 2, 3]);
    const unchained = (level: number) =>
      flurryMode({ style: "unchained", level, bab: level, flurryBab: level })!.extraAttacks;
    expect([unchained(10), unchained(11)]).toEqual([1, 2]);
  });
});

describe("isFlurryWeapon", () => {
  it("an unarmed strike qualifies", () => {
    expect(isFlurryWeapon({ group: UNARMED_STRIKE_GROUP })).toBe(true);
  });

  it("a monk-group weapon qualifies", () => {
    expect(isFlurryWeapon({ group: "sai", weaponGroups: ["monk"] })).toBe(true);
  });

  it("a longsword does not", () => {
    expect(isFlurryWeapon({ group: "longsword", weaponGroups: ["bladesHeavy"] })).toBe(false);
  });
});

/* ------------------------------------------------- through compute() ----- */

function makeDoc(
  classes: CharacterDoc["identity"]["classes"],
  weapons: NonNullable<CharacterDoc["build"]["weapons"]>,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities: { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const UNARMED = {
  name: "Unarmed Strike",
  group: UNARMED_STRIKE_GROUP,
  category: "melee" as const,
  attackAbility: "str" as const,
  damageDice: "1d10",
};
const LONGSWORD = {
  name: "Longsword",
  group: "longsword",
  weaponGroups: ["bladesHeavy"],
  category: "melee" as const,
  attackAbility: "str" as const,
  damageDice: "1d8",
};

describe("compute() — a level 8 unchained monk's flurry line", () => {
  // Str 14 (+2), BAB 8 (full). Normal full attack +10/+5; the flurry adds one
  // attack at the highest bonus and takes no penalty: +10/+10/+5.
  const sheet = compute(makeDoc([{ tag: "monkUnchained", level: 8 }], [UNARMED, LONGSWORD]), ref);

  it("the sheet carries the unchained flurry", () => {
    expect(sheet.flurry).toEqual({
      style: "unchained",
      level: 8,
      bab: 8,
      babDelta: 0,
      penalty: 0,
      extraAttacks: 1,
      source: "flurry of blows",
      restriction: "unarmed strikes or monk weapons only",
    });
  });

  it("the unarmed strike's normal sequence is +10/+5", () => {
    const unarmed = sheet.attacks.find((a) => a.name === "Unarmed Strike")!;
    expect(unarmed.attack.iteratives).toEqual([10, 5]);
  });

  it("its flurry sequence is +10/+10/+5", () => {
    const unarmed = sheet.attacks.find((a) => a.name === "Unarmed Strike")!;
    expect(unarmed.flurry).toEqual([10, 10, 5]);
  });

  it("the longsword carries no flurry line", () => {
    expect(sheet.attacks.find((a) => a.name === "Longsword")!.flurry).toBeUndefined();
  });
});

describe("compute() — a level 8 chained monk's flurry line", () => {
  // Str 14 (+2), BAB 6 (medium). Normal full attack +8/+3; the flurry runs off
  // monk level 8 as BAB at -2 on every attack: +8/+8/+3/+3.
  const sheet = compute(makeDoc([{ tag: "monk", level: 8 }], [UNARMED]), ref);

  it("the flurry runs off monk level, not true BAB", () => {
    expect(sheet.bab).toBe(6);
    expect(sheet.flurry?.bab).toBe(8);
    expect(sheet.flurry?.babDelta).toBe(2);
  });

  it("normal +8/+3, flurry +8/+8/+3/+3", () => {
    const unarmed = sheet.attacks.find((a) => a.name === "Unarmed Strike")!;
    expect(unarmed.attack.iteratives).toEqual([8, 3]);
    expect(unarmed.flurry).toEqual([8, 8, 3, 3]);
  });
});

describe("compute() — a multiclass chained monk", () => {
  // Monk 5 / fighter 5: true BAB is 3 + 5 = 8. The flurry substitutes the monk
  // levels' own contribution with monk level (5 instead of 3), so it runs off
  // 10: one extra attack duplicating the top of a two-attack sequence, at -2.
  const sheet = compute(
    makeDoc(
      [
        { tag: "monk", level: 5 },
        { tag: "fighter", level: 5 },
      ],
      [UNARMED],
    ),
    ref,
  );

  it("monk level replaces the BAB the monk levels granted, not the whole BAB", () => {
    expect(sheet.bab).toBe(8);
    expect(sheet.flurry?.bab).toBe(10);
  });

  it("flurry +10/+10/+5 (10 + Str 2 - 2 penalty, iteratives off 10)", () => {
    const unarmed = sheet.attacks.find((a) => a.name === "Unarmed Strike")!;
    expect(unarmed.attack.iteratives).toEqual([10, 5]);
    expect(unarmed.flurry).toEqual([10, 10, 5]);
  });
});

describe("compute() — no monk levels", () => {
  it("leaves both the sheet's flurry and every weapon's flurry line off", () => {
    const sheet = compute(makeDoc([{ tag: "fighter", level: 8 }], [UNARMED]), ref);
    expect(sheet.flurry).toBeUndefined();
    expect(sheet.attacks[0]!.flurry).toBeUndefined();
  });
});
