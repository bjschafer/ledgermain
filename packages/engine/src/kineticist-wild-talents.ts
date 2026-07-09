/**
 * Clean-room PF1 kineticist WILD TALENT table (infusions + utility talents,
 * Occult Adventures, issue #65) — hand-authored from the published rules
 * (verified against legacy.aonprd.com/d20pfsrd.com's Kineticist Wild
 * Talents lists), same "vendored but not linked" provenance
 * `kineticist-elements.ts` documents: the vendored Foundry class def only
 * links the generic "Infusion"/"Wild Talents" `ClassFeature` stubs, no
 * per-talent breakdown.
 *
 * SCOPE (curated, not exhaustive — same posture `alchemist-discoveries.ts`/
 * `rage-powers.ts` use for their own oversized SRD catalogs): the published
 * catalog runs to 100+ entries once every element × every splatbook is
 * counted. This table covers, for the 5 core elements:
 *   - EVERY universal infusion and universal utility talent (usable by any
 *     element — a small, closed list, so no curation was needed there).
 *   - A representative 4-6 infusions and 5-6 utility talents PER element,
 *     favoring iconic/commonly-taken options and an even level spread.
 * The remaining element-specific entries (roughly half the published total)
 * are OUT OF SCOPE for this wave — add them in a follow-up.
 *
 * LEVEL GATE: every wild talent has an "effective spell level" 1-9. RAW
 * ("Wild Talents"): "a kineticist can always select 1st-level wild talents,
 * but she can select a wild talent of a higher level only if her kineticist
 * level is at least double the wild talent's effective spell level" — see
 * {@link minKineticistLevelForTalent}. Soft-filtered only (never blocks),
 * same posture as `OccultistFocusPowerDef.minLevel`.
 *
 * SCOPING TO KNOWN ELEMENTS: an element-specific talent is only sensible to
 * pick once that element is known (primary, or via Expanded Element) — the
 * picker UI scopes its menu that way (see `KineticistPicker.tsx`), but this
 * table doesn't hard-enforce it (a stale pick from an since-unpicked element
 * is tolerated, not deleted — same posture `chosenOccultistFocusPowerCount`
 * documents for occultist focus powers).
 *
 * ASSOCIATED BLASTS are recorded as flavor prose in each entry's `summary`
 * only — this engine doesn't track which specific simple/composite blast a
 * player owns (see `kineticist-elements.ts`'s "SIMPLE BLAST SIMPLIFICATION"
 * doc comment), so an infusion's real "Associated Blasts" prerequisite is
 * not enforced, matching the project's hybrid feat-prereq posture (hard-
 * block only on structured signals this engine actually tracks).
 *
 * Every entry here is `displayOnly: true` (activated abilities spent as a
 * standard/move/swift action with their own save/duration — not a passive
 * always-on bonus a sheet `Change` could safely target), same honesty bar
 * `occultist-implements.ts`'s base/menu focus powers and `witch-hexes.ts`
 * use for their own activated abilities.
 */

export type KineticistWildTalentCategory = "infusion" | "utility";
export type KineticistInfusionKind = "form" | "substance";

export interface KineticistWildTalentDef {
  /** Stable slug, unique within its element (or "universal") — id is `"<elementTag>:<slug>"`. */
  slug: string;
  name: string;
  category: KineticistWildTalentCategory;
  /** Only meaningful for `category: "infusion"`. */
  kind?: KineticistInfusionKind;
  /** One of `KINETICIST_ELEMENT_TAGS`, or "universal" for an any-element talent. */
  element: string;
  /** Effective spell level (1-9) — see file doc comment for the level-gate formula. */
  level: number;
  /** Burn cost (0 = no burn, or a RAW "0 or 1"/"variable" cost simplified to its base). */
  burn: number;
  summary: string;
}

/** `level <= 1 ? 1 : 2 * level` — see file doc comment's "LEVEL GATE" section. */
export function minKineticistLevelForTalent(level: number): number {
  return level <= 1 ? 1 : 2 * level;
}

