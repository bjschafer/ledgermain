/**
 * Clean-room PF1 kineticist ELEMENT table (Occult Adventures, issue #65 —
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
 * Scope: the 5 CORE Occult Adventures elements (aether, air, earth, fire,
 * water) — the two later-splatbook elements (Void, from Horror Adventures;
 * Wood, from a Player Companion) are OUT OF SCOPE, same "cover the core set,
 * defer the rest" posture `alchemist-discoveries.ts`/`rage-powers.ts` use.
 * Composite blasts requiring Void or Wood are likewise excluded (13 of the
 * published 22 core-book composite blasts qualify with only the 5 core
 * elements — the other 9 are Void/Wood-gated).
 *
 * SIMPLE BLAST SIMPLIFICATION: two of the five elements (air, water) RAW
 * actually offer a CHOICE of two simple blasts each (air blast OR electric
 * blast; water blast OR cold blast) — a kineticist picks ONE at 1st level.
 * This table models only the flavor-canonical blast of each element (Air
 * Blast, Water Blast) and does NOT track which specific simple blast a
 * player chose — matching this codebase's existing `kineticBlastDetail`
 * (`tables.ts`), which already displays kinetic-blast damage generically
 * (physical/energy dice) with no blast-NAME tracking anywhere. A documented
 * consequence: two composite blasts that RAW require the ALTERNATE blast
 * specifically (Blizzard Blast needs "air blast, cold blast"; Charged Water
 * Blast needs "electric blast, water blast") are modeled here as available
 * once BOTH elements are known (air + water), not gated on which specific
 * simple blast was picked — a deliberate simplification in the generous
 * direction (same "near miss, not worth new infra" call `rage-powers.ts`
 * makes for its own conditional gates), not a silent drop.
 *
 * CLASS SKILLS: each element grants 2 bonus class skills (Elemental Focus:
 * "grants her access to specific wild talents ... and additional class
 * skills"). Like `cavalierOrder`/`oracleMystery`'s own bonus class skills,
 * these are NOT wired into `compute.ts`'s `classSkillSet` — a documented
 * gap (see `cavalierOrder`'s schema doc comment for the exact wiring this
 * shares), surfaced as display-only prose on the Elemental Focus grant's
 * `detail` line instead of silently promising a skill-point bonus that
 * isn't applied.
 *
 * DEFENSE WILD TALENTS: every one of the 5 scales with burn ACCEPTED
 * (variable, "you can accept an additional point of burn to increase...")
 * — a live, per-activation player choice this engine's static `Change`
 * system can't safely target as an always-on bonus (same "situational,
 * scales with burn accepted" honesty-bar call the task brief calls out).
 * `KineticistDefenseDef` is therefore `displayOnly` prose only, surfaced via
 * the Elemental Defense class-feature row's `detail` (see `archetypes.ts`).
 *
 * COMPOSITE BLASTS are NOT a budgeted player pick — RAW ("Expanded
 * Element"): "she also gains all composite blast wild talents whose
 * prerequisites she meets" — automatic once the required element(s) are
 * known (primary, or via Expanded Element at 7th/15th). See
 * {@link eligibleCompositeBlasts}, consumed by `archetypes.ts`'s
 * `collectGrantedFeatures` the same way occultist implement schools
 * auto-grant their base/resonant powers.
 */

export type KineticistDamageType = "physical" | "energy";

export interface KineticistSimpleBlast {
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
  /** Two bonus class skill ids (see file doc comment re: the `classSkillSet` wiring gap). */
  classSkills: string[];
  simpleBlast: KineticistSimpleBlast;
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
    simpleBlast: { name: "Telekinetic Blast", damageType: "physical", descriptor: "bludgeoning" },
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
    simpleBlast: { name: "Air Blast", damageType: "physical", descriptor: "bludgeoning" },
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
    simpleBlast: { name: "Earth Blast", damageType: "physical", descriptor: "bludgeoning" },
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
    simpleBlast: { name: "Fire Blast", damageType: "energy", descriptor: "fire" },
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
    simpleBlast: { name: "Water Blast", damageType: "physical", descriptor: "bludgeoning" },
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
];

export const KINETICIST_ELEMENTS: Record<string, KineticistElementDef> = Object.fromEntries(
  ELEMENT_LIST.map((e) => [e.tag, e]),
);

export const KINETICIST_ELEMENT_TAGS: readonly string[] = ELEMENT_LIST.map((e) => e.tag);

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
  damageType: KineticistDamageType;
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
    damageType: "physical",
    burn: 2,
    summary: "Batters foes with electrically charged air, half bludgeoning/half electricity.",
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
 * needs both required tags anywhere in {primary, ...expanded}.
 */
export function eligibleCompositeBlasts(
  primaryElement: string | undefined,
  expandedElements: readonly string[],
): KineticistCompositeBlastDef[] {
  if (!primaryElement) return [];
  const known = new Set<string>([primaryElement, ...expandedElements]);
  return COMPOSITE_BLAST_LIST.filter((cb) => {
    if (cb.requiredElements.length === 1) {
      const el = cb.requiredElements[0]!;
      return primaryElement === el && expandedElements.includes(el);
    }
    return cb.requiredElements.every((el) => known.has(el));
  });
}
