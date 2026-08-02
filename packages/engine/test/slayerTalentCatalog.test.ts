import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  isAdvancedSlayerTalent,
  mergedSlayerTalentCatalog,
  resolveSlayerTalent,
  SLAYER_TALENTS,
  SLAYER_TALENT_IDS,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (hand-table follow-up) — see
 * `slayer-talents.ts`'s "vendored catalog overlay" section doc comment. UNLIKE
 * `ragePowerCatalog.test.ts`/`witchHexCatalog.test.ts`, this table's ids were
 * deliberately authored to REUSE the vendored slugs (for backward
 * compatibility with the pre-existing vendored-only picker — see the file's
 * top doc comment), so every one of the 43 hand-authored entries matches a
 * vendored entry by BOTH id and normalized name — there is no vendored-only or
 * hand-authored-only row today.
 */
const ref = loadRefData();

describe("SLAYER_TALENTS table", () => {
  it("has exactly 43 entries, one per vendored id", () => {
    expect(SLAYER_TALENT_IDS).toHaveLength(43);
    expect(new Set(SLAYER_TALENT_IDS)).toEqual(new Set(Object.keys(ref.slayerTalents)));
  });

  it("every id is unique", () => {
    expect(new Set(SLAYER_TALENT_IDS).size).toBe(SLAYER_TALENT_IDS.length);
  });

  it("flags the 10th-level Advanced Slayer Talents tier and gates minLevel at 10", () => {
    const advanced = SLAYER_TALENTS.armored_marauder!;
    expect(advanced.advanced).toBe(true);
    expect(advanced.category).toBe("Advanced Slayer Talents");
    expect(advanced.minLevel).toBe(10);

    const base = SLAYER_TALENTS.poison_use!;
    expect(base.advanced).toBe(false);
    expect(base.minLevel).toBe(1);
  });

  it("RAW-stated level prerequisites beyond the class feature itself: Deadly Range/Jaguar's Grace 4th, Toxin Training 4th, Focused Poison 6th (aonprd.com's Slayer Talents index)", () => {
    expect(SLAYER_TALENTS.deadly_range!.minLevel).toBe(4);
    expect(SLAYER_TALENTS.jaguars_grace!.minLevel).toBe(4);
    expect(SLAYER_TALENTS.toxin_training!.minLevel).toBe(4);
    expect(SLAYER_TALENTS.focused_poison!.minLevel).toBe(6);
  });

  it("exactly three entries carry a live Change (Foil Scrutiny, Armored Marauder, Armored Swiftness); every other entry is displayOnly with no changes", () => {
    const LIVE_IDS = new Set(["foil_scrutiny", "armored_marauder", "armored_swiftness"]);
    for (const id of SLAYER_TALENT_IDS) {
      const talent = SLAYER_TALENTS[id]!;
      if (LIVE_IDS.has(id)) {
        expect(talent.displayOnly).toBe(false);
        expect(talent.changes.length).toBeGreaterThan(0);
      } else {
        expect(talent.displayOnly).toBe(true);
        expect(talent.changes).toEqual([]);
      }
    }
  });
});

describe("isAdvancedSlayerTalent", () => {
  it("true for an 'Advanced ' category prefix, false otherwise (including undefined)", () => {
    expect(isAdvancedSlayerTalent("Advanced Slayer Talents")).toBe(true);
    expect(isAdvancedSlayerTalent("Other Talents")).toBe(false);
    expect(isAdvancedSlayerTalent(undefined)).toBe(false);
  });
});

describe("mergedSlayerTalentCatalog", () => {
  const merged = mergedSlayerTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry (43) — every hand-authored entry matched, none left over", () => {
    expect(merged).toHaveLength(43);
    expect(merged).toHaveLength(Object.keys(ref.slayerTalents).length);
  });

  it("every hand-authored entry kept its own id/mechanics, with vendored prose attached", () => {
    for (const id of SLAYER_TALENT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(SLAYER_TALENTS[id]!.changes);
      expect(entry!.displayOnly).toBe(SLAYER_TALENTS[id]!.displayOnly);
      expect(entry!.description).toBeDefined();
    }
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveSlayerTalent", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const talent = resolveSlayerTalent("poison_use", ref);
    expect(talent).toBe(SLAYER_TALENTS.poison_use);
    expect(talent?.displayOnly).toBe(true);
  });

  it("resolves the live-Change entries with their real mechanics", () => {
    const talent = resolveSlayerTalent("foil_scrutiny", ref);
    expect(talent?.displayOnly).toBe(false);
    expect(talent?.changes.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown id", () => {
    expect(resolveSlayerTalent("not-a-real-talent", ref)).toBeUndefined();
  });
});
