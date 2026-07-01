/**
 * Resolve a character's granted base-class features and any archetype swaps
 * layered on top. Archetypes carry no numeric effects in v1 (see
 * `packages/schema/src/refdata.ts` `ArchetypeFeature` doc comment) — this is
 * structural/display resolution only: which base feature is struck through,
 * and which archetype feature replaced it (or, when the dataset couldn't pair
 * a slot unambiguously, a prose-only soft warning instead of a swap).
 */

import type {
  CharacterDoc,
  DerivedArchetype,
  DerivedArchetypeFeature,
  DerivedClassFeature,
  RefData,
} from "@pf1/schema";

export interface ResolvedClassFeatures {
  classFeatures: DerivedClassFeature[];
  activeArchetypes: DerivedArchetype[];
}

export function resolveClassFeatures(
  doc: CharacterDoc,
  refData: RefData,
): ResolvedClassFeatures {
  // uuid of a base-class grant -> the archetype feature name that replaces it.
  const replacedByUuid = new Map<string, string>();
  const activeArchetypes: DerivedArchetype[] = [];

  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel =
      doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;

    const swappedSlots: Record<number, string> = {};
    const features: DerivedArchetypeFeature[] = [];
    const archetypeFeatures = Object.values(refData.archetypeFeatures)
      .filter((f) => f.archetypeId === archetypeId && f.level <= clsLevel)
      .sort((a, b) => a.level - b.level);

    for (const f of archetypeFeatures) {
      features.push({
        level: f.level,
        name: f.name,
        description: f.description,
        ambiguous: !f.pairedBaseFeatureUuid,
      });
      if (f.pairedBaseFeatureUuid) {
        swappedSlots[f.level] = f.pairedBaseFeatureUuid;
        replacedByUuid.set(f.pairedBaseFeatureUuid, f.name);
      }
    }

    activeArchetypes.push({
      id: archetype.id,
      name: archetype.name,
      classTag: archetype.classTag,
      swappedSlots,
      features,
    });
  }

  const classFeatures: DerivedClassFeature[] = [];
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const replacedBy = replacedByUuid.get(grant.uuid);
      classFeatures.push({
        level: grant.level,
        classTag: cls.tag,
        featureId: grant.featureId,
        name: grant.name,
        applied: !replacedBy,
        replacedBy,
      });
    }
  }
  classFeatures.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return { classFeatures, activeArchetypes };
}

/**
 * Every base-class-feature uuid this archetype swaps out (across all its
 * levels, regardless of the character's current level — a swap the character
 * hasn't reached yet still makes taking a second, overlapping archetype
 * pointless once they level up). Used to detect conflicting archetype picks
 * before they're added to `build.archetypes`, since `resolveClassFeatures`
 * itself just applies swaps last-wins and silently drops the earlier one.
 */
export function archetypeSwappedUuids(refData: RefData, archetypeId: string): Set<string> {
  const uuids = new Set<string>();
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId === archetypeId && f.pairedBaseFeatureUuid) {
      uuids.add(f.pairedBaseFeatureUuid);
    }
  }
  return uuids;
}
