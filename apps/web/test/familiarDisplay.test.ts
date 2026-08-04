import { describe, expect, it } from "bun:test";

import { BASE_FAMILIARS, FAMILIARS } from "@pf1/engine";

import {
  familiarSpeciesOptions,
  filterFamiliarSpecies,
  formatFamiliarMasterBonus,
  formatFamiliarSpeciesAttacks,
  formatFamiliarSpeciesSummary,
} from "../src/model/familiarDisplay.js";

describe("formatFamiliarMasterBonus", () => {
  it("formats a skill.<id> change with its full skill name", () => {
    expect(formatFamiliarMasterBonus(FAMILIARS.cat!)).toBe("+3 Stealth");
    expect(formatFamiliarMasterBonus(FAMILIARS.bat!)).toBe("+3 Fly");
  });

  it("formats a save/init/hp/natural-armor change with its own label", () => {
    expect(formatFamiliarMasterBonus(FAMILIARS.rat!)).toBe("+2 Fortitude saves");
    expect(formatFamiliarMasterBonus(FAMILIARS.weasel!)).toBe("+2 Reflex saves");
    expect(formatFamiliarMasterBonus(FAMILIARS.toad!)).toBe("+3 hit points");
    expect(formatFamiliarMasterBonus(FAMILIARS.scorpion!)).toBe("+4 Initiative checks");
    expect(formatFamiliarMasterBonus(FAMILIARS.turtle!)).toBe("+1 natural armor bonus to AC");
  });

  it("returns undefined for a species with no mechanical change (conditional note only)", () => {
    expect(formatFamiliarMasterBonus(FAMILIARS.hawk!)).toBeUndefined();
    expect(FAMILIARS.hawk!.note).toContain("Perception");
    expect(formatFamiliarMasterBonus(FAMILIARS["king-crab"]!)).toBeUndefined();
    expect(FAMILIARS["king-crab"]!.note).toContain("grapple");
  });
});

describe("formatFamiliarSpeciesAttacks", () => {
  it("pluralizes a multi-count attack", () => {
    expect(formatFamiliarSpeciesAttacks(BASE_FAMILIARS.cat!.attacks)).toBe("2 claws, bite");
  });

  it("returns an empty string for a species with no natural attacks (toad)", () => {
    expect(formatFamiliarSpeciesAttacks(BASE_FAMILIARS.toad!.attacks)).toBe("");
  });
});

describe("formatFamiliarSpeciesSummary", () => {
  it("joins size, speed, and senses with the app's separator", () => {
    expect(formatFamiliarSpeciesSummary(BASE_FAMILIARS.bat!)).toBe(
      "Dim · Speed 5 ft., fly 40 ft. · Blindsense 20 ft., low-light vision",
    );
  });
});

describe("familiarSpeciesOptions", () => {
  const options = familiarSpeciesOptions();

  it("includes every species in BASE_FAMILIARS exactly once", () => {
    expect(options).toHaveLength(Object.keys(BASE_FAMILIARS).length);
    expect(new Set(options.map((o) => o.id)).size).toBe(options.length);
  });

  it("is sorted alphabetically by display name", () => {
    const names = options.map((o) => o.species.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("carries each option's master bonus / note from FAMILIARS", () => {
    const cat = options.find((o) => o.id === "cat");
    expect(cat?.masterBonus).toBe("+3 Stealth");
    expect(cat?.masterBonusNote).toBeUndefined();

    const hawk = options.find((o) => o.id === "hawk");
    expect(hawk?.masterBonus).toBeUndefined();
    expect(hawk?.masterBonusNote).toContain("Perception");
  });
});

describe("filterFamiliarSpecies", () => {
  const options = familiarSpeciesOptions();

  it("returns everything for a blank query", () => {
    expect(filterFamiliarSpecies(options, "")).toHaveLength(options.length);
    expect(filterFamiliarSpecies(options, "   ")).toHaveLength(options.length);
  });

  it("matches case-insensitively against the display name", () => {
    const shown = filterFamiliarSpecies(options, "OWL");
    expect(shown.map((o) => o.id)).toEqual(["owl"]);
  });

  it("matches a substring anywhere in the name, e.g. a parenthetical", () => {
    const shown = filterFamiliarSpecies(options, "snake");
    expect(shown.map((o) => o.id)).toEqual(["viper"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterFamiliarSpecies(options, "dire tiger")).toEqual([]);
  });
});
