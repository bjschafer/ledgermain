/**
 * Per-day activation shard: granted powers whose classification verdicts live
 * in `class-feature-classification/unroutedGranted.ts` (wizard schools,
 * inquisitions, and other non-domain granted paths). See `types.ts` for what
 * belongs in this table and `index.ts` for the merge.
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_GRANTED: Readonly<Record<string, readonly PerDayActivationDef[]>> =
  {};
