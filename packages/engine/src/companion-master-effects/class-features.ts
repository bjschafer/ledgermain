/**
 * BASE-CLASS features that modify (or grant) the tracked companion/mount —
 * `COMPANION_EFFECT_CLASS_FEATURES`, keyed by the vendored `classFeatures`
 * pack id (the `PER_DAY_ACTIVATIONS` convention; the id is what
 * `scripts/mech-coverage.ts` matches). The gate that actually applies an
 * entry is `classTag` + `minLevel` (+ optional `when` for choice-gated
 * features like paladin Divine Bond's mount option — a feature that is a
 * CHOICE in its class must never ride a bare level gate, the standing
 * "choice sub-options vendored as automatic grants" trap). Verify every
 * number against the vendored description before wiring.
 */

import type { ClassFeatureCompanionEffect } from "./types.js";

export const COMPANION_EFFECT_CLASS_FEATURES: Readonly<
  Record<string, ClassFeatureCompanionEffect>
> = {};
