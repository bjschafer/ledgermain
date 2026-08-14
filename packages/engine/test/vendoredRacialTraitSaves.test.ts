/**
 * Hand-computed fixtures for `VENDORED_RACIAL_TRAIT_SAVE_NOTES`. Mirrors the
 * doc-building helpers in `racial-traits.test.ts`.
 *
 * None of the promoted notes embed a `[[...]]` roll formula: the vendored
 * slice's only bracketed `allSavingThrows` expressions are spell resistance
 * and a limited-use resource, both skipped for reasons unrelated to scaling
 * (see the table's doc comment), so there is no formula-scaled fixture here.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, SAVE_NOTE_TARGETS, VENDORED_RACIAL_TRAIT_SAVE_NOTES } from "../src/index.js";

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
    id: `vsave-test-${raceName}`,
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
  const allSaveNoteTexts = new Set<string>();
  const noteToTraitIds = new Map<string, string[]>();
  for (const [id, trait] of Object.entries(ref.racialTraits)) {
    for (const note of trait.contextNotes ?? []) {
      if (!SAVE_NOTE_TARGETS.has(note.target)) continue;
      const text = note.text.trim();
      allSaveNoteTexts.add(text);
      const ids = noteToTraitIds.get(text) ?? [];
      ids.push(id);
      noteToTraitIds.set(text, ids);
    }
  }

  it("every table key matches some vendored racial trait's save-targeted note verbatim", () => {
    const misses = Object.keys(VENDORED_RACIAL_TRAIT_SAVE_NOTES).filter(
      (key) => !allSaveNoteTexts.has(key),
    );
    expect(misses).toEqual([]);
  });

  it("no trait the table covers already ships its own allSavingThrows change (no double-count)", () => {
    const offenders: string[] = [];
    for (const key of Object.keys(VENDORED_RACIAL_TRAIT_SAVE_NOTES)) {
      for (const id of noteToTraitIds.get(key) ?? []) {
        const trait = ref.racialTraits[id]!;
        if (trait.changes.some((c) => c.target === "allSavingThrows")) {
          offenders.push(`${id} (${trait.name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Gillman Venomkissed (plain flat bonus, Fortitude-only)", () => {
  const id = vendoredTraitId("Venomkissed", "Gillman");
  const base = compute(makeDoc("Gillman"), ref);
  const withTrait = compute(makeDoc("Gillman", [id]), ref);

  it("does not touch the headline Fortitude total", () => {
    // Gillman Con +2 (mod +1): fighter L1 good Fort save (+2) + 1 = 3, same
    // with or without the trait since a category-scoped bonus never joins
    // the headline total.
    expect(base.saves.fort.total).toBe(3);
    expect(withTrait.saves.fort.total).toBe(3);
  });

  it("adds a +2 racial poison conditional on Fortitude only", () => {
    expect(withTrait.saves.fort.conditionals).toEqual([
      { total: 5, categories: ["poison"], labels: ["poison"] },
    ]);
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
    expect(withTrait.saves.will.conditionals).toBeUndefined();
  });
});

describe("Half-Orc Pariah (merges two categories into one Will line)", () => {
  const id = vendoredTraitId("Pariah", "Half-Orc");
  const base = compute(makeDoc("Half-Orc"), ref);
  const withTrait = compute(makeDoc("Half-Orc", [id]), ref);

  it("+2 racial vs. emotion and fear share one line since both total the same", () => {
    // Half-Orc has no Wis adjustment: poor Will save (+0) + Wis mod (0) = 0,
    // + the trait's +2 = 2. Fear and emotion are siblings under `mind`
    // (neither implies the other), so both categories are named on this one
    // line rather than one inheriting silently from the other.
    expect(base.saves.will.total).toBe(0);
    expect(withTrait.saves.will.conditionals).toEqual([
      { total: 2, categories: ["fear", "emotion"], labels: ["fear", "emotion"] },
    ]);
    expect(withTrait.saves.fort.conditionals).toBeUndefined();
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
  });
});

describe("Aasimar Deathless Spirit (deliberately partial; necromancy applies to every save)", () => {
  const id = vendoredTraitId("Deathless Spirit", "Aasimar");
  const base = compute(makeDoc("Aasimar"), ref);
  const withTrait = compute(makeDoc("Aasimar", [id]), ref);

  it("promotes death, energy drain (the level-draining effect), and the necromancy school", () => {
    // Aasimar has no Con adjustment: fighter L1 good Fort save (+2) + Con
    // mod (0) = 2, + the trait's +2 = 4. Negative energy DAMAGE (as opposed
    // to the negative levels energyDrain covers) still has no vocabulary
    // entry, so that clause alone stays prose.
    expect(base.saves.fort.total).toBe(2);
    expect(withTrait.saves.fort.conditionals).toEqual([
      {
        total: 4,
        categories: ["death", "energyDrain", "necromancy"],
        labels: ["death", "energy drain", "necromancy"],
      },
    ]);
  });

  it("necromancy also reaches Reflex and Will, unlike death and energy drain which are Fortitude-only", () => {
    // Aasimar Wis +2 (mod +1): Will floor = poor save (+0) + 1 = 1, + 2 =
    // 3. Ref floor = poor save (+0) + Dex mod (0) = 0, + 2 = 2. Only
    // "necromancy" names these lines, since death and energyDrain never
    // reach Reflex or Will.
    expect(base.saves.ref.total).toBe(0);
    expect(base.saves.will.total).toBe(1);
    expect(withTrait.saves.ref.conditionals).toEqual([
      { total: 2, categories: ["necromancy"], labels: ["necromancy"] },
    ]);
    expect(withTrait.saves.will.conditionals).toEqual([
      { total: 3, categories: ["necromancy"], labels: ["necromancy"] },
    ]);
  });

  it("the trait's second note (negative-energy resistance, no HP loss on a negative level) moves no additional save number", () => {
    // Deathless Spirit ships two allSavingThrows notes; only the death/energy
    // drain/necromancy one is in the table, so each save shows exactly one
    // conditional line.
    expect(withTrait.saves.fort.conditionals?.length).toBe(1);
    expect(withTrait.saves.ref.conditionals?.length).toBe(1);
    expect(withTrait.saves.will.conditionals?.length).toBe(1);
  });
});

describe("Ifrit Forge-Hardened (newly promoted: fatigue/exhaustion, Fortitude-only)", () => {
  const id = vendoredTraitId("Forge-Hardened", "Ifrit");
  const base = compute(makeDoc("Ifrit"), ref);
  const withTrait = compute(makeDoc("Ifrit", [id]), ref);

  it("adds a +2 racial fatigue/exhaustion conditional on Fortitude only", () => {
    // Ifrit has no Con adjustment: fighter L1 good Fort save (+2) + Con mod
    // (0) = 2, + the trait's +2 racial vs. fatigue/exhaustion = 4. The
    // Craft (armor and weapons) bonus alongside it is wired separately via
    // the racial-trait-changes data-pipeline supplement (skill.crf.armor /
    // skill.crf.weapons), not through this save-notes table.
    expect(base.saves.fort.total).toBe(2);
    expect(withTrait.saves.fort.conditionals).toEqual([
      { total: 4, categories: ["fatigue"], labels: ["fatigue/exhaustion"] },
    ]);
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
    expect(withTrait.saves.will.conditionals).toBeUndefined();
  });
});

describe("Human Reptilian Ancestry (one note, two categories, two different saves)", () => {
  const id = vendoredTraitId("Reptilian Ancestry", "Human");
  const base = compute(makeDoc("Human"), ref);
  const withTrait = compute(makeDoc("Human", [id]), ref);

  it("poison lands on Fortitude and mind-affecting lands on Will, as separate lines", () => {
    // Human has no ability adjustments here: Fort = good save (+2) + Con mod
    // (0) = 2, + 2 poison = 4. Will = poor save (+0) + Wis mod (0) = 0, + 2
    // mind = 2. They stay separate lines (rather than merging) because
    // `poison` only ever applies to Fortitude and `mind` only to Will.
    expect(base.saves.fort.total).toBe(2);
    expect(base.saves.will.total).toBe(0);
    expect(withTrait.saves.fort.conditionals).toEqual([
      { total: 4, categories: ["poison"], labels: ["poison"] },
    ]);
    expect(withTrait.saves.will.conditionals).toEqual([
      { total: 2, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
  });
});

describe("Halfling Practicality (untyped bonus, Will-only, coexists with the standard Fearless line)", () => {
  const id = vendoredTraitId("Practicality", "Halfling");
  const base = compute(makeDoc("Halfling"), ref);
  const withTrait = compute(makeDoc("Halfling", [id]), ref);

  it("Fearless's own +2 vs. fear conditional is present even with no trait picked", () => {
    // Halfling Wis is unadjusted: Will floor is poor save (+0) + Wis mod (0)
    // = 0, plus halfling luck's +1 racial in the headline, plus the standard
    // Fearless trait's own scoped +2 vs. fear (race-save-notes.ts, untyped so
    // that it stacks with halfling luck as the Core Rulebook says it does) =
    // 3. This fixture only pins that the baseline number exists unrelated to
    // Practicality; see the next test for what Practicality itself adds.
    expect(base.saves.will.conditionals).toEqual([
      { total: 3, categories: ["fear"], labels: ["fear"] },
    ]);
  });

  it("Practicality adds its own untyped +2 vs. illusions, stacking on top of the headline", () => {
    // Halfling's unconditional Will total (poor save +0, Wis mod 0, +1
    // halfling luck already in the headline) is 1. Untyped bonuses sum
    // rather than compete for a type slot, so this adds cleanly on top:
    // 1 + 2 = 3. Fearless is untyped for the same reason and lands on the
    // same 3, so the two merge into a single line rather than repeating the
    // number. The vendored Practicality entry does not suppress Fearless.
    expect(base.saves.will.total).toBe(1);
    expect(withTrait.saves.will.conditionals).toEqual([
      { total: 3, categories: ["fear", "illusion"], labels: ["fear", "illusions"] },
    ]);
    expect(withTrait.saves.fort.conditionals).toBeUndefined();
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
  });
});

describe("Elf Blightborn (widened: necromancy and energy drain now promote alongside curse)", () => {
  const id = vendoredTraitId("Blightborn", "Elf");
  const base = compute(makeDoc("Elf"), ref);
  const withTrait = compute(makeDoc("Elf", [id]), ref);

  it("Fortitude merges curse, necromancy, and energy drain (removing negative levels) into one line", () => {
    // Elf Con -2 (mod -1): Fort = good save (+2) - 1 = 1. Blightborn ships
    // two separate allSavingThrows notes now that both promote: +2 racial
    // vs. curse/necromancy, and +2 racial vs. energy drain (removing
    // temporary negative levels). Both are the same type (racial) and the
    // same value, so they stack to a single +2 rather than +4, landing all
    // three category names on one merged line: 1 + 2 = 3.
    expect(base.saves.fort.total).toBe(1);
    expect(withTrait.saves.fort.conditionals).toEqual([
      {
        total: 3,
        categories: ["energyDrain", "necromancy", "curse"],
        labels: ["energy drain", "necromancy", "curses"],
      },
    ]);
  });

  it("Reflex only sees necromancy and curse (energy drain is Fortitude-only)", () => {
    // Elf Dex +2 (mod +1): Ref = poor save (+0) + 1 = 1, + 2 = 3.
    expect(base.saves.ref.total).toBe(1);
    expect(withTrait.saves.ref.conditionals).toEqual([
      { total: 3, categories: ["necromancy", "curse"], labels: ["necromancy", "curses"] },
    ]);
  });

  it("on Will, the necromancy/curse line merges with Elf's own unrelated Elven Immunities enchantment bonus", () => {
    // Elf has no Wis adjustment: Will = poor save (+0) + 0 = 0. Elven
    // Immunities' standard +2 racial vs. enchantment (race-save-notes.ts) and
    // Blightborn's +2 racial vs. curse/necromancy resolve to the same total
    // (2), so the situational-total mechanism prints one merged line rather
    // than separate identical ones — the same same-type, same-value merge
    // behavior `save-categories.ts` documents.
    expect(base.saves.will.total).toBe(0);
    expect(withTrait.saves.will.conditionals).toEqual([
      {
        total: 2,
        categories: ["necromancy", "enchantment", "curse"],
        labels: ["necromancy", "enchantment", "curses"],
      },
    ]);
  });

  it("every save still shows exactly one merged line (no unrelated third conditional appears)", () => {
    expect(withTrait.saves.fort.conditionals?.length).toBe(1);
    expect(withTrait.saves.ref.conditionals?.length).toBe(1);
    expect(withTrait.saves.will.conditionals?.length).toBe(1);
  });
});

describe("Gnome Nosophobia (fort-targeted note promotes like an allSavingThrows one)", () => {
  const id = vendoredTraitId("Nosophobia", "Gnome");
  const base = compute(makeDoc("Gnome"), ref);
  const withTrait = compute(makeDoc("Gnome", [id]), ref);

  it("does not touch the headline Fortitude total", () => {
    // Gnome Con +2 (mod +1): fighter L1 good Fort save (+2) + 1 = 3.
    expect(base.saves.fort.total).toBe(3);
    expect(withTrait.saves.fort.total).toBe(3);
  });

  it("adds a +4 racial disease/poison conditional on Fortitude only", () => {
    // "These gnomes gain a +4 bonus on Fortitude saves against disease and
    // poison, including magical diseases." (Advanced Player's Guide). The
    // vendored note targets `fort` rather than `allSavingThrows`; the
    // promotion is identical because both categories only reach Fortitude.
    expect(withTrait.saves.fort.conditionals).toEqual([
      { total: 7, categories: ["poison", "disease"], labels: ["poison", "disease"] },
    ]);
    expect(withTrait.saves.ref.conditionals).toBeUndefined();
    // Gnome's own standard +2 racial vs. illusion (race-save-notes.ts) is the
    // only Will line, unchanged by this trait.
    expect(withTrait.saves.will.conditionals).toEqual(base.saves.will.conditionals);
  });
});

describe("Dwarf Stubborn (supplement-authored scoped Will bonus)", () => {
  const id = vendoredTraitId("Stubborn", "Dwarf");
  const base = compute(makeDoc("Dwarf"), ref);
  const withTrait = compute(makeDoc("Dwarf", [id]), ref);

  it("does not touch the headline Will total", () => {
    // Dwarf Wis +2 (mod +1): fighter L1 poor Will save (+0) + 1 = 1.
    expect(base.saves.will.total).toBe(1);
    expect(withTrait.saves.will.total).toBe(1);
  });

  it("adds a +2 racial charm/compulsion conditional on Will, merged with Hardy's line", () => {
    // "Dwarves with this racial trait receive a +2 racial bonus on Will
    // saves to resist spells and spell-like abilities of the enchantment
    // (charm) and enchantment (compulsion) schools." (Advanced Player's
    // Guide). The failed-save re-roll clause stays prose. Will = 1 + 2 = 3.
    // Dwarf's own Hardy (+2 racial vs. spells and SLAs, race-save-notes.ts)
    // resolves to the same Will total, so the two print one merged line —
    // the same same-type, same-value merge the Blightborn fixture documents.
    // (Stubborn REPLACES Hardy in print; retiring the note-only standard
    // trait stays a picker-side reminder, see `RacialTrait.replacedTraitNames`.)
    expect(withTrait.saves.will.conditionals).toEqual([
      {
        total: 3,
        categories: ["spell", "sla", "charm", "compulsion"],
        labels: ["spells", "SLAs", "charm", "compulsion"],
      },
    ]);
  });
});
