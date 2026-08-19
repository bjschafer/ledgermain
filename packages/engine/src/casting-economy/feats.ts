import type { CastingAdjustmentDef } from "./types.js";

/**
 * Casting-economy edits granted by feats, keyed by `featNameSlug` (same
 * keying as `FEAT_SLA_GRANTS`). Every def here MUST set `classTag` — a feat
 * whose target class is a player choice with no stored pick is residue, not
 * content (see `types.ts`).
 */
export const FEAT_CASTING_ADJUSTMENTS: Readonly<Record<string, readonly CastingAdjustmentDef[]>> =
  {};
