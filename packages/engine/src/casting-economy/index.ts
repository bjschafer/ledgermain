/**
 * Merge point and resolution for the casting-economy adjustment tables in
 * this directory (see `types.ts` for the charter). One consumer: `compute.ts`
 * calls {@link resolveCastingAdjustments} to emit
 * `DerivedSheet.castingAdjustments`, which the web's casting model folds into
 * `spellSlotsByLevel` / `spellsKnownLimitsByLevel` / `preparedCapacityByLevel`.
 *
 * Source walking mirrors `spell-like-abilities/index.ts` exactly (same
 * keying, same gates) so the two content surfaces can't drift apart in how
 * they decide a feature is present.
 */

import type { CharacterDoc, DerivedCastingAdjustment, RefData } from "@pf1/schema";

import { collectGrantedFeatures } from "../archetypes.js";
import { featNameSlug } from "../feat-effects.js";
import { RACIAL_TRAITS } from "../racial-traits.js";
import { resolveTraitDef } from "../traits.js";
import { ARCHETYPE_CASTING_ADJUSTMENTS_AM } from "./archetypesAM.js";
import { ARCHETYPE_CASTING_ADJUSTMENTS_NZ } from "./archetypesNZ.js";
import { CLASS_FEATURE_CASTING_ADJUSTMENTS } from "./class-features.js";
import { FEAT_CASTING_ADJUSTMENTS } from "./feats.js";
import { CHARACTER_TRAIT_CASTING_ADJUSTMENTS, RACIAL_TRAIT_CASTING_ADJUSTMENTS } from "./traits.js";
import type { CastingAdjustmentDef } from "./types.js";

export type { CastingAdjustmentDef } from "./types.js";
export { CLASS_FEATURE_CASTING_ADJUSTMENTS } from "./class-features.js";
export { ARCHETYPE_CASTING_ADJUSTMENTS_AM } from "./archetypesAM.js";
export { ARCHETYPE_CASTING_ADJUSTMENTS_NZ } from "./archetypesNZ.js";
export { FEAT_CASTING_ADJUSTMENTS } from "./feats.js";
export { CHARACTER_TRAIT_CASTING_ADJUSTMENTS, RACIAL_TRAIT_CASTING_ADJUSTMENTS } from "./traits.js";

/** The A–M / N–Z shard merge — keys are vendored pack ids, so collisions can't happen. */
export const ARCHETYPE_CASTING_ADJUSTMENTS: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {
  ...ARCHETYPE_CASTING_ADJUSTMENTS_AM,
  ...ARCHETYPE_CASTING_ADJUSTMENTS_NZ,
};

/**
 * All source tables, overridable for tests (same posture as
 * `SLA_GRANT_TABLES`: the tables ship empty until the content wave lands, so
 * unit tests inject small tables to exercise each path).
 */
export interface CastingAdjustmentTables {
  classFeature: Readonly<Record<string, readonly CastingAdjustmentDef[]>>;
  archetypeFeature: Readonly<Record<string, readonly CastingAdjustmentDef[]>>;
  feat: Readonly<Record<string, readonly CastingAdjustmentDef[]>>;
  characterTrait: Readonly<Record<string, readonly CastingAdjustmentDef[]>>;
  racialTrait: Readonly<Record<string, readonly CastingAdjustmentDef[]>>;
}

export const CASTING_ADJUSTMENT_TABLES: CastingAdjustmentTables = {
  classFeature: CLASS_FEATURE_CASTING_ADJUSTMENTS,
  archetypeFeature: ARCHETYPE_CASTING_ADJUSTMENTS,
  feat: FEAT_CASTING_ADJUSTMENTS,
  characterTrait: CHARACTER_TRAIT_CASTING_ADJUSTMENTS,
  racialTrait: RACIAL_TRAIT_CASTING_ADJUSTMENTS,
};

function toResolved(
  def: CastingAdjustmentDef,
  sourceId: string,
  sourceLabel: string,
  classTag: string,
): DerivedCastingAdjustment {
  return {
    id: `castadj:${sourceId}:${def.slug}`,
    kind: def.kind,
    classTag,
    spellLevels: def.spellLevels === "each" ? "each" : [...def.spellLevels],
    delta: def.delta,
    source: sourceLabel,
    ...(def.note !== undefined ? { note: def.note } : {}),
  };
}

