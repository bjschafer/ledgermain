/**
 * Unit tests for `model/skillRankFeasibility.ts:skillRankShortfall` — the
 * level-by-level purchase-order check that `skillBudget` (lifetime total)
 * and `setSkillRank` (per-skill cap) don't cover.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { skillRankShortfall } from "../src/model/skillRankFeasibility.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  race?: string;
  skillRanks?: Record<string, number>;
  gmSkillRanks?: number;
  favoredClassBonus?: ("hp" | "skill" | "other")[];
}): CharacterDoc {
  return {
    schemaVersion: 2,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(over.race ?? "Elf"), // Elf has no racial bonusSkillRanks
      classes: over.classes,
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      gmGrants: over.gmSkillRanks != null ? { skillRanks: over.gmSkillRanks } : undefined,
      favoredClassBonus: over.favoredClassBonus,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("skillRankShortfall", () => {
  it("no classes -> feasible (nothing to check)", () => {
    const doc = makeDoc({ classes: [] });
    expect(skillRankShortfall(doc, ref, 0)).toBeNull();
  });

  it("flags a rank total no level order could fund (stale rank after a class level was lowered)", () => {
    // Wizard 1 / Rogue 1, Int +0: per-level budgets {2, 8}, L 2, total 10.
    // `setSkillRank` caps NEW purchases at the current total level, but
    // `setClassLevel`/`removeClass` don't retroactively trim `skillRanks`
    // when a class's level drops — so a skill can legitimately carry more
    // ranks than the character's current level, exactly what this fixture
    // hand-builds (as if levels were taken away after the ranks were bought).
    // Sorted ascending [2, 8]: threshold 1 needs all 10 ranks against a
    // total of 10 (exactly funded), but threshold 2 needs the ranks past
    // the first (10 - 1 = 9) against only the level-2 budget (8) — short by 1.
    const doc = makeDoc({
      classes: [
        { tag: "wizard", level: 1 },
        { tag: "rogue", level: 1 },
      ],
      skillRanks: { per: 10 },
    });
    expect(skillRankShortfall(doc, ref, 0)).toEqual({ level: 2, required: 9, available: 8 });
  });

  it("a legal dense multiclass build raises no flag", () => {
    // Fighter 3 / Rogue 2, Int +0: budgets 2/level * 3 + 8/level * 2 = 22,
    // total level 5. Five skills spread at or under the level-5 cap, spent
    // exactly at budget — a perfectly plausible purchase order exists
    // (e.g. buy the two 8-point rogue levels last and finish every skill
    // then), so no threshold is ever short.
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 3 },
        { tag: "rogue", level: 2 },
      ],
      skillRanks: { per: 5, ste: 5, acr: 5, umd: 5, dip: 2 },
    });
    expect(skillRankShortfall(doc, ref, 0)).toBeNull();
  });

  it("single-class boundary case: spent exactly at budget is still feasible", () => {
    // Wizard 3, Int +0: 2/level * 3 = 6 total, L 3. Two skills maxed to 3
    // ranks each spends exactly 6 — every level's budget is equal here, so
    // the tail check collapses to the same lifetime-total comparison
    // `skillBudget` already does, and it lands exactly on the boundary.
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 3 }],
      skillRanks: { per: 3, acr: 3 },
    });
    expect(skillRankShortfall(doc, ref, 0)).toBeNull();
  });

  it("an over-cap rank total can't be rescued by extra budget (threshold past the level fails)", () => {
    // Same stale-rank shape as the infeasible fixture above (Wizard 1 /
    // Rogue 1, one skill at 10 ranks) with a favored-class "skill" pick
    // added. The +1 is credited to the last level, so threshold 2 squeaks
    // by (9 <= 8 + 1), but ranks 3..10 of a 10-rank skill have no level in
    // a 2-level history that could host them: threshold 3 checks the 8 of
    // them against the zero capacity that exists past level 2.
    const doc = makeDoc({
      classes: [
        { tag: "wizard", level: 1 },
        { tag: "rogue", level: 1 },
      ],
      skillRanks: { per: 10 },
      favoredClassBonus: ["skill"],
    });
    expect(skillRankShortfall(doc, ref, 0)).toEqual({ level: 3, required: 8, available: 0 });
  });

  it("a stale over-cap rank fires even when the lifetime budget still covers the count", () => {
    // Wizard 1, Int +4: budget 6, one skill at 3 ranks (as if bought at
    // level 3 before the levels were removed). Spent 3 <= 6 and every
    // threshold up to the level passes, but rank 2 of a 1-level character
    // has nowhere to live: threshold 2 checks 2 ranks against 0 capacity.
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      skillRanks: { per: 3 },
    });
    expect(skillRankShortfall(doc, ref, 4)).toEqual({ level: 2, required: 2, available: 0 });
  });

  it("non-class budget counts: a build spending its full budget incl. the addend is feasible", () => {
    // Wizard 1 with 2 GM-granted bonus ranks: class budget 2, total 4.
    // Four skills at 1 rank each spends exactly 4 — within the level-1 cap,
    // so a legal order exists, but only because the addend is credited to a
    // level; ignoring it would falsely fail threshold 1 (4 > 2).
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      skillRanks: { per: 1, ste: 1, acr: 1, umd: 1 },
      gmSkillRanks: 2,
    });
    expect(skillRankShortfall(doc, ref, 0)).toBeNull();
  });
});
