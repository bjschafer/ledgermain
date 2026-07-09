/**
 * Pure antipaladin-cruelty transitions (issue #65 wave B). Cruelty ids are
 * just entries in `build.antipaladinCruelties`, mirroring `toggleWitchHex`
 * in `model/witchHexes.ts` — the engine's `ANTIPALADIN_CRUELTIES` table maps
 * each to its (display-only) `changes[]`/`contextNotes`, applied through the
 * same change-collection path as hexes/revelations (see `@pf1/engine`
 * `collect.ts`).
 *
 * Budget (PF1 Advanced Player's Guide, vendored `class-features.json`
 * "Cruelty" description, verbatim confirmed): "At 3rd level, and every three
 * levels thereafter, an antipaladin can select one cruelty" — 3rd, 6th, 9th,
 * 12th, 15th, 18th (6 total by 18th). Unlike `witchHexes`/
 * `oracleRevelations`, no "Extra Cruelty" feat exists in the vendored slice
 * (confirmed by a full-text scan of `feats.json` — no hit) — this budget is
 * never feat-boosted.
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc } from "@pf1/schema";

/** The antipaladin's class level (0 for a non-antipaladin, or a stale/multiclassed doc). */
export function antipaladinLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "antipaladin")?.level ?? 0;
}

export function hasAntipaladinCruelty(doc: CharacterDoc, id: string): boolean {
  return (doc.build.antipaladinCruelties ?? []).includes(id);
}

/** Add or remove a cruelty id. No-op add if already present (no duplicates). */
export function toggleAntipaladinCruelty(doc: CharacterDoc, crueltyId: string): CharacterDoc {
  const current = doc.build.antipaladinCruelties ?? [];
  const has = current.includes(crueltyId);
  const antipaladinCruelties = has
    ? current.filter((c) => c !== crueltyId)
    : [...current, crueltyId];
  return { ...doc, build: { ...doc.build, antipaladinCruelties } };
}

/** The number of cruelties currently chosen. */
export function chosenAntipaladinCrueltyCount(doc: CharacterDoc): number {
  return (doc.build.antipaladinCruelties ?? []).length;
}

/** APG progression thresholds: 3rd, 6th, 9th, 12th, 15th, 18th. */
const CRUELTY_LEVELS: readonly number[] = [3, 6, 9, 12, 15, 18];

/**
 * The number of cruelties an antipaladin is expected to know at their
 * current level: one per threshold in {@link CRUELTY_LEVELS} reached.
 * Returns 0 for a non-antipaladin. No feat can raise this (see file doc
 * comment) — unlike `expectedWitchHexCount`/`expectedOracleRevelationCount`,
 * there's no "Extra Cruelty" addend to add on top.
 */
export function expectedAntipaladinCrueltyCount(doc: CharacterDoc): number {
  const level = antipaladinLevel(doc);
  if (level <= 0) return 0;
  return CRUELTY_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * True when the chosen cruelties should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `witchHexesNeedWarning` for the identical pattern).
 */
export function antipaladinCrueltiesNeedWarning(doc: CharacterDoc): boolean {
  return chosenAntipaladinCrueltyCount(doc) > expectedAntipaladinCrueltyCount(doc);
}
