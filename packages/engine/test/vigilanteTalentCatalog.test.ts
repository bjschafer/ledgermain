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
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3b) — mirrors
 * `ragePowerCatalog.test.ts`, for BOTH independent vigilante talent pools.
 * All 30 hand-authored social talents matched a vendored entry by name; of
 * the 32 hand-authored vigilante talents, 31 matched — `evasion` ("Evasion")
 * needed an alias to match the vendored "Evasive".
 */
const ref = loadRefData();

describe("mergedVigilanteSocialTalentCatalog", () => {
  const merged = mergedVigilanteSocialTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every hand-authored entry matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.vigilanteSocialTalents).length);
  });

  it("every hand-authored entry matched a vendored entry by name and kept its own id + mechanics", () => {
    for (const id of VIGILANTE_SOCIAL_TALENT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(VIGILANTE_SOCIAL_TALENTS[id]!.changes);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only entry resolves display-only with its own id + prose", () => {
    const entry = byId.get("ancestral_enlightenment")!;
    expect(entry.changes).toEqual([]);
    expect(entry.description).toBeDefined();
    expect(VIGILANTE_SOCIAL_TALENTS.ancestral_enlightenment).toBeUndefined();
  });
});

describe("mergedVigilanteTalentCatalog", () => {
  const merged = mergedVigilanteTalentCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every hand-authored entry matched (via alias where needed)", () => {
    expect(merged).toHaveLength(Object.keys(ref.vigilanteTalents).length);
  });

  it("every hand-authored entry matched a vendored entry by name and kept its own id + mechanics", () => {
    for (const id of VIGILANTE_TALENT_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.changes).toEqual(VIGILANTE_TALENTS[id]!.changes);
      expect(entry!.gate).toBe(VIGILANTE_TALENTS[id]!.gate);
      expect(entry!.description).toBeDefined();
    }
  });

  it("resolves the 'Evasion' / 'Evasive' naming drift via alias, keeping the hand-authored Stalker gate", () => {
    const entry = byId.get("evasion")!;
    expect(entry.gate).toBe("stalker");
    expect(entry.description).toContain("evasion");
  });

  it("a vendored-only entry defaults its gate to 'either' (never hides an option the specialization filter can't verify)", () => {
    const entry = byId.get("animal_patron")!;
    expect(entry.gate).toBe("either");
    expect(entry.changes).toEqual([]);
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
