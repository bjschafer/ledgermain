/**
 * Per-day activation shard: granted powers whose classification verdicts live
 * in `class-feature-classification/unroutedDomains.ts` (domain/subdomain
 * powers). See `types.ts` for what belongs in this table and `index.ts` for
 * the merge.
 *
 * Empty: domain/subdomain granted powers with a self-facing numeric effect
 * while active almost always scale with the granting class's own level
 * (half cleric level, cleric level outright, ...), and this table has no
 * `@class.unlevel` context to resolve that safely for a power a cleric,
 * inquisitor, or druid nature bond can all grant under the same id — see
 * `unroutedDomains.ts`'s per-entry notes for the reasoning on each power
 * that was considered.
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_DOMAINS: Readonly<Record<string, readonly PerDayActivationDef[]>> =
  {};
