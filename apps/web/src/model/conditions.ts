/**
 * Pure condition transitions. Conditions are just ids in `doc.live.conditions`;
 * the engine's conditions table maps each to its mechanical `Change[]`, which
 * `compute()` applies. Toggling one re-derives the sheet automatically.
 *
 * Mutual exclusivity (issue #10): the engine's `CONDITION_LADDERS` groups RAW
 * conditions that supersede each other (fear, fatigue, sickness, dazzled/
 * blinded, grappled/pinned) but deliberately doesn't enforce it — that's a
 * toggle-time policy, applied here:
 *   - Activating a *stricter* ladder member auto-upgrades: any milder active
 *     sibling is removed and the stricter one takes its place.
 *   - Activating a *milder* member while a stricter sibling is already active
 *     is a no-op — the milder condition is "implied" by the stricter one
 *     rather than toggled on. `isImpliedCondition` lets the UI reflect this
 *     (e.g. by disabling that chip) instead of silently ignoring the click.
 *   - Deactivating never cascades: turning off the stricter condition does
 *     NOT restore the milder one. The table (i.e. the player) decides what,
 *     if anything, the character reverts to.
 */

import type { CharacterDoc } from "@pf1/schema";
import { CONDITION_LADDERS } from "@pf1/engine";

export function hasCondition(doc: CharacterDoc, id: string): boolean {
  return doc.live.conditions.includes(id);
}

/** The ladder containing `id` and its position within it (mildest = 0), if any. */
function ladderPositionOf(id: string): { ladder: readonly string[]; index: number } | undefined {
  for (const ladder of CONDITION_LADDERS) {
    const index = ladder.indexOf(id);
    if (index !== -1) return { ladder, index };
  }
  return undefined;
}

/**
 * The active condition id, if any, that is strictly more severe than `id` in
 * its ladder. Undefined if `id` isn't part of a ladder, or no stricter
 * sibling is currently active.
 */
export function supersedingCondition(doc: CharacterDoc, id: string): string | undefined {
  const pos = ladderPositionOf(id);
  if (!pos) return undefined;
  return pos.ladder.slice(pos.index + 1).find((sibling) => hasCondition(doc, sibling));
}

/**
 * True when `id` is a ladder member currently superseded by a stricter,
 * active sibling — the UI should treat it as "implied" (covered by the
 * stricter condition) rather than an independently toggleable chip.
 */
export function isImpliedCondition(doc: CharacterDoc, id: string): boolean {
  return supersedingCondition(doc, id) !== undefined;
}

/**
 * The ladder-aware ACTIVATION half shared by {@link toggleConditionIn} (which
 * additionally handles deactivation) and {@link activateConditionIn} (which
 * never deactivates, for a caller that only ever wants to ensure a condition
 * is on — see that function's doc comment).
 */
function activateInLadder(conditions: readonly string[], id: string): string[] {
  const pos = ladderPositionOf(id);
  if (pos) {
    // A stricter sibling is already active: activating the milder `id` is a
    // no-op (it's implied by the stricter one; see `isImpliedCondition`).
    const supersedingActive = pos.ladder
      .slice(pos.index + 1)
      .some((sib) => conditions.includes(sib));
    if (supersedingActive) return [...conditions];
    // Auto-upgrade: drop any milder siblings, then add id.
    const milder = new Set(pos.ladder.slice(0, pos.index));
    return [...conditions.filter((c) => !milder.has(c)), id];
  }
  return [...conditions, id];
}

/**
 * The ladder-aware toggle transition on a plain conditions array — extracted
 * (issue #68) so a second tracked creature (the animal companion's own
 * `live.animalCompanion.conditions`, independent of the master's
 * `live.conditions`) can reuse the exact same auto-upgrade/implied-condition
 * behavior rather than a hand-copied duplicate. `toggleCondition` below is
 * just this applied to the master's own array.
 */
export function toggleConditionIn(conditions: readonly string[], id: string): string[] {
  if (conditions.includes(id)) {
    // Deactivation never cascades: only this id is removed.
    return conditions.filter((c) => c !== id);
  }
  return activateInLadder(conditions, id);
}

export function toggleCondition(doc: CharacterDoc, id: string): CharacterDoc {
  const conditions = toggleConditionIn(doc.live.conditions, id);
  return withConditions(doc, conditions);
}

/**
 * Ensure `id` is active — unlike {@link toggleConditionIn}, never removes it
 * if it's already present (idempotent "turn on", not a flip). For an
 * automatic system-driven activation (e.g. rage's fatigue aftermath,
 * `model/buffs.ts`'s `applyRageFatigueAftermath`) where accidentally
 * toggling an already-active condition OFF would be exactly backwards.
 */
export function activateConditionIn(conditions: readonly string[], id: string): string[] {
  if (conditions.includes(id)) return [...conditions];
  return activateInLadder(conditions, id);
}

/**
 * Write a new condition list onto the doc, dropping the `conditionRounds`
 * countdown of anything no longer active. Every condition transition goes
 * through here so a timer can never outlive its condition — a stale entry
 * would otherwise re-arm itself the next time the same condition came back.
 */
function withConditions(
  doc: CharacterDoc,
  conditions: string[],
  timers?: Record<string, number>,
): CharacterDoc {
  const active = new Set(conditions);
  const merged = { ...doc.live.conditionRounds, ...timers };
  const kept = Object.fromEntries(Object.entries(merged).filter(([id]) => active.has(id)));
  return {
    ...doc,
    live: {
      ...doc.live,
      conditions,
      conditionRounds: Object.keys(kept).length > 0 ? kept : undefined,
    },
  };
}

/**
 * Ensure `id` is active, optionally for a known number of rounds — the round
 * clock (`model/buffs.ts`'s `advanceRound`) counts it down and clears the
 * condition when it runs out. Omit `rounds` for the untimed default.
 *
 * Re-activating an already-active condition with a duration REPLACES the
 * running countdown rather than adding to it: raging again while still
 * fatigued from the last rage restarts the aftermath, which is both the
 * generous reading and the one a player can predict.
 */
export function activateCondition(doc: CharacterDoc, id: string, rounds?: number): CharacterDoc {
  const conditions = activateConditionIn(doc.live.conditions, id);
  // The ladder may have declined the activation (a stricter sibling is
  // already on), in which case there's no condition here to time.
  if (rounds === undefined || !conditions.includes(id)) return withConditions(doc, conditions);
  return withConditions(doc, conditions, { [id]: Math.max(1, Math.trunc(rounds)) });
}

/** Rounds left on a timed condition, or `undefined` when it's untimed (or not active). */
export function conditionRoundsLeft(doc: CharacterDoc, id: string): number | undefined {
  return hasCondition(doc, id) ? doc.live.conditionRounds?.[id] : undefined;
}
