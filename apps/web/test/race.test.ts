/**
 * Half-Elf Multitalented (issue #4): half-elves pick TWO favored classes,
 * earning the FCB choice for a level in EITHER one. There's no structured
 * RefData flag for this — see model/race.ts doc comment — so these tests
 * exercise the race-name-keyed detection plus the combined-level budget math
 * against the real vendored dataset.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc, setFavoredClass, setFavoredClass2, setRace } from "../src/model/doc.js";
import { favoredClassBonusLevels, isMultitalented } from "../src/model/race.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function withClasses(doc: CharacterDoc, classes: { tag: string; level: number }[]): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, classes } };
}

describe("isMultitalented()", () => {
  it("true for Half-Elf", () => {
    const doc = setRace(createEmptyDoc("t"), raceId("Half-Elf"));
    expect(isMultitalented(doc, ref)).toBe(true);
  });

  it("false for every other race (e.g. Human, Elf)", () => {
    expect(isMultitalented(setRace(createEmptyDoc("t"), raceId("Human")), ref)).toBe(false);
    expect(isMultitalented(setRace(createEmptyDoc("t"), raceId("Elf")), ref)).toBe(false);
  });

  it("false when no race is set yet", () => {
    expect(isMultitalented(createEmptyDoc("t"), ref)).toBe(false);
  });
});

describe("favoredClassBonusLevels() — multiclass Half-Elf budget math", () => {
  it("single favored class: budget = that class's level (non-Multitalented race)", () => {
    let doc = setRace(createEmptyDoc("t"), raceId("Human"));
    doc = withClasses(doc, [
      { tag: "fighter", level: 5 },
      { tag: "rogue", level: 2 },
    ]);
    doc = setFavoredClass(doc, "fighter");
    expect(favoredClassBonusLevels(doc, ref)).toBe(5);
  });

  it("Half-Elf with only a primary favored class picked: same as single-class budget", () => {
    let doc = setRace(createEmptyDoc("t"), raceId("Half-Elf"));
    doc = withClasses(doc, [
      { tag: "fighter", level: 5 },
      { tag: "rogue", level: 2 },
    ]);
    doc = setFavoredClass(doc, "fighter");
    expect(favoredClassBonusLevels(doc, ref)).toBe(5);
  });

  it("Half-Elf Multitalented with both favored classes picked: sums both levels", () => {
    let doc = setRace(createEmptyDoc("t"), raceId("Half-Elf"));
    doc = withClasses(doc, [
      { tag: "fighter", level: 5 },
      { tag: "rogue", level: 2 },
    ]);
    doc = setFavoredClass(doc, "fighter");
    doc = setFavoredClass2(doc, "rogue");
    expect(favoredClassBonusLevels(doc, ref)).toBe(7);
  });

  it("a non-Multitalented race's stray favoredClass2 (e.g. left over from a race change) is ignored", () => {
    let doc = withClasses(setRace(createEmptyDoc("t"), raceId("Half-Elf")), [
      { tag: "fighter", level: 5 },
      { tag: "rogue", level: 2 },
    ]);
    doc = setFavoredClass(doc, "fighter");
    doc = setFavoredClass2(doc, "rogue");
    // Switch races after picking a 2nd favored class — setRace clears it, but
    // favoredClassBonusLevels is independently defensive even if it didn't.
    doc = { ...doc, identity: { ...doc.identity, race: raceId("Human"), favoredClass2: "rogue" } };
    expect(favoredClassBonusLevels(doc, ref)).toBe(5);
  });
});

describe("setFavoredClass2()", () => {
  it("sets the 2nd favored class", () => {
    const doc = setFavoredClass2(createEmptyDoc("t"), "rogue");
    expect(doc.identity.favoredClass2).toBe("rogue");
  });

  it("clears it when passed null", () => {
    let doc = setFavoredClass2(createEmptyDoc("t"), "rogue");
    doc = setFavoredClass2(doc, null);
    expect(doc.identity.favoredClass2).toBeUndefined();
  });

  it("is a no-op when the tag matches the primary favored class (never a duplicate)", () => {
    let doc = setFavoredClass(createEmptyDoc("t"), "fighter");
    doc = setFavoredClass2(doc, "fighter");
    expect(doc.identity.favoredClass2).toBeUndefined();
  });
});

describe("setFavoredClass()", () => {
  it("clears an existing 2nd favored class if it now matches the primary", () => {
    let doc = setFavoredClass2(createEmptyDoc("t"), "rogue");
    doc = setFavoredClass(doc, "rogue");
    expect(doc.identity.favoredClass).toBe("rogue");
    expect(doc.identity.favoredClass2).toBeUndefined();
  });

  it("leaves a distinct 2nd favored class alone", () => {
    let doc = setFavoredClass2(createEmptyDoc("t"), "rogue");
    doc = setFavoredClass(doc, "fighter");
    expect(doc.identity.favoredClass2).toBe("rogue");
  });
});

describe("setRace()", () => {
  it("clears favoredClass2 on a race change", () => {
    let doc = setRace(createEmptyDoc("t"), raceId("Half-Elf"));
    doc = setFavoredClass2(doc, "rogue");
    doc = setRace(doc, raceId("Human"));
    expect(doc.identity.favoredClass2).toBeUndefined();
  });
});
