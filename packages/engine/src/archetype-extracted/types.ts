/**
 * Shared types + a tiny `Change`-building helper for the per-class
 * extracted-effects / classification-audit files in this directory (issue
 * #45's batch-extraction pipeline). Kept separate from any single class's
 * file so a wave agent adding a new class never has to touch this file —
 * only `index.ts` (the aggregator) needs a line per new class. See
 * `index.ts`'s doc comment and IMPLEMENTATION_PLAN.md's dated #45 "Batch-
 * extraction wave prep" section for the full per-class file convention.
 */

import type { Change } from "@pf1/schema";

import type { ArchetypeFeatureEffect } from "../archetype-effects.js";

export type ExtractionConfidence = "high" | "medium" | "low";

export interface ExtractedArchetypeFeatureEffect extends ArchetypeFeatureEffect {
  /** How confident the extraction pass is in this entry — see each class file's rubric. */
  confidence: ExtractionConfidence;
  /** The exact source sentence(s) the number(s) were extracted from. */
  provenance: string;
}

export type ArchetypeFeatureClassificationBucket =
  | "numeric"
  | "situational"
  | "subsystem"
  | "blocked";

export interface ArchetypeFeatureClassificationEntry {
  archetypeId: string;
  name: string;
  level: number;
  bucket: ArchetypeFeatureClassificationBucket;
  /** Why this feature landed in this bucket — see each class file's rubric. */
  note: string;
}

/** Small helper for building an inline `Change` literal in a per-class extracted table. */
export const c = (formula: string, target: string, type = "untyped"): Change => ({
  formula,
  target,
  type,
});
