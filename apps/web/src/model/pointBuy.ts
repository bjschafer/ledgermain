/**
 * PF1 Core Rulebook point-buy purchase calculator (issue #86) — pure math
 * only; the UI in `AbilitiesSection` layers an optional, never-blocking
 * readout on top. Point buy prices the six *pre-racial* base ability scores
 * (`CharacterDoc.abilities`, before racial mods/level increases/items are
 * applied downstream) against the published purchase-cost table.
 */
import { ABILITY_IDS, type AbilityId } from "@pf1/schema";

/** Lowest score the purchase table prices (PF1 CRB point-buy range). */
export const POINT_BUY_MIN_SCORE = 7;
/** Highest score the purchase table prices (PF1 CRB point-buy range). */
export const POINT_BUY_MAX_SCORE = 18;

/**
 * PF1 Core Rulebook purchase cost, by pre-racial score (Table: Point-Buy
 * Ability Scores). Scores below 7 or above 18 aren't priced by RAW — callers
 * report those as "outside purchase range" rather than extrapolating a cost.
 */
const PURCHASE_COST: Readonly<Record<number, number>> = {
  7: -4,
  8: -2,
  9: -1,
  10: 0,
  11: 1,
  12: 2,
  13: 3,
  14: 5,
  15: 7,
  16: 10,
  17: 13,
  18: 17,
};

/** Standard point-buy budgets from the PF1 Core Rulebook. */
export const POINT_BUY_BUDGETS: readonly { label: string; points: number }[] = [
  { label: "Low", points: 10 },
  { label: "Standard", points: 15 },
  { label: "High", points: 20 },
  { label: "Epic", points: 25 },
];

/**
 * Purchase cost for a single pre-racial score, or `null` if `score` falls
 * outside the priced 7–18 range (see {@link POINT_BUY_MIN_SCORE}/
 * {@link POINT_BUY_MAX_SCORE}).
 */
export function pointBuyCost(score: number): number | null {
  return PURCHASE_COST[score] ?? null;
}

export interface PointBuyTotal {
  /** Sum of purchase costs across all six abilities that fall within 7–18. */
  spent: number;
  /**
   * Ability ids whose pre-racial base score is outside the priced 7–18
   * range — excluded from `spent` rather than extrapolated (RAW has no
   * defined cost past the table's ends).
   */
  outOfRange: AbilityId[];
}

/**
 * Total point-buy cost across the six pre-racial base scores. Reads
 * `CharacterDoc.abilities` directly (never a racial-adjusted value) — the
 * caller (`AbilitiesSection`) is responsible for sourcing the pre-racial
 * record.
 */
export function totalPointBuyCost(abilities: Record<AbilityId, number>): PointBuyTotal {
  let spent = 0;
  const outOfRange: AbilityId[] = [];
  for (const id of ABILITY_IDS) {
    const cost = pointBuyCost(abilities[id]);
    if (cost === null) {
      outOfRange.push(id);
    } else {
      spent += cost;
    }
  }
  return { spent, outOfRange };
}
