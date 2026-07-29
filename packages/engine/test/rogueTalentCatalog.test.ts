import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { mergedRogueTalentCatalog, resolveRogueTalent, ROGUE_TALENTS } from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74) — mirrors
 * `ragePowerCatalog.test.ts`. Full hand-table parity as of the #74 Phase 5
 * extension: all 234 vendored talents have a hand-authored def; see
 * `rogue-talents.ts`'s "vendored catalog overlay" doc comment for the
 * collision-audit narrative (three same-name pairs matched by vendored id).
 */
const ref = loadRefData();

describe("mergedRogueTalentCatalog", () => {
  const merged = mergedRogueTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every hand-authored entry matched", () => {
    const vendoredCount = Object.keys(ref.rogueTalents).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 234 hand-authored entries matched a vendored entry and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of Object.keys(ROGUE_TALENTS)) {
      const entry = byId.get(id);
      expect(entry, id).toBeDefined();
      expect(entry!.changes).toEqual(ROGUE_TALENTS[id]!.changes);
      expect(entry!.displayOnly).toBe(ROGUE_TALENTS[id]!.displayOnly);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(234);
  });

  it("no vendored-only talents remain — the fallback path only exists for a future data bump", () => {
    // Full hand-table parity as of the #74 Phase 5 extension.
    for (const entry of merged) {
      expect(ROGUE_TALENTS[entry.id], entry.id).toBeDefined();
    }
  });

  it("the chained/Unchained Powerful Sneak pair stays two distinct rows (the variant's vendored name carries the suffix)", () => {
    const chained = byId.get("powerfulSneak")!;
    expect(chained.changes).toEqual(ROGUE_TALENTS.powerfulSneak!.changes);

    const unchained = byId.get("powerfulSneakUnchainedRogue")!;
    expect(unchained.displayOnly).toBe(true);
    expect(unchained.name).toBe("Powerful Sneak (Unchained Rogue)");
    expect(unchained.unchainedOnly).toBe(true);
    expect(unchained.id).not.toBe(chained.id);
  });

  it("the three vendored same-name pairs pair by explicit vendored id, chained/catfolk vs Unchained prose intact", () => {
    // Coax Information (APG vs Pathfinder Unchained), Nimble Climber
    // (Unchained vs catfolk), Skill Mastery (chained- vs Unchained-advanced).
    expect(byId.get("coaxInformation")!.category).toBe("R_Deception Talents");
    expect(byId.get("coaxInformationUnchained")!.category).toBe("UR_Deception Talents");
    expect(byId.get("nimbleClimberCatfolk")!.category).toBe("R_Catfolk Talents");
    expect(byId.get("nimbleClimberUnchained")!.category).toBe("UR_Other Talents");
    expect(byId.get("skillMastery")!.category).toBe("R_Advanced Other Talents");
    expect(byId.get("skillMasteryUnchained")!.category).toBe("UR_Advanced Other Talents");
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
