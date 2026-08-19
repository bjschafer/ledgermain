import type { CastingAdjustmentDef } from "./types.js";

/**
 * Casting-economy edits granted by character traits (keyed by hand `TRAITS`
 * id) and racial traits (keyed by vendored `racialTraits` pack id or hand
 * `RACIAL_TRAITS` id, same dual keying as `RACIAL_TRAIT_SLA_GRANTS`). Every
 * def here MUST set `classTag` — see `types.ts`.
 */
export const CHARACTER_TRAIT_CASTING_ADJUSTMENTS: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {};

export const RACIAL_TRAIT_CASTING_ADJUSTMENTS: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {};
