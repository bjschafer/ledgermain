import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  burnDetailLabel,
  burnPerRoundLimit,
  compute,
  deriveResourcePools,
  kineticBlastDetail,
  kineticOverflowBonus,
  kineticOverflowUpgradeLabel,
} from "../src/index.js";

/**
 * Kineticist (Occult Adventures, 17-class expansion follow-up wave) — class
 * vend + the Burn resource pool (which rides in FREE from the vendored Burn
 * feature's `uses.maxFormula: "3 + @abilities.con.mod"`, no hand-authoring
 * needed for the max) + the hand-authored display helpers. Lookups scoped by
 * classTag, never bare name.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(classes: { tag: string; level: number }[], con: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities: { str: 10, dex: 10, con, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("kineticist class vend (real vendored data slice)", () => {
  it("kineticist 4 computes: 3/4 BAB (+3), good Fort/Ref, poor Will", () => {
    const sheet = compute(makeDoc([{ tag: "kineticist", level: 4 }], 16), ref);
    expect(sheet.bab).toBe(3); // med: floor(4 * 3/4)
    expect(sheet.saves.fort.total).toBe(7); // good base 4 + Con +3
    expect(sheet.saves.ref.total).toBe(4); // good base 4 + Dex 0
    expect(sheet.saves.will.total).toBe(1); // poor base 1 + Wis 0
  });

  it("kineticist is a NON-caster: no vendored spell list at all (correct, it does not cast)", () => {
    expect(ref.spellLists["kineticist"]).toBeUndefined();
  });
});

describe("Burn resource pool (vendored uses.maxFormula, not hand-authored)", () => {
  it("burn max = 3 + Con mod (Con 16 → 6), tracked in charges", () => {
    const doc = makeDoc([{ tag: "kineticist", level: 4 }], 16);
    const sheet = compute(doc, ref);
    const burn = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "kineticist" && p.name === "Burn",
    );
    expect(burn).toBeDefined();
    expect(burn!.max).toBe(6); // 3 + 3
    expect(burn!.per).toBe("charges");
    expect(burn!.restValue).toBe(6); // full night's rest removes all burn
  });

  it("burn detail explains the nonlethal-per-CHARACTER-level rule without auto-applying it", () => {
    // Multiclass on purpose: character level 7 (kineticist 4 / fighter 3) —
    // the nonlethal amount must use TOTAL character level, per RAW; the
    // per-round cap uses kineticist class level (4 → still 1/round).
    const doc = makeDoc(
      [
        { tag: "kineticist", level: 4 },
        { tag: "fighter", level: 3 },
      ],
      16,
    );
    const sheet = compute(doc, ref);
    const burn = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "kineticist" && p.name === "Burn",
    );
    expect(burn!.detail).toBe(burnDetailLabel(7, 4));
    expect(burn!.detail).toContain("7 nonlethal");
    expect(burn!.detail).toContain("max 1 accepted/round");
  });
});

describe("burnPerRoundLimit (hand-computed vs. the published tiers)", () => {
  it("1/round at L1-5, 2 at L6-8, 3 at L9-11, 4 at L12-14, 5 at L15-17, 6 at L18+", () => {
    expect(burnPerRoundLimit(1)).toBe(1);
    expect(burnPerRoundLimit(5)).toBe(1);
    expect(burnPerRoundLimit(6)).toBe(2);
    expect(burnPerRoundLimit(8)).toBe(2);
    expect(burnPerRoundLimit(9)).toBe(3);
    expect(burnPerRoundLimit(12)).toBe(4);
    expect(burnPerRoundLimit(15)).toBe(5);
    expect(burnPerRoundLimit(18)).toBe(6);
    expect(burnPerRoundLimit(20)).toBe(6);
  });
});

describe("kineticBlastDetail (hand-computed vs. the published progression)", () => {
  it("dice = ceil(level/2): 1d6 at L1, 2d6 at L3-4, 10d6 at L19-20", () => {
    expect(kineticBlastDetail(1).dice).toBe(1);
    expect(kineticBlastDetail(3).dice).toBe(2);
    expect(kineticBlastDetail(4).dice).toBe(2);
    expect(kineticBlastDetail(19).dice).toBe(10);
    expect(kineticBlastDetail(20).dice).toBe(10);
  });

  it("resolved labels: L4 Con +3 → physical 2d6+5, energy 2d6+1 (touch)", () => {
    const d = kineticBlastDetail(4, 3);
    expect(d.physicalLabel).toBe("2d6+5 (physical)"); // 2 (dice rider) + 3 (Con)
    expect(d.energyLabel).toBe("2d6+1 (energy, touch)"); // floor(3/2)
  });

  it("symbolic labels when no Con mod is supplied", () => {
    const d = kineticBlastDetail(5);
    expect(d.physicalLabel).toBe("3d6+3 + Con mod (physical)");
    expect(d.energyLabel).toBe("3d6 + 1/2 Con mod (energy, touch)");
  });

  it("blast details surface on the computed sheet's class-feature rows", () => {
    const sheet = compute(makeDoc([{ tag: "kineticist", level: 4 }], 16), ref);
    const physical = sheet.classFeatures.find(
      (f) => f.classTag === "kineticist" && f.name === "Physical Kinetic Blast",
    );
    const energy = sheet.classFeatures.find(
      (f) => f.classTag === "kineticist" && f.name === "Energy Kinetic Blast",
    );
    expect(physical?.detail).toBe("2d6+5 (physical)");
    expect(energy?.detail).toBe("2d6+1 (energy, touch)");
  });
});

describe("Psychokinetcist (Occult Adventures p.56) — mind-channeled burn", () => {
  /** Cai Dukun: dwarf Psychokinetcist 11, Wis 25 (belt/headband boosted), Con 20. */
  function makeCai(): CharacterDoc {
    const doc = makeDoc([{ tag: "kineticist", level: 11 }], 20);
    return {
      ...doc,
      abilities: { str: 10, dex: 18, con: 20, int: 14, wis: 25, cha: 11 },
      build: { ...doc.build, archetypes: ["kineticist:psychokinetcist"] },
    };
  }

  function burnPool(doc: CharacterDoc) {
    const pools = deriveResourcePools(doc, ref, compute(doc, ref).abilities);
    return pools.find((p) => p.name === "Burn");
  }

  it("caps burn at the bare Wisdom modifier, not 3 + Constitution", () => {
    // Mind Burn: "an amount of burn equal to his Wisdom modifier (rather than
    // 3 + his Wisdom modifier)". Wis 25 -> +7, matching the play sheet.
    expect(burnPool(makeCai())?.max).toBe(7);
  });

  it("leaves a normal kineticist on 3 + Constitution", () => {
    const doc = makeDoc([{ tag: "kineticist", level: 11 }], 20);
    // Con 20 -> +5, so 3 + 5 = 8 — and notably NOT the psychokinetcist's 7.
    expect(burnPool(doc)?.max).toBe(8);
  });

  it("describes the Wis penalty instead of nonlethal damage, scaled to burn held", () => {
    const doc = makeCai();
    const feature = Object.values(ref.classFeatures).find((f) => f.tag === "burn");
    const held = {
      ...doc,
      live: { ...doc.live, resources: { [feature!.id]: { used: 3 } } },
    } as CharacterDoc;

    expect(burnPool(doc)?.detail).toContain("no nonlethal damage");
    expect(burnPool(doc)?.detail).not.toContain("currently");
    expect(burnPool(held)?.detail).toContain("currently -6");
  });

  it("still swaps Elemental Overflow out for Mental Overflow", () => {
    const sheet = compute(makeCai(), ref);
    const overflow = sheet.classFeatures.find((f) => f.name === "Elemental Overflow");
    expect(overflow?.applied).toBe(false);
    expect(overflow?.replacedBy).toBe("Mental Overflow");
  });
});

