/**
 * Mental Focus (occultist) spend toggles — the `tableOptions` counterpart to
 * `bardic-performances.ts` / `raging-song.ts` for the Mental Focus resource
 * pool (`resources.ts`'s `feature.tag === "mentalFocus"` branch).
 *
 * Occultist focus powers split into two shapes (see `occultist-implements.ts`'s
 * doc comment): every known implement school (`build.occultistImplements`,
 * deduped by tag) automatically grants that school's BASE focus power (no
 * picker — `OccultistSchoolDef.basePower`, which carries no id of its own),
 * while the MENU focus powers a character selects
 * (`build.occultistFocusPowers`, `"<schoolTag>:<slug>"` ids resolved via
 * `findOccultistFocusPower`) are per-pick and each carry their own
 * `OccultistFocusPowerDef.spendToggle` field (see that type). This factory
 * only needs to know which schools the character has learned — `classLevel`
 * for level-gated riders and `implementSchoolTags` (deduped, not a doc) to
 * build the base-power half of the table; the menu-power half is resolved
 * directly by `resources.ts` from each picked focus power's own
 * `spendToggle`, not through this factory.
 *
 * Content lands with a later content wave — the table below is
 * intentionally empty (skeleton only).
 */

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Mental Focus — see `resources.ts`'s `feature.tag === "mentalFocus"` branch. */
export const MENTAL_FOCUS_DETAIL = "points/day · toggle focus powers below";

/**
 * The Mental Focus pool's `tableOptions` contribution from every known
 * implement school's automatic base focus power. Empty today — see file doc
 * comment.
 */
export function mentalFocusToggleOptions(
  classLevel: number,
  implementSchoolTags: readonly string[],
): ToggleBuffOption[] {
  return [];
}
