/**
 * Hand-computed fixture tests for size-scaled weapon damage dice (CRB p.145
 * weapon-size damage table / Paizo's size-change designer FAQ: "1d4 -> 1d6
 * -> 1d8 -> 2d6 -> 3d6 -> ..."). Enlarge Person, Reduce Person, and an active
 * polymorph form all change effective size but previously left
 * `ResolvedWeaponAttack.damageDice` untouched — this only rewrites the
 * DISPLAYED dice string; the numeric `damageBonus.total` never contained a
 * dice term to begin with (formula.ts can't evaluate one — see the engine
 * cookbook §2.2).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, scaleWeaponDamageDice } from "../src/compute.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(weapons: WeaponInstance[], activeBuffs: ActiveBuff[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "weapon-size-dice-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 8 },
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
      activeBuffs,
      resources: {},
    },
  };
}

describe("scaleWeaponDamageDice(): the pure die-chain helper", () => {
  it("steps up the main chain: 1d8 by 1 step -> 2d6 (CRB p.145)", () => {
    expect(scaleWeaponDamageDice("1d8", 1)).toBe("2d6");
  });

  it("steps up the main chain by 2: 1d6 -> 2d6", () => {
    expect(scaleWeaponDamageDice("1d6", 2)).toBe("2d6");
  });

  it("steps down the main chain: 1d8 by -1 step -> 1d6", () => {
    expect(scaleWeaponDamageDice("1d8", -1)).toBe("1d6");
  });

  it("steps up the 1d10 family: 1d10 -> 2d8", () => {
    expect(scaleWeaponDamageDice("1d10", 1)).toBe("2d8");
  });

  it("0 steps returns the input unchanged, even for an unrecognized die", () => {
    expect(scaleWeaponDamageDice("2d12", 0)).toBe("2d12");
  });

  it("clamps at the top of the chain instead of guessing further", () => {
    expect(scaleWeaponDamageDice("16d6", 5)).toBe("16d6");
  });

  it("clamps at the bottom of the chain", () => {
    expect(scaleWeaponDamageDice("1", -5)).toBe("1");
  });

  it("leaves a die that isn't on a chain and has no charted equivalent unscaled", () => {
    expect(scaleWeaponDamageDice("1d7", 1)).toBe("1d7");
    expect(scaleWeaponDamageDice("", 1)).toBe("");
  });
});

/**
 * Size-change FAQ: "If the die type is not referenced on this chart, apply the
 * following rules before adjusting the damage dice. 2d4 counts as 1d8 on the
 * chart, 3d4 counts as 2d6 on the chart, and so on for higher numbers of d4.
 * 1d12 counts as 2d6 on the chart, and so on for higher numbers of d12."
 */
describe("scaleWeaponDamageDice(): dice the chart doesn't print convert first", () => {
  it("2d4 counts as 1d8, so a scythe steps up to 2d6", () => {
    expect(scaleWeaponDamageDice("2d4", 1)).toBe("2d6");
  });

  it("2d4 counts as 1d8 stepping down too: 1d6", () => {
    expect(scaleWeaponDamageDice("2d4", -1)).toBe("1d6");
  });

  it("3d4 counts as 2d6, so it steps up to 3d6", () => {
    expect(scaleWeaponDamageDice("3d4", 1)).toBe("3d6");
  });

  it("1d12 counts as 2d6, so a greataxe steps up to 3d6", () => {
    expect(scaleWeaponDamageDice("1d12", 1)).toBe("3d6");
  });

  it("1d12 counts as 2d6 stepping down: 1d8, not the printed 1d12's own row", () => {
    expect(scaleWeaponDamageDice("1d12", -1)).toBe("1d8");
  });

  it("2d12 continues the d12 run one step past 1d12: counts as 3d6, steps to 4d6", () => {
    expect(scaleWeaponDamageDice("2d12", 1)).toBe("4d6");
  });

  it("1d4 is printed on the chart already and is not redirected", () => {
    expect(scaleWeaponDamageDice("1d4", 1)).toBe("1d6");
  });

  it("a converted die still clamps at the top of its chain", () => {
    expect(scaleWeaponDamageDice("2d4", 99)).toBe("16d6");
  });
});

describe("compute(): Enlarge Person scales the displayed weapon damage dice", () => {
  const sword: WeaponInstance = {
    name: "Longsword",
    attackAbility: "str",
    damageDice: "1d8",
  };
  const enlarge: ActiveBuff = {
    instanceId: "buff-enlarge",
    name: "Enlarge Person",
    changes: [{ target: "size", type: "untyped", formula: "1" }],
  };

  it("baseline (Medium): damageDice stays 1d8", () => {
    const sheet = compute(makeDoc([sword]), ref);
    expect(sheet.attacks[0]!.damageDice).toBe("1d8");
  });

  it("Enlarged (Large, +1 size step): damageDice becomes 2d6", () => {
    const sheet = compute(makeDoc([sword], [enlarge]), ref);
    expect(sheet.attacks[0]!.damageDice).toBe("2d6");
  });

  it("the numeric damage bonus is untouched by the dice rewrite (STR mod only)", () => {
    const sheet = compute(makeDoc([sword], [enlarge]), ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(2); // STR 14 -> mod +2
  });
});

describe("compute(): Reduce Person scales the displayed weapon damage dice down", () => {
  const sword: WeaponInstance = {
    name: "Longsword",
    attackAbility: "str",
    damageDice: "1d8",
  };
  const reduce: ActiveBuff = {
    instanceId: "buff-reduce",
    name: "Reduce Person",
    changes: [{ target: "size", type: "untyped", formula: "-1" }],
  };

  it("Reduced (Small, -1 size step): damageDice becomes 1d6", () => {
    const sheet = compute(makeDoc([sword], [reduce]), ref);
    expect(sheet.attacks[0]!.damageDice).toBe("1d6");
  });
});

describe("compute(): a greataxe (1d12, off the chart) scales through its equivalent", () => {
  const greataxe: WeaponInstance = {
    name: "Greataxe",
    attackAbility: "str",
    damageDice: "1d12",
  };
  const enlarge: ActiveBuff = {
    instanceId: "buff-enlarge",
    name: "Enlarge Person",
    changes: [{ target: "size", type: "untyped", formula: "1" }],
  };

  it("at base size the printed die is untouched: 1d12", () => {
    expect(compute(makeDoc([greataxe]), ref).attacks[0]!.damageDice).toBe("1d12");
  });

  it("Enlarged: counts as 2d6, so it reads 3d6", () => {
    expect(compute(makeDoc([greataxe], [enlarge]), ref).attacks[0]!.damageDice).toBe("3d6");
  });

  it("dropping the buff prints 1d12 again — scaling always recomputes from the stored die", () => {
    expect(compute(makeDoc([greataxe], []), ref).attacks[0]!.damageDice).toBe("1d12");
  });
});

describe("compute(): a weapon with no damageDice is unaffected", () => {
  it("does not add a damageDice field when none was set", () => {
    const bareWeapon: WeaponInstance = { name: "Improvised Club", attackAbility: "str" };
    const enlarge: ActiveBuff = {
      instanceId: "buff-enlarge-2",
      name: "Enlarge Person",
      changes: [{ target: "size", type: "untyped", formula: "1" }],
    };
    const sheet = compute(makeDoc([bareWeapon], [enlarge]), ref);
    expect(sheet.attacks[0]!.damageDice).toBeUndefined();
  });
});
