/**
 * Hand-computed fixture tests for size-scaled weapon damage dice, per the
 * Paizo designer FAQ "Size Changes, Effective Size Changes, and Damage Dice
 * Progression" (paizo.com/paizo/faq/v5748nruor1fm#v5748eaic9t3f, mirrored on
 * aonprd.com): "If the size increases by one step, look up the original
 * damage on the chart and increase the damage by two steps. If the initial
 * size is Small or lower (or is treated as Small or lower) or the initial
 * damage is 1d6 or less, instead increase the damage by one step. If the
 * size decreases by one step, look up the original damage on the chart and
 * decrease the damage by two steps. If the initial size is Medium or lower
 * (or is treated as Medium or lower) or the initial damage is 1d8 or less,
 * instead decrease the damage by one step." See `scaleWeaponDamageDice`'s own
 * doc comment in `compute.ts` for how that's applied per size category.
 *
 * Enlarge Person, Reduce Person, and an active polymorph form all change
 * effective size but previously left `ResolvedWeaponAttack.damageDice`
 * untouched — this only rewrites the DISPLAYED dice string; the numeric
 * `damageBonus.total` never contained a dice term to begin with (formula.ts
 * can't evaluate one — see the engine cookbook §2.2).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, ActiveForm, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, scaleWeaponDamageDice } from "../src/compute.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  weapons: WeaponInstance[],
  activeBuffs: ActiveBuff[] = [],
  activeForm?: ActiveForm,
): CharacterDoc {
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
      ...(activeForm ? { activeForm } : {}),
    },
  };
}

describe("scaleWeaponDamageDice(): the pure die-chain helper", () => {
  it("Medium 1d8 to Large: normal case (Medium isn't Small-or-lower, 1d8 isn't 1d6-or-less) -> two-step 2d6", () => {
    expect(scaleWeaponDamageDice("1d8", "med", "lg")).toBe("2d6");
  });

  it("Small 1d6 up through Large: Small->Medium is the exception (Small-or-lower), Medium->Large is normal -> 2d6", () => {
    expect(scaleWeaponDamageDice("1d6", "sm", "lg")).toBe("2d6");
  });

  it("Medium 1d8 down to Small: exception (Medium-or-lower) -> one-step 1d6", () => {
    expect(scaleWeaponDamageDice("1d8", "med", "sm")).toBe("1d6");
  });

  it("Medium 1d10 up to Large: normal case on the d10 family -> 2d8", () => {
    expect(scaleWeaponDamageDice("1d10", "med", "lg")).toBe("2d8");
  });

  it("same size is a no-op, even for an unrecognized die", () => {
    expect(scaleWeaponDamageDice("2d12", "med", "med")).toBe("2d12");
  });

  it("clamps at the top of the chain instead of guessing further", () => {
    expect(scaleWeaponDamageDice("16d6", "med", "col")).toBe("16d6");
  });

  it("clamps at the bottom of the chain", () => {
    expect(scaleWeaponDamageDice("1", "col", "fine")).toBe("1");
  });

  it("leaves a die that isn't on a chain and has no charted equivalent unscaled", () => {
    expect(scaleWeaponDamageDice("1d7", "med", "lg")).toBe("1d7");
    expect(scaleWeaponDamageDice("", "med", "lg")).toBe("");
  });
});

/**
 * The FAQ's small-size/small-damage exception, hand-traced one size category
 * at a time (the FAQ's rule is stated per single size step; a multi-category
 * change re-checks the condition at each step against the size/dice CURRENT
 * at that step — see `scaleWeaponDamageDice`'s doc comment in compute.ts).
 */