function id(element: string, slug: string): string {
  return `${element}:${slug}`;
}

const UNIVERSAL_INFUSIONS: KineticistWildTalentDef[] = [
  {
    slug: "drainingInfusion",
    name: "Draining Infusion",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 1,
    burn: 1,
    summary:
      "Against a creature with a type/subtype matching your element, deal no damage but instead grant yourself fast healing or a similar benefit for 1 round.",
  },
  {
    slug: "extendedRange",
    name: "Extended Range",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 1,
    burn: 1,
    summary: "Kinetic blast range increases from 30 ft. to 120 ft.",
  },
  {
    slug: "kineticBlade",
    name: "Kinetic Blade",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 1,
    burn: 1,
    summary:
      "Shape your kinetic blast into a non-reach light or one-handed melee weapon, usable to make melee attacks with blast damage.",
  },
  {
    slug: "kineticFist",
    name: "Kinetic Fist",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 1,
    burn: 1,
    summary: "Add a portion of your kinetic blast's damage to a natural attack or unarmed strike.",
  },
  {
    slug: "pushingInfusion",
    name: "Pushing Infusion",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 1,
    burn: 1,
    summary:
      "A hit attempts a bull rush combat maneuver against the target (up to 5 ft., more for extra burn).",
  },
  {
    slug: "extremeRange",
    name: "Extreme Range",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary: "Requires Extended Range; kinetic blast range increases to 480 ft.",
  },
  {
    slug: "flurryOfBlasts",
    name: "Flurry of Blasts",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary:
      "Fire your kinetic blast at full effect against one target and a weaker (1st-level-equivalent) blast against up to 2 more targets within 120 ft.",
  },
  {
    slug: "kineticWhip",
    name: "Kinetic Whip",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary: "As Kinetic Blade, but the weapon has reach and you threaten squares within it.",
  },
  {
    slug: "mobileBlast",
    name: "Mobile Blast",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary:
      "Your blast becomes a mobile mass of elemental matter that lingers in a square, movable as a move action.",
  },
  {
    slug: "snake",
    name: "Snake",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary: "Trace a curving path of up to 120 ft. for your blast, potentially bypassing cover.",
  },
  {
    slug: "torrent",
    name: "Torrent",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary: "Blast becomes a 30-ft. line, dealing half damage (full for energy blasts).",
  },
  {
    slug: "grapplingInfusion",
    name: "Grappling Infusion",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 5,
    burn: 3,
    summary: "A hit attempts a grapple combat maneuver against the target.",
  },
  {
    slug: "wall",
    name: "Wall",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 5,
    burn: 3,
    summary:
      "Create a wall of elemental matter (up to 120 ft. x 10 ft., or 60 ft. x 20 ft.) dealing damage to anything crossing it.",
  },
];

