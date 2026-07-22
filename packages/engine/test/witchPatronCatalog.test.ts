import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedWitchPatronCatalog,
  resolveWitchPatron,
  WITCH_PATRON_TAGS,
  WITCH_PATRONS,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `witch-patrons.ts`'s "vendored catalog overlay" section doc comment for
 * the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedWitchPatronCatalog", () => {
  const merged = mergedWitchPatronCatalog(ref);
  const byTag = new Map(merged.map((p) => [p.tag, p]));

  it("has one row per vendored entry — every hand-authored patron matched one by name", () => {
    const vendoredCount = Object.keys(ref.witchPatrons).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 17 hand-authored patrons matched a vendored entry by name and kept their own bonus-spell progression", () => {
    for (const tag of WITCH_PATRON_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.bonusSpells).toEqual(WITCH_PATRONS[tag]!.bonusSpells);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
      expect(entry!.category).toBe("basic");
    }
  });

  it("a vendored-only patron (no hand-authored counterpart) resolves display-only with its own prose and category", () => {
    const entry = byTag.get("celestial_agenda")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.bonusSpells).toEqual([]);
    expect(entry.category).toBe("unique");
    expect(entry.description).toContain("Available Patron Themes");
    expect(WITCH_PATRONS.celestial_agenda).toBeUndefined();
  });

  it("every tag is unique", () => {
    const tags = merged.map((p) => p.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveWitchPatron", () => {
  it("prefers the hand-authored table for a matched tag", () => {
    const patron = resolveWitchPatron("agility", ref);
    expect(patron?.displayOnly).toBe(false);
    expect(patron?.bonusSpells).toEqual(WITCH_PATRONS.agility!.bonusSpells);
  });

  it("falls back to the vendored catalog for a vendored-only tag", () => {
    const patron = resolveWitchPatron("celestial_agenda", ref);
    expect(patron?.displayOnly).toBe(true);
    expect(patron?.name).toBe("Celestial Agenda");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveWitchPatron("not-a-real-patron", ref)).toBeUndefined();
  });
});
