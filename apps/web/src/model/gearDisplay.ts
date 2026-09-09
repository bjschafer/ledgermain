/**
 * One-line display strings for the gear pickers and the inventory list. Pure
 * formatting pulled out of `GearSection` so the branching in each of these
 * (which fields are present, which are worth showing) is testable without a
 * DOM: they were the only logic in a 1,700-line component that could produce a
 * visibly wrong string.
 */

import { tryEvaluateFormula } from "@pf1/engine";
import type { ArmorRef, Item } from "@pf1/schema";

import type { ConsumableEntry } from "./consumables.js";
import type { Kit } from "./kits.js";
import { changeTargetLabel } from "./names.js";

const WEIGHT_LABEL: Record<number, string> = { 0: "None", 1: "Light", 2: "Medium", 3: "Heavy" };

/** Render a concise human-readable summary of a Change (e.g. "+2 deflection to AC"). */
export function changeLabel(change: { formula: string; target: string; type: string }): string {
  const val = change.formula;
  const type = change.type && change.type !== "untyped" ? ` ${change.type}` : "";
  const target = change.target ? ` to ${changeTargetLabel(change.target)}` : "";
  return `${val}${type}${target}`;
}

/**
 * Maximum charges for a linked item's `uses.maxFormula`, e.g. a Staff of
 * Healing's 10. Every `maxFormula` in the current vendored slice is a plain
 * numeric constant (no `@item.level`/`@cl` reference — verified against the
 * full items pack), so this never needs item-instance context;
 * `tryEvaluateFormula` still guards against a future non-numeric value by
 * returning `null` rather than crashing the gear list. Only "charges"-style
 * pools are surfaced (potions/scrolls with `per: "single"` are one-shot and
 * tracked by removing the gear entry instead, not a charge counter).
 */
export function itemMaxCharges(
  item: { uses?: { maxFormula?: string; per?: string } } | undefined,
): number | null {
  const formula = item?.uses?.maxFormula;
  if (!formula) return null;
  try {
    const max = tryEvaluateFormula(formula);
    return max !== null && Number.isFinite(max) && max > 0 ? Math.trunc(max) : null;
  } catch {
    return null;
  }
}

/**
 * One-line metadata summary for an {@link Item} in the picker (slot · weight ·
 * price). Weight and price are vendored for most mundane gear, so this isn't
 * gated on `slot` — a plain torch or bedroll still gets its weight/price shown.
 */
export function itemMeta(item: Item): string {
  const parts: string[] = [];
  if (item.slot) parts.push(item.slot);
  if (item.weight) parts.push(`${item.weight} lb`);
  if (item.price) parts.push(`${item.price} gp`);
  return parts.join(" · ");
}

/**
 * One-line preview of what a kit expands into, so the picker shows what you're
 * about to get without opening anything: "13 items · Torch ×10, Trail Rations
 * ×5, Ink +10 more".
 */
export function kitSummary(kit: Kit): string {
  const count = kit.contents.length;
  const shown = kit.contents
    .slice(0, 3)
    .map((c) => (c.quantity != null && c.quantity !== 1 ? `${c.name} ×${c.quantity}` : c.name))
    .join(", ");
  const rest = count > 3 ? ` +${count - 3} more` : "";
  return `${count} item${count === 1 ? "" : "s"} · ${shown}${rest}`;
}

/** One-line metadata for a generated {@link ConsumableEntry} in the picker. */
export function consumableMeta(entry: ConsumableEntry): string {
  const parts = [`CL ${entry.casterLevel}`, `spell lvl ${entry.spellLevel}`, `${entry.price} gp`];
  if (entry.charges != null) parts.push(`${entry.charges} charges`);
  return parts.join(" · ");
}

/** Trim a price to at most two decimals — half of an odd base price is rarely whole. */
export function gp(amount: number): string {
  return String(Math.round(amount * 100) / 100);
}

/** A one-line summary of an {@link ArmorRef} for the picker preview. */
export function armorRefMeta(a: ArmorRef): string {
  const weight = a.weightClass ? `${WEIGHT_LABEL[a.weightClass] ?? "—"} ` : "";
  const slot = a.slot === "shield" ? "Shield" : `${weight}Armor`;
  const dex = a.maxDex != null ? ` · max Dex +${a.maxDex}` : "";
  const acp = a.acp ? ` · ACP −${a.acp}` : "";
  const asf = a.asf ? ` · ASF ${a.asf}%` : "";
  return `${slot}${dex}${acp}${asf}`;
}