/**
 * Elemental Overflow attack/damage cap (issue #67), aonprd.com's live
 * Kineticist page (2026-07-25): "a maximum bonus of +1 for every 3
 * kineticist levels she possesses" — floor(level / 3): +1 at 3rd, +2 at
 * 6th, ..., +6 at 18th-20th. A previous version of `kineticOverflowBonus`
 * read `1 + floor(level / 3)`, one point too high at every level (e.g. +2 at
 * 3rd instead of +1) — cross-checked against the Psychokinetcist's
 * identically-scaled Mental Overflow (`archetype-effects.ts`), which was
 * already using the correct bare `floor(level / 3)`.
 */
describe("kineticOverflowBonus (Elemental Overflow attack/damage cap fix)", () => {
  it("cap = floor(level/3): +1 at L3-5, +2 at L6-8, +3 at L9-11, +6 at L18-20", () => {
    expect(kineticOverflowBonus(3, 10).cap).toBe(1);
    expect(kineticOverflowBonus(5, 10).cap).toBe(1);
    expect(kineticOverflowBonus(6, 10).cap).toBe(2);
    expect(kineticOverflowBonus(9, 10).cap).toBe(3);
    expect(kineticOverflowBonus(18, 10).cap).toBe(6);
    expect(kineticOverflowBonus(20, 10).cap).toBe(6);
  });

  it("nothing below 3rd level (Elemental Overflow isn't granted yet)", () => {
    expect(kineticOverflowBonus(2, 5)).toEqual({ cap: 0, attackBonus: 0, damageBonus: 0 });
  });

  it("attack bonus is capped at the level cap even with more burn held; damage is always 2x attack", () => {
    // Level 3 kineticist (cap +1) holding 4 burn: capped at +1 atk / +2 dmg.
    expect(kineticOverflowBonus(3, 4)).toEqual({ cap: 1, attackBonus: 1, damageBonus: 2 });
    // Level 9 kineticist (cap +3) holding 2 burn: under the cap, so uncapped.
    expect(kineticOverflowBonus(9, 2)).toEqual({ cap: 3, attackBonus: 2, damageBonus: 4 });
  });

  it("surfaces the corrected cap on the computed sheet's Elemental Overflow row", () => {
    const doc = makeDoc([{ tag: "kineticist", level: 3 }], 14);
    const sheet = compute(doc, ref);
    const overflow = sheet.classFeatures.find((f) => f.name === "Elemental Overflow");
    expect(overflow?.detail).toContain("cap +1 atk at this level");
  });
});

