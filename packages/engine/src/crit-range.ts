/**
 * Threat-range widening — the "gains the benefit of the Improved Critical
 * feat" family, clean-room from the published rules.
 *
 * Doubling a threat range is not a bonus and can't be a `Change`: it rewrites
 * the weapon's own crit line rather than adding to a total, and PF1 says
 * outright that two sources of it never combine ("this feat doesn't stack
 * with any other effect that expands the threat range of a weapon, such as
 * the keen weapon special ability"). So it resolves the same way the Weapon
 * Finesse family does — per weapon, off the doc, read directly by
 * `computeWeaponAttacks`.
 *
 * ## Why the catalog's range is the base
 *
 * `WeaponInstance.critRange` is a player-editable field that ALREADY carries
 * one widening: adding the `keen` ability doubles it at pick-time (see
 * `apps/web/src/model/abilities.ts`), and a player is free to type 15 into it
 * by hand for a source this engine doesn't model. Doubling whatever is stored
 * would therefore stack widenings the rules forbid, and would turn a
 * hand-entered 15 into a 9.
 *
 * The fix is to widen only from a range that is still the catalog's own:
 * `weaponId` gives the vendored `WeaponRef.critRange`, and a stored range that
 * differs from it means something already widened this weapon, so nothing more
 * applies. A hand-entered custom weapon has no `weaponId` at all and is left
 * alone — the same honest fallback `isFinessable` takes for a weapon it can't
 * identify.
 */

import type { CharacterDoc, RefData, WeaponInstance } from "@pf1/schema";

import { featNameSlug } from "./feat-effects.js";

/**
 * Feats whose whole effect is doubling a chosen weapon's threat range. A set
 * rather than an inline check so the coverage tooling can see the route (the
 * same reason `DEX_WEAPON_FEATS` is a table); Improved Critical is the only
 * member the vendored pack has.
 */
export const CRIT_RANGE_FEATS: ReadonlySet<string> = new Set(["improved-critical"]);

/** Which weapons a class-feature grant covers. */
export type CritRangeScope =
  /** Weapon-type slugs matched against `WeaponInstance.group` (e.g. "rapier"). */
  | { kind: "groups"; groups: string[] }
  /**
   * "light or one-handed piercing melee weapon" — a damage-type + handedness
   * family that cuts across the `weaponGroups` taxonomy (a rapier is
   * blades-light, a shortspear is spears), so it reads `WeaponRef`'s
   * `damageTypes`/`weaponSubtype` instead.
   */
  | { kind: "piercingLightOrOneHanded" };

export interface CritRangeGrant {
  /** Granting class tag (e.g. "swashbuckler"). */
  classTag: string;
  /** `build.archetypes` id this entry belongs to. Absent for the class's BASE feature. */
  archetypeId?: string;
  /** Class level the grant arrives at. */
  minLevel: number;
  scope: CritRangeScope;
  /** Feature name, shown on the sheet as the reason the range is wider. */
  label: string;
  /**
   * BASE-entry only: archetype ids that replace this feature with one that
   * grants no Improved Critical benefit at all. An archetype with its own
   * entry below doesn't need listing — a matching archetype entry already
   * wins over the base one.
   */
  suppressedBy?: string[];
}

/**
 * Every always-on grant of the Improved Critical benefit in the vendored
 * data. Deliberately small: the only other features whose text carries the
 * phrase are the cavalier's and swashbuckler's Musketeer archetypes, where it
 * is one clause of a standard-action focus with a per-day cap, not something
 * the static sheet may bake into a printed threat range.
 */
export const CRIT_RANGE_GRANTS: CritRangeGrant[] = [
  {
    // Swashbuckler Weapon Training (5th): "While wielding such a weapon, she
    // gains the benefit of the Improved Critical feat", where "such a weapon"
    // is the one-handed or light piercing melee weapon the attack/damage
    // bonus covers.
    classTag: "swashbuckler",
    minLevel: 5,
    scope: { kind: "piercingLightOrOneHanded" },
    label: "Swashbuckler Weapon Training",
    // Avenger's Target replaces the feature with a studied-target bonus that
    // grants no Improved Critical benefit.
    suppressedBy: ["swashbuckler:mysterious-avenger"],
  },
  {
    // Flying Blade Training: same shape, narrowed to daggers and starknives.
    classTag: "swashbuckler",
    archetypeId: "swashbuckler:flying-blade",
    minLevel: 5,
    scope: { kind: "groups", groups: ["dagger", "starknife"] },
    label: "Flying Blade Training",
  },
  {
    // Rapier Training: same shape, narrowed to rapiers.
    classTag: "swashbuckler",
    archetypeId: "swashbuckler:inspired-blade",
    minLevel: 5,
    scope: { kind: "groups", groups: ["rapier"] },
    label: "Rapier Training",
  },
];

