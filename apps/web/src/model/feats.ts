/**
 * Pure feat-count computations. No DOM, no React — testable as plain functions.
 *
 * Expected feat count formula (PF1 CRB):
 *   1 at character level 1
 *   + 1 per odd character level beyond 1 (i.e. at levels 3, 5, 7, ...)
 *   + 1 if the character's race is Human (bonus feat at 1st level)
 *   + Fighter bonus combat feats: 1 at fighter level 1, +1 every even fighter level
 *     (levels 2, 4, 6, 8, 10, 12, 14, 16, 18, 20) → total = 1 + floor(fL / 2)
 *
 * Only "Human" by race name grants the racial bonus feat here. Half-Elves receive
 * Skill Focus as a specific racial feat (Adaptability), which is not a free feat
 * selection, so they are not counted. Half-Orcs have no bonus feat trait.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** Total character level (sum of all class levels). */
function totalLevel(doc: CharacterDoc): number {
  return doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
}

/**
 * The number of feats a character is expected to have, given their level,
 * race, and class composition.
 */
export function expectedFeatCount(doc: CharacterDoc, refData: RefData): number {
  const charLevel = totalLevel(doc);
  if (charLevel <= 0) return 0;

  // 1 feat at level 1, then +1 every odd level (3, 5, 7, …).
  // Equivalently: ceil(charLevel / 2).
  const baseFeatCount = Math.ceil(charLevel / 2);

  // +1 bonus feat for Human race.
  const race = refData.races[doc.identity.race];
  const humanBonus = race?.name === "Human" ? 1 : 0;

  // Fighter bonus combat feats: 1 + floor(fL / 2), where fL = fighter class level.
  const fighterClass = doc.identity.classes.find((c) => c.tag === "fighter");
  const fL = fighterClass?.level ?? 0;
  const fighterBonus = fL > 0 ? 1 + Math.floor(fL / 2) : 0;

  return baseFeatCount + humanBonus + fighterBonus;
}

/** The number of feats the character has currently chosen. */
export function chosenFeatCount(doc: CharacterDoc): number {
  return doc.build.feats.length;
}
