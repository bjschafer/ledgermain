/**
 * Hand-computed fixture tests for the per-class-scoped `CLASS_FEATURE_CHANGE_
 * PATCHES` entries wired this wave — every one keyed as `"<classTag>:<Feature
 * Name>"` because the bare name is unsafe (a different bearer shares it with
 * a genuinely different progression or mechanic). Mirrors `trapSense.test.ts`
 * and `classFeaturePatches.test.ts`'s fixture style: a bare `CharacterDoc`
 * through `compute()`, hand-verified numbers cited against the published
 * rule.
 *
 * Every fixture uses a Human with all abilities at 10 (no ability-mod or
 * racial contribution) unless noted otherwise, so a granted bonus reads as
 * the whole of a stat's non-base contribution.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human, one class at `level`, all abilities 10 unless overridden. */
function makeDoc(
  tag: string,
  level: number,
  opts: { gear?: ItemInstance[]; abilities?: Partial<CharacterDoc["abilities"]> } = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "class-feature-per-class-patch-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag, level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...opts.abilities },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: opts.gear ?? [],
      racialTraits: [],
      vendoredRacialTraits: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function trapsLine(conditionals: { total: number; categories: string[] }[] | undefined) {
  return conditionals?.find((c) => c.categories.includes("traps"));
}

describe("Danger Sense (Rogue Unchained / Barbarian Unchained, per-class 'traps' pair)", () => {
  // "At 3rd level, the character gains a +1 bonus on Reflex saves to avoid
  // traps and a +1 dodge bonus to AC against attacks made by traps... These
  // bonuses increase by 1 every 3 class levels thereafter" (Pathfinder
  // Unchained, 3rd level). floor(level / 3), identical shape to Trap Sense.

  it("Rogue (Unchained) 3: +1 Reflex vs. traps, +1 dodge AC vs. traps", () => {
    const sheet = compute(makeDoc("rogueUnchained", 3), ref);
    // Rogue (Unchained) Ref is a good save: 2 + floor(level/2). Level 3: 2+1=3.
    expect(sheet.saves.ref.total).toBe(3);
    expect(trapsLine(sheet.saves.ref.conditionals)?.total).toBe(4);
    expect(sheet.ac.normal).toBe(10);
    expect(trapsLine(sheet.ac.conditionals)?.total).toBe(11);
  });

  it("Rogue (Unchained) grants nothing below 3rd level", () => {
    const sheet = compute(makeDoc("rogueUnchained", 2), ref);
    expect(trapsLine(sheet.saves.ref.conditionals)).toBeUndefined();
    expect(trapsLine(sheet.ac.conditionals)).toBeUndefined();
  });

  it("Barbarian (Unchained) 6: +2, on a poor Reflex save (proves the per-class key, not the bare Trap Sense one)", () => {
    // Barbarian (Unchained) Ref is a poor save: floor(level/3). Level 6: 2.
    const sheet = compute(makeDoc("barbarianUnchained", 6), ref);
    expect(sheet.saves.ref.total).toBe(2);
    expect(trapsLine(sheet.saves.ref.conditionals)?.total).toBe(4); // 2 + 2
    expect(trapsLine(sheet.ac.conditionals)?.total).toBe(sheet.ac.normal + 2);
  });
});

describe("Danger Sense (Shieldmarshal, per-class initiative bonus, wholly different mechanic)", () => {
  it("2nd level: +1 initiative (1/2 level)", () => {
    // "a shieldmarshal gains a bonus on initiative checks equal to 1/2 his
    // level" (Pathfinder Society Field Guide, 2nd level). Dex mod 0, so
    // initiative reads as the bonus alone.
    const sheet = compute(makeDoc("shieldmarshal", 2), ref);
    expect(sheet.initiative.total).toBe(1);
  });

  it("6th level: +3 initiative", () => {
    const sheet = compute(makeDoc("shieldmarshal", 6), ref);
    expect(sheet.initiative.total).toBe(3);
  });
});

describe("Poison Resistance (Alchemist / Investigator, per-class 'poison' pair)", () => {
  // "the character gains a +2 bonus on all saving throws against poison.
  // This bonus increases to +4 at 5th level, and then again to +6 at 8th
  // level" (Core Rulebook / APG, 2nd level).

  it("Alchemist 2: +2 vs. poison (good Fort)", () => {
    // Alchemist Fort is a good save: 2 + floor(level/2). Level 2: 2+1=3.
    const sheet = compute(makeDoc("alchemist", 2), ref);
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 5, categories: ["poison"], labels: ["poison"] },
    ]);
  });

  it("Alchemist 5: +4 vs. poison", () => {
    const sheet = compute(makeDoc("alchemist", 5), ref);
    expect(sheet.saves.fort.total).toBe(4); // 2 + floor(5/2)
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 8, categories: ["poison"], labels: ["poison"] },
    ]);
  });

  it("Alchemist 8: +6 vs. poison", () => {
    const sheet = compute(makeDoc("alchemist", 8), ref);
    expect(sheet.saves.fort.total).toBe(6); // 2 + floor(8/2)
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 12, categories: ["poison"], labels: ["poison"] },
    ]);
  });

  it("Investigator 2: +2 vs. poison, on a poor Fort save (proves the per-class key)", () => {
    // Investigator Fort is a poor save: floor(level/3). Level 2: 0.
    const sheet = compute(makeDoc("investigator", 2), ref);
    expect(sheet.saves.fort.total).toBe(0);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 2, categories: ["poison"], labels: ["poison"] },
    ]);
  });
});

