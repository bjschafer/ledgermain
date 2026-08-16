/**
 * Mental Focus (occultist) spend toggles — the `tableOptions` counterpart to
 * `bardic-performances.ts` / `raging-song.ts` for the Mental Focus resource
 * pool (`resources.ts`'s `feature.tag === "mentalFocus"` branch).
 *
 * Occultist focus powers split into two shapes (see `occultist-implements.ts`'s
 * doc comment): every known implement school (`build.occultistImplements`,
 * deduped by tag) automatically grants that school's BASE focus power (no
 * picker — `OccultistSchoolDef.basePower`), while the MENU focus powers a
 * character selects (`build.occultistFocusPowers`, `"<schoolTag>:<slug>"` ids
 * resolved via `findOccultistFocusPower`) are per-pick, each carrying its own
 * `OccultistFocusPowerDef.spendToggle`.
 *
 * Only the base-power half is actually reachable from here today:
 * `resources.ts`'s call into this factory forwards `classLevel` and the
 * character's known implement school tags (deduped `build.occultistImplements`)
 * only — NOT `build.occultistFocusPowers` — so there is no way for this
 * function to know which menu powers a character picked. (Contrast
 * `resources.ts`'s ki-pool branch, which does forward `build.monkKiPowers` /
 * `build.ninjaTricks` into `kiSpendToggleOptions` — the occultist branch is
 * missing the analogous argument.) A picked menu power's own `spendToggle`
 * (Aegis, Inspired Assault, Sudden Speed — see `occultist-implements.ts`) is
 * therefore populated data with nowhere to surface yet; closing that gap
 * needs a `resources.ts` change to pass `build.occultistFocusPowers` through
 * and resolve each id via `findOccultistFocusPower`, out of scope here.
 */

import { OCCULTIST_SCHOOLS } from "./occultist-implements.js";
import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Mental Focus — see `resources.ts`'s `feature.tag === "mentalFocus"` branch. */
export const MENTAL_FOCUS_DETAIL = "points/day · toggle focus powers below";

/**
 * The Mental Focus pool's `tableOptions` contribution from every known
 * implement school's automatic base focus power. `classLevel` isn't needed by
 * any base power's own formula today (each is self-scaling off
 * `@classes.occultist.level`, resolved when the toggle is active) — kept in
 * the signature for parity with every other pool's toggle-option factory and
 * for a future level-gated base power.
 */
export function mentalFocusToggleOptions(
  classLevel: number,
  implementSchoolTags: readonly string[],
): ToggleBuffOption[] {
  if (classLevel < 1) return [];
  const options: ToggleBuffOption[] = [];
  for (const tag of new Set(implementSchoolTags)) {
    const school = OCCULTIST_SCHOOLS[tag];
    const toggle = school?.basePower.spendToggle;
    if (!toggle) continue;
    options.push({
      id: `mentalFocus:${tag}:base`,
      name: toggle.name ?? school.basePower.name,
      changes: toggle.changes,
      contextNotes: toggle.contextNotes,
    });
  }
  return options;
}
