/**
 * Pure slayer-talent transitions (issue #74 Phase 3b), mirroring
 * `model/rogueTalents.ts`'s shape closely — `build.slayerTalents` is a flat
 * id array into `RefData.slayerTalents` (see `@pf1/engine`
 * `slayer-talents.ts`; UNLIKE rogue talents there is no hand-authored
 * mechanics table backing these ids yet, every entry is display-only).
 *
 * Budget (PF1 Advanced Class Guide, verified against the vendored Foundry
 * "Slayer Talents" `ClassFeature` description): "Starting at 2nd level and
 * every 2 levels thereafter, a slayer gains one slayer talent" — 10 total by
 * 20th, plus one per "Extra Slayer Talent" feat taken (counted by
 * OCCURRENCE, same convention `expectedRogueTalentCount`'s
 * `extraTalentFeatCount` uses for "Extra Rogue Talent"). "Advanced Slayer
 * Talents" (10th level and every 2 levels thereafter, per the vendored
 * "Advanced Talents (SLA)" `ClassFeature` description) are chosen IN PLACE OF
 * a normal talent pick, not extra budget — same shape as ninja master
 * tricks, so no separate count is tracked for them here. Never blocks — same
 * soft posture as every other menu-subsystem budget in this project.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The character's slayer class level (0 for a non-slayer). */
export function slayerLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "slayer")?.level ?? 0;
}

export function hasSlayerTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.slayerTalents ?? []).includes(id);
}

/** Add or remove a talent id. No-op add if already present (no duplicates). */
export function toggleSlayerTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.slayerTalents ?? [];
  const has = current.includes(talentId);
  const slayerTalents = has ? current.filter((t) => t !== talentId) : [...current, talentId];
  return { ...doc, build: { ...doc.build, slayerTalents } };
}

/** The number of slayer talents currently chosen. */
export function chosenSlayerTalentCount(doc: CharacterDoc): number {
  return (doc.build.slayerTalents ?? []).length;
}

/** ACG progression: one talent at 2nd level, one more every 2 levels thereafter (equivalently `floor(level / 2)`). */
function baseTalentCount(level: number): number {
  if (level < 2) return 0;
  return Math.floor(level / 2);
}

/**
 * How many copies of the "Extra Slayer Talent" feat are in `doc.build.feats`
 * — matched by name, counted by occurrence since the feat is stackable, same
 * convention `expectedRogueTalentCount`'s `extraTalentFeatCount` uses.
 */
function extraTalentFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Slayer Talent") count++;
  }
  return count;
}

/**
 * The number of slayer talents a character is expected to know at their
 * current level: the base ACG progression plus one per "Extra Slayer Talent"
 * feat. Returns 0 for a non-slayer.
 */
export function expectedSlayerTalentCount(doc: CharacterDoc, refData: RefData): number {
  const level = slayerLevel(doc);
  if (level <= 0) return 0;
  return baseTalentCount(level) + extraTalentFeatCount(doc, refData);
}

/**
 * True when the chosen talents should prompt a soft warning: more than the
 * expected count. Never used to block.
 */
export function slayerTalentsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenSlayerTalentCount(doc) > expectedSlayerTalentCount(doc, refData);
}
