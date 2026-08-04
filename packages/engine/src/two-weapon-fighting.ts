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
  /**
   * Set when the character doesn't own the feat but fights with it anyway,
   * lent by a class feature (a {@link GrantedTwfChain}'s `source`).
   */
  grantedBy?: string;
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

/**
 * Chain feats a class feature lends the character while they fight in a
 * particular mode, rather than feats they own outright. Passed to
 * {@link twoWeaponProfile}, which folds `slugs` in alongside the owned set and
 * labels the resulting chain entries with `source` so the UI can say where the
 * feat came from.
 */
export interface GrantedTwfChain {
  /** {@link TWF_CHAIN} slugs the mode supplies at the character's current level. */
  slugs: readonly string[];
  /** Where they come from, e.g. "brawler's flurry". */
  source: string;
  /** What the mode limits the character to, for an at-table reminder. */
  restriction: string;
  /** True when the same feature also gives full ability damage off-hand. */
  fullAbilityOffHand: boolean;
}

/**
 * Brawler's Flurry (PF1 Advanced Class Guide, brawler 2nd level), clean-room
 * from the published rules: as a full-attack action a brawler "has the
 * Two-Weapon Fighting feat when attacking with any combination of unarmed
 * strikes, weapons from the close fighter weapon group, or weapons with the
 * 'monk' special feature", gaining Improved Two-Weapon Fighting at 8th level
 * and Greater Two-Weapon Fighting at 15th. Two details this reproduces that a
 * quick reading loses:
 *
 *  - "She does not need to use two different weapons to use this ability" —
 *    an unarmed flurry is the normal case, so the off-hand needs no second
 *    weapon entry.
 *  - "A brawler applies her full Strength modifier to her damage rolls for
 *    all attacks made with brawler's flurry, whether the attacks are made
 *    with an off-hand weapon or a weapon wielded in both hands" — full Str
 *    off-hand, the same effect Double Slice has for everyone else.
 *
 * NOT the monk's Flurry of Blows (see `tables.ts`'s `flurryOfBlowsLabel`):
 * that one swaps monk level in for base attack bonus and has its own attack
 * sequence; this is ordinary two-weapon fighting off true BAB with the feat
 * chain lent out. Returns `undefined` below 2nd level, where the feature
 * hasn't been granted yet.
 */
export function brawlersFlurry(brawlerLevel: number): GrantedTwfChain | undefined {
  if (brawlerLevel < 2) return undefined;
  const slugs = ["two-weapon-fighting"];
  if (brawlerLevel >= 8) slugs.push("improved-two-weapon-fighting");
  if (brawlerLevel >= 15) slugs.push("greater-two-weapon-fighting");
  return {
    slugs,
    source: "brawler's flurry",
    restriction: "unarmed strikes, close weapons, or monk weapons only",
    fullAbilityOffHand: true,
  };
}

/**
 * One-line summary of what {@link brawlersFlurry} is currently worth, for the
 * Class Features panel. Empty below 2nd level.
 */
export function brawlersFlurryLabel(brawlerLevel: number): string {
  const flurry = brawlersFlurry(brawlerLevel);
  if (!flurry) return "";
  const upgrades = [
    flurry.slugs.includes("improved-two-weapon-fighting") ? "Improved" : null,
    flurry.slugs.includes("greater-two-weapon-fighting") ? "Greater" : null,
  ].filter((n): n is string => n !== null);
  const chain = ["Two-Weapon Fighting", ...upgrades].join(" + ");
  return `${chain}, full Str both hands`;
}

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
 *
 * `granted` lends the character chain feats a class feature supplies for this
 * fighting mode (brawler's flurry) — folded in exactly as if owned, but
 * labelled with their source so a chip can say so.
 */
export function twoWeaponProfile(
  offHand: OffHandGrip,
  owned: ReadonlySet<string>,
  granted?: GrantedTwfChain,
): TwoWeaponProfile {
  const lent = new Set(granted?.slugs ?? []);
  const has = (slug: string) => owned.has(slug) || lent.has(slug);
  const hasTwf = has("two-weapon-fighting");
  const hasImproved = hasTwf && has("improved-two-weapon-fighting");
  const hasGreater = hasImproved && has("greater-two-weapon-fighting");
  const hasDoubleSlice = hasTwf && owned.has("double-slice");
  const lightRelief = offHand === "light" ? LIGHT_OFF_HAND_RELIEF : 0;

  const offHandOffsets = [0];
  if (hasImproved) offHandOffsets.push(-5);
  if (hasGreater) offHandOffsets.push(-10);

  return {
    primaryPenalty: BASE_PRIMARY_PENALTY + lightRelief + (hasTwf ? TWF_FEAT_PRIMARY_RELIEF : 0),
    offHandPenalty: BASE_OFF_HAND_PENALTY + lightRelief + (hasTwf ? TWF_FEAT_OFF_HAND_RELIEF : 0),
    offHandOffsets,
    offHandDamageMultiplier: hasDoubleSlice || granted?.fullAbilityOffHand ? 1 : 0.5,
    chain: TWF_CHAIN.map((f) => ({
      ...f,
      owned: owned.has(f.slug) || lent.has(f.slug),
      ...(!owned.has(f.slug) && lent.has(f.slug) ? { grantedBy: granted!.source } : {}),
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
