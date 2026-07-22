import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedShamanSpiritCatalog,
  resolveShamanSpirit,
  SHAMAN_SPIRIT_TAGS,
  SHAMAN_SPIRITS,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `shaman-spirits.ts`'s "vendored catalog overlay" section doc comment for
 * the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedShamanSpiritCatalog", () => {
  const merged = mergedShamanSpiritCatalog(ref);
  const byTag = new Map(merged.map((s) => [s.tag, s]));

  it("has one row per vendored entry — every hand-authored spirit matched one by name", () => {
    const vendoredCount = Object.keys(ref.shamanSpirits).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 8 hand-authored spirits matched a vendored entry by name and kept their own mechanics", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const entry = byTag.get(tag);
      expect(entry).toBeDefined();
      expect(entry!.spiritMagicSpells).toEqual(SHAMAN_SPIRITS[tag]!.spiritMagicSpells);
      expect(entry!.hexes).toEqual(SHAMAN_SPIRITS[tag]!.hexes);
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only spirit (no hand-authored counterpart) resolves display-only with its own prose", () => {
    const entry = byTag.get("ancestors")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.spiritMagicSpells).toEqual([]);
    expect(entry.hexes).toEqual([]);
    expect(entry.description).toContain("Ancestral Blessing");
    expect(SHAMAN_SPIRITS.ancestors).toBeUndefined();
  });

  it("every tag is unique", () => {
    const tags = merged.map((s) => s.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("resolveShamanSpirit", () => {
  it("prefers the hand-authored table for a matched tag", () => {
    const spirit = resolveShamanSpirit("battle", ref);
    expect(spirit?.displayOnly).toBe(false);
    expect(spirit?.spiritMagicSpells).toEqual(SHAMAN_SPIRITS.battle!.spiritMagicSpells);
  });

  it("falls back to the vendored catalog for a vendored-only tag", () => {
    const spirit = resolveShamanSpirit("ancestors", ref);
    expect(spirit?.displayOnly).toBe(true);
    expect(spirit?.name).toBe("Ancestors");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveShamanSpirit("not-a-real-spirit", ref)).toBeUndefined();
  });
});
