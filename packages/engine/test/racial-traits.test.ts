/**
 * Hand-computed fixture tests for alternate racial traits (issue #35). These
 * exercise the two operations `collect.ts` performs for an active trait: apply
 * the alternate's own `changes[]`, and suppress the replaced standard trait's
 * structured `Race.change` (`suppressTargets`). All assertions are made against
 * observable `DerivedSheet` numbers (skills, saves, initiative), and the
 * suppression is proven by comparing against the same race with no trait.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, raceContextNotesFor } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Fighter L1, all abilities 10 (mod 0) before racial changes, no gear. */
function makeDoc(raceName: string, racialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `art-test-${raceName}`,
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
      racialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Halfling Outrider (suppress + grant, both sheet-observable)", () => {
  const base = compute(makeDoc("Halfling"), ref);
  const withTrait = compute(makeDoc("Halfling", ["halfling-outrider"]), ref);

  it("standard Sure-Footed grants +2 Acrobatics / +2 Climb without the trait", () => {
    // Halfling Dex +2 (mod +1): Acrobatics (Dex) = 1 + racial 2 = 3.
    // Halfling Str -2 (mod -1): Climb (Str) = -1 + racial 2 = 1.
    expect(base.skills.acr!.total).toBe(3);
    expect(base.skills.clm!.total).toBe(1);
  });

  it("Outrider suppresses the Acrobatics/Climb racial bonus", () => {
    // racial +2 gone → only the ability mod remains (Dex +1 / Str -1).
    expect(withTrait.skills.acr!.total).toBe(1);
    expect(withTrait.skills.clm!.total).toBe(-1);
  });

  it("Outrider grants +2 racial to Ride and Handle Animal", () => {
    // Ride is Dex-based (+1 mod) → 1 + racial 2 = 3; Handle Animal is Cha-based
    // (Halfling Cha +2, mod +1) → 1 + racial 2 = 3.
    expect(withTrait.skills.rid!.total).toBe(base.skills.rid!.total + 2);
    expect(withTrait.skills.han!.total).toBe(base.skills.han!.total + 2);
  });
});

describe("Half-Orc Sacred Tattoo (grant only, no suppression)", () => {
  const base = compute(makeDoc("Half-Orc"), ref);
  const withTrait = compute(makeDoc("Half-Orc", ["half-orc-sacred-tattoo"]), ref);

  it("adds +1 luck to all saving throws", () => {
    expect(withTrait.saves.fort.total).toBe(base.saves.fort.total + 1);
    expect(withTrait.saves.ref.total).toBe(base.saves.ref.total + 1);
    expect(withTrait.saves.will.total).toBe(base.saves.will.total + 1);
  });
});

describe("Elf Fleet-Footed (suppress Keen Senses, grant initiative)", () => {
  const base = compute(makeDoc("Elf"), ref);
  const withTrait = compute(makeDoc("Elf", ["elf-fleet-footed"]), ref);

  it("suppresses the +2 Perception racial bonus", () => {
    expect(withTrait.skills.per!.total).toBe(base.skills.per!.total - 2);
  });

  it("grants +2 initiative", () => {
    expect(withTrait.initiative.total).toBe(base.initiative.total + 2);
  });
});

describe("Sylph Like the Wind (base-speed delta, +5 ft)", () => {
  it("bumps land speed from 30 to 35", () => {
    const base = compute(makeDoc("Sylph"), ref);
    const withTrait = compute(makeDoc("Sylph", ["sylph-like-the-wind"]), ref);
    expect(base.speeds.land).toBe(30);
    expect(withTrait.speeds.land).toBe(35);
  });
});

