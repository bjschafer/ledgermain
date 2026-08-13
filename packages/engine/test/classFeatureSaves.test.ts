/**
 * Hand-computed fixture tests for `CLASS_FEATURE_CHANGE_PATCHES`
 * (`class-feature-effects.ts`) — category-scoped save bonuses promoted from
 * vendored class-feature description text that ships no `Change` of its own.
 * Mirrors `saveCategories.test.ts`'s fixture style (a bare `CharacterDoc`
 * through `compute()`, hand-verified numbers cited against the published
 * rule), but exercises the class-feature collection path specifically:
 * `@class.unlevel` inside a patch formula is the GRANTING class's own level.
 *
 * Every fixture below uses a Human with all abilities at 10 (no ability-mod
 * or racial contribution to saves) so the headline total is pure class-tier
 * arithmetic from `saveForLevels` (`tables.ts`): `2 + floor(level / 2)` for a
 * good/`highPrestige` save reads as `floor((level + 1) / 2)` for the prestige
 * variant, and `floor(level / 3)` for a poor save reads as
 * `floor((level + 1) / 3)` prestige (`SaveTier`, `tables.ts`).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { CLASS_FEATURE_CHANGE_PATCHES } from "../src/class-feature-effects.js";
import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human, all abilities 10, one class at `level`, no gear/feats/traits. */
function makeDoc(tag: string, level: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "class-feature-save-test",
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
      gear: [],
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

describe("CLASS_FEATURE_CHANGE_PATCHES drift guard", () => {
  it("every key names a real class feature, and none double-ships allSavingThrows", () => {
    const byName = new Map<string, { id: string; hasAllSavingThrows: boolean }[]>();
    for (const f of Object.values(ref.classFeatures)) {
      const hasAllSavingThrows = (f.changes ?? []).some((c) => c.target === "allSavingThrows");
      const bucket = byName.get(f.name) ?? [];
      bucket.push({ id: f.id, hasAllSavingThrows });
      byName.set(f.name, bucket);
    }

    const problems: string[] = [];
    for (const key of Object.keys(CLASS_FEATURE_CHANGE_PATCHES)) {
      // A "<classTag>:<Feature Name>" key must name a real class AND a
      // feature that class actually grants — a typo'd tag would otherwise be
      // a silent no-op forever (the exact failure mode the bare-name check
      // below guards against, one level deeper).
      const colon = key.indexOf(":");
      const name = colon > 0 ? key.slice(colon + 1) : key;
      if (colon > 0) {
        const tag = key.slice(0, colon);
        const cls = Object.values(ref.classes).find((c) => c.tag === tag);
        if (!cls) {
          problems.push(`"${key}" names no RefData.classes tag`);
          continue;
        }
        if (!cls.features.some((g) => ref.classFeatures[g.featureId]?.name === name)) {
          problems.push(`"${key}": class "${tag}" grants no feature named "${name}"`);
          continue;
        }
      }
      const matches = byName.get(name);
      if (!matches || matches.length === 0) {
        problems.push(`"${key}" matches no RefData.classFeatures name`);
        continue;
      }
      for (const m of matches) {
        if (m.hasAllSavingThrows) {
          problems.push(`"${key}" (${m.id}) already ships its own allSavingThrows change`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("Bravery (fighter, Will vs. fear)", () => {
  // "Starting at 2nd level, a fighter gains a +1 bonus on Will saves against
  // fear. This bonus increases by +1 for every four levels beyond 2nd" (Core
  // Rulebook). Fighter Will is a poor save: floor(level / 3).

  it("grants nothing below 2nd level", () => {
    // Fighter 1: Will = floor(1/3) = 0. Below the grant level entirely, so no
    // conditional line at all, not a zero-value one.
    const sheet = compute(makeDoc("fighter", 1), ref);
    expect(sheet.saves.will.total).toBe(0);
    // `conditionals` is omitted entirely when nothing situational applies
    // (`compute.ts`'s resolveSave call), not an empty array.
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });

  it("+1 at 2nd level, headline Will untouched", () => {
    // Fighter 2: Will = floor(2/3) = 0. Bravery = 1 + floor((2-2)/4) = 1.
    const sheet = compute(makeDoc("fighter", 2), ref);
    expect(sheet.saves.will.total).toBe(0); // the category bonus never joins the headline
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 1, categories: ["fear"], labels: ["fear"] },
    ]);
  });

  it("+2 at 6th level", () => {
    // Fighter 6: Will = floor(6/3) = 2. Bravery = 1 + floor((6-2)/4) = 2.
    const sheet = compute(makeDoc("fighter", 6), ref);
    expect(sheet.saves.will.total).toBe(2);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 4, categories: ["fear"], labels: ["fear"] },
    ]);
  });

  it("+3 at 10th level, proving the +1-per-4-levels progression", () => {
    // Fighter 10: Will = floor(10/3) = 3. Bravery = 1 + floor((10-2)/4) = 3.
    const sheet = compute(makeDoc("fighter", 10), ref);
    expect(sheet.saves.will.total).toBe(3);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 6, categories: ["fear"], labels: ["fear"] },
    ]);
  });
});

