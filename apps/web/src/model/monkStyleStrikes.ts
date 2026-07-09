/**
 * Pure Monk (Unchained) style strike transitions (issue #65). Style strike
 * ids are just entries in `build.monkStyleStrikes`, mirroring
 * `model/monkKiPowers.ts`'s shape (which in turn mirrors `witchHexes.ts`).
 *
 * Budget (PF1 Pathfinder Unchained, verified against aonprd.com/d20pfsrd.com):
 * "at 5th level, a monk learns one style strike ... at 9th level, and every
 * four levels thereafter [13th, 17th], a monk learns an additional style
 * strike" — 4 total by 17th level. The 15th-level "designate up to two style
 * strikes per round" bump is a USAGE upgrade to the SAME `uses.maxFormula`
 * resource pool (already fully generic — see `monk-unchained.test.ts`), not
 * an extra pick, so it doesn't affect this budget. Never blocks — same soft
 * posture as `monkKiPowersNeedWarning`.
 */

import type { CharacterDoc } from "@pf1/schema";

import { monkUnchainedLevel } from "./monkKiPowers.js";

const STYLE_STRIKE_LEVELS: readonly number[] = [5, 9, 13, 17];

export function hasMonkStyleStrike(doc: CharacterDoc, id: string): boolean {
  return (doc.build.monkStyleStrikes ?? []).includes(id);
}

/** Add or remove a style strike id. No-op add if already present (no duplicates). */
export function toggleMonkStyleStrike(doc: CharacterDoc, strikeId: string): CharacterDoc {
  const current = doc.build.monkStyleStrikes ?? [];
  const has = current.includes(strikeId);
  const monkStyleStrikes = has ? current.filter((s) => s !== strikeId) : [...current, strikeId];
  return { ...doc, build: { ...doc.build, monkStyleStrikes } };
}

/** The number of style strikes currently chosen. */
export function chosenMonkStyleStrikeCount(doc: CharacterDoc): number {
  return (doc.build.monkStyleStrikes ?? []).length;
}

/** How many of the 4 style-strike tiers (5th/9th/13th/17th) the character has reached. */
export function expectedMonkStyleStrikeCount(doc: CharacterDoc): number {
  const level = monkUnchainedLevel(doc);
  return STYLE_STRIKE_LEVELS.filter((lvl) => level >= lvl).length;
}

/**
 * True when the chosen style strikes should prompt a soft warning: more than
 * the expected count. Never used to block.
 */
export function monkStyleStrikesNeedWarning(doc: CharacterDoc): boolean {
  return chosenMonkStyleStrikeCount(doc) > expectedMonkStyleStrikeCount(doc);
}
