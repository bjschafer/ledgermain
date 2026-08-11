/**
 * Class-feature classification shard: granted powers outside every
 * `RefData.classes[*].features` list — wizard school powers, druid-domain
 * powers, and features no collection path references at all. No patch hook
 * reaches any of these; a real unconditional number buckets `blocked` with a
 * note naming the unrouted path (see `class-feature-effects.ts`'s header).
 */

import type { ClassFeatureClassificationEntry } from "./types.js";

export const CLASS_FEATURE_CLASSIFICATION_UNROUTED_GRANTED: Readonly<
  Record<string, ClassFeatureClassificationEntry>
> = {};
