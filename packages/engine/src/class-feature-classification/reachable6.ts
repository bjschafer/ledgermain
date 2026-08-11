/**
 * Class-feature classification shard: wave assignment "reachable6" — features
 * granted through some `RefData.classes[*].features` list (base or prestige),
 * so a `CLASS_FEATURE_CHANGE_PATCHES` entry can reach them. Owner-assigned
 * worklist; `index.ts` documents the shard convention.
 */

import type { ClassFeatureClassificationEntry } from "./types.js";

export const CLASS_FEATURE_CLASSIFICATION_REACHABLE_6: Readonly<
  Record<string, ClassFeatureClassificationEntry>
> = {};
