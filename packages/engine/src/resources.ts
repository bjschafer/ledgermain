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

import type { CharacterDoc, ClassFeature, FeatureAction, RefData } from "@pf1/schema";

import { collectGrantedFeatures } from "./archetypes.js";
import { FEAT_POOL_EFFECTS, featNameSlug } from "./feat-effects.js";
import { formatDiceFormula, tryEvaluateFormula, type RollData } from "./formula.js";
import { buildRollData, type AbilityView } from "./rolldata.js";
import { smiteEvilDetail, smiteEvilLabel } from "./tables.js";

export interface DerivedResourcePool {
  /** Stable pool id (the class-feature id). */
  id: string;
  /** Display label, e.g. "Rage". */
  name: string;
  /** Maximum uses, from `uses.maxFormula`. */
  max: number;
  /**
   * What a night's rest sets this pool's remaining uses to (issue #43).
   * Defaults to `max` — byte-identical to pre-#43 behavior, since RAW for
   * almost every pool here (Rage, Ki, Bardic Performance, Channel Energy,
   * Lay on Hands, …) a rest simply tops the pool back up to its cap.
   *
   * Arcane Reservoir is the one modeled exception: Advanced Class Guide p.
   * 12 reads "the arcanist's arcane reservoir can hold a maximum amount of
   * magical energy equal to 3 + the arcanist's level. Each day, when
   * preparing spells, the arcanist's arcane reservoir fills with raw
   * magical energy, gaining a number of points equal to 3 + 1/2 her
   * arcanist level. Any points she had from the previous day are lost."
   * — the refill is strictly lower than the cap, and a rest *sets* the pool
   * to the refill value rather than topping it up to max (leftover points
   * are explicitly lost, not carried forward). See `arcaneReservoirRestValue`.
   */
  restValue: number;
  /** Recharge period, e.g. "day". */
  per?: string;
  /** Class the feature was granted by (for display). */
  classTag: string;
  /**
   * One-line mechanical summary — derived from the feature's vendored
   * `actions[]` where present (e.g. Acid Dart's "ranged touch · 1d6+2 acid",
   * Channel Energy's "4d6 (DC 15 Will)"), via `actionBasedDetail`. A handful
   * of features have real mechanics that carry no vendored action data at
   * all (Smite Evil's attack/damage/AC scaling) and keep a hand-authored
   * fallback instead — see the `deriveResourcePools` body. Undefined when
   * neither applies (Rage has nothing beyond its `uses.maxFormula`). Also
   * carries an addendum for any OTHER granted feature that shares this pool
   * via `uses.source` (e.g. a paladin's Channel Positive Energy, which
   * spends Lay on Hands uses rather than having its own cap — see the
   * "linked features" pass). The tracker renders this as the sub-line of the
   * resource row.
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
  const poolIdByTag = new Map<string, string>();
  // Features with no independent daily cap of their own (`uses.source` instead
  // of `uses.maxFormula`, e.g. Channel Positive Energy drawing on Lay on
  // Hands) but with vendored `actions` worth surfacing — merged into the
  // referenced pool's `detail` in a second pass below, once every pool's tag
  // is known.
  const linkedFeatures: { feature: ClassFeature; featureRollData: RollData }[] = [];

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
      const truncatedMax = Math.trunc(poolMax);
      pools.push({
        id: grant.featureId,
        name: grant.name,
        max: truncatedMax,
        restValue: truncatedMax,
        per: resourcePool.per,
        classTag,
        detail: resourcePool.detail,
      });
      continue;
    }

    const feature = refData.classFeatures[grant.featureId];
    if (!feature) continue;
    const formula = feature.uses?.maxFormula;
    if (!formula) {
      // No maxFormula — either nothing (most features) or a `uses.source`
      // pointer to another feature's pool. Either way it can't become its
      // own pool row (see `ClassFeature.uses` doc comment); stash it for the
      // linked-feature merge pass if it has actions worth showing.
      if (feature.uses?.source && feature.actions?.length) {
        linkedFeatures.push({ feature, featureRollData: featureRollData as RollData });
      }
      continue;
    }
    let max: number | null;
    try {
      max = tryEvaluateFormula(formula, featureRollData);
    } catch {
      continue;
    }
    if (max === null || Number.isNaN(max) || max <= 0) continue;
    if (pools.some((p) => p.id === feature.id)) continue;

    // Smite Evil's attack/damage/AC scaling has no vendored action data at
    // all (only a bare "Use" activation) — kept hand-authored. Everything
    // else prefers the generic vendored-action-derived detail (Channel
    // Energy's dice/DC, Lay on Hands' healing dice, Acid Dart's ranged-touch
    // acid damage, ...), which also lifts the old cleric-only gate that left
    // a paladin's own Channel Positive Energy without any dice line.
    let detail: string | undefined;
    if (feature.tag === "smiteEvil" && classTag === "paladin") {
      const featureAbilities = (featureRollData as RollData).abilities as
        | { cha?: { mod?: number } }
        | undefined;
      const chaMod = featureAbilities?.cha?.mod ?? 0;
      detail = smiteEvilLabel(smiteEvilDetail(classLevel, chaMod));
    } else {
      detail = actionBasedDetail(feature, featureRollData as RollData);
    }

    // Feats that raise this pool's maximum (Extra Rage, Extra Reservoir, …
    // see feat-effects.ts FEAT_POOL_EFFECTS) — additive, keyed by the
    // class-feature's tag so unrelated same-named pools aren't affected.
    const featBonus = feature.tag ? (poolMaxBonusByFeatureTag.get(feature.tag) ?? 0) : 0;
    const poolMax = Math.trunc(max) + featBonus;

    const restValue =
      feature.tag === "arcaneReservoir" && classTag === "arcanist"
        ? arcaneReservoirRestValue(classLevel, featBonus, poolMax)
        : poolMax;

    if (feature.tag) poolIdByTag.set(feature.tag, feature.id);

    pools.push({
      id: feature.id,
      name: feature.name,
      max: poolMax,
      restValue,
      per: feature.uses?.per,
      classTag,
      detail,
    });
  }

  for (const { feature, featureRollData } of linkedFeatures) {
    const poolId = poolIdByTag.get(feature.uses!.source!);
    if (!poolId) continue;
    const pool = pools.find((p) => p.id === poolId);
    if (!pool) continue;
    const linkedDetail = actionBasedDetail(feature, featureRollData);
    if (!linkedDetail) continue;
    pool.detail = pool.detail
      ? `${pool.detail} · ${feature.name}: ${linkedDetail}`
      : `${feature.name}: ${linkedDetail}`;
  }

  return pools;
}

/* ------------------------------------------------- action-derived detail -- */

const SAVE_TYPE_LABELS: Record<string, string> = { fort: "Fort", ref: "Ref", will: "Will" };

function saveTypeLabel(type: string): string {
  if (!type) return "";
  return SAVE_TYPE_LABELS[type] ?? type[0]!.toUpperCase() + type.slice(1);
}

/** Foundry action-type codes that describe an attack roll, mapped to their display prefix. */
const ATTACK_RANGE_PREFIX: Record<string, string> = {
  rsak: "ranged",
  rwak: "ranged",
  msak: "melee",
  mwak: "melee",
};

/**
 * Format a {@link FeatureAction}'s damage into a display fragment — "ranged
 * touch · 1d6+2 acid" (rsak + touch + typed damage), "melee touch · 1d6"
 * (untyped damage types are dropped — "untyped" reads as noise, not
 * information), "heal 3d6" (actionType "heal" — no melee/ranged framing),
 * or a bare dice/number for anything else (e.g. Channel Energy's
 * save-triggered burst, which has no attack roll at all). `null` when the
 * formula can't be evaluated even numerically (fully symbolic formula the
 * evaluator can't isolate dice from).
 */
function formatDamageLabel(action: FeatureAction, data: RollData): string | null {
  const damage = action.damage;
  if (!damage) return null;

  let dice = formatDiceFormula(damage.formula, data);
  if (dice === null) {
    let plain: number | null;
    try {
      plain = tryEvaluateFormula(damage.formula, data);
    } catch {
      plain = null;
    }
    if (plain === null || Number.isNaN(plain)) return null;
    dice = String(Math.trunc(plain));
  }

  if (action.actionType === "heal") return `heal ${dice}`;

  const prefix = action.actionType ? ATTACK_RANGE_PREFIX[action.actionType] : undefined;
  if (!prefix) return dice;

  const touchSuffix = action.touch ? " touch" : "";
  const types = damage.types.filter((t) => t !== "untyped");
  const typeSuffix = types.length > 0 ? ` ${types.join("/")}` : "";
  return `${prefix}${touchSuffix} · ${dice}${typeSuffix}`;
}

/** Format a {@link FeatureAction}'s save into "DC 16 Fort", or `null` if its DC formula won't evaluate. */
function formatSaveLabel(save: NonNullable<FeatureAction["save"]>, data: RollData): string | null {
  if (!save.dcFormula) return null;
  let dc: number | null;
  try {
    dc = tryEvaluateFormula(save.dcFormula, data);
  } catch {
    return null;
  }
  if (dc === null || Number.isNaN(dc)) return null;
  const label = saveTypeLabel(save.type);
  return `DC ${Math.round(dc)}${label ? ` ${label}` : ""}`;
}

/**
 * Pick the one action to summarize when a feature carries several (e.g.
 * Channel Energy's heal-living/harm-undead/heal-undead/harm-living quartet —
 * all four share the same dice and DC formulas, so which one wins doesn't
 * change the output). Prefers an action with both damage and a save (most
 * informative), then any action with damage, then any with a save, else the
 * first action (which will have neither and produce no detail).
 */
function pickPrimaryAction(actions: FeatureAction[]): FeatureAction | undefined {
  return (
    actions.find((a) => a.damage && a.save) ??
    actions.find((a) => a.damage) ??
    actions.find((a) => a.save) ??
    actions[0]
  );
}

/**
 * Derive a resource-pool `detail` summary from a class feature's vendored
 * `actions[]` — clean-room formatting over the Foundry actionType/damage/save
 * shape (data, not code; see CLAUDE.md licensing). `undefined` when the
 * feature has no actions, or its primary action has neither damage nor a
 * save worth showing (e.g. Smite Evil's bare "Use" activation).
 */
function actionBasedDetail(feature: ClassFeature, data: RollData): string | undefined {
  const actions = feature.actions;
  if (!actions || actions.length === 0) return undefined;
  const action = pickPrimaryAction(actions);
  if (!action) return undefined;

  const damageLabel = formatDamageLabel(action, data);
  const saveLabel = action.save ? formatSaveLabel(action.save, data) : null;

  if (damageLabel && saveLabel) return `${damageLabel} (${saveLabel})`;
  return damageLabel ?? saveLabel ?? undefined;
}

/**
 * Arcane Reservoir's daily refill (issue #43), clean-room from Advanced Class
 * Guide p. 12: "the arcanist's arcane reservoir can hold a maximum amount of
 * magical energy equal to 3 + the arcanist's level. Each day, when preparing
 * spells, the arcanist's arcane reservoir fills with raw magical energy,
 * gaining a number of points equal to 3 + 1/2 her arcanist level. Any points
 * she had from the previous day are lost."
 *
 * Base refill = 3 + floor(level / 2), strictly below the 3 + level cap.
 *
 * Extra Reservoir (feats.json: "You gain three more points in your arcane
 * reservoir, and the maximum number of points in your arcane reservoir
 * increases by that amount") reads as adding its +3 to BOTH the current/daily
 * points AND the max — i.e. `featBonus` (already folded into `poolMax` by the
 * caller) applies to the refill too, not just the cap. Clamped to `poolMax`
 * as a defensive floor (mathematically refill <= cap always holds: 3 +
 * floor(level/2) + featBonus <= 3 + level + featBonus for level >= 0).
 */
function arcaneReservoirRestValue(classLevel: number, featBonus: number, poolMax: number): number {
  const refill = 3 + Math.floor(classLevel / 2) + featBonus;
  return Math.min(refill, poolMax);
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
