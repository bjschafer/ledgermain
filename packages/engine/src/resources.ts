/**
 * Derive limited-use resource pools (e.g. Rage rounds/day, Channel Energy uses)
 * from a character's granted class features. Each feature that carries a
 * `uses.maxFormula` becomes a suggested pool whose maximum is the formula
 * evaluated against that class's roll-data context.
 *
 * What this CANNOT derive (documented limitation): the vendored data slice does
 * not include item charge counts, so item charges are tracked as manual pools by
 * the tracker UI. Spell slots are handled separately — the web app composes the
 * engine's hardcoded spells-per-day table (`baseSpellsPerDay` in `tables.ts`)
 * with ability bonus spells in its prepared-spells panel.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

import { collectGrantedFeatures } from "./archetypes.js";
import { FEAT_POOL_EFFECTS, featNameSlug } from "./feat-effects.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";
import { buildRollData, type AbilityView } from "./rolldata.js";
import { channelEnergyDetail, layOnHandsDice, smiteEvilDetail, smiteEvilLabel } from "./tables.js";

export interface DerivedResourcePool {
  /** Stable pool id (the class-feature id). */
  id: string;
  /** Display label, e.g. "Rage". */
  name: string;
  /** Maximum uses, from `uses.maxFormula`. */
  max: number;
  /** Recharge period, e.g. "day". */
  per?: string;
  /** Class the feature was granted by (for display). */
  classTag: string;
  /**
   * One-line mechanical summary that the prose-only `changes[]` carries upstream
   * (e.g. channel energy's "4d6 (DC 15)" dice/save scaling). Undefined when the
   * feature's `uses.maxFormula` is the entire mechanical content (Rage). The
   * tracker renders this as the sub-line of the resource row.
   */
  detail?: string;
}

/**
 * Scan granted class features for `uses.maxFormula` pools. `abilities` (from a
 * computed sheet) lets formulas like Rage's `@abilities.con.mod` resolve against
 * final scores; omit it to use base scores.
 */
export function deriveResourcePools(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<string, AbilityView>,
): DerivedResourcePool[] {
  const rollData = buildRollData(doc, refData, abilities as Parameters<typeof buildRollData>[2]);
  const pools: DerivedResourcePool[] = [];
  const poolMaxBonusByFeatureTag = collectFeatPoolBonuses(doc, refData);

  for (const { classTag, grant, resourcePool } of collectGrantedFeatures(doc, refData)) {
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    // `@class.unlevel` inside a feature formula refers to THIS (granting) class's
    // level — for a domain/school grant that's the cleric/wizard level.
    const featureRollData = { ...rollData, class: { level: classLevel, unlevel: classLevel } };

    // Bloodline powers (issue #34) carry a pre-computed formula (no vendored
    // `RefData.classFeatures` entry exists for them — see `bloodlines.ts`).
    // Evaluated against the plain `rollData` (its formulas reference
    // `@classes.sorcerer.level` directly, not the granting-class-contextual
    // `@class.unlevel` the vendored-feature path below relies on).
    if (resourcePool) {
      let poolMax: number | null;
      try {
        poolMax = tryEvaluateFormula(resourcePool.usesFormula, rollData);
      } catch {
        continue;
      }
      if (poolMax === null || Number.isNaN(poolMax) || poolMax <= 0) continue;
      if (pools.some((p) => p.id === grant.featureId)) continue;
      pools.push({
        id: grant.featureId,
        name: grant.name,
        max: Math.trunc(poolMax),
        per: resourcePool.per,
        classTag,
        detail: resourcePool.detail,
      });
      continue;
    }

    const feature = refData.classFeatures[grant.featureId];
    const formula = feature?.uses?.maxFormula;
    if (!feature || !formula) continue;
    let max: number | null;
    try {
      max = tryEvaluateFormula(formula, featureRollData);
    } catch {
      continue;
    }
    if (max === null || Number.isNaN(max) || max <= 0) continue;
    if (pools.some((p) => p.id === feature.id)) continue;

    // Channel-energy dice/save scaling, Lay on Hands' healing dice, and
    // Smite Evil's attack/damage/AC scaling are prose-only upstream (the
    // dice live on an action formula, and the attack/damage/AC math has no
    // `changes[]` entry at all) — derive them here clean-room so the
    // tracker can surface them. Uses THIS class's level (the feature
    // RollData context).
    let detail: string | undefined;
    // `featureRollData` is a RollData spread; index access returns `unknown`.
    const featureAbilities = (featureRollData as RollData).abilities as
      | { cha?: { mod?: number } }
      | undefined;
    const chaMod = featureAbilities?.cha?.mod ?? 0;
    if (feature.tag === "channelEnergy" && classTag === "cleric") {
      const ch = channelEnergyDetail(classLevel, chaMod);
      detail = `${ch.diceLabel} (DC ${ch.saveDC})`;
    } else if (feature.tag === "layOnHands" && classTag === "paladin") {
      detail = layOnHandsDice(classLevel).diceLabel;
    } else if (feature.tag === "smiteEvil" && classTag === "paladin") {
      detail = smiteEvilLabel(smiteEvilDetail(classLevel, chaMod));
    }

    // Feats that raise this pool's maximum (Extra Rage, Extra Reservoir, …
    // see feat-effects.ts FEAT_POOL_EFFECTS) — additive, keyed by the
    // class-feature's tag so unrelated same-named pools aren't affected.
    const featBonus = feature.tag ? (poolMaxBonusByFeatureTag.get(feature.tag) ?? 0) : 0;

    pools.push({
      id: feature.id,
      name: feature.name,
      max: Math.trunc(max) + featBonus,
      per: feature.uses?.per,
      classTag,
      detail,
    });
  }

  return pools;
}

/**
 * Sum, per class-feature tag, how much `doc.build.feats` raises that
 * feature's derived pool max (see `FEAT_POOL_EFFECTS`). A feat taken multiple
 * times (e.g. two copies of Extra Reservoir in `doc.build.feats` — see
 * `model/feats.ts`'s "manually-added duplicates" budget note) contributes its
 * `maxDelta` once per occurrence, matching the feats' own "stacks" wording.
 */
function collectFeatPoolBonuses(doc: CharacterDoc, refData: RefData): Map<string, number> {
  const bonuses = new Map<string, number>();
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    const effect = FEAT_POOL_EFFECTS[featNameSlug(feat.name)];
    if (!effect) continue;
    bonuses.set(effect.featureTag, (bonuses.get(effect.featureTag) ?? 0) + effect.maxDelta);
  }
  return bonuses;
}
