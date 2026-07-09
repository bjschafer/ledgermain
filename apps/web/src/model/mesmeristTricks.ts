/**
 * Pure mesmerist-trick transitions (issue #65 follow-through). Trick ids are
 * just entries in `build.mesmeristTricks`, mirroring `toggleNinjaTrick` in
 * `model/ninjaTricks.ts` — the engine's `MESMERIST_TRICKS` table maps each to
 * its (display-only) `changes[]`, surfaced through the same
 * `collectGrantedFeatures` path as ninja tricks/witch hexes (see `@pf1/engine`
 * `archetypes.ts`). This is the trick MENU only — the separate Mesmerist
 * Tricks resource pool (how many times/day a trick can be implanted) rides
 * the generic `uses.maxFormula` resource-pool pipeline already (see
 * `@pf1/engine` `resources.ts`), unaffected by this module.
 *
 * Budget (PF1 Occult Adventures, verified against aonprd.com's live
 * Mesmerist class page — "At 1st level, and every 2 levels thereafter, a
 * mesmerist learns a new trick"): 1st, 3rd, ..., 19th (10 total by 19th).
 * Masterful tricks (12th level, minLevel-gated in `MESMERIST_TRICKS`) are NOT
 * an extra pick — chosen "in place of" a normal trick, same budget, same
 * posture as `WITCH_HEXES`'/`NINJA_TRICKS`' major/master tiers (see that
 * file's doc comment). Each copy of the "Extra Mesmerist Tricks" feat
 * (vendored `feats.json` id `54QWaanZra9hi7LV` — stackable per its own text)
 * adds one more, counted by OCCURRENCE in `doc.build.feats` (not just
 * presence) — same "manually-added duplicates" convention
 * `expectedNinjaTrickCount` uses for "Extra Ninja Trick".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The mesmerist's class level (0 for a non-mesmerist, or a stale/multiclassed doc). */
export function mesmeristLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "mesmerist")?.level ?? 0;
}

export function hasMesmeristTrick(doc: CharacterDoc, id: string): boolean {
  return (doc.build.mesmeristTricks ?? []).includes(id);
}

/** Add or remove a trick id. No-op add if already present (no duplicates). */
export function toggleMesmeristTrick(doc: CharacterDoc, trickId: string): CharacterDoc {
  const current = doc.build.mesmeristTricks ?? [];
  const has = current.includes(trickId);
  const mesmeristTricks = has ? current.filter((t) => t !== trickId) : [...current, trickId];
  return { ...doc, build: { ...doc.build, mesmeristTricks } };
}

/** The number of tricks currently chosen. */
export function chosenMesmeristTrickCount(doc: CharacterDoc): number {
  return (doc.build.mesmeristTricks ?? []).length;
}

/** OA progression thresholds: 1st, 3rd, 5th, 7th, 9th, 11th, 13th, 15th, 17th, 19th. */
const TRICK_LEVELS: readonly number[] = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** One trick at each threshold in {@link TRICK_LEVELS} reached. Returns 0 for a non-mesmerist. */
function baseTrickCount(level: number): number {
  if (level <= 0) return 0;
  return TRICK_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * How many copies of the "Extra Mesmerist Tricks" feat are in
 * `doc.build.feats` — matched by name (feat ids are opaque RefData keys),
 * counted by occurrence since the feat is stackable, the same convention
 * `extraNinjaTrickFeatCount` relies on for "Extra Ninja Trick".
 */
function extraMesmeristTrickFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Mesmerist Tricks") count++;
  }
  return count;
}

/**
 * The number of tricks a mesmerist is expected to know at their current
 * level: the base OA progression plus one per "Extra Mesmerist Tricks" feat.
 * Returns 0 for a non-mesmerist.
 */
export function expectedMesmeristTrickCount(doc: CharacterDoc, refData: RefData): number {
  const level = mesmeristLevel(doc);
  if (level <= 0) return 0;
  return baseTrickCount(level) + extraMesmeristTrickFeatCount(doc, refData);
}

/**
 * True when the chosen tricks should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `ninjaTricksNeedWarning` for the identical pattern).
 */
export function mesmeristTricksNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenMesmeristTrickCount(doc) > expectedMesmeristTrickCount(doc, refData);
}
