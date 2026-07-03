/**
 * Pure HP transitions for the live tracker. Each returns a NEW document so they
 * are trivially unit-testable and safe as React state reducers. Derived max HP
 * lives on the computed sheet, so functions that need it take it as a parameter
 * (the document never stores derived values — DESIGN §2/§3).
 *
 * PF1 model:
 *   - Damage is absorbed by temporary HP first, then reduces current HP (which
 *     may go negative — the table tracks dying/death by the number). Temp HP
 *     is fully soaked before `current` ever changes, so `hpState` below never
 *     needs to look at temp HP — by the time it reads `current`, temp HP has
 *     already been factored in (or the damage never touched `current` at all).
 *   - Healing restores current HP up to max; it never restores temporary HP.
 *     Curing hit point damage also removes an equal amount of nonlethal damage
 *     (PF1 CRB, Nonlethal Damage), floored at 0.
 *   - Nonlethal damage accumulates separately; when it meets/exceeds current HP
 *     the creature is staggered/unconscious — see `hpState` (issue #20).
 *
 * This module deliberately does not touch ability-damage-driven unconsciousness
 * (Str/Dex/Con damage reaching the current score) or the negative-level death
 * warning — those are HP-independent thresholds already modelled in
 * `model/afflictions.ts` (`isDisabledByDamage`, `negLevelDeathWarning`) and
 * surfaced by `AfflictionsPanel`. `hpState` only covers the HP-total-driven
 * dying/disabled/staggered states; a character can be in more than one of
 * these states at once and the UI shows both independently rather than this
 * module trying to merge them into one status.
 */

import type { CharacterDoc, DerivedSheet } from "@pf1/schema";

type Hp = CharacterDoc["live"]["hp"];

function withHp(doc: CharacterDoc, hp: Hp): CharacterDoc {
  return { ...doc, live: { ...doc.live, hp } };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply `amount` of (lethal) damage — temp HP soaks it first, then current. */
export function applyDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const { current, temp, nonlethal } = doc.live.hp;
  const fromTemp = Math.min(temp, dmg);
  return withHp(doc, {
    current: current - (dmg - fromTemp),
    temp: temp - fromTemp,
    nonlethal,
  });
}

/**
 * Heal `amount` of current HP, capped at `max`. Does not restore temp HP.
 * Also removes an equal amount of nonlethal damage (floored at 0).
 */
export function applyHealing(doc: CharacterDoc, amount: number, max: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const { current, temp, nonlethal } = doc.live.hp;
  return withHp(doc, {
    current: Math.min(max, current + heal),
    temp,
    nonlethal: nonNeg(nonlethal - heal),
  });
}

/** Set the temporary HP pool (temp HP does not stack; the highest applies). */
export function setTempHp(doc: CharacterDoc, value: number): CharacterDoc {
  return withHp(doc, { ...doc.live.hp, temp: nonNeg(value) });
}

/** Add nonlethal damage. */
export function addNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  return withHp(doc, { ...doc.live.hp, nonlethal: doc.live.hp.nonlethal + add });
}

/** Heal `amount` of nonlethal damage (floored at 0). */
export function healNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  return withHp(doc, { ...doc.live.hp, nonlethal: nonNeg(doc.live.hp.nonlethal - heal) });
}

/** Rest: full current HP, all nonlethal removed, temp cleared. */
export function restHp(doc: CharacterDoc, max: number): CharacterDoc {
  return withHp(doc, { current: max, temp: 0, nonlethal: 0 });
}

/** Manually set the "stabilized" flag (issue #20) — see the schema doc comment on `live.stable`. */
export function setStable(doc: CharacterDoc, stable: boolean): CharacterDoc {
  return { ...doc, live: { ...doc.live, stable } };
}

/** Discriminated HP-total status (issue #20). See `hpState`'s doc comment for the state machine. */
export type HpStatus =
  | "ok"
  | "disabled"
  | "dying"
  | "stable"
  | "dead"
  | "staggered-nonlethal"
  | "unconscious-nonlethal";

export interface HpState {
  status: HpStatus;
  /**
   * The (typically negative) HP value at which the character dies: PF1 RAW
   * kills a character whose current HP is negative and whose magnitude is
   * equal to or greater than their Constitution score, i.e. `current <=
   * -conTotal`. Uses the derived Con TOTAL (base score plus every buff/drain/
   * damage/negative-level modifier already folded in by the engine), not the
   * raw build score, since that's the number that actually governs the
   * threshold at the table right now.
   */
  diesAt: number;
}

/**
 * Derive the PF1 dying/disabled/staggered/dead status from live HP + the
 * computed sheet's Con total. Pure and display-only — nothing here mutates
 * HP; a real stabilization roll (Con check / Heal check / magical healing) is
 * made at the table and recorded via `setStable`.
 *
 * State machine (checked in this order; lethal-HP states take priority over
 * nonlethal ones since nonlethal damage never causes dying/death):
 *   - `current <= -conTotal`            → `dead`
 *   - `current < 0`                     → `stable` if `live.stable` else `dying`
 *   - `current === 0`                   → `disabled` (staggered: one move or
 *                                         standard action per round; a
 *                                         strenuous act deals 1 more damage)
 *   - `nonlethal > current` (current>0) → `unconscious-nonlethal`
 *   - `nonlethal === current`           → `staggered-nonlethal`
 *   - otherwise                         → `ok`
 *
 * Known edge case (not hit by PC play, so left unhandled rather than guessed
 * at): a Con total at or below 0 (only reachable via ability drain zeroing
 * Con, which PF1 RAW treats as instant death by a *different* rule than the
 * dying track modelled here) would make `diesAt >= 0` and misfire as `dead`
 * at 0 HP instead of `disabled`. Worth its own issue if drain-to-0-Con death
 * is ever modelled.
 */
export function hpState(doc: CharacterDoc, derived: DerivedSheet): HpState {
  const { current, nonlethal } = doc.live.hp;
  const diesAt = -derived.abilities.con.total;

  if (current <= diesAt) {
    return { status: "dead", diesAt };
  }
  if (current < 0) {
    return { status: doc.live.stable ? "stable" : "dying", diesAt };
  }
  if (current === 0) {
    return { status: "disabled", diesAt };
  }
  if (nonlethal > current) {
    return { status: "unconscious-nonlethal", diesAt };
  }
  if (nonlethal === current) {
    return { status: "staggered-nonlethal", diesAt };
  }
  return { status: "ok", diesAt };
}
