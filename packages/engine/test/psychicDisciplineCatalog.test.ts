import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedPsychicDisciplineCatalog,
  PSYCHIC_DISCIPLINE_TAGS,
  PSYCHIC_DISCIPLINES,
  resolvePsychicDiscipline,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — see `psychic-disciplines.ts`'s
 * "vendored catalog overlay" section doc comment. A discipline is a CHASSIS
 * (bonus spells/Discipline Powers/pool ability); now that all 23 published
 * disciplines are hand-authored, the merge produces zero `vendoredOnly: true`
 * rows in practice, but the shape stays covered for the (hypothetical)
 * unmatched case.
 */
const ref = loadRefData();

describe("mergedPsychicDisciplineCatalog", () => {
  const merged = mergedPsychicDisciplineCatalog(ref);
  const byTag = new Map(merged.map((d) => [d.tag, d]));

  it("has exactly one row per vendored entry — every one of the 23 hand-authored disciplines matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.psychicDisciplines).length);
  });

  it("every hand-authored discipline matched a vendored entry, kept its own tag + mechanics, and is NOT vendoredOnly", () => {
    for (const tag of PSYCHIC_DISCIPLINE_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.vendoredOnly).toBe(false);
      if (!entry!.vendoredOnly) {
        expect(entry!.bonusSpells).toEqual(PSYCHIC_DISCIPLINES[tag]!.bonusSpells);
        expect(entry!.powers).toEqual(PSYCHIC_DISCIPLINES[tag]!.powers);
        expect(entry!.phrenicPoolAbility).toBe(PSYCHIC_DISCIPLINES[tag]!.phrenicPoolAbility);
      }
      expect(entry!.description).toBeDefined();
    }
  });

  it("no row is vendoredOnly — every vendored entry now has a hand-authored match", () => {
    expect(merged.every((d) => !d.vendoredOnly)).toBe(true);
  });

  it("every tag is unique", () => {
    const tags = merged.map((d) => d.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolvePsychicDiscipline", () => {
  it("prefers the hand-authored table for a matched tag, attaching vendored prose", () => {
    const entry = resolvePsychicDiscipline("abomination", ref);
    expect(entry?.vendoredOnly).toBe(false);
    expect(entry?.name).toBe("Abomination");
  });

  it("resolves a formerly-vendored-only splatbook discipline through the hand-authored table now", () => {
    const entry = resolvePsychicDiscipline("mindtech", ref);
    expect(entry?.vendoredOnly).toBe(false);
    expect(entry?.name).toBe("Mindtech");
    expect(PSYCHIC_DISCIPLINES.mindtech).toBeDefined();
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolvePsychicDiscipline("not-a-real-discipline", ref)).toBeUndefined();
  });
});
