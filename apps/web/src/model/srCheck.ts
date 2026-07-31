/**
 * Spell resistance check adjudication.
 *
 * PF1's rule is a single comparison: an effect subject to SR affects its
 * target only if the caster's check (1d20 + caster level) equals or exceeds
 * the target's SR. Unlike attack rolls and saves, a caster level check has
 * no automatic success on a natural 20 and no automatic failure on a natural
 * 1 — only the total matters, which is why {@link srCheckOutcome} takes a
 * total rather than a die result.
 *
 * This app has no dice roller by design (see `SavedRollsPanel.tsx`'s header
 * comment): the attacker/GM rolls, and the sheet only compares. So this
 * module is pure arithmetic over numbers the player types in, not a random
 * generator.
 *
 * Whether a given effect is even subject to SR at all is answered by the
 * spell's own "Spell Resistance: yes/no/harmless" line elsewhere in the app;
 * this module only adjudicates the check once one applies.
 */

/** What die result a caster needs to beat a given SR at a given caster level. */
export interface SrNeededRoll {
  /** SR minus caster level, unclamped (can run below 1 or above 20). */
  margin: number;
  /**
   * The die result actually needed, clamped to the 1-21 range a d20 check
   * can express. 1 means every possible roll succeeds; 21 means no possible
   * roll succeeds (there is no natural-20 auto-success against SR).
   */
  neededRoll: number;
  /** True when every roll from 1 to 20 clears the SR. */
  autoSucceeds: boolean;
  /** True when no roll from 1 to 20 can clear the SR. */
  impossible: boolean;
}

/**
 * The die result a caster of `casterLevel` needs to roll to beat `sr`, given
 * the caster level check is 1d20 + caster level vs. SR.
 */
export function srNeededRoll(sr: number, casterLevel: number): SrNeededRoll {
  const margin = sr - casterLevel;
  const neededRoll = Math.max(1, Math.min(21, margin));
  return {
    margin,
    neededRoll,
    autoSucceeds: margin <= 1,
    impossible: margin >= 21,
  };
}

/** Whether an already-rolled caster level check total beats a given SR. */
export type SrCheckOutcome = "affects" | "resisted";

/**
 * Adjudicates a caster level check total against SR. A total equal to or
 * greater than SR means the effect affects the target ("affects"); anything
 * lower means SR turns it aside ("resisted").
 */
export function srCheckOutcome(sr: number, checkTotal: number): SrCheckOutcome {
  return checkTotal >= sr ? "affects" : "resisted";
}