describe("Sylph Whispering Wind (+4 racial Stealth, stacks with ranks/Dex)", () => {
  it("adds +4 on top of existing Dex mod and ranks", () => {
    const base = compute(makeDoc("Sylph"), ref);
    const withTrait = compute(makeDoc("Sylph", ["sylph-whispering-wind"]), ref);
    expect(withTrait.skills.ste!.total).toBe(base.skills.ste!.total + 4);
  });

  it("stacks correctly alongside ranks and a Dex bump (not a flat override)", () => {
    // Sylph Dex +2 (mod +1) baseline; add 3 skill ranks (class skill for
    // fighter is false, so no +3 class-skill bonus — just ranks + ability +
    // the racial 4) to prove the racial bonus composes rather than replacing
    // the skill total outright.
    const doc = makeDoc("Sylph", ["sylph-whispering-wind"]);
    doc.build.skillRanks = { ste: 3 };
    const withRanks = compute(doc, ref);
    const plainDoc = makeDoc("Sylph");
    plainDoc.build.skillRanks = { ste: 3 };
    const plainWithRanks = compute(plainDoc, ref);
    expect(withRanks.skills.ste!.total).toBe(plainWithRanks.skills.ste!.total + 4);
  });
});

describe("Sylph Storm in the Blood (displayOnly, no flat change)", () => {
  it("appears with no computed change and a contextNote reminder", () => {
    const base = compute(makeDoc("Sylph"), ref);
    const withTrait = compute(makeDoc("Sylph", ["sylph-storm-in-the-blood"]), ref);
    // No sheet number changes — this is display-only / situational.
    expect(withTrait.hp.max).toBe(base.hp.max);
    expect(withTrait.saves).toEqual(base.saves);
    expect(withTrait.skills).toEqual(base.skills);
  });
});

describe("Sylph Mostly Human (displayOnly, no flat change)", () => {
  it("has no computed change (type/subtype/language swap only)", () => {
    const base = compute(makeDoc("Sylph"), ref);
    const withTrait = compute(makeDoc("Sylph", ["sylph-mostly-human"]), ref);
    expect(withTrait.saves).toEqual(base.saves);
    expect(withTrait.skills).toEqual(base.skills);
    expect(withTrait.speeds).toEqual(base.speeds);
  });
});

describe("guards", () => {
  it("ignores an alternate racial trait whose race doesn't match", () => {
    // A Halfling trait id on a Half-Orc must be inert.
    const doc = compute(makeDoc("Half-Orc", ["halfling-outrider"]), ref);
    const clean = compute(makeDoc("Half-Orc"), ref);
    expect(doc.saves.fort.total).toBe(clean.saves.fort.total);
    expect(doc.skills.rid?.total).toBe(clean.skills.rid?.total);
  });

  it("ignores an unknown trait id without throwing", () => {
    expect(() => compute(makeDoc("Elf", ["not-a-real-trait"]), ref)).not.toThrow();
  });
});

