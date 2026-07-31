/**
 * Pure display strings for kinetic blast lines. The engine resolves what a
 * blast IS (delivery, range, area, burn, save DCs); this decides how that
 * reads on one line, in both the on-screen sheet and the print sheet, so the
 * two can't drift.
 */

import type { DerivedKineticBlast, DerivedKineticBlastBurn } from "@pf1/schema";

/**
 * The grey sub-line under a blast's name: how it's delivered, how far it
 * reaches, what it deals, and what it costs. A form infusion can replace the
 * first two outright, which is why none of this is assembled at the call site.
 */
export function blastSubLine(blast: DerivedKineticBlast): string {
  const parts: string[] = [deliveryLabel(blast)];
  if (blast.area) parts.push(blast.area);
  else if (blast.range > 0) parts.push(`${blast.range} ft`);
  parts.push(blast.descriptor);
  const burn = blastBurnLabel(blast.burnCost);
  if (burn) parts.push(burn);
  return parts.join(" · ");
}

/**
 * How the blast reaches its target. An area or a self-centered effect drops
 * the attack-roll wording entirely, since there's nothing to roll against AC.
 */
export function deliveryLabel(blast: DerivedKineticBlast): string {
  switch (blast.delivery) {
    case "melee":
      return blast.touch ? "melee touch" : "melee";
    case "area":
      return blast.range > 0 ? "area" : "area, centered on you";
    case "rider":
      return "rides your attacks";
    default:
      return blast.touch ? "ranged touch" : "ranged";
  }
}

/**
 * The burn cost, showing the reductions only when one actually came off.
 * A free blast prints nothing rather than "0 burn".
 */
export function blastBurnLabel(burn: DerivedKineticBlastBurn): string | null {
  const reduced = burn.infusionSpecialization + burn.gatherPower;
  if (burn.total === 0 && reduced === 0) return null;
  const gross = burn.total + reduced;
  const suffix = reduced > 0 ? ` (${gross} reduced by ${reduced})` : "";
  return `${burn.total} burn${suffix}`;
}

/**
 * Why a burn cost can't be paid right now, or null when it can. Both published
 * limits bite: "a kineticist can accept only 1 point of burn per round" (rising
 * with level), and "a kineticist can't choose to accept burn if it would put
 * her total number of points of burn higher than 3 + her Constitution
 * modifier". A cost of 0 is always payable.
 */
export function blastBurnWarning(burn: DerivedKineticBlastBurn): string | null {
  if (burn.total === 0) return null;
  if (burn.total > burn.perRoundLimit) {
    return `Over the ${burn.perRoundLimit}/round burn limit`;
  }
  if (burn.held + burn.total > burn.maxHeld) {
    return `Would pass ${burn.maxHeld} burn held (${burn.held} now)`;
  }
  return null;
}
