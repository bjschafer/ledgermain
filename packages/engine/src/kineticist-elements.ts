/**
 * Clean-room PF1 kineticist ELEMENT table (Occult Adventures —
 * "the largest single subsystem" in the occult-classes backlog): hand-
 * authored from the published rules (verified against
 * legacy.aonprd.com/d20pfsrd.com's Kineticist class page and Elements
 * appendix), mirroring `occultist-implements.ts`'s posture — the vendored
 * Foundry class def only links the GENERIC "Elemental Focus"/"Elemental
 * Defense"/"Expanded Element" `ClassFeature` stubs (confirmed:
 * `class-features.json` carries no per-element breakdown at all, same
 * "vendored but not linked" shape occultist implements/psychic disciplines
 * document), so there is no upstream JSON to normalize — every element,
 * simple blast, defense wild talent, and composite blast below is
 * hand-authored from the SRD prose, not transcribed from any GPL system
 * file.
 *
 * Scope: all 7 published elements — the 5 core Occult Adventures elements
 * (aether, air, earth, fire, water) plus the two later-splatbook elements
 * (Void, from Horror Adventures; Wood, from a Player Companion). Full parity
 * with the vendored composite-blast catalog too: all 22 published composite
 * blasts are hand-authored below (13 core-element-only + 9 requiring Void
 * and/or Wood).
 *
 * SIMPLE BLASTS: four of the seven elements (air, water, void, wood) RAW offer
 * a CHOICE of two simple blasts each — air blast OR electric blast, water
 * blast OR cold blast, gravity blast OR negative blast, wood blast OR positive
 * blast — picked when the element is gained ({@link
 * KineticistElementDef.alternateSimpleBlast}, recorded in
 * `build.kineticistSimpleBlasts`). Expanding into an element you already have
 * grants the OTHER blast rather than a second choice, which is why {@link
 * knownSimpleBlasts} counts occurrences of a tag across {primary,...expanded}
 * rather than deduping them.
 *
 * That distinction is load-bearing for exactly two composite blasts whose RAW
 * prerequisites name specific ALTERNATE blasts rather than elements (Blizzard
 * Blast needs air blast + cold blast; Charged Water Blast needs electric
 * blast + water blast) — see {@link KineticistCompositeBlastDef.requiredBlasts}.
 * An air+water kineticist qualifies for at most ONE of the two, decided by
 * which blasts she picked; both were previously offered unconditionally.
 * Every other composite is element-gated as before.
 *
 * CLASS SKILLS: each element grants 2 bonus class skills (Elemental Focus:
 * "grants her access to specific wild talents... and additional class skills"
 * — Occult Adventures, per-element Elemental Focus entries, verified against
 * aonprd.com). Wired into `compute.ts`'s `classSkillSet` alongside
 * `cavalierOrder`/`oracleMystery`'s own bonus class skills, gated on the
 * character having kineticist levels — see the primary/expanded-element loop
 * in `computeSkills`.
 *
 * DEFENSE WILD TALENTS: every one of the 7 scales with burn ACCEPTED
 * (variable, "you can accept an additional point of burn to increase..."),
 * which `live.kineticistDefenseBurn` records as a division of the burn the
 * character is already holding. The resolved numbers, and the Changes five of
 * the seven land on, live in `kineticist-defense.ts`; the `summary` below
 * stays the element picker's rules text, and is no longer what the Elemental
 * Defense class-feature row shows.
 *
 * COMPOSITE BLASTS are NOT a budgeted player pick — RAW ("Expanded
 * Element"): "she also gains all composite blast wild talents whose
 * prerequisites she meets" — automatic once the required element(s) are
 * known (primary, or via Expanded Element at 7th/15th). See
 * {@link eligibleCompositeBlasts}, consumed by `archetypes.ts`'s
 * `collectGrantedFeatures` the same way occultist implement schools
 * auto-grant their base/resonant powers.
 */

import type { RefData, SourceRef } from "@pf1/schema";

