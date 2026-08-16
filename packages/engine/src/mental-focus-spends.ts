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
 * Both halves surface here: `resources.ts` forwards the known implement
 * school tags (each contributing its base power's `spendToggle`, when it has
 * one) AND the picked menu-power ids, mirroring how the ki-pool branch
 * forwards `build.monkKiPowers` / `build.ninjaTricks` into
 * `kiSpendToggleOptions`. A menu pick whose school isn't a currently-known
 * implement is skipped rather than surfaced — the same stale-pick tolerance
 * `archetypes.ts`'s occultist grant loop and the web's
 * `chosenOccultistFocusPowerCount` apply to `build.occultistFocusPowers`.
 */

import { findOccultistFocusPower, OCCULTIST_SCHOOLS } from "./occultist-implements.js";
import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Mental Focus — see `resources.ts`'s `feature.tag === "mentalFocus"` branch. */
export const MENTAL_FOCUS_DETAIL = "points/day · toggle focus powers below";

/**
 * The Mental Focus pool's `tableOptions`: every known implement school's
 * automatic base focus power, then every picked menu focus power carrying a
 * `spendToggle` (Aegis, Inspired Assault, Sudden Speed). `classLevel` gates
 * a menu power's `minLevel` (no toggle-carrying power states one today); no
 * base power's own formula needs it (each is self-scaling off
 * `@classes.occultist.level`, resolved when the toggle is active).
 */
export function mentalFocusToggleOptions(
  classLevel: number,
  implementSchoolTags: readonly string[],
  focusPowerIds: readonly string[],
): ToggleBuffOption[] {
  if (classLevel < 1) return [];
  const options: ToggleBuffOption[] = [];
  const knownTags = new Set(implementSchoolTags);
  for (const tag of knownTags) {
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
  for (const focusPowerId of new Set(focusPowerIds)) {
    const found = findOccultistFocusPower(focusPowerId);
    if (!found || !knownTags.has(found.school.tag)) continue;
    const { power } = found;
    const toggle = power.spendToggle;
    if (!toggle) continue;
    if (power.minLevel !== undefined && classLevel < power.minLevel) continue;
    options.push({
      id: `mentalFocus:${found.school.tag}:${power.slug}`,
      name: toggle.name ?? power.name,
      changes: toggle.changes,
      contextNotes: toggle.contextNotes,
    });
  }
  return options;
}
