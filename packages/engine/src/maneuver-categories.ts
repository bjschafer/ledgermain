/**
 * The vocabulary for `Change.maneuverCategories` — a bonus scoped to one of
 * the ten PF1 combat maneuvers rather than to CMB/CMD as a whole. Mirrors
 * `save-categories.ts` at a simpler scale: there is no parent graph here
 * (PF1 has no "combat maneuvers in general" grouping the way mind-affecting
 * groups several saves — each maneuver stands alone), and no equivalent of
 * `SaveCategory.saves` either. A save category has to say which saves it can
 * be rolled against because the same category (poison, fear) can appear on
 * different saves; a maneuver category never needs that, because whether a
 * bonus applies to your own attempt or to resisting one is already carried
 * by the Change's own `target` ("cmb" vs "cmd") — the category key means the
 * same thing on either side.
 *
 * `label` is player-facing copy shown on the sheet, so it stays terse — see
 * `SaveCategory.label`'s doc comment for the sizing constraint that applies
 * here too.
 */

import type { ConditionalTotal } from "@pf1/schema";

import { resolveStack, type TypedModifier } from "./stacking.js";

export interface ManeuverCategory {
  /** Player-facing label. Terse — it renders under a stat seal. */
  label: string;
}

/** The CRB six plus the APG four. */
export const MANEUVER_CATEGORIES: Readonly<Record<string, ManeuverCategory>> = {
  bullRush: { label: "bull rush" },
  dirtyTrick: { label: "dirty trick" },
  disarm: { label: "disarm" },
  drag: { label: "drag" },
  grapple: { label: "grapple" },
  overrun: { label: "overrun" },
  reposition: { label: "reposition" },
  steal: { label: "steal" },
  sunder: { label: "sunder" },
  trip: { label: "trip" },
};

/**
 * Display order for merged category lists, so a multi-category line always
 * reads in the same order regardless of the order the Changes were
 * collected in.
 */
export const MANEUVER_CATEGORY_ORDER: readonly string[] = Object.keys(MANEUVER_CATEGORIES);

export function maneuverCategoryLabel(key: string): string {
  return MANEUVER_CATEGORIES[key]?.label ?? key;
}

/** A cmb/cmd modifier that may be scoped to {@link MANEUVER_CATEGORIES} keys. */
export interface ScopedManeuverModifier extends TypedModifier {
  /**
   * When set, this modifier is excluded from cmb/cmd's headline total and
   * contributes only to those categories' conditional totals.
   */
  maneuverCategories?: readonly string[];
}

/**
 * Situational cmb/cmd totals, one per distinct value — mirrors
 * `save-categories.ts`'s `conditionalTotals` at maneuver scale: each named
 * category is re-stacked FROM SCRATCH against the unconditional modifiers
 * rather than added on top of the headline total, so two same-type bonuses
 * still collide (highest wins) even when one of them is category-scoped,
 * which a plain sum would get wrong.
 *
 * `floor` is the stat's base + ability (+ size, for cmb) term, already
 * summed, matching `resolveSave`'s `floor` parameter. `unconditional` is the
 * modifier list the headline total was already stacked from (so the
 * headline `total` this function derives internally matches the caller's
 * own); `scoped` is the maneuver-scoped modifiers held out of that headline.
 */
export function maneuverConditionalTotals(
  floor: number,
  unconditional: readonly ScopedManeuverModifier[],
  scoped: readonly ScopedManeuverModifier[],
): ConditionalTotal[] {
  if (scoped.length === 0) return [];
  const total = floor + resolveStack(unconditional as TypedModifier[]).total;

  // Only a category some modifier actually NAMES earns a line.
  const named = new Set(scoped.flatMap((m) => m.maneuverCategories ?? []));

  const byTotal = new Map<number, string[]>();
  for (const key of MANEUVER_CATEGORY_ORDER) {
    if (!named.has(key)) continue;
    const forCategory = scoped.filter((m) => m.maneuverCategories?.includes(key));
    if (forCategory.length === 0) continue;
    const stacked = resolveStack([...unconditional, ...forCategory] as TypedModifier[]);
    const conditionalTotal = floor + stacked.total;
    // A category that resolves to the headline total says nothing.
    if (conditionalTotal === total) continue;
    const bucket = byTotal.get(conditionalTotal);
    if (bucket) bucket.push(key);
    else byTotal.set(conditionalTotal, [key]);
  }

  return [...byTotal.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([conditionalTotal, categories]) => ({
      total: conditionalTotal,
      categories,
      labels: categories.map(maneuverCategoryLabel),
    }));
}
