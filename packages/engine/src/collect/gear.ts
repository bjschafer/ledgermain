/**
 * Equipped gear: each equipped item's own changes plus the hand-authored
 * `ITEM_CHANGE_PATCHES` supplement.
 */
import { ITEM_CHANGE_PATCHES } from "../item-effects.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Equipped items. */
export function collectEquippedItems(ctx: CollectContext): void {
  const { doc, refData, rollData, out } = ctx;
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.itemId) continue;
    const item = refData.items[inst.itemId];
    if (!item) continue;
    const changes = [...item.changes, ...(ITEM_CHANGE_PATCHES[item.name] ?? [])];
    for (const ch of changes) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        item.name,
        item.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }
}
