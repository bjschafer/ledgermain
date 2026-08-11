/**
 * Hand-computed fixture tests for the 26 `CLASS_FEATURE_CHANGE_PATCHES`
 * entries not covered by `classFeatureSaves.test.ts`: the non-save-category
 * patches (AC, initiative, CMB, DR, energy resistance, senses, speeds,
 * skills), plus the three category-scoped SAVE patches that file omits
 * (Apocalyptic Vow, Soul Stone, Efficient Sleep). Mirrors its fixture style
 * exactly — a bare `CharacterDoc` through `compute()`, hand-verified numbers
 * cited against the published rule.
 *
 * Every fixture uses a Human with all abilities at 10 (no ability-mod or
 * racial contribution to anything) unless noted otherwise, so a granted
 * bonus reads as the whole of a stat's non-base contribution.
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

/** Human, all abilities 10, one class at `level`, no gear/feats/traits. */
function makeDoc(tag: string, level: number, gear: ItemInstance[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "class-feature-patch-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag, level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear,
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

describe("Apocalyptic Vow (Souldrinker, Fortitude vs. death)", () => {
  it("+3 untyped at 1st level", () => {
    // "This vow also grants the souldrinker a +3 bonus on saving throws
    // against death effects and negative energy" (Book of the Damned, 1st
    // level; negative energy is not a SAVE_CATEGORIES entry). Souldrinker
    // Fort is a poor prestige save: floor((level+1)/3). Level 1:
    // Fort = floor(2/3) = 0. 0 + 3 = 3.
    const sheet = compute(makeDoc("souldrinker", 1), ref);
    expect(sheet.saves.fort.total).toBe(0); // headline never moves
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 3, categories: ["death"], labels: ["death"] },
    ]);
  });
});

describe("Soul Stone (Living Monolith, death on Fortitude + mind-affecting on Will)", () => {
  it("+2 at 1st level, on two different saves", () => {
    // "The soul stone grants the living monolith a +2 bonus on saving
    // throws against death effects, mind-affecting effects, effects that
    // grant negative levels, and on saves to overcome negative levels"
    // (Faction Guide, 1st level; negative levels are not a SAVE_CATEGORIES
    // entry). Living Monolith Fort is good prestige (floor((level+1)/2)),
    // Will is poor prestige (floor((level+1)/3)). Level 1:
    // Fort = floor(2/2) = 1, Will = floor(2/3) = 0.
    const sheet = compute(makeDoc("livingMonolith", 1), ref);
    expect(sheet.saves.fort.total).toBe(1);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 3, categories: ["death"], labels: ["death"] },
    ]);
    expect(sheet.saves.will.total).toBe(0);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 2, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });
});

describe("Efficient Sleep (Spherewalker, sacred bonus vs. sleep)", () => {
  it("+4 sacred at 2nd level", () => {
    // "a spherewalker gains a +4 sacred bonus to resist sleep effects"
    // (Pathfinder #2, 2nd level). `sleep` is a child of `mind`, so this
    // resolves on Will. Spherewalker Will is a poor prestige save:
    // floor((level+1)/3). Level 2: Will = floor(3/3) = 1. 1 + 4 = 5.
    const sheet = compute(makeDoc("spherewalker", 2), ref);
    expect(sheet.saves.will.total).toBe(1);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 5, categories: ["sleep"], labels: ["sleep"] },
    ]);
  });
});

describe("Soultended (Proctor, unscoped Will)", () => {
  it("+2 untyped at 1st level, folded into the headline", () => {
    // "The comforting inevitability of this fate grants the proctor a +2
    // bonus on Will saves" (1st level) — unscoped, so it targets "will"
    // directly rather than a save category, and joins the headline total
    // instead of a conditional line. Proctor Will is a poor prestige save:
    // floor((level+1)/3). Level 1: Will = floor(2/3) = 0. 0 + 2 = 2.
    const sheet = compute(makeDoc("proctor", 1), ref);
    expect(sheet.saves.will.total).toBe(2);
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });
});

