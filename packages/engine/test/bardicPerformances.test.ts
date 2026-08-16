/**
 * Hand-computed fixture tests for the bard Bardic Performance table (the
 * eleven Core Rulebook performance types beyond Inspire Courage, which is
 * already a vendored linked buff — see `bardic-performances.ts` doc comment).
 *
 * RAW numbers verified against aonprd.com's live Bard class page
 * (2026-08-15): Inspire Competence is gained at 3rd level (not 2nd, despite
 * how some survey lists quote it), Inspire Greatness (9th) grants +2
 * competence on attack rolls and +1 competence on Fortitude saves, Inspire
 * Heroics (15th) grants +4 morale on saving throws and +4 dodge to AC.
 * Countersong/Distraction/Fascinate/Suggestion/Dirge of Doom/Soothing
 * Performance/Frightening Tune/Mass Suggestion/Deadly Performance are all
 * either reactive Perform-check substitutions or purely enemy-facing effects
 * with no unambiguous self-facing numeric target, so they're context-note
 * only (see the file doc comment for the full per-entry reasoning).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";
import {
  BARD_PERFORMANCES,
  BARDIC_PERFORMANCE_DETAIL,
  bardicPerformanceToggleOptions,
} from "../src/bardic-performances.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  level: number;
  abilities?: CharacterDoc["abilities"];
  activeBuffs?: ActiveBuff[];
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
      classes: [{ tag: "bard", level: opts.level }],
    },
    abilities: opts.abilities ?? { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function performanceBuff(tag: string): ActiveBuff {
  const def = BARD_PERFORMANCES.find((p) => p.tag === tag);
  if (!def) throw new Error(`performance not found: ${tag}`);
  return {
    instanceId: `buff-${tag}`,
    effectTag: `bardicPerformance:${tag}`,
    name: def.name,
    changes: def.changes,
    contextNotes: def.contextNotes,
  };
}

describe("BARD_PERFORMANCES table", () => {
  it("has all twelve non-Inspire-Courage Core Rulebook performance types, each with a unique tag", () => {
    expect(BARD_PERFORMANCES).toHaveLength(12);
    const tags = BARD_PERFORMANCES.map((p) => p.tag);
    expect(new Set(tags).size).toBe(12);
    expect(tags).not.toContain("inspireCourage");
  });

  it("every toggle id is unique and prefixed bardicPerformance:", () => {
    const options = bardicPerformanceToggleOptions(20);
    const ids = options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("bardicPerformance:")).toBe(true);
    }
  });

  it("Inspire Competence is gained at 3rd level (verified against aonprd.com, not the commonly misquoted 2nd)", () => {
    const inspireCompetence = BARD_PERFORMANCES.find((p) => p.tag === "inspireCompetence")!;
    expect(inspireCompetence.minLevel).toBe(3);
  });

  it("note-tier entries (Countersong, Distraction, Fascinate, Inspire Competence, Suggestion, Dirge of Doom, Soothing Performance, Frightening Tune, Mass Suggestion, Deadly Performance) carry no numeric changes but do carry context notes", () => {
    const noteTierTags = [
      "countersong",
      "distraction",
      "fascinate",
      "inspireCompetence",
      "suggestion",
      "dirgeOfDoom",
      "soothingPerformance",
      "frighteningTune",
      "massSuggestion",
      "deadlyPerformance",
    ];
    for (const tag of noteTierTags) {
      const def = BARD_PERFORMANCES.find((p) => p.tag === tag)!;
      expect(def.changes).toEqual([]);
      expect(def.contextNotes?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("Inspire Greatness has exactly the attack and Fortitude changes, no Hit-Dice/temp-HP Change (dice don't evaluate numerically)", () => {
    const inspireGreatness = BARD_PERFORMANCES.find((p) => p.tag === "inspireGreatness")!;
    expect(inspireGreatness.changes).toEqual([
      { formula: "2", target: "attack", type: "competence" },
      { formula: "1", target: "fort", type: "competence" },
    ]);
    expect(inspireGreatness.contextNotes?.some((n) => /temp/i.test(n.text))).toBe(true);
  });

  it("Inspire Heroics has exactly the saves and AC changes", () => {
    const inspireHeroics = BARD_PERFORMANCES.find((p) => p.tag === "inspireHeroics")!;
    expect(inspireHeroics.changes).toEqual([
      { formula: "4", target: "allSavingThrows", type: "morale" },
      { formula: "4", target: "ac", type: "dodge" },
    ]);
  });
});

describe("bardicPerformanceToggleOptions: level filtering", () => {
  it("bard L8 excludes Inspire Greatness (gained at 9th)", () => {
    const options = bardicPerformanceToggleOptions(8);
    expect(options.map((o) => o.id)).not.toContain("bardicPerformance:inspireGreatness");
  });

  it("bard L9 includes Inspire Greatness", () => {
    const options = bardicPerformanceToggleOptions(9);
    expect(options.map((o) => o.id)).toContain("bardicPerformance:inspireGreatness");
  });

  it("bard L2 excludes Inspire Competence (gained at 3rd, not 2nd)", () => {
    const options = bardicPerformanceToggleOptions(2);
    expect(options.map((o) => o.id)).not.toContain("bardicPerformance:inspireCompetence");
  });

  it("bard L3 includes Inspire Competence", () => {
    const options = bardicPerformanceToggleOptions(3);
    expect(options.map((o) => o.id)).toContain("bardicPerformance:inspireCompetence");
  });

  it("bard L1 has exactly Countersong, Distraction, and Fascinate available", () => {
    const options = bardicPerformanceToggleOptions(1);
    const ids = options.map((o) => o.id).sort();
    expect(ids).toEqual(
      [
        "bardicPerformance:countersong",
        "bardicPerformance:distraction",
        "bardicPerformance:fascinate",
      ].sort(),
    );
  });

  it("bard L20 includes all twelve performance types", () => {
    const options = bardicPerformanceToggleOptions(20);
    expect(options).toHaveLength(12);
  });
});

describe("Bardic performance changes through compute()", () => {
  it("Inspire Heroics at bard L15: +4 morale on all saves, +4 dodge AC", () => {
    const noBuff = compute(makeDoc({ level: 15 }), ref);
    const withBuff = compute(
      makeDoc({ level: 15, activeBuffs: [performanceBuff("inspireHeroics")] }),
      ref,
    );
    expect(withBuff.saves.fort.total).toBe(noBuff.saves.fort.total + 4);
    expect(withBuff.saves.ref.total).toBe(noBuff.saves.ref.total + 4);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 4);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal + 4);
  });

  it("Inspire Greatness at bard L9: +2 competence attack, +1 competence Fortitude save", () => {
    const noBuff = compute(makeDoc({ level: 9 }), ref);
    const withBuff = compute(
      makeDoc({ level: 9, activeBuffs: [performanceBuff("inspireGreatness")] }),
      ref,
    );
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 2);
    expect(withBuff.attack.ranged.total).toBe(noBuff.attack.ranged.total + 2);
    expect(withBuff.saves.fort.total).toBe(noBuff.saves.fort.total + 1);
    expect(withBuff.saves.ref.total).toBe(noBuff.saves.ref.total);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total);
  });

  it("a note-tier performance (Countersong) applies no numeric change through compute()", () => {
    const noBuff = compute(makeDoc({ level: 1 }), ref);
    const withBuff = compute(
      makeDoc({ level: 1, activeBuffs: [performanceBuff("countersong")] }),
      ref,
    );
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total);
  });
});

describe("deriveResourcePools: Bardic Performance pool (bard)", () => {
  function performancePool(level: number) {
    const doc = makeDoc({ level });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.name === "Bardic Performance");
    expect(pool).toBeDefined();
    return pool!;
  }

  it("bard L9: pool carries the level-appropriate toggle options and the toggle detail line", () => {
    const pool = performancePool(9);
    expect(pool.detail).toBe(BARDIC_PERFORMANCE_DETAIL);
    const ids = (pool.tableOptions ?? []).map((o) => o.id);
    expect(ids).toContain("bardicPerformance:inspireGreatness");
    expect(ids).not.toContain("bardicPerformance:inspireHeroics");
  });

  it("bard L9: Inspire Courage still rides its vendored linked buff, not the hand table", () => {
    const pool = performancePool(9);
    const inspireCourageId = Object.entries(ref.buffs).find(
      ([, b]) => b.name === "Inspire Courage",
    )![0];
    expect(pool.linkedBuffIds).toContain(inspireCourageId);
    const ids = (pool.tableOptions ?? []).map((o) => o.id);
    expect(ids).not.toContain("bardicPerformance:inspireCourage");
  });
});
