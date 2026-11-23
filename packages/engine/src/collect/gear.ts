/** Equipped gear: each equipped item's own changes. */
import type { Change, Item } from "@pf1/schema";

import { type CollectContext, evalChange } from "./shared.js";

/**
 * Every change on an equipped item, paired with its item. `target` narrows to
 * one target, for a subsystem that folds an item's bonus into its own lines
 * (Gloves of Dueling's `weaponTraining`).
 */
export function equippedItemChanges(
  { doc, refData }: CollectContext,
  target?: string,
): { item: Item; change: Change }[] {
  const out: { item: Item; change: Change }[] = [];
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.itemId) continue;
    const item = refData.items[inst.itemId];
    if (!item) continue;
    for (const change of item.changes) {
      if (target === undefined || change.target === target) out.push({ item, change });
    }
  }
  return out;
}

/** Equipped items. */
export function collectEquippedItems(ctx: CollectContext): void {
  for (const { item, change: ch } of equippedItemChanges(ctx)) {
    evalChange(
      ch.formula,
      ctx.rollData,
      ch.target,
      ch.type,
      item.name,
      item.id,
      ctx.out,
      ch.operator,
      ch.saveCategories,
      ch.maneuverCategories,
      ch.acCategories,
    );
  }
}
