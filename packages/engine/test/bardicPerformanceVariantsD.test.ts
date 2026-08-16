/**
 * Hand-computed fixture tests for shard D of the bard performance-variant
 * table (`src/bardic-performance-variants/shardD.ts`): ringleader, sandman,
 * savage-skald, sea-singer, shadow-puppeteer, silver-balladeer, solacer,
 * songhealer, sorrowsoul. Ringleader and sorrowsoul carry no shard entry (see
 * shardD.ts's doc comment for why), so they're covered here only by an
 * "unchanged" assertion.
 *
 * Follows `bardicPerformances.test.ts`'s pattern: real refdata via
 * `loadRefData()`, `bardicPerformanceToggleOptions` for id-list assertions,
 * and `compute()` fixtures for the one entry with a real numeric `Change`
 * (Savage Skald's Inspiring Blow: "gains temporary hit points equal to his
 * Charisma modifier (if positive)", vendored archetype-feature text
 * confirmed verbatim against aonprd.com).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  bardicPerformanceToggleOptions,
  bardVariantRemovesInspireCourage,
} from "../src/bardic-performances.js";

const ref = loadRefData();

function makeDoc(opts: {
  level: number;
  archetypes?: string[];
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
      archetypes: opts.archetypes,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

describe("shard D: ringleader (no entry)", () => {
  it("ringleader doesn't change the base bard toggle list (Inspire Competence is enhanced in place, not replaced)", () => {
    const base = bardicPerformanceToggleOptions(20);
    const withRingleader = bardicPerformanceToggleOptions(20, ["bard:ringleader"]);
    expect(withRingleader.map((o) => o.id)).toEqual(base.map((o) => o.id));
    expect(bardVariantRemovesInspireCourage(["bard:ringleader"])).toBe(false);
  });
});

describe("shard D: sorrowsoul (no entry)", () => {
  it("sorrowsoul doesn't change the base bard toggle list (Lyric Sorrow scales an existing slot's numbers, it doesn't replace one)", () => {
    const base = bardicPerformanceToggleOptions(20);
    const withSorrowsoul = bardicPerformanceToggleOptions(20, ["bard:sorrowsoul"]);
    expect(withSorrowsoul.map((o) => o.id)).toEqual(base.map((o) => o.id));
    expect(bardVariantRemovesInspireCourage(["bard:sorrowsoul"])).toBe(false);
  });
});

describe("shard D: sandman", () => {
  const ARCH = ["bard:sandman"];

  it("removes Inspire Competence, Suggestion, Inspire Greatness, Inspire Heroics, Mass Suggestion, Deadly Performance, and Inspire Courage", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    for (const tag of [
      "inspireCompetence",
      "suggestion",
      "inspireGreatness",
      "inspireHeroics",
      "massSuggestion",
      "deadlyPerformance",
    ]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
    expect(bardVariantRemovesInspireCourage(ARCH)).toBe(true);
  });

  it("keeps Countersong, Distraction, Fascinate, Dirge of Doom, Soothing Performance, Frightening Tune (untouched base tags)", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    for (const tag of [
      "countersong",
      "distraction",
      "fascinate",
      "dirgeOfDoom",
      "soothingPerformance",
      "frighteningTune",
    ]) {
      expect(ids).toContain(`bardicPerformance:${tag}`);
    }
  });

  it("gains Stealspell at 1st, Slumber Song at 6th, Dramatic Subtext at 9th, Greater Stealspell at 15th, Mass Slumber Song and Spell Catching at their levels, none early", () => {
    const schedule: [string, number][] = [
      ["stealspell", 1],
      ["slumberSong", 6],
      ["dramaticSubtext", 9],
      ["greaterStealspell", 15],
      ["massSlumberSong", 18],
      ["spellCatching", 20],
    ];
    for (const [tag, level] of schedule) {
      const id = `bardicPerformance:sandman:${tag}`;
      expect(bardicPerformanceToggleOptions(level, ARCH).map((o) => o.id)).toContain(id);
      expect(bardicPerformanceToggleOptions(level - 1, ARCH).map((o) => o.id)).not.toContain(id);
    }
  });
});

describe("shard D: savage-skald", () => {
  const ARCH = ["bard:savage-skald"];

  it("removes Fascinate, Suggestion, Soothing Performance, Mass Suggestion", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    for (const tag of ["fascinate", "suggestion", "soothingPerformance", "massSuggestion"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
    expect(bardVariantRemovesInspireCourage(ARCH)).toBe(false);
  });

  it("gains Inspiring Blow at 1st, Incite Rage at 6th, Song of the Fallen at 10th, Berserkergang at 12th, Battle Song at 18th", () => {
    const schedule: [string, number][] = [
      ["inspiringBlow", 1],
      ["inciteRage", 6],
      ["songOfTheFallen", 10],
      ["berserkergang", 12],
      ["battleSong", 18],
    ];
    for (const [tag, level] of schedule) {
      const id = `bardicPerformance:savage-skald:${tag}`;
      expect(bardicPerformanceToggleOptions(level, ARCH).map((o) => o.id)).toContain(id);
      expect(bardicPerformanceToggleOptions(level - 1, ARCH).map((o) => o.id)).not.toContain(id);
    }
  });

  it("Inspiring Blow: temp HP equal to Cha modifier (if positive) through compute() (ACG p. 12)", () => {
    const buff: ActiveBuff = {
      instanceId: "buff-inspiring-blow",
      effectTag: "bardicPerformance:savage-skald:inspiringBlow",
      name: "Inspiring Blow",
      changes: [{ formula: "max(0, @abilities.cha.mod)", target: "tempHp", type: "untyped" }],
      contextNotes: [],
    };
    // Cha 18 -> +4 modifier -> 4 temporary hit points.
    const highCha = compute(
      makeDoc({
        level: 1,
        archetypes: ARCH,
        abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
        activeBuffs: [buff],
      }),
      ref,
    );
    expect(highCha.hp.grantedTemp.total).toBe(4);

    // Cha 8 -> -1 modifier -> clamped to 0, not negative, per "if positive".
    const lowCha = compute(
      makeDoc({
        level: 1,
        archetypes: ARCH,
        abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 8 },
        activeBuffs: [buff],
      }),
      ref,
    );
    expect(lowCha.hp.grantedTemp.total).toBe(0);
  });
});

describe("shard D: sea-singer", () => {
  const ARCH = ["bard:sea-singer"];

  it("removes Countersong, Inspire Competence, Suggestion, Mass Suggestion", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    for (const tag of ["countersong", "inspireCompetence", "suggestion", "massSuggestion"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("gains Sea Shanty at 1st, Still Water at 3rd, Whistle the Wind at 6th, Call the Storm at 18th", () => {
    const schedule: [string, number][] = [
      ["seaShanty", 1],
      ["stillWater", 3],
      ["whistleTheWind", 6],
      ["callTheStorm", 18],
    ];
    for (const [tag, level] of schedule) {
      const id = `bardicPerformance:sea-singer:${tag}`;
      expect(bardicPerformanceToggleOptions(level, ARCH).map((o) => o.id)).toContain(id);
      expect(bardicPerformanceToggleOptions(level - 1, ARCH).map((o) => o.id)).not.toContain(id);
    }
  });

  it("keeps Fascinate, Dirge of Doom, Inspire Greatness, Soothing Performance, Frightening Tune, Inspire Heroics, Deadly Performance (untouched)", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    for (const tag of [
      "fascinate",
      "dirgeOfDoom",
      "inspireGreatness",
      "soothingPerformance",
      "frighteningTune",
      "inspireHeroics",
      "deadlyPerformance",
    ]) {
      expect(ids).toContain(`bardicPerformance:${tag}`);
    }
  });
});

describe("shard D: shadow-puppeteer", () => {
  const ARCH = ["bard:shadow-puppeteer"];

  it("removes Inspire Competence and Inspire Courage", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    expect(ids).not.toContain("bardicPerformance:inspireCompetence");
    expect(bardVariantRemovesInspireCourage(ARCH)).toBe(true);
  });

  it("gains Shadow Puppets and Shadow Servant at 1st, not before", () => {
    for (const tag of ["shadowPuppets", "shadowServant"]) {
      const id = `bardicPerformance:shadow-puppeteer:${tag}`;
      expect(bardicPerformanceToggleOptions(1, ARCH).map((o) => o.id)).toContain(id);
    }
  });
});

describe("shard D: silver-balladeer", () => {
  const ARCH = ["bard:silver-balladeer"];

  it("removes Suggestion, Inspire Greatness, Mass Suggestion", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    for (const tag of ["suggestion", "inspireGreatness", "massSuggestion"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
    expect(bardVariantRemovesInspireCourage(ARCH)).toBe(false);
  });

  it("gains Break Curse at 6th, Holy Vibration at 9th, Mass Break Curse at 18th, none early", () => {
    const schedule: [string, number][] = [
      ["breakCurse", 6],
      ["holyVibration", 9],
      ["massBreakCurse", 18],
    ];
    for (const [tag, level] of schedule) {
      const id = `bardicPerformance:silver-balladeer:${tag}`;
      expect(bardicPerformanceToggleOptions(level, ARCH).map((o) => o.id)).toContain(id);
      expect(bardicPerformanceToggleOptions(level - 1, ARCH).map((o) => o.id)).not.toContain(id);
    }
  });
});

describe("shard D: solacer", () => {
  const ARCH = ["bard:solacer"];

  it("removes Countersong only", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    expect(ids).not.toContain("bardicPerformance:countersong");
    expect(ids).toContain("bardicPerformance:distraction");
    expect(bardVariantRemovesInspireCourage(ARCH)).toBe(false);
  });

  it("gains Inspire Tenacity at 1st, Invigorating Artistry at 10th, not before", () => {
    expect(bardicPerformanceToggleOptions(1, ARCH).map((o) => o.id)).toContain(
      "bardicPerformance:solacer:inspireTenacity",
    );
    expect(bardicPerformanceToggleOptions(9, ARCH).map((o) => o.id)).not.toContain(
      "bardicPerformance:solacer:invigoratingArtistry",
    );
    expect(bardicPerformanceToggleOptions(10, ARCH).map((o) => o.id)).toContain(
      "bardicPerformance:solacer:invigoratingArtistry",
    );
  });
});

describe("shard D: songhealer", () => {
  const ARCH = ["bard:songhealer"];

  it("removes Frightening Tune only", () => {
    const ids = bardicPerformanceToggleOptions(20, ARCH).map((o) => o.id);
    expect(ids).not.toContain("bardicPerformance:frighteningTune");
    expect(ids).toContain("bardicPerformance:dirgeOfDoom");
    expect(bardVariantRemovesInspireCourage(ARCH)).toBe(false);
  });

  it("gains Healing Performance at 14th, not before", () => {
    const id = "bardicPerformance:songhealer:healingPerformance";
    expect(bardicPerformanceToggleOptions(13, ARCH).map((o) => o.id)).not.toContain(id);
    expect(bardicPerformanceToggleOptions(14, ARCH).map((o) => o.id)).toContain(id);
  });
});