describe("Still Mind (monk, Will vs. enchantment) - a non-fear category", () => {
  it("+2 untyped at 3rd level", () => {
    // "The monk gains a +2 bonus on saving throws against enchantment spells
    // and effects" (Core Rulebook, 3rd level). Monk Will is a good save:
    // 2 + floor(level/2). Monk 3: Will = 2 + 1 = 3. 3 + 2 = 5.
    const sheet = compute(makeDoc("monk", 3), ref);
    expect(sheet.saves.will.total).toBe(3);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 5, categories: ["enchantment"], labels: ["enchantment"] },
    ]);
  });
});

describe("Well-Versed (Bard/Skald, untyped Will vs. sonic and language-dependent effects)", () => {
  it("+4 at 2nd level (Bard, its own grant level)", () => {
    // "The character gains a +4 bonus on saving throws made against bardic
    // performance, sonic, and language-dependent effects" (2nd level; bardic
    // performance omitted, not in the vocabulary). Bard Will is a good save:
    // 2 + floor(level/2). Level 2: Will = 2 + 1 = 3. 3 + 4 = 7.
    const sheet = compute(makeDoc("bard", 2), ref);
    expect(sheet.saves.will.total).toBe(3);
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: 7,
        categories: ["languageDependent", "sonic"],
        labels: ["language-dependent", "sonic"],
      },
    ]);
  });

  it("+4 at 2nd level (Skald, same feature name, same formula)", () => {
    // Skald Will is also a good save: 2 + floor(level/2). Level 2: Will = 3.
    const sheet = compute(makeDoc("skald", 2), ref);
    expect(sheet.saves.will.total).toBe(3);
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: 7,
        categories: ["languageDependent", "sonic"],
        labels: ["language-dependent", "sonic"],
      },
    ]);
  });
});

describe("Heart of Freedom (Steel Falcon, three named categories merge to one line)", () => {
  it("+4 morale vs. charm, compulsion, and possession at 1st level", () => {
    // "gains a +4 morale bonus on saving throws against charm and compulsion
    // effects and attempts to possess her body or mind" (Faction Guide, 1st
    // level). Steel Falcon Will is a poor prestige save: floor((level+1)/3).
    // Level 1: Will = floor(2/3) = 0. 0 + 4 = 4 for all three categories, so
    // they collapse into one line (same shape as Dwarf Steel Soul's spell/SLA
    // merge in saveCategories.test.ts).
    const sheet = compute(makeDoc("steelFalcon", 1), ref);
    expect(sheet.saves.will.total).toBe(0);
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: 4,
        categories: ["charm", "compulsion", "possession"],
        labels: ["charm", "compulsion", "possession"],
      },
    ]);
  });
});

describe("Tranquility (Brightness Seeker, resistance vs. fear)", () => {
  it("+10 resistance at 2nd level", () => {
    // "gain a +10 resistance bonus on saves against fear effects" (Faiths of
    // Purity, 2nd level). Brightness Seeker Will is a good prestige save:
    // floor((level+1)/2). Level 2: Will = floor(3/2) = 1. 1 + 10 = 11.
    const sheet = compute(makeDoc("brightnessSeeker", 2), ref);
    expect(sheet.saves.will.total).toBe(1);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 11, categories: ["fear"], labels: ["fear"] },
    ]);
  });
});

describe("Sanguine Angel (profane Will bonuses stacking two class features)", () => {
  it("Eye of Mahathallah alone at 5th level: +4 profane vs. illusions", () => {
    // "gains a +4 profane bonus on Will saves against illusions" (Faiths of
    // Corruption, 5th level). Will is good prestige: floor((level+1)/2).
    // Level 5: Will = floor(6/2) = 3. 3 + 4 = 7. Hollowness of Doloras (9th
    // level) has not unlocked yet.
    const sheet = compute(makeDoc("sanguineAngel", 5), ref);
    expect(sheet.saves.will.total).toBe(3);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 7, categories: ["illusion"], labels: ["illusions"] },
    ]);
  });

  it("both features at 9th level merge illusion and emotion into one line", () => {
    // Level 9: Will = floor(10/2) = 5. Eye of Mahathallah: 5 + 4 = 9.
    // Hollowness of Doloras ("+4 profane... against emotion and pain
    // effects", pain omitted - not in the vocabulary): 5 + 4 = 9 too, so the
    // two independent features resolve to the SAME total and print as one
    // line naming both categories.
    const sheet = compute(makeDoc("sanguineAngel", 9), ref);
    expect(sheet.saves.will.total).toBe(5);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 9, categories: ["illusion", "emotion"], labels: ["illusions", "emotion"] },
    ]);
  });
});

