/**
 * Hand-computed fixtures for `VENDORED_RACIAL_TRAIT_AC_NOTES` and
 * `VENDORED_CHARACTER_TRAIT_AC_NOTES`. Mirrors
 * `vendoredRacialTraitManeuvers.test.ts`'s structure, covering both racial
 * and character traits in one file since both tables live in the same
 * source module (`vendored-trait-ac-notes.ts`).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  AC_NOTE_TARGETS,
  compute,
  VENDORED_CHARACTER_TRAIT_AC_NOTES,
  VENDORED_RACIAL_TRAIT_AC_NOTES,
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

/** Look up a vendored character `Trait`'s id by its name. */
function traitIdByName(name: string): string {
  const entry = Object.values(ref.traits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored trait not found: ${name}`);
  return entry.id;
}

/** Fighter L1, all abilities 10 before racial adjustments, no gear. */
function makeDoc(
  raceName: string,
  vendoredRacialTraits: string[] = [],
  traits: string[] = [],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `vac-test-${raceName}`,
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
      traits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("drift guard: racial", () => {
  const allAcNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.racialTraits)) {
    for (const note of trait.contextNotes ?? []) {
      if (!AC_NOTE_TARGETS.has(note.target)) continue;
      const text = note.text.trim();
      allAcNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored racial trait's ac note verbatim", () => {
    const misses = Object.keys(VENDORED_RACIAL_TRAIT_AC_NOTES).filter(
      (key) => !allAcNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own bare-ac change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_RACIAL_TRAIT_AC_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.racialTraits[id]!;
        if (trait.changes.some((c) => c.target === "ac")) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("drift guard: character traits", () => {
  const allAcNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.traits)) {
    for (const note of trait.contextNotes ?? []) {
      if (!AC_NOTE_TARGETS.has(note.target)) continue;
      const text = note.text.trim();
      allAcNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored character trait's ac note verbatim", () => {
    const misses = Object.keys(VENDORED_CHARACTER_TRAIT_AC_NOTES).filter(
      (key) => !allAcNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own bare-ac change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_CHARACTER_TRAIT_AC_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.traits[id]!;
        if (trait.changes.some((c) => c.target === "ac")) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Drow Defensive Training (Drow) (+4 dodge AC vs. aberrations)", () => {
  it("leaves headline AC alone and prints an aberrations conditional", () => {
    const id = vendoredTraitId("Defensive Training (Drow)", "Drow");
    const sheet = compute(makeDoc("Drow", [id]), ref);
    // Drow: Dex +2 (12, mod +1), Cha +2, Con -2 - base AC 10 + Dex 1 = 11.
    expect(sheet.ac.normal).toBe(11);
    expect(sheet.ac.conditionals).toEqual([
      { total: 15, categories: ["aberrations"], labels: ["aberrations"] },
    ]);
  });
});

describe("Dwarf Deep Warrior (+2 dodge AC vs. aberrations, the AC half of a two-note trait)", () => {
  it("prints an aberrations conditional; the cmb note is a separate table's concern", () => {
    const id = vendoredTraitId("Deep Warrior", "Dwarf");
    const sheet = compute(makeDoc("Dwarf", [id]), ref);
    // Deep Warrior replaces the Dwarf's standard Defensive Training
    // (+4 dodge vs. giants), but that pairing isn't in the verified
    // VENDORED_STANDARD_TRAIT_NOTES suppression map (racial-traits.ts), so
    // the standard trait's note still surfaces its own conditional
    // alongside this one - a pre-existing gap, not something this AC-note
    // promotion introduces or is responsible for closing.
    expect(sheet.ac.conditionals).toEqual([
      { total: 14, categories: ["giants"], labels: ["giants"] },
      { total: 12, categories: ["aberrations"], labels: ["aberrations"] },
    ]);
  });
});

describe("Ratfolk Unnatural (partial: dodge-vs-animals half only)", () => {
  it("prints an animals conditional; the Charisma-skill penalty stays unmodeled", () => {
    const id = vendoredTraitId("Unnatural", "Ratfolk");
    const sheet = compute(makeDoc("Ratfolk", [id]), ref);
    // Ratfolk: Dex +2 (12, mod +1) and Small size (+1 size) - base AC
    // 10 + 1 + 1 = 12.
    expect(sheet.ac.normal).toBe(12);
    expect(sheet.ac.conditionals).toEqual([
      { total: 14, categories: ["animals"], labels: ["animals"] },
    ]);
  });
});

describe("Trap Savvy (Darklands) (+1 untyped AC vs. traps, no type word in the note)", () => {
  it("prints a traps conditional on AC", () => {
    const id = traitIdByName("Trap Savvy (Darklands)");
    const sheet = compute(makeDoc("Human", [], [id]), ref);
    expect(sheet.ac.conditionals).toEqual([
      { total: 11, categories: ["traps"], labels: ["traps"] },
    ]);
  });
});

describe("Blessed of the Norns (partial: traps half only, surprise-round half stays prose)", () => {
  it("prints a traps conditional on AC", () => {
    const id = traitIdByName("Blessed of the Norns (Lands of the Linnorm Kings)");
    const sheet = compute(makeDoc("Human", [], [id]), ref);
    expect(sheet.ac.conditionals).toEqual([
      { total: 11, categories: ["traps"], labels: ["traps"] },
    ]);
  });
});

describe("Dwarf-Trained (Giantslayer) (+2 dodge AC vs. giants, attack half stays prose)", () => {
  it("prints a giants conditional on AC", () => {
    const id = traitIdByName("Dwarf-Trained (Giantslayer)");
    const sheet = compute(makeDoc("Human", [], [id]), ref);
    expect(sheet.ac.conditionals).toEqual([
      { total: 12, categories: ["giants"], labels: ["giants"] },
    ]);
  });
});

describe("Elf Vigilance (newly promoted: dodge AC vs. chaotic creatures, an alignment rather than a type)", () => {
  it("leaves headline AC alone and prints a chaotic conditional", () => {
    const id = vendoredTraitId("Vigilance", "Elf");
    const sheet = compute(makeDoc("Elf", [id]), ref);
    // Elf: Dex +2 (12, mod +1), Int +2, Con -2 - base AC 10 + Dex 1 = 11.
    expect(sheet.ac.normal).toBe(11);
    expect(sheet.ac.conditionals).toEqual([
      { total: 13, categories: ["chaotic"], labels: ["chaotic"] },
    ]);
  });
});
