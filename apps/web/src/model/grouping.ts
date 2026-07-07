/**
 * Generic helper for organizing picker entries into ordered, labeled sections —
 * e.g. grouping races by rarity tier (`model/rarity.ts`) so the builder's flat
 * alphabetical chip list reads as Core / Featured / Uncommon / Exotic sections
 * instead of dropping Human next to Android.
 *
 * Kept deliberately entity-agnostic so any future picker with a small fixed set
 * of categories can reuse it (classes by subType, feats by school, …): pass the
 * items, a classifier, the category order, and a label lookup. Sections come
 * back in `order`; empty ones are omitted so a searched/filtered list never
 * renders a bare header with no entries under it.
 *
 * Contract: `categoryOf` must return a member of `order`. Any category outside
 * `order` is silently dropped — classifiers should fold "everything else" into
 * a catch-all tier that is itself in `order` (see `raceRarity`'s `"exotic"`
 * default) rather than returning an unlisted value.
 */

export interface CategoryGroup<T, C extends string> {
  category: C;
  label: string;
  items: T[];
}

export function groupByCategory<T, C extends string>(
  items: readonly T[],
  categoryOf: (item: T) => C,
  order: readonly C[],
  labelOf: (category: C) => string,
): CategoryGroup<T, C>[] {
  const buckets = new Map<C, T[]>();
  for (const item of items) {
    const category = categoryOf(item);
    let bucket = buckets.get(category);
    if (bucket === undefined) {
      bucket = [];
      buckets.set(category, bucket);
    }
    bucket.push(item);
  }
  const groups: CategoryGroup<T, C>[] = [];
  for (const category of order) {
    const bucket = buckets.get(category);
    if (bucket !== undefined && bucket.length > 0) {
      groups.push({ category, label: labelOf(category), items: bucket });
    }
  }
  return groups;
}
