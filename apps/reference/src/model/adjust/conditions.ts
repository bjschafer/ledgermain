/**
 * Conditions as statblock adjustments: the engine's clean-room condition
 * table (`packages/engine/src/conditions.ts`) is the single source of truth
 * for what each condition does; this module translates its flat `Change[]`
 * into `AdjustOp`s so a marked condition moves the printed numbers the same
 * way it moves a character sheet.
 *
 * Ladder policy mirrors `apps/web/src/model/conditions.ts`: activating a
 * stricter ladder member drops its milder siblings, activating a milder one
 * under an active stricter sibling is a no-op (it reads as implied), and
 * deactivating never cascades.
 */

import type { Change } from "@pf1/schema";

// Imported straight at the module (the same way `scripts/build-ref-index.ts`
// does) rather than through the `@pf1/engine` barrel, which would drag the
// whole rules engine into the bundle.
import {
  CONDITION_LADDERS,
  CONDITIONS,
  type ConditionDef,
} from "../../../../../packages/engine/src/conditions.js";
import type { AbilityDeltas, AdjustOp, StatblockAdjustment } from "./types.js";

export { CONDITIONS, type ConditionDef };

/** Chip order: the engine table's order (mechanical conditions first, display-only after). */
export const CONDITION_ORDER: readonly ConditionDef[] = Object.values(CONDITIONS);

function opsForChanges(changes: readonly Change[]): AdjustOp[] {
  const ops: AdjustOp[] = [];
  const abilityDeltas: AbilityDeltas = {};

  for (const change of changes) {
    const delta = Number(change.formula);
    if (!Number.isInteger(delta)) continue; // condition changes are flat constants; anything else is not ours to guess
    switch (change.target) {
      case "str":
      case "dex":
        abilityDeltas[change.target] = (abilityDeltas[change.target] ?? 0) + delta;
        break;
      case "attack":
        ops.push({ kind: "attackShift", delta, scope: "all" });
        break;
      case "mattack":
        ops.push({ kind: "attackShift", delta, scope: "melee" });
        break;
      case "wdamage":
        ops.push({ kind: "damageShift", delta });
        break;
      case "ac":
        ops.push({ kind: "acShift", delta });
        break;
      case "allSavingThrows":
        ops.push({ kind: "saveShift", delta });
        break;
      case "init":
        ops.push({ kind: "initShift", delta });
        break;
      case "skills":
        ops.push({ kind: "skillShift", delta });
        break;
      case "skill.per":
        ops.push({ kind: "skillShift", delta, skill: "Perception" });
        break;
      default:
        break; // a target the statblock can't express; the summary still tells the reader
    }
  }

  if (Object.keys(abilityDeltas).length > 0)
    ops.unshift({ kind: "ability", deltas: abilityDeltas });
  return ops;
}

/**
 * The adjustment for one condition id, or undefined when the condition moves
 * no statblock numbers (display-only, or unknown id from a stale record).
 */
export function conditionAdjustment(id: string): StatblockAdjustment | undefined {
  const def = CONDITIONS[id];
  if (!def || def.changes.length === 0) return undefined;
  const ops = opsForChanges(def.changes);
  if (ops.length === 0) return undefined;
  return { key: `condition:${id}`, label: def.name, ops };
}

/** The ladder member ids strictly milder than `id`, when `id` sits on a ladder. */
function milderSiblings(id: string): readonly string[] {
  for (const ladder of CONDITION_LADDERS) {
    const index = ladder.indexOf(id);
    if (index !== -1) return ladder.slice(0, index);
  }
  return [];
}

/**
 * The active condition, if any, strictly more severe than `id` on its ladder.
 * The UI shows `id` as implied (and inert) while this returns something.
 */
export function supersedingCondition(active: readonly string[], id: string): string | undefined {
  for (const ladder of CONDITION_LADDERS) {
    const index = ladder.indexOf(id);
    if (index === -1) continue;
    return ladder.slice(index + 1).find((sibling) => active.includes(sibling));
  }
  return undefined;
}

/** Ladder-aware toggle (see the module comment for the policy). */
export function toggleCondition(active: readonly string[], id: string): string[] {
  if (active.includes(id)) return active.filter((c) => c !== id);
  if (supersedingCondition(active, id) !== undefined) return [...active];
  const milder = new Set(milderSiblings(id));
  return [...active.filter((c) => !milder.has(c)), id];
}

/**
 * The adjustments for a set of active conditions, in mark order. Belt and
 * suspenders: a milder ladder member that slipped in next to a stricter one
 * (a hand-edited record) is skipped rather than double-applied.
 */
export function conditionAdjustments(active: readonly string[]): StatblockAdjustment[] {
  const result: StatblockAdjustment[] = [];
  for (const id of active) {
    if (supersedingCondition(active, id) !== undefined) continue;
    const adj = conditionAdjustment(id);
    if (adj) result.push(adj);
  }
  return result;
}