const UNIVERSAL_UTILITY: KineticistWildTalentDef[] = [
  {
    slug: "elementalWhispers",
    name: "Elemental Whispers",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Your element whispers useful information — functions as a limited, element-flavored divination once per day.",
  },
  {
    slug: "skilledKineticist",
    name: "Skilled Kineticist",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Gain a competence bonus equal to 1/2 your kineticist level on one chosen class skill.",
  },
  {
    slug: "skilledKineticistGreater",
    name: "Skilled Kineticist, Greater",
    category: "utility",
    element: "universal",
    level: 2,
    burn: 0,
    summary: "As Skilled Kineticist, but apply the bonus to a second chosen class skill.",
  },
  {
    slug: "elementalGrip",
    name: "Elemental Grip",
    category: "utility",
    element: "universal",
    level: 3,
    burn: 0,
    summary:
      "Functions as hold monster against a creature whose type/subtype matches your element (1 burn to affect a non-matching creature).",
  },
  {
    slug: "elementalWhispersGreater",
    name: "Elemental Whispers, Greater",
    category: "utility",
    element: "universal",
    level: 3,
    burn: 0,
    summary: "As Elemental Whispers, but usable more often and with a broader range of questions.",
  },
  {
    slug: "kineticRestoration",
    name: "Kinetic Restoration",
    category: "utility",
    element: "universal",
    level: 3,
    burn: 1,
    summary:
      "Channel elemental energy through touch to heal 1d6 hit points per kineticist level, split among targets.",
  },
  {
    slug: "expandedDefense",
    name: "Expanded Defense",
    category: "utility",
    element: "universal",
    level: 4,
    burn: 0,
    summary:
      "Gain the defense wild talent of one of your Expanded Element choices (normally withheld).",
  },
  {
    slug: "kineticForm",
    name: "Kinetic Form",
    category: "utility",
    element: "universal",
    level: 5,
    burn: 1,
    summary:
      "Take on a form of your element's matter, growing to Large size (Huge for 2 burn) with associated bonuses.",
  },
  {
    slug: "sparkOfLife",
    name: "Spark of Life",
    category: "utility",
    element: "universal",
    level: 5,
    burn: 1,
    summary:
      "Grant temporary hit points to a number of nearby allies equal to your kineticist level.",
  },
  {
    slug: "rideTheBlast",
    name: "Ride the Blast",
    category: "utility",
    element: "universal",
    level: 6,
    burn: 0,
    summary: "Travel alongside your own kinetic blast to its destination as part of using it.",
  },
  {
    slug: "reverseShift",
    name: "Reverse Shift",
    category: "utility",
    element: "universal",
    level: 8,
    burn: 0,
    summary:
      "Functions as ethereal jaunt, using your element's matter as the conduit to the Ethereal Plane.",
  },
];

const AETHER_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "bowlingInfusion",
    name: "Bowling Infusion",
    category: "infusion",
    kind: "substance",
    element: "aether",
    level: 2,
    burn: 2,
    summary: "A hit against a target attempts a trip combat maneuver (earth/telekinetic blasts).",
  },
  {
    slug: "foeThrow",
    name: "Foe Throw",
    category: "infusion",
    kind: "form",
    element: "aether",
    level: 3,
    burn: 2,
    summary: "Throw a creature as if it were an object; both it and its target take blast damage.",
  },
  {
    slug: "forceHook",
    name: "Force Hook",
    category: "infusion",
    kind: "form",
    element: "aether",
    level: 3,
    burn: 2,
    summary: "Your force blast hooks the target and drags you to a square adjacent to it.",
  },
  {
    slug: "disintegratingInfusion",
    name: "Disintegrating Infusion",
    category: "infusion",
    kind: "substance",
    element: "aether",
    level: 6,
    burn: 4,
    summary:
      "Force blast deals double damage (Fortitude half); a target reduced to 0 hp is disintegrated.",
  },
  {
    slug: "manyThrow",
    name: "Many Throw",
    category: "infusion",
    kind: "form",
    element: "aether",
    level: 8,
    burn: 4,
    summary:
      "Telekinetic blast strikes multiple targets within 120 ft., up to your kineticist level.",
  },
  {
    slug: "selfTelekinesis",
    name: "Self Telekinesis",
    category: "utility",
    element: "aether",
    level: 3,
    burn: 0,
    summary: "Move yourself telekinetically, functioning like a limited levitate/flight burst.",
  },
  {
    slug: "touchsight",
    name: "Touchsight",
    category: "utility",
    element: "aether",
    level: 3,
    burn: 0,
    summary: "Sense your surroundings through aether currents as if with blindsight, short range.",
  },
  {
    slug: "forceBarrier",
    name: "Force Barrier",
    category: "utility",
    element: "aether",
    level: 5,
    burn: 0,
    summary:
      "Create an immobile sphere of force protecting a single square, blocking attacks into it.",
  },
  {
    slug: "aetherPuppet",
    name: "Aether Puppet",
    category: "utility",
    element: "aether",
    level: 5,
    burn: 0,
    summary:
      "Animate an unattended object with strands of aether, functioning as animate objects (one object).",
  },
  {
    slug: "selfTelekinesisGreater",
    name: "Self Telekinesis, Greater",
    category: "utility",
    element: "aether",
    level: 5,
    burn: 0,
    summary: "As Self Telekinesis, with greater range/control over your own telekinetic movement.",
  },
];

