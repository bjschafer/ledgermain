/**
 * The 1-point eidolon evolutions a caster with Evolved Summoned Monster
 * (Advanced Class Guide, pg. 146) may hand a summoned creature: "you can
 * select a 1-point evolution other than pounce or reach from those available
 * to a summoner's eidolon." Summarized clean-room from the Advanced Player's
 * Guide summoner evolution list, one line each, for a note-tier picker: the
 * helper prints what the evolution does next to the statblock and never
 * rewrites the statblock for it, since most of these add an attack the base
 * creature's printed line can't honestly absorb.
 *
 * The feat's own limits ride along as flags: "Evolutions that grant additional
 * attacks or enhance existing attacks can be applied only to Medium or larger
 * summoned creatures."
 */

export interface Evolution {
  /** URL slug, stable. */
  slug: string;
  name: string;
  /** What it does, in one sentence, with the base-size damage where the rules print one. */
  text: string;
  /** Adds or enhances an attack: Medium or larger creatures only under Evolved Summoned Monster. */
  attack?: true;
  /** Prerequisite the creature must already satisfy, when the rules name one. */
  requires?: string;
}

export const EVOLUTIONS: readonly Evolution[] = [
  {
    slug: "bite",
    name: "Bite",
    text: "Gains a bite attack (primary natural attack, 1d6 for a Medium creature, 1d8 for Large); if it already has a bite, that bite deals 1-1/2 times its Strength modifier instead.",
    attack: true,
  },
  {
    slug: "claws",
    name: "Claws",
    text: "Gains two claw attacks on a pair of limbs (primary natural attacks, 1d4 each for a Medium creature, 1d6 for Large).",
    attack: true,
    requires: "limbs (arms or legs)",
  },
  {
    slug: "climb",
    name: "Climb",
    text: "Gains a climb speed of 20 feet.",
  },
  {
    slug: "gills",
    name: "Gills",
    text: "Can breathe underwater indefinitely.",
  },
  {
    slug: "improved-damage",
    name: "Improved Damage",
    text: "One natural attack's damage dice increase by one step (1d4 to 1d6, 1d6 to 1d8, 1d8 to 2d6, and so on).",
    attack: true,
  },
  {
    slug: "improved-natural-armor",
    name: "Improved Natural Armor",
    text: "Natural armor bonus to AC increases by 2.",
  },
  {
    slug: "magic-attacks",
    name: "Magic Attacks",
    text: "Its natural attacks count as magic for overcoming damage reduction (and as its alignment once the summoner reaches 10th level).",
    attack: true,
  },
  {
    slug: "mount",
    name: "Mount",
    text: "Combat-trained and shaped to serve as a mount for a rider at least one size category smaller than it.",
  },
  {
    slug: "pincers",
    name: "Pincers",
    text: "Gains two pincer attacks on a pair of limbs (secondary natural attacks, 1d6 each for a Medium creature, 1d8 for Large).",
    attack: true,
    requires: "limbs (arms or legs)",
  },
  {
    slug: "pull",
    name: "Pull",
    text: "One natural attack gains the pull special attack: on a hit, a free combat maneuver check to drag the target 5 feet closer.",
    attack: true,
    requires: "a reach of 10 feet or more",
  },
  {
    slug: "push",
    name: "Push",
    text: "One natural attack gains the push special attack: on a hit, a free bull rush (no attack of opportunity) that moves the target 5 feet away.",
    attack: true,
  },
  {
    slug: "scent",
    name: "Scent",
    text: "Gains the scent special quality.",
  },
  {
    slug: "skilled",
    name: "Skilled",
    text: "A +8 racial bonus on one skill.",
  },
  {
    slug: "slam",
    name: "Slam",
    text: "Gains a slam attack (primary natural attack, 1d8 for a Medium creature, 2d6 for Large).",
    attack: true,
    requires: "limbs (arms)",
  },
  {
    slug: "sting",
    name: "Sting",
    text: "Gains a sting attack on its tail (primary natural attack, 1d4 for a Medium creature, 1d6 for Large).",
    attack: true,
    requires: "a tail",
  },
  {
    slug: "swim",
    name: "Swim",
    text: "Gains a swim speed equal to its base land speed.",
  },
  {
    slug: "tail",
    name: "Tail",
    text: "Grows a long, powerful tail: +2 racial bonus on Acrobatics checks made to balance.",
  },
  {
    slug: "tail-slap",
    name: "Tail Slap",
    text: "Gains a tail slap attack (secondary natural attack, 1d6 for a Medium creature, 1d8 for Large).",
    attack: true,
    requires: "a tail",
  },
  {
    slug: "tentacle",
    name: "Tentacle",
    text: "Gains a tentacle attack (secondary natural attack, 1d4 for a Medium creature, 1d6 for Large).",
    attack: true,
  },
  {
    slug: "wing-buffet",
    name: "Wing Buffet",
    text: "Gains two wing buffet attacks (secondary natural attacks, 1d4 each for a Medium creature, 1d6 for Large).",
    attack: true,
    requires: "wings",
  },
];

export function evolutionBySlug(slug: string): Evolution | undefined {
  return EVOLUTIONS.find((e) => e.slug === slug);
}

const SMALL_OR_SMALLER = new Set(["Fine", "Diminutive", "Tiny", "Small"]);

/** Evolved Summoned Monster's size floor for attack evolutions. */
export function attackEvolutionsAllowed(size: string | undefined): boolean {
  return size === undefined || !SMALL_OR_SMALLER.has(size);
}