export type KineticistDamageType = "physical" | "energy";

export interface KineticistSimpleBlast {
  /** Stable slug, unique across all elements (e.g. "fireBlast") — what `build.kineticistSimpleBlasts` stores and `requiredBlasts` names. */
  id: string;
  /** e.g. "Fire Blast". */
  name: string;
  damageType: KineticistDamageType;
  /** e.g. "fire", "bludgeoning", "force". */
  descriptor: string;
}

export interface KineticistDefenseDef {
  name: string;
  /** Full scaling rule, paraphrased from aonprd.com — always burn-scaled, see file doc comment. */
  summary: string;
}

export interface KineticistBasicUtilityDef {
  name: string;
  summary: string;
}

export interface KineticistElementDef {
  /** Matches `build.kineticistElement` / entries of `build.kineticistExpandedElements`. */
  tag: string;
  name: string;
  /** Two bonus class skill ids, wired into `compute.ts`'s `classSkillSet` (see file doc comment). */
  classSkills: string[];
  /** The element's flavor-canonical simple blast — also the default when no explicit choice is recorded. */
  simpleBlast: KineticistSimpleBlast;
  /** The element's second simple blast, for the two elements (air, water) that RAW offer a choice. */
  alternateSimpleBlast?: KineticistSimpleBlast;
  /** Granted automatically at 2nd level for the PRIMARY element only (never for an expanded element). */
  defense: KineticistDefenseDef;
  /** Granted automatically as a bonus wild talent the moment the element is known (primary or expanded). */
  basicUtility: KineticistBasicUtilityDef;
}

