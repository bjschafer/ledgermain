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
 * The ladder-aware toggle transition on a plain conditions array — extracted
 * (issue #68) so a second tracked creature (the animal companion's own
 * `live.animalCompanion.conditions`, independent of the master's
 * `live.conditions`) can reuse the exact same auto-upgrade/implied-condition
 * behavior rather than a hand-copied duplicate. `toggleCondition` below is
 * just this applied to the master's own array.
 */
export function toggleConditionIn(conditions: readonly string[], id: string): string[] {
  const has = conditions.includes(id);

  if (has) {
    // Deactivation never cascades: only this id is removed.
    return conditions.filter((c) => c !== id);
  }

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

export function toggleCondition(doc: CharacterDoc, id: string): CharacterDoc {
  const conditions = toggleConditionIn(doc.live.conditions, id);
  return { ...doc, live: { ...doc.live, conditions } };
}
