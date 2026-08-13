/**
 * Hand-computed fixtures for `VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES`. Mirrors
 * the doc-building helpers in `vendoredRacialTraitSaves.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  CL_CHECK_NOTE_TARGETS,
  VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Look up a vendored `RacialTrait`'s id by its (race-scoped) name. */
function vendoredTraitId(name: string, raceName: string): string {
  const entry = Object.entries(ref.racialTraits).find(
    ([, t]) => t.name === name && t.race.includes(raceName),
  );
  if (!entry) throw new Error(`vendored racial trait not found: ${name} (${raceName})`);
  return entry[0];
}

/** Fighter L1, all abilities 10, no gear. */
function makeDoc(raceName: string, vendoredRacialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `vclcheck-test-${raceName}`,
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
      racialTraits: [],
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

describe("drift guard", () => {
  const allClNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.racialTraits)) {
    for (const note of trait.contextNotes ?? []) {
      if (!CL_CHECK_NOTE_TARGETS.has(note.target)) continue;
      const text = note.text.trim();
      allClNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored racial trait's cl-targeted note verbatim", () => {
    const misses = Object.keys(VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES).filter(
      (key) => !allClNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own clCheck change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.racialTraits[id]!;
        if (trait.changes.some((c) => c.target.startsWith("clCheck"))) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Duergar Deep Magic (+2 racial on CL checks to overcome SR and to dispel, ARG p. 186)", () => {
  const id = vendoredTraitId("Deep Magic", "Duergar");
  const base = compute(makeDoc("Duergar"), ref);
  const withTrait = compute(makeDoc("Duergar", [id]), ref);

  it("omits clChecks entirely without the trait", () => {
    expect(base.clChecks).toBeUndefined();
  });

  it("adds +2 racial to both clChecks.sr and clChecks.dispel", () => {
    expect(withTrait.clChecks).toBeDefined();
    expect(withTrait.clChecks!.sr!.bonus).toBe(2);
    expect(withTrait.clChecks!.dispel!.bonus).toBe(2);
    expect(
      withTrait.clChecks!.sr!.components.some((c) => c.source === "Deep Magic" && c.applied),
    ).toBe(true);
    expect(
      withTrait.clChecks!.dispel!.components.some((c) => c.source === "Deep Magic" && c.applied),
    ).toBe(true);
  });
});

describe("Human Unstoppable Magic (+2 racial on CL checks vs. SR, ARG p. 214)", () => {
  const id = vendoredTraitId("Unstoppable Magic", "Human");
  const withTrait = compute(makeDoc("Human", [id]), ref);

  it("adds +2 racial to clChecks.sr only, no dispel entry", () => {
    expect(withTrait.clChecks).toBeDefined();
    expect(withTrait.clChecks!.sr!.bonus).toBe(2);
    expect(withTrait.clChecks!.dispel).toBeUndefined();
  });
});
