/**
 * Fixture tests for the vendored witch-patron prose parser
 * (`parseVendoredPatronSpells` / `parseVendoredPatronThemeInfo`,
 * `witch-patrons.ts`'s "vendored catalog overlay" section) — the piece that
 * turns the ~44 vendored-only patrons from bare prose into either a real
 * bonus-spell progression (the 35 "basic" ones) or structured
 * hex/drawback/theme/spell-change fields (the 9 "unique" templates).
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedWitchPatronCatalog,
  parseVendoredPatronSpells,
  parseVendoredPatronThemeInfo,
  WITCH_PATRON_TAGS,
  WITCH_PATRONS,
} from "../src/index.js";

const ref = loadRefData();
const catalog = mergedWitchPatronCatalog(ref);
const byTag = new Map(catalog.map((p) => [p.tag, p]));

describe("parseVendoredPatronSpells — basic patron coverage", () => {
  it("carries a real bonus-spell progression for every basic patron, hand-authored or parsed", () => {
    const basics = catalog.filter((p) => p.category === "basic");
    // 52 vendored "basic" patrons total (17 hand-authored + 35 parsed from prose).
    expect(basics.length).toBe(52);
    for (const p of basics) {
      expect(p.displayOnly).toBe(false);
      expect(p.bonusSpells.length).toBe(9);
      expect(p.bonusSpells.map((sp) => sp.level)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
    }
  });

  it("parses 35 basic patrons beyond the 17 hand-authored ones", () => {
    const parsedOnly = catalog.filter(
      (p) => p.category === "basic" && !WITCH_PATRON_TAGS.includes(p.tag),
    );
    expect(parsedOnly.length).toBe(35);
  });

  it("parses a named patron's progression correctly (Ancestors, vendored-only)", () => {
    const entry = byTag.get("ancestors")!;
    expect(entry.bonusSpells.map((sp) => sp.name)).toEqual([
      "Bless",
      "Aid",
      "Prayer",
      "Blessing of Fervor",
      "Commune",
      expect.any(String), // "greater heroism" -> resolved via the comma-suffix fallback
      "Refuge",
      "Euphoric Tranquility",
      "Weird",
    ]);
    expect(entry.bonusSpells[5]!.name.toLowerCase()).toBe("heroism, greater");
  });

  it('resolves the vendored comma-suffix spell-naming convention ("X, Greater" for "greater X")', () => {
    const devotion = byTag.get("devotion")!;
    const byLevel = new Map(devotion.bonusSpells.map((sp) => [sp.level, sp.name]));
    expect(byLevel.get(8)?.toLowerCase()).toBe("magic weapon, greater");
    expect(byLevel.get(12)?.toLowerCase()).toBe("bull's strength, mass");
    expect(byLevel.get(18)?.toLowerCase()).toBe("heal, mass");
  });

  it("resolves a spell the compendium files under a different title", () => {
    // Enchantment's 12th-level entry is vendored prose "geas". The pack has
    // no bare "Geas": the 6th-level spell is filed as "Geas/Quest".
    const enchantment = byTag.get("enchantment")!;
    expect(enchantment.bonusSpells.find((sp) => sp.level === 12)?.name).toBe("Geas/Quest");
  });

  it("degrades gracefully for a spell name that doesn't resolve against the vendored slice", () => {
    // An unresolvable name falls back to a Title Case display name rather
    // than throwing or silently guessing at a near match.
    const parsed = parseVendoredPatronSpells(ref, "<p>2nd - not a real spell at all.</p>");
    expect(parsed).toEqual([{ level: 2, name: "Not a Real Spell at All" }]);
  });

  it("returns [] (parser found no matching shape) rather than throwing on odd input", () => {
    expect(parseVendoredPatronSpells(ref, "<p>no list here</p>")).toEqual([]);
    expect(parseVendoredPatronSpells(ref, "")).toEqual([]);
  });
});

/** Normalizes a spell name for the cross-check below: case/punctuation/word-order in "X, Modifier" vs. "Modifier X" (both real vendored spellings, see `resolveVendoredSpellName`'s doc comment) shouldn't count as a discrepancy — only a genuinely different spell should. */
function canonicalSpellKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !["greater", "lesser", "mass", "communal"].includes(w))
    .sort()
    .join(" ");
}

