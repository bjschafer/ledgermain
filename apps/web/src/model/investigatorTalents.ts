/**
 * Pure investigator-talent transitions (issue #65). Talent ids are just
 * entries in `build.investigatorTalents`, mirroring
 * `toggleAlchemistDiscovery` in `model/alchemistDiscoveries.ts` — the
 * engine's `INVESTIGATOR_TALENTS` table maps each to its (mostly
 * display-only) `changes[]`/`contextNotes`.
 *
 * Budget (PF1 Advanced Class Guide, verified against the SRD class table):
 * an investigator gains a talent at 3rd level and every 2 levels thereafter
 * (3rd, 5th, ..., 19th — 9 total by 20th) — `floor((level - 3) / 2) + 1` for
 * `level >= 3`. Each copy of the "Extra Investigator Talent" feat (a
 * stackable general feat, confirmed present in the vendored `feats.json`)
 * adds one more, counted by OCCURRENCE in `doc.build.feats` — same
 * "manually-added duplicates" convention `expectedAlchemistDiscoveryCount`
 * uses for "Extra Discovery".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The investigator's class level (0 for a non-investigator, or a stale/multiclassed doc). */
export function investigatorLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "investigator")?.level ?? 0;
}

export function hasInvestigatorTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.investigatorTalents ?? []).includes(id);
}

/** Add or remove a talent id. No-op add if already present (no duplicates). */
export function toggleInvestigatorTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.investigatorTalents ?? [];
  const has = current.includes(talentId);
  const investigatorTalents = has ? current.filter((t) => t !== talentId) : [...current, talentId];
  return { ...doc, build: { ...doc.build, investigatorTalents } };
}

/** The number of talents currently chosen. */
export function chosenInvestigatorTalentCount(doc: CharacterDoc): number {
  return (doc.build.investigatorTalents ?? []).length;
}

/**
 * Base ACG progression: one talent at 3rd level, one more every 2 levels
 * thereafter (5th, 7th, ..., 19th). Returns 0 below 3rd level or for a
 * non-investigator (level 0).
 */
function baseTalentCount(level: number): number {
  if (level < 3) return 0;
  return Math.floor((level - 3) / 2) + 1;
}

/**
 * How many copies of the "Extra Investigator Talent" feat are in
 * `doc.build.feats` — matched by name (feat ids are opaque RefData keys),
 * counted by occurrence since the feat is stackable, the same convention
 * `expectedAlchemistDiscoveryCount` relies on for "Extra Discovery".
 */
function extraTalentFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Investigator Talent") count++;
  }
  return count;
}

/**
 * The number of talents an investigator is expected to know at their
 * current level: the base ACG progression plus one per "Extra Investigator
 * Talent" feat. Returns 0 for a non-investigator.
 */
export function expectedInvestigatorTalentCount(doc: CharacterDoc, refData: RefData): number {
  const level = investigatorLevel(doc);
  if (level <= 0) return 0;
  return baseTalentCount(level) + extraTalentFeatCount(doc, refData);
}

/**
 * True when the chosen talents should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `alchemistDiscoveriesNeedWarning` for the identical pattern).
 */
export function investigatorTalentsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenInvestigatorTalentCount(doc) > expectedInvestigatorTalentCount(doc, refData);
}
