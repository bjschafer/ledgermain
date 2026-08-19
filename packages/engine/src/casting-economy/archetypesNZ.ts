import type { CastingAdjustmentDef } from "./types.js";

/**
 * Casting-economy edits granted by archetype features, classes N–Z by class
 * tag, keyed by vendored `archetypeFeatures` pack id (same keying and shard
 * split as `ARCHETYPE_SLA_GRANTS_NZ`). See `types.ts` for the charter.
 */
export const ARCHETYPE_CASTING_ADJUSTMENTS_NZ: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {};
