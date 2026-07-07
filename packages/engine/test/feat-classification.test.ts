/**
 * Completeness + sanity tests for issue #45's feat classification audit
 * (feat-classification.ts). Mirrors the archetype-extracted pipeline's own
 * completeness posture: every feat in the vendored pack must have exactly one
 * classification entry, keyed by name slug (feat ids are opaque Foundry
 * UUIDs — see feat-effects.ts's featNameSlug doc comment for why slugs, not
 * ids, are the stable key here).
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { featNameSlug } from "../src/feat-effects.js";
import { FEAT_CLASSIFICATION, type FeatClassificationBucket } from "../src/feat-classification.js";

const ref = loadRefData();

const VALID_BUCKETS: ReadonlySet<FeatClassificationBucket> = new Set([
  "numeric",
  "choice-numeric",
  "situational",
  "pool",
  "subsystem",
  "blocked",
]);

describe("FEAT_CLASSIFICATION completeness (issue #45)", () => {
  it("has an entry for every feat in the vendored RefData pack", () => {
    const missing: string[] = [];
    for (const feat of Object.values(ref.feats)) {
      const slug = featNameSlug(feat.name);
      if (!FEAT_CLASSIFICATION[slug]) missing.push(feat.name);
    }
    expect(missing).toEqual([]);
  });

  it("covers exactly the number of feats in the vendored pack (no stale/orphaned entries)", () => {
    expect(Object.keys(FEAT_CLASSIFICATION).length).toBe(Object.keys(ref.feats).length);
  });

  it("every entry's bucket is one of the documented buckets", () => {
    const invalid = Object.values(FEAT_CLASSIFICATION).filter((e) => !VALID_BUCKETS.has(e.bucket));
    expect(invalid).toEqual([]);
  });

  it("every entry's slug key matches its own `slug` field and `featNameSlug(name)`", () => {
    const mismatched = Object.entries(FEAT_CLASSIFICATION).filter(
      ([key, e]) => key !== e.slug || key !== featNameSlug(e.name),
    );
    expect(mismatched).toEqual([]);
  });

  it("every entry has a non-empty reasoning note", () => {
    const blank = Object.values(FEAT_CLASSIFICATION).filter((e) => e.note.trim().length === 0);
    expect(blank).toEqual([]);
  });
});

describe("FEAT_CLASSIFICATION spot checks", () => {
  it("classifies the hand-verified static/choice feats as numeric/choice-numeric", () => {
    expect(FEAT_CLASSIFICATION["toughness"]?.bucket).toBe("numeric");
    expect(FEAT_CLASSIFICATION["alertness"]?.bucket).toBe("numeric");
    expect(FEAT_CLASSIFICATION["skill-focus"]?.bucket).toBe("choice-numeric");
    expect(FEAT_CLASSIFICATION["weapon-focus"]?.bucket).toBe("choice-numeric");
  });

  it("classifies the hand-verified situational (saved-rolls) feats as situational", () => {
    expect(FEAT_CLASSIFICATION["power-attack"]?.bucket).toBe("situational");
    expect(FEAT_CLASSIFICATION["point-blank-shot"]?.bucket).toBe("situational");
  });

  it("classifies the hand-verified + newly-extracted pool feats as pool", () => {
    expect(FEAT_CLASSIFICATION["extra-rage"]?.bucket).toBe("pool");
    expect(FEAT_CLASSIFICATION["extra-arcane-pool"]?.bucket).toBe("pool");
  });

  it("classifies the newly-extracted skill-pair/choice feats correctly", () => {
    expect(FEAT_CLASSIFICATION["acrobatic"]?.bucket).toBe("numeric");
    expect(FEAT_CLASSIFICATION["stealthy"]?.bucket).toBe("numeric");
    expect(FEAT_CLASSIFICATION["intimidating-prowess"]?.bucket).toBe("numeric");
    expect(FEAT_CLASSIFICATION["greater-weapon-focus"]?.bucket).toBe("choice-numeric");
    expect(FEAT_CLASSIFICATION["greater-weapon-specialization"]?.bucket).toBe("choice-numeric");
    expect(FEAT_CLASSIFICATION["master-craftsman"]?.bucket).toBe("choice-numeric");
  });

  it("downgrades stacking-suspect / no-target feats to blocked rather than guessing numeric", () => {
    expect(FEAT_CLASSIFICATION["improved-natural-armor"]?.bucket).toBe("blocked");
    expect(FEAT_CLASSIFICATION["spell-focus"]?.bucket).toBe("blocked");
    expect(FEAT_CLASSIFICATION["spell-penetration"]?.bucket).toBe("blocked");
  });

  it("classifies maneuver-scoped Improved/Greater combat feats as situational, not numeric", () => {
    expect(FEAT_CLASSIFICATION["improved-trip"]?.bucket).toBe("situational");
    expect(FEAT_CLASSIFICATION["greater-bull-rush"]?.bucket).toBe("situational");
  });

  it("classifies item-creation and metamagic feats as subsystem", () => {
    expect(FEAT_CLASSIFICATION["craft-wondrous-item"]?.bucket).toBe("subsystem");
    expect(FEAT_CLASSIFICATION["empower-spell"]?.bucket).toBe("subsystem");
  });
});