const ELEMENT_LIST: KineticistElementDef[] = [
  {
    tag: "aether",
    name: "Aether",
    classSkills: ["ken", "slt"],
    simpleBlast: {
      id: "telekineticBlast",
      name: "Telekinetic Blast",
      damageType: "physical",
      descriptor: "bludgeoning",
    },
    defense: {
      name: "Force Ward",
      summary:
        "Constant ward of force grants temporary hit points equal to kineticist level (regenerates 1/minute); accept 1 burn to increase the ward's maximum.",
    },
    basicUtility: {
      name: "Basic Telekinesis",
      summary:
        "Move an unattended object of up to 5 lbs. per 2 kineticist levels as if with mage hand; can affect magical objects and fashion an aether container for liquids.",
    },
  },
  {
    tag: "air",
    name: "Air",
    classSkills: ["fly", "kna"],
    simpleBlast: {
      id: "airBlast",
      name: "Air Blast",
      damageType: "physical",
      descriptor: "bludgeoning",
    },
    alternateSimpleBlast: {
      id: "electricBlast",
      name: "Electric Blast",
      damageType: "energy",
      descriptor: "electricity",
    },
    defense: {
      name: "Enveloping Winds",
      summary:
        "Ranged attacks with physical weapons suffer a 20% miss chance against you (+5% per 5 kineticist levels beyond 2nd); accept 1 burn to increase the miss chance by 5%.",
    },
    basicUtility: {
      name: "Basic Aerokinesis",
      summary:
        "Create a protective breeze granting +2 on saves vs. gases/wind/extreme heat effects, and mask the scent of a number of creatures up to your Con modifier for 1 hour.",
    },
  },
  {
    tag: "earth",
    name: "Earth",
    classSkills: ["clm", "kdu"],
    simpleBlast: {
      id: "earthBlast",
      name: "Earth Blast",
      damageType: "physical",
      descriptor: "bludgeoning",
    },
    defense: {
      name: "Flesh of Stone",
      summary:
        "Your skin hardens like stone, granting DR 1/adamantine (+1 per 2 kineticist levels beyond 2nd); accept 1 burn to increase the DR by 1. Becomes DR/— for 1 round whenever you accept burn while using an earth wild talent.",
    },
    basicUtility: {
      name: "Basic Geokinesis",
      summary:
        "Move up to 5 lbs. of earth/sand/clay per kineticist level up to 15 ft. as a move action, and search stone/earth within reach as if using the sift cantrip.",
    },
  },
  {
    tag: "fire",
    name: "Fire",
    classSkills: ["esc", "kna"],
    simpleBlast: { id: "fireBlast", name: "Fire Blast", damageType: "energy", descriptor: "fire" },
    defense: {
      name: "Searing Flesh",
      summary:
        "Creatures hitting you with a natural attack or unarmed strike take 1 fire damage per 4 kineticist levels (min 1; doubled while grappling you); accept 1 burn to increase the damage by 1.",
    },
    basicUtility: {
      name: "Basic Pyrokinesis",
      summary:
        "Replicate flare, light, or spark as a spell-like ability at will; light created this way also produces a small amount of heat.",
    },
  },
  {
    tag: "water",
    name: "Water",
    classSkills: ["kna", "swm"],
    simpleBlast: {
      id: "waterBlast",
      name: "Water Blast",
      damageType: "physical",
      descriptor: "bludgeoning",
    },
    alternateSimpleBlast: {
      id: "coldBlast",
      name: "Cold Blast",
      damageType: "energy",
      descriptor: "cold",
    },
    defense: {
      name: "Shroud of Water",
      summary:
        "A shroud of water grants either a +4 armor bonus or a +2 shield bonus to AC (switchable as a standard action), +1 per 4 kineticist levels beyond 2nd; accept 1 burn to increase the bonus by 1.",
    },
    basicUtility: {
      name: "Basic Hydrokinesis",
      summary:
        "Create, purify, or foul up to 5 gallons of water per kineticist level, dry a wet area, or create a mild current — functions as a cross between create water and prestidigitation for water-related tasks.",
    },
  },
  {
    tag: "void",
    name: "Void",
    classSkills: ["esc", "kdu"],
    simpleBlast: {
      id: "gravityBlast",
      name: "Gravity Blast",
      damageType: "physical",
      descriptor: "bludgeoning",
    },
    alternateSimpleBlast: {
      id: "negativeBlast",
      name: "Negative Blast",
      damageType: "energy",
      descriptor: "negative",
    },
    defense: {
      name: "Emptiness",
      summary:
        "Constant negative energy resistance 2, a 5% chance to negate critical hits and sneak attacks, and a +1 bonus on Will saves vs. emotion effects; accept 1 burn to increase the resistance by 2, the negation chance by 5%, and the Will bonus by 1. Accepting burn on a void wild talent temporarily broadens the Will bonus to all mind-affecting effects for 1 round.",
    },
    basicUtility: {
      name: "Basic Chaokinesis",
      summary:
        "Cloak a target in light-blocking shadow, boost a creature's carrying capacity, or grant a +4 Acrobatics bonus to jump — one effect active at a time, lasting 1 hour or until reused.",
    },
  },
  {
    tag: "wood",
    name: "Wood",
    classSkills: ["han", "kna"],
    simpleBlast: {
      id: "woodBlast",
      name: "Wood Blast",
      damageType: "physical",
      // RAW lets the player choose bludgeoning/piercing/slashing per use;
      // this schema's descriptor is a single fixed string (same
      // simplification air/water/earth blast already make), so this
      // defaults to bludgeoning for consistency with those.
      descriptor: "bludgeoning",
    },
    alternateSimpleBlast: {
      id: "positiveBlast",
      name: "Positive Blast",
      damageType: "energy",
      descriptor: "positive",
    },
    defense: {
      name: "Flesh of Wood",
      summary:
        "+1 enhancement bonus to natural armor (an additional +1 burn slot unlocks every 3 kineticist levels beyond 2nd, capping at +7 at 17th level); accept burn to increase the bonus by 1 per point. Accepting burn on a wood wild talent grants your full natural armor bonus as touch AC for 1 round.",
    },
    basicUtility: {
      name: "Basic Phytokinesis",
      summary:
        "Tend or prune plants within 30 ft. without tools, remotely search plant-heavy terrain as the sift cantrip, or concentrate to detect nearby plant life within 120 ft. as detect animals or plants.",
    },
  },
];

