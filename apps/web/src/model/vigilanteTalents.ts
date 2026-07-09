/**
 * Pure vigilante-talent transitions (issue #65). PF1 RAW grants TWO
 * independent talent pools from two different class features — Social
 * Talent (1st level, every 2 thereafter) and Vigilante Talent (2nd level,
 * every 2 thereafter) — mirroring `@pf1/engine` `vigilante-talents.ts`'s
 * split into `VIGILANTE_SOCIAL_TALENTS`/`VIGILANTE_TALENTS`. Ids are just
 * entries in `build.vigilanteSocialTalents`/`build.vigilanteTalents`, same
 * shape as `toggleAlchemistDiscovery`.
 *
 * No "Extra Social/Vigilante Talent" feat exists in the vendored data (only
 * "Extra Investigator/Rogue/Slayer Talent" do), so neither budget has a
 * feat-count addend — unlike `investigatorTalents.ts`.
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc } from "@pf1/schema";

/** The vigilante's class level (0 for a non-vigilante, or a stale/multiclassed doc). */
export function vigilanteLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "vigilante")?.level ?? 0;
}

/* ------------------------------------------------------------- social pool */

export function hasVigilanteSocialTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.vigilanteSocialTalents ?? []).includes(id);
}

/** Add or remove a social talent id. No-op add if already present (no duplicates). */
export function toggleVigilanteSocialTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.vigilanteSocialTalents ?? [];
  const has = current.includes(talentId);
  const vigilanteSocialTalents = has
    ? current.filter((t) => t !== talentId)
    : [...current, talentId];
  return { ...doc, build: { ...doc.build, vigilanteSocialTalents } };
}

export function chosenVigilanteSocialTalentCount(doc: CharacterDoc): number {
  return (doc.build.vigilanteSocialTalents ?? []).length;
}

/**
 * PF1 RAW: one Social Talent at 1st level, one more every 2 levels
 * thereafter (3rd, 5th, ..., 19th — 10 total by 20th) — `1 + floor((level -
 * 1) / 2)`. Returns 0 for a non-vigilante (level 0).
 */
export function expectedVigilanteSocialTalentCount(doc: CharacterDoc): number {
  const level = vigilanteLevel(doc);
  if (level <= 0) return 0;
  return 1 + Math.floor((level - 1) / 2);
}

export function vigilanteSocialTalentsNeedWarning(doc: CharacterDoc): boolean {
  return chosenVigilanteSocialTalentCount(doc) > expectedVigilanteSocialTalentCount(doc);
}

/* -------------------------------------------------------------- talent pool */

export function hasVigilanteTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.vigilanteTalents ?? []).includes(id);
}

/** Add or remove a vigilante talent id. No-op add if already present (no duplicates). */
export function toggleVigilanteTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.vigilanteTalents ?? [];
  const has = current.includes(talentId);
  const vigilanteTalents = has ? current.filter((t) => t !== talentId) : [...current, talentId];
  return { ...doc, build: { ...doc.build, vigilanteTalents } };
}

export function chosenVigilanteTalentCount(doc: CharacterDoc): number {
  return (doc.build.vigilanteTalents ?? []).length;
}

/**
 * PF1 RAW: one Vigilante Talent at 2nd level, one more every 2 levels
 * thereafter (4th, 6th, ..., 20th — 10 total by 20th) — `floor(level / 2)`
 * for `level >= 2`. Returns 0 for a non-vigilante (level 0).
 */
export function expectedVigilanteTalentCount(doc: CharacterDoc): number {
  const level = vigilanteLevel(doc);
  if (level < 2) return 0;
  return Math.floor(level / 2);
}

export function vigilanteTalentsNeedWarning(doc: CharacterDoc): boolean {
  return chosenVigilanteTalentCount(doc) > expectedVigilanteTalentCount(doc);
}
