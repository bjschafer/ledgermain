import { describe, expect, it } from "bun:test";

import type { RefData } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedShamanSpiritCatalog,
  resolveShamanSpirit,
  SHAMAN_SPIRIT_TAGS,
  SHAMAN_SPIRITS,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — see `shaman-spirits.ts`'s
 * "vendored catalog overlay" section doc comment for the collision-audit
 * narrative this asserts against.
 *
 * All 18 real vendored spirits now have a hand-authored counterpart (the
 * splatbook-10 batch closed the gap the core-8 batch left), so there is no
 * REAL vendored-only spirit left to exercise the fallback branch against.
 * `refWithFakeSpirit` below injects one synthetic entry on top of the real
 * data for the tests that need to prove that branch still works for a
 * future spirit this table hasn't caught up to yet.
 */
const ref = loadRefData();

function refWithFakeSpirit(): RefData {
  return {
    ...ref,
    shamanSpirits: {
      ...ref.shamanSpirits,
      made_up_test_spirit: {
        id: "made_up_test_spirit",
        name: "Made Up Test Spirit",
        uuid: "Compendium.pf1.class-abilities.Item.made-up-test-spirit",
        description: "<p>A synthetic entry with no hand-authored counterpart.</p>",
      },
    },
  };
}

describe("mergedShamanSpiritCatalog", () => {
  const merged = mergedShamanSpiritCatalog(ref);
  const byTag = new Map(merged.map((s) => [s.tag, s]));

  it("has one row per vendored entry — every hand-authored spirit matched one by name", () => {
    const vendoredCount = Object.keys(ref.shamanSpirits).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 18 hand-authored spirits matched a vendored entry by name and kept their own mechanics", () => {
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
    const fakeMerged = mergedShamanSpiritCatalog(refWithFakeSpirit());
    const entry = fakeMerged.find((s) => s.tag === "made_up_test_spirit")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.spiritMagicSpells).toEqual([]);
    expect(entry.hexes).toEqual([]);
    expect(entry.description).toContain("synthetic entry");
    expect(SHAMAN_SPIRITS.made_up_test_spirit).toBeUndefined();
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
    const spirit = resolveShamanSpirit("made_up_test_spirit", refWithFakeSpirit());
    expect(spirit?.displayOnly).toBe(true);
    expect(spirit?.name).toBe("Made Up Test Spirit");
  });

  it("returns undefined for a tag in neither table", () => {
    expect(resolveShamanSpirit("not-a-real-spirit", ref)).toBeUndefined();
  });
});