export const KINETICIST_ELEMENTS: Record<string, KineticistElementDef> = Object.fromEntries(
  ELEMENT_LIST.map((e) => [e.tag, e]),
);

export const KINETICIST_ELEMENT_TAGS: readonly string[] = ELEMENT_LIST.map((e) => e.tag);

/** Both simple blasts an element offers, canonical first (a one-element array for the three that offer no choice). */
export function elementSimpleBlasts(tag: string): readonly KineticistSimpleBlast[] {
  const element = KINETICIST_ELEMENTS[tag];
  if (!element) return [];
  return element.alternateSimpleBlast
    ? [element.simpleBlast, element.alternateSimpleBlast]
    : [element.simpleBlast];
}

/**
 * The simple blast an element contributes given the player's recorded choice
 * — the canonical blast when nothing is recorded, or when the recorded id
 * isn't one of this element's two (a stale pick left over from a since-changed
 * element, tolerated the same way every other picker tolerates stale ids).
 */
export function chosenSimpleBlast(
  tag: string,
  choices: Readonly<Record<string, string>> = {},
): KineticistSimpleBlast | undefined {
  const blasts = elementSimpleBlasts(tag);
  return blasts.find((b) => b.id === choices[tag]) ?? blasts[0];
}

/**
 * Every simple blast the kineticist actually knows. An element named once
 * across {primary, ...expanded} contributes its chosen blast; an element named
 * TWICE (primary plus an Expanded Element pick of the same element)
 * contributes BOTH of its blasts, per RAW's "she gains the other simple blast
 * of that element" — which is the only way to reach Thunderstorm/Ice Blast.
 */
