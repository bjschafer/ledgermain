/**
 * Hand-computed fixtures for `VENDORED_RACIAL_TRAIT_MANEUVER_NOTES`. Mirrors
 * `vendoredRacialTraitSaves.test.ts`'s structure and doc-building helpers.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  MANEUVER_NOTE_TARGETS,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
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

/** Fighter L1, all abilities 10 before racial adjustments, no gear. */
function makeDoc(raceName: string, vendoredRacialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `vman-test-${raceName}`,
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
  const allManeuverNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.racialTraits)) {
    for (const note of trait.contextNotes ?? []) {
      if (!MANEUVER_NOTE_TARGETS.has(note.target)) continue;
      const text = note.text.trim();
      allManeuverNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored racial trait's cmb/cmd note verbatim", () => {
    const misses = Object.keys(VENDORED_RACIAL_TRAIT_MANEUVER_NOTES).filter(
      (key) => !allManeuverNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own cmb/cmd change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_RACIAL_TRAIT_MANEUVER_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.racialTraits[id]!;
        if (trait.changes.some((c) => c.target === "cmb" || c.target === "cmd")) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Cecaelia Tripping Tentacles (+4 racial CMB vs. trip)", () => {
  it("leaves headline CMB alone and prints a trip conditional", () => {
    const id = vendoredTraitId("Tripping Tentacles", "Cecaelia");
    const sheet = compute(makeDoc("Cecaelia", [id]), ref);
    // Cecaelia: Dex +2, Int -2, Wis +2 — Str unmodified (mod 0). Fighter L1:
    // BAB 1 + Str mod 0 + size (Medium, 0) = 1.
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([{ total: 5, categories: ["trip"], labels: ["trip"] }]);
  });
});

describe("Catfolk Nimble Faller (untyped, no type named in the note)", () => {
  it("prints a +1 trip conditional on CMD", () => {
    const id = vendoredTraitId("Nimble Faller", "Catfolk");
    const sheet = compute(makeDoc("Catfolk", [id]), ref);
    // Catfolk: Cha +2, Dex +2, Wis -2 — Str unmodified. Fighter L1: 10 + BAB
    // 1 + Str mod 0 + Dex mod 1 (12 Dex) + size 0 = 12.
    expect(sheet.cmd).toBe(12);
    expect(sheet.cmdConditionals).toEqual([{ total: 13, categories: ["trip"], labels: ["trip"] }]);
  });
});

describe("Vanara Whitecape (merged bullRush/trip line on CMD)", () => {
  it("prints one merged conditional at +4", () => {
    const id = vendoredTraitId("Whitecape", "Vanara");
    const sheet = compute(makeDoc("Vanara", [id]), ref);
    // Vanara: Dex +2, Cha -2, Wis +2 — Str unmodified. Fighter L1: 10 + BAB 1
    // + Str mod 0 + Dex mod 1 (12 Dex) + size 0 = 12.
    expect(sheet.cmd).toBe(12);
    expect(sheet.cmdConditionals).toEqual([
      { total: 16, categories: ["bullRush", "trip"], labels: ["bull rush", "trip"] },
    ]);
  });
});

describe("Tiefling Bullying (merged disarm/steal line on CMB)", () => {
  it("prints one merged conditional at +1", () => {
    const id = vendoredTraitId("Bullying", "Tiefling");
    const sheet = compute(makeDoc("Tiefling", [id]), ref);
    // Tiefling: Dex +2, Cha -2, Int +2 — Str unmodified. Fighter L1: BAB 1 +
    // Str mod 0 + size 0 = 1.
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([
      { total: 2, categories: ["disarm", "steal"], labels: ["disarm", "steal"] },
    ]);
  });
});

describe("Gnome Dirty Trickster (Small size, distinguished from the character trait of the same name)", () => {
  it("prints a +2 dirtyTrick conditional on CMB below a negative headline", () => {
    const id = vendoredTraitId("Dirty Trickster", "Gnome");
    const sheet = compute(makeDoc("Gnome", [id]), ref);
    // Gnome: Cha +2, Con +2, Str -2 (Str 8, mod -1). Fighter L1: BAB 1 + Str
    // mod -1 + size (Small, -1) = -1.
    expect(sheet.cmb).toBe(-1);
    expect(sheet.cmbConditionals).toEqual([
      { total: 1, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });
});
