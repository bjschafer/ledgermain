import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { baseSpellsKnown, baseSpellsPerDay, compute } from "../src/index.js";

/**
 * Fixture coverage for Summoner (Unchained) (`summonerUnchained`). Same BAB
 * (medium)/save tiers (Fort low/Ref low/Will high)/HD (d8) as the base
 * summoner — confirmed straight off `RefData.classes.summonerUnchained`.
 * Its "Spells per Day"/"Spells Known" tables are numerically IDENTICAL to
 * the base summoner's (`SUMMONER_UNCHAINED_SPELLS_PER_DAY`/`_KNOWN` alias
 * `SUMMONER_SPELLS_PER_DAY`/`_KNOWN` in `tables.ts`, themselves an alias of
 * the bard's) — spot-checked below at L1/L5/L10/L20, same values as
 * `spellsPerDay.test.ts`'s `summoner` block. What DOES differ is the vendored
 * SPELL LIST itself: `refData.spellLists.summonerUnchained` is its own
 * 352-spell slice (not merely a re-export of `refData.spellLists.summoner`),
 * with several spells shifted up a level relative to the base summoner list
 * (e.g. Haste/Slow move from 2nd to 3rd) — verified below. Eidolon, Life
 * Link, Bond Senses, Aspect, etc. remain a separate, deferred subsystem, same
 * posture as the base summoner's own eidolon (not modeled here either).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function spellId(name: string): string {
  const entry = Object.entries(ref.spells).find(([, s]) => s.name === name);
  if (!entry) throw new Error(`spell not found: ${name}`);
  return entry[0];
}

function makeDoc(level: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "summonerUnchained", level }],
    },
    abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 16 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Summoner (Unchained) L6 (BAB med, Fort/Ref poor, Will good, d8 — same tiers as base summoner)", () => {
  const doc = makeDoc(6);
  const sheet = compute(doc, ref);

  it("BAB +4 (medium: floor(6*3/4))", () => {
    expect(sheet.bab).toBe(4);
  });

  it("saves: Fort +3, Ref +3 (poor), Will +5 (good)", () => {
    // poor = floor(6/3) = 2, +1 Con/Dex = 3; good = 2 + floor(6/2) = 5, +0 Wis = 5.
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(3);
    expect(sheet.saves.will.total).toBe(5);
  });

  it("HP 39 (d8: L1 max 8, L2-6 5x5=25, +Con 1/level=6)", () => {
    expect(sheet.hp.max).toBe(39);
  });

  it("level-appropriate features present", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Eidolon (UC)");
    expect(names).toContain("Life Link (UC)");
    expect(names).toContain("Summon Monster (UC)");
    expect(names).toContain("Summoner Spells (UC)");
    expect(names).toContain("Bond Senses (UC)");
    expect(names).toContain("Maker's Call (UC)");
    expect(names).not.toContain("Transposition (UC)"); // L8
  });
});

describe("baseSpellsPerDay()/baseSpellsKnown() — summonerUnchained (identical to base summoner)", () => {
  it("L1 — 4 cantrips known, 2 first-level known, 1 first-level slot/day", () => {
    expect(baseSpellsKnown("summonerUnchained", 1, 0)).toBe(4);
    expect(baseSpellsKnown("summonerUnchained", 1, 1)).toBe(2);
    expect(baseSpellsPerDay("summonerUnchained", 1, 0)).toBeNull();
    expect(baseSpellsPerDay("summonerUnchained", 1, 1)).toBe(1);
  });

  it("L10 — 5/5/4/2 known at 1st-4th, 5/4/3/1 slots/day at 1st-4th", () => {
    expect(baseSpellsKnown("summonerUnchained", 10, 1)).toBe(5);
    expect(baseSpellsKnown("summonerUnchained", 10, 2)).toBe(5);
    expect(baseSpellsKnown("summonerUnchained", 10, 3)).toBe(4);
    expect(baseSpellsKnown("summonerUnchained", 10, 4)).toBe(2);
    expect(baseSpellsPerDay("summonerUnchained", 10, 1)).toBe(5);
    expect(baseSpellsPerDay("summonerUnchained", 10, 2)).toBe(4);
    expect(baseSpellsPerDay("summonerUnchained", 10, 3)).toBe(3);
    expect(baseSpellsPerDay("summonerUnchained", 10, 4)).toBe(1);
  });

  it("L20 — 5 slots/day at every level 1-6", () => {
    for (const lvl of [1, 2, 3, 4, 5, 6]) {
      expect(baseSpellsPerDay("summonerUnchained", 20, lvl)).toBe(5);
    }
    expect(baseSpellsPerDay("summonerUnchained", 20, 7)).toBeNull();
  });
});

describe("summonerUnchained spell list differs from base summoner (352-spell vendored slice, not a re-export)", () => {
  it("Haste is 2nd-level on the base summoner list but 3rd-level on the Unchained list", () => {
    const haste = spellId("Haste");
    expect(ref.spellLists.summoner?.["2"]).toContain(haste);
    expect(ref.spellLists.summoner?.["3"]).not.toContain(haste);

    expect(ref.spellLists.summonerUnchained?.["3"]).toContain(haste);
    expect(ref.spellLists.summonerUnchained?.["2"]).not.toContain(haste);
  });

  it("cantrip (0-level) list is identical between the two (both size 12)", () => {
    expect(ref.spellLists.summonerUnchained?.["0"]?.length).toBe(
      ref.spellLists.summoner?.["0"]?.length,
    );
  });
});
