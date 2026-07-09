/**
 * Pure Monk (Unchained) ki power transitions (issue #65). Ki power ids are
 * just entries in `build.monkKiPowers`, mirroring `toggleWitchHex` in
 * `model/witchHexes.ts` — the engine's `MONK_KI_POWERS` table maps each to
 * its (entirely display-only) `changes[]`/`contextNotes`, applied through
 * the same change-collection path as hexes/discoveries/arcana (see
 * `@pf1/engine` `archetypes.ts`).
 *
 * Budget (PF1 Pathfinder Unchained, verified against aonprd.com/d20pfsrd.com):
 * "at 4th level, and every two levels thereafter, a monk gains a ki power" —
 * 9 total by 20th level. No "Extra Ki Power"-style feat exists to add more
 * (unlike Extra Hex/Extra Rogue Talent), so the budget is purely level-driven.
 * Never blocks — taking more than the expected count is a soft warning only,
 * same posture as `witchHexesNeedWarning`.
 */

import type { CharacterDoc } from "@pf1/schema";

/** The character's monkUnchained class level (0 for a non-monkUnchained or stale doc). */
export function monkUnchainedLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "monkUnchained")?.level ?? 0;
}

export function hasMonkKiPower(doc: CharacterDoc, id: string): boolean {
  return (doc.build.monkKiPowers ?? []).includes(id);
}

/** Add or remove a ki power id. No-op add if already present (no duplicates). */
export function toggleMonkKiPower(doc: CharacterDoc, powerId: string): CharacterDoc {
  const current = doc.build.monkKiPowers ?? [];
  const has = current.includes(powerId);
  const monkKiPowers = has ? current.filter((p) => p !== powerId) : [...current, powerId];
  return { ...doc, build: { ...doc.build, monkKiPowers } };
}

/** The number of ki powers currently chosen. */
export function chosenMonkKiPowerCount(doc: CharacterDoc): number {
  return (doc.build.monkKiPowers ?? []).length;
}

/**
 * PF1 Unchained progression: one ki power at 4th level, one more every 2
 * levels thereafter (6th, 8th, ..., 20th) — equivalently
 * `1 + floor((level - 4) / 2)` for level >= 4. Returns 0 below 4th level.
 */
export function expectedMonkKiPowerCount(doc: CharacterDoc): number {
  const level = monkUnchainedLevel(doc);
  if (level < 4) return 0;
  return 1 + Math.floor((level - 4) / 2);
}

/**
 * True when the chosen ki powers should prompt a soft warning: more than the
 * expected count. Never used to block.
 */
export function monkKiPowersNeedWarning(doc: CharacterDoc): boolean {
  return chosenMonkKiPowerCount(doc) > expectedMonkKiPowerCount(doc);
}
