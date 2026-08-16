/**
 * Per-day activation shard: features whose classification verdicts live in
 * `class-feature-classification/reachable3.ts` / `reachable4.ts`. See
 * `types.ts` for what belongs in this table and `index.ts` for the merge.
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_REACHABLE_34: Readonly<
  Record<string, readonly PerDayActivationDef[]>
> = {};
