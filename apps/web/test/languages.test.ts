/**
 * Unit tests for `model/languages.ts` (issue #25): racial languages, the
 * combined display list, the suggested bonus-language count, and label
 * formatting.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  combinedLanguages,
  languageLabel,
  racialLanguages,
  suggestedBonusLanguageCount,
} from "../src/model/languages.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function withRace(race: string, bonusLanguages?: string[]): CharacterDoc {
  const doc = createEmptyDoc("t");
  return {
    ...doc,
    identity: { ...doc.identity, race: raceId(race) },
    build: { ...doc.build, bonusLanguages },
  };
}

describe("languageLabel()", () => {
  it("capitalizes the first letter", () => {
    expect(languageLabel("elven")).toBe("Elven");
  });

  it("leaves an empty string as-is", () => {
    expect(languageLabel("")).toBe("");
  });
});

describe("racialLanguages()", () => {
  it("returns the race's languages (Elf: Common + Elven)", () => {
    expect(racialLanguages(withRace("Elf"), ref)).toEqual(["common", "elven"]);
  });

  it("returns [] when no race is chosen", () => {
    expect(racialLanguages(createEmptyDoc("t"), ref)).toEqual([]);
  });

  it("returns [] for an unknown race id", () => {
    const doc = createEmptyDoc("t");
    const withUnknown: CharacterDoc = { ...doc, identity: { ...doc.identity, race: "nope" } };
    expect(racialLanguages(withUnknown, ref)).toEqual([]);
  });
});

describe("combinedLanguages()", () => {
  it("combines racial (labeled) + bonus languages", () => {
    const doc = withRace("Elf", ["Draconic"]);
    expect(combinedLanguages(doc, ref)).toEqual(["Common", "Elven", "Draconic"]);
  });

  it("dedupes a bonus language that re-types a racial one, case-insensitively", () => {
    const doc = withRace("Elf", ["elven", "Draconic"]);
    expect(combinedLanguages(doc, ref)).toEqual(["Common", "Elven", "Draconic"]);
  });

  it("returns just racial languages when no bonus languages are set", () => {
    expect(combinedLanguages(withRace("Elf"), ref)).toEqual(["Common", "Elven"]);
  });

  it("returns [] for a document with no race and no bonus languages", () => {
    expect(combinedLanguages(createEmptyDoc("t"), ref)).toEqual([]);
  });
});

describe("suggestedBonusLanguageCount()", () => {
  it("a positive Int modifier alone suggests that many", () => {
    const doc = createEmptyDoc("t");
    expect(suggestedBonusLanguageCount(doc, 3)).toBe(3);
  });

  it("a zero or negative Int modifier contributes nothing", () => {
    const doc = createEmptyDoc("t");
    expect(suggestedBonusLanguageCount(doc, 0)).toBe(0);
    expect(suggestedBonusLanguageCount(doc, -2)).toBe(0);
  });

  it("adds Linguistics ranks on top of a positive Int modifier", () => {
    const doc = createEmptyDoc("t");
    const withRanks: CharacterDoc = {
      ...doc,
      build: { ...doc.build, skillRanks: { lin: 4 } },
    };
    expect(suggestedBonusLanguageCount(withRanks, 2)).toBe(6);
  });

  it("Linguistics ranks count even with a non-positive Int modifier", () => {
    const doc = createEmptyDoc("t");
    const withRanks: CharacterDoc = {
      ...doc,
      build: { ...doc.build, skillRanks: { lin: 2 } },
    };
    expect(suggestedBonusLanguageCount(withRanks, -1)).toBe(2);
  });
});