describe("parseVendoredPatronSpells — cross-check against the 17 hand-authored progressions", () => {
  it("matches the hand-authored progression for every hand-authored patron, spell-for-spell where both agree", () => {
    // Oracle check: the vendored prose is independent of the hand-authored
    // table, so parsing it and comparing catches transcription slips in
    // either direction. Two patrons carry a KNOWN, investigated difference
    // (see below) and are excluded from the strict per-entry comparison.
    const knownDiscrepancies = new Set(["water", "wisdom"]);
    for (const tag of WITCH_PATRON_TAGS) {
      if (knownDiscrepancies.has(tag)) continue;
      const vendored = ref.witchPatrons[tag];
      expect(vendored).toBeDefined();
      const parsed = parseVendoredPatronSpells(ref, vendored!.description ?? "");
      const parsedKeys = parsed.map((sp) => canonicalSpellKey(sp.name));
      const handKeys = WITCH_PATRONS[tag]!.bonusSpells.map((sp) => canonicalSpellKey(sp.name));
      expect(parsedKeys).toEqual(handKeys);
    }
  });

  it("documents the Water patron's two intentional simplifications (parenthetical qualifiers dropped)", () => {
    // Hand table: "Elemental Body III"/"IV". Vendored prose: "elemental body
    // III/IV (water only)" — the qualifier is real flavor (the spell only
    // works on water elementals for this patron) but no vendored spell name
    // carries a parenthetical, so it's dropped for resolution (see
    // `resolveVendoredSpellName`'s doc comment) on both the parser and the
    // hand table alike.
    const vendored = ref.witchPatrons.water!;
    const parsed = parseVendoredPatronSpells(ref, vendored.description ?? "");
    const byLevel = new Map(parsed.map((sp) => [sp.level, sp.name]));
    expect(byLevel.get(12)).toBe("Elemental Body III");
    expect(byLevel.get(14)).toBe("Elemental Body IV");
    // The vendored 2nd-level entry is "bless water/curse water" (a choice);
    // the hand table simplifies to "Bless Water" alone.
    expect(byLevel.get(2)?.toLowerCase()).toContain("bless water");
  });

  it("agrees with the hand table on Wisdom's globes of invulnerability", () => {
    // PF1 has no spell named "Greater Globe of Invulnerability": the APG list
    // pairs the lesser version at 8th with the plain one at 12th, which is
    // what both the vendored prose and the hand table now say.
    const vendored = ref.witchPatrons.wisdom!;
    const parsed = parseVendoredPatronSpells(ref, vendored.description ?? "");
    expect(parsed.find((sp) => sp.level === 8)?.name).toBe("Globe of Invulnerability, Lesser");
    expect(parsed.find((sp) => sp.level === 12)?.name).toBe("Globe of Invulnerability");
    const hand = new Map(WITCH_PATRONS.wisdom!.bonusSpells.map((sp) => [sp.level, sp.name]));
    expect(hand.get(8)).toBe("Lesser Globe of Invulnerability");
    expect(hand.get(12)).toBe("Globe of Invulnerability");
  });

  it("resolves a hand-table spell written in English word order", () => {
    // The hand table says "Lesser Globe of Invulnerability" and "Mass Cat's
    // Grace"; the compendium files both as "<Base>, <Modifier>". Resolving
    // through the catalog is what makes them land on the real spell.
    const wisdom = catalog.find((p) => p.tag === "wisdom")!;
    expect(wisdom.bonusSpells.find((sp) => sp.level === 8)?.name).toBe(
      "Globe of Invulnerability, Lesser",
    );
    const agility = catalog.find((p) => p.tag === "agility")!;
    expect(agility.bonusSpells.find((sp) => sp.level === 12)?.name).toBe("Cat's Grace, Mass");
  });
});

describe("parseVendoredPatronThemeInfo — the 9 unique patron templates", () => {
  it("parses the hex, drawback, available themes, and spell changes for every unique patron", () => {
    const uniques = catalog.filter((p) => p.category === "unique");
    expect(uniques.length).toBe(9);
    for (const p of uniques) {
      expect(p.displayOnly).toBe(true);
      expect(p.bonusSpells).toEqual([]);
      expect(p.themeInfo).toBeDefined();
      expect(p.themeInfo!.grantedHex.length).toBeGreaterThan(0);
      expect(p.themeInfo!.drawback.length).toBeGreaterThan(0);
      expect(p.themeInfo!.availableThemes.length).toBeGreaterThan(0);
      expect(p.themeInfo!.spellChanges.length).toBeGreaterThan(0);
    }
  });

  it("parses Celestial Agenda's structured fields correctly", () => {
    const entry = byTag.get("celestial_agenda")!;
    expect(entry.themeInfo!.grantedHex).toBe("Ward");
    expect(entry.themeInfo!.availableThemes).toEqual(["Endurance", "Healing", "Light", "Portents"]);
    expect(entry.themeInfo!.spellChanges).toEqual([
      { level: 4, text: "Castigate" },
      { level: 10, text: "Rebuke" },
      { level: 16, text: "Greater Planar Ally (Good Outsiders Only)" },
    ]);
    expect(entry.themeInfo!.drawback).toContain("good alignment");
  });

  it("returns undefined rather than throwing on prose that doesn't match the template shape", () => {
    expect(parseVendoredPatronThemeInfo("<p>Nothing structured here.</p>")).toBeUndefined();
    expect(parseVendoredPatronThemeInfo("")).toBeUndefined();
  });
});
