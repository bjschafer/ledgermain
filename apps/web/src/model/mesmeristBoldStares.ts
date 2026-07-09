/**
 * Pure mesmerist Bold Stare transitions (issue #65 follow-through). Bold
 * stare ids are just entries in `build.mesmeristBoldStares`, mirroring
 * `toggleMesmeristTrick` in `model/mesmeristTricks.ts` — the engine's
 * `MESMERIST_BOLD_STARES` table enriches the Hypnotic Stare class-feature
 * `detail` line (see `@pf1/engine` `boldStareRiderSummary`) rather than
 * adding its own standing `Change`.
 *
 * Budget (PF1 Occult Adventures, verified against aonprd.com's live
 * Mesmerist class page — "At 3rd level, and every 4 levels thereafter, the
 * mesmerist can choose an option that governs how her hypnotic stare
 * functions"): 3rd, 7th, 11th, 15th, 19th (5 total by 19th). No "Extra Bold
 * Stare"-style feat exists on aonprd.com's Mesmerist Stares index, so unlike
 * `mesmeristTricks`/`oracleRevelations` there is no extra-feat contribution
 * to the expected count.
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc } from "@pf1/schema";

/** The mesmerist's class level (0 for a non-mesmerist, or a stale/multiclassed doc). */
export function mesmeristLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "mesmerist")?.level ?? 0;
}

export function hasMesmeristBoldStare(doc: CharacterDoc, id: string): boolean {
  return (doc.build.mesmeristBoldStares ?? []).includes(id);
}

/** Add or remove a bold stare id. No-op add if already present (no duplicates). */
export function toggleMesmeristBoldStare(doc: CharacterDoc, stareId: string): CharacterDoc {
  const current = doc.build.mesmeristBoldStares ?? [];
  const has = current.includes(stareId);
  const mesmeristBoldStares = has ? current.filter((s) => s !== stareId) : [...current, stareId];
  return { ...doc, build: { ...doc.build, mesmeristBoldStares } };
}

/** The number of bold stares currently chosen. */
export function chosenMesmeristBoldStareCount(doc: CharacterDoc): number {
  return (doc.build.mesmeristBoldStares ?? []).length;
}

/** OA progression thresholds: 3rd, 7th, 11th, 15th, 19th. */
const BOLD_STARE_LEVELS: readonly number[] = [3, 7, 11, 15, 19];

/**
 * The number of bold stares a mesmerist is expected to know at their current
 * level: one per threshold in {@link BOLD_STARE_LEVELS} reached. Returns 0
 * for a non-mesmerist.
 */
export function expectedMesmeristBoldStareCount(doc: CharacterDoc): number {
  const level = mesmeristLevel(doc);
  if (level <= 0) return 0;
  return BOLD_STARE_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * True when the chosen bold stares should prompt a soft warning: more than
 * the expected count. Never used to block — only to color the count badge
 * (see `ninjaTricksNeedWarning` for the identical pattern).
 */
export function mesmeristBoldStaresNeedWarning(doc: CharacterDoc): boolean {
  return chosenMesmeristBoldStareCount(doc) > expectedMesmeristBoldStareCount(doc);
}
