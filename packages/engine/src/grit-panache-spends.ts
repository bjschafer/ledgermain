/**
 * Grit (gunslinger) and Panache (swashbuckler) spend toggles — the
 * `tableOptions` counterpart to `bardic-performances.ts` / `raging-song.ts`
 * for these two resource pools (`resources.ts`'s `feature.tag === "grit"` /
 * `"panache"` branches).
 *
 * Content lands with a later content wave — both tables below are
 * intentionally empty (skeleton only). Deeds are grouped by class-level gate,
 * not by a picker (RAW grants every deed a gunslinger/swashbuckler qualifies
 * for at their level, no selection budget), except for the handful gated
 * behind a specific feat instead of a level (e.g. a gunslinger's Menacing
 * Shot deed requires Startling Shot) — `gritToggleOptions` takes the
 * character's known feat slugs (see `feat-effects.ts`'s `featNameSlug`) for
 * exactly that gate, reusing the same slug computation `resources.ts` already
 * does for `FEAT_POOL_EFFECTS` rather than re-deriving it.
 */

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Grit — see `resources.ts`'s `feature.tag === "grit"` branch. */
export const GRIT_DETAIL = "grit points · toggle deeds below";

/** Resource-pool `detail` line for Panache — see `resources.ts`'s `feature.tag === "panache"` branch. */
export const PANACHE_DETAIL = "panache points · toggle deeds below";

/**
 * Grit's `tableOptions`, filtered to the deeds the character qualifies for
 * by level and known feats. Empty today — see file doc comment.
 */
export function gritToggleOptions(
  classLevel: number,
  featSlugs: ReadonlySet<string>,
): ToggleBuffOption[] {
  return [];
}

/**
 * Panache's `tableOptions`, filtered to the deeds the character qualifies for
 * by level, with the character's swashbuckler archetypes applied (base deeds
 * they remove dropped, their own variant deeds appended, mirroring
 * `bardicPerformanceToggleOptions`'s archetype handling). Empty today — see
 * file doc comment.
 */
export function panacheToggleOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
): ToggleBuffOption[] {
  return [];
}
