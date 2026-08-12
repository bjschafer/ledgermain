/**
 * Hand-computed fixtures for `VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES`.
 * Mirrors `vendoredCharacterTraitSaves.test.ts`'s structure.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  MANEUVER_NOTE_TARGETS,
  VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Look up a vendored character `Trait`'s id by its name. */
function traitIdByName(name: string): string {
  const entry = Object.values(ref.traits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored trait not found: ${name}`);
  return entry.id;
}

/** Fighter L1, Human, all abilities 10, no gear — the same known-zero baseline the save fixtures use. */
function makeDoc(traits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "vman-char-trait-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
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

describe("drift guard", () => {
  const allManeuverNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.traits)) {
    for (const note of trait.contextNotes ?? []) {
      if (!MANEUVER_NOTE_TARGETS.has(note.target)) continue;
      const text = note.text.trim();
      allManeuverNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored trait's cmb/cmd note verbatim", () => {
    const misses = Object.keys(VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES).filter(
      (key) => !allManeuverNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own cmb/cmd change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.traits[id]!;
        if (trait.changes.some((c) => c.target === "cmb" || c.target === "cmd")) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Naive (untyped, no type named — a penalty, not a bonus)", () => {
  const id = traitIdByName("Naive");
  const base = compute(makeDoc(), ref);
  const withTrait = compute(makeDoc([id]), ref);

  it("does not touch the headline CMD", () => {
    // Human Fighter L1, all 10s: CMD = 10 + BAB 1 + Str mod 0 + Dex mod 0 +
    // size 0 = 11.
    expect(base.cmd).toBe(11);
    expect(withTrait.cmd).toBe(11);
  });

  it('adds a "-2 untyped vs. dirty trick" conditional', () => {
    expect(withTrait.cmdConditionals).toEqual([
      { total: 9, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });
});

describe("Iron Grip (Gorum) (+2 trait CMD vs. disarm)", () => {
  it("prints a disarm conditional above the headline", () => {
    const id = traitIdByName("Iron Grip (Gorum)");
    const sheet = compute(makeDoc([id]), ref);
    expect(sheet.cmd).toBe(11);
    expect(sheet.cmdConditionals).toEqual([
      { total: 13, categories: ["disarm"], labels: ["disarm"] },
    ]);
  });
});

describe("Prankster (Gnome) (one trait, two independent notes on cmb AND cmd)", () => {
  it("promotes the attack half onto CMB and the defense half onto CMD", () => {
    const id = traitIdByName("Prankster (Gnome)");
    const sheet = compute(makeDoc([id]), ref);
    // CMB = BAB 1 + Str mod 0 + size 0 = 1, + 1 trait = 2.
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([
      { total: 2, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
    // CMD = 11, + 1 trait = 12. The flatfooted-duration rider on the cmb
    // note has no Change-shaped form and is not asserted here — it stays
    // prose alongside the still-visible note.
    expect(sheet.cmd).toBe(11);
    expect(sheet.cmdConditionals).toEqual([
      { total: 12, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });
});

describe("Blood of Giants (Reign of Winter) (cmb sunder + merged cmd bullRush/overrun)", () => {
  it("promotes both halves of the trait independently", () => {
    const id = traitIdByName("Blood of Giants (Reign of Winter)");
    const sheet = compute(makeDoc([id]), ref);
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([
      { total: 2, categories: ["sunder"], labels: ["sunder"] },
    ]);
    expect(sheet.cmd).toBe(11);
    expect(sheet.cmdConditionals).toEqual([
      { total: 12, categories: ["bullRush", "overrun"], labels: ["bull rush", "overrun"] },
    ]);
  });
});

describe("Repulsive (Tiefling; Foulspawn) (note text carries an embedded newline)", () => {
  it("still resolves via an exact match on the raw vendored text", () => {
    const id = traitIdByName("Repulsive (Tiefling; Foulspawn)");
    const sheet = compute(makeDoc([id]), ref);
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([
      { total: 2, categories: ["overrun", "reposition"], labels: ["overrun", "reposition"] },
    ]);
  });
});
