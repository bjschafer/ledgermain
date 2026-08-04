/**
 * Unit tests for `model/languageCatalog.ts`: catalog integrity (unique ids,
 * Druidic flagged secret) and per-race bonus-language option lookups.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  bonusLanguageOptionsForRace,
  catalogLanguage,
  LANGUAGE_CATALOG,
} from "../src/model/languageCatalog.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

describe("LANGUAGE_CATALOG", () => {
  it("has unique ids", () => {
    const ids = LANGUAGE_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique display names", () => {
    const names = LANGUAGE_CATALOG.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("flags Druidic as secret and every other entry as not secret", () => {
    const druidic = LANGUAGE_CATALOG.find((entry) => entry.id === "druidic");
    expect(druidic?.secret).toBe(true);
    const others = LANGUAGE_CATALOG.filter((entry) => entry.id !== "druidic");
    expect(others.every((entry) => !entry.secret)).toBe(true);
  });

  it("covers Common plus the standard racial and exotic sets", () => {
    const ids = new Set(LANGUAGE_CATALOG.map((entry) => entry.id));
    for (const id of [
      "common",
      "abyssal",
      "aklo",
      "aquan",
      "auran",
      "celestial",
      "draconic",
      "druidic",
      "dwarven",
      "elven",
      "giant",
      "gnome",
      "goblin",
      "gnoll",
      "halfling",
      "ignan",
      "infernal",
      "orc",
      "sylvan",
      "terran",
      "undercommon",
      "necril",
      "thassilonian",
      "varisian",
      "osiriani",
      "polyglot",
      "shadowtongue",
      "tien",
      "vudrani",
      "kelish",
      "skald",
      "hallit",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe("catalogLanguage()", () => {
  it("resolves a known id case-insensitively", () => {
    expect(catalogLanguage("elven")?.name).toBe("Elven");
    expect(catalogLanguage("ELVEN")?.name).toBe("Elven");
  });

  it("returns undefined for an id the catalog doesn't cover", () => {
    expect(catalogLanguage("lashunta")).toBeUndefined();
  });
});

describe("bonusLanguageOptionsForRace()", () => {
  it("returns a fixed catalog-id list for Dwarf", () => {
    const doc = {
      ...createEmptyDoc("t"),
      identity: { ...createEmptyDoc("t").identity, race: raceId("Dwarf") },
    };
    expect(bonusLanguageOptionsForRace(doc, ref)).toEqual([
      "giant",
      "gnome",
      "goblin",
      "orc",
      "terran",
      "undercommon",
    ]);
  });

  it('returns "any" for Human', () => {
    const doc = {
      ...createEmptyDoc("t"),
      identity: { ...createEmptyDoc("t").identity, race: raceId("Human") },
    };
    expect(bonusLanguageOptionsForRace(doc, ref)).toBe("any");
  });

  it('returns "any" for Half-Elf', () => {
    const doc = {
      ...createEmptyDoc("t"),
      identity: { ...createEmptyDoc("t").identity, race: raceId("Half-Elf") },
    };
    expect(bonusLanguageOptionsForRace(doc, ref)).toBe("any");
  });

  it('returns a fixed list for Half-Orc (not "any" — verified against the CRB entry)', () => {
    const doc = {
      ...createEmptyDoc("t"),
      identity: { ...createEmptyDoc("t").identity, race: raceId("Half-Orc") },
    };
    expect(bonusLanguageOptionsForRace(doc, ref)).toEqual([
      "abyssal",
      "draconic",
      "giant",
      "gnoll",
      "goblin",
    ]);
  });

  it('returns "any" for a race with no authored entry', () => {
    const doc = {
      ...createEmptyDoc("t"),
      identity: { ...createEmptyDoc("t").identity, race: raceId("Kitsune") },
    };
    expect(bonusLanguageOptionsForRace(doc, ref)).toBe("any");
  });

  it('returns "any" when no race is chosen', () => {
    expect(bonusLanguageOptionsForRace(createEmptyDoc("t"), ref)).toBe("any");
  });
});
