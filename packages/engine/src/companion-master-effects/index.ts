/**
 * Master-side features that modify the tracked animal companion / mount
 * (`build.animalCompanion`) — the routing layer between the MASTER's build
 * (feats, class features, archetype features) and the companion's own
 * derived stat block in `companion.ts`. Clean-room from the published PF1
 * rules; every entry's numbers are verified against the vendored
 * description text before wiring (classification notes have misquoted more
 * than once).
 *
 * Two effect surfaces, resolved here and consumed by `deriveCompanion`:
 *
 *   1. **Change-shaped numbers** (`changes`) — stat bonuses to the
 *      companion's own sheet (ability scores, AC, saves, attack/damage,
 *      speeds, skills, init). Each entry becomes one synthetic `ActiveBuff`
 *      and rides the exact same `routeSharedBuffs` pipeline that shared
 *      buffs and the companion's own conditions already use, so typed
 *      stacking and provenance come for free. Formulas are evaluated against
 *      the MASTER's roll data (`@classes.<tag>.level` etc. all resolve).
 *   2. **Structured fields** the buff route can't express: effective-druid-
 *      level contributions (`level` — the Boon Companion shape, generalized)
 *      and flat bonus-trick / bonus-feat count increases.
 *
 * Effective-level semantics (`CompanionLevelEffect`): a `grants: true` entry
 * CREATES a companion by itself (Animal Ally, an archetype's own companion
 * grant) and contributes even when no `build.animalCompanion.source` tag is
 * chosen; a `grants: false` entry (Boon Companion, beast-master Strong Bond)
 * only ever boosts a companion that already exists — mirroring
 * `companionEffectiveLevel`'s long-standing "Boon Companion never creates a
 * companion from nothing" rule. Every contribution is floored at 0 (a
 * "level −4" grant is silent below 5th, matching each grant's own gate), and
 * the summed total stays capped at total character level in
 * `companionEffectiveLevel` — the CRB cap Boon Companion states explicitly.
 *
 * What deliberately does NOT live here: multi-companion splits (pack lords,
 * hunting packs — one tracked stat block by design), species-list expansions
 * (exotic mounts outside `BASE_COMPANIONS`), master-facing mounted-combat
 * numbers (the master's own sheet), and phantom/eidolon/familiar internals
 * (their own modules).
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

import { characterFeatSlugs } from "../feat-effects.js";
import { totalLevel } from "../rolldata.js";
import { CAVALIER_HUNTER_COMPANION_EFFECTS } from "./cavalier-hunter.js";
import { COMPANION_EFFECT_CLASS_FEATURES } from "./class-features.js";
import { DRUID_RANGER_PALADIN_COMPANION_EFFECTS } from "./druid-ranger-paladin.js";
import { COMPANION_EFFECT_FEATS } from "./feats.js";
import { OTHER_CLASS_COMPANION_EFFECTS } from "./other-classes.js";
import type {
  ArchetypeCompanionEffect,
  CompanionLevelEffect,
  CompanionMasterEffect,
  ResolvedCompanionMasterEffects,
} from "./types.js";

export { COMPANION_EFFECT_CLASS_FEATURES } from "./class-features.js";
export { COMPANION_EFFECT_FEATS } from "./feats.js";
export type {
  ArchetypeCompanionEffect,
  ClassFeatureCompanionEffect,
  CompanionLevelEffect,
  CompanionMasterEffect,
  ResolvedCompanionMasterEffects,
} from "./types.js";

/** All archetype-feature entries, merged across the per-wave shard files. */
export const COMPANION_EFFECT_ARCHETYPE_FEATURES: Readonly<
  Record<string, ArchetypeCompanionEffect>
> = {
  ...CAVALIER_HUNTER_COMPANION_EFFECTS,
  ...DRUID_RANGER_PALADIN_COMPANION_EFFECTS,
  ...OTHER_CLASS_COMPANION_EFFECTS,
};

function levelContribution(doc: CharacterDoc, effect: CompanionLevelEffect): number {
  switch (effect.mode) {
    case "classLevel": {
      const classLevel = doc.identity.classes.find((c) => c.tag === effect.classTag)?.level ?? 0;
      return classLevel > 0 ? Math.max(0, classLevel + effect.offset) : 0;
    }
    case "characterLevel":
      return Math.max(0, totalLevel(doc) + effect.offset);
    case "flat":
      return Math.max(0, effect.amount);
  }
}

/**
 * Resolve every active master-side companion effect for this document.
 * Lives OUTSIDE `companion.ts` (which stays pure and `RefData`-free); the
 * web's `deriveCompanionSheet` calls this and hands the result to
 * `deriveCompanion`, the same caller-resolves posture `hasBoonCompanion`
 * established.
 */
export function collectCompanionMasterEffects(
  doc: CharacterDoc,
  refData: RefData,
): ResolvedCompanionMasterEffects {
  const resolved: ResolvedCompanionMasterEffects = {
    grantLevels: 0,
    bonusLevels: 0,
    buffs: [],
    bonusTricks: 0,
    bonusFeats: 0,
    notes: [],
  };

  const apply = (key: string, effect: CompanionMasterEffect) => {
    if (effect.when && !effect.when(doc)) return;
    if (effect.level) {
      const value = levelContribution(doc, effect.level);
      if (effect.level.grants) resolved.grantLevels += value;
      else resolved.bonusLevels += value;
    }
    if (effect.changes && effect.changes.length > 0) {
      resolved.buffs.push({
        instanceId: `master:${key}`,
        name: effect.source,
        changes: [...effect.changes],
      });
    }
    resolved.bonusTricks += effect.bonusTricks ?? 0;
    resolved.bonusFeats += effect.bonusFeats ?? 0;
    if (effect.note) resolved.notes.push(effect.note);
  };

  // Feats: each entry applies at most once (see feats.ts).
  const ownedSlugs = new Set(characterFeatSlugs(doc, refData));
  for (const [slug, effect] of Object.entries(COMPANION_EFFECT_FEATS)) {
    if (ownedSlugs.has(slug)) apply(`feat:${slug}`, effect);
  }

  // Base-class features: levels in the owning class at or past minLevel
  // (plus the entry's own `when` for choice-gated features).
  for (const [id, effect] of Object.entries(COMPANION_EFFECT_CLASS_FEATURES)) {
    const classLevel = doc.identity.classes.find((c) => c.tag === effect.classTag)?.level ?? 0;
    if (classLevel >= effect.minLevel) apply(`classFeature:${id}`, effect);
  }

  // Archetype features: archetype chosen + its class at or past minLevel.
  const chosenArchetypes = new Set(doc.build.archetypes ?? []);
  for (const [key, effect] of Object.entries(COMPANION_EFFECT_ARCHETYPE_FEATURES)) {
    if (!chosenArchetypes.has(effect.archetypeId)) continue;
    const classTag =
      refData.archetypes[effect.archetypeId]?.classTag ?? effect.archetypeId.split(":")[0];
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    if (classLevel >= effect.minLevel) apply(key, effect);
  }

  return resolved;
}
