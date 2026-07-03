/**
 * Resolve a character's granted base-class features and any archetype swaps
 * layered on top. Archetypes carry no numeric effects in v1 (see
 * `packages/schema/src/refdata.ts` `ArchetypeFeature` doc comment) — this is
 * structural/display resolution only: which base feature is struck through,
 * and which archetype feature replaced it (or, when the dataset couldn't pair
 * a slot unambiguously, a prose-only soft warning instead of a swap).
 */

import type {
  AbilityId,
  CharacterDoc,
  DerivedArchetype,
  DerivedArchetypeFeature,
  DerivedClassFeature,
  RefData,
} from "@pf1/schema";

import {
  sneakAttackDice,
  smiteEvilDetail,
  smiteEvilLabel,
  unarmedDamageDie,
  flurryOfBlowsLabel,
  barbarianDamageReduction,
} from "./tables.js";
import type { AbilityView } from "./rolldata.js";

export interface ResolvedClassFeatures {
  classFeatures: DerivedClassFeature[];
  activeArchetypes: DerivedArchetype[];
}

/**
 * `abilities` (from a computed sheet) lets Smite Evil's Cha-keyed detail
 * resolve against final scores; omit it to treat Cha modifier as 0 (matches
 * `deriveResourcePools`'s optional-abilities posture).
 */
export function resolveClassFeatures(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<AbilityId, AbilityView>,
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
      // Sneak Attack's die count, Smite Evil's attack/damage/AC scaling, and
      // Monk's unarmed damage die / Flurry of Blows summary have no vendored
      // tag/changes (Foundry only tags channelEnergy/rage) — matched by
      // name, same posture as feat-effects.ts's name-slug lookup.
      let detail: string | undefined;
      if (cls.tag === "rogue" && grant.name === "Sneak Attack") {
        detail = sneakAttackDice(cls.level).diceLabel;
      } else if (cls.tag === "paladin" && grant.name === "Smite Evil") {
        const chaMod = abilities?.cha?.mod ?? 0;
        detail = smiteEvilLabel(smiteEvilDetail(cls.level, chaMod));
      } else if (cls.tag === "monk" && grant.name === "Unarmed Strike") {
        detail = unarmedDamageDie(cls.level).dieLabel;
      } else if (cls.tag === "monk" && grant.name === "Flurry of Blows") {
        detail = flurryOfBlowsLabel(cls.level);
      } else if (cls.tag === "barbarian" && grant.name === "Damage Reduction") {
        detail = barbarianDamageReduction(cls.level).label;
      }
      classFeatures.push({
        level: grant.level,
        classTag: cls.tag,
        featureId: grant.featureId,
        name: grant.name,
        applied: !replacedBy,
        replacedBy,
        detail,
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
