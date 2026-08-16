/**
 * Merged bard archetype performance-variant table. Shards are alphabetical by
 * archetype slug (see each shard's doc comment); `bardicPerformanceToggleOptions`
 * (`bardic-performances.ts`) consumes the merged list. Drift guards
 * (archetype ids resolve, removed tags exist, no duplicate archetype entries)
 * live in `test/bardicPerformanceVariants.test.ts`.
 */

import { SHARD_A_VARIANTS } from "./shardA.js";
import { SHARD_B_VARIANTS } from "./shardB.js";
import { SHARD_C_VARIANTS } from "./shardC.js";
import { SHARD_D_VARIANTS } from "./shardD.js";
import { SHARD_E_VARIANTS } from "./shardE.js";
import type { ArchetypePerformanceVariant } from "./types.js";

export const BARD_PERFORMANCE_VARIANTS: ArchetypePerformanceVariant[] = [
  ...SHARD_A_VARIANTS,
  ...SHARD_B_VARIANTS,
  ...SHARD_C_VARIANTS,
  ...SHARD_D_VARIANTS,
  ...SHARD_E_VARIANTS,
];
