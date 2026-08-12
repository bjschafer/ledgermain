/**
 * Hand-computed fixture tests for the standard racial traits whose maneuver
 * bonus the compendium ships only as `Race.contextNotes` prose (see
 * `race-maneuver-notes.ts`). Mirrors `raceSaveNotes.test.ts`'s structure.
 *
 * Expected values are the published dwarf Stability ("+4 racial bonus to CMD
 * when resisting a bull rush or trip attempt while standing on the ground",
 * Core Rulebook) — Duergar's write-up (Advanced Race Guide) borrows the same
 * text wholesale.
 *
 * The interaction that matters most here is suppression, same as the save
 * table: a vendored alternate that replaces Stability (Relentless,
 * Tightfisted) swaps the note out, and the number has to go with it rather
 * than stacking underneath the replacement.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  raceContextNotesFor,
  STANDARD_RACE_MANEUVER_BONUSES,
  standardRaceManeuverChanges,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function vendoredTraitId(name: string, raceName: string): string {
  const entry = Object.entries(ref.racialTraits).find(
    ([, t]) => t.name === name && t.race.includes(raceName),
  );
  if (!entry) throw new Error(`vendored racial trait not found: ${name} (${raceName})`);
  return entry[0];
}

/** Fighter L1, all abilities 10 before racial changes, no gear. */
function makeDoc(raceName: string, vendoredRacialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `rmn-test-${raceName}`,
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

describe("Dwarf Stability (+4 CMD vs. bull rush and trip)", () => {
  const sheet = compute(makeDoc("Dwarf"), ref);

  it("leaves the headline CMD alone", () => {
    // Dwarf: no Str/Dex adjustment. Fighter L1: 10 + BAB 1 + Str mod 0 + Dex
    // mod 0 + size (Medium, 0) = 11.
    expect(sheet.cmd).toBe(11);
  });

  it("prints a merged bullRush/trip conditional at +4", () => {
    expect(sheet.cmdConditionals).toEqual([
      { total: 15, categories: ["bullRush", "trip"], labels: ["bull rush", "trip"] },
    ]);
  });

  it("does not touch flat-footed CMD", () => {
    const base = compute(makeDoc("Human"), ref);
    // Flat-footed CMD is built from the unconditional pool only — Stability
    // never reaches it either way, so this is unaffected by the promotion.
    expect(sheet.cmdFlatFooted).toBe(11); // no Dex to lose, same as headline
    expect(base.cmdFlatFooted).toBe(base.cmd);
  });
});

describe("Duergar Stability (same note text, different race)", () => {
  it("gets the identical +4 bullRush/trip conditional", () => {
    const sheet = compute(makeDoc("Duergar"), ref);
    // Duergar: no Str/Dex adjustment either. Same baseline as Dwarf.
    expect(sheet.cmd).toBe(11);
    expect(sheet.cmdConditionals).toEqual([
      { total: 15, categories: ["bullRush", "trip"], labels: ["bull rush", "trip"] },
    ]);
  });
});

describe("Dwarf Relentless (replaces Stability — no double-up)", () => {
  const relentlessId = vendoredTraitId("Relentless", "Dwarf");

  it("drops Stability's note and derived bonus outright", () => {
    const doc = makeDoc("Dwarf", [relentlessId]);
    const race = ref.races[doc.identity.race]!;
    expect(raceContextNotesFor(doc, race, ref).map((n) => n.text)).not.toContain(
      "+4 Racial vs Bull Rush and Trip while on ground",
    );
    expect(standardRaceManeuverChanges("Dwarf", raceContextNotesFor(doc, race, ref))).toEqual([]);
  });

  it("still applies Relentless's own bull rush/overrun CMB bonus, not CMD", () => {
    const sheet = compute(makeDoc("Dwarf", [relentlessId]), ref);
    // Fighter L1: BAB 1 + Str mod 0 + size 0 = 1, + 2 untyped = 3.
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([
      { total: 3, categories: ["bullRush", "overrun"], labels: ["bull rush", "overrun"] },
    ]);
    // Stability is gone, so no CMD conditional survives.
    expect(sheet.cmdConditionals).toBeUndefined();
  });
});

describe("Dwarf Tightfisted (also replaces Stability, different maneuvers)", () => {
  it("drops Stability but grants its own steal/disarm CMD bonus", () => {
    const tightfistedId = vendoredTraitId("Tightfisted", "Dwarf");
    const sheet = compute(makeDoc("Dwarf", [tightfistedId]), ref);
    expect(sheet.cmd).toBe(11);
    expect(sheet.cmdConditionals).toEqual([
      { total: 15, categories: ["disarm", "steal"], labels: ["disarm", "steal"] },
    ]);
  });
});

describe("the note-matching contract", () => {
  it("every entry matches a real vendored cmb/cmd note", () => {
    const unmatched: string[] = [];
    for (const [raceName, entries] of Object.entries(STANDARD_RACE_MANEUVER_BONUSES)) {
      const race = Object.values(ref.races).find((r) => r.name === raceName);
      if (!race) {
        unmatched.push(`${raceName}: race missing from the vendored slice`);
        continue;
      }
      for (const entry of entries) {
        const hit = race.contextNotes.some(
          (n) => (n.target === "cmb" || n.target === "cmd") && n.text.includes(entry.match),
        );
        if (!hit) unmatched.push(`${raceName}: no note contains "${entry.match}"`);
      }
    }
    expect(unmatched).toEqual([]);
  });

  it("only fires for a race that actually has the note", () => {
    const sheet = compute(makeDoc("Human"), ref);
    expect(sheet.cmdConditionals).toBeUndefined();
  });
});
