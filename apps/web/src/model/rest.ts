/**
 * The single "new day" rest action (issue #30) — composes the independent
 * per-module rest transitions that used to live behind separate panel
 * buttons (HP's "Rest ⤿", Resources' "Rest (full)", Prepared Spells'/
 * spontaneous casting's per-class "New day") into one call, and wires in
 * ability damage's natural healing (issue #18), which had no daily event to
 * hook until now.
 *
 * This module does not reimplement any of the underlying rules — it only
 * imports and chains the existing pure transitions from `model/hp.ts`,
 * `model/afflictions.ts`, `model/resources.ts`, `model/preparedSpells.ts`,
 * and `model/spontaneousSpells.ts`, in this order:
 *
 *   1. HP — `restHp`, respecting `doc.build.settings.restMode` (issue #32):
 *      `"full"` (default, absent = full) heals straight to max; `"natural"`
 *      heals 1 HP × character level (PF1 RAW night's-rest rate, capped at
 *      max — full 2×level bed rest is out of scope for v1). Nonlethal and
 *      temp HP are cleared either way — see `restHp`'s doc comment.
 *   2. Ability damage — `restAbilityDamage`: -1 per damaged ability. Drain
 *      and penalties are untouched (see that function's doc comment).
 *   3. Resources — `restAllResources`: every stored pool's `used` resets so
 *      remaining uses match its refill value (`max` for almost every pool;
 *      Arcane Reservoir's is lower per RAW — issue #43). Requires `refData`
 *      to derive pools; without it, falls back to the old always-full reset.
 *   4. Spells — `restPreparedSpells` + `resetSpontaneousSlots`, once per
 *      caster class (issue #22 multiclass support) when `refData` is given,
 *      so a multiclass character's prepared loadout AND spontaneous slots
 *      reset for every caster class, not just the primary one.
 *
 * Deliberately left untouched:
 *   - Temporary negative levels: PF1 RAW removes one only after a successful
 *     Fortitude save made 24 hours after it was gained — a save rolled at the
 *     table, not something this app can adjudicate. Instead of guessing,
 *     `restNewDay` surfaces `tempNegativeLevelReminder` so the UI can prompt
 *     the player to roll the save and clear it by hand if it succeeds.
 *   - Permanent negative levels: never removed by rest (need restoration
 *     magic).
 *   - Active buffs: buff durations are round-based, and whether a character
 *     "sleeps through" an active buff's remaining duration is a table
 *     judgment (e.g. a paused encounter vs. genuinely resting 8 hours) that
 *     this app doesn't model — left alone by design, not an oversight.
 */
import { deriveResourcePools } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { getNegativeLevels, restAbilityDamage } from "./afflictions.js";
import { restHp } from "./hp.js";
import { restPreparedSpells } from "./preparedSpells.js";
import { restAllResources } from "./resources.js";
import { casterClassesOf, storedClassTag } from "./spellcasting.js";
import { resetSpontaneousSlots } from "./spontaneousSpells.js";

export interface RestNewDayResult {
  doc: CharacterDoc;
  /**
   * True when the character has one or more temporary negative levels: the
   * UI should remind the player that a Fortitude save (24h after each was
   * gained, PF1 RAW) is needed to remove them — `restNewDay` never clears
   * them itself.
   */
  tempNegativeLevelReminder: boolean;
}

/**
 * Apply a full "new day" rest to `doc`. `derived` supplies max HP and
 * character level (for `restHp`'s natural-mode heal rate) — omit it to skip
 * the HP reset (e.g. a caller that only cares about the other effects).
 * `refData` lets spell-slot resets
 * cover every caster class on a multiclass document — omit it to reset only
 * the primary/flat spell fields (matches pre-multiclass behavior).
 */
export function restNewDay(
  doc: CharacterDoc,
  derived?: DerivedSheet,
  refData?: RefData,
): RestNewDayResult {
  let next = doc;

  if (derived) {
    const mode = doc.build.settings?.restMode ?? "full";
    next = restHp(next, derived.hp.max, { mode, level: derived.level });
  }

  next = restAbilityDamage(next);
  next = restAllResources(
    next,
    refData ? deriveResourcePools(next, refData, derived?.abilities) : undefined,
  );

  if (refData) {
    for (const { tag } of casterClassesOf(next, refData)) {
      const classTag = storedClassTag(next, refData, tag);
      next = restPreparedSpells(next, classTag);
      next = resetSpontaneousSlots(next, classTag);
    }
  } else {
    next = restPreparedSpells(next);
    next = resetSpontaneousSlots(next);
  }

  return {
    doc: next,
    tempNegativeLevelReminder: getNegativeLevels(next).temporary > 0,
  };
}
