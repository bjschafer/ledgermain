import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MEDIUM_SPIRIT_TAGS,
  MEDIUM_SPIRITS,
  mergedMediumSpiritCatalog,
  resolveMediumSpirit,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `medium-spirits.ts`'s "vendored catalog overlay" section doc comment.
 * Same chassis two-shape merge as psychic disciplines/occultist implements:
 * a vendored-only spirit carries no Spirit Bonus targets/Séance Boon/
 * influence penalty/Spirit Powers.
 */
const ref = loadRefData();

describe("mergedMediumSpiritCatalog", () => {
  const merged = mergedMediumSpiritCatalog(ref);
  const byTag = new Map(merged.map((s) => [s.tag, s]));

  it("has exactly one row per vendored entry — every one of the 6 hand-authored spirits matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.mediumSpirits).length);
  });

  it("every hand-authored spirit matched a vendored entry, kept its own tag + mechanics, and is NOT vendoredOnly", () => {
    for (const tag of MEDIUM_SPIRIT_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.vendoredOnly).toBe(false);
      if (!entry!.vendoredOnly) {
        expect(entry!.spiritBonusTargets).toEqual(MEDIUM_SPIRITS[tag]!.spiritBonusTargets);
        expect(entry!.powers).toEqual(MEDIUM_SPIRITS[tag]!.powers);
      }
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only outsider-type spirit is honestly display-only — no Spirit Bonus targets/powers", () => {
    const entry = byTag.get("aeon")!;
    expect(entry.vendoredOnly).toBe(true);
    expect(entry.name).toBe("Aeon");
    expect("spiritBonusTargets" in entry).toBe(false);
    expect("powers" in entry).toBe(false);
    expect(MEDIUM_SPIRITS.aeon).toBeUndefined();
  });

  it("a vendored-only named-historical spirit is likewise display-only", () => {
    const entry = byTag.get("abrogail_thrune_i")!;
    expect(entry.vendoredOnly).toBe(true);
    expect(entry.name).toBe("Abrogail Thrune I");
  });

  it("every tag is unique", () => {
    const tags = merged.map((s) => s.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveMediumSpirit", () => {
  it("prefers the hand-authored table for a matched tag, attaching vendored prose", () => {
    const entry = resolveMediumSpirit("archmage", ref);
    expect(entry?.vendoredOnly).toBe(false);
    expect(entry?.name).toBe("Archmage");
  });

  it("falls back to a vendored-only stub for an outsider-type spirit", () => {
    const entry = resolveMediumSpirit("aeon", ref);
    expect(entry?.vendoredOnly).toBe(true);
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveMediumSpirit("not-a-real-spirit", ref)).toBeUndefined();
  });
});
