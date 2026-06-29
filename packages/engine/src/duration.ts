/**
 * Pure duration model for active buffs. Advancing time decrements each timed
 * buff's `remainingRounds` and drops the ones that reach zero. Indefinite buffs
 * (no `remainingRounds`) are never touched. Framework-agnostic so the tracker UI
 * is a thin caller and the behaviour is unit-testable without a DOM.
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
 * timers decremented and the list of buffs that expired. Never mutates inputs.
 */
export function advanceRounds(buffs: ActiveBuff[], rounds = 1): AdvanceResult {
  const step = Math.max(0, Math.trunc(rounds));
  const remaining: ActiveBuff[] = [];
  const expired: ActiveBuff[] = [];

  for (const buff of buffs) {
    if (buff.remainingRounds === undefined) {
      remaining.push(buff); // indefinite — unaffected by the clock
      continue;
    }
    const next = buff.remainingRounds - step;
    if (next <= 0) expired.push(buff);
    else remaining.push({ ...buff, remainingRounds: next });
  }

  return { buffs: remaining, expired };
}
