/**
 * Gun Training (Ultimate Combat) firearm-type picker support — the "picks"
 * scope half of `@pf1/engine`'s `GUN_TRAINING_GRANTS` table (base gunslinger
 * Gun Training and its "picks"-scope archetype replacements, e.g. Bolt Ace's
 * Crossbow Training; the musket master/pistolero archetypes use a "groups"
 * scope instead and have no picker at all, see `GunTrainingGroupsScope`).
 *
 * The active-grant resolution here mirrors `gunTrainingMatches` in
 * `@pf1/engine` `gun-training.ts` (archetype entry wins over the class's own
 * BASE entry; a `suppressedBy` archetype turns the base entry off) rather than
 * importing it, since that function is scoped per-`WeaponInstance` match, not
 * "what's the active grant for this class" — there's no shared helper to
 * reuse without changing the engine's public surface.
 */

import {
  GUN_TRAINING_GRANTS,
  normalizeWeaponGroup,
  type GunTrainingGrant,
  type GunTrainingPicksScope,
} from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

/**
 * The active Gun Training-family grant for `classTag`, per the same
 * archetype-over-base resolution `gunTrainingMatches` uses: an archetype
 * entry (`archetypeId` set) applies when that id is in `doc.build.archetypes`;
 * otherwise the class's BASE entry applies unless one of its `suppressedBy`
 * ids is selected instead. Returns `undefined` when the character has no
 * grant at all for this class tag.
 */
export function activeGunTrainingGrant(
  doc: CharacterDoc,
  classTag: string,
): GunTrainingGrant | undefined {
  const archetypes = doc.build.archetypes ?? [];
  const grantsForClass = GUN_TRAINING_GRANTS.filter((g) => g.classTag === classTag);
  const archetypeGrants = grantsForClass.filter(
    (g) => g.archetypeId !== undefined && archetypes.includes(g.archetypeId),
  );
  if (archetypeGrants.length > 0) return archetypeGrants[0];
  return grantsForClass.find(
    (g) =>
      g.archetypeId === undefined && !(g.suppressedBy ?? []).some((id) => archetypes.includes(id)),
  );
}

/**
 * The active "picks"-scope grant for `classTag` — `undefined` when the active
 * grant (if any) is a category-wide "groups" scope instead (musket master,
 * pistolero: no player choice, so no picker renders).
 */
export function activeGunTrainingPicksGrant(
  doc: CharacterDoc,
  classTag: string,
): (GunTrainingGrant & { scope: GunTrainingPicksScope }) | undefined {
  const grant = activeGunTrainingGrant(doc, classTag);
  if (!grant || grant.scope.kind !== "picks") return undefined;
  return grant as GunTrainingGrant & { scope: GunTrainingPicksScope };
}

/** How many of the active picks-scope grant's tiers `classTag`'s level has unlocked (0 if no active picks grant). */
export function unlockedGunTrainingPicks(doc: CharacterDoc, classTag: string): number {
  const grant = activeGunTrainingPicksGrant(doc, classTag);
  if (!grant) return 0;
  const level = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
  return grant.scope.unlockLevels.filter((lvl) => level >= lvl).length;
}

/**
 * The picker's option pool: distinct `WeaponRef.group` slugs (e.g. "pistol",
 * "musket", or "heavy-crossbow" for Bolt Ace's `pickGroupTag: "crossbows"`)
 * of vendored weapons whose `weaponGroups` include `pickGroupTag` ("firearms"
 * when the grant's scope doesn't set one — see
 * `GunTrainingPicksScope.pickGroupTag`), normalized via `@pf1/engine`'s
 * `normalizeWeaponGroup` since the vendored tags are camelCase
 * ("firearmsTwoHanded") while `pickGroupTag` is the base slug ("firearms").
 * Sorted for a stable picker order.
 */
export function gunTrainingOptionPool(refData: RefData, pickGroupTag = "firearms"): string[] {
  const tag = normalizeWeaponGroup(pickGroupTag);
  const groups = new Set<string>();
  for (const w of Object.values(refData.weapons)) {
    if (!w.group) continue;
    const keys = (w.weaponGroups ?? []).map(normalizeWeaponGroup);
    if (keys.includes(tag)) groups.add(w.group);
  }
  return [...groups].sort();
}

/**
 * Singular, human-facing form of a `pickGroupTag` slug for hint copy, e.g.
 * "firearms" -> "firearm", "crossbows" -> "crossbow". A tag that doesn't end
 * in "s" is returned unchanged rather than guessed at.
 */
export function pickGroupSingularLabel(tag: string): string {
  return tag.endsWith("s") ? tag.slice(0, -1) : tag;
}

/**
 * Set (or clear, with `null`/empty string) the firearm-type pick at
 * `tierIndex` for `classTag`, mirroring `setRogueFinesseWeapon`'s shape
 * except keyed by class tag (`build.gunTrainingPicks[classTag]`, since a
 * multiclass character could in principle have more than one Gun Training
 * source).
 */
export function setGunTrainingPick(
  doc: CharacterDoc,
  classTag: string,
  tierIndex: number,
  weaponGroup: string | null,
): CharacterDoc {
  if (tierIndex < 0) return doc;
  const byClass = { ...doc.build.gunTrainingPicks };
  const current = [...(byClass[classTag] ?? [])];
  while (current.length <= tierIndex) current.push(""); // fill gaps, never leave sparse holes
  current[tierIndex] = typeof weaponGroup === "string" ? weaponGroup.trim() : "";
  // Trim trailing empty slots so an empty array round-trips cleanly.
  while (current.length > 0 && !current[current.length - 1]) current.pop();
  if (current.length > 0) {
    byClass[classTag] = current;
  } else {
    delete byClass[classTag];
  }
  return {
    ...doc,
    build: {
      ...doc.build,
      gunTrainingPicks: Object.keys(byClass).length > 0 ? byClass : undefined,
    },
  };
}