describe("Poison Resistance (Liberator, per-class, different pace than the Alchemist's)", () => {
  it("7th level (the vendored grant level, already at the +4 tier): +4 vs. poison", () => {
    // "He gains a +2 bonus on saving throws made against poisons. This
    // bonus increases to +4 at 7th level" (Faiths of Purity). The vendored
    // grant level is 7th itself, so the +2 tier is never seen in practice
    // (same LIBERATED_MIND-style grant-level coincidence). Liberator Fort is
    // a good prestige save: floor((level+1)/2). Level 7: floor(8/2)=4.
    const sheet = compute(makeDoc("liberator", 7), ref);
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 8, categories: ["poison"], labels: ["poison"] },
    ]);
  });
});

describe("Damage Reduction (Stalwart Defender, per-class, unconditional)", () => {
  // "a stalwart defender gains DR 1/-. At 7th level, this DR increases to
  // 3/-, and at 10th level it increases to 5/-" (Ultimate Combat). Not
  // stance-gated: a separate automatic feature from Defensive Stance.

  it("5th level: DR 1/-", () => {
    const sheet = compute(makeDoc("stalwartDefender", 5), ref);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(1);
  });

  it("7th level: DR 3/-", () => {
    const sheet = compute(makeDoc("stalwartDefender", 7), ref);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(3);
  });

  it("10th level: DR 5/-", () => {
    const sheet = compute(makeDoc("stalwartDefender", 10), ref);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(5);
  });

  it("grants nothing below 5th level", () => {
    const sheet = compute(makeDoc("stalwartDefender", 4), ref);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "—")).toBeUndefined();
  });
});

describe("AC Bonus (Stalwart Defender, per-class, unconditional dodge)", () => {
  it("10th level (the vendored grant level): +4 dodge AC, folded into the headline", () => {
    // "A stalwart defender receives a dodge bonus to AC that starts at +1
    // and improves as the defender gains levels, until it reaches +4 at
    // 10th level" (Ultimate Combat). The vendored grant level for this
    // feature is 10th itself, so only the capped +4 tier is ever observable
    // (mirroring the Liberator Poison Resistance grant-level coincidence
    // above). AC = 10 base + 0 Dex + 4 dodge.
    const sheet = compute(makeDoc("stalwartDefender", 10), ref);
    expect(sheet.ac.normal).toBe(14);
    // Dodge is one of the RAW-named AC bonus types that auto-applies to CMD.
    expect(sheet.cmd).toBe(10 + 10 + 4); // 10 + BAB(10, high tier) + 0 Str/Dex + 4 dodge
  });

  it("grants nothing below 10th level", () => {
    const sheet = compute(makeDoc("stalwartDefender", 9), ref);
    expect(sheet.ac.normal).toBe(10);
  });
});

