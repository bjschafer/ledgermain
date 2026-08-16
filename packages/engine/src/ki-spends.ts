/**
 * Ki Pool spend toggles (monk/monk unchained ki powers, ninja tricks that
 * cost ki) — the `tableOptions` counterpart to `bardic-performances.ts` /
 * `raging-song.ts` for the Ki Pool resource pool (`resources.ts`'s
 * `feature.tag === "kiPool"` branch, three class-tag bearers: monk,
 * monkUnchained, ninja).
 *
 * Content lands with a later content wave — the table below is
 * intentionally empty (skeleton only): `classTag`/`classLevel`/
 * `classArchetypeIds` select which vendored Ki Pool bearer is asking, and
 * `kiPowerIds`/`ninjaTrickIds` (the character's `doc.build.monkKiPowers` /
 * `doc.build.ninjaTricks` picks) let the eventual table surface only a
 * ki-spending POWER the character actually knows, mirroring how
 * `bardicPerformanceToggleOptions` filters by level/archetype.
 */

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for the Ki Pool — see `resources.ts`'s `feature.tag === "kiPool"` branch. */
export const KI_POOL_DETAIL = "ki points · toggle powers below";

/**
 * The Ki Pool's `tableOptions`, filtered to the ki-spending powers the
 * character actually knows. Empty today — see file doc comment.
 */
export function kiSpendToggleOptions(
  classTag: "monk" | "monkUnchained" | "ninja",
  classLevel: number,
  classArchetypeIds: readonly string[],
  kiPowerIds: readonly string[],
  ninjaTrickIds: readonly string[],
): ToggleBuffOption[] {
  return [];
}
