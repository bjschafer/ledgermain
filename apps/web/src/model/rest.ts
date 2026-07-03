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
 *   1. HP — `restHp` (full current HP, nonlethal cleared, temp HP cleared).
 *      PF1 RAW natural healing is actually 1 HP/level per night (2/level for
 *      a full day of complete bed rest), not "full heal" — `restHp` already
 *      diverges from that (it's the pre-existing behavior of the HP panel's
 *      "Rest" button, kept as-is here rather than reimplemented; tightening
 *      it to the RAW rate is a separate concern, not part of unifying the
 *      button).
 *   2. Ability damage — `restAbilityDamage`: -1 per damaged ability. Drain
 *      and penalties are untouched (see that function's doc comment).
 *   3. Resources — `restAllResources`: every stored pool's `used` -> 0.
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
 * Apply a full "new day" rest to `doc`. `derived` supplies max HP (from
 * `restHp`'s HP-max parameter) — omit it to skip the HP reset (e.g. a caller
 * that only cares about the other effects). `refData` lets spell-slot resets
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
    next = restHp(next, derived.hp.max);
  }

  next = restAbilityDamage(next);
  next = restAllResources(next);

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