describe("scaleWeaponDamageDice(): the small-size/small-damage FAQ exception", () => {
  it("Medium 1d8 to Tiny: every step from Medium down is Medium-or-lower, so it's one-for-one -> 1d4", () => {
    // med->sm (Medium is Medium-or-lower: 1d8->1d6), sm->tiny (Small is Medium-or-lower: 1d6->1d4).
    expect(scaleWeaponDamageDice("1d8", "med", "tiny")).toBe("1d4");
  });

  it("Medium 1d8 to Diminutive: one more one-for-one step past Tiny -> 1d3", () => {
    expect(scaleWeaponDamageDice("1d8", "med", "dim")).toBe("1d3");
  });

  it("Medium 1d8 to Fine: one more one-for-one step past Diminutive -> 1d2", () => {
    expect(scaleWeaponDamageDice("1d8", "med", "fine")).toBe("1d2");
  });

  it("Tiny 1d4 up to Medium (the reverse of the Medium->Tiny case above): tiny->sm and sm->med are both Small-or-lower, one-for-one -> 1d8", () => {
    expect(scaleWeaponDamageDice("1d4", "tiny", "med")).toBe("1d8");
  });

  it("Medium 1d4 (e.g. a dagger) growing to Large: Medium is NOT Small-or-lower, but 1d4 IS 1d6-or-less — the DAMAGE condition alone triggers the one-step exception -> 1d6, not the normal two-step 1d8", () => {
    expect(scaleWeaponDamageDice("1d4", "med", "lg")).toBe("1d6");
  });

  it("Medium 1d10 down to Small crosses from the d10 family onto the main chain's 1d8: Medium-or-lower exception -> 1d8, not clamped at 1d10", () => {
    expect(scaleWeaponDamageDice("1d10", "med", "sm")).toBe("1d8");
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
    expect(scaleWeaponDamageDice("2d4", "med", "lg")).toBe("2d6");
  });

  it("2d4 counts as 1d8 stepping down too: 1d6 (Medium-or-lower exception)", () => {
    expect(scaleWeaponDamageDice("2d4", "med", "sm")).toBe("1d6");
  });

  it("3d4 counts as 2d6, so it steps up to 3d6", () => {
    expect(scaleWeaponDamageDice("3d4", "med", "lg")).toBe("3d6");
  });

  it("1d12 counts as 2d6, so a greataxe steps up to 3d6", () => {
    expect(scaleWeaponDamageDice("1d12", "med", "lg")).toBe("3d6");
  });

  it("1d12 counts as 2d6 stepping down: the exception (Medium-or-lower) crosses onto the d10 family's 1d10, not the printed 1d12's own row", () => {
    expect(scaleWeaponDamageDice("1d12", "med", "sm")).toBe("1d10");
  });

  it("2d12 continues the d12 run one step past 1d12: counts as 3d6, steps to 4d6", () => {
    expect(scaleWeaponDamageDice("2d12", "med", "lg")).toBe("4d6");
  });

  it("1d4 is printed on the chart already and is not redirected", () => {
    expect(scaleWeaponDamageDice("1d4", "sm", "med")).toBe("1d6");
  });

  it("a converted die still clamps at the top of its chain", () => {
    expect(scaleWeaponDamageDice("2d4", "fine", "col")).toBe("12d6");
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

describe("compute(): an active polymorph form can reach sizes below Small", () => {
  const sword: WeaponInstance = {
    name: "Longsword",
    attackAbility: "str",
    damageDice: "1d8",
  };
  // `tier`/`creatureType`/`formName` don't need to resolve to a known
  // `PolymorphFormOption` — `live.activeForm.size` overrides the size ladder
  // outright regardless (see `ActiveForm`'s doc comment in schema/character.ts).
  const tinyForm = (): ActiveForm => ({
    tier: "test-tier",
    creatureType: "animal",
    formName: "Test Tiny Form",
    size: "tiny",
  });

  it("a Medium human polymorphed into a Tiny form reads the weapon at 1d4, same as a direct size-ladder shift", () => {
    const sheet = compute(makeDoc([sword], [], tinyForm()), ref);
    expect(sheet.attacks[0]!.damageDice).toBe("1d4");
  });
});
