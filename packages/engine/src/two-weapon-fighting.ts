/**
 * Two-weapon fighting (PF1 CRB p. 202) — the penalty table and the off-hand
 * attack sequence, clean-room from the published rules.
 *
 * The important thing this module encodes: **two-weapon fighting needs no
 * feats.** Anyone holding a weapon in each hand may fight with both; the
 * penalties are simply steep enough (−6 primary / −10 off-hand) that most
 * characters don't bother. The feat chain only *reduces* those penalties and
 * *adds* off-hand attacks, so it is modeled as a modifier on the mode rather
 * than as the thing that creates it.
 *
 * Like `SITUATIONAL_FEAT_EFFECTS`, none of this is ever emitted by
 * `compute()`: fighting with two weapons is a per-round choice, not a property
 * of the character, so it applies only where the player says it does (a saved
 * roll flagged as two-weapon — see `apps/web/src/model/twf.ts`).
 */

/** Penalties before feats: −6 primary / −10 off-hand (CRB p. 202). */
const BASE_PRIMARY_PENALTY = -6;
const BASE_OFF_HAND_PENALTY = -10;

/** A light off-hand weapon lightens both hands by 2. */
const LIGHT_OFF_HAND_RELIEF = 2;

/** The Two-Weapon Fighting feat: +2 primary, +6 off-hand. */
const TWF_FEAT_PRIMARY_RELIEF = 2;
const TWF_FEAT_OFF_HAND_RELIEF = 6;

/**
 * How the off-hand weapon is held. `light` covers light weapons, a double
 * weapon's second end, and unarmed strikes/natural attacks used as the
 * off-hand; `one-handed` covers everything else (including a two-handed
 * weapon held one-handed via Titan Mauler's Jotungrip, which takes the same
 * non-light penalty).
 */
export type OffHandGrip = "light" | "one-handed";

/** One two-weapon-fighting feat, and whether the character has it. */
export interface TwfChainFeat {
  slug: string;
  name: string;
  /** At-table reminder, shown whether or not the feat contributes a number. */
  note: string;
  /** True when the character owns it (per the `owned` set passed to {@link twoWeaponProfile}). */
  owned: boolean;
  /**
   * True when owning it changes a number here (the penalty table or the
   * off-hand sequence). False for the reminder-only members of the chain
   * (Two-Weapon Rend, Two-Weapon Defense) and for Double Slice, whose damage
   * effect is applied by the caller against the off-hand weapon.
   */
  numeric: boolean;
}

/**
 * The whole two-weapon feat chain, in the order players take it. Ordered so
 * the UI can list owned feats without re-sorting, and so the prerequisite
 * gating below ("Improved needs Two-Weapon Fighting") reads top-to-bottom.
 */
export const TWF_CHAIN: readonly { slug: string; name: string; note: string; numeric: boolean }[] =
  [
    {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      note: "reduces the two-weapon penalties",
      numeric: true,
    },
    {
      slug: "double-slice",
      name: "Double Slice",
      note: "full ability bonus to off-hand damage",
      numeric: true,
    },
    {
      slug: "improved-two-weapon-fighting",
      name: "Improved Two-Weapon Fighting",
      note: "second off-hand attack at −5",
      numeric: true,
    },
    {
      slug: "greater-two-weapon-fighting",
      name: "Greater Two-Weapon Fighting",
      note: "third off-hand attack at −10",
      numeric: true,
    },
    {
      slug: "two-weapon-rend",
      name: "Two-Weapon Rend",
      note: "both weapons hit one foe → +1d10 + 1½ Str once/round",
      numeric: false,
    },
    {
      slug: "two-weapon-defense",
      name: "Two-Weapon Defense",
      note: "+1 shield AC wielding two weapons (+2 fighting defensively / full attack)",
      numeric: false,
    },
  ];

/** Every slug in {@link TWF_CHAIN} — the feats the two-weapon mode applies on its own. */
export const TWF_CHAIN_SLUGS: ReadonlySet<string> = new Set(TWF_CHAIN.map((f) => f.slug));

export interface TwoWeaponProfile {
  /** Penalty applied to every primary-hand attack (always ≤ 0). */
  primaryPenalty: number;
  /** Penalty applied to every off-hand attack (always ≤ 0). */
  offHandPenalty: number;
  /**
   * Off-hand attack offsets from the off-hand's full attack bonus, highest
   * first: `[0]` bare, `[0, −5]` with Improved, `[0, −5, −10]` with Greater.
   * Note the off-hand sequence is NOT the primary's iterative progression —
   * you get one off-hand attack (plus one per Improved/Greater), each at your
   * full base attack bonus less the offsets above.
   */
  offHandOffsets: number[];
  /** Whether the off-hand adds the full ability damage bonus (Double Slice) or the usual half. */
  offHandDamageMultiplier: 0.5 | 1;
  /** The chain, annotated with what this character owns — for chips/reminders. */
  chain: TwfChainFeat[];
}

/**
 * Resolve the two-weapon penalties and off-hand sequence for a character
 * fighting with two weapons.
 *
 * Prerequisite gating is applied rather than assumed: Improved/Greater
 * Two-Weapon Fighting each require the feat below them in the chain, so an
 * (illegally) hand-added Greater with no base feat grants nothing extra.
 * Double Slice likewise requires the base feat.
 */
export function twoWeaponProfile(
  offHand: OffHandGrip,
  owned: ReadonlySet<string>,
): TwoWeaponProfile {
  const hasTwf = owned.has("two-weapon-fighting");
  const hasImproved = hasTwf && owned.has("improved-two-weapon-fighting");
  const hasGreater = hasImproved && owned.has("greater-two-weapon-fighting");
  const hasDoubleSlice = hasTwf && owned.has("double-slice");
  const lightRelief = offHand === "light" ? LIGHT_OFF_HAND_RELIEF : 0;

  const offHandOffsets = [0];
  if (hasImproved) offHandOffsets.push(-5);
  if (hasGreater) offHandOffsets.push(-10);

  return {
    primaryPenalty: BASE_PRIMARY_PENALTY + lightRelief + (hasTwf ? TWF_FEAT_PRIMARY_RELIEF : 0),
    offHandPenalty: BASE_OFF_HAND_PENALTY + lightRelief + (hasTwf ? TWF_FEAT_OFF_HAND_RELIEF : 0),
    offHandOffsets,
    offHandDamageMultiplier: hasDoubleSlice ? 1 : 0.5,
    chain: TWF_CHAIN.map((f) => ({
      ...f,
      owned: owned.has(f.slug),
      // A feat whose prerequisite is missing is owned-but-inert: still listed,
      // but it isn't moving a number, so it reads as a reminder chip.
      numeric:
        f.numeric &&
        (f.slug === "improved-two-weapon-fighting"
          ? hasImproved
          : f.slug === "greater-two-weapon-fighting"
            ? hasGreater
            : f.slug === "double-slice"
              ? hasDoubleSlice
              : hasTwf),
    })),
  };
}
