import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { mergedRogueTalentCatalog, resolveRogueTalent, ROGUE_TALENTS } from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3b) — mirrors
 * `ragePowerCatalog.test.ts`. All 27 hand-authored rogue talents matched a
 * vendored entry by name — no unmatched entries, unlike rage powers' Sixth
 * Sense gap.
 */
const ref = loadRefData();

describe("mergedRogueTalentCatalog", () => {
  const merged = mergedRogueTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every hand-authored entry matched", () => {
    const vendoredCount = Object.keys(ref.rogueTalents).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("every hand-authored entry matched a vendored entry by name and kept its own id + mechanics", () => {
    for (const id of Object.keys(ROGUE_TALENTS)) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(ROGUE_TALENTS[id]!.changes);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only entry (no hand-authored counterpart) resolves display-only with its own id + prose", () => {
    const entry = byId.get("armor_piercer")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.changes).toEqual([]);
    expect(entry.description).toBeDefined();
  });

  it("the chained/Unchained Powerful Sneak collision resolves like rage powers' Guarded Stance: hand-authored def matches the CRB (non-suffixed) vendored entry, the Unchained variant stays its own vendored-only row", () => {
    const chained = byId.get("powerfulSneak")!;
    expect(chained.changes).toEqual(ROGUE_TALENTS.powerfulSneak!.changes);

    const unchained = byId.get("powerful_sneak_unchained_rogue")!;
    expect(unchained.displayOnly).toBe(true);
    expect(unchained.name).toBe("Powerful Sneak (Unchained Rogue)");
    expect(unchained.id).not.toBe(chained.id);
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveRogueTalent", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const talent = resolveRogueTalent("combatTrick", ref);
    expect(talent).toBe(ROGUE_TALENTS.combatTrick);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const talent = resolveRogueTalent("armor_piercer", ref);
    expect(talent?.displayOnly).toBe(true);
    expect(talent?.name).toBe("Armor Piercer");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveRogueTalent("not-a-real-talent", ref)).toBeUndefined();
  });
});
