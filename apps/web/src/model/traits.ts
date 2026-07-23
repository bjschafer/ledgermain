/**
 * Pure trait transitions (issue #23). Traits are just ids in
 * `build.traits`, mirroring `toggleFeat` in `doc.ts` — the engine's
 * `resolveTraitDef`/`mergedTraits` map each to its mechanical
 * `Change[]`/`contextNotes`, applied through the same change-collection path
 * as conditions/feats (see `@pf1/engine` `collect.ts`).
 *
 * PF1 characters take exactly two traits at creation, normally from two
 * different categories. This module never blocks: taking more than two (or
 * two from the same category) is a soft warning only, matching the project's
 * hybrid posture on feat/skill budgets (`model/feats.ts` `expectedFeatCount`
 * vs. `chosenFeatCount` — over/under is surfaced, never enforced).
 *
 * Homebrew traits (issue #87) are id-compatible with vendored ones: a
 * `hb-`-prefixed id in `build.traits` resolves through {@link resolveTrait}
 * to `doc.build.homebrew.traits` instead of the engine's tables, but every
 * function below (selection, counting, category-warning) is otherwise
 * unaware of the distinction — same posture as homebrew feats/races.
 *
 * The pickable catalog itself (issue #74 Phase 1) is two tables merged by
 * the engine: 28 hand-authored entries plus the ~2,000-entry vendored
 * catalog (`RefData.traits`) — see `mergedTraits`'s doc comment for the
 * merge rule.
 *
 * Drawbacks (issue #101): a `Drawback`-category trait implements PF1's "take
 * a drawback, gain a third trait" allowance. Taking any drawback raises the
 * budget by exactly one bonus slot ({@link expectedTraitCount}), regardless
 * of how many drawbacks are taken — the CRB only grants one extra trait this
 * way. The drawback itself is a separate allowance, not one of the two
 * normal traits, so it's excluded from the "two different categories"
 * reminder.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";
import { mergedTraits, resolveTraitDef, type TraitCategory, type TraitDef } from "@pf1/engine";

/** The conventional number of traits a PF1 character takes at creation. */
export const EXPECTED_TRAIT_COUNT = 2;

/**
 * True when a trait definition is a drawback (`Drawback` category, PF1's
 * "take a drawback, gain a third trait"). Case-insensitive because the value
 * is Foundry's `traitType` Title-Cased (`traitCategoryFromType` in
 * `@pf1/engine`), while a homebrew author could type it in any case.
 */
export function isDrawbackTrait(trait: TraitDef): boolean {
  return trait.category.toLowerCase() === "drawback";
}

/** Whether the doc has taken at least one drawback (which unlocks the bonus slot). */
export function hasDrawback(doc: CharacterDoc, refData: RefData): boolean {
  return (doc.build.traits ?? []).some((id) => {
    const trait = resolveTrait(doc, refData, id);
    return trait ? isDrawbackTrait(trait) : false;
  });
}

/**
 * This doc's trait budget: the conventional {@link EXPECTED_TRAIT_COUNT},
 * plus one bonus slot when a drawback has been taken. PF1 grants exactly one
 * extra trait for taking a drawback no matter how many drawbacks you take, so
 * this never rises above three.
 */
export function expectedTraitCount(doc: CharacterDoc, refData: RefData): number {
  return EXPECTED_TRAIT_COUNT + (hasDrawback(doc, refData) ? 1 : 0);
}

/**
 * The traditional four trait categories — used by the homebrew trait form's
 * category chips (`HomebrewTraitEditor`), which intentionally doesn't expose
 * the vendored catalog's wider category set to a player authoring their own
 * trait. For the full-catalog picker's category filter, see
 * `catalogCategories` below.
 */
export const TRAIT_CATEGORIES: readonly TraitCategory[] = ["Combat", "Faith", "Magic", "Social"];

/**
 * Every distinct category present in a trait catalog, sorted alphabetically
 * — used by `TraitManager`'s filter chips, so the picker's category list
 * reflects the actual vendored `traitType` values (issue #74 Phase 1) rather
 * than a hardcoded guess.
 */
export function catalogCategories(catalog: Record<string, TraitDef>): TraitCategory[] {
  return [...new Set(Object.values(catalog).map((tr) => tr.category))].sort();
}

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
 * Resolve a trait id to its definition: the engine's hand-authored table,
 * then the vendored catalog (`refData.traits`, issue #74 Phase 1), then
 * `doc.build.homebrew.traits` — mirrors
 * `resolveTraitDef(id, refData) ?? doc.build.homebrew?.traits?.[id]` in
 * `@pf1/engine` `collect.ts`, the same fallback chain the static sheet
 * applies.
 */
export function resolveTrait(
  doc: CharacterDoc,
  refData: RefData,
  id: string,
): TraitDef | undefined {
  return resolveTraitDef(id, refData) ?? doc.build.homebrew?.traits?.[id];
}

/** Every pickable trait id: the merged vendored catalog plus this doc's homebrew traits. */
export function allTraitIds(doc: CharacterDoc, refData: RefData): string[] {
  return [...Object.keys(mergedTraits(refData)), ...Object.keys(doc.build.homebrew?.traits ?? {})];
}

/**
 * The set of trait categories represented among the chosen traits (for the
 * soft "different categories" reminder — unknown ids, and ids whose
 * homebrew definition was since deleted, are skipped).
 */
export function chosenTraitCategories(doc: CharacterDoc, refData: RefData): TraitCategory[] {
  const cats: TraitCategory[] = [];
  for (const id of doc.build.traits ?? []) {
    const trait = resolveTrait(doc, refData, id);
    if (trait) cats.push(trait.category);
  }
  return cats;
}

/**
 * True when the chosen traits should prompt a soft warning: more than the
 * budget ({@link expectedTraitCount}, which already accounts for a drawback's
 * bonus slot), or two-plus *normal* traits sharing the same category.
 * Drawbacks are excluded from the category check — a drawback is a separate
 * allowance, not one of the two normal traits. Never used to block — only to
 * color the count badge (see `FeatsSection`'s `featCountClass` for the same
 * pattern).
 */
export function traitsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  if (chosenTraitCount(doc) > expectedTraitCount(doc, refData)) return true;
  const seen = new Set<string>();
  for (const id of doc.build.traits ?? []) {
    const trait = resolveTrait(doc, refData, id);
    if (!trait || isDrawbackTrait(trait)) continue;
    if (seen.has(trait.category)) return true;
    seen.add(trait.category);
  }
  return false;
}
