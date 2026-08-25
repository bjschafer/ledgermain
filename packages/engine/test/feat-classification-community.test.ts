import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { FEAT_CLASSIFICATION } from "../src/feat-classification.js";
import {
  FEAT_CLASSIFICATION_COMMUNITY,
  FEAT_CLASSIFICATION_COMMUNITY_NOTES,
} from "../src/feat-classification-community.js";
import { FEAT_EFFECTS, FEAT_POOL_EFFECTS, featNameSlug } from "../src/feat-effects.js";
import { FEAT_EFFECTS_EXTRACTED } from "../src/feat-effects-extracted.js";
import { FEAT_EFFECTS_EXTRACTED_COMMUNITY } from "../src/feat-effects-extracted-community.js";
import { FEAT_NATURAL_ATTACKS } from "../src/pc-natural-attacks/feats.js";

const ref = loadRefData();

const VALID_BUCKETS = new Set([
  "numeric",
  "choice-numeric",
  "substitution",
  "situational",
  "pool",
  "subsystem",
  "blocked",
]);

/**
 * Mirror of the sweep's HTML-to-text strip, for re-verifying provenance
 * quotes against the vendored descriptions. Comparison collapses whitespace
 * on both sides so tag boundaries and entity spacing can't cause false
 * mismatches.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

describe("FEAT_CLASSIFICATION_COMMUNITY completeness", () => {
  const featSlugs = new Map(Object.values(ref.feats).map((f) => [featNameSlug(f.name), f]));

  it("the frozen audit and the community sweep together cover every vendored feat, with no overlap", () => {
    const missing = [...featSlugs.keys()].filter(
      (slug) => !(slug in FEAT_CLASSIFICATION) && !(slug in FEAT_CLASSIFICATION_COMMUNITY),
    );
    expect(missing).toEqual([]);

    const orphaned = Object.keys(FEAT_CLASSIFICATION_COMMUNITY).filter((s) => !featSlugs.has(s));
    expect(orphaned).toEqual([]);

    const overlap = Object.keys(FEAT_CLASSIFICATION_COMMUNITY).filter(
      (s) => s in FEAT_CLASSIFICATION,
    );
    expect(overlap).toEqual([]);
  });

  it("every bucket is valid and every note belongs to a classified slug", () => {
    const invalid = Object.entries(FEAT_CLASSIFICATION_COMMUNITY).filter(
      ([, b]) => !VALID_BUCKETS.has(b),
    );
    expect(invalid).toEqual([]);

    const strayNotes = Object.keys(FEAT_CLASSIFICATION_COMMUNITY_NOTES).filter(
      (s) => !(s in FEAT_CLASSIFICATION_COMMUNITY),
    );
    expect(strayNotes).toEqual([]);
  });

  it("every community mover is wired, and every wired entry is a classified mover", () => {
    for (const [slug, bucket] of Object.entries(FEAT_CLASSIFICATION_COMMUNITY)) {
      if (bucket === "numeric" || bucket === "choice-numeric") {
        const wired =
          slug in FEAT_EFFECTS_EXTRACTED_COMMUNITY ||
          slug in FEAT_EFFECTS ||
          slug in FEAT_EFFECTS_EXTRACTED ||
          slug in FEAT_NATURAL_ATTACKS;
        expect(wired ? slug : `${slug}: mover without an effects entry`).toBe(slug);
      }
      if (bucket === "pool") {
        expect(slug in FEAT_POOL_EFFECTS ? slug : `${slug}: pool without an entry`).toBe(slug);
      }
    }

    for (const slug of Object.keys(FEAT_EFFECTS_EXTRACTED_COMMUNITY)) {
      const bucket = FEAT_CLASSIFICATION_COMMUNITY[slug];
      expect(
        bucket === "numeric" || bucket === "choice-numeric"
          ? slug
          : `${slug}: wired but bucketed ${bucket}`,
      ).toBe(slug);
    }
  });

  it("every community extracted entry's provenance is a verbatim quote of the vendored description", () => {
    for (const [slug, entry] of Object.entries(FEAT_EFFECTS_EXTRACTED_COMMUNITY)) {
      const feat = featSlugs.get(slug);
      expect(feat ? slug : `${slug}: no vendored feat`).toBe(slug);
      const description = squash(stripHtml(feat?.description ?? ""));
      const quote = squash(entry.provenance);
      expect(
        description.includes(quote) ? slug : `${slug}: provenance not found in description`,
      ).toBe(slug);
    }
  });

  it("spot checks", () => {
    // Mythic feats are bucketed subsystem wholesale (mythic tier is unmodeled).
    expect(FEAT_CLASSIFICATION_COMMUNITY["power-attack-mythic"]).toBe("subsystem");
    // The textbook rank-gated skill pair.
    expect(FEAT_CLASSIFICATION_COMMUNITY["nature-soul"]).toBe("numeric");
    // Style-feat clauses prefixed "While using this style" are stance-gated,
    // unprefixed ones are not — Snake Style's Sense Motive bonus applies.
    expect(FEAT_CLASSIFICATION_COMMUNITY["snake-style"]).toBe("numeric");
    // Pool promotions.
    expect(FEAT_CLASSIFICATION_COMMUNITY["expanded-phrenic-pool"]).toBe("pool");
    expect(FEAT_CLASSIFICATION_COMMUNITY["extended-bane"]).toBe("pool");
    // Teamwork feats stay situational/subsystem (ally-state conditions).
    expect(["situational", "subsystem"]).toContain(
      FEAT_CLASSIFICATION_COMMUNITY["coordinated-shot"] ?? "missing",
    );
  });
});
