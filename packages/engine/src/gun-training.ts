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
 * - **Bolt Ace's Crossbow Training** ("picks" scope, `pickGroupTag:
 *   "crossbows"`): same 5th/9th/13th/17th cadence as base Gun Training, but
 *   the picked TYPE is a crossbow rather than a firearm (aonprd.com, "This
 *   ability replaces gun training" — the whole progression, not just tier
 *   1). `pickGroupTag` doesn't change matching (still free-text against the
 *   picked weapon's name/group, same as every other picks-scope entry) — it
 *   only tells a picker UI which `WEAPON_GROUPS` slug to draw its option pool
 *   from instead of the implicit "firearms" default.
 * - **Mysterious Stranger's Stranger's Fortune** and **Commando's
 *   Trapsmith** each replace only Gun Training's 5th-level tier with an
 *   unrelated ability (misfire-ignoring luck / a ranger trap), leaving the
 *   9th/13th/17th tiers on the normal schedule — modeled as an
 *   `archetypeId` entry with `unlockLevels: [9, 13, 17]` (no 5th-level pick
 *   slot at all).
 * - **Buccaneer** replaces Gun Training 1, 2, and 4 with unrelated abilities
 *   (a familiar, a bonus feat, a riposte), leaving only the 13th-level tier —
 *   `unlockLevels: [13]`, a single pick.
 * - **Gulch Gunner's Belly Shot** replaces Gun Training 2/3/4 (9th/13th/17th)
 *   with scaling precision damage, leaving only the 5th-level tier —
 *   `unlockLevels: [5]`, a single pick, the mirror image of the two entries
 *   above.
 *
 * Not every archetype that touches Gun Training gets its own entry:
 * **Techslinger's Technic Training**, **Experimental Gunsmith's
 * Innovations**, and **Firebrand's Bombs** each replace the whole
 * progression (all four tiers) with something this picks/groups vocabulary
 * can't express — Technic Training's "advanced technology firearm" category
 * has no `WEAPON_GROUPS` tag to scope a picker to (unlike Bolt Ace's
 * crossbows), and Innovations/Bombs aren't a Dex-to-damage bonus at all.
 * Those three ids are in the base entry's `suppressedBy` so the base picks
 * grant doesn't stay (incorrectly) active for them. **Wyrm Sniper's Heavy
 * Gunner** is deliberately NOT suppressed and has no entry of its own: it
 * doesn't replace Gun Training, it just widens what a normal Gun Training
 * pick can name (a light siege weapon type instead of a firearm type) — the
 * base picks entry's free-text matching already accepts that without any
 * changes. Every other gunslinger archetype (Gun Tank, Maverick, Scatter
 * Gunner, Siege Gunner, etc.) doesn't touch Gun Training at all, so the base
 * entry applies to them unmodified too.
 */

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";

import { normalizeWeaponGroup } from "./weapon-groups.js";

/** Chosen-firearm-type scope: one more pick unlocks at each listed character level. */
export interface GunTrainingPicksScope {
  kind: "picks";
  /** Class levels at which a new weapon-type pick unlocks, in grant order. */
  unlockLevels: number[];
  /**
   * Semantic `WEAPON_GROUPS` tag (`weapon-groups.ts`) whose member weapons
   * form a picker UI's option pool for this grant — e.g. Bolt Ace's
   * Crossbow Training sets `"crossbows"` so a picker offers crossbows
   * instead of firearms. Absent means "firearms" (the default every other
   * picks-scope entry implies). Purely a UI hint: matching itself
   * (`picksMatch`) is always free-text against the picked weapon's
   * name/group, regardless of this field.
   */
  pickGroupTag?: string;
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
   * wholesale with a variant this module can't express as its own
   * {@link GunTrainingGrant} (see the module doc comment). Selecting one of
   * these suppresses the base grant instead of leaving it (incorrectly)
   * active. An archetype that gets its own `archetypeId` entry elsewhere in
   * {@link GUN_TRAINING_GRANTS} doesn't need to be listed here too —
   * {@link gunTrainingMatches} already prefers a matching archetype entry
   * over the base one regardless of this list.
   */
  suppressedBy?: string[];
}

export const GUN_TRAINING_GRANTS: GunTrainingGrant[] = [
  {
    classTag: "gunslinger",
    scope: { kind: "picks", unlockLevels: [5, 9, 13, 17] },
    // Technic Training/Innovations/Bombs each replace ALL four Gun Training
    // tiers with something outside this picks/groups vocabulary (see the
    // module doc comment) — suppress the base grant so it doesn't stay
    // active for them.
    suppressedBy: [
      "gunslinger:techslinger",
      "gunslinger:experimental-gunsmith",
      "gunslinger:firebrand",
    ],
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
  {
    // "This ability replaces gun training" — the whole progression, ported
    // to a chosen crossbow type each tier (aonprd.com, Bolt Ace).
    classTag: "gunslinger",
    archetypeId: "gunslinger:bolt-ace",
    scope: { kind: "picks", unlockLevels: [5, 9, 13, 17], pickGroupTag: "crossbows" },
  },
  {
    // Exotic Pet/Sword and Pistol/Raider's Riposte replace tiers 1, 2, and 4
    // respectively, leaving only the 13th-level pick (aonprd.com, Buccaneer:
    // "A buccaneer gains this ability only at 13th level with a single type
    // of firearm.").
    classTag: "gunslinger",
    archetypeId: "gunslinger:buccaneer",
    scope: { kind: "picks", unlockLevels: [13] },
  },
  {
    // Trapsmith "alters gun training", trading only the 5th-level tier for a
    // ranger trap; 9th/13th/17th are untouched (aonprd.com, Commando).
    classTag: "gunslinger",
    archetypeId: "gunslinger:commando",
    scope: { kind: "picks", unlockLevels: [9, 13, 17] },
  },
  {
    // Belly Shot "replaces the gun training ability gained at 9th, 13th, and
    // 17th level", leaving only the 5th-level tier (aonprd.com, Gulch
    // Gunner) — the mirror image of Commando/Mysterious Stranger above.
    classTag: "gunslinger",
    archetypeId: "gunslinger:gulch-gunner",
    scope: { kind: "picks", unlockLevels: [5] },
  },
  {
    // Stranger's Fortune "replaces gun training 1" only; 9th/13th/17th are
    // untouched (aonprd.com, Mysterious Stranger).
    classTag: "gunslinger",
    archetypeId: "gunslinger:mysterious-stranger",
    scope: { kind: "picks", unlockLevels: [9, 13, 17] },
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
