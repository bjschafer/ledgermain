/**
 * The vocabulary for `Change.acCategories` — a bonus scoped to a category of
 * attacks rather than to AC as a whole. Mirrors `maneuver-categories.ts`'s
 * flat shape: no parent graph (no key here is a special case of another), and
 * no equivalent of `SaveCategory.saves` (there is only one AC for a line to
 * hang off — see `ArmorClass.conditionals` for why touch/flat-footed take no
 * lines).
 *
 * Unlike the save/maneuver vocabularies, several keys here name a property of
 * the ATTACKER (giants, aberrations) rather than of the roll. The save-note
 * and maneuver-note tables exclude opponent-type scopes because their
 * vocabularies carry no such axis — but for AC the attacker-subtype scope IS
 * the dominant published shape (dwarf/gnome Defensive Training and its many
 * alternate-trait variants), so this vocabulary carries the axis on purpose
 * rather than leaving the whole family prose.
 *
 * `label` is player-facing copy shown on the sheet, so it stays terse — see
 * `SaveCategory.label`'s doc comment for the sizing constraint that applies
 * here too.
 */

import type { ConditionalTotal } from "@pf1/schema";

import { resolveStack, type TypedModifier } from "./stacking.js";

export interface AcCategory {
  /** Player-facing label. Terse — it renders under a stat seal. */
  label: string;
}

export const AC_CATEGORIES: Readonly<Record<string, AcCategory>> = {
  // Attack-shape categories: a property of the incoming attack itself.
  traps: { label: "traps" },
  aoo: { label: "AoOs" },
  charge: { label: "charging foes" },

  // Attacker-type categories: a property of who is attacking. See the module
  // doc comment for why AC carries this axis when saves/maneuvers don't.
  // Each key is a published Defensive Training-family scope; a type nothing
  // promotes to earns no key.
  giants: { label: "giants" },
  aberrations: { label: "aberrations" },
  animals: { label: "animals" },
};

/**
 * Display order for merged category lists, so a multi-category line always
 * reads in the same order regardless of the order the Changes were
 * collected in.
 */
export const AC_CATEGORY_ORDER: readonly string[] = Object.keys(AC_CATEGORIES);

export function acCategoryLabel(key: string): string {
  return AC_CATEGORIES[key]?.label ?? key;
}

/**
 * An AC modifier that may be scoped to {@link AC_CATEGORIES} keys.
 * `stackCategory` is `computeAc`'s stacking bucket (dodge/deflection/generic
 * for a bare-`ac` modifier — its `categoryFor`), NOT an {@link AC_CATEGORIES}
 * key; the two axes are unrelated and both unavoidably called "category".
 */
export interface ScopedAcModifier extends TypedModifier {
  stackCategory: string;
  /**
   * When set, this modifier is excluded from AC's headline totals and
   * contributes only to those categories' conditional totals.
   */
  acCategories?: readonly string[];
}

/**
 * Situational AC totals, one per distinct value — the AC counterpart of
 * `maneuverConditionalTotals`, with one structural difference: AC's headline
 * is not one flat stack but a sum of per-(stackCategory|type) stacks (see
 * `computeAc`), so each conditional total is `normal` plus the DELTA each
 * affected stacking group gains when the scoped modifiers join it. That keeps
 * typed collision exact — a scoped +2 insight bonus over an unconditional +1
 * insight bonus moves the line by +1, not +2 — without re-running the parts
 * of `computeAc` (worn-piece enhancement pairing, max-Dex caps) that a
 * bare-`ac` scoped modifier can never touch: scoped modifiers only ever land
 * in the dodge/deflection/generic buckets, never armor/shield/natural.
 *
 * `unconditional` is the full headline candidate list (any bucket — members
 * of unaffected groups are simply never consulted); `scoped` is the
 * category-scoped modifiers held out of that headline.
 */
export function acConditionalTotals(
  normal: number,
  unconditional: readonly ScopedAcModifier[],
  scoped: readonly ScopedAcModifier[],
): ConditionalTotal[] {
  if (scoped.length === 0) return [];

  // Only a category some modifier actually NAMES earns a line.
  const named = new Set(scoped.flatMap((m) => m.acCategories ?? []));

  const byTotal = new Map<number, string[]>();
  for (const key of AC_CATEGORY_ORDER) {
    if (!named.has(key)) continue;
    const forCategory = scoped.filter((m) => m.acCategories?.includes(key));
    if (forCategory.length === 0) continue;

    const byGroup = new Map<string, ScopedAcModifier[]>();
    for (const m of forCategory) {
      const groupKey = `${m.stackCategory}|${m.type}`;
      const bucket = byGroup.get(groupKey);
      if (bucket) bucket.push(m);
      else byGroup.set(groupKey, [m]);
    }

    let delta = 0;
    for (const [groupKey, groupScoped] of byGroup) {
      const base = unconditional.filter((m) => `${m.stackCategory}|${m.type}` === groupKey);
      const before = base.length > 0 ? resolveStack(base as TypedModifier[]).total : 0;
      const after = resolveStack([...base, ...groupScoped] as TypedModifier[]).total;
      delta += after - before;
    }

    const conditionalTotal = normal + delta;
    // A category that resolves to the headline total says nothing.
    if (conditionalTotal === normal) continue;
    const bucket = byTotal.get(conditionalTotal);
    if (bucket) bucket.push(key);
    else byTotal.set(conditionalTotal, [key]);
  }

  return [...byTotal.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([conditionalTotal, categories]) => ({
      total: conditionalTotal,
      categories,
      labels: categories.map(acCategoryLabel),
    }));
}
