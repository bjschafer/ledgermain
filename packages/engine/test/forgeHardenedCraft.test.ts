/**
 * Hand-computed fixture for the Ifrit Forge-Hardened racial trait's Craft
 * bonus, promoted via the `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` data-pipeline
 * supplement (packages/data-pipeline/src/supplements.ts). Split into its own
 * file rather than added to `vendoredRacialTraitSaves.test.ts` (which already
 * covers this trait's separately-wired fatigue/exhaustion save bonus) to
 * avoid touching a file another store's fixtures live in.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitId(name: string, race: string): string {
  const entry = Object.entries(ref.racialTraits).find(
    ([, t]) => t.name === name && t.race.includes(race),
  );
  if (!entry) throw new Error(`vendored racial trait not found: ${name} (${race})`);
  return entry[0];
}

/** Fighter L1, all abilities 10 (mod 0), no gear. */
function makeDoc(raceName: string, vendoredRacialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `forge-hardened-test-${raceName}`,
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(raceName),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vendoredRacialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Ifrit Forge-Hardened: Craft (armor) and Craft (weapons) racial bonus", () => {
  const id = traitId("Forge-Hardened", "Ifrit");

  it("adds +2 racial to both named Craft instances, unconditionally", () => {
    const base = compute(makeDoc("Ifrit"), ref);
    const withTrait = compute(makeDoc("Ifrit", [id]), ref);
    expect(withTrait.skills["crf.armor"]!.total - (base.skills["crf.armor"]?.total ?? 0)).toBe(2);
    expect(withTrait.skills["crf.weapons"]!.total - (base.skills["crf.weapons"]?.total ?? 0)).toBe(
      2,
    );
  });

  it("does not leak onto an unrelated Craft instance", () => {
    const withTrait = compute(makeDoc("Ifrit", [id]), ref);
    expect(withTrait.skills["crf.alchemy"]?.total ?? 0).toBe(0);
  });
});