const AIR_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "gustingInfusion",
    name: "Gusting Infusion",
    category: "infusion",
    kind: "substance",
    element: "air",
    level: 1,
    burn: 1,
    summary: "Your blast acts as an instantaneous gust of wind centered on the target.",
  },
  {
    slug: "thunderingInfusion",
    name: "Thundering Infusion",
    category: "infusion",
    kind: "substance",
    element: "air",
    level: 1,
    burn: 1,
    summary: "A blast that hits and penetrates spell resistance deafens the target for 1 round.",
  },
  {
    slug: "magneticInfusion",
    name: "Magnetic Infusion",
    category: "infusion",
    kind: "substance",
    element: "air",
    level: 3,
    burn: 2,
    summary:
      "Targets become mildly magnetic; metal weapons gain a +4 bonus on attacks against them.",
  },
  {
    slug: "cyclone",
    name: "Cyclone",
    category: "infusion",
    kind: "form",
    element: "air",
    level: 4,
    burn: 3,
    summary: "Blast becomes a 20-ft.-radius burst centered on you, dealing half damage.",
  },
  {
    slug: "chain",
    name: "Chain",
    category: "infusion",
    kind: "form",
    element: "air",
    level: 5,
    burn: 3,
    summary: "Electric blast leaps between targets, each successive jump dealing 1d6 less damage.",
  },
  {
    slug: "airCushion",
    name: "Air Cushion",
    category: "utility",
    element: "air",
    level: 1,
    burn: 0,
    summary: "Constant feather fall effect.",
  },
  {
    slug: "aerialAdaptation",
    name: "Aerial Adaptation",
    category: "utility",
    element: "air",
    level: 1,
    burn: 0,
    summary: "Immune to altitude sickness; gain resistance to electricity.",
  },
  {
    slug: "airsLeap",
    name: "Air's Leap",
    category: "utility",
    element: "air",
    level: 1,
    burn: 0,
    summary: "Multiply the distance of your jumps, as if under a constant jump effect.",
  },
  {
    slug: "aerialEvasion",
    name: "Aerial Evasion",
    category: "utility",
    element: "air",
    level: 3,
    burn: 1,
    summary: "Gain evasion against area-effect attacks (as the rogue class feature) for 1 round.",
  },
  {
    slug: "celerity",
    name: "Celerity",
    category: "utility",
    element: "air",
    level: 3,
    burn: 1,
    summary: "Grant yourself and nearby allies haste for 1 round.",
  },
  {
    slug: "windsight",
    name: "Windsight",
    category: "utility",
    element: "air",
    level: 3,
    burn: 0,
    summary: "See clearly through wind, fog, and similar obscuring weather effects.",
  },
];

