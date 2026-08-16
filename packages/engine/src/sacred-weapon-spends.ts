/**
 * Sacred Weapon (warpriest) spend toggles — the `tableOptions` counterpart to
 * `bardic-performances.ts` / `raging-song.ts` for the Sacred Weapon resource
 * pool (`resources.ts`'s `feature.tag === "sacredWeapon"` branch).
 *
 * Content lands with a later content wave — the table below is
 * intentionally empty (skeleton only): `classLevel`/`classArchetypeIds` let
 * the eventual table gate a warpriest's blessing-derived Sacred Weapon
 * riders by level, and drop/replace entries the character's warpriest
 * archetypes swap out, mirroring `bardicPerformanceToggleOptions`'s
 * archetype handling.
 */

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Sacred Weapon — see `resources.ts`'s `feature.tag === "sacredWeapon"` branch. */
export const SACRED_WEAPON_DETAIL = "uses/day · toggle abilities below";

/**
 * Sacred Weapon's `tableOptions`, filtered to what the character has
 * unlocked at `classLevel`, with the character's warpriest archetypes
 * applied. Empty today — see file doc comment.
 */
export function sacredWeaponToggleOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
): ToggleBuffOption[] {
  return [];
}
