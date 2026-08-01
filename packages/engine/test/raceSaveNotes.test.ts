/**
 * Hand-computed fixture tests for the standard racial traits whose save bonus
 * the compendium ships only as `Race.contextNotes` prose (see
 * `race-save-notes.ts`). Expected values are the published racial traits:
 * dwarf Hardy (+2 vs. poison, spells, and spell-like abilities), elf and
 * half-elf Elven Immunities (+2 vs. enchantment), halfling Fearless (+2 vs.
 * fear), gnome Illusion Resistance (+2 vs. illusions), vishkanya Poison
 * Resistance (+1 per Hit Die vs. poison) — all CRB/ARG.
 *
 * The interaction that matters most here is suppression: an alternate racial
 * trait that replaces one of these swaps the note out, and the number has to
 * go with it rather than stacking underneath the replacement.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  raceContextNotesFor,
  STANDARD_RACE_SAVE_BONUSES,
  standardRaceSaveChanges,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Fighter (or `classTag` at `level`), all abilities 10 before racial changes. */
function makeDoc(
  raceName: string,
  racialTraits: string[] = [],
  level = 1,
  classTag = "fighter",
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `rsn-test-${raceName}`,
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(raceName),
      classes: [{ tag: classTag, level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      racialTraits,
      vendoredRacialTraits: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** The conditional total covering `category`, or undefined if there is none. */
function conditional(
  sheet: ReturnType<typeof compute>,
  save: "fort" | "ref" | "will",
  category: string,
): number | undefined {
  return sheet.saves[save].conditionals?.find((c) => c.categories.includes(category))?.total;
}

describe("Dwarf Hardy (+2 vs. poison, spells, and spell-like abilities)", () => {
  const sheet = compute(makeDoc("Dwarf"), ref);

  it("leaves the headline saves alone", () => {
    // Fighter 1: Fort base +2, Dwarf Con +2 (mod +1) → +3. Will base +0,
    // Dwarf Wis +2 (mod +1) → +1. Reflex base +0, Dex 10 → +0.
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.will.total).toBe(1);
    expect(sheet.saves.ref.total).toBe(0);
  });

  it("shows poison, spells, and SLAs on Fortitude", () => {
    expect(conditional(sheet, "fort", "poison")).toBe(5);
    expect(conditional(sheet, "fort", "spell")).toBe(5);
    expect(conditional(sheet, "fort", "sla")).toBe(5);
  });

  it("merges all three into a single line, since they share a total", () => {
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 5, categories: ["spell", "sla", "poison"], labels: ["spells", "SLAs", "poison"] },
    ]);
  });

  it("carries spells and SLAs to Will and Reflex, but not poison", () => {
    // Poison always calls for a Fortitude save, so it must not render there.
    expect(conditional(sheet, "will", "spell")).toBe(3);
    expect(conditional(sheet, "ref", "sla")).toBe(2);
    expect(conditional(sheet, "ref", "poison")).toBeUndefined();
    expect(conditional(sheet, "will", "poison")).toBeUndefined();
  });
});

describe("Dwarf Steel Soul (replaces Hardy — no double-up)", () => {
  const sheet = compute(makeDoc("Dwarf", ["dwarf-steel-soul"]), ref);

  it("drops Hardy's derived bonus outright", () => {
    // Both are racial and Steel Soul's is the larger, so a leaked Hardy would
    // be numerically invisible here (highest-within-type). Assert the
    // suppression directly instead: with Steel Soul active, Hardy's note is
    // gone from the surviving list and yields no change at all.
    const doc = makeDoc("Dwarf", ["dwarf-steel-soul"]);
    const race = ref.races[doc.identity.race]!;
    expect(raceContextNotesFor(doc, race, ref).map((n) => n.text)).not.toContain(
      "+2 Racial vs Poisons, Spells and Spell-likes",
    );
    expect(standardRaceSaveChanges("Dwarf", raceContextNotesFor(doc, race, ref))).toEqual([]);
  });

  it("keeps the poison bonus at +2, not +4", () => {
    // Steel Soul retains Hardy's +2 vs. poison and raises the spell/SLA half to +4.
    expect(conditional(sheet, "fort", "poison")).toBe(5);
  });

  it("raises spells and SLAs to +4", () => {
    expect(conditional(sheet, "fort", "spell")).toBe(7);
    expect(conditional(sheet, "will", "sla")).toBe(5);
  });

  it("splits into two lines: spells/SLAs at +4, poison at +2", () => {
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 7, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
      { total: 5, categories: ["poison"], labels: ["poison"] },
    ]);
  });
});

