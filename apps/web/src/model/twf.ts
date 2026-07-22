/**
 * Two-weapon fighting for saved rolls (issue #97).
 *
 * Fighting with two weapons is a MODE, not a feat: any character may do it,
 * and the feat chain only softens the penalties and adds off-hand attacks. So
 * a saved roll carries a `twf` flag (`SavedRollTwf`) rather than attached
 * feats, and every owned chain feat applies automatically — they aren't the
 * kind of thing a player toggles per round the way Power Attack is.
 *
 * The rules themselves (penalty table, off-hand sequence, chain prerequisites)
 * live in `@pf1/engine`'s `two-weapon-fighting.ts`; this module resolves them
 * against the live sheet and the character's owned feats.
 */

import type { DerivedSheet, ResolvedWeaponAttack, SavedRoll, SavedRollTwf } from "@pf1/schema";
import { TWF_CHAIN_SLUGS, twoWeaponProfile, type TwoWeaponProfile } from "@pf1/engine";

/** Two-weapon state resolved for one saved roll. */
export interface TwfFold {
  profile: TwoWeaponProfile;
  /** The chosen off-hand weapon's live attack line, when it's set and still present. */
  offHandAttack?: ResolvedWeaponAttack;
  /** True when an off-hand weapon was named but no longer resolves (removed/renamed). */
  offHandWeaponMissing: boolean;
}

/**
 * The roll's two-weapon config, upgrading pre-#97 rolls that expressed
 * two-weapon fighting by attaching the Two-Weapon Fighting feat (whose
 * `option` was exactly this grip choice). Reading the legacy shape here rather
 * than migrating the stored doc keeps the upgrade lossless and idempotent —
 * the roll converts for real the first time the player touches the toggle.
 */
export function twfConfig(roll: SavedRoll): SavedRollTwf | undefined {
  if (roll.twf) return roll.twf;
  const legacy = (roll.feats ?? []).find((f) => f.slug === "two-weapon-fighting");
  if (!legacy) return undefined;
  return { offHand: legacy.option === "one-handed" ? "one-handed" : "light" };
}

/**
 * Resolve the penalties, off-hand sequence and applicable feats for a
 * two-weapon roll.
 *
 * `ownedFeatSlugs` follows `resolveSavedRoll`'s convention of being optional,
 * but "unknown" can't mean "owns everything" here (that would silently hand
 * out three off-hand attacks), so it falls back to the chain feats the roll
 * has attached — which is exactly what a legacy roll carries.
 */
export function resolveTwf(
  roll: SavedRoll,
  cfg: SavedRollTwf,
  sheet: DerivedSheet,
  ownedFeatSlugs: ReadonlySet<string> | undefined,
): TwfFold {
  const owned =
    ownedFeatSlugs ??
    new Set((roll.feats ?? []).map((f) => f.slug).filter((s) => TWF_CHAIN_SLUGS.has(s)));
  const offHandAttack = cfg.offHandWeapon
    ? sheet.attacks.find((a) => a.name === cfg.offHandWeapon)
    : undefined;
  return {
    profile: twoWeaponProfile(cfg.offHand, owned),
    offHandAttack,
    offHandWeaponMissing: cfg.offHandWeapon !== undefined && offHandAttack === undefined,
  };
}

/**
 * How much to add to a weapon's damage bonus to restate its ability damage for
 * the off hand: half the ability modifier (rounded down, as PF1 rounds all
 * fractions), or the full modifier with Double Slice. The weapon instance's
 * own `damageMultiplier` is whatever the player configured for wielding it
 * normally, so it's backed out here rather than trusted — a longsword used as
 * an off-hand deals ½ Str whether or not its entry says so.
 */
export function offHandAbilityDelta(atk: ResolvedWeaponAttack, multiplier: 0.5 | 1): number {
  const mod = atk.damageAbilityMod;
  if (mod === undefined) return 0;
  const applied = Math.floor(mod * (atk.damageMultiplier ?? 1));
  return Math.floor(mod * multiplier) - applied;
}
