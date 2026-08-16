/**
 * Per-day activation shard: features whose classification verdicts live in
 * `class-feature-classification/reachable1.ts` / `reachable2.ts`. See
 * `types.ts` for what belongs in this table and `index.ts` for the merge.
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_REACHABLE_12: Readonly<
  Record<string, readonly PerDayActivationDef[]>
> = {};