describe("Halfling Practicality (replaces Fearless with an illusion bonus)", () => {
  const base = compute(makeDoc("Halfling"), ref);
  const sheet = compute(makeDoc("Halfling", ["halfling-practicality"]), ref);

  it("a plain halfling is +2 vs. fear, on top of halfling luck", () => {
    // Fighter 1 Will base +0, Wis 10 → +0, plus halfling luck +1 racial = +1
    // headline. Fearless "stacks with the bonus granted by halfling luck"
    // (Core Rulebook), so the fear total is 0 + 1 + 2 = 3, not 2.
    expect(base.saves.will.total).toBe(1);
    expect(conditional(base, "will", "fear")).toBe(3);
  });

  it("the replacement drops fear entirely and grants illusions", () => {
    expect(conditional(sheet, "will", "fear")).toBeUndefined();
    expect(conditional(sheet, "will", "illusion")).toBe(2);
  });
});

describe("Elven Immunities (+2 vs. enchantment) on elf and half-elf", () => {
  it("elf shows enchantment on Will only", () => {
    const sheet = compute(makeDoc("Elf"), ref);
    // Elf Con -2 (mod -1): Fort = 2 - 1 = 1. Will = 0 + 0 = 0, +2 vs.
    // enchantment. Enchantment is a Will-only category.
    expect(sheet.saves.fort.total).toBe(1);
    expect(conditional(sheet, "will", "enchantment")).toBe(2);
    expect(sheet.saves.fort.conditionals).toBeUndefined();
    expect(sheet.saves.ref.conditionals).toBeUndefined();
  });

  it("half-elf gets the same bonus", () => {
    const sheet = compute(makeDoc("Half-Elf"), ref);
    expect(conditional(sheet, "will", "enchantment")).toBe(2);
  });
});

describe("Gnome Illusion Resistance (+2 vs. illusions)", () => {
  it("shows on Will", () => {
    const sheet = compute(makeDoc("Gnome"), ref);
    expect(conditional(sheet, "will", "illusion")).toBe(2);
  });
});

describe("Vishkanya Poison Resistance (scales with Hit Dice)", () => {
  it("is +1 per level", () => {
    const l1 = compute(makeDoc("Vishkanya"), ref);
    const l7 = compute(makeDoc("Vishkanya", [], 7), ref);
    // Vishkanya Con is unmodified (Dex +2, Cha +2, Wis -2). Fighter Fort base
    // is +2 at 1st and +5 at 7th; the poison line sits HD above each.
    expect(conditional(l1, "fort", "poison")).toBe(l1.saves.fort.total + 1);
    expect(conditional(l7, "fort", "poison")).toBe(l7.saves.fort.total + 7);
  });
});

describe("the note-matching contract", () => {
  it("every entry matches a real vendored allSavingThrows note", () => {
    // The match strings are transcribed from the pinned pack, so a data bump
    // that rewords one would otherwise silently stop applying its bonus.
    const unmatched: string[] = [];
    for (const [raceName, entries] of Object.entries(STANDARD_RACE_SAVE_BONUSES)) {
      const race = Object.values(ref.races).find((r) => r.name === raceName);
      if (!race) {
        unmatched.push(`${raceName}: race missing from the vendored slice`);
        continue;
      }
      for (const entry of entries) {
        const hit = race.contextNotes.some(
          (n) => n.target === "allSavingThrows" && n.text.includes(entry.match),
        );
        if (!hit) unmatched.push(`${raceName}: no note contains "${entry.match}"`);
      }
    }
    expect(unmatched).toEqual([]);
  });

  it("only fires for a race that actually has the note", () => {
    // Half-Orc has no save contextNote at all.
    const sheet = compute(makeDoc("Half-Orc"), ref);
    expect(sheet.saves.fort.conditionals).toBeUndefined();
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });
});
