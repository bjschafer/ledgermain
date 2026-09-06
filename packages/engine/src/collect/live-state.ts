/**
 * Live session state that carries changes directly: active buffs and
 * conditions.
 */
import { BUFF_CHANGE_PATCHES } from "../buff-effects.js";
import { CONDITIONS } from "../conditions.js";
import { type CollectContext, evalChange, withBuffCasterLevel } from "./shared.js";

/** Active buffs (live state). */
export function collectActiveBuffs(ctx: CollectContext): void {
  const { rollData, out, masterBuffs } = ctx;
  for (const buff of masterBuffs) {
    const buffRollData = withBuffCasterLevel(buff, rollData);
    for (const ch of buff.changes) {
      evalChange(
        ch.formula,
        buffRollData,
        ch.target,
        ch.type,
        buff.name,
        buff.instanceId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
    // Hand-authored patches for a vendored buff whose own `changes[]` are
    // missing a real numeric effect its description text promises — see
    // `buff-effects.ts`'s doc comment (e.g. Unchained Rage's temp-HP grant).
    // Keyed by name so it applies regardless of activation path (linked-pool
    // toggle, table-buff toggle, or a manual add).
    for (const ch of BUFF_CHANGE_PATCHES[buff.name] ?? []) {
      evalChange(
        ch.formula,
        buffRollData,
        ch.target,
        ch.type,
        buff.name,
        buff.instanceId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }
}

/** Conditions (live state). */
export function collectConditions(ctx: CollectContext): void {
  const { doc, rollData, out } = ctx;
  for (const condId of doc.live.conditions ?? []) {
    const cond = CONDITIONS[condId];
    if (!cond) continue;
    for (const ch of cond.changes) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        cond.name,
        cond.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }
}
