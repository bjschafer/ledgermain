/**
 * Single point of precedence between the hand-verified archetype-effects
 * table (`archetype-effects.ts`, issue #7) and the machine-extracted one
 * (`archetype-extracted/index.ts`'s merged `ARCHETYPE_FEATURE_EFFECTS_EXTRACTED`,
 * issue #45 — see that directory for the per-class file layout). Both
 * `collect.ts` (applying changes) and `archetypes.ts` (deriving the picker's
 * badge + a feature's `detail` summary) resolve through this module instead
 * of touching either table directly, so the precedence rule — hand-verified
 * always wins when an id appears in both — lives in exactly one place and
 * can't drift between the two call sites.
 */

import { ARCHETYPE_FEATURE_EFFECTS, type ArchetypeFeatureEffect } from "./archetype-effects.js";
import {
  ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
  type ExtractedArchetypeFeatureEffect,
} from "./archetype-extracted/index.js";

export type ArchetypeEffectSource = "verified" | "extracted";

export interface ResolvedArchetypeFeatureEffect {
  effect: ArchetypeFeatureEffect;
  source: ArchetypeEffectSource;
  /** Present only when `source === "extracted"`. */
  confidence?: ExtractedArchetypeFeatureEffect["confidence"];
  provenance?: string;
}

/**
 * Looks up `featureId` in the hand-verified table first, falling back to the
 * machine-extracted table only when the hand-verified table has no entry —
 * an id present in both is governed entirely by the hand-verified one, so
 * the two tables can never double-apply for the same feature.
 *
 * `verifiedTable`/`extractedTable` default to the real production tables;
 * the only reason to override them is the precedence fixture test, which
 * constructs two small tables sharing one id to prove verified wins without
 * needing an artificial overlap in the real data.
 */
export function resolveArchetypeFeatureEffect(
  featureId: string,
  verifiedTable: Readonly<Record<string, ArchetypeFeatureEffect>> = ARCHETYPE_FEATURE_EFFECTS,
  extractedTable: Readonly<
    Record<string, ExtractedArchetypeFeatureEffect>
  > = ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
): ResolvedArchetypeFeatureEffect | undefined {
  const verified = verifiedTable[featureId];
  if (verified) return { effect: verified, source: "verified" };

  const extracted = extractedTable[featureId];
  if (extracted) {
    return {
      effect: extracted,
      source: "extracted",
      confidence: extracted.confidence,
      provenance: extracted.provenance,
    };
  }
  return undefined;
}
