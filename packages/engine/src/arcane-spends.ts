/**
 * Arcane Pool (magus) and Arcane Reservoir (arcanist) spend toggles — the
 * `tableOptions` counterpart to `bardic-performances.ts` / `raging-song.ts`
 * for these two resource pools (`resources.ts`'s `feature.tag ===
 * "arcanePool"` / `"arcaneReservoir"` branches).
 *
 * Content lands with a later content wave — both tables below are
 * intentionally empty (skeleton only): `classLevel`/`classArchetypeIds` and
 * the character's `doc.build.magusArcana` / `doc.build.arcanistExploits`
 * picks let the eventual tables surface only a pool-spending arcana/exploit
 * the character actually knows, mirroring how `bardicPerformanceToggleOptions`
 * filters by level/archetype. Arcane Reservoir has no archetype-aware base
 * table today (unlike Arcane Pool, which the magus's own archetypes can
 * modify), so `arcaneReservoirToggleOptions` takes no `classLevel`/
 * `classArchetypeIds` — every arcanist exploit that could ever populate this
 * table is gated purely by the exploit picks themselves.
 */

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for the Arcane Pool — see `resources.ts`'s `feature.tag === "arcanePool"` branch. */
export const ARCANE_POOL_DETAIL = "points/day · toggle arcana below";

/** Resource-pool `detail` line for the Arcane Reservoir — see `resources.ts`'s `feature.tag === "arcaneReservoir"` branch. */
export const ARCANE_RESERVOIR_DETAIL = "points · toggle exploits below";

/**
 * The Arcane Pool's `tableOptions`, filtered to the pool-spending magus
 * arcana the character actually knows. Empty today — see file doc comment.
 */
export function arcanePoolToggleOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
  arcanaIds: readonly string[],
): ToggleBuffOption[] {
  return [];
}

/**
 * The Arcane Reservoir's `tableOptions`, filtered to the pool-spending
 * arcanist exploits the character actually knows. Empty today — see file doc
 * comment.
 */
export function arcaneReservoirToggleOptions(exploitIds: readonly string[]): ToggleBuffOption[] {
  return [];
}
