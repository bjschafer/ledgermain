/**
 * Clean-room PF1 Gun Training family (Ultimate Combat): the gunslinger's own
 * Gun Training class feature (5th/9th/13th/17th) plus the two CRB-adjacent
 * archetypes that replace it wholesale with a category-wide variant —
 * Musket Training (musket master) and Pistol Training (pistolero).
 *
 * All three grant "a bonus on damage rolls equal to her Dexterity modifier"
 * with the covered firearm(s), and reduce the misfire-value increase a
 * broken firearm of that type suffers from +4 to +2 on a subsequent misfire
 * (verified against aonprd.com's Gunslinger class page and Ultimate Combat
 * pp.50-51 for the archetypes). The misfire-reduction half is NOT modeled
 * here — this engine has no broken-item-state tracking, so there is no
 * misfire value to reduce yet; only the Dex-to-damage half has a numeric
 * hook (`gunTrainingMatches`, consumed by `computeWeaponAttacks` in
 * compute.ts).
 *
 * - **Base gunslinger** ({@link GUN_TRAINING_GRANTS}'s no-`archetypeId`
 *   entry): "picks" scope — the gunslinger chooses one firearm TYPE at 5th
 *   level and one more at each of 9th/13th/17th (`build.gunTrainingPicks`,
 *   keyed by classTag, same free-text substring-match convention as Rogue
 *   (Unchained)'s Finesse Training — see `rogueFinesseTrainingMatches` in
 *   compute.ts).
 * - **Musket Training** / **Pistol Training** ("groups" scope): no player
 *   choice — every two-handed (resp. one-handed) firearm the character wields
 *   gets Dex-to-damage from 5th level on, matched via the vendored
 *   `firearms-two-handed`/`firearms-one-handed` `WEAPON_GROUPS` slugs
 *   (`weapon-groups.ts`) rather than a picker.
 *
 * Many other gunslinger archetypes (Bolt Ace's Crossbow Training, Mysterious
 * Stranger's delayed schedule, etc.) also replace or reflavor Gun Training
 * but don't have a modeled entry here yet — the base
 * entry's `suppressedBy` list is where a future wave adds their archetype
 * ids once it gives them their own {@link GunTrainingGrant}, so an
 * unmodeled archetype doesn't silently keep granting the base picks version
 * it no longer has.
 */

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";

import { normalizeWeaponGroup } from "./weapon-groups.js";

/** Chosen-firearm-type scope: one more pick unlocks at each listed character level. */
export interface GunTrainingPicksScope {
  kind: "picks";
  /** Class levels at which a new weapon-type pick unlocks, in grant order. */
  unlockLevels: number[];
}

/** Category-wide scope: every weapon tagged with one of `groups` qualifies once `minLevel` is reached. */
export interface GunTrainingGroupsScope {
  kind: "groups";
  /** Normalized `WEAPON_GROUPS` slugs (e.g. "firearms-two-handed"). */
  groups: string[];
  /** Class level the category-wide bonus turns on. */
  minLevel: number;
}

export interface GunTrainingGrant {
  /** Granting class tag (e.g. "gunslinger"). */
  classTag: string;
  /**
   * `build.archetypes` id this entry belongs to (e.g.
   * "gunslinger:musket-master"). Absent for a class's own BASE feature.
   */
  archetypeId?: string;
  scope: GunTrainingPicksScope | GunTrainingGroupsScope;
  /**
   * BASE-entry only: archetype ids that replace this class's Gun Training
   * with a variant that has no {@link GunTrainingGrant} of its own yet.
   * Selecting one of these suppresses the base grant instead of leaving it
   * (incorrectly) active — see the module doc comment. Empty until a future
   * wave adds those archetypes' own entries.
   */
  suppressedBy?: string[];
}

export const GUN_TRAINING_GRANTS: GunTrainingGrant[] = [
  {
    classTag: "gunslinger",
    scope: { kind: "picks", unlockLevels: [5, 9, 13, 17] },
    suppressedBy: [],
  },
  {
    classTag: "gunslinger",
    archetypeId: "gunslinger:musket-master",
    scope: { kind: "groups", groups: ["firearms-two-handed"], minLevel: 5 },
  },
  {
    classTag: "gunslinger",
    archetypeId: "gunslinger:pistolero",
    scope: { kind: "groups", groups: ["firearms-one-handed"], minLevel: 5 },
  },
];

/** `w`'s semantic group keys, normalized — mirrors `weaponGroupKeys` in compute.ts but skips the free-text `.group` tag (groups-scope matching only ever targets the vendored semantic tags). */
function normalizedGroupKeys(w: Pick<WeaponInstance, "weaponGroups">): string[] {
  return (w.weaponGroups ?? []).map(normalizeWeaponGroup);
}

/** "picks"-scope match: free-text substring against `w.name`, or exact match against `w.group` — same convention `rogueFinesseTrainingMatches` uses. */
function picksMatch(picks: readonly (string | undefined)[], w: WeaponInstance): boolean {
  const wname = w.name.trim().toLowerCase();
  const wgroup = (w.group ?? "").trim().toLowerCase();
  return picks.some((p) => {
    const needle = p?.trim().toLowerCase();
    if (!needle) return false;
    return wname.includes(needle) || wgroup === needle;
  });
}

/**
 * True when `w` qualifies for SOME active Gun Training family grant's
 * Dex-to-damage bonus. Resolution, per class the character has levels in:
 * an archetype entry (`archetypeId` set) applies when that id is in
 * `doc.build.archetypes`; otherwise the class's BASE entry applies unless
 * one of its `suppressedBy` ids is selected instead. Consumed by
 * `computeWeaponAttacks` in compute.ts as the ranged counterpart to
 * `rogueFinesseTrainingMatches`.
 */
export function gunTrainingMatches(doc: CharacterDoc, w: WeaponInstance): boolean {
  const archetypes = doc.build.archetypes ?? [];
  for (const cls of doc.identity.classes) {
    const grantsForClass = GUN_TRAINING_GRANTS.filter((g) => g.classTag === cls.tag);
    const archetypeGrants = grantsForClass.filter(
      (g) => g.archetypeId !== undefined && archetypes.includes(g.archetypeId),
    );
    const activeGrants =
      archetypeGrants.length > 0
        ? archetypeGrants
        : grantsForClass.filter(
            (g) =>
              g.archetypeId === undefined &&
              !(g.suppressedBy ?? []).some((id) => archetypes.includes(id)),
          );
    for (const grant of activeGrants) {
      if (grant.scope.kind === "groups") {
        if (cls.level < grant.scope.minLevel) continue;
        const keys = normalizedGroupKeys(w);
        if (grant.scope.groups.some((g) => keys.includes(g))) return true;
      } else {
        const unlockedTiers = grant.scope.unlockLevels.filter((lvl) => cls.level >= lvl).length;
        const picks = (doc.build.gunTrainingPicks?.[cls.tag] ?? []).slice(0, unlockedTiers);
        if (picks.length > 0 && picksMatch(picks, w)) return true;
      }
    }
  }
  return false;
}
