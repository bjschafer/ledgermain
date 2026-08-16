/**
 * Per-day activation shard: features whose classification verdicts live in
 * `class-feature-classification/reachable5.ts` / `reachable6.ts`. See
 * `types.ts` for what belongs in this table and `index.ts` for the merge.
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_REACHABLE_56: Readonly<
  Record<string, readonly PerDayActivationDef[]>
> = {};
