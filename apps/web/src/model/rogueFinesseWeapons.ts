/**
 * Pure Rogue (Unchained) Finesse Training weapon-type transitions (issue
 * #65), mirroring `setWeaponTrainingGroup` in `model/doc.ts`'s shape — a
 * fixed-index array (`build.rogueFinesseWeapons`), one slot per tier (3rd,
 * 11th, 19th level — `ROGUE_FINESSE_TRAINING_LEVELS`), except the stored
 * value is a free-text weapon TYPE name (e.g. "rapier"), not a
 * `WEAPON_GROUPS` slug — PF1 RAW scopes this to one weapon type, not a whole
 * semantic group. See `computeWeaponAttacks` in `@pf1/engine` `compute.ts`
 * for how a pick is matched against an equipped `WeaponInstance` and applied
 * (Dex-to-damage substitution, not a bonus stack).
 */

import { ROGUE_FINESSE_TRAINING_LEVELS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

/** The character's Rogue (Unchained) class level (0 if none). */
export function rogueUnchainedLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "rogueUnchained")?.level ?? 0;
}

/** How many of the 3 Finesse Training tiers (3rd/11th/19th) the character has reached. */
export function unlockedRogueFinesseTiers(doc: CharacterDoc): number {
  const level = rogueUnchainedLevel(doc);
  return ROGUE_FINESSE_TRAINING_LEVELS.filter((lvl) => level >= lvl).length;
}

/**
 * Set (or clear, with `null`/empty string) the weapon-type pick at
 * `tierIndex` (0 = 3rd level, 1 = 11th, 2 = 19th). Free-text, not validated —
 * same soft posture as `setWeaponTrainingGroup`.
 */
export function setRogueFinesseWeapon(
  doc: CharacterDoc,
  tierIndex: number,
  weaponType: string | null,
): CharacterDoc {
  if (tierIndex < 0 || tierIndex >= ROGUE_FINESSE_TRAINING_LEVELS.length) return doc;
  const current = [...(doc.build.rogueFinesseWeapons ?? [])];
  while (current.length <= tierIndex) current.push(""); // fill gaps, never leave sparse holes
  current[tierIndex] = typeof weaponType === "string" ? weaponType.trim() : "";
  // Trim trailing empty slots so an empty array round-trips cleanly.
  while (current.length > 0 && !current[current.length - 1]) current.pop();
  return {
    ...doc,
    build: { ...doc.build, rogueFinesseWeapons: current.length > 0 ? current : undefined },
  };
}
