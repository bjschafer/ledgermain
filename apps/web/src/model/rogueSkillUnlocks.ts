/**
 * Pure Rogue's Edge (UC) skill unlock transitions (issue #65), mirroring
 * `rogueFinesseWeapons.ts`'s fixed-index-array shape — one slot per tier
 * (5th, 10th, 15th, 20th level — `ROGUE_SKILL_UNLOCK_LEVELS`), storing the
 * `SkillId` chosen at each. The unlock's own tiered prose effects are NOT
 * modeled (see `CharacterDoc.build.rogueSkillUnlocks`'s doc comment) — this
 * module only tracks WHICH skill was picked at each tier, surfaced by
 * `RogueSkillUnlocksPicker` itself (no separate classFeatures-list wiring).
 */

import { ROGUE_SKILL_UNLOCK_LEVELS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { rogueUnchainedLevel } from "./rogueFinesseWeapons.js";

export { rogueUnchainedLevel };

/** How many of the 4 Rogue's Edge (UC) tiers (5th/10th/15th/20th) the character has reached. */
export function unlockedRogueSkillUnlockTiers(doc: CharacterDoc): number {
  const level = rogueUnchainedLevel(doc);
  return ROGUE_SKILL_UNLOCK_LEVELS.filter((lvl) => level >= lvl).length;
}

/**
 * Set (or clear, with `null`/empty string) the skill pick at `tierIndex`
 * (0 = 5th level, 1 = 10th, 2 = 15th, 3 = 20th). Free-choice — not
 * hard-validated against the "5 ranks in the chosen skill" RAW prerequisite,
 * same soft posture as every other picker in this module family.
 */
export function setRogueSkillUnlock(
  doc: CharacterDoc,
  tierIndex: number,
  skillId: string | null,
): CharacterDoc {
  if (tierIndex < 0 || tierIndex >= ROGUE_SKILL_UNLOCK_LEVELS.length) return doc;
  const current = [...(doc.build.rogueSkillUnlocks ?? [])];
  while (current.length <= tierIndex) current.push(""); // fill gaps, never leave sparse holes
  current[tierIndex] = typeof skillId === "string" ? skillId.trim() : "";
  while (current.length > 0 && !current[current.length - 1]) current.pop();
  return {
    ...doc,
    build: { ...doc.build, rogueSkillUnlocks: current.length > 0 ? current : undefined },
  };
}
