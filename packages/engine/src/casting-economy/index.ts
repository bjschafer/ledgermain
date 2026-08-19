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

import type {
  CharacterDoc,
  DerivedBonusKnownSpell,
  DerivedBonusKnownSpells,
  DerivedCastingAdjustment,
  RefData,
} from "@pf1/schema";

import { collectGrantedFeatures } from "../archetypes.js";
import { featNameSlug } from "../feat-effects.js";
import { RACIAL_TRAITS } from "../racial-traits.js";
import { spellIdByName } from "../spell-like-abilities/index.js";
import { resolveTraitDef } from "../traits.js";
import { ARCHETYPE_BONUS_KNOWN_SPELLS_AM } from "./bonus-knownAM.js";
import { ARCHETYPE_BONUS_KNOWN_SPELLS_NZ } from "./bonus-knownNZ.js";
import { ARCHETYPE_CASTING_ADJUSTMENTS_AM } from "./archetypesAM.js";
import { ARCHETYPE_CASTING_ADJUSTMENTS_NZ } from "./archetypesNZ.js";
import { CLASS_FEATURE_CASTING_ADJUSTMENTS } from "./class-features.js";
import { FEAT_CASTING_ADJUSTMENTS } from "./feats.js";
import { CHARACTER_TRAIT_CASTING_ADJUSTMENTS, RACIAL_TRAIT_CASTING_ADJUSTMENTS } from "./traits.js";
import type { BonusKnownSpellsDef, CastingAdjustmentDef } from "./types.js";

export type { BonusKnownSpellDef, BonusKnownSpellsDef, CastingAdjustmentDef } from "./types.js";
export { ARCHETYPE_BONUS_KNOWN_SPELLS_AM } from "./bonus-knownAM.js";
export { ARCHETYPE_BONUS_KNOWN_SPELLS_NZ } from "./bonus-knownNZ.js";
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

/** The A–M / N–Z bonus-known shard merge — keys are vendored pack ids. */
export const ARCHETYPE_BONUS_KNOWN_SPELLS: Readonly<Record<string, BonusKnownSpellsDef>> = {
  ...ARCHETYPE_BONUS_KNOWN_SPELLS_AM,
  ...ARCHETYPE_BONUS_KNOWN_SPELLS_NZ,
};

/**
 * Fixed bonus-known-spell grants the character's active archetypes provide,
 * resolved to `DerivedSheet.bonusKnownSpells`. Gating mirrors
 * {@link resolveCastingAdjustments}'s archetype path (archetype chosen,
 * class level at the feature's level) with each spell additionally gated on
 * its own `atLevel`; the file-under level prefers an explicit `spellLevel`,
 * then the granting class's list level, then the spell's nominal level —
 * the same degradation order the SLA rows use. Returns `undefined` when
 * nothing resolves so `compute` can omit the sheet field.
 */
export function resolveBonusKnownSpells(
  doc: CharacterDoc,
  refData: RefData,
  table: Readonly<Record<string, BonusKnownSpellsDef>> = ARCHETYPE_BONUS_KNOWN_SPELLS,
): DerivedBonusKnownSpells | undefined {
  const chosenArchetypes = new Set(doc.build.archetypes ?? []);
  if (chosenArchetypes.size === 0) return undefined;

  const spells: DerivedBonusKnownSpell[] = [];
  let mysteryReplacedLevels: number[] | "all" | undefined;

  for (const [featureId, def] of Object.entries(table)) {
    const af = refData.archetypeFeatures[featureId];
    if (!af || !chosenArchetypes.has(af.archetypeId)) continue;
    const classLevel = doc.identity.classes.find((c) => c.tag === af.classTag)?.level ?? 0;
    if (classLevel < af.level) continue;

    if (def.replacesMysteryBonusSpellLevels !== undefined) {
      if (def.replacesMysteryBonusSpellLevels === "all" || mysteryReplacedLevels === "all") {
        mysteryReplacedLevels = "all";
      } else {
        mysteryReplacedLevels = [
          ...new Set([...(mysteryReplacedLevels ?? []), ...def.replacesMysteryBonusSpellLevels]),
        ].sort((a, b) => a - b);
      }
    }

    for (const grant of def.spells) {
      if (classLevel < grant.atLevel) continue;
      const spellId = spellIdByName(refData, grant.spell);
      const spell = spellId ? refData.spells[spellId] : undefined;
      const level = grant.spellLevel ?? spell?.learnedAt.class[af.classTag] ?? spell?.level ?? 0;
      spells.push({
        id: `bonusknown:${featureId}:${featNameSlug(grant.spell)}`,
        classTag: af.classTag,
        ...(spellId !== undefined ? { spellId } : {}),
        name: spell?.name ?? grant.spell,
        level,
        source: af.name,
      });
    }
  }

  if (spells.length === 0 && mysteryReplacedLevels === undefined) return undefined;
  return {
    spells,
    ...(mysteryReplacedLevels !== undefined ? { mysteryReplacedLevels } : {}),
  };
}
