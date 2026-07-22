import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedPsychicDisciplineCatalog,
  PSYCHIC_DISCIPLINE_TAGS,
  PSYCHIC_DISCIPLINES,
  resolvePsychicDiscipline,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `psychic-disciplines.ts`'s "vendored catalog overlay" section doc comment.
 * A discipline is a CHASSIS (bonus spells/Discipline Powers/pool ability),
 * so unlike the flat-menu subsystems this asserts the two-shape merge:
 * hand-authored rows keep full mechanics, vendored-only rows are honestly
 * `vendoredOnly: true` with no bonus spells/powers/pool ability at all.
 */
const ref = loadRefData();

describe("mergedPsychicDisciplineCatalog", () => {
  const merged = mergedPsychicDisciplineCatalog(ref);
  const byTag = new Map(merged.map((d) => [d.tag, d]));

  it("has exactly one row per vendored entry — every one of the 12 hand-authored disciplines matched", () => {
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

  it("a vendored-only splatbook discipline is honestly display-only — no bonus spells/powers/pool ability", () => {
    const entry = byTag.get("mindtech")!;
    expect(entry.vendoredOnly).toBe(true);
    expect(entry.name).toBe("Mindtech");
    expect("bonusSpells" in entry).toBe(false);
    expect("powers" in entry).toBe(false);
    expect(PSYCHIC_DISCIPLINES.mindtech).toBeUndefined();
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

  it("falls back to a vendored-only stub for a splatbook discipline", () => {
    const entry = resolvePsychicDiscipline("mindtech", ref);
    expect(entry?.vendoredOnly).toBe(true);
    expect(entry?.name).toBe("Mindtech");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolvePsychicDiscipline("not-a-real-discipline", ref)).toBeUndefined();
  });
});
