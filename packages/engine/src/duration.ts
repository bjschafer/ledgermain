/**
 * Pure duration model for the round clock. Advancing time decrements each
 * timed buff's `remainingRounds` and drops the ones that reach zero, counts up
 * how long each surviving buff has been active, and ticks the same countdown
 * over timed conditions. Indefinite buffs (no `remainingRounds`) and untimed
 * conditions (no `conditionRounds` entry) are never dropped by the clock.
 * Framework-agnostic so the tracker UI is a thin caller and the behaviour is
 * unit-testable without a DOM.
 */

import type { ActiveBuff } from "@pf1/schema";

export interface AdvanceResult {
  /** Buffs still active after advancing time (timers decremented). */
  buffs: ActiveBuff[];
  /** Buffs that expired during this advance (for UI notification). */
  expired: ActiveBuff[];
}

/**
 * Advance time by `rounds` (default 1). Returns the surviving buffs with their
 * timers decremented and `roundsActive` advanced, plus the list of buffs that
 * expired. Never mutates inputs.
 *
 * An expiring buff is returned with the elapsed rounds it accrued on the way
 * out, so an aftermath keyed off how long it ran (chained rage's fatigue) sees
 * the full duration rather than the count as of the previous round.
 */
export function advanceRounds(buffs: ActiveBuff[], rounds = 1): AdvanceResult {
  const step = Math.max(0, Math.trunc(rounds));
  const remaining: ActiveBuff[] = [];
  const expired: ActiveBuff[] = [];

  for (const buff of buffs) {
    // A buff that expires mid-step ran for however much of the step it had
    // left, not the whole step.
    const elapsed =
      buff.remainingRounds === undefined ? step : Math.min(step, Math.max(0, buff.remainingRounds));
    const ticked = { ...buff, roundsActive: (buff.roundsActive ?? 0) + elapsed };

    if (buff.remainingRounds === undefined) {
      remaining.push(ticked); // indefinite — never dropped by the clock
      continue;
    }
    const next = buff.remainingRounds - step;
    if (next <= 0) expired.push(ticked);
    else remaining.push({ ...ticked, remainingRounds: next });
  }

  return { buffs: remaining, expired };
}

export interface AdvanceConditionsResult {
  /** Condition ids still active after advancing time. */
  conditions: string[];
  /** Remaining countdowns, with the expired entries removed. Omitted when empty. */
  conditionRounds?: Record<string, number>;
  /** Condition ids the clock just ran out on (for UI notification). */
  expired: string[];
}

/**
 * Advance the same `rounds` over timed conditions: each id with a
 * `conditionRounds` entry counts down, and one that reaches zero is dropped
 * from `conditions` along with its entry.
 *
 * A countdown for an id that isn't active is dropped rather than ticked — the
 * condition was cleared by hand while its timer was running, and keeping the
 * orphan would resurrect a stale duration if it were re-applied later.
 */
export function advanceConditionRounds(
  conditions: readonly string[],
  conditionRounds: Readonly<Record<string, number>> | undefined,
  rounds = 1,
): AdvanceConditionsResult {
  if (!conditionRounds || Object.keys(conditionRounds).length === 0) {
    return { conditions: [...conditions], expired: [] };
  }
  const step = Math.max(0, Math.trunc(rounds));
  const active = new Set(conditions);
  const next: Record<string, number> = {};
  const expired: string[] = [];

  for (const [id, left] of Object.entries(conditionRounds)) {
    if (!active.has(id)) continue;
    const remaining = left - step;
    if (remaining <= 0) expired.push(id);
    else next[id] = remaining;
  }

  const stillActive = conditions.filter((id) => !expired.includes(id));
  return {
    conditions: stillActive,
    conditionRounds: Object.keys(next).length > 0 ? next : undefined,
    expired,
  };
}
