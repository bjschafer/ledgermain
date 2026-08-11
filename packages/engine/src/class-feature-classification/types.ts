/**
 * Shared types for the per-shard vendored-class-feature classification files
 * in this directory. Kept separate so an agent adding entries to a shard never
 * touches this file — only `index.ts` merges shards.
 *
 * What this audit is: a per-entry triage verdict over the vendored
 * `RefData.classFeatures` catalog, mirroring `racial-trait-classification/`
 * and `archetype-extracted/`'s convention. It is an audit artifact — nothing
 * in `compute`/`collect.ts` reads it; `scripts/mech-coverage.ts` consumes it
 * to separate reviewed backlog from undiscovered backlog.
 *
 * Bucket rubric (the archetype rubric, adapted):
 *  - "numeric"     — an unconditional, always-on number the sheet should
 *                    carry. Requires a wired route (the entry's own vendored
 *                    `changes[]`, or a `CLASS_FEATURE_CHANGE_PATCHES` entry
 *                    matching the feature's name) — the classification test
 *                    enforces this. A patch is only reachable when some
 *                    class's `RefData.classes[*].features` list grants the
 *                    feature (see `class-feature-effects.ts`'s header for the
 *                    reachability trap); a real number on an unreachable path
 *                    belongs in "blocked", not here.
 *  - "situational" — a real number, but scoped to an activation, resource,
 *                    enemy state, or action the static sheet can't detect
 *                    without over-applying. Never given an unconditional
 *                    Change.
 *  - "subsystem"   — grants an ability, sense, proficiency, spell-like
 *                    ability, choice from a talent-like list, or rules
 *                    exception with no Change-shaped number.
 *  - "blocked"     — a real number with no expressible engine target, an
 *                    ambiguous/stacking-suspect reading, a scope outside the
 *                    `SAVE_CATEGORIES`/targets vocabulary, or a granting path
 *                    with no patch hook (domain/subdomain granted powers,
 *                    wizard school powers, druid-domain powers — note which).
 *                    Downgrading here rather than guessing is the point:
 *                    wrong sheet numbers are the worst failure mode.
 */

export type ClassFeatureClassificationBucket = "numeric" | "situational" | "subsystem" | "blocked";

export interface ClassFeatureClassificationEntry {
  /** Vendored pack id — the `RefData.classFeatures` key this verdict covers. */
  id: string;
  /** `ClassFeature.name` verbatim — drift guard, verified by the test. */
  name: string;
  bucket: ClassFeatureClassificationBucket;
  /** Why this feature landed in this bucket. */
  note: string;
}
