/**
 * Single point of precedence between the hand-verified feat-effects table
 * (`feat-effects.ts`'s `FEAT_EFFECTS`) and the machine-extracted one
 * (`feat-effects-extracted.ts`'s `FEAT_EFFECTS_EXTRACTED`, issue #45's feat
 * batch-extraction pass). Mirrors `archetype-effects-resolve.ts`'s precedence
 * module exactly: both `collect.ts` (applying changes) and
 * `apps/web/src/model/feats.ts` (driving the featChoices choice-UI) resolve
 * through this module instead of touching either table directly, so the
 * precedence rule — hand-verified always wins when a slug appears in both —
 * lives in exactly one place and can't drift between the two call sites.
 */

import { FEAT_EFFECTS, type FeatEntry } from "./feat-effects.js";
import {
  FEAT_EFFECTS_EXTRACTED,
  type ExtractedFeatEntry,
  type ExtractionConfidence,
} from "./feat-effects-extracted.js";

export type FeatEffectSource = "hand" | "extracted";

export interface ResolvedFeatEffect {
  entry: FeatEntry;
  source: FeatEffectSource;
  /** Present only when `source === "extracted"`. */
  confidence?: ExtractionConfidence;
  provenance?: string;
}

/**
 * Looks up `slug` (see `featNameSlug`) in the hand-verified table first,
 * falling back to the machine-extracted table only when the hand-verified
 * table has no entry — a slug present in both is governed entirely by the
 * hand-verified one, so the two tables can never double-apply for the same
 * feat.
 *
 * `handTable`/`extractedTable` default to the real production tables; the
 * only reason to override them is the precedence fixture test, which
 * constructs two small tables sharing one slug to prove hand-verified wins
 * without needing an artificial overlap in the real data.
 */
export function resolveFeatEffect(
  slug: string,
  handTable: Readonly<Record<string, FeatEntry>> = FEAT_EFFECTS,
  extractedTable: Readonly<Record<string, ExtractedFeatEntry>> = FEAT_EFFECTS_EXTRACTED,
): ResolvedFeatEffect | undefined {
  const hand = handTable[slug];
  if (hand) return { entry: hand, source: "hand" };

  const extracted = extractedTable[slug];
  if (extracted) {
    return {
      entry: extracted,
      source: "extracted",
      confidence: extracted.confidence,
      provenance: extracted.provenance,
    };
  }
  return undefined;
}
