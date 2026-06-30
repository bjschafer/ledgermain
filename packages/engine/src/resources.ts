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

import { tryEvaluateFormula } from "./formula.js";
import { buildRollData, type AbilityView } from "./rolldata.js";

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

  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    // `@class.unlevel` inside a feature formula refers to THIS class's level.
    const featureRollData = { ...rollData, class: { level: cls.level, unlevel: cls.level } };
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
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
      pools.push({
        id: feature.id,
        name: feature.name,
        max: Math.trunc(max),
        per: feature.uses?.per,
        classTag: cls.tag,
      });
    }
  }

  return pools;
}
