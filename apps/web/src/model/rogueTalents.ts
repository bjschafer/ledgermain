/**
 * Pure rogue talent transitions (issue #65), SHARED between the chained
 * rogue and Rogue (Unchained) — `build.rogueTalents` mirrors `witchHexes.ts`'s
 * flat shape (talents are not scoped to anything, unlike oracle revelations'
 * mystery-scoping).
 *
 * Budget (PF1 CRB, unchanged by Pathfinder Unchained — verified against
 * aonprd.com): "at 2nd level, and every two levels thereafter, a rogue gains
 * one rogue talent" — 10 total by 20th level, plus one per "Extra Rogue
 * Talent" feat taken (counted by OCCURRENCE, same convention
 * `expectedWitchHexCount` uses for "Extra Hex"). Never blocks — same soft
 * posture as `witchHexesNeedWarning`.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The character's rogue-family class level (chained `rogue` or `rogueUnchained` — 0 if neither). */
export function rogueLevel(doc: CharacterDoc): number {
  const cls = doc.identity.classes.find((c) => c.tag === "rogue" || c.tag === "rogueUnchained");
  return cls?.level ?? 0;
}

export function hasRogueTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.rogueTalents ?? []).includes(id);
}

/** Add or remove a talent id. No-op add if already present (no duplicates). */
export function toggleRogueTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.rogueTalents ?? [];
  const has = current.includes(talentId);
  const rogueTalents = has ? current.filter((t) => t !== talentId) : [...current, talentId];
  return { ...doc, build: { ...doc.build, rogueTalents } };
}

/** The number of rogue talents currently chosen. */
export function chosenRogueTalentCount(doc: CharacterDoc): number {
  return (doc.build.rogueTalents ?? []).length;
}

/**
 * Base progression: one talent at 2nd level, one more every 2 levels
 * thereafter (4th, 6th, ..., 20th) — equivalently `floor(level / 2)` for
 * level >= 2. Returns 0 below 2nd level.
 */
function baseTalentCount(level: number): number {
  if (level < 2) return 0;
  return Math.floor(level / 2);
}

/**
 * How many copies of the "Extra Rogue Talent" feat are in `doc.build.feats`
 * — matched by name, counted by occurrence since the feat is stackable, same
 * convention `expectedWitchHexCount`'s `extraHexFeatCount` uses.
 */
function extraTalentFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Rogue Talent") count++;
  }
  return count;
}

/**
 * The number of rogue talents a character is expected to know at their
 * current level: the base CRB progression plus one per "Extra Rogue Talent"
 * feat. Returns 0 for a non-rogue.
 */
export function expectedRogueTalentCount(doc: CharacterDoc, refData: RefData): number {
  const level = rogueLevel(doc);
  if (level <= 0) return 0;
  return baseTalentCount(level) + extraTalentFeatCount(doc, refData);
}

/**
 * True when the chosen talents should prompt a soft warning: more than the
 * expected count. Never used to block.
 */
export function rogueTalentsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenRogueTalentCount(doc) > expectedRogueTalentCount(doc, refData);
}
