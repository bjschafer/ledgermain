/**
 * Shared types for the per-shard vendored-racial-trait classification files in
 * this directory. Kept separate so an agent adding entries to a shard never
 * touches this file — only `index.ts` merges shards.
 *
 * What this audit is: a per-entry triage verdict over the vendored
 * `RefData.racialTraits` catalog (the ~80-race alternate-trait pack), mirroring
 * `archetype-extracted/`'s classification convention. It is an audit artifact —
 * nothing in `compute`/`collect.ts` reads it; `scripts/mech-coverage.ts`
 * consumes it to separate reviewed backlog from undiscovered backlog.
 *
 * Bucket rubric (the archetype rubric, adapted):
 *  - "numeric"     — an unconditional, always-on number the sheet should carry.
 *                    Requires a wired route (the entry's own `changes[]`/
 *                    `openChanges[]`, a `VENDORED_RACIAL_TRAIT_SAVE_NOTES`
 *                    promotion, a data-pipeline
 *                    `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` entry, or a
 *                    hand-authored `RACIAL_TRAITS` counterpart) — the
 *                    classification test enforces this.
 *  - "situational" — a real number, but scoped to a maneuver, enemy state, or
 *                    action the static sheet can't detect without
 *                    over-applying. Never given an unconditional Change.
 *  - "subsystem"   — grants an ability, sense, proficiency, spell-like
 *                    ability, or rules exception with no Change-shaped number.
 *  - "blocked"     — a real number with no expressible engine target, an
 *                    ambiguous/stacking-suspect reading, or a scope outside
 *                    the `SAVE_CATEGORIES`/targets vocabulary. Downgrading
 *                    here rather than guessing is the point: wrong sheet
 *                    numbers are the worst failure mode.
 */

export type RacialTraitClassificationBucket = "numeric" | "situational" | "subsystem" | "blocked";

export interface RacialTraitClassificationEntry {
  /** Vendored pack id — the `RefData.racialTraits` key this verdict covers. */
  id: string;
  /**
   * `RacialTrait.race` comma-joined (`race.join(",")` — the vendored field is
   * an array: base race first, then any heritage variant, e.g.
   * `"Dhampir,Svetocher"`). Drift guard, verified by the test.
   */
  race: string;
  /** `RacialTrait.name` verbatim — drift guard, verified by the test. */
  name: string;
  bucket: RacialTraitClassificationBucket;
  /** Why this trait landed in this bucket. */
  note: string;
}
