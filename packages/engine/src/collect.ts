/**
 * Collects typed modifiers from all sources — passive (race, equipped items,
 * granted class features) AND live session state (active buffs, conditions) —
 * evaluating each change's formula to a number against the roll-data context.
 * Dice-bearing change formulas (none target static stats in the slice) are
 * skipped. Buffs and conditions flow through the same evaluator + stacker as
 * passive changes (Stage 4).
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

import { CONDITIONS } from "./conditions.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";
import type { TypedModifier } from "./stacking.js";

/** A {@link TypedModifier} tagged with what it targets. */
export interface CollectedModifier extends TypedModifier {
  target: string;
}

function evalChange(
  formula: string,
  rollData: RollData,
  target: string,
  type: string,
  source: string,
  sourceId: string,
  out: CollectedModifier[],
): void {
  let value: number | null;
  try {
    value = tryEvaluateFormula(formula, rollData);
  } catch {
    // A malformed change formula should not crash the whole sheet; skip it.
    return;
  }
  if (value === null || Number.isNaN(value)) return;
  out.push({ target, type: type || "untyped", value, source, sourceId });
}

export function collectModifiers(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
): CollectedModifier[] {
  const out: CollectedModifier[] = [];

  // --- race ---------------------------------------------------------------
  const race = refData.races[doc.identity.race];
  if (race) {
    for (const ch of race.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, race.name, race.id, out);
    }
  }

  // --- equipped items -----------------------------------------------------
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.itemId) continue;
    const item = refData.items[inst.itemId];
    if (!item) continue;
    for (const ch of item.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, item.name, item.id, out);
    }
  }

  // --- granted class features ---------------------------------------------
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    // `@class.unlevel` inside a feature formula refers to *this* class's level.
    const featureRollData: RollData = {
      ...rollData,
      class: { level: cls.level, unlevel: cls.level },
    };
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      for (const ch of feature.changes ?? []) {
        evalChange(
          ch.formula,
          featureRollData,
          ch.target,
          ch.type,
          feature.name,
          feature.id,
          out,
        );
      }
    }
  }

  // --- active buffs (live state) ------------------------------------------
  for (const buff of doc.live.activeBuffs ?? []) {
    // `@item.level` / `@cl` in a buff formula = the buff's caster/effect level.
    const buffRollData: RollData =
      buff.casterLevel === undefined
        ? rollData
        : {
            ...rollData,
            cl: buff.casterLevel,
            item: { level: buff.casterLevel },
          };
    for (const ch of buff.changes) {
      evalChange(ch.formula, buffRollData, ch.target, ch.type, buff.name, buff.instanceId, out);
    }
  }

  // --- conditions (live state) --------------------------------------------
  for (const condId of doc.live.conditions ?? []) {
    const cond = CONDITIONS[condId];
    if (!cond) continue;
    for (const ch of cond.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, cond.name, cond.id, out);
    }
  }

  return out;
}

/** Filter collected modifiers down to a single target. */
export function forTarget(mods: CollectedModifier[], target: string): TypedModifier[] {
  return mods.filter((m) => m.target === target);
}
