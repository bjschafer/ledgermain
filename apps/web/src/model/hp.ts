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

/**
 * Rest for one night. Always clears temp HP and nonlethal damage entirely:
 * temp HP is a spell-granted buffer, not something rest restores, and PF1 RAW
 * heals nonlethal at 1 HP/level per HOUR — over the 8+ hours a "new day"
 * action represents, that's far more than any accumulated nonlethal total, so
 * a full clear is the exact result under both modes below, not a shortcut.
 *
 * `opts.mode` controls current-HP healing (issue #32):
 * - `"full"` (default): heal straight to `max` — the pre-#32 behavior, and
 *   still the default for any document without a `restMode` setting.
 * - `"natural"`: PF1 RAW night's-rest rate — current HP heals by `opts.level`
 *   × 1, capped at `max`. Full bed rest (2×level, a full day of doing nothing
 *   else) is deliberately out of scope for v1 — this only models one night.
 *
 * `opts` is optional (and `mode`/`level` within it) so pre-#32 two-arg call
 * sites keep compiling and keep their heal-to-max behavior unchanged.
 */
export function restHp(
  doc: CharacterDoc,
  max: number,
  opts?: { mode?: "full" | "natural"; level?: number },
): CharacterDoc {
  const mode = opts?.mode ?? "full";
  const current =
    mode === "natural"
      ? Math.min(max, doc.live.hp.current + Math.max(0, opts?.level ?? 0))
      : max;
  return withHp(doc, { current, temp: 0, nonlethal: 0 });
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
   * The (typically negative) HP value at which the character dies from blood
   * loss: PF1 RAW kills a character whose current HP is negative and whose
   * magnitude is equal to or greater than their Constitution score, i.e.
   * `current <= -conTotal`. Uses the derived Con TOTAL (base score plus every
   * buff/drain/damage/negative-level modifier already folded in by the
   * engine), not the raw build score, since that's the number that actually
   * governs the threshold at the table right now. Only meaningful for the
   * `dying`/`stable`/HP-driven `dead` states — when `status` is `dead` via
   * the Con-total-<=0 rule below, `diesAt` is whatever `-conTotal` computes
   * to (possibly >= 0) and shouldn't be read as an HP threshold.
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
 *   - `conTotal <= 0`                   → `dead`, regardless of current HP
 *                                         (PF1 RAW: an ability score — here,
 *                                         Con — reduced to 0 or below by any
 *                                         combination of damage/drain/penalty
 *                                         kills a character outright; a
 *                                         separate rule from the HP dying
 *                                         track below, checked first so it
 *                                         isn't masked by that track — see
 *                                         also `abilityZeroWarnings` in
 *                                         `model/afflictions.ts` for the
 *                                         other five abilities' 0-score
 *                                         effects)
 *   - `current <= -conTotal`            → `dead`
 *   - `current < 0`                     → `stable` if `live.stable` else `dying`
 *   - `current === 0`                   → `disabled` (staggered: one move or
 *                                         standard action per round; a
 *                                         strenuous act deals 1 more damage)
 *   - `nonlethal > current` (current>0) → `unconscious-nonlethal`
 *   - `nonlethal === current`           → `staggered-nonlethal`
 *   - otherwise                         → `ok`
 */
export function hpState(doc: CharacterDoc, derived: DerivedSheet): HpState {
  const { current, nonlethal } = doc.live.hp;
  const conTotal = derived.abilities.con.total;
  const diesAt = -conTotal;

  if (conTotal <= 0) {
    return { status: "dead", diesAt };
  }
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
