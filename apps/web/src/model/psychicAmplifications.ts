/**
 * Pure Phrenic Amplification transitions (issue #65 follow-through —
 * `psychic-disciplines.ts` shipped bonus spells/phrenic pool ability and
 * explicitly deferred amplifications as "prose-heavy, genuinely
 * choice-bearing content"). Amplification ids are just entries in
 * `build.psychicAmplifications`, mirroring `toggleOracleRevelation` in
 * `model/oracleRevelations.ts` — the engine's `PHRENIC_AMPLIFICATIONS` table
 * maps each to its (display-only) `changes[]`, surfaced through the same
 * `collectGrantedFeatures` path. This is the amplification MENU only — the
 * Phrenic Pool itself (points spent per linked-spell cast) rides the
 * vendored `uses.maxFormula` resource-pool pipeline already (see `@pf1/engine`
 * `resources.ts`), unaffected by this module.
 *
 * Budget (PF1 Occult Adventures, verified against aonprd.com's live Psychic
 * class page — "Phrenic Amplification" gained at 1st level, then "at 3rd
 * level, and every 4 levels thereafter"): 1st, 3rd, 7th, 11th, 15th, 19th —
 * six total by 19th, the SAME six-threshold cadence
 * `oracleRevelations`/`REVELATION_LEVELS` uses (reused verbatim below rather
 * than re-derived). Major amplifications (11th level, minLevel-gated in
 * `PHRENIC_AMPLIFICATIONS`) are NOT an extra pick — chosen "in place of" a
 * basic amplification, same budget, same posture as `WITCH_HEXES`'/
 * `NINJA_TRICKS`' major/master tiers. Each copy of the "Extra Amplification"
 * feat (vendored `feats.json` id `MWbOlWeXOxxsBacw` — stackable per its own
 * text) adds one more, counted by OCCURRENCE in `doc.build.feats` (not just
 * presence) — same "manually-added duplicates" convention
 * `extraRevelationFeatCount` uses for "Extra Revelation".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The psychic's class level (0 for a non-psychic, or a stale/multiclassed doc). */
export function psychicLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "psychic")?.level ?? 0;
}

export function hasPsychicAmplification(doc: CharacterDoc, id: string): boolean {
  return (doc.build.psychicAmplifications ?? []).includes(id);
}

/** Add or remove an amplification id. No-op add if already present (no duplicates). */
export function togglePsychicAmplification(doc: CharacterDoc, ampId: string): CharacterDoc {
  const current = doc.build.psychicAmplifications ?? [];
  const has = current.includes(ampId);
  const psychicAmplifications = has ? current.filter((a) => a !== ampId) : [...current, ampId];
  return { ...doc, build: { ...doc.build, psychicAmplifications } };
}

/** The number of amplifications currently chosen. */
export function chosenPsychicAmplificationCount(doc: CharacterDoc): number {
  return (doc.build.psychicAmplifications ?? []).length;
}

/** OA progression thresholds: 1st, 3rd, 7th, 11th, 15th, 19th (same shape as `REVELATION_LEVELS`). */
const AMPLIFICATION_LEVELS: readonly number[] = [1, 3, 7, 11, 15, 19];

/** One amplification at each threshold in {@link AMPLIFICATION_LEVELS} reached. Returns 0 for a non-psychic. */
function baseAmplificationCount(level: number): number {
  if (level <= 0) return 0;
  return AMPLIFICATION_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * How many copies of the "Extra Amplification" feat are in `doc.build.feats`
 * — matched by name (feat ids are opaque RefData keys), counted by
 * occurrence since the feat is stackable, the same convention
 * `extraRevelationFeatCount` relies on for "Extra Revelation".
 */
function extraAmplificationFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Amplification") count++;
  }
  return count;
}

/**
 * The number of amplifications a psychic is expected to know at their
 * current level: the base OA progression plus one per "Extra Amplification"
 * feat. Returns 0 for a non-psychic.
 */
export function expectedPsychicAmplificationCount(doc: CharacterDoc, refData: RefData): number {
  const level = psychicLevel(doc);
  if (level <= 0) return 0;
  return baseAmplificationCount(level) + extraAmplificationFeatCount(doc, refData);
}

/**
 * True when the chosen amplifications should prompt a soft warning: more
 * than the expected count. Never used to block — only to color the count
 * badge (see `oracleRevelationsNeedWarning` for the identical pattern).
 */
export function psychicAmplificationsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenPsychicAmplificationCount(doc) > expectedPsychicAmplificationCount(doc, refData);
}
