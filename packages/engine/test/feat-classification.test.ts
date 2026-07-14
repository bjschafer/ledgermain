/**
 * Completeness + sanity tests for issue #45's feat classification audit
 * (feat-classification.ts), keyed by name slug (feat ids are opaque Foundry
 * UUIDs — see feat-effects.ts's featNameSlug doc comment for why slugs, not
 * ids, are the stable key here).
 *
 * The audit's scope is frozen at the 390 feats the Foundry system pack shipped
 * when it ran — it predates the `pf1-content` community-pack merge (see
 * feat-classification.ts's file header), which added ~3,150 more feats to
 * `ref.feats` that this file makes no claim about. So "completeness" here
 * means the audited set is self-consistent (no orphaned entries pointing at
 * feats that no longer exist, no drift in its own entry count), not that it
 * covers every feat currently in the vendored pack.
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
  it("every entry still resolves to a real feat in the vendored pack (no orphaned entries)", () => {
    const featSlugs = new Set(Object.values(ref.feats).map((f) => featNameSlug(f.name)));
    const orphaned = Object.keys(FEAT_CLASSIFICATION).filter((slug) => !featSlugs.has(slug));
    expect(orphaned).toEqual([]);
  });

  it("covers exactly the 390 system-pack feats audited for issue #45 (no silent growth/shrinkage)", () => {
    expect(Object.keys(FEAT_CLASSIFICATION).length).toBe(390);
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
