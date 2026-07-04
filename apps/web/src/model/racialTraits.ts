/**
 * Pure alternate-racial-trait transitions (issue #35). Traits are just ids in
 * `build.racialTraits`, mirroring `toggleTrait` in `model/traits.ts` — the
 * engine's `RACIAL_TRAITS` table maps each to its mechanical `changes`,
 * `suppressTargets`, and `contextNotes`, applied through the same
 * change-collection path as character traits (see `@pf1/engine` `collect.ts`).
 *
 * This module never blocks. Two alternates that replace the same standard trait
 * conflict (you only have one Sure-Footed to trade away), but — matching the
 * project's hybrid soft-warning posture (`model/traits.ts`, archetype conflict
 * warnings for issue #5) — that is surfaced as a warning, never enforced.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";
import { alternateRacialTraitsForRace, RACIAL_TRAITS } from "@pf1/engine";

export function hasRacialTrait(doc: CharacterDoc, id: string): boolean {
  return (doc.build.racialTraits ?? []).includes(id);
}

/** Add or remove an alternate racial trait id. No-op add if already present. */
export function toggleRacialTrait(doc: CharacterDoc, id: string): CharacterDoc {
  const current = doc.build.racialTraits ?? [];
  const has = current.includes(id);
  const racialTraits = has ? current.filter((t) => t !== id) : [...current, id];
  return { ...doc, build: { ...doc.build, racialTraits } };
}

/** The alternate racial traits available for the character's current race. */
export function availableRacialTraits(doc: CharacterDoc, refData: RefData) {
  const raceName = refData.races[doc.identity.race]?.name;
  return raceName ? alternateRacialTraitsForRace(raceName) : [];
}

/**
 * The set of `Race.change` targets suppressed by the character's active
 * alternate racial traits (issue #35). The engine's `collect.ts` applies this
 * to the computed sheet, but the feat/skill BUDGETS in `model/feats.ts` and
 * `model/skills.ts` read `race.changes` (`bonusFeats`/`bonusSkillRanks`)
 * directly — outside `compute()` — so they consult this helper to keep the
 * displayed budget in sync when a swap removes the standard trait (e.g. Human
 * Focused Study drops the bonus feat; Eye for Talent drops the extra skill
 * rank). Only traits belonging to the current race are considered.
 */
export function suppressedRaceTargets(doc: CharacterDoc, refData: RefData): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const suppressed = new Set<string>();
  for (const id of doc.build.racialTraits ?? []) {
    const t = RACIAL_TRAITS[id];
    if (!t || t.race !== raceName) continue;
    for (const target of t.suppressTargets ?? []) suppressed.add(target);
  }
  return suppressed;
}

/**
 * Chosen alternate-racial-trait ids that replace the same standard trait as
 * another chosen one — a conflict, since a race only has one of each standard
 * trait to trade. Returns the set of offending ids (so the picker can flag
 * each). Only considers traits belonging to the current race; a stale id from a
 * race change is ignored.
 */
export function conflictingRacialTraitIds(doc: CharacterDoc, refData: RefData): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const chosen = (doc.build.racialTraits ?? [])
    .map((id) => RACIAL_TRAITS[id])
    .filter((t): t is typeof t & {} => t != null && t.race === raceName);

  // Map each replaced standard-trait name to the chosen alternates that claim it.
  const byReplaced = new Map<string, string[]>();
  for (const t of chosen) {
    for (const replaced of t.replaces) {
      const list = byReplaced.get(replaced) ?? [];
      list.push(t.id);
      byReplaced.set(replaced, list);
    }
  }

  const conflicts = new Set<string>();
  for (const ids of byReplaced.values()) {
    if (ids.length > 1) for (const id of ids) conflicts.add(id);
  }
  return conflicts;
}