/**
 * Every casting-economy adjustment the character's build grants, resolved to
 * `DerivedSheet.castingAdjustments` rows. Gates mirror the SLA resolver:
 * class-feature and archetype defs gate `minLevel` on the granting class's
 * level (and default `classTag` to it); feat and trait defs gate on total
 * character level and are SKIPPED when they set no explicit `classTag` (see
 * `types.ts` — choice-of-class grants are residue).
 */
export function resolveCastingAdjustments(
  doc: CharacterDoc,
  refData: RefData,
  tables: CastingAdjustmentTables = CASTING_ADJUSTMENT_TABLES,
): DerivedCastingAdjustment[] {
  const characterLevel = doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
  const out: DerivedCastingAdjustment[] = [];
  const seenIds = new Set<string>();

  const push = (adj: DerivedCastingAdjustment): void => {
    if (seenIds.has(adj.id)) return;
    seenIds.add(adj.id);
    out.push(adj);
  };

  // Class features and domain/school/inquisition granted powers.
  for (const g of collectGrantedFeatures(doc, refData)) {
    const defs = tables.classFeature[g.grant.featureId];
    if (!defs) continue;
    const classLevel = doc.identity.classes.find((c) => c.tag === g.classTag)?.level ?? 0;
    for (const def of defs) {
      if (def.minLevel !== undefined && classLevel < def.minLevel) continue;
      push(toResolved(def, g.grant.featureId, g.grant.name, def.classTag ?? g.classTag));
    }
  }

  // Archetype features — iterate the table, gate on the archetype being
  // chosen and its class level reaching the feature.
  const chosenArchetypes = new Set(doc.build.archetypes ?? []);
  if (chosenArchetypes.size > 0) {
    for (const [featureId, defs] of Object.entries(tables.archetypeFeature)) {
      const af = refData.archetypeFeatures[featureId];
      if (!af || !chosenArchetypes.has(af.archetypeId)) continue;
      const classLevel = doc.identity.classes.find((c) => c.tag === af.classTag)?.level ?? 0;
      if (classLevel < af.level) continue;
      for (const def of defs) {
        if (def.minLevel !== undefined && classLevel < def.minLevel) continue;
        push(toResolved(def, featureId, af.name, def.classTag ?? af.classTag));
      }
    }
  }

  // Feats — slug-keyed; a duplicate copy applies once (id dedup).
  const featIds = [
    ...(doc.build.feats ?? []),
    ...(doc.build.extraFeats ?? []).map((e) => e.featId),
  ];
  for (const featId of featIds) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    const slug = featNameSlug(feat.name);
    const defs = tables.feat[slug];
    if (!defs) continue;
    for (const def of defs) {
      if (def.classTag === undefined) continue;
      if (def.minLevel !== undefined && characterLevel < def.minLevel) continue;
      push(toResolved(def, `feat:${slug}`, feat.name, def.classTag));
    }
  }

  // Character traits — merged catalog ids (vendored or hand, same ids
  // `doc.build.traits` stores).
  for (const id of doc.build.traits ?? []) {
    const defs = tables.characterTrait[id];
    if (!defs) continue;
    const label = resolveTraitDef(id, refData)?.name ?? id;
    for (const def of defs) {
      if (def.classTag === undefined) continue;
      if (def.minLevel !== undefined && characterLevel < def.minLevel) continue;
      push(toResolved(def, id, label, def.classTag));
    }
  }

  // Racial traits — vendored and hand-authored stores, race-gated the same
  // way the SLA resolver is (a stale selection left by a race change grants
  // nothing).
  const raceName = refData.races[doc.identity.race]?.name;
  if (raceName) {
    for (const id of doc.build.vendoredRacialTraits ?? []) {
      const defs = tables.racialTrait[id];
      const trait = refData.racialTraits[id];
      if (!defs || !trait || !trait.race.includes(raceName)) continue;
      for (const def of defs) {
        if (def.classTag === undefined) continue;
        if (def.minLevel !== undefined && characterLevel < def.minLevel) continue;
        push(toResolved(def, id, trait.name, def.classTag));
      }
    }
    for (const id of doc.build.racialTraits ?? []) {
      const defs = tables.racialTrait[id];
      const trait = RACIAL_TRAITS[id];
      if (!defs || !trait || trait.race !== raceName) continue;
      for (const def of defs) {
        if (def.classTag === undefined) continue;
        if (def.minLevel !== undefined && characterLevel < def.minLevel) continue;
        push(toResolved(def, id, trait.name, def.classTag));
      }
    }
  }

  return out;
}
