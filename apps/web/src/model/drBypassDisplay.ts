/**
 * Display strings for a weapon's DR bypasses (`ResolvedWeaponAttack.drBypass`,
 * derived by `@pf1/engine`'s `weaponDrBypasses`).
 *
 * The chip carries the qualifier alone, since the question at the table is
 * whether this hit gets through DR 10/cold iron. Everything else (what grants
 * it, whether hardness comes with it, whether it depends on ki) lives in the
 * tooltip, so a monk with five of these doesn't get a paragraph on the sheet.
 */

import { qualifierLabel } from "@pf1/engine";
import type { WeaponDrBypass } from "@pf1/schema";

import { capitalizeFirst } from "./names.js";

/** Chip text: "Cold iron", "Magic", "Lawful". */
export function bypassChipLabel(bypass: WeaponDrBypass): string {
  return capitalizeFirst(qualifierLabel(bypass.qualifier));
}

/** Tooltip: what the weapon counts as, where that comes from, and any strings attached. */
export function bypassTip(bypass: WeaponDrBypass): string {
  const parts = [
    `Counts as ${qualifierLabel(bypass.qualifier)} for overcoming damage reduction, from ${bypass.sources.join(", ")}.`,
  ];
  if (bypass.hardness) parts.push("Also bypasses hardness.");
  if (bypass.condition) parts.push(`Applies ${bypass.condition}.`);
  return parts.join(" ");
}

/** One-line summary for the print sheet, where there is no tooltip to hover. */
export function bypassLine(bypasses: readonly WeaponDrBypass[]): string {
  return bypasses.map((b) => qualifierLabel(b.qualifier)).join(", ");
}
