/**
 * Monk Flurry of Blows — the live attack sequence, clean-room from the
 * published PF1 rules.
 *
 * Two different features share the name, and they are not variants of each
 * other:
 *
 *  - **Chained monk** (CRB): a full-attack action making extra unarmed/monk-
 *    weapon attacks, "taking a -2 penalty on all of her attack rolls, as if
 *    using the Two-Weapon Fighting feat", with a second extra attack at 8th
 *    ("as if using Improved Two-Weapon Fighting") and a third at 15th ("as if
 *    using Greater Two-Weapon Fighting"). "For the purpose of these attacks,
 *    the monk's base attack bonus is equal to her monk level."
 *  - **Unchained monk** (Pathfinder Unchained): one extra attack at the
 *    monk's highest base attack bonus, a second at 11th, no penalty and no
 *    base-attack-bonus substitution (the unchained monk is already full BAB).
 *
 * The extra attacks land differently, which is why one shared "extraAttacks"
 * number isn't enough to describe both. The chained monk's extras duplicate
 * the top-most attacks of her monk-level iterative sequence from the top
 * down — the printed flurry column at 8th is +6/+6/+1/+1, not +6/+6/+6/+1.
 * The unchained monk's extras are all at his highest bonus, haste-style:
 * +8/+8/+3 at 8th, +11/+11/+11/+6/+1 at 11th.
 *
 * Unlike two-weapon fighting (`two-weapon-fighting.ts`), flurry IS emitted by
 * `compute()`: it's a property of the character, not a per-round grip choice,
 * so the qualifying weapons carry their flurry line and a saved roll only has
 * to say whether this bookmark is the flurry one.
 */

import type { BabTier, FlurryMode, FlurryStyle } from "@pf1/schema";

import { UNARMED_STRIKE_GROUP, normalizeWeaponGroup } from "./weapon-groups.js";

/** The chained monk's flat penalty on every flurry attack, at every level. */
const CHAINED_FLURRY_PENALTY = -2;

/** Class tags that grant Flurry of Blows, and which of the two features they grant. */
const FLURRY_CLASSES: Readonly<Record<string, FlurryStyle>> = {
  monk: "chained",
  monkUnchained: "unchained",
};

/**
 * Which class drives a character's flurry, or `undefined` for a character with
 * no monk levels. A character holding levels in both monks (an illegal build,
 * but nothing stops a player from typing one) flurries off whichever has more
 * levels, unchained winning a tie.
 */
export function flurryClass(
  classes: readonly { tag: string; level: number }[],
): { tag: string; style: FlurryStyle; level: number } | undefined {
  const candidates = classes
    .map((c) => ({ tag: c.tag, style: FLURRY_CLASSES[c.tag], level: c.level }))
    .filter((c): c is { tag: string; style: FlurryStyle; level: number } => {
      return c.style !== undefined && c.level > 0;
    })
    .sort((a, b) => b.level - a.level || (a.style === "unchained" ? -1 : 1));
  return candidates[0];
}

/**
 * The chained monk's base-attack-bonus substitution, as a tier swap.
 *
 * "For the purpose of these attacks, the monk's base attack bonus is equal to
 * her monk level" — for a single-classed monk that is exactly her monk levels
 * counting at the full 1/level tier instead of the class's own 3/4. Read
 * literally as a replacement of the character's WHOLE base attack bonus it
 * would make a monk 5/fighter 10 worse at flurrying than at swinging a sword,
 * which is not what a class feature does; substituting only the monk levels'
 * own contribution is the reading that leaves the printed monk table exact
 * and every multiclass case sane. Callers pass the character's per-class BAB
 * tiers with the monk entry already swapped to `"high"`, so fractional base
 * bonuses (Pathfinder Unchained) fall out for free.
 */
export const CHAINED_FLURRY_BAB_TIER: BabTier = "high";

/**
 * Resolve a character's flurry, or `undefined` when they have no monk levels.
 *
 * `flurryBab` is the character's base attack bonus recomputed with monk levels
 * at {@link CHAINED_FLURRY_BAB_TIER} (chained) — pass their true `bab` for the
 * unchained monk, whose flurry needs no substitution.
 */
export function flurryMode(opts: {
  style: FlurryStyle;
  level: number;
  bab: number;
  flurryBab: number;
}): FlurryMode | undefined {
  const { style, level, bab } = opts;
  if (level <= 0) return undefined;
  if (style === "unchained") {
    return {
      style,
      level,
      bab,
      babDelta: 0,
      penalty: 0,
      extraAttacks: level >= 11 ? 2 : 1,
      source: "flurry of blows",
      restriction: "unarmed strikes or monk weapons only",
    };
  }
  return {
    style,
    level,
    bab: opts.flurryBab,
    babDelta: opts.flurryBab - bab,
    penalty: CHAINED_FLURRY_PENALTY,
    extraAttacks: level >= 15 ? 3 : level >= 8 ? 2 : 1,
    source: "flurry of blows",
    restriction: "unarmed strikes or monk weapons only",
  };
}

/**
 * The flurry sequence for a weapon whose normal (true-BAB) attack bonus is
 * `attackTotal`, highest first.
 *
 * The iterative steps come off the flurry's own base attack bonus, so a
 * chained monk 8 gets two steps (her monk level 8 clears the +6 threshold)
 * where her true BAB of 6 would also give two — but a chained monk 6 gets two
 * where her true BAB of 4 gives one.
 *
 * Reproduces the published columns exactly. Chained: L1 -1/-1, L6 +4/+4/-1,
 * L8 +6/+6/+1/+1, L11 +9/+9/+4/+4/-1, L15 +13/+13/+8/+8/+3/+3, L20
 * +18/+18/+13/+13/+8/+8/+3. Unchained: L1 +1/+1, L8 +8/+8/+3, L11
 * +11/+11/+11/+6/+1, L20 +20/+20/+20/+15/+10/+5.
 */
export type { FlurryMode, FlurryStyle };

export function flurrySequence(mode: FlurryMode, attackTotal: number): number[] {
  const top = attackTotal + mode.babDelta + mode.penalty;
  const steps = Math.min(4, 1 + Math.floor((mode.bab - 1) / 5));
  const base = Array.from({ length: steps }, (_, k) => top - 5 * k);
  if (mode.style === "unchained") {
    // Haste-shaped: every extra attack is at the highest bonus.
    return [...(Array<number>(mode.extraAttacks).fill(base[0]!) as number[]), ...base];
  }
  // Two-weapon-shaped: each extra attack duplicates one more of the sequence,
  // from the top down, and never more entries than the sequence has.
  const duplicated = Math.min(steps, mode.extraAttacks);
  return base.flatMap((bonus, i) => (i < duplicated ? [bonus, bonus] : [bonus]));
}

/**
 * True when a weapon can be used in a flurry: an unarmed strike, or a weapon
 * in the vendored `monk` weapon group (sai, nunchaku, quarterstaff, ...).
 *
 * Archetypes that trade the weapon list wholesale (a zen archer flurries with
 * a bow, a far strike monk with thrown weapons) aren't recognized here — see
 * `archetype-extracted/monk.ts`, where both are booked as subsystem grants.
 */
export function isFlurryWeapon(w: { group?: string; weaponGroups?: readonly string[] }): boolean {
  const group = (w.group ?? "").trim().toLowerCase();
  if (group === UNARMED_STRIKE_GROUP) return true;
  return (w.weaponGroups ?? []).some((g) => normalizeWeaponGroup(g) === "monk");
}
