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
  const rollData = buildRollData(
    doc,
    refData,
    abilities as Parameters<typeof buildRollData>[2],
  );
  const pools: DerivedResourcePool[] = [];

  for (const { classTag, grant } of collectGrantedFeatures(doc, refData)) {
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    // `@class.unlevel` inside a feature formula refers to THIS (granting) class's
    // level — for a domain/school grant that's the cleric/wizard level.
    const featureRollData = { ...rollData, class: { level: classLevel, unlevel: classLevel } };
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

    pools.push({
      id: feature.id,
      name: feature.name,
      max: Math.trunc(max),
      per: feature.uses?.per,
      classTag,
      detail,
    });
  }

  return pools;
}
