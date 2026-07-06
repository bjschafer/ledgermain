/**
 * Aggregator for issue #45's batch-extraction pipeline: composes every
 * per-class file in this directory into the single flat tables
 * `archetype-effects-resolve.ts` (effects) and the engine barrel
 * (classification, an audit artifact — nothing in `compute()`/`collect.ts`
 * reads it) already expect. This is the ONLY file a new wave agent's diff
 * should need to touch outside its own new per-class file.
 *
 * Per-class file convention (also documented in IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section — read that first if you're
 * adding a class): each class gets its own `./<class-tag>.ts` file exporting
 * two `Readonly<Record<string, ...>>` consts, both keyed by the archetype
 * feature's own `RefEntity.id` (`"<classTag>:<archetypeSlug>:<featureSlug>:<level>"`):
 *
 *   - `<CLASS>_ARCHETYPE_EFFECTS_EXTRACTED` — machine-extracted `Change`-shaped
 *     effects (`ExtractedArchetypeFeatureEffect`, from `./types.js`).
 *   - `<CLASS>_ARCHETYPE_FEATURE_CLASSIFICATION` — the full per-feature audit
 *     (`ArchetypeFeatureClassificationEntry`, from `./types.js`), covering
 *     EVERY feature of EVERY vendored archetype for that class, not just the
 *     ones that got an entry in the effects table.
 *
 * A class file never imports another class's file, and never needs to touch
 * `./types.js` (shared types + the `c()` Change-builder helper already live
 * there). Adding a class means: one new `./<class-tag>.ts` file, plus one new
 * import + one new object-spread line in EACH of the two merges below — no
 * other file in the pipeline changes. Key collisions across classes can't
 * happen because every key is prefixed with its own class tag.
 */

import { BARD_ARCHETYPE_EFFECTS_EXTRACTED, BARD_ARCHETYPE_FEATURE_CLASSIFICATION } from "./bard.js";
import {
  ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED,
  ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./arcanist.js";
import {
  DRUID_ARCHETYPE_EFFECTS_EXTRACTED,
  DRUID_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./druid.js";
import {
  FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./fighter.js";
import { MONK_ARCHETYPE_EFFECTS_EXTRACTED, MONK_ARCHETYPE_FEATURE_CLASSIFICATION } from "./monk.js";
import {
  RANGER_ARCHETYPE_EFFECTS_EXTRACTED,
  RANGER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./ranger.js";
import {
  ROGUE_ARCHETYPE_EFFECTS_EXTRACTED,
  ROGUE_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./rogue.js";
import {
  SORCERER_ARCHETYPE_EFFECTS_EXTRACTED,
  SORCERER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./sorcerer.js";
import type {
  ArchetypeFeatureClassificationEntry,
  ExtractedArchetypeFeatureEffect,
} from "./types.js";

export const ARCHETYPE_FEATURE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  ...ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED,
  ...BARD_ARCHETYPE_EFFECTS_EXTRACTED,
  ...DRUID_ARCHETYPE_EFFECTS_EXTRACTED,
  ...FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  ...MONK_ARCHETYPE_EFFECTS_EXTRACTED,
  ...RANGER_ARCHETYPE_EFFECTS_EXTRACTED,
  ...ROGUE_ARCHETYPE_EFFECTS_EXTRACTED,
  ...SORCERER_ARCHETYPE_EFFECTS_EXTRACTED,
};

export const ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  ...ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...BARD_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...DRUID_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...MONK_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...RANGER_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...ROGUE_ARCHETYPE_FEATURE_CLASSIFICATION,
  ...SORCERER_ARCHETYPE_FEATURE_CLASSIFICATION,
};

export {
  type ExtractionConfidence,
  type ExtractedArchetypeFeatureEffect,
  type ArchetypeFeatureClassificationBucket,
  type ArchetypeFeatureClassificationEntry,
} from "./types.js";
// Re-exported for callers that want a specific class's slice directly (e.g.
// fixture tests spot-checking one class) without importing the aggregator's
// merged table.
export { BARD_ARCHETYPE_EFFECTS_EXTRACTED, BARD_ARCHETYPE_FEATURE_CLASSIFICATION } from "./bard.js";
export {
  ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED,
  ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./arcanist.js";
export {
  DRUID_ARCHETYPE_EFFECTS_EXTRACTED,
  DRUID_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./druid.js";
export {
  FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./fighter.js";
export { MONK_ARCHETYPE_EFFECTS_EXTRACTED, MONK_ARCHETYPE_FEATURE_CLASSIFICATION } from "./monk.js";
export {
  RANGER_ARCHETYPE_EFFECTS_EXTRACTED,
  RANGER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./ranger.js";
export {
  ROGUE_ARCHETYPE_EFFECTS_EXTRACTED,
  ROGUE_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./rogue.js";
export {
  SORCERER_ARCHETYPE_EFFECTS_EXTRACTED,
  SORCERER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "./sorcerer.js";