/**
 * Elemental Overflow's 6th/11th/16th-level physical-ability-score and
 * crit/sneak-negation upgrades (issue #67), aonprd.com (2026-07-25): +2 size
 * bonus to two physical ability scores at 6th/3+ burn, upgrading to +4/+2/+2
 * at 11th/5+ burn and +6/+4/+2 at 16th/7+ burn, plus a 5%-per-burn chance to
 * ignore a critical hit or sneak attack. Which ability score(s) get which
 * tier is the player's own choice (not a build field), so this stays
 * display-only — see `tables.ts`'s doc comment for why it isn't a `Change`.
 */
describe("kineticOverflowUpgradeLabel (6th/11th/16th-level upgrades)", () => {
  it("nothing below 6th level, even with 3+ burn", () => {
    expect(kineticOverflowUpgradeLabel(5, 5)).toBeUndefined();
  });

  it("nothing below 3 burn, even at high level", () => {
    expect(kineticOverflowUpgradeLabel(20, 2)).toBeUndefined();
  });

  it("6th level, 3 burn: +2/+2 tier, 15% crit/sneak negation", () => {
    const label = kineticOverflowUpgradeLabel(6, 3)!;
    expect(label).toContain("+2 size bonus to two physical ability scores");
    expect(label).toContain("15% chance to ignore a critical hit or sneak attack");
  });

  it("11th level requires 5+ burn to reach the +4/+2/+2 tier — 3 burn still reads the base tier", () => {
    expect(kineticOverflowUpgradeLabel(11, 3)).toContain(
      "+2 size bonus to two physical ability scores",
    );
    const upgraded = kineticOverflowUpgradeLabel(11, 5)!;
    expect(upgraded).toContain(
      "+4 size bonus to one physical ability score, +2 to each of the other two",
    );
    expect(upgraded).toContain("25% chance");
  });

  it("16th level requires 7+ burn to reach the +6/+4/+2 tier — 5 burn still reads the 11th-level tier", () => {
    expect(kineticOverflowUpgradeLabel(16, 5)).toContain(
      "+4 size bonus to one physical ability score",
    );
    const maxed = kineticOverflowUpgradeLabel(16, 7)!;
    expect(maxed).toContain("+6/+4/+2 size bonus to your three physical ability scores");
    expect(maxed).toContain("35% chance");
  });

  it("crit/sneak-negation chance caps at 100% (20 burn -> 100%, not 100+)", () => {
    expect(kineticOverflowUpgradeLabel(16, 20)).toContain("100% chance");
  });

  it("surfaces on the computed sheet's Elemental Overflow row once the burn/level floor is met", () => {
    const doc = makeDoc([{ tag: "kineticist", level: 6 }], 14);
    const feature = Object.values(ref.classFeatures).find((f) => f.tag === "burn");
    const held = {
      ...doc,
      live: { ...doc.live, resources: { [feature!.id]: { used: 3 } } },
    } as CharacterDoc;
    const sheet = compute(held, ref);
    const overflow = sheet.classFeatures.find((f) => f.name === "Elemental Overflow");
    expect(overflow?.detail).toContain("+2 size bonus to two physical ability scores");
  });

  it("does not surface the upgrade text on the sheet below the burn floor", () => {
    const doc = makeDoc([{ tag: "kineticist", level: 6 }], 14);
    const sheet = compute(doc, ref); // 0 burn held
    const overflow = sheet.classFeatures.find((f) => f.name === "Elemental Overflow");
    expect(overflow?.detail).not.toContain("size bonus");
  });
});
