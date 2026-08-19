/**
 * Pure display strings for weapon attack lines (Ultimate Combat firearms
 * data). The engine resolves what an attack IS (range increment, misfire,
 * capacity, touch-AC band); this decides how that reads on one line, in both
 * the on-screen sheet and the print sheet, so the two can't drift — same
 * posture as `kineticistBlastDisplay.ts`'s `blastSubLine`.
 */

import type { ResolvedWeaponAttack } from "@pf1/schema";

/**
 * A firearm's misfire range as house style renders it: "1" when it misfires
 * only on a natural 1, otherwise "1-N" (a plain hyphen — no en/em dash in
 * player-facing text).
 */
export function misfireRangeLabel(misfire: number): string {
  return misfire <= 1 ? "1" : `1-${misfire}`;
}

/**
 * The grey sub-line under a weapon's name: range increment (ranged weapons
 * only) and, for a detected firearm, its misfire range, ammunition capacity,
 * and touch-AC band. `null` when the attack has none of these (melee weapons,
 * and ranged weapons with no snapshotted range).
 */
export function weaponAttackSubLine(atk: ResolvedWeaponAttack): string | null {
  const parts: string[] = [];
  if (atk.category === "ranged" && atk.rangeIncrement !== undefined) {
    parts.push(`Range ${atk.rangeIncrement} ft`);
  }
  if (atk.firearm?.misfire !== undefined) {
    parts.push(`Misfire ${misfireRangeLabel(atk.firearm.misfire)}`);
  }
  if (atk.firearm?.capacity !== undefined) {
    parts.push(`Capacity ${atk.firearm.capacity}`);
  }
  if (atk.firearm?.touchRangeFt !== undefined) {
    parts.push(`vs. touch AC within ${atk.firearm.touchRangeFt} ft`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
