/**
 * Display-formatting of a spell's at-the-table facts — range, duration,
 * components, and damage — resolved to a concrete caster level. Fixtures use
 * real vendored spells (Fireball, Magic Missile, Cure Light Wounds) so the
 * @cl-scaled range bands / durations / damage formulas exercise the actual
 * data shapes, not synthetic ones.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { RefData, Spell } from "@pf1/schema";

import {
  formatSpellComponents,
  formatSpellDuration,
  formatSpellRange,
  spellDamageParts,
} from "../src/model/spellStats.js";

const refData: RefData = loadRefData();

function spellByName(name: string): Spell {
  const found = Object.values(refData.spells).find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  if (!found) throw new Error(`spell not found: ${name}`);
  return found;
}

describe("formatSpellRange", () => {
  it("resolves the medium band to a distance at the caster level", () => {
    // medium = 100 ft. + 10 ft./level
    const missile = spellByName("Magic Missile");
    expect(formatSpellRange(missile, 4)).toBe("Medium (140 ft.)");
    expect(formatSpellRange(missile, 1)).toBe("Medium (110 ft.)");
  });

  it("resolves the long band", () => {
    // long = 400 ft. + 40 ft./level
    const fireball = spellByName("Fireball");
    expect(formatSpellRange(fireball, 5)).toBe("Long (600 ft.)");
  });

  it("resolves the close band with its half-level step", () => {
    // close = 25 ft. + 5 ft./2 levels
    const ray = spellByName("Scorching Ray");
    expect(formatSpellRange(ray, 7)).toBe("Close (40 ft.)"); // 25 + 5*3
  });

  it("shows Touch verbatim for a touch spell", () => {
    expect(formatSpellRange(spellByName("Cure Light Wounds"), 7)).toBe("Touch");
  });
});

describe("formatSpellDuration", () => {
  it("labels an instantaneous spell", () => {
    expect(formatSpellDuration(spellByName("Fireball"), 5)).toBe("Instantaneous");
    expect(formatSpellDuration(spellByName("Magic Missile"), 5)).toBe("Instantaneous");
  });
});

describe("formatSpellComponents", () => {
  it("joins the present components in V, S, M order", () => {
    // Magic Missile: V, S (no material)
    expect(formatSpellComponents(spellByName("Magic Missile"))).toBe("V, S");
    // Fireball: V, S, M
    expect(formatSpellComponents(spellByName("Fireball"))).toBe("V, S, M");
  });
});

describe("spellDamageParts", () => {
  it("keeps dice symbolic but resolves @cl-scaled dice count (Fireball)", () => {
    const fireball = spellByName("Fireball"); // (min(10, @cl))d6
    expect(spellDamageParts(fireball, 4)).toEqual([{ text: "4d6", types: ["fire"] }]);
    // capped at 10d6
    expect(spellDamageParts(fireball, 15)).toEqual([{ text: "10d6", types: ["fire"] }]);
  });

  it("resolves the @cl modifier while keeping the die (Cure Light Wounds)", () => {
    const clw = spellByName("Cure Light Wounds"); // 1d8 + min(5, @cl)
    expect(spellDamageParts(clw, 3)).toEqual([{ text: "1d8+3", types: ["positive"] }]);
    expect(spellDamageParts(clw, 9)).toEqual([{ text: "1d8+5", types: ["positive"] }]); // capped
  });

  it("shows per-hit damage for a spell whose count scales only in prose (Magic Missile)", () => {
    // The vendored formula is 1d4+1 — the missile count lives in prose, not the
    // formula, so only the per-missile damage resolves here.
    expect(spellDamageParts(spellByName("Magic Missile"), 4)).toEqual([
      { text: "1d4+1", types: ["force"] },
    ]);
  });

  it("returns no parts for a spell that deals no rolled damage", () => {
    expect(spellDamageParts(spellByName("Shield"), 5)).toEqual([]);
  });

  it("falls back to the raw formula for a value the DSL can't parse", () => {
    // Clenched Fist's damage is "1d8 + 11[Strength]" — the [flavor] annotation
    // is not DSL, so both the dice-format and numeric evals throw; the display
    // must survive by showing the formula verbatim, never crash.
    const fist = spellByName("Clenched Fist");
    const parts = spellDamageParts(fist, 5);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts[0]!.text).toContain("1d8");
  });
});

describe("robustness — prose values never throw", () => {
  it("returns prose durations verbatim instead of throwing", () => {
    // These carry non-DSL prose ("1 hour/level; see text", "concentration").
    // formatSpellDuration must return a string, not blow up.
    for (const name of ["Wind Walk", "Animal Trance", "Protection from Arrows"]) {
      const spell = spellByName(name);
      expect(() => formatSpellDuration(spell, 7)).not.toThrow();
      expect(formatSpellDuration(spell, 7)).not.toBeNull();
    }
  });

  it("never throws formatting any vendored spell's range/duration/damage", () => {
    for (const spell of Object.values(refData.spells)) {
      expect(() => {
        formatSpellRange(spell, 9);
        formatSpellDuration(spell, 9);
        spellDamageParts(spell, 9);
      }).not.toThrow();
    }
  });
});
