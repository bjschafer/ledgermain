/**
 * Master-side features that modify the tracked animal companion / mount
 * (`build.animalCompanion`) — the routing layer between the MASTER's build
 * (feats, archetype features) and the companion's own derived stat block in
 * `companion.ts`. Clean-room from the published PF1 rules; every entry's
 * numbers are verified against the vendored description text before wiring
 * (classification notes have misquoted more than once).
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

import type { ActiveBuff, Change, CharacterDoc, RefData } from "@pf1/schema";

import { characterFeatSlugs } from "./feat-effects.js";
import { totalLevel } from "./rolldata.js";

/** One effective-druid-level contribution — see module doc comment. */
export type CompanionLevelEffect =
  | {
      grants: boolean;
      mode: "classLevel";
      /** Which class's level feeds the formula (e.g. "ranger"). */
      classTag: string;
      /** Added to the class level (0 for a 1:1 grant, −4 for "level − 4"). */
      offset: number;
    }
  | { grants: boolean; mode: "characterLevel"; offset: number }
  | { grants: boolean; mode: "flat"; amount: number };

/** One master-side feature's effects on the tracked companion. */
export interface CompanionMasterEffect {
  /** Provenance label shown in the companion sheet's components ("Brute Steed"). */
  source: string;
  /**
   * Change-shaped stat effects, routed through `routeSharedBuffs` — targets
   * limited to what that router buckets (ability ids, ac/aac/sac/nac,
   * fort/ref/will/allSavingThrows, skill.* / skills, attack, damage,
   * *Speed, init). Formulas evaluate against the MASTER's roll data.
   */
  changes?: readonly Change[];
  /** Effective-druid-level contribution (Boon Companion shape, generalized). */
  level?: CompanionLevelEffect;
  /** Flat additions to the companion's bonus-trick / bonus-feat counts. */
  bonusTricks?: number;
  bonusFeats?: number;
  /** Display-only line appended to the companion's specialNotes. */
  note?: string;
}

/** An archetype-feature entry: gated on the archetype being chosen AND its class's level. */
export interface ArchetypeCompanionEffect extends CompanionMasterEffect {
  /** The owning archetype id (`refData.archetypes` key, e.g. "cavalier:fell-rider"). */
  archetypeId: string;
  /** Minimum level in the archetype's class before the feature applies. */
  minLevel: number;
}

/**
 * Master FEATS that modify the companion, keyed by `featNameSlug` — the same
 * dedup rule as `FEAT_POOL_EFFECTS`' repeatables EXCEPT reversed: each entry
 * applies at most once no matter how many copies are owned (Boon Companion's
 * own "The effects do not stack"; the multi-companion case it contemplates
 * is out of scope — one tracked companion).
 */
export const COMPANION_EFFECT_FEATS: Readonly<Record<string, CompanionMasterEffect>> = {
  // "The abilities of your animal companion or familiar are calculated as
  // though your class were 4 levels higher, to a maximum effective druid
  // level equal to your character level." Applied to the COMPANION here;
  // the familiar half stays out of scope (familiar.ts derives off master
  // level directly). Replaces the former hard-coded hasBoonCompanionFeat
  // special case in apps/web/src/model/companion.ts.
  "boon-companion": {
    source: "Boon Companion",
    level: { grants: false, mode: "flat", amount: 4 },
  },
  // "You gain an animal companion as if you were a druid of your character
  // level −3 ... the effective druid level granted by this feat stacks with
  // that granted by other sources." The from-a-list species restriction is
  // a soft hint only, matching the mount picker's posture.
  "animal-ally": {
    source: "Animal Ally",
    level: { grants: true, mode: "characterLevel", offset: -3 },
  },
};

/**
 * Master ARCHETYPE FEATURES that modify the companion, keyed by the
 * classification key (`<classTag>:<archetype-slug>:<feature-slug>:<level>`)
 * so `scripts/mech-coverage.ts` can match entries to vendored ids.
 */
export const COMPANION_EFFECT_ARCHETYPE_FEATURES: Readonly<
  Record<string, ArchetypeCompanionEffect>
> = {
  // "It gains a +2 bonus to Strength, but takes a -2 penalty to Dexterity."
  "cavalier:fell-rider:brute-steed:1": {
    archetypeId: "cavalier:fell-rider",
    minLevel: 1,
    source: "Brute Steed",
    changes: [
      { target: "str", type: "untyped", formula: "2" },
      { target: "dex", type: "untyped", formula: "-2" },
    ],
  },
  // "The ranger's effective druid level for his animal companions is now
  // equal to his ranger level" — +3 undoes hunters-bond's −3 offset exactly,
  // so it needs (and only applies on top of) the hunters-bond source.
  "ranger:beast-master:strong-bond:12": {
    archetypeId: "ranger:beast-master",
    minLevel: 12,
    source: "Strong Bond",
    level: { grants: false, mode: "flat", amount: 3 },
  },
};

/** Everything `collectCompanionMasterEffects` resolved — consumed by `deriveCompanion`. */
export interface ResolvedCompanionMasterEffects {
  /** Summed `grants: true` level contributions (create a companion by themselves). */
  grantLevels: number;
  /** Summed `grants: false` level contributions (Boon Companion shape). */
  bonusLevels: number;
  /** One synthetic buff per entry with `changes`, for `routeSharedBuffs`. */
  buffs: ActiveBuff[];
  bonusTricks: number;
  bonusFeats: number;
  notes: string[];
}

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

  // Feats: each entry applies at most once (see COMPANION_EFFECT_FEATS).
  const ownedSlugs = new Set(characterFeatSlugs(doc, refData));
  for (const [slug, effect] of Object.entries(COMPANION_EFFECT_FEATS)) {
    if (ownedSlugs.has(slug)) apply(`feat:${slug}`, effect);
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