/** A weapon's type slug, normalized the way every `group` comparison here does. */
function groupSlug(w: WeaponInstance): string {
  return (w.group ?? "").trim().toLowerCase();
}

/** True when `w` is a light or one-handed piercing melee weapon, per the vendored catalog entry. */
function isPiercingLightOrOneHanded(w: WeaponInstance, refData: RefData): boolean {
  if ((w.category ?? "melee") !== "melee") return false;
  const ref = w.weaponId ? refData.weapons[w.weaponId] : undefined;
  if (!ref) return false;
  if (!(ref.damageTypes ?? []).includes("piercing")) return false;
  return ref.weaponSubtype === "light" || ref.weaponSubtype === "1h";
}

/** True when `scope` covers `w`. */
function scopeCovers(scope: CritRangeScope, w: WeaponInstance, refData: RefData): boolean {
  if (scope.kind === "piercingLightOrOneHanded") return isPiercingLightOrOneHanded(w, refData);
  const group = groupSlug(w);
  return group !== "" && scope.groups.includes(group);
}

/**
 * The class feature widening `w`'s threat range, if any. Resolution mirrors
 * `gunTrainingMatches`: per class the character has levels in, an archetype
 * entry applies when its id is selected, otherwise the base entry does unless
 * a `suppressedBy` id is.
 */
function classFeatureWidener(
  doc: CharacterDoc,
  refData: RefData,
  w: WeaponInstance,
): string | undefined {
  const archetypes = doc.build.archetypes ?? [];
  for (const cls of doc.identity.classes) {
    const forClass = CRIT_RANGE_GRANTS.filter((g) => g.classTag === cls.tag);
    const archetypeGrants = forClass.filter(
      (g) => g.archetypeId !== undefined && archetypes.includes(g.archetypeId),
    );
    const active =
      archetypeGrants.length > 0
        ? archetypeGrants
        : forClass.filter(
            (g) =>
              g.archetypeId === undefined &&
              !(g.suppressedBy ?? []).some((id) => archetypes.includes(id)),
          );
    for (const grant of active) {
      if (cls.level < grant.minLevel) continue;
      if (scopeCovers(grant.scope, w, refData)) return grant.label;
    }
  }
  return undefined;
}

/**
 * The threat-range feat the character took AND named this weapon type for, if
 * any. The pick lives in `build.featChoices` / `build.extraFeats[].choiceId`
 * as a `group` slug, the same storage the proficiency picks and Slashing Grace
 * read.
 *
 * A class-GRANTED Improved Critical (`granted-feats.ts` expands one into
 * `build.feats` for a swashbuckler) carries no pick, so it never matches here
 * and is covered by {@link CRIT_RANGE_GRANTS} instead — which is the right
 * scope anyway, since the class grants it for a whole weapon family rather
 * than one chosen type.
 */
function featWidener(doc: CharacterDoc, refData: RefData, w: WeaponInstance): string | undefined {
  const group = groupSlug(w);
  if (group === "") return undefined;
  const widener = (featId: string, choiceId: string | undefined): string | undefined => {
    const feat = refData.feats[featId];
    if (!feat || !CRIT_RANGE_FEATS.has(featNameSlug(feat.name))) return undefined;
    return choiceId?.trim().toLowerCase() === group ? feat.name : undefined;
  };
  for (const featId of doc.build.feats ?? []) {
    const name = widener(featId, doc.build.featChoices?.[featId]);
    if (name) return name;
  }
  for (const instance of doc.build.extraFeats ?? []) {
    const name = widener(instance.featId, instance.choiceId);
    if (name) return name;
  }
  return undefined;
}

export interface CritThreat {
  /** Lower bound of the threat range, after any widening. */
  range: number;
  /** The feat or class feature that widened it, when one did. */
  widenedBy?: string;
}

/**
 * `w`'s threat range in this character's hands. Returns the stored range
 * unchanged for the overwhelmingly common case: nothing widens it, something
 * already did (keen, a hand-entered range), or the weapon isn't one this
 * engine can identify against the catalog.
 */
export function critThreatRange(
  doc: CharacterDoc,
  refData: RefData,
  w: WeaponInstance,
): CritThreat {
  const stored = w.critRange ?? 20;
  const widenedBy = featWidener(doc, refData, w) ?? classFeatureWidener(doc, refData, w);
  if (widenedBy === undefined) return { range: stored };
  const ref = w.weaponId ? refData.weapons[w.weaponId] : undefined;
  // No catalog entry to read a base off, or a stored range that has already
  // moved off it — see the module note.
  if (ref === undefined || stored !== (ref.critRange ?? 20)) return { range: stored };
  // 18-20 (a 3-wide range) doubles to 15-20, 20 to 19-20. Floored at 1 for
  // the same reason `abilities.ts`'s keen does: a nonsense catalog value
  // must not produce a range below the die.
  return { range: Math.max(1, 2 * stored - 21), widenedBy };
}
