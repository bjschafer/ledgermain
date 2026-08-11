/**
 * Class-feature classification shard: cleric domain and subdomain granted
 * powers. These flow through `collect.ts`'s domains section, which applies
 * vendored `changes` but has NO patch hook — a real unconditional number here
 * buckets `blocked` with a note naming the unrouted path, never `numeric`
 * via a patch (see `class-feature-effects.ts`'s reachability header).
 */

import type { ClassFeatureClassificationEntry } from "./types.js";

export const CLASS_FEATURE_CLASSIFICATION_UNROUTED_DOMAINS: Readonly<
  Record<string, ClassFeatureClassificationEntry>
> = {};
