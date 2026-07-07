/**
 * Pure oracle-revelation transitions (issue #61). Revelation ids are just
 * entries in `build.oracleRevelations`, mirroring `toggleArcanistExploit` in
 * `model/arcanistExploits.ts` — the engine's `ORACLE_REVELATIONS` table maps
 * each to its (display-only) `changes[]`/`contextNotes`, applied through the
 * same change-collection path as exploits/arcana (see `@pf1/engine`
 * `collect.ts`).
 *
 * Budget (PF1 Advanced Player's Guide, verified against the SRD class
 * table): an oracle learns a new revelation at 1st level and every 4 levels
 * thereafter (1st, 3rd, 7th, 11th, 15th, 19th — six total by 19th; the
 * 20th-level "Final Revelation" is automatic, not one of these six picks —
 * see `@pf1/engine` `ORACLE_MYSTERY_FINAL_REVELATIONS`). Each copy of the
 * "Extra Revelation" feat (a stackable general feat) adds one more, counted
 * by OCCURRENCE in `doc.build.feats` (not just presence) — same
 * "manually-added duplicates" convention `expectedArcanistExploitCount` uses
 * for "Extra Arcanist Exploit".
 *
 * Revelations are PER-MYSTERY: only revelation ids that resolve AND belong
 * to the character's currently-chosen `build.oracleMystery` count toward the
 * chosen total — a leftover pick from a mystery the player has since changed
 * away from silently drops out, the same "unresolvable id" tolerance
 * `collectGrantedFeatures` applies when surfacing them on the sheet.
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import { ORACLE_REVELATIONS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

/** The oracle's class level (0 for a non-oracle, or a stale/multiclassed doc). */
export function oracleLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
}

export function hasOracleRevelation(doc: CharacterDoc, id: string): boolean {
  return (doc.build.oracleRevelations ?? []).includes(id);
}

/** Add or remove a revelation id. No-op add if already present (no duplicates). */
export function toggleOracleRevelation(doc: CharacterDoc, revelationId: string): CharacterDoc {
  const current = doc.build.oracleRevelations ?? [];
  const has = current.includes(revelationId);
  const oracleRevelations = has
    ? current.filter((r) => r !== revelationId)
    : [...current, revelationId];
  return { ...doc, build: { ...doc.build, oracleRevelations } };
}

/**
 * The number of revelations currently chosen that resolve against the
 * character's CURRENT mystery (see file doc comment) — a raw
 * `.length` would over-count a leftover pick from a since-abandoned mystery.
 */
export function chosenOracleRevelationCount(doc: CharacterDoc): number {
  const mystery = doc.build.oracleMystery;
  if (!mystery) return 0;
  return (doc.build.oracleRevelations ?? []).filter(
    (id) => ORACLE_REVELATIONS[id]?.mysteryTag === mystery,
  ).length;
}

/** APG progression thresholds: 1st, 3rd, 7th, 11th, 15th, 19th. */
const REVELATION_LEVELS: readonly number[] = [1, 3, 7, 11, 15, 19];

/**
 * Base APG progression: one revelation at each threshold in
 * {@link REVELATION_LEVELS} reached. Returns 0 for a non-oracle (level 0).
 */
function baseRevelationCount(level: number): number {
  if (level <= 0) return 0;
  return REVELATION_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * How many copies of the "Extra Revelation" feat are in `doc.build.feats` —
 * matched by name (feat ids are opaque RefData keys), counted by occurrence
 * since the feat is stackable (each copy grants one more revelation), the
 * same convention `expectedArcanistExploitCount` relies on for "Extra
 * Arcanist Exploit".
 */
function extraRevelationFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Revelation") count++;
  }
  return count;
}

/**
 * The number of revelations an oracle is expected to know at their current
 * level: the base APG progression plus one per "Extra Revelation" feat.
 * Returns 0 for a non-oracle.
 */
export function expectedOracleRevelationCount(doc: CharacterDoc, refData: RefData): number {
  const level = oracleLevel(doc);
  if (level <= 0) return 0;
  return baseRevelationCount(level) + extraRevelationFeatCount(doc, refData);
}

/**
 * True when the chosen revelations should prompt a soft warning: more than
 * the expected count. Never used to block — only to color the count badge
 * (see `arcanistExploitsNeedWarning` for the identical pattern).
 */
export function oracleRevelationsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenOracleRevelationCount(doc) > expectedOracleRevelationCount(doc, refData);
}
