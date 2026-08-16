/**
 * Display helpers for the tracker's Spell-Like Abilities panel — the rows
 * themselves come fully derived from the engine
 * (`DerivedSheet.spellLikeAbilities`); this only formats what the panel
 * prints beside them.
 */

import type { DerivedSpellLikeAbility } from "@pf1/schema";

/**
 * The frequency chip beside an SLA's name — "2/day" when the metered pool's
 * max is known, the bare cadence when it isn't (an attached pool that didn't
 * derive), "at will" / "constant" for unmetered grants.
 */
export function slaFrequencyLabel(
  sla: Pick<DerivedSpellLikeAbility, "frequency">,
  poolMax?: number,
): string {
  switch (sla.frequency) {
    case "atWill":
      return "at will";
    case "constant":
      return "constant";
    case "perWeek":
      return poolMax !== undefined ? `${poolMax}/week` : "per week";
    case "perDay":
      return poolMax !== undefined ? `${poolMax}/day` : "per day";
  }
}
