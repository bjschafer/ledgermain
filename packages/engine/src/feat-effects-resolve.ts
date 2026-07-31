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

import { FEAT_EFFECTS, featNameSlug, type FeatEntry } from "./feat-effects.js";
import {
  FEAT_EFFECTS_EXTRACTED,
  type ExtractedFeatEntry,
  type ExtractionConfidence,
} from "./feat-effects-extracted.js";
import { FEAT_EFFECTS_EXTRACTED_COMMUNITY } from "./feat-effects-extracted-community.js";

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
 * falling back to the machine-extracted tables (system pack, then community
 * pack) only when no earlier table has an entry — a slug present in more than
 * one is governed entirely by the earliest, so the tables can never
 * double-apply for the same feat. The two extracted tables are disjoint by
 * construction (the community sweep excluded every system-pack slug), so
 * their relative order is a formality.
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
  communityTable: Readonly<Record<string, ExtractedFeatEntry>> = FEAT_EFFECTS_EXTRACTED_COMMUNITY,
): ResolvedFeatEffect | undefined {
  const hand = handTable[slug];
  if (hand) return { entry: hand, source: "hand" };

  const extracted = extractedTable[slug] ?? communityTable[slug];
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

/**
 * Fixed class skills granted by the character's feats — every
 * `StaticFeatEntry.classSkills` across `doc.build.feats` and
 * `doc.build.extraFeats`, resolved through the same precedence as any other
 * feat effect. Unioned into `compute()`'s classSkillSet (computeSkills), the
 * same consumption point as race/class/mystery class-skill lists.
 */
export function featGrantedClassSkills(
  doc: { build: { feats?: readonly string[]; extraFeats?: readonly { featId: string }[] } },
  feats: Readonly<Record<string, { name: string } | undefined>>,
): string[] {
  const skills: string[] = [];
  const featIds = [
    ...(doc.build.feats ?? []),
    ...(doc.build.extraFeats ?? []).map((e) => e.featId),
  ];
  for (const featId of featIds) {
    const feat = feats[featId];
    if (!feat) continue;
    const resolved = resolveFeatEffect(featNameSlug(feat.name));
    if (resolved?.entry.type === "static" && resolved.entry.classSkills) {
      skills.push(...resolved.entry.classSkills);
    }
  }
  return skills;
}
