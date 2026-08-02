/**
 * Hand-computed fixtures for `VENDORED_CHARACTER_TRAIT_SAVE_NOTES`. Mirrors
 * `vendoredRacialTraitSaves.test.ts`, but resolves character traits through
 * `doc.build.traits` (see `traits.test.ts`'s vendored-trait block) rather than
 * `doc.build.vendoredRacialTraits`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, VENDORED_CHARACTER_TRAIT_SAVE_NOTES } from "../src/index.js";

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

/** Fighter L1, Human, all abilities 10, no gear — the same known-zero baseline `vendoredRacialTraitSaves.test.ts` uses. */
function makeDoc(traits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "vsave-char-trait-test",
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
  const allSaveNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.traits)) {
    for (const note of trait.contextNotes ?? []) {
      if (note.target !== "allSavingThrows") continue;
      const text = note.text.trim();
      allSaveNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored trait's allSavingThrows note verbatim", () => {
    const misses = Object.keys(VENDORED_CHARACTER_TRAIT_SAVE_NOTES).filter(
      (key) => !allSaveNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own allSavingThrows change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_CHARACTER_TRAIT_SAVE_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.traits[id]!;
        if (trait.changes.some((c) => c.target === "allSavingThrows")) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Swamp Recluse (flat trait bonus, Fortitude-only, headline unchanged)", () => {
  const id = traitIdByName("Swamp Recluse (Swamp)");
  const base = compute(makeDoc(), ref);
  const withTrait = compute(makeDoc([id]), ref);

  it("does not touch the headline Fortitude total", () => {
    // Human, no ability adjustments: fighter L1 good Fort save (+2) + Con mod
    // (0) = 2, same with or without the trait since a category-scoped bonus
    // never joins the headline total.
    expect(base.saves.fort.total).toBe(2);
    expect(withTrait.saves.fort.total).toBe(2);
  });

  it('adds a +2 "Trait bonus against poison" conditional on Fortitude only', () => {
    expect(withTrait.saves.fort.conditionals).toEqual([
      { total: 4, categories: ["poison"], labels: ["poison"] },
    ]);
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
    expect(withTrait.saves.will.conditionals).toBeUndefined();
  });
});

describe("Birthmark (one trait, two categories merge into one Will line)", () => {
  const id = traitIdByName("Birthmark");
  const base = compute(makeDoc(), ref);
  const withTrait = compute(makeDoc([id]), ref);

  it('"+2 Trait bonus against charm and compulsion effects" prints one merged line', () => {
    // Will = poor save (+0) + Wis mod (0) = 0, + the trait's +2 = 2. Charm
    // and compulsion are siblings under enchantment (neither implies the
    // other), so the note names both explicitly and both resolve to the same
    // total, merging into one line rather than two identical ones.
    expect(base.saves.will.total).toBe(0);
    expect(withTrait.saves.will.conditionals).toEqual([
      { total: 2, categories: ["charm", "compulsion"], labels: ["charm", "compulsion"] },
    ]);
    expect(withTrait.saves.fort.conditionals).toBeUndefined();
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
  });
});

describe("Eagle Knight Recruit + Sleepy (category inheritance)", () => {
  const mindId = traitIdByName("Eagle Knight Recruit (Ruins of Azlant)");
  const sleepId = traitIdByName("Sleepy");
  const base = compute(makeDoc(), ref);
  const withBoth = compute(makeDoc([mindId, sleepId]), ref);

  it("the mind-affecting bonus flows into the sleep line even with no trait naming sleep directly", () => {
    // Will floor = poor save (+0) + Wis mod (0) = 0.
    //
    // Eagle Knight Recruit: "+1 Trait bonus against mind-affecting effects"
    // (trait, category mind). Sleepy: "-2 penalty vs sleep effects" (no type
    // named, so untyped; category sleep, whose parent is mind).
    //
    // The "mind" line only sees the mind-scoped modifier (sleep is a
    // descendant, not an ancestor, of mind): 0 + 1 = 1.
    //
    // The "sleep" line sees both, since sleep's own ancestor chain includes
    // mind: the +1 trait bonus and the -2 untyped penalty are different
    // types, so both apply (highest-within-type for trait, straight sum for
    // untyped, per stacking.ts): 0 + 1 - 2 = -1. This is the one visible
    // number that proves inheritance: without the mind trait, Sleepy alone
    // would put this line at -2, not -1.
    expect(base.saves.will.total).toBe(0);
    expect(withBoth.saves.will.conditionals).toEqual([
      { total: 1, categories: ["mind"], labels: ["mind-affecting"] },
      { total: -1, categories: ["sleep"], labels: ["sleep"] },
    ]);
    expect(withBoth.saves.fort.conditionals).toBeUndefined();
    expect(withBoth.saves.ref.conditionals).toBeUndefined();
  });
});

describe("Draconic Lineage (deliberately partial)", () => {
  const id = traitIdByName("Draconic Lineage");
  const base = compute(makeDoc(), ref);
  const withTrait = compute(makeDoc([id]), ref);

  it("promotes only the fear half of its fear-and-dragon-created-effects note", () => {
    // Will floor = poor save (+0) + Wis mod (0) = 0, + the trait's +1 vs.
    // fear = 1. The same note also grants a bonus against "any effect
    // created by a creature of the dragon type", which is a property of the
    // ATTACKER rather than the effect and has no vocabulary entry, so only
    // the fear half promotes.
    expect(base.saves.will.total).toBe(0);
    expect(withTrait.saves.will.conditionals).toEqual([
      { total: 1, categories: ["fear"], labels: ["fear"] },
    ]);
  });

  it("no second conditional appears anywhere for the dragon-created-effects half", () => {
    expect(withTrait.saves.will.conditionals?.length).toBe(1);
    expect(withTrait.saves.fort.conditionals).toBeUndefined();
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
  });
});
