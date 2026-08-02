import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  mergedVigilanteSocialTalentCatalog,
  mergedVigilanteTalentCatalog,
  resolveVigilanteSocialTalent,
  resolveVigilanteTalent,
  VIGILANTE_SOCIAL_TALENT_IDS,
  VIGILANTE_SOCIAL_TALENTS,
  VIGILANTE_TALENT_IDS,
  VIGILANTE_TALENTS,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — mirrors
 * `ragePowerCatalog.test.ts` and `witchHexCatalog.test.ts`, for BOTH
 * independent vigilante talent pools. Full hand-table parity as of the later catalog pass
 * follow-up: all 46 hand-authored social talents match a vendored entry by
 * name, except `seamlessShapechanger` ("Seamless Shapechanger"), which needed
 * an alias to match the vendored "Seemless Shapechanger" (source typo); all 81
 * hand-authored vigilante talents match, except `evasion` ("Evasion"), which
 * needed an alias to match the vendored "Evasive".
 */
const ref = loadRefData();

describe("mergedVigilanteSocialTalentCatalog", () => {
  const merged = mergedVigilanteSocialTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — all 46 hand-authored entries matched", () => {
    const vendoredCount = Object.keys(ref.vigilanteSocialTalents).length;
    expect(vendoredCount).toBe(46);
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 46 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of VIGILANTE_SOCIAL_TALENT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(VIGILANTE_SOCIAL_TALENTS[id]!.changes);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(46);
  });

  it("no vendored-only social talents remain — the fallback path only exists for a future data bump", () => {
    for (const entry of merged) {
      expect(VIGILANTE_SOCIAL_TALENTS[entry.id], entry.id).toBeDefined();
    }
  });

  it("resolves the 'Seamless Shapechanger' / 'Seemless Shapechanger' naming drift via alias", () => {
    const entry = byId.get("seamlessShapechanger")!;
    expect(entry.name).toBe("Seamless Shapechanger");
    expect(entry.description).toBeDefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("mergedVigilanteTalentCatalog", () => {
  const merged = mergedVigilanteTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — all 81 hand-authored entries matched (via alias where needed)", () => {
    const vendoredCount = Object.keys(ref.vigilanteTalents).length;
    expect(vendoredCount).toBe(81);
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 81 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of VIGILANTE_TALENT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(VIGILANTE_TALENTS[id]!.changes);
      expect(entry!.gate).toBe(VIGILANTE_TALENTS[id]!.gate);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(81);
  });

  it("no vendored-only vigilante talents remain — the fallback path only exists for a future data bump", () => {
    for (const entry of merged) {
      expect(VIGILANTE_TALENTS[entry.id], entry.id).toBeDefined();
    }
  });

  it("resolves the 'Evasion' / 'Evasive' naming drift via alias, keeping the hand-authored Stalker gate", () => {
    const entry = byId.get("evasion")!;
    expect(entry.gate).toBe("stalker");
    expect(entry.description).toContain("evasion");
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveVigilanteSocialTalent / resolveVigilanteTalent", () => {
  it("prefers the hand-authored table for a matched id", () => {
    expect(resolveVigilanteSocialTalent("renown", ref)).toBe(VIGILANTE_SOCIAL_TALENTS.renown);
    expect(resolveVigilanteTalent("shadowsSpeed", ref)).toBe(VIGILANTE_TALENTS.shadowsSpeed);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const social = resolveVigilanteSocialTalent("ancestral_enlightenment", ref);
    expect(social?.name).toBe("Ancestral Enlightenment");
    expect(social?.changes).toEqual([]);

    const talent = resolveVigilanteTalent("animal_patron", ref);
    expect(talent?.gate).toBe("either");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveVigilanteSocialTalent("not-a-real-talent", ref)).toBeUndefined();
    expect(resolveVigilanteTalent("not-a-real-talent", ref)).toBeUndefined();
  });
});
