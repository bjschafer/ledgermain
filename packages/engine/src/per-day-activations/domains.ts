/**
 * Per-day activation shard: granted powers whose classification verdicts live
 * in `class-feature-classification/unroutedDomains.ts` (domain/subdomain
 * powers). See `types.ts` for what belongs in this table and `index.ts` for
 * the merge.
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_DOMAINS: Readonly<Record<string, readonly PerDayActivationDef[]>> =
  {};