export function knownSimpleBlasts(
  primaryElement: string | undefined,
  expandedElements: readonly string[],
  choices: Readonly<Record<string, string>> = {},
): KineticistSimpleBlast[] {
  if (!primaryElement) return [];
  const counts = new Map<string, number>();
  for (const tag of [primaryElement, ...expandedElements]) {
    if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const out: KineticistSimpleBlast[] = [];
  for (const [tag, count] of counts) {
    const blasts = elementSimpleBlasts(tag);
    if (count > 1) out.push(...blasts);
    else {
      const chosen = chosenSimpleBlast(tag, choices);
      if (chosen) out.push(chosen);
    }
  }
  return out;
}

export interface KineticistCompositeBlastDef {
  id: string;
  name: string;
  /**
   * Length 2 = two distinct elements both required (order-independent).
   * Length 1 = the SAME element required TWICE — once as primary, once
   * chosen again via Expanded Element ("expand her understanding of an
   * element she already has") — see {@link eligibleCompositeBlasts}.
   */
  requiredElements: string[];
  /**
   * The RAW prerequisite when it names specific SIMPLE BLASTS rather than
   * elements ({@link KineticistSimpleBlast.id}s) — set only for the four
   * composites gated on air's or water's blast choice. When present it
   * REPLACES the `requiredElements` check in {@link eligibleCompositeBlasts};
   * `requiredElements` stays populated so the picker can still group and
   * filter by element.
   */
  requiredBlasts?: string[];
  /**
   * Undefined for a vendored-only entry (see `mergedCompositeBlastCatalog`'s
   * doc comment for why it isn't reliably recoverable from the source for
   * every entry) — never read anywhere in this engine (only
   * `KineticistSimpleBlast.damageType` is), so optional costs nothing.
   */
  damageType?: KineticistDamageType;
  /** Flat per Occult Adventures ("using a composite blast costs 2 points of burn"). */
  burn: 2;
  summary: string;
}

const COMPOSITE_BLAST_LIST: KineticistCompositeBlastDef[] = [
  {
    id: "aethericBoost",
    name: "Aetheric Boost",
    requiredElements: ["aether"],
    damageType: "physical",
    burn: 2,
    summary: "Infuses a simple blast with raw aether, adding 1 point of damage per damage die.",
  },
  {
    id: "blizzardBlast",
    name: "Blizzard Blast",
    requiredElements: ["air", "water"],
    requiredBlasts: ["airBlast", "coldBlast"],
    damageType: "physical",
    burn: 2,
    summary: "A directed blizzard dealing half piercing, half cold damage.",
  },
  {
    id: "blueFlameBlast",
    name: "Blue Flame Blast",
    requiredElements: ["fire"],
    damageType: "energy",
    burn: 2,
    summary: "Concentrates unusually hot blue flame into a single, more focused blast of fire.",
  },
  {
    id: "chargedWaterBlast",
    name: "Charged Water Blast",
    requiredElements: ["air", "water"],
    requiredBlasts: ["electricBlast", "waterBlast"],
    damageType: "physical",
    burn: 2,
    summary: "Slams a foe with electrically charged water, half bludgeoning/half electricity.",
  },
  {
    id: "forceBlast",
    name: "Force Blast",
    requiredElements: ["aether"],
    damageType: "energy",
    burn: 2,
    summary: "A blast of pure force, dealing damage as an energy blast (force descriptor).",
  },
  {
    id: "iceBlast",
    name: "Ice Blast",
    requiredElements: ["water"],
    requiredBlasts: ["waterBlast", "coldBlast"],
    damageType: "physical",
    burn: 2,
    summary: "Shoots chilling icicles, half piercing/half cold damage.",
  },
  {
    id: "magmaBlast",
    name: "Magma Blast",
    requiredElements: ["earth", "fire"],
    damageType: "physical",
    burn: 2,
    summary: "Superheats earth into a flow of magma, half bludgeoning/half fire damage.",
  },
  {
    id: "metalBlast",
    name: "Metal Blast",
    requiredElements: ["earth"],
    damageType: "physical",
    burn: 2,
    summary: "Shapes molten metal into a projectile with a chosen physical damage type.",
  },
  {
    id: "mudBlast",
    name: "Mud Blast",
    requiredElements: ["earth", "water"],
    damageType: "physical",
    burn: 2,
    summary: "Slams a foe with a ball of dense, powerful mud, bludgeoning damage.",
  },
  {
    id: "plasmaBlast",
    name: "Plasma Blast",
    requiredElements: ["air", "fire"],
    damageType: "physical",
    burn: 2,
    summary: "Superheats a gust of air into plasma on impact, half bludgeoning/half fire damage.",
  },
  {
    id: "sandstormBlast",
    name: "Sandstorm Blast",
    requiredElements: ["air", "earth"],
    damageType: "physical",
    burn: 2,
    summary: "Churns sand into a flensing gust, dealing piercing and slashing damage.",
  },
  {
    id: "steamBlast",
    name: "Steam Blast",
    requiredElements: ["fire", "water"],
    damageType: "physical",
    burn: 2,
    summary: "Superheats water into scalding steam on impact, half bludgeoning/half fire damage.",
  },
  {
    id: "thunderstormBlast",
    name: "Thunderstorm Blast",
    requiredElements: ["air"],
    requiredBlasts: ["airBlast", "electricBlast"],
    damageType: "physical",
    burn: 2,
    summary: "Batters foes with electrically charged air, half bludgeoning/half electricity.",
  },
  {
    id: "autumnBlast",
    name: "Autumn Blast",
    requiredElements: ["earth", "wood"],
    requiredBlasts: ["earthBlast", "woodBlast"],
    damageType: "physical",
    burn: 2,
    summary:
      "A burst of rotting leaves and stony debris, splitting damage between any two of bludgeoning, piercing, or slashing (your choice).",
  },
  {
    id: "graviticBoost",
    name: "Gravitic Boost",
    requiredElements: ["void"],
    requiredBlasts: ["gravityBlast"],
    damageType: "physical",
    burn: 2,
    // RAW is a passive modifier upgrading an already-known physical simple
    // blast's damage die (d6 -> d8), not a blast in its own right — modeled
    // in the same shape as its sibling entries anyway, since that's the only
    // vessel available; RAW also requires knowing a SECOND physical simple
    // blast, which `requiredBlasts` (an ALL-of list) can't express as an
    // open choice, so only the fixed anchor blast is enforced here.
    summary:
      "Not a blast in its own right — weights an already-known physical simple blast with gravity, upgrading its damage die from d6 to d8 (or, at 15th level, a known composite blast for +1 burn instead).",
  },
  {
    id: "negativeAdmixture",
    name: "Negative Admixture",
    requiredElements: ["void"],
    requiredBlasts: ["negativeBlast"],
    damageType: "energy",
    burn: 2,
    // RAW also requires knowing a second, chosen energy simple blast — the
    // same open-choice limitation as Gravitic Boost above.
    summary:
      "Blends negative energy with a second energy type of your choosing (fire, cold, electricity, or sonic), half damage each.",
  },
  {
    id: "positiveAdmixture",
    name: "Positive Admixture",
    requiredElements: ["wood"],
    requiredBlasts: ["positiveBlast"],
    damageType: "energy",
    burn: 2,
    summary:
      "As Negative Admixture, but blends positive energy with a second chosen energy type instead.",
  },
  {
    id: "springBlast",
    name: "Spring Blast",
    requiredElements: ["air", "wood"],
    requiredBlasts: ["airBlast", "woodBlast"],
    damageType: "physical",
    burn: 2,
    summary:
      "A wind-driven volley of sharp seed pods and thorny blossoms, half bludgeoning and half your choice of piercing or slashing.",
  },
  {
    id: "summerBlast",
    name: "Summer Blast",
    requiredElements: ["fire", "wood"],
    requiredBlasts: ["fireBlast", "woodBlast"],
    damageType: "physical",
    burn: 2,
    summary:
      "Scorching, sun-dried foliage: half fire damage, half your choice of bludgeoning, piercing, or slashing (a true physical/energy hybrid — this table's `damageType` can't express that; see its doc comment).",
  },
  {
    id: "verdantBlast",
    name: "Verdant Blast",
    requiredElements: ["wood"],
    requiredBlasts: ["woodBlast", "positiveBlast"],
    damageType: "physical",
    burn: 2,
    summary:
      "First-World growth infused with life energy: physical damage (your choice of type) plus a sliver of positive energy that only manifests when it would benefit you.",
  },
  {
    id: "voidBlast",
    name: "Void Blast",
    requiredElements: ["void"],
    requiredBlasts: ["gravityBlast", "negativeBlast"],
    damageType: "physical",
    burn: 2,
    summary:
      "Raw void force crushes and unmakes a target in one blow: a fixed half bludgeoning, half negative energy split, with no damage-type choice.",
  },
  {
    id: "winterBlast",
    name: "Winter Blast",
    requiredElements: ["water", "wood"],
    requiredBlasts: ["coldBlast", "woodBlast"],
    damageType: "physical",
    burn: 2,
    summary:
      "Killing frost tangled with frozen branches: half cold damage, half your choice of bludgeoning, piercing, or slashing.",
  },
];

export const KINETICIST_COMPOSITE_BLASTS: readonly KineticistCompositeBlastDef[] =
  COMPOSITE_BLAST_LIST;

/**
 * Which composite blasts a kineticist currently qualifies for, given her
 * primary element and any Expanded Element picks (RAW: automatic once the
 * prerequisite element(s) are known — never a budgeted pick). A same-element
 * composite (`requiredElements.length === 1`) needs that element as BOTH the
 * primary AND a separately-chosen expanded pick (RAW's "expand her
 * understanding of an element she already has"); a cross-element composite
 * needs both required tags anywhere in {primary,...expanded}.
 *
 * An entry carrying `requiredBlasts` is gated on the SIMPLE BLASTS known
 * ({@link knownSimpleBlasts}) instead — the air/water blast choice decides
 * which of Blizzard Blast / Charged Water Blast an air+water kineticist gets,
 * and both remain out of reach if she picked air blast + water blast.
 *
 * `catalog` defaults to the 22 hand-authored entries but accepts
 * `mergedCompositeBlastCatalog`'s vendored-overlay list (full parity with the
 * 22 hand-authored entries) for a caller that wants vendored prose/sources
 * attached.
 */
export function eligibleCompositeBlasts(
  primaryElement: string | undefined,
  expandedElements: readonly string[],
  catalog: readonly KineticistCompositeBlastDef[] = COMPOSITE_BLAST_LIST,
  blastChoices: Readonly<Record<string, string>> = {},
): KineticistCompositeBlastDef[] {
  if (!primaryElement) return [];
  const known = new Set<string>([primaryElement, ...expandedElements]);
  const knownBlasts = new Set(
    knownSimpleBlasts(primaryElement, expandedElements, blastChoices).map((b) => b.id),
  );
  return catalog.filter((cb) => {
    if (cb.requiredBlasts) return cb.requiredBlasts.every((id) => knownBlasts.has(id));
    if (cb.requiredElements.length === 1) {
      const el = cb.requiredElements[0]!;
      return primaryElement === el && expandedElements.includes(el);
    }
    return cb.requiredElements.every((el) => known.has(el));
  });
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.kineticWildTalents` also carries every published COMPOSITE BLAST
 * (`kind: "compositeBlast"`, see that type's doc comment) — 22 entries, full
 * parity with this file's 22 hand-authored ones — with a reliable
 * `elements`/`burn` (always 2) parse, same stat-line source
 * `kineticist-wild-talents.ts` documents in full. No `damageType`
 * (physical/energy) is recoverable from the source without parsing free prose
 * ("half bludgeoning/half fire damage" etc. — inconsistent phrasing, not worth
 * the guesswork), so a vendored-only composite blast's `damageType` is left
 * undefined rather than fabricated — safe because nothing downstream (the
 * picker's preview, `eligibleCompositeBlasts`) reads it.
 *
 * Collision audit (all 22 hand-authored entries): every one matched a
 * vendored entry by normalized name — no drift, no alias needed. No name
 * collides within the vendored catalog's composite-blast subset either.
 */

/** A composite-blast catalog row the picker/preview can browse — either the hand-authored def (matched) with vendored prose attached, or a vendored-only entry (no `damageType` — see file doc comment). */
export interface MergedCompositeBlastEntry extends KineticistCompositeBlastDef {
  description?: string;
  sources?: SourceRef[];
}

function normalizeCompositeBlastName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The full picker-browsable composite-blast catalog: every vendored
 * `kind: "compositeBlast"` entry, with any that collides (by normalized
 * name) against a hand-authored entry REPLACED by that hand-authored def
 * (keeping its own id/`damageType`, carrying the vendored entry's prose
 * along for display); every vendored-only entry appended with its own
 * parsed `requiredElements`/`burn`. Feed this to {@link eligibleCompositeBlasts}
 * in place of the default hand-only list to include vendored-only composites
 * in eligibility once their required element(s) are known.
 */
export function mergedCompositeBlastCatalog(refData: RefData): MergedCompositeBlastEntry[] {
  const handByNormName = new Map<string, KineticistCompositeBlastDef>();
  for (const cb of COMPOSITE_BLAST_LIST) {
    handByNormName.set(normalizeCompositeBlastName(cb.name), cb);
  }

  const vendored = Object.values(refData.kineticWildTalents ?? {}).filter(
    (t) => t.kind === "compositeBlast",
  );
  const merged: MergedCompositeBlastEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeCompositeBlastName(v.name));
    merged.push(
      handMatch
        ? { ...handMatch, description: v.description, sources: v.sources }
        : {
            id: v.id,
            name: v.name,
            requiredElements: v.elements,
            burn: 2,
            summary: plainTextPreview(v.description ?? ""),
            description: v.description,
            sources: v.sources,
          },
    );
  }
  return merged;
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
