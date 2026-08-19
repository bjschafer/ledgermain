import type { CastingAdjustmentDef } from "./types.js";

/**
 * Casting-economy edits granted by class features and domain/school/
 * inquisition granted powers, keyed by vendored `classFeatures` pack id
 * (same keying as `CLASS_FEATURE_SLA_GRANTS`). See `types.ts` for the
 * charter.
 */
export const CLASS_FEATURE_CASTING_ADJUSTMENTS: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {};
