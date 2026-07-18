/**
 * Pure trait transitions (issue #23). Traits are just ids in
 * `build.traits`, mirroring `toggleFeat` in `doc.ts` — the engine's `TRAITS`
 * table maps each to its mechanical `Change[]`/`contextNotes`, applied
 * through the same change-collection path as conditions/feats (see
 * `@pf1/engine` `collect.ts`).
 *
 * PF1 characters take exactly two traits at creation, normally from two
 * different categories. This module never blocks: taking more than two (or
 * two from the same category) is a soft warning only, matching the project's
 * hybrid posture on feat/skill budgets (`model/feats.ts` `expectedFeatCount`
 * vs. `chosenFeatCount` — over/under is surfaced, never enforced).
 *
 * Homebrew traits (issue #87) are id-compatible with vendored ones: a
 * `hb-`-prefixed id in `build.traits` resolves through {@link resolveTrait}
 * to `doc.build.homebrew.traits` instead of the engine's `TRAITS` table, but
 * every function below (selection, counting, category-warning) is otherwise
 * unaware of the distinction — same posture as homebrew feats/races.
 */

import type { CharacterDoc } from "@pf1/schema";
import { TRAITS, TRAIT_IDS, type TraitCategory, type TraitDef } from "@pf1/engine";

/** The conventional number of traits a PF1 character takes at creation. */
export const EXPECTED_TRAIT_COUNT = 2;

/** Every category a trait (vendored or homebrew) can belong to. */
export const TRAIT_CATEGORIES: readonly TraitCategory[] = ["Combat", "Faith", "Magic", "Social"];

export function hasTrait(doc: CharacterDoc, id: string): boolean {
  return (doc.build.traits ?? []).includes(id);
}

/** Add or remove a trait id. No-op add if already present (no duplicates). */
export function toggleTrait(doc: CharacterDoc, traitId: string): CharacterDoc {
  const current = doc.build.traits ?? [];
  const has = current.includes(traitId);
  const traits = has ? current.filter((t) => t !== traitId) : [...current, traitId];
  return { ...doc, build: { ...doc.build, traits } };
}

/** The number of traits currently chosen. */
export function chosenTraitCount(doc: CharacterDoc): number {
  return (doc.build.traits ?? []).length;
}

/**
 * Resolve a trait id to its definition, checking the engine's vendored
 * `TRAITS` table first and falling back to `doc.build.homebrew.traits` —
 * mirrors `TRAITS[traitId] ?? doc.build.homebrew?.traits?.[traitId]` in
 * `@pf1/engine` `collect.ts`, the same fallback the static sheet applies.
 */
export function resolveTrait(doc: CharacterDoc, id: string): TraitDef | undefined {
  return TRAITS[id] ?? doc.build.homebrew?.traits?.[id];
}

/** Every pickable trait id: vendored (`TRAIT_IDS`) plus this doc's homebrew traits. */
export function allTraitIds(doc: CharacterDoc): string[] {
  return [...TRAIT_IDS, ...Object.keys(doc.build.homebrew?.traits ?? {})];
}

/**
 * The set of trait categories represented among the chosen traits (for the
 * soft "different categories" reminder — unknown ids, and ids whose
 * homebrew definition was since deleted, are skipped).
 */
export function chosenTraitCategories(doc: CharacterDoc): TraitCategory[] {
  const cats: TraitCategory[] = [];
  for (const id of doc.build.traits ?? []) {
    const trait = resolveTrait(doc, id);
    if (trait) cats.push(trait.category);
  }
  return cats;
}

/**
 * True when the chosen traits should prompt a soft warning: more than the
 * conventional two, or two-plus traits sharing the same category. Never used
 * to block — only to color the count badge (see `FeatsSection`'s
 * `featCountClass` for the same pattern).
 */
export function traitsNeedWarning(doc: CharacterDoc): boolean {
  const count = chosenTraitCount(doc);
  if (count > EXPECTED_TRAIT_COUNT) return true;
  const cats = chosenTraitCategories(doc);
  const seen = new Set<string>();
  for (const c of cats) {
    if (seen.has(c)) return true;
    seen.add(c);
  }
  return false;
}
