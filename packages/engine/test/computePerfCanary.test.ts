import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, SkillId } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

/**
 * Deliberately absurd: twenty classes at 5th level, eight archetypes, and a
 * pick from every build-choice catalog `collectModifiers` walks, so that every
 * subsystem in `collect/` does real work on every run. Picks are taken from
 * the vendored catalogs by sorted key rather than hardcoded, so a refdata bump
 * re-points them instead of emptying them.
 */
const CLASS_TAGS = [
  "sorcerer",
  "oracle",
  "witch",
  "shaman",
  "arcanist",
  "magus",
  "alchemist",
  "kineticist",
  "rogue",
  "ninja",
  "investigator",
  "vigilante",
  "slayer",
  "barbarian",
  "occultist",
  "medium",
  "psychic",
  "brawler",
  "monk",
  "fighter",
];

const take = (rec: Record<string, unknown> | undefined, n: number): string[] =>
  Object.keys(rec ?? {})
    .sort()
    .slice(0, n);

const first = (rec: Record<string, unknown> | undefined): string | undefined => take(rec, 1)[0];

function stressCharacter(): CharacterDoc {
  const archetypes = Object.entries(ref.archetypes)
    .filter(([, a]) => CLASS_TAGS.includes(a.classTag))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 8)
    .map(([id]) => id);

  return {
    schemaVersion: 2,
    id: "stress",
    ownerId: "local",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Stress",
      race: take(ref.races, 1)[0]!,
      classes: CLASS_TAGS.map((tag) => ({ tag, level: 5 })),
      alignment: "N",
    },
    abilities: { str: 18, dex: 18, con: 18, int: 18, wis: 18, cha: 18 },
    build: {
      feats: take(ref.feats, 40),
      traits: take(ref.traits, 6),
      skillRanks: Object.fromEntries(
        ["acr", "per", "sen", "kre", "int", "swm", "dip", "ste"].map((s) => [s, 5]),
      ) as Record<SkillId, number>,
      clericDomains: ["War", "Fire"],
      archetypes,
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      abilityIncreases: ["str", "dex", "con", "int", "wis"] as AbilityId[],
      sorcererBloodline: first(ref.sorcererBloodlines),
      bloodragerBloodline: first(ref.bloodragerBloodlines),
      psychicDiscipline: first(ref.psychicDisciplines),
      arcanistExploits: take(ref.arcanistExploits, 8),
      magusArcana: take(ref.magusArcana, 8),
      oracleMystery: first(ref.oracleMysteries),
      oracleCurse: first(ref.oracleCurses),
      witchHexes: take(ref.hexes, 8),
      shamanSpirit: first(ref.shamanSpirits),
      shamanHexes: take(ref.shamanHexes, 6),
      alchemistDiscoveries: take(ref.alchemistDiscoveries, 8),
      kineticistElement: "fire",
      kineticistWildTalents: take(ref.kineticWildTalents, 8),
      rogueTalents: take(ref.rogueTalents, 8),
      ninjaTricks: take(ref.ninjaTricks, 8),
      investigatorTalents: take(ref.investigatorTalents, 8),
      vigilanteTalents: take(ref.vigilanteTalents, 8),
      vigilanteSocialTalents: take(ref.vigilanteSocialTalents, 6),
      slayerTalents: take(ref.slayerTalents, 6),
      ragePowers: take(ref.ragePowers, 8),
      occultistImplements: take(ref.occultistImplements, 4),
    },
    live: {
      hp: { current: 100, temp: 0, nonlethal: 0 },
      conditions: ["shaken", "sickened", "fatigued"],
      activeBuffs: Object.entries(ref.buffs)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 15)
        .map(([id, buff]) => ({
          instanceId: `buff-${id}`,
          buffId: id,
          name: buff.name,
          changes: buff.changes,
        })),
      resources: {},
      mediumSpirit: first(ref.mediumSpirits),
    },
  };
}

function medianComputeMs(doc: CharacterDoc, runs: number): number {
  for (let i = 0; i < 20; i++) compute(doc, ref);
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    compute(doc, ref);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

/**
 * A canary, not a benchmark. The threshold is far above what any machine that
 * runs this suite should need (roughly 2 ms on a dev laptop) — it is here to
 * catch the shape of regression a content wave causes, where a new subsystem
 * re-scans a whole RefData collection per call and compute silently goes
 * order-of-magnitude slower with nothing measuring it. Widen it only for a
 * measured, understood change; a failure means read what the new work is.
 */
const STRESS_BUDGET_MS = 25;

describe("compute perf canary", () => {
  const doc = stressCharacter();

  it("exercises the collection subsystems it is meant to", () => {
    const sheet = compute(doc, ref);
    // A doc that stopped resolving anything would pass the timing check while
    // measuring nothing, so pin the work down first.
    expect(sheet.classFeatures.length).toBeGreaterThan(50);
    expect(sheet.activeArchetypes.length).toBe(8);
    expect(sheet.hp.max).toBeGreaterThan(100);
    expect(sheet.skills.acr?.total).not.toBe(0);
  });

  it(`computes a maximal character in under ${STRESS_BUDGET_MS} ms`, () => {
    expect(medianComputeMs(doc, 100)).toBeLessThan(STRESS_BUDGET_MS);
  });
});