describe("Witches' Woe (Heritor Knight, curse applies on all three saves)", () => {
  it("half class level vs. curses at 4th level, on Fort, Ref, and Will alike", () => {
    // "gains a bonus equal to half her class level on saves against hexes
    // and curse effects" (Champions of Corruption, 2nd level; hexes omitted,
    // not in the vocabulary). Heritor Knight: Fort/Will good prestige
    // (floor((level+1)/2)), Ref poor prestige (floor((level+1)/3)). Level 4:
    // Fort = Will = floor(5/2) = 2, Ref = floor(5/3) = 1. Bonus =
    // floor(4/2) = 2. Fort/Will conditional = 2+2 = 4, Ref conditional = 1+2 = 3.
    const sheet = compute(makeDoc("heritorKnight", 4), ref);
    expect(sheet.saves.fort.total).toBe(2);
    expect(sheet.saves.ref.total).toBe(1);
    expect(sheet.saves.will.total).toBe(2);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 4, categories: ["curse"], labels: ["curses"] },
    ]);
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: 3, categories: ["curse"], labels: ["curses"] },
    ]);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 4, categories: ["curse"], labels: ["curses"] },
    ]);
  });
});

describe("Unchained Heart (Chernasardo Warden, tiered Will vs. mind-affecting)", () => {
  // "gains a +2 bonus on Will saving throws made against compulsions and
  // mind-affecting effects... increases to +3 at 4th level and +4 at 7th
  // level" (Wardens of the Reborn Forge, 1st level). Will is good prestige:
  // floor((level+1)/2).

  it("+2 at 1st level", () => {
    const sheet = compute(makeDoc("chernasardoWarden", 1), ref);
    expect(sheet.saves.will.total).toBe(1); // floor(2/2)
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 3, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });

  it("+3 at 4th level", () => {
    const sheet = compute(makeDoc("chernasardoWarden", 4), ref);
    expect(sheet.saves.will.total).toBe(2); // floor(5/2)
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 5, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });

  it("+4 at 7th level", () => {
    const sheet = compute(makeDoc("chernasardoWarden", 7), ref);
    expect(sheet.saves.will.total).toBe(4); // floor(8/2)
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 8, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });
});

describe("Save Bonus Against Poison (assassin, Fortitude)", () => {
  it("+2 at 4th level", () => {
    // "+1 bonus... increases by +1 every two levels thereafter (4th, 6th,
    // 8th, 10th), to a maximum of +5 at 10th level" (Core Rulebook, 2nd
    // level). Assassin Fort is a poor prestige save: floor((level+1)/3).
    // Level 4: Fort = floor(5/3) = 1. Bonus = min(5, 1 + floor((4-2)/2)) = 2.
    const sheet = compute(makeDoc("assassin", 4), ref);
    expect(sheet.saves.fort.total).toBe(1);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 3, categories: ["poison"], labels: ["poison"] },
    ]);
  });
});

describe("Incorruptible (Mystery Cultist, Fortitude only - headline provably unchanged)", () => {
  it("+2 vs. disease and poison at 7th level, Will untouched", () => {
    // "gains a +2 bonus on saving throws versus disease and poison" (Cults
    // of Golarion, 7th level). Mystery Cultist Fort is poor prestige
    // (floor((level+1)/3)), Will is good prestige (floor((level+1)/2)).
    // Level 7: Fort = floor(8/3) = 2, Will = floor(8/2) = 4. Both disease and
    // poison resolve to 2+2=4, one merged line.
    const sheet = compute(makeDoc("mysteryCultist", 7), ref);
    expect(sheet.saves.fort.total).toBe(2); // headline never moves
    // `poison` is declared before `disease` in SAVE_CATEGORY_ORDER, so it
    // sorts first even though the description names disease first.
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 4, categories: ["poison", "disease"], labels: ["poison", "disease"] },
    ]);
    // Will is untouched by a Fortitude-only patch: no line at all, and the
    // headline is exactly the class-tier number with nothing bled in.
    expect(sheet.saves.will.total).toBe(4);
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });
});

describe("Liberated Mind (Rose Warden, grant level already satisfies its own tier clause)", () => {
  it("+4 vs. charm, compulsion, and fear at 5th level", () => {
    // "gains a +2 bonus... to resist charm, compulsion, and fear effects.
    // This bonus increases to +4 at 5th level" (Faction Guide). The vendored
    // grant level is 5th itself, so the feature is never seen at its +2 tier
    // in practice. Rose Warden Will is a poor prestige save:
    // floor((level+1)/3). Level 5: Will = floor(6/3) = 2. 2 + 4 = 6.
    const sheet = compute(makeDoc("roseWarden", 5), ref);
    expect(sheet.saves.will.total).toBe(2);
    // `fear` sorts before `charm`/`compulsion` in SAVE_CATEGORY_ORDER.
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: 6,
        categories: ["fear", "charm", "compulsion"],
        labels: ["fear", "charm", "compulsion"],
      },
    ]);
  });
});
