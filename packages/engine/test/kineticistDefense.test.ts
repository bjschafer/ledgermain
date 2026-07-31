import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveKineticistDefense } from "../src/index.js";

/**
 * Elemental Defense wild talents. Expected values are hand-computed from the
 * published rules for each defense (see `kineticist-defense.ts` for the
 * per-element citations); the burn spent on a defense is a division of burn
 * already held, so every case here sets the Burn pool as well as the counter.
 */
const ref = loadRefData();

const BURN_FEATURE_ID = Object.values(ref.classFeatures).find((f) => f.tag === "burn")!.id;

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeKineticist(opts: {
  level: number;
  element: string;
  burnHeld?: number;
  defenseBurn?: number;
  shroudMode?: "armor" | "shield";
  con?: number;
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
      classes: [{ tag: "kineticist", level: opts.level }],
    },
    abilities: { str: 10, dex: 10, con: opts.con ?? 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      kineticistElement: opts.element,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: opts.burnHeld ? { [BURN_FEATURE_ID]: { used: opts.burnHeld, max: 10 } } : {},
      kineticistDefenseBurn: opts.defenseBurn,
      kineticistShroudMode: opts.shroudMode,
    },
  };
}

describe("when a defense exists at all", () => {
  it("nothing below 2nd level, where Elemental Defense isn't granted yet", () => {
    expect(resolveKineticistDefense("earth", 1)).toBeUndefined();
    expect(resolveKineticistDefense("earth", 2)).toBeDefined();
  });

  it("nothing without a primary element, or for an element with no defense", () => {
    expect(resolveKineticistDefense(undefined, 10)).toBeUndefined();
    expect(resolveKineticistDefense("nonsense", 10)).toBeUndefined();
  });
});

describe("Force Ward (aether) grants temporary hit points", () => {
  it("equal to kineticist level, plus half that per burn spent here", () => {
    const d = resolveKineticistDefense("aether", 8, { burnInvested: 2 })!;
    // 8 + 2 x floor(8/2) = 16
    expect(d.changes).toEqual([{ formula: "16", target: "tempHp", type: "untyped" }]);
    expect(d.detail).toContain("16 temporary hit points");
  });

  it("reaches the sheet's granted temp HP total", () => {
    const sheet = compute(
      makeKineticist({ level: 8, element: "aether", burnHeld: 2, defenseBurn: 2 }),
      ref,
    );
    expect(sheet.hp.grantedTemp.total).toBe(16);
  });

  it("counts only burn actually held, however much the counter claims", () => {
    const sheet = compute(
      makeKineticist({ level: 8, element: "aether", burnHeld: 1, defenseBurn: 5 }),
      ref,
    );
    expect(sheet.hp.grantedTemp.total).toBe(12); // 8 + 1 x 4, not 8 + 5 x 4
  });
});

describe("Flesh of Stone (earth) grants DR/adamantine", () => {
  it("DR 1 at 2nd, +1 per 2 levels beyond, +1 per burn spent here", () => {
    // Level 8: 1 + floor(6/2) = 4 base, +2 burn = 6.
    const d = resolveKineticistDefense("earth", 8, { burnInvested: 2 })!;
    expect(d.changes).toEqual([{ formula: "6", target: "dr.adamantine", type: "untyped" }]);
  });

  it("caps the total at kineticist level", () => {
    // Level 8, base 4, cap 8: 10 points of burn can only reach 8.
    expect(resolveKineticistDefense("earth", 8, { burnInvested: 10 })!.changes[0]!.formula).toBe(
      "8",
    );
    expect(resolveKineticistDefense("earth", 8)!.maxBurnInvested).toBe(4);
  });

  it("shows up on the computed sheet's damage reduction", () => {
    const sheet = compute(
      makeKineticist({ level: 8, element: "earth", burnHeld: 2, defenseBurn: 2 }),
      ref,
    );
    const dr = sheet.defenses?.dr.find((e) => e.qualifier === "adamantine");
    expect(dr?.total).toBe(6);
  });
});

