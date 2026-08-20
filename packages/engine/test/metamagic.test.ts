/**
 * Metamagic registry sanity + completeness tests: the modeled slot increases
 * must match the published PF1 rules, and every registered entry must resolve
 * to a real, still-tagged feat. Feat ids are opaque Foundry UUIDs — see
 * feat-effects.ts's featNameSlug doc comment for why slugs, not ids, are the
 * stable key.
 *
 * The registry covers all 84 feats the vendored slice tags `"Metamagic"`. An
 * unregistered metamagic feat (should the vendored data ever add one) still
 * displays; `metamagicDef` simply returns `undefined` for it and callers
 * treat that as "no slot-cost modeled" (see apps/web's
 * preparedSpells.ts/model/metamagic.ts), the same honesty bar as
 * feat-classification.ts's "subsystem" bucket.
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
  it("every registered feat still resolves to a real, Metamagic-tagged feat", () => {
    const tagged = new Set(
      Object.values(ref.feats)
        .filter((f) => (f.tags ?? []).includes("Metamagic"))
        .map((f) => featNameSlug(f.name)),
    );
    // The vendored slice carries all 84 metamagic feats, and this registry
    // models every one of them (see the file header).
    expect(tagged.size).toBe(84);
    for (const slug of Object.keys(METAMAGIC_FEATS)) {
      expect(tagged.has(slug)).toBe(true);
    }
    expect(Object.keys(METAMAGIC_FEATS)).toHaveLength(84);
  });

  it("every entry is self-consistent (slug matches key, non-negative increase)", () => {
    // slotIncrease 0 is valid: several feats (Brackish, Brisk, Centered,
    // Eclipsed, Fleeting, Merciful, Murky, Steam) are metamagic by rules
    // text but explicitly don't use up a higher-level slot.
    for (const [key, def] of Object.entries(METAMAGIC_FEATS)) {
      expect(def.slug).toBe(key);
      expect(def.slotIncrease).toBeGreaterThanOrEqual(0);
      expect(def.note.length).toBeGreaterThan(0);
      if (def.maxIncrease !== undefined) {
        expect(def.variable).toBe(true);
        expect(def.maxIncrease).toBeGreaterThanOrEqual(def.slotIncrease);
      }
    }
  });

  it("every slug is unique across the registry", () => {
    const slugs = Object.values(METAMAGIC_FEATS).map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
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

  it("matches the published slot-level increases for the long-tail feats", () => {
    // Each expectation cites the feat's own Benefits text (from the vendored
    // feats.json description), not Foundry system code.
    // "A cherry blossom spell uses up a slot 3 levels higher than the spell's actual level."
    expect(metamagicDef("cherry-blossom-spell")?.slotIncrease).toBe(3);
    // "An ascendant spell uses up a spell slot 5 levels higher than the spell's actual level."
    expect(metamagicDef("ascendant-spell")?.slotIncrease).toBe(5);
    // "An echoing spell uses up a spell slot three levels higher than the spell's actual level."
    expect(metamagicDef("echoing-spell")?.slotIncrease).toBe(3);
    // "A dazing spell uses up a spell slot three levels higher than the spell's actual level."
    expect(metamagicDef("dazing-spell")?.slotIncrease).toBe(3);
    // "A familiar spell uses up a spell slot 3 levels higher than the spell's actual level."
    expect(metamagicDef("familiar-spell")?.slotIncrease).toBe(3);
    // "A yai-mimic spell uses up a spell slot 3 levels higher than the spell's actual level."
    expect(metamagicDef("yai-mimic-spell")?.slotIncrease).toBe(3);
    // "A persistent spell uses up a spell slot two levels higher than the spell's actual level."
    expect(metamagicDef("persistent-spell")?.slotIncrease).toBe(2);
    // "A studied spell uses up a spell slot 2 levels higher than the spell's actual level."
    expect(metamagicDef("studied-spell")?.slotIncrease).toBe(2);
    // "A scouting summons spell takes up a spell slot 2 levels higher than the spell's actual level."
    expect(metamagicDef("scouting-summons")?.slotIncrease).toBe(2);
    // Feats that explicitly do NOT use a higher-level slot:
    // "A brackish spell does not use up a higher-level spell slot than the spell's actual level."
    expect(metamagicDef("brackish-spell")?.slotIncrease).toBe(0);
    // "You can center the area of a spell...A centered spell does not use up a higher-level spell slot than the spell's actual level."
    expect(metamagicDef("centered-spell")?.slotIncrease).toBe(0);
    // "A brisk spell uses a spell slot equal to the spell's normal spell level."
    expect(metamagicDef("brisk-spell")?.slotIncrease).toBe(0);
    // "A murky spell uses up a slot the same spell level as the spell's actual level."
    expect(metamagicDef("murky-spell")?.slotIncrease).toBe(0);
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
