/**
 * Aggregator for the vendored-class-feature classification audit: merges every
 * per-shard file in this directory into the single map
 * `scripts/mech-coverage.ts` consumes. This is the only file a diff adding a
 * new shard should need to touch outside the shard itself.
 *
 * Shard convention: unlike `racial-trait-classification/`'s alphabetical
 * ranges, class features have no clean segmentation axis (2,347 entries, all
 * `subType: "classFeat"`, 89 duplicate names), so shards follow the triage
 * wave's ownership split instead: `reachable1`–`reachable6` partition the
 * features granted via `RefData.classes[*].features` (grouped by granting
 * class), while `unroutedDomains` / `unroutedGranted` hold the granted-power
 * paths no `CLASS_FEATURE_CHANGE_PATCHES` entry can reach. Membership is
 * wave-assigned rather than derivable, which is fine: entries are keyed by
 * pack id, the classification test asserts the merge is collision-free, and
 * new verdicts may go in any shard whose doc comment fits.
 */

import type { ClassFeatureClassificationEntry } from "./types.js";
import { CLASS_FEATURE_CLASSIFICATION_REACHABLE_1 } from "./reachable1.js";
import { CLASS_FEATURE_CLASSIFICATION_REACHABLE_2 } from "./reachable2.js";
import { CLASS_FEATURE_CLASSIFICATION_REACHABLE_3 } from "./reachable3.js";
import { CLASS_FEATURE_CLASSIFICATION_REACHABLE_4 } from "./reachable4.js";
import { CLASS_FEATURE_CLASSIFICATION_REACHABLE_5 } from "./reachable5.js";
import { CLASS_FEATURE_CLASSIFICATION_REACHABLE_6 } from "./reachable6.js";
import { CLASS_FEATURE_CLASSIFICATION_UNROUTED_DOMAINS } from "./unroutedDomains.js";
import { CLASS_FEATURE_CLASSIFICATION_UNROUTED_GRANTED } from "./unroutedGranted.js";

export type { ClassFeatureClassificationBucket, ClassFeatureClassificationEntry } from "./types.js";

export const CLASS_FEATURE_CLASSIFICATION_SHARDS: readonly Readonly<
  Record<string, ClassFeatureClassificationEntry>
>[] = [
  CLASS_FEATURE_CLASSIFICATION_REACHABLE_1,
  CLASS_FEATURE_CLASSIFICATION_REACHABLE_2,
  CLASS_FEATURE_CLASSIFICATION_REACHABLE_3,
  CLASS_FEATURE_CLASSIFICATION_REACHABLE_4,
  CLASS_FEATURE_CLASSIFICATION_REACHABLE_5,
  CLASS_FEATURE_CLASSIFICATION_REACHABLE_6,
  CLASS_FEATURE_CLASSIFICATION_UNROUTED_DOMAINS,
  CLASS_FEATURE_CLASSIFICATION_UNROUTED_GRANTED,
];

/** Merged audit, keyed by vendored `RefData.classFeatures` pack id. */
export const CLASS_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ClassFeatureClassificationEntry>
> = Object.assign({}, ...CLASS_FEATURE_CLASSIFICATION_SHARDS) as Record<
  string,
  ClassFeatureClassificationEntry
>;
