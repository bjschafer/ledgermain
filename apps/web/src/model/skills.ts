/**
 * Skill-point budget (pure). PF1: each class level grants
 * `max(1, class.skillsPerLevel + Int mod)` ranks; humans add a racial bonus
 * (encoded as a `bonusSkillRanks` change); an active archetype feature that
 * authors its own `bonusSkillRanks` change (e.g. paladin's Faithful Wanderer/
 * Tortured Crusader, which double 2+Int to 4+Int — issue #62) adds its
 * evaluated delta too; favored-class "skill" picks add one each. A character
 * may put at most `total character level` ranks in one skill (enforced in
 * doc.setSkillRank). This is the running total the builder shows.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";
import { buildRollData, resolveArchetypeFeatureEffect, tryEvaluateFormula } from "@pf1/engine";
import type { RollData } from "@pf1/engine";

import { suppressedRaceTargets } from "./racialTraits.js";

export interface SkillBudget {
  total: number;
  spent: number;
  remaining: number;
}

/**
 * @param intMod final Intelligence modifier (from the derived sheet, so racial
 *   and item bonuses are included).
 */
export function skillBudget(doc: CharacterDoc, refData: RefData, intMod: number): SkillBudget {
  let total = 0;

  for (const c of doc.identity.classes) {
    const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
    const perLevel = def ? def.skillsPerLevel : 2;
    total += Math.max(1, perLevel + intMod) * c.level;
  }

  const rollData = buildRollData(doc, refData);

  // Racial bonus skill ranks (e.g. Human's +1/level via `@attributes.hd.total`).
  // An alternate racial trait that swaps out the granting standard trait (e.g.
  // Human's Skilled, replaced by Eye for Talent) suppresses its bonusSkillRanks
  // change — mirror the engine's `collect.ts` suppression here (issue #35).
  const race = refData.races[doc.identity.race];
  if (race) {
    const suppressed = suppressedRaceTargets(doc, refData);
    for (const ch of race.changes) {
      if (ch.target !== "bonusSkillRanks" || suppressed.has(ch.target)) continue;
      const v = tryEvaluateFormula(ch.formula, rollData);
      if (v != null && !Number.isNaN(v)) total += v;
    }
  }

  // Archetype-authored bonus skill ranks (issue #62), mirroring
  // `model/feats.ts`'s `classBonusFeatSlots` archetype loop for `bonusFeats`:
  // only an active archetype (`doc.build.archetypes`) whose feature has
  // reached its granting class's current level contributes, resolved through
  // `resolveArchetypeFeatureEffect` (hand-verified table first, falling back
  // to the machine-extracted one) so this stays in sync with whichever table
  // actually governs a given feature id.
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    const archRollData: RollData = { ...rollData, class: { level: clsLevel, unlevel: clsLevel } };
    for (const f of Object.values(refData.archetypeFeatures)) {
      if (f.archetypeId !== archetypeId || f.level > clsLevel) continue;
      const entry = resolveArchetypeFeatureEffect(f.id)?.effect;
      if (!entry) continue;
      for (const ch of entry.changes) {
        if (ch.target !== "bonusSkillRanks") continue;
        const v = tryEvaluateFormula(ch.formula, archRollData);
        if (v != null && !Number.isNaN(v)) total += v;
      }
    }
  }

  // Favored-class "skill" bonuses. "both" (house-rule) also contributes +1 skill.
  for (const choice of doc.build.favoredClassBonus ?? []) {
    if (choice === "skill" || choice === "both") total += 1;
  }

  // GM/homebrew addend (see build.gmGrants). Omitted/absent = 0.
  total += doc.build.gmGrants?.skillRanks ?? 0;

  const spent = Object.values(doc.build.skillRanks).reduce((s, n) => s + n, 0);
  return { total, spent, remaining: total - spent };
}
