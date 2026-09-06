/**
 * Archetype feature effects: the modeled changes an archetype's own features
 * contribute on top of the base class's.
 */
import { resolveArchetypeFeatureEffect } from "../archetype-effects-resolve.js";
import { type RollData } from "../formula.js";
import { archetypeFeaturesOf } from "../refdata-index.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Archetype feature effects. */
export function collectArchetypeFeatureEffects(ctx: CollectContext): void {
  const { doc, refData, rollData, out } = ctx;
  // Hand-authored numeric effects for the small slice of archetype features
  // that grant an unconditional bonus (see `archetype-effects.ts`'s doc
  // comment for the audit/scope rationale), extended by the machine-extracted
  // table (`archetype-effects-extracted.ts`, the fighter pilot) —
  // `resolveArchetypeFeatureEffect` checks the hand-verified table first, so
  // an id present in both is never double-applied. Gated the same way base
  // class features are: the granting class's level must reach the feature's
  // level.
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    const archFeatureRollData: RollData = {
      ...rollData,
      class: { level: clsLevel, unlevel: clsLevel },
    };
    for (const f of archetypeFeaturesOf(refData, archetypeId)) {
      if (f.level > clsLevel) continue;
      const resolved = resolveArchetypeFeatureEffect(f.id);
      if (!resolved) continue;
      for (const ch of resolved.effect.changes) {
        evalChange(
          ch.formula,
          archFeatureRollData,
          ch.target,
          ch.type,
          f.name,
          f.uuid,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one archetype features (Invulnerable Rager's Extreme
      // Endurance fire-or-cold pick): apply the stored selection's changes.
      // No stored pick, or a stale option id, emits nothing — same posture
      // as every other pick-choice namespace.
      if (resolved.effect.choiceChanges) {
        const picked = doc.build.pickChoices?.[`archetypeFeature:${f.id}`];
        for (const ch of (picked && resolved.effect.choiceChanges[picked]) || []) {
          evalChange(
            ch.formula,
            archFeatureRollData,
            ch.target,
            ch.type,
            f.name,
            f.uuid,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
      }
    }
  }
}
