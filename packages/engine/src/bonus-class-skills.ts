/**
 * Player-chosen bonus class skills — "gains a new class skill of her choice".
 *
 * A family of PF1 features hands the player a class-skill pick rather than a
 * fixed skill: Student of War's Additional Skill (1st level and every 2 levels
 * thereafter), and others shaped the same way. What makes them different from
 * the class-skill lists already unioned in `compute.ts` is that the SKILL is a
 * build choice and the COUNT is level-driven, so a rebuild (or a level-down)
 * has to re-validate what was picked.
 *
 * ## How a pick gets applied
 *
 * {@link collectBonusClassSkillGrants} walks the character's granted class
 * features and feats, looks each up in {@link BONUS_CLASS_SKILL_GRANTS} by
 * name slug, and returns how many picks each one currently entitles the
 * character to. {@link chosenBonusClassSkills} then reads the picks stored in
 * `doc.build.bonusClassSkills` — keyed by that same slug — and returns the set
 * `compute.ts` folds into `classSkillSet`. The +3 trained bonus falls out of
 * the existing skill logic from there.
 *
 * ## Why the entitlement is enforced here, not just in the builder
 *
 * Picks are stored per granting feature and capped at the entitlement at read
 * time. A character who drops from Student of War 9 to 3 keeps her stored
 * picks in the doc (nothing is destroyed on the way down, so levelling back up
 * restores them) but only the first two count. Trusting the doc blindly would
 * let a level-down silently keep granting five class skills.
 *
 * ## Keying by name slug
 *
 * Same rationale as `ability-substitution.ts` and `feat-effects.ts`: RefData
 * ids are opaque Foundry UUIDs that can change between data versions, so the
 * stable, human-authorable key is the slugged canonical name.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

import { activeArchetypeSwaps } from "./archetypes.js";
import { featNameSlug } from "./feat-effects.js";
import { tryEvaluateFormula } from "./formula.js";

/** A registry entry: one feature that grants player-chosen class skills. */
export interface BonusClassSkillGrantDef {
  /**
   * Foundry-dialect formula for how many skills the feature has granted so
   * far, evaluated with `@class.level` set to the GRANTING class's level (or
   * total character level, for a feat). Level-driven progressions are the
   * whole point of this registry, so a constant like `"1"` is legal but rare.
   */
  picks: string;
}

/**
 * Grants keyed by feature/feat name slug (see {@link featNameSlug}).
 * Clean-room from the published rules.
 */
export const BONUS_CLASS_SKILL_GRANTS: Readonly<Record<string, BonusClassSkillGrantDef>> = {
  // Student of War: "At 1st level and every 2 levels thereafter (3rd, 5th,
  // 7th, and 9th), a student of war gains a new class skill of her choice."
  // 5 picks at the class's 9th level and beyond.
  "additional-skill": { picks: "floor((@class.level + 1) / 2)" },
};

/** A grant matched to a character, with its current entitlement resolved. */
export interface ActiveBonusClassSkillGrant {
  /** Name slug — also the `build.bonusClassSkills` key the picks live under. */
  key: string;
  /** Display name of the granting feature/feat, for the builder's picker. */
  source: string;
  /** How many skills the character may currently choose. */
  slots: number;
}

/**
 * Every bonus-class-skill grant the character currently has, from granted
 * class features and feats.
 *
 * Class-feature grants respect archetype swaps for the same reason
 * `collect.ts` does — a feature an archetype traded away must not keep
 * granting picks — and are gated on the character having reached the granting
 * level. Two features sharing a slug is impossible by construction (see the
 * module doc), so keys are unique in the result.
 */
export function collectBonusClassSkillGrants(
  doc: CharacterDoc,
  refData: RefData,
  registry: Readonly<Record<string, BonusClassSkillGrantDef>> = BONUS_CLASS_SKILL_GRANTS,
): ActiveBonusClassSkillGrant[] {
  const found: ActiveBonusClassSkillGrant[] = [];

  const consider = (name: string, level: number) => {
    const def = registry[featNameSlug(name)];
    if (!def) return;
    const slots = tryEvaluateFormula(def.picks, { class: { level, unlevel: level } }) ?? 0;
    if (!Number.isFinite(slots) || slots < 1) return;
    found.push({ key: featNameSlug(name), source: name, slots: Math.floor(slots) });
  };

  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      if (archetypeSwaps.has(grant.uuid)) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (feature) consider(feature.name, cls.level);
    }
  }

  const charLevel = doc.identity.classes.reduce((s, c) => s + c.level, 0);
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (feat) consider(feat.name, charLevel);
  }

  return found;
}

/**
 * The skill ids the character's stored picks currently make class skills —
 * each grant's picks truncated to its entitlement, empty slots dropped.
 *
 * Ids are whatever the builder stored; `compute.ts` resolves parameterized
 * instances ("crf.alchemy") against their base id the same way it does for
 * vendored class-skill lists, so storing either form works.
 */
export function chosenBonusClassSkills(
  doc: CharacterDoc,
  refData: RefData,
  registry: Readonly<Record<string, BonusClassSkillGrantDef>> = BONUS_CLASS_SKILL_GRANTS,
): Set<string> {
  const chosen = new Set<string>();
  const picks = doc.build.bonusClassSkills;
  if (!picks) return chosen;
  for (const grant of collectBonusClassSkillGrants(doc, refData, registry)) {
    for (const id of (picks[grant.key] ?? []).slice(0, grant.slots)) {
      if (id) chosen.add(id);
    }
  }
  return chosen;
}
