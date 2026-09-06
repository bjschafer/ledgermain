/**
 * Pure grouping/search logic for the Play tab's `ClassFeaturesPanel` — a
 * read-only table-side reference over `DerivedSheet.classFeatures` plus each
 * active archetype's own feature list, the same aggregates
 * `apps/web/src/components/builder/ClassFeaturesList.tsx` (grouped by level,
 * for reviewing a build) and `model/printSheet.ts` (the print sheet) already
 * consume. This module answers a different question: "what hexes/rage
 * powers/talents does my character have," so it groups by each feature's
 * `origin.label` (e.g. "Hex", "Major Hex", "Fire Domain") instead of by
 * level — a witch's hexes cluster together regardless of the character level
 * each was picked at. A feature with no `origin` (a base class feature, not a
 * domain/hex/talent/... grant) groups under its granting class's display name
 * instead, so a multiclass character's base features from two classes don't
 * collapse into one bucket. An archetype feature's "origin" IS its archetype,
 * so those group under the archetype's name — the same convention
 * `ArchetypeFeatureRow` uses for its inline origin label.
 */

import type {
  DerivedArchetypeFeature,
  DerivedClassFeature,
  DerivedSheet,
  RefData,
} from "@pf1/schema";
import { classByTag } from "@pf1/engine";

/**
 * One panel entry: a base class feature or an active archetype's own feature.
 * Same union shape as the builder timeline's entries, so the two views never
 * disagree about what counts as a class feature.
 */
export type ClassFeaturePanelEntry =
  | { kind: "base"; feature: DerivedClassFeature }
  | { kind: "archetype"; feature: DerivedArchetypeFeature; archetypeName: string };

export interface ClassFeatureGroup {
  /**
   * Group heading: an origin label, the archetype's name for an archetype
   * feature, or the granting class's display name for a base class feature.
   */
  label: string;
  entries: ClassFeaturePanelEntry[];
}

function classDisplayName(classTag: string, refData: RefData): string {
  const cls = classByTag(refData, classTag);
  return cls?.name ?? classTag;
}

/** Flattens the sheet's base features + per-archetype features into one list. */
export function collectPanelEntries(sheet: DerivedSheet): ClassFeaturePanelEntry[] {
  return [
    ...sheet.classFeatures.map((feature): ClassFeaturePanelEntry => ({ kind: "base", feature })),
    ...sheet.activeArchetypes.flatMap((a) =>
      a.features.map(
        (feature): ClassFeaturePanelEntry => ({
          kind: "archetype",
          feature,
          archetypeName: a.name,
        }),
      ),
    ),
  ];
}

function groupLabel(entry: ClassFeaturePanelEntry, refData: RefData): string {
  return entry.kind === "base"
    ? (entry.feature.origin?.label ?? classDisplayName(entry.feature.classTag, refData))
    : entry.archetypeName;
}

/**
 * Case-insensitive substring match against name, origin label (the archetype
 * name, for an archetype feature), and detail — enough to find "Cackle" or
 * "Fire Domain" or a dice/DC string typed into the search box, same posture
 * as `FeatsPanel`'s name-only filter but slightly wider since class features
 * carry more of their rules text inline.
 */
export function filterClassFeatures(
  entries: ClassFeaturePanelEntry[],
  query: string,
): ClassFeaturePanelEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => {
    if (entry.feature.name.toLowerCase().includes(q)) return true;
    if (entry.feature.detail?.toLowerCase().includes(q)) return true;
    return entry.kind === "base"
      ? (entry.feature.origin?.label.toLowerCase().includes(q) ?? false)
      : entry.archetypeName.toLowerCase().includes(q);
  });
}

/**
 * Groups already-filtered entries by origin (or granting class, for a base
 * feature; or archetype name, for an archetype feature). Groups sort by
 * their lowest-level entry so early class features surface first; entries
 * within a group sort by level then name. Struck-through
 * (archetype-replaced) features stay included — same "provenance, not
 * silence" posture as `ClassFeaturesList`. A level-0 archetype feature (an
 * unleveled class-table alteration) sorts ahead of the leveled ones, which
 * also floats its archetype's group to the top — the archetype changed the
 * class's baseline, so leading with it reads correctly.
 */
export function groupClassFeatures(
  entries: ClassFeaturePanelEntry[],
  refData: RefData,
): ClassFeatureGroup[] {
  const groups = new Map<string, ClassFeaturePanelEntry[]>();
  for (const entry of entries) {
    const label = groupLabel(entry, refData);
    const list = groups.get(label);
    if (list) list.push(entry);
    else groups.set(label, [entry]);
  }

  const out: ClassFeatureGroup[] = [...groups.entries()].map(([label, list]) => ({
    label,
    entries: [...list].sort(
      (a, b) => a.feature.level - b.feature.level || a.feature.name.localeCompare(b.feature.name),
    ),
  }));
  out.sort((a, b) => {
    const aMin = Math.min(...a.entries.map((e) => e.feature.level));
    const bMin = Math.min(...b.entries.map((e) => e.feature.level));
    return aMin - bMin || a.label.localeCompare(b.label);
  });
  return out;
}