const EARTH_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "bowlingInfusion",
    name: "Bowling Infusion",
    category: "infusion",
    kind: "substance",
    element: "earth",
    level: 2,
    burn: 2,
    summary:
      "A hit against a target attempts a trip combat maneuver (earth/metal/mud/magma blasts).",
  },
  {
    slug: "entanglingInfusion",
    name: "Entangling Infusion",
    category: "infusion",
    kind: "substance",
    element: "earth",
    level: 2,
    burn: 2,
    summary: "Targets hit become entangled; a second hit roots them to the ground.",
  },
  {
    slug: "rareMetalInfusion",
    name: "Rare-metal Infusion",
    category: "infusion",
    kind: "substance",
    element: "earth",
    level: 3,
    burn: 2,
    summary: "Metal blast is treated as adamantine, cold iron, silver, or gold for bypassing DR.",
  },
  {
    slug: "deadlyEarth",
    name: "Deadly Earth",
    category: "infusion",
    kind: "form",
    element: "earth",
    level: 6,
    burn: 4,
    summary:
      "Infuse a 20-ft. ground area that deals damage to (and counts as difficult terrain for) creatures entering it.",
  },
  {
    slug: "fragmentation",
    name: "Fragmentation",
    category: "infusion",
    kind: "form",
    element: "earth",
    level: 7,
    burn: 4,
    summary:
      "Throw a volatile sphere: the primary target takes full damage, a burst around it takes half.",
  },
  {
    slug: "kineticCover",
    name: "Kinetic Cover",
    category: "utility",
    element: "earth",
    level: 1,
    burn: 0,
    summary: "Raise a barrier of earth granting cover or improved cover against attacks.",
  },
  {
    slug: "earthClimb",
    name: "Earth Climb",
    category: "utility",
    element: "earth",
    level: 2,
    burn: 0,
    summary: "Gain a climb speed equal to your land speed on stone and earth surfaces.",
  },
  {
    slug: "jaggedFlesh",
    name: "Jagged Flesh",
    category: "utility",
    element: "earth",
    level: 3,
    burn: 1,
    summary: "Push jagged rock shards from your skin, damaging creatures that strike you in melee.",
  },
  {
    slug: "shiftEarth",
    name: "Shift Earth",
    category: "utility",
    element: "earth",
    level: 4,
    burn: 0,
    summary: "Move 5-ft. cubes of earth to reshape terrain, as a limited move earth.",
  },
  {
    slug: "earthGlide",
    name: "Earth Glide",
    category: "utility",
    element: "earth",
    level: 5,
    burn: 0,
    summary: "Burrow through stone/earth/sand as easily as an earth elemental, leaving no tunnel.",
  },
];

const FIRE_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "burningInfusion",
    name: "Burning Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 1,
    burn: 1,
    summary: "Targets catch fire, taking 1d6 fire damage per round until extinguished.",
  },
  {
    slug: "fanOfFlames",
    name: "Fan of Flames",
    category: "infusion",
    kind: "form",
    element: "fire",
    level: 1,
    burn: 1,
    summary: "Blast extends into a 15-ft. cone, damaging all creatures within.",
  },
  {
    slug: "eruption",
    name: "Eruption",
    category: "infusion",
    kind: "form",
    element: "fire",
    level: 3,
    burn: 2,
    summary:
      "A pillar of elemental fury erupts from the ground in a 10-ft.-radius, 40-ft.-high column.",
  },
  {
    slug: "flashInfusion",
    name: "Flash Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 4,
    burn: 3,
    summary: "A hit blinds the target for 1 round unless it succeeds at a Will save.",
  },
  {
    slug: "unravelingInfusion",
    name: "Unraveling Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 5,
    burn: 3,
    summary: "Blast burns away magic, functioning as a targeted dispel magic attempt on a hit.",
  },
  {
    slug: "heatAdaptation",
    name: "Heat Adaptation",
    category: "utility",
    element: "fire",
    level: 1,
    burn: 0,
    summary: "Endure elements against heat, and gain resist fire.",
  },
  {
    slug: "coldAdaptation",
    name: "Cold Adaptation",
    category: "utility",
    element: "fire",
    level: 1,
    burn: 0,
    summary: "Endure elements against cold, and gain resist cold.",
  },
  {
    slug: "fireSculptor",
    name: "Fire Sculptor",
    category: "utility",
    element: "fire",
    level: 1,
    burn: 0,
    summary: "Reshape existing flames and control how fire you create spreads.",
  },
  {
    slug: "flameJet",
    name: "Flame Jet",
    category: "utility",
    element: "fire",
    level: 3,
    burn: 0,
    summary: "Propel yourself up to 60 ft. through the air via a thrust of fire.",
  },
  {
    slug: "heatWave",
    name: "Heat Wave",
    category: "utility",
    element: "fire",
    level: 3,
    burn: 1,
    summary: "Create a distorting aura of heat around you, hampering foes' accuracy.",
  },
  {
    slug: "flameShield",
    name: "Flame Shield",
    category: "utility",
    element: "fire",
    level: 5,
    burn: 1,
    summary: "Surround yourself with flame, gaining the benefits of a fire shield spell.",
  },
];

