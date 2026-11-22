/**
 * The gear the Play tab's Items panel can spend: anything carried that gets
 * used up. Two shapes, both read straight off `build.gear` so there is no
 * second copy of an item's state to drift out of step with the inventory:
 *
 * - **Charged** items (a wand, a staff, a healer's kit, a 3/day rod) spend
 *   `ItemInstance.chargesUsed` against the instance's own `charges` cap or,
 *   absent that, the vendored `uses.maxFormula`.
 * - **Single-use** items (a potion, a scroll, alchemist's fire) spend
 *   `quantity`. Using the last one leaves the row at zero rather than deleting
 *   it: gear is addressed by index, and an undo has to find the same row.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

import { CONSUMABLE_KINDS } from "./consumables.js";
import { setGearCharges, setGearQuantity } from "./doc.js";
import { itemMaxCharges } from "./gearDisplay.js";

export interface PlayItem {
  /** Index into `build.gear`. */
  index: number;
  name: string;
  /** Vendored prose, when the row links a `RefData.items` entry. */
  description?: string;
  track: "charges" | "quantity";
  /** Charges or copies left. */
  left: number;
  /** Charge cap; absent for single-use items, which have no ceiling. */
  max?: number;
  /** How often a charged item refills on its own, when it does. */
  per?: "day" | "week";
}

/** Vendored subtypes whose every entry is drunk, applied, or thrown once. */
const SINGLE_USE_SUBTYPES = new Set(["potion", "poison"]);

/** Every spendable item in `build.gear`, in inventory order. */
export function playItems(doc: CharacterDoc, refData: RefData): PlayItem[] {
  const items: PlayItem[] = [];
  doc.build.gear.forEach((inst, index) => {
    if (inst.armor) return;
    const itemDef = inst.itemId ? refData.items[inst.itemId] : undefined;
    const base = {
      index,
      name: inst.name ?? itemDef?.name ?? "Unknown item",
      ...(itemDef?.description ? { description: itemDef.description } : {}),
    };

    const max = inst.charges ?? itemMaxCharges(itemDef);
    if (max != null) {
      const per = itemDef?.uses?.per;
      items.push({
        ...base,
        track: "charges",
        left: Math.max(0, max - (inst.chargesUsed ?? 0)),
        max,
        ...(per === "day" || per === "week" ? { per } : {}),
      });
      return;
    }

    // Generated potions and scrolls carry no `itemId`, only their name.
    const singleUse = itemDef
      ? itemDef.uses?.per === "single" ||
        (itemDef.subType != null && SINGLE_USE_SUBTYPES.has(itemDef.subType))
      : CONSUMABLE_KINDS.some(
          (k) => k.charges == null && inst.name?.startsWith(`${k.namePrefix} `),
        );
    if (singleUse) items.push({ ...base, track: "quantity", left: inst.quantity ?? 1 });
  });
  return items;
}

/** Spend one charge or one copy. A no-op when none are left. */
export function spendItem(doc: CharacterDoc, item: PlayItem): CharacterDoc {
  if (item.left <= 0) return doc;
  const inst = doc.build.gear[item.index];
  if (!inst) return doc;
  return item.track === "charges"
    ? setGearCharges(doc, item.index, (inst.chargesUsed ?? 0) + 1)
    : setGearQuantity(doc, item.index, (inst.quantity ?? 1) - 1);
}

/**
 * Put one back: a charge (never past the cap), or a copy (no ceiling, so a
 * potion picked up mid-fight can be counted without leaving the Play tab).
 */
export function restoreItem(doc: CharacterDoc, item: PlayItem): CharacterDoc {
  const inst = doc.build.gear[item.index];
  if (!inst) return doc;
  if (item.track === "charges") {
    if (item.max != null && item.left >= item.max) return doc;
    return setGearCharges(doc, item.index, (inst.chargesUsed ?? 0) - 1);
  }
  return setGearQuantity(doc, item.index, (inst.quantity ?? 1) + 1);
}

/** The session-log line for a {@link spendItem}, given the item as it was before. */
export function spendItemLine(item: PlayItem): string {
  const left = item.left - 1;
  return item.track === "charges"
    ? `Used a charge of ${item.name} (${left} left)`
    : `Used ${item.name} (${left} left)`;
}

/** The session-log line for a {@link restoreItem}, given the item as it was before. */
export function restoreItemLine(item: PlayItem): string {
  const left = item.left + 1;
  return item.track === "charges"
    ? `Regained a charge of ${item.name} (${left} left)`
    : `Added ${item.name} (${left} carried)`;
}

/**
 * New day: every item that refills daily gets its charges back. Weekly items
 * are left alone, since a night's rest is not a week.
 */
export function rechargeDailyItems(doc: CharacterDoc, refData: RefData): CharacterDoc {
  let changed = false;
  const gear = doc.build.gear.map((inst) => {
    if (!inst.chargesUsed || !inst.itemId) return inst;
    if (refData.items[inst.itemId]?.uses?.per !== "day") return inst;
    changed = true;
    const next = { ...inst };
    delete next.chargesUsed;
    return next;
  });
  return changed ? { ...doc, build: { ...doc.build, gear } } : doc;
}

/** How many gear rows had charges spent in `before` and none in `after`. */
export function itemsRecharged(before: CharacterDoc, after: CharacterDoc): number {
  let n = 0;
  before.build.gear.forEach((inst, i) => {
    if (inst.chargesUsed && !after.build.gear[i]?.chargesUsed) n += 1;
  });
  return n;
}