describe("AC Bonus (Student of Perfection, per-class, armor+load gated)", () => {
  // "when a student of perfection wears light armor or no armor, he gains a
  // +1 dodge bonus to his AC and CMD. This bonus increases by 1 at 5th and
  // 9th levels. He loses these bonuses while... wearing medium or heavy
  // armor" (Ultimate Intrigue, 1st level).

  it("1st level, no armor: +1 dodge to AC and CMD", () => {
    const sheet = compute(makeDoc("studentOfPerfection", 1), ref);
    expect(sheet.ac.normal).toBe(11);
    // BAB 1 (high tier), Str/Dex mod 0, +1 dodge.
    expect(sheet.cmd).toBe(10 + 1 + 1);
  });

  it("5th level, light armor: +2 dodge to AC and CMD", () => {
    const doc = makeDoc("studentOfPerfection", 5, {
      gear: [{ equipped: true, armor: { slot: "armor", ac: 2, type: 1 } }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(10 + 2 /* light armor */ + 2 /* dodge */);
    expect(sheet.cmd).toBe(10 + 5 + 2);
  });

  it("9th level, medium armor: dodge bonus lost entirely", () => {
    const doc = makeDoc("studentOfPerfection", 9, {
      gear: [{ equipped: true, armor: { slot: "armor", ac: 4, type: 2 } }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(10 + 4); // armor only, no dodge
    expect(sheet.cmd).toBe(10 + 9); // no dodge on CMD either
  });
});

describe("Eye for Detail (Shieldmarshal, per-class, Intelligence added to Perception/Sense Motive)", () => {
  it("1st level, Int 14: +2 untyped on Perception and Sense Motive", () => {
    // "A shieldmarshal adds his Intelligence bonus as well as his Wisdom
    // bonus on Perception and Sense Motive checks" (Pathfinder Society Field
    // Guide, 1st level). Wisdom is already the skills' governing ability
    // (mod 0 here), so the Int mod (+2) is the whole delta.
    const sheet = compute(makeDoc("shieldmarshal", 1, { abilities: { int: 14 } }), ref);
    expect(sheet.skills.per!.total).toBe(2);
    expect(sheet.skills.sen!.total).toBe(2);
  });
});

describe("Masochism (Pain Taster, bare key, class bonus vs. pain effects)", () => {
  it("1st level: +4 vs. pain, on both Fortitude and Will", () => {
    // "She receives a +4 class bonus on saving throws made against pain
    // effects" (1st level). `pain` reads on both Fort and Will. Pain Taster
    // Fort is good prestige (floor((level+1)/2)), Will is poor prestige
    // (floor((level+1)/3)). Level 1: Fort = floor(2/2) = 1, Will = floor(2/3) = 0.
    const sheet = compute(makeDoc("painTaster", 1), ref);
    expect(sheet.saves.fort.total).toBe(1);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 5, categories: ["pain"], labels: ["pain"] },
    ]);
    expect(sheet.saves.will.total).toBe(0);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 4, categories: ["pain"], labels: ["pain"] },
    ]);
  });
});

describe("Soul Stone (Living Monolith, energy-drain half added to the existing bare patch)", () => {
  it("1st level: death and energy-drain merge into one Fortitude line", () => {
    // "The soul stone grants the living monolith a +2 bonus on saving
    // throws against death effects, mind-affecting effects, effects that
    // grant negative levels, and on saves to overcome negative levels"
    // (Faction Guide, 1st level). Both negative-level clauses are the
    // `energyDrain` Fortitude axis, same +2 as `death`, so they merge into
    // one line. Living Monolith Fort is good prestige (floor((level+1)/2)).
    // Level 1: Fort = floor(2/2) = 1.
    const sheet = compute(makeDoc("livingMonolith", 1), ref);
    expect(sheet.saves.fort.total).toBe(1);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 3, categories: ["death", "energyDrain"], labels: ["death", "energy drain"] },
    ]);
  });
});