describe("race contextNote suppression (issue #41)", () => {
  // Dwarf's standard traits are all Race.contextNotes (Stability/Stonecunning/
  // Defensive Training/Hardy/Greed/Hatred). An alternate that replaces one of
  // them should hide only that trait's note, leaving the rest untouched.
  const dwarfId = raceId("Dwarf");
  const elfId = raceId("Elf");
  const gnomeId = raceId("Gnome");

  it("Dwarf with no alternate: Greed's contextNote is present", () => {
    const notes = raceContextNotesFor(makeDoc("Dwarf"), ref.races[dwarfId]);
    expect(notes.some((n) => n.text.includes("Appraise Items with Gems"))).toBe(true);
  });

  it("Dwarf with Lorekeeper: Greed's contextNote is dropped, unrelated notes remain", () => {
    const notes = raceContextNotesFor(makeDoc("Dwarf", ["dwarf-lorekeeper"]), ref.races[dwarfId]);
    expect(notes.some((n) => n.text.includes("Appraise Items with Gems"))).toBe(false);
    // Hardy is a different standard trait, not replaced by Lorekeeper — still shows.
    expect(notes.some((n) => n.text.includes("Poisons, Spells and Spell-likes"))).toBe(true);
  });

  it("Dwarf with Steel Soul: Hardy's contextNote is dropped, Greed's remains", () => {
    const notes = raceContextNotesFor(makeDoc("Dwarf", ["dwarf-steel-soul"]), ref.races[dwarfId]);
    expect(notes.some((n) => n.text.includes("Poisons, Spells and Spell-likes"))).toBe(false);
    expect(notes.some((n) => n.text.includes("Appraise Items with Gems"))).toBe(true);
  });

  it("Dwarf with Rock Stepper: Stonecunning's contextNote is dropped", () => {
    const notes = raceContextNotesFor(makeDoc("Dwarf", ["dwarf-rock-stepper"]), ref.races[dwarfId]);
    expect(notes.some((n) => n.text.includes("Notice Unusual Stonework"))).toBe(false);
  });

  // Elf's ONLY contextNote-only standard trait is Elven Magic (Keen Senses is
  // a structured Change, already covered by suppressTargets) — all three of
  // its vendored contextNotes belong to it.
  it("Elf with no alternate: Elven Magic's three contextNotes are all present", () => {
    const notes = raceContextNotesFor(makeDoc("Elf"), ref.races[elfId]);
    expect(notes.length).toBe(3);
  });

  it("Elf Fleet-Footed: Elven Magic's contextNotes are all dropped", () => {
    const notes = raceContextNotesFor(makeDoc("Elf", ["elf-fleet-footed"]), ref.races[elfId]);
    expect(notes.length).toBe(0);
  });

  it("Elf Dreamspeaker: Elven Magic's contextNotes are all dropped too", () => {
    const notes = raceContextNotesFor(makeDoc("Elf", ["elf-dreamspeaker"]), ref.races[elfId]);
    expect(notes.length).toBe(0);
  });

  // Gnome has a THIRD contextNote (Illusion Resistance) that no current
  // alternate replaces — proves the substring match doesn't over-suppress
  // just because it shares a `allSavingThrows`/`ac` target family.
  it("Gnome with no alternate: all three contextNotes present", () => {
    const notes = raceContextNotesFor(makeDoc("Gnome"), ref.races[gnomeId]);
    expect(notes.length).toBe(3);
  });

  it("Gnome Gift of Tongues: Defensive Training + Hatred dropped, Illusion Resistance remains", () => {
    const notes = raceContextNotesFor(
      makeDoc("Gnome", ["gnome-gift-of-tongues"]),
      ref.races[gnomeId],
    );
    expect(notes.some((n) => n.text.includes("Dodge vs Giants"))).toBe(false);
    expect(notes.some((n) => n.text.includes("Humanoids (Reptillian, Goblinoid)"))).toBe(false);
    expect(notes.some((n) => n.text.includes("Illusion Effects"))).toBe(true);
  });

  it("Gnome Eternal Hope: Defensive Training + Hatred dropped too", () => {
    const notes = raceContextNotesFor(makeDoc("Gnome", ["gnome-eternal-hope"]), ref.races[gnomeId]);
    expect(notes.some((n) => n.text.includes("Dodge vs Giants"))).toBe(false);
    expect(notes.some((n) => n.text.includes("Humanoids (Reptillian, Goblinoid)"))).toBe(false);
  });

  it("a trait id that doesn't match the character's current race suppresses nothing (stale/mismatched id)", () => {
    const notes = raceContextNotesFor(makeDoc("Dwarf", ["elf-fleet-footed"]), ref.races[dwarfId]);
    expect(notes.some((n) => n.text.includes("Appraise Items with Gems"))).toBe(true);
  });

  it("numeric suppression is unchanged: Elf Fleet-Footed still suppresses Perception numerically", () => {
    // Guards against suppressNotes accidentally feeding into the numeric
    // pipeline — it's a separate, purely display-oriented mechanism.
    const base = compute(makeDoc("Elf"), ref);
    const withTrait = compute(makeDoc("Elf", ["elf-fleet-footed"]), ref);
    expect(withTrait.skills.per!.total).toBe(base.skills.per!.total - 2);
  });
});