const WATER_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "quenchingInfusion",
    name: "Quenching Infusion",
    category: "infusion",
    kind: "substance",
    element: "water",
    level: 1,
    burn: 1,
    summary:
      "Blast douses nonmagical fires it strikes; more burn dispels magical fire effects too.",
  },
  {
    slug: "entanglingInfusion",
    name: "Entangling Infusion",
    category: "infusion",
    kind: "substance",
    element: "water",
    level: 2,
    burn: 2,
    summary: "Targets hit become entangled; a second hit roots them to the ground.",
  },
  {
    slug: "spray",
    name: "Spray",
    category: "infusion",
    kind: "form",
    element: "water",
    level: 4,
    burn: 3,
    summary: "Blast diffuses into a 30-ft. cone, dealing half normal damage.",
  },
  {
    slug: "chillingInfusion",
    name: "Chilling Infusion",
    category: "infusion",
    kind: "substance",
    element: "water",
    level: 5,
    burn: 3,
    summary: "Targets hit by the cold damage become staggered for 1 round.",
  },
  {
    slug: "kineticCover",
    name: "Kinetic Cover",
    category: "utility",
    element: "water",
    level: 1,
    burn: 0,
    summary: "Raise a barrier of water granting cover or improved cover against attacks.",
  },
  {
    slug: "heatAdaptation",
    name: "Heat Adaptation",
    category: "utility",
    element: "water",
    level: 1,
    burn: 0,
    summary: "Endure elements against heat, and gain resist fire.",
  },
  {
    slug: "coldAdaptation",
    name: "Cold Adaptation",
    category: "utility",
    element: "water",
    level: 1,
    burn: 0,
    summary: "Endure elements against cold, and gain resist cold.",
  },
  {
    slug: "kineticHealer",
    name: "Kinetic Healer",
    category: "utility",
    element: "water",
    level: 1,
    burn: 1,
    summary:
      "Heal a touched creature a number of hit points equal to your unmodified blast damage.",
  },
  {
    slug: "coldSnap",
    name: "Cold Snap",
    category: "utility",
    element: "water",
    level: 3,
    burn: 1,
    summary: "Create a numbing cold aura that saps the Dexterity of nearby foes.",
  },
  {
    slug: "iceSculptor",
    name: "Ice Sculptor",
    category: "utility",
    element: "water",
    level: 4,
    burn: 0,
    summary: "Shape ice and snow as if with stone shape.",
  },
];

const ALL_TALENTS: KineticistWildTalentDef[] = [
  ...UNIVERSAL_INFUSIONS,
  ...UNIVERSAL_UTILITY,
  ...AETHER_TALENTS,
  ...AIR_TALENTS,
  ...EARTH_TALENTS,
  ...FIRE_TALENTS,
  ...WATER_TALENTS,
];

/** Every wild talent keyed by `"<elementTag-or-universal>:<slug>"`. */
export const KINETICIST_WILD_TALENTS: Record<string, KineticistWildTalentDef> = Object.fromEntries(
  ALL_TALENTS.map((t) => [id(t.element, t.slug), t]),
);

/** Look up a wild talent by its `"<elementTag>:<slug>"` id. */
export function findKineticistWildTalent(talentId: string): KineticistWildTalentDef | undefined {
  return KINETICIST_WILD_TALENTS[talentId];
}

/** Every talent id for a given element (excludes "universal" — callers union it in separately). */
export function wildTalentsForElement(elementTag: string): string[] {
  return ALL_TALENTS.filter((t) => t.element === elementTag).map((t) => id(t.element, t.slug));
}

/** Every universal talent id (any element). */
export const KINETICIST_UNIVERSAL_TALENT_IDS: readonly string[] = [
  ...UNIVERSAL_INFUSIONS,
  ...UNIVERSAL_UTILITY,
].map((t) => id(t.element, t.slug));