describe("Exceptionally Lucky (Halfling Opportunist, racial bonus on all saves)", () => {
  // "Her halfling racial bonus on saving throws increases to +2. This
  // bonus increases to +3 at 4th level" (Adventurer's Guide). Unlike the
  // save-category patches above, this targets "allSavingThrows" directly
  // (unconditional, folds into every headline save). Typed "racial" to
  // match the vendored Halfling race's own +1 all-saves change
  // (Hf31mrYb3uucNyLO), so highest-within-type stacking replaces the +1
  // with +2/+3 rather than summing to +3/+4.
  it("+2 racial at 2nd level (Human isolates the formula)", () => {
    // Halfling Opportunist Fort is poor prestige (floor((level+1)/3)), Ref
    // and Will are good prestige (floor((level+1)/2)). Level 2:
    // Fort = floor(3/3) = 1, Ref = Will = floor(3/2) = 1. +2 racial to each.
    const sheet = compute(makeDoc("halflingOpportunist", 2), ref);
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(3);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("+3 racial at 4th level", () => {
    // Level 4: Fort = floor(5/3) = 1, Ref = Will = floor(5/2) = 2. +3 racial.
    const sheet = compute(makeDoc("halflingOpportunist", 4), ref);
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(5);
  });

  it("supersedes a real Halfling's racial +1 instead of stacking with it", () => {
    // Halfling ability modifiers: +2 Dex, +2 Cha, -2 Str; from all-10 base
    // abilities only Ref gains a +1 Dex mod. Level 2 tiers as above (1/1/1).
    // Halfling Luck's racial +1 and this patch's racial +2 share a type, so
    // the higher one alone applies: Fort = 1 + 2 = 3 (not 4),
    // Ref = 1 + 1 + 2 = 4, Will = 1 + 2 = 3.
    const doc = makeDoc("halflingOpportunist", 2);
    doc.identity.race = raceId("Halfling");
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(4);
    expect(sheet.saves.will.total).toBe(3);
  });
});

describe("Janni's Blessing (Asavir, luck bonus on all saves)", () => {
  it("+1 luck at 10th level (the feature's own grant level)", () => {
    // "Both the asavir and her mount gain a +1 luck bonus on all saving
    // throws" (10th level, the class's own top grant). Asavir Fort/Will are
    // good prestige (floor((level+1)/2)), Ref is poor prestige
    // (floor((level+1)/3)). Level 10: Fort = Will = floor(11/2) = 5,
    // Ref = floor(11/3) = 3. +1 luck to each.
    const sheet = compute(makeDoc("asavir", 10), ref);
    expect(sheet.saves.fort.total).toBe(6);
    expect(sheet.saves.ref.total).toBe(4);
    expect(sheet.saves.will.total).toBe(6);
  });
});

describe("Grace (Duelist, competence Reflex bonus gated on light/no armor and no shield)", () => {
  it("+2 competence at 4th level with no armor", () => {
    // "a duelist gains a +2 competence bonus on Reflex saves while wearing
    // light or no armor and not using a shield" (Core Rulebook, 4th level).
    // Duelist Ref is good prestige: floor((level+1)/2). Level 4:
    // Ref = floor(5/2) = 2. 2 + 2 = 4.
    const sheet = compute(makeDoc("duelist", 4), ref);
    expect(sheet.saves.ref.total).toBe(4);
  });

  it("+0 at 4th level while wearing medium armor", () => {
    // Same character, medium armor equipped (@armor.type = 2): the gate's
    // `lt(@armor.type, 2)` fails, so the formula evaluates to 0.
    const doc = makeDoc("duelist", 4, [
      { equipped: true, armor: { slot: "armor", ac: 4, type: 2 } },
    ]);
    const sheet = compute(doc, ref);
    expect(sheet.saves.ref.total).toBe(2); // base only, no competence bonus
  });
});

describe("Improved Reaction (Duelist, untyped initiative bonus)", () => {
  it("+2 at 2nd level (its own grant level)", () => {
    // "a duelist gains a +2 bonus on initiative checks, increasing to +4 at
    // 8th level" (Core Rulebook, 2nd level). Dex mod 0, so initiative reads
    // as the bonus alone.
    const sheet = compute(makeDoc("duelist", 2), ref);
    expect(sheet.initiative.total).toBe(2);
  });

  it("+4 at 8th level", () => {
    const sheet = compute(makeDoc("duelist", 8), ref);
    expect(sheet.initiative.total).toBe(4);
  });
});

describe("Protective Grace (Evangelist, dodge bonus to AC)", () => {
  it("+1 dodge at 2nd level", () => {
    // "the evangelist gains a +1 dodge bonus to AC. This bonus increases to
    // +2 at 7th level" (Inner Sea Gods). AC = 10 base + 0 Dex + dodge.
    const sheet = compute(makeDoc("evangelist", 2), ref);
    expect(sheet.ac.normal).toBe(11);
  });

  it("+2 dodge at 7th level", () => {
    const sheet = compute(makeDoc("evangelist", 7), ref);
    expect(sheet.ac.normal).toBe(12);
  });
});

describe("Natural Armor (Dragon Disciple, cumulative natural armor)", () => {
  it("+1 at 1st level", () => {
    // "a cumulative +1 natural armor bonus to AC at 1st, 4th, and 7th level
    // (+3 total by 7th level)" (Core Rulebook).
    const sheet = compute(makeDoc("dragonDisciple", 1), ref);
    expect(sheet.ac.normal).toBe(11);
  });

  it("+2 at 4th level", () => {
    const sheet = compute(makeDoc("dragonDisciple", 4), ref);
    expect(sheet.ac.normal).toBe(12);
  });

  it("+3 at 7th level, still +3 at 10th (capped)", () => {
    expect(compute(makeDoc("dragonDisciple", 7), ref).ac.normal).toBe(13);
    expect(compute(makeDoc("dragonDisciple", 10), ref).ac.normal).toBe(13);
  });
});

describe("Corpulence (Bloatmage, tiered natural armor)", () => {
  it("grants nothing below 3rd level", () => {
    // "at 3rd level... grant her a +1 natural armor bonus" (Seekers of
    // Secrets). Below the grant level the feature isn't attached at all.
    const sheet = compute(makeDoc("bloatmage", 2), ref);
    expect(sheet.ac.normal).toBe(10);
  });

  it("+1 at 3rd level", () => {
    const sheet = compute(makeDoc("bloatmage", 3), ref);
    expect(sheet.ac.normal).toBe(11);
  });

  it("+2 at 7th level", () => {
    // "At 7th level, this bonus increases to +2" (the -10 ft. speed half is
    // deliberately left unwired — see the source's own doc comment).
    const sheet = compute(makeDoc("bloatmage", 7), ref);
    expect(sheet.ac.normal).toBe(12);
  });
});

describe("Fortified Flesh (Living Monolith, tiered DR/-)", () => {
  it("DR 1/- at 3rd level", () => {
    // "a living monolith gains DR 1/-... At 5th level and again at 8th
    // level, this DR increases by 1" (Faction Guide).
    const sheet = compute(makeDoc("livingMonolith", 3), ref);
    const dr = sheet.defenses?.dr.find((d) => d.qualifier === "—");
    expect(dr?.total).toBe(1);
  });

  it("DR 2/- at 5th level", () => {
    const sheet = compute(makeDoc("livingMonolith", 5), ref);
    const dr = sheet.defenses?.dr.find((d) => d.qualifier === "—");
    expect(dr?.total).toBe(2);
  });

  it("DR 3/- at 8th level", () => {
    const sheet = compute(makeDoc("livingMonolith", 8), ref);
    const dr = sheet.defenses?.dr.find((d) => d.qualifier === "—");
    expect(dr?.total).toBe(3);
  });
});

describe("Dirty Fighting (Low Templar, unscoped CMB bonus)", () => {
  it("+2 at 1st level", () => {
    // "gains a +2 bonus on all combat maneuver checks" (Pathfinder Campaign
    // Setting, 1st level). Low Templar BAB is high tier: level 1 -> BAB 1.
    // Str mod 0, medium size (no special size mod). CMB = 1 + 0 + 0 + 2 = 3.
    const sheet = compute(makeDoc("lowTemplar", 1), ref);
    expect(sheet.cmb).toBe(3);
  });
});

describe("Angel of Eiseth (Sanguine Angel, 10th-level capstone grant bundle)", () => {
  it("fire resistance 30, see in darkness, telepathy 50 ft, fly speed 50 ft", () => {
    // "She gains fire resistance 30, telepathy with a range of 50 feet, and
    // the see in darkness universal monster ability... granting her a fly
    // speed of 50 feet with good maneuverability" (Faiths of Corruption,
    // 10th level).
    const sheet = compute(makeDoc("sanguineAngel", 10), ref);
    const fireRes = sheet.defenses?.resistances.find((r) => r.qualifier === "fire");
    expect(fireRes?.total).toBe(30);
    const seeDark = sheet.senses.find((s) => s.kind === "seeInDarkness");
    expect(seeDark).toBeDefined();
    expect(seeDark?.range).toBeUndefined();
    const telepathy = sheet.senses.find((s) => s.kind === "telepathy");
    expect(telepathy?.range).toBe(50);
    expect(sheet.speeds.fly).toBe(50);
  });
});

describe("Vanth Wings (Mortal Usher, 9th-level fly/cold-resistance/Acrobatics bundle)", () => {
  it("60 ft fly speed, cold resistance 10+level, +5 circumstance Acrobatics", () => {
    // "a mortal usher gains a 60-foot fly speed with good maneuverability
    // and resistance to cold equal to 10 + his class level... a +5
    // circumstance bonus on Acrobatics checks" (9th level).
    const sheet = compute(makeDoc("mortalUsher", 9), ref);
    expect(sheet.speeds.fly).toBe(60);
    const coldRes = sheet.defenses?.resistances.find((r) => r.qualifier === "cold");
    expect(coldRes?.total).toBe(19); // 10 + 9
    expect(sheet.skills.acr!.total).toBe(5);
  });
});

describe("Oceanic Spirit (Storm Kindler, tiered Fly/Swim + electricity/sonic resistance)", () => {
  it("5th level (grant level): class-level skill bonus, resistance tier 1", () => {
    // "A Storm Kindler gains a bonus equal to her class level on Fly and
    // Swim checks... She gains resistance to electricity 5 and sonic 5. At
    // 5th level, her resistance to electricity and sonic increases to 10"
    // (Faiths of Purity). The vendored grant level is 5th, so only the
    // already-bumped 10 tier is ever observable.
    const sheet = compute(makeDoc("stormKindler", 5), ref);
    expect(sheet.skills.fly!.total).toBe(5);
    expect(sheet.skills.swm!.total).toBe(5);
    const eres = sheet.defenses?.resistances ?? [];
    expect(eres.find((r) => r.qualifier === "electricity")?.total).toBe(10);
    expect(eres.find((r) => r.qualifier === "sonic")?.total).toBe(10);
  });

  it("9th level: resistance tier 2", () => {
    // "At 9th level, these resistances increase to 20."
    const sheet = compute(makeDoc("stormKindler", 9), ref);
    expect(sheet.skills.fly!.total).toBe(9);
    expect(sheet.skills.swm!.total).toBe(9);
    const eres = sheet.defenses?.resistances ?? [];
    expect(eres.find((r) => r.qualifier === "electricity")?.total).toBe(20);
    expect(eres.find((r) => r.qualifier === "sonic")?.total).toBe(20);
  });
});

describe("Stern Gaze (Gray Gardener, morale Intimidate/Sense Motive; Inquisitor's own copy unaffected)", () => {
  it("+2 morale at 4th level (Gray Gardener)", () => {
    // "a Gray Gardener receives a morale bonus equal to 1/2 his class level
    // on Intimidate and Sense Motive checks" (Blood of the Beast, 2nd
    // level). Level 4: floor(4/2) = 2.
    const sheet = compute(makeDoc("grayGardener", 4), ref);
    expect(sheet.skills.int!.total).toBe(2);
    expect(sheet.skills.sen!.total).toBe(2);
  });

  it("Inquisitor's own vendored Stern Gaze is unchanged by the name-keyed patch", () => {
    // The Inquisitor's own class-feature entry already carries this exact
    // Change (max(1, floor(@class.unlevel / 2)) morale on skill.int/skill.sen).
    // The patch table applies to every class granting a feature named "Stern
    // Gaze", so an Inquisitor ends up with two identical morale Changes —
    // same type, same value at every level, so highest-within-type stacking
    // keeps the total exactly what the vendored data alone already produced.
    const sheet = compute(makeDoc("inquisitor", 4), ref);
    expect(sheet.skills.int!.total).toBe(2); // max(1, floor(4/2))
    expect(sheet.skills.sen!.total).toBe(2);
  });
});

describe("Seductive Intuition (Enchanting Courtesan, competence bonus on four skills)", () => {
  it("+2 competence at 4th level", () => {
    // "an enchanting courtesan gains a competence bonus equal to half his
    // class level on Bluff, Diplomacy, Sense Motive, and Sleight of Hand
    // checks" (Inner Sea Intrigue, 2nd level). Level 4: floor(4/2) = 2.
    const sheet = compute(makeDoc("enchantingCourtesan", 4), ref);
    expect(sheet.skills.blf!.total).toBe(2);
    expect(sheet.skills.dip!.total).toBe(2);
    expect(sheet.skills.sen!.total).toBe(2);
    expect(sheet.skills.slt!.total).toBe(2);
  });

  it("+3 competence at 6th level", () => {
    const sheet = compute(makeDoc("enchantingCourtesan", 6), ref);
    expect(sheet.skills.blf!.total).toBe(3);
    expect(sheet.skills.dip!.total).toBe(3);
    expect(sheet.skills.sen!.total).toBe(3);
    expect(sheet.skills.slt!.total).toBe(3);
  });
});

describe("Aristocratic Erudition (Noble Scion, untyped bonus on three skills)", () => {
  it("+1 at 3rd level (its own grant level)", () => {
    // "a noble scion gains a bonus equal to 1/2 his class level on
    // Diplomacy, Knowledge (local), and Knowledge (nobility) checks" (Paths
    // of Prestige, 3rd level). Level 3: floor(3/2) = 1.
    const sheet = compute(makeDoc("nobleScion", 3), ref);
    expect(sheet.skills.dip!.total).toBe(1);
    expect(sheet.skills.klo!.total).toBe(1);
    expect(sheet.skills.kno!.total).toBe(1);
  });

  it("+5 at 10th level", () => {
    const sheet = compute(makeDoc("nobleScion", 10), ref);
    expect(sheet.skills.dip!.total).toBe(5);
    expect(sheet.skills.klo!.total).toBe(5);
    expect(sheet.skills.kno!.total).toBe(5);
  });
});

describe("Umbral Courtier (Umbral Court Agent, competence bonus equal to class level)", () => {
  it("+5 competence at 5th level", () => {
    // "An Umbral Court agent gains a competence bonus on Bluff, Diplomacy,
    // and Knowledge (nobility) checks equal to his class level" (Paths of
    // Prestige, 1st level).
    const sheet = compute(makeDoc("umbralCourtAgent", 5), ref);
    expect(sheet.skills.blf!.total).toBe(5);
    expect(sheet.skills.dip!.total).toBe(5);
    expect(sheet.skills.kno!.total).toBe(5);
  });
});

describe("Flag of Convenience (Low Templar, untyped bonus on Bluff and Disguise)", () => {
  it("+2 at 1st level", () => {
    // "The low templar gains a +2 bonus on all Bluff and Disguise checks"
    // (Pathfinder Campaign Setting, 1st level).
    const sheet = compute(makeDoc("lowTemplar", 1), ref);
    expect(sheet.skills.blf!.total).toBe(2);
    expect(sheet.skills.dis!.total).toBe(2);
  });
});

describe("Silent Soul (Lion Blade, circumstance bonus on Stealth)", () => {
  it("+10 at 10th level, alongside Grandmaster of Disguise", () => {
    // "The Lion Blade gains a +10 circumstance bonus on Stealth checks"
    // (Inner Sea Intrigue, 10th level). Grandmaster of Disguise (9th level,
    // still active) keeps contributing its own +2 to Disguise.
    const sheet = compute(makeDoc("lionBlade", 10), ref);
    expect(sheet.skills.ste!.total).toBe(10);
    expect(sheet.skills.dis!.total).toBe(2);
  });
});

describe("Grandmaster of Disguise (Lion Blade, circumstance bonus on Disguise)", () => {
  it("+2 at 9th level, Silent Soul not yet granted", () => {
    // "She gains a +2 circumstance bonus on Disguise checks" (9th level).
    // Silent Soul is a 10th-level grant, so it contributes nothing yet.
    const sheet = compute(makeDoc("lionBlade", 9), ref);
    expect(sheet.skills.dis!.total).toBe(2);
    expect(sheet.skills.ste!.total).toBe(0);
  });
});

describe("Aspect of Divinity (Exalted, untyped Disguise penalty)", () => {
  it("-4 at 7th level", () => {
    // The exalted's physical trait "impose[s] a -4 penalty on Disguise
    // checks" (Inner Sea Gods, 7th level).
    const sheet = compute(makeDoc("exalted", 7), ref);
    expect(sheet.skills.dis!.total).toBe(-4);
  });
});

describe("Appraising Eye (Balanced Scale of Abadar, sacred Appraise bonus)", () => {
  it("+2 sacred at 1st level", () => {
    // "She gains a +2 sacred bonus to all Appraise checks."
    const sheet = compute(makeDoc("balancedScaleOfAbadar", 1), ref);
    expect(sheet.skills.apr!.total).toBe(2);
  });
});

describe("Talmandor's Blessing (Steel Falcon, untyped Perception bonus)", () => {
  it("+4 at 5th level (its own grant level)", () => {
    // "a +4 bonus on Perception checks" (Faction Guide, 5th level).
    const sheet = compute(makeDoc("steelFalcon", 5), ref);
    expect(sheet.skills.per!.total).toBe(4);
  });
});
