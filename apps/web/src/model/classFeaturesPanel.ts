/**
 * Pure grouping/search logic for the Play tab's `ClassFeaturesPanel` — a
 * read-only table-side reference over `DerivedSheet.classFeatures`, the same
 * aggregate `apps/web/src/components/builder/ClassFeaturesList.tsx` (grouped
 * by level, for reviewing a build) and `model/printSheet.ts` (the print
 * sheet) already consume. This module answers a different question: "what
 * hexes/rage powers/talents does my character have," so it groups by each
 * feature's `origin.label` (e.g. "Hex", "Major Hex", "Fire Domain") instead
 * of by level — a witch's hexes cluster together regardless of the
 * character level each was picked at. A feature with no `origin` (a base
 * class feature, not a domain/hex/talent/... grant) groups under its
 * granting class's display name instead, so a multiclass character's base
 * features from two classes don't collapse into one bucket.
 */

import type { DerivedClassFeature, RefData } from "@pf1/schema";

export interface ClassFeatureGroup {
  /** Group heading: an origin label, or the granting class's display name for a base class feature. */
  label: string;
  features: DerivedClassFeature[];
}

function classDisplayName(classTag: string, refData: RefData): string {
  const cls = Object.values(refData.classes).find((c) => c.tag === classTag);
  return cls?.name ?? classTag;
}

/**
 * Case-insensitive substring match against name, origin label, and detail —
 * enough to find "Cackle" or "Fire Domain" or a dice/DC string typed into the
 * search box, same posture as `FeatsPanel`'s name-only filter but slightly
 * wider since class features carry more of their rules text inline.
 */
export function filterClassFeatures(
  features: DerivedClassFeature[],
  query: string,
): DerivedClassFeature[] {
  const q = query.trim().toLowerCase();
  if (!q) return features;
  return features.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      (f.origin?.label.toLowerCase().includes(q) ?? false) ||
      (f.detail?.toLowerCase().includes(q) ?? false),
  );
}

/**
 * Groups already-filtered features by origin (or granting class, for a base
 * feature). Groups sort by their lowest-level feature so early class
 * features surface first; features within a group sort by level then name.
 * Struck-through (archetype-replaced) features stay included — same
 * "provenance, not silence" posture as `ClassFeaturesList`.
 */
export function groupClassFeatures(
  features: DerivedClassFeature[],
  refData: RefData,
): ClassFeatureGroup[] {
  const groups = new Map<string, DerivedClassFeature[]>();
  for (const f of features) {
    const label = f.origin?.label ?? classDisplayName(f.classTag, refData);
    const list = groups.get(label);
    if (list) list.push(f);
    else groups.set(label, [f]);
  }

  const out: ClassFeatureGroup[] = [...groups.entries()].map(([label, list]) => ({
    label,
    features: [...list].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
  }));
  out.sort((a, b) => {
    const aMin = Math.min(...a.features.map((f) => f.level));
    const bMin = Math.min(...b.features.map((f) => f.level));
    return aMin - bMin || a.label.localeCompare(b.label);
  });
  return out;
}
