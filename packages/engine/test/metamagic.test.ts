/**
 * Metamagic registry sanity + completeness tests (issue #71). Every feat the
 * vendored pack tags `"Metamagic"` must have exactly one registry entry keyed
 * by its name slug, and the modeled slot increases must match the published
 * PF1 rules. Feat ids are opaque Foundry UUIDs — see feat-effects.ts's
 * featNameSlug doc comment for why slugs, not ids, are the stable key.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { featNameSlug } from "../src/feat-effects.js";
import {
  METAMAGIC_FEATS,
  isMetamagicFeat,
  metamagicDef,
  metamagicDefByName,
} from "../src/metamagic.js";

const ref = loadRefData();

describe("metamagic registry", () => {
  it("covers every vendored feat tagged Metamagic", () => {
    const tagged = Object.values(ref.feats).filter((f) => (f.tags ?? []).includes("Metamagic"));
    // The vendored slice carries all 10 Core metamagic feats.
    expect(tagged.length).toBeGreaterThanOrEqual(10);
    for (const feat of tagged) {
      const slug = featNameSlug(feat.name);
      expect(METAMAGIC_FEATS[slug]).toBeDefined();
    }
  });

  it("every entry is self-consistent (slug matches key, positive increase)", () => {
    for (const [key, def] of Object.entries(METAMAGIC_FEATS)) {
      expect(def.slug).toBe(key);
      expect(def.slotIncrease).toBeGreaterThanOrEqual(1);
      expect(def.note.length).toBeGreaterThan(0);
      if (def.maxIncrease !== undefined) {
        expect(def.variable).toBe(true);
        expect(def.maxIncrease).toBeGreaterThanOrEqual(def.slotIncrease);
      }
    }
  });

  it("matches the published slot-level increases", () => {
    expect(metamagicDef("empower-spell")?.slotIncrease).toBe(2);
    expect(metamagicDef("enlarge-spell")?.slotIncrease).toBe(1);
    expect(metamagicDef("extend-spell")?.slotIncrease).toBe(1);
    expect(metamagicDef("maximize-spell")?.slotIncrease).toBe(3);
    expect(metamagicDef("quicken-spell")?.slotIncrease).toBe(4);
    expect(metamagicDef("silent-spell")?.slotIncrease).toBe(1);
    expect(metamagicDef("still-spell")?.slotIncrease).toBe(1);
    expect(metamagicDef("widen-spell")?.slotIncrease).toBe(3);
    // Variable feats: default increase, cap where fixed.
    expect(metamagicDef("reach-spell")).toMatchObject({ variable: true, maxIncrease: 3 });
    expect(metamagicDef("heighten-spell")).toMatchObject({ variable: true });
  });

  it("only Heighten raises the effective spell level (save DC)", () => {
    const raising = Object.values(METAMAGIC_FEATS).filter((d) => d.raisesEffectiveLevel);
    expect(raising.map((d) => d.slug)).toEqual(["heighten-spell"]);
  });

  it("resolves by name and reports membership", () => {
    expect(metamagicDefByName("Empower Spell")?.slug).toBe("empower-spell");
    expect(isMetamagicFeat("quicken-spell")).toBe(true);
    expect(isMetamagicFeat("power-attack")).toBe(false);
    expect(metamagicDef("power-attack")).toBeUndefined();
  });
});
