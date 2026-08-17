/**
 * Shapes for master-side companion/mount effects — see `index.ts`'s module
 * doc comment for the routing story. Split from the tables so per-class
 * shard files and the resolver share one vocabulary without import cycles.
 */

import type { ActiveBuff, Change, CharacterDoc } from "@pf1/schema";

/** One effective-druid-level contribution — see `index.ts`'s doc comment. */
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
  /**
   * Extra applicability gate evaluated AFTER the ownership/level gates —
   * for entries conditioned on a stored build choice (e.g. paladin Divine
   * Bond's mount option, antipaladin Fiendish Boon's servant option).
   */
  when?: (doc: CharacterDoc) => boolean;
}

/** An archetype-feature entry: gated on the archetype being chosen AND its class's level. */
export interface ArchetypeCompanionEffect extends CompanionMasterEffect {
  /** The owning archetype id (`refData.archetypes` key, e.g. "cavalier:fell-rider"). */
  archetypeId: string;
  /** Minimum level in the archetype's class before the feature applies. */
  minLevel: number;
}

/**
 * A base-class-feature entry, keyed by the vendored `classFeatures` pack id
 * (the `PER_DAY_ACTIVATIONS` convention): gated on levels in `classTag`.
 * The id key is what `scripts/mech-coverage.ts` matches; the gate fields are
 * what actually applies it — so a feature that is a CHOICE option in its
 * class (not an automatic grant) must carry a `when` reading the stored
 * pick, never a bare level gate.
 */
export interface ClassFeatureCompanionEffect extends CompanionMasterEffect {
  classTag: string;
  minLevel: number;
}

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