describe("Shroud of Water grants AC in whichever shape it's in", () => {
  it("+4 armor at 2nd, +1 per 4 levels beyond, burn adding up to half the base", () => {
    // Level 10: base 4 + floor(8/4) = 6, burn cap floor(6/2) = 3.
    const armor = resolveKineticistDefense("water", 10, { burnInvested: 2 })!;
    expect(armor.changes).toEqual([{ formula: "8", target: "aac", type: "untyped" }]);
    expect(armor.maxBurnInvested).toBe(3);
  });

  it("shaped as a shield it starts at +2 and lands on the shield bonus instead", () => {
    const shield = resolveKineticistDefense("water", 10, {
      burnInvested: 2,
      shroudMode: "shield",
    })!;
    // base 2 + floor(8/4) = 4, cap floor(4/2) = 2, so 2 burn is fully spent.
    expect(shield.changes).toEqual([{ formula: "6", target: "sac", type: "untyped" }]);
  });

  it("moves armor class on the computed sheet, and touch AC never sees it", () => {
    const doc = makeKineticist({
      level: 10,
      element: "water",
      burnHeld: 2,
      defenseBurn: 2,
    });
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(18); // 10 + 8 armor, Dex 10
    expect(sheet.ac.touch).toBe(10);
  });
});

describe("Flesh of Wood (wood) enhances natural armor", () => {
  it("+1 at 2nd, and one more burn slot every 3 levels beyond", () => {
    // Level 11: slots = 1 + floor(9/3) = 4, so 4 burn reaches +5.
    const d = resolveKineticistDefense("wood", 11, { burnInvested: 4 })!;
    expect(d.changes).toEqual([{ formula: "5", target: "nac", type: "enh" }]);
    expect(d.maxBurnInvested).toBe(4);
  });

  it("burn beyond the level's slots does nothing, and the bonus caps at +7", () => {
    expect(resolveKineticistDefense("wood", 11, { burnInvested: 9 })!.changes[0]!.formula).toBe(
      "5",
    );
    expect(resolveKineticistDefense("wood", 17, { burnInvested: 9 })!.changes[0]!.formula).toBe(
      "7",
    );
  });
});

describe("Emptiness (void) resists negative energy", () => {
  it("resistance 2, +2 per burn spent here", () => {
    const d = resolveKineticistDefense("void", 6, { burnInvested: 3 })!;
    expect(d.changes).toEqual([{ formula: "8", target: "eres.negativeEnergy", type: "untyped" }]);
    expect(d.detail).toContain("20% to ignore a critical hit or sneak attack");
  });

  it("shows up on the computed sheet's resistances", () => {
    const sheet = compute(
      makeKineticist({ level: 6, element: "void", burnHeld: 3, defenseBurn: 3 }),
      ref,
    );
    const res = sheet.defenses?.resistances.find((e) => e.qualifier === "negative-energy");
    expect(res?.total).toBe(8);
  });
});

describe("the two defenses with no sheet stat stay honest", () => {
  it("Enveloping Winds computes its miss chance but applies no Change", () => {
    // Level 12: 20 + 5 x floor(10/5) = 30 base, +5 per burn, hard cap 75.
    const d = resolveKineticistDefense("air", 12, { burnInvested: 3 })!;
    expect(d.changes).toEqual([]);
    expect(d.detail).toContain("45% miss chance");
    expect(resolveKineticistDefense("air", 12, { burnInvested: 99 })!.detail).toContain("75%");
  });

  it("Searing Flesh computes its retaliation damage but applies no Change", () => {
    // Level 12: floor(12/4) = 3 per step, doubled once by 1 burn.
    const d = resolveKineticistDefense("fire", 12, { burnInvested: 1 })!;
    expect(d.changes).toEqual([]);
    expect(d.detail).toContain("6 fire damage");
    expect(d.maxBurnInvested).toBe(7);
  });

  it("says so in its notes rather than inventing a target", () => {
    expect(resolveKineticistDefense("air", 12)!.notes[0]).toContain("not a number this sheet");
    expect(resolveKineticistDefense("fire", 12)!.notes[0]).toContain("not a sheet stat");
  });
});

describe("the class-feature row", () => {
  it("states the defense's current value, not the rule that produces it", () => {
    const sheet = compute(
      makeKineticist({ level: 8, element: "earth", burnHeld: 2, defenseBurn: 2 }),
      ref,
    );
    const row = sheet.classFeatures.find(
      (f) => f.classTag === "kineticist" && f.name === "Elemental Defense",
    );
    expect(row?.detail).toBe("Flesh of Stone: DR 6/adamantine (max DR 8 at this level)");
  });
});
