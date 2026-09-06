/**
 * Tag- and id-keyed indexes over the `RefData` collections the engine scans
 * repeatedly. Without them, resolving one class definition is a linear scan of
 * 163 classes and resolving one archetype's features a scan of 6,007
 * archetype features — both at several call sites per `compute()`, and both
 * growing with every content wave.
 *
 * The index is memoized per `RefData` object rather than built by the loader,
 * because RefData reaches the engine three different ways (the data-pipeline
 * loader in tests and scripts, a `fetch` of the copied JSON in the web app,
 * a build-time import in the reference site) and only one of those goes
 * through a loader we own. A `WeakMap` gets "built once" for all three and
 * lets a discarded RefData be collected.
 */

import type {
  ArchetypeFeature,
  Class,
  ClassFeature,
  Domain,
  RefData,
  Subdomain,
} from "@pf1/schema";

export interface RefDataIndex {
  /** `refData.classes` keyed by `Class.tag`. */
  classByTag: ReadonlyMap<string, Class>;
  /** `refData.classFeatures` keyed by `ClassFeature.tag` (features with one). */
  classFeatureByTag: ReadonlyMap<string, ClassFeature>;
  /**
   * `refData.archetypeFeatures` grouped by `archetypeId`, each group in the
   * order the collection itself is in — the order the `Object.values` scans
   * these replaced saw, which several last-wins callers depend on.
   */
  archetypeFeaturesByArchetype: ReadonlyMap<string, readonly ArchetypeFeature[]>;
  domainByTag: ReadonlyMap<string, Domain>;
  subdomainByTag: ReadonlyMap<string, Subdomain>;
}

const CACHE = new WeakMap<RefData, RefDataIndex>();

function byTag<T extends { tag?: string }>(rec: Record<string, T> | undefined): Map<string, T> {
  const map = new Map<string, T>();
  // First entry wins, matching the `find` the call sites used to run.
  for (const entry of Object.values(rec ?? {})) {
    if (entry.tag !== undefined && !map.has(entry.tag)) map.set(entry.tag, entry);
  }
  return map;
}

// Tests and the reference site both hand the engine partial RefData stubs, so
// every collection read here tolerates a missing one.
function buildIndex(refData: RefData): RefDataIndex {
  const archetypeFeaturesByArchetype = new Map<string, ArchetypeFeature[]>();
  for (const feature of Object.values(refData.archetypeFeatures ?? {})) {
    const group = archetypeFeaturesByArchetype.get(feature.archetypeId);
    if (group) group.push(feature);
    else archetypeFeaturesByArchetype.set(feature.archetypeId, [feature]);
  }

  return {
    classByTag: byTag(refData.classes),
    classFeatureByTag: byTag(refData.classFeatures),
    archetypeFeaturesByArchetype,
    domainByTag: byTag(refData.domains),
    subdomainByTag: byTag(refData.subdomains),
  };
}

/** The index for `refData`, built on first use and reused afterwards. */
export function refDataIndex(refData: RefData): RefDataIndex {
  let index = CACHE.get(refData);
  if (!index) {
    index = buildIndex(refData);
    CACHE.set(refData, index);
  }
  return index;
}

/** The class definition with this tag, or `undefined`. */
export function classByTag(refData: RefData, tag: string): Class | undefined {
  return refDataIndex(refData).classByTag.get(tag);
}

/** The class feature with this tag, or `undefined`. */
export function classFeatureByTag(refData: RefData, tag: string): ClassFeature | undefined {
  return refDataIndex(refData).classFeatureByTag.get(tag);
}

/** This archetype's features. Empty for an unknown archetype. */
export function archetypeFeaturesOf(
  refData: RefData,
  archetypeId: string,
): readonly ArchetypeFeature[] {
  return refDataIndex(refData).archetypeFeaturesByArchetype.get(archetypeId) ?? [];
}

/** The cleric domain with this tag, or `undefined`. */
export function domainByTag(refData: RefData, tag: string): Domain | undefined {
  return refDataIndex(refData).domainByTag.get(tag);
}

/** The cleric subdomain with this tag, or `undefined`. */
export function subdomainByTag(refData: RefData, tag: string): Subdomain | undefined {
  return refDataIndex(refData).subdomainByTag.get(tag);
}
