/**
 * Clean-room PF1 shaman spirit table (Advanced Class Guide, DESIGN §6,
 * issue #65): hand-authored, mirroring `oracle-mysteries.ts`'s posture
 * closely — a shaman's Spirit class feature is structurally the oracle's
 * Mystery under a different name (per the vendored `spirit.yaml` class
 * feature: "If the shaman takes levels in another class that grants a
 * mystery (such as the oracle), the spirit and mystery must match"), but its
 * SPIRIT MAGIC spell list is NOT byte-identical to the matching oracle
 * mystery's bonus-spell list (verified during authoring — e.g. Waves' 1st
 * spirit-magic spell is Hydraulic Push, not the Waves mystery's Touch of the
 * Sea), so it is hand-copied from the shaman-specific vendored YAML rather
 * than reused from `ORACLE_MYSTERIES`.
 *
 * Scope: the 8 Advanced Class Guide "core" spirits (Battle, Bones, Flame,
 * Heavens, Life, Nature, Stone, Waves — verified against aonprd.com's
 * "Spirits - Shaman" index). The vendored Foundry pack ships several more
 * from later splatbooks (Ancestors, Dark Tapestry, Frost, Lore, Mammoth,
 * Slums, Tribe, Wind, Wood — see `packs/class-abilities/shaman-spirits/`),
 * out of scope, same posture as `oracle-mysteries.ts`'s 10-of-many scope note.
 *
 * Data provenance:
 *   - `spiritMagicSpells` ids are copied VERBATIM from the `@UUID[Compendium.
 *     pf1.spells.<id>]` references embedded in each spirit's OWN vendored
 *     prose (`packs/class-abilities/shaman-spirits/<spirit>.*.yaml` —
 *     individually vendored, like oracle mysteries, but NOT linked from the
 *     Shaman class def, which only links the generic "Spirit" stub — same
 *     "hand-author from the cached-but-unlinked YAML" shape `oracle-
 *     mysteries.ts`/`psychic-disciplines.ts` already use). `level` here is
 *     the SPELL's own level (1st-9th), NOT a shaman class-level threshold —
 *     unlike `OracleMysteryBonusSpell.level`, because the vendored prose
 *     itself labels each entry "1st -", "2nd -", ... "9th -" by spell level
 *     directly (RAW: "she has one spell slot per day of each shaman spell
 *     level she can cast" — availability is gated by
 *     `accessibleSpellLevels(CASTER_MODELS.shaman, shamanLevel)`, evaluated
 *     in `apps/web/src/model/spellcasting.ts`'s `shamanSpiritSpellsKnown`,
 *     not a fixed per-spell unlock level baked into this table).
 *   - `ability` (the spirit's 1st-level Spirit Ability, e.g. Battle's "Battle
 *     Spirit") is note-tier/prose ONLY (`summary`, no `Change[]`) — same
 *     posture as `oracle-revelations.ts`'s entries and for the same reason:
 *     each ability is either an activated melee-touch-attack power (Bones'
 *     Touch of the Grave, Flame's Touch of Flame, Stone's Touch of Acid,
 *     Waves' Wave Strike — situational, no baseline sheet number), a
 *     party-buff (Battle Spirit's ally aura), or a save-forcing debuff
 *     (Heavens' Stardust, Nature's Storm Burst, Life's Channel) — none of
 *     which has a flat always-on number this engine's `changes[]` pipeline
 *     could apply. Verified against aonprd.com's per-spirit pages during
 *     authoring (Battle's ability additionally matches the vendored
 *     `battle-spirit-ability.QGEEtV5NqZbomKE6.yaml`'s `uses.maxFormula: "3 +
 *     @abilities.cha.mod"` — cited in `summary` as prose only, since the
 *     other 7 spirits' per-day formulas aren't independently vendored and
 *     wiring a REAL resource pool for one spirit but not the other seven
 *     would be an inconsistent, confusing half-measure).
 *   - `hexes`: each spirit grants access to 5 exclusive hexes via the
 *     shaman's Hex/Wandering Hex class features (see `model/shamanHexes.ts`
 *     for the pick-level budget). Verified against aonprd.com's per-spirit
 *     pages. Every entry is `displayOnly: true` (`changes: []`) — a numeric
 *     witch/shaman hex-effects table is out of scope here (another agent
 *     may be building witch's hex
 *     table in parallel — this module intentionally does NOT share a hex
 *     table with witch, to avoid stepping on that work).
 *   - `spiritAnimalNote` is the spirit's "Spirit Animal" flavor bonus prose
 *     (display-only — the shaman's "spirit animal" is a familiar-like
 *     conduit for preparing spells, not a trackable creature this app models
 *     as a stat block, unlike `@pf1/engine` `companion.ts`'s animal
 *     companion).
 */

import type { RefData, ShamanSpirit, SourceRef } from "@pf1/schema";

export interface ShamanSpiritMagicSpell {
  /** The spell's own level, 1-9 (see file doc comment — NOT a shaman class-level threshold). */
  level: number;
  /** Vendored Foundry spell id (`RefData.spells` key). */
  id: string;
  /** Display name, for readability here and as a display fallback. */
  name: string;
}

export interface ShamanSpiritAbility {
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
}

export interface ShamanSpiritHex {
  /** `<spiritTag>:<camelCaseName>` — unique across every spirit. */
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
}

export interface ShamanSpiritDef {
  /** Matches `doc.build.shamanSpirit` keys. */
  tag: string;
  name: string;
  spiritMagicSpells: ShamanSpiritMagicSpell[];
  /** 1st-level Spirit Ability — note-tier, see file doc comment. */
  ability: ShamanSpiritAbility;
  /** The 5 hexes this spirit grants access to (see `model/shamanHexes.ts`). */
  hexes: ShamanSpiritHex[];
  /** "Spirit Animal" flavor bonus — display-only prose (see file doc comment). */
  spiritAnimalNote: string;
}

function hex(spiritTag: string, id: string, name: string, summary: string): ShamanSpiritHex {
  return { id: `${spiritTag}:${id}`, name, summary };
}

const SPIRIT_LIST: ShamanSpiritDef[] = [
  {
    tag: "battle",
    name: "Battle",
    spiritMagicSpells: [
      { level: 1, id: "jnlr9cuepka1l26e", name: "Enlarge Person" },
      { level: 2, id: "g33euis7yi9pwddy", name: "Fog Cloud" },
      { level: 3, id: "73han2zqxg59u18g", name: "Magic Vestment" },
      { level: 4, id: "92hth51cs9oi0nfe", name: "Wall of Fire" },
      { level: 5, id: "6ax0ythzw8n4bta8", name: "Righteous Might" },
      { level: 6, id: "8xjcrqg79ugxu5qu", name: "Mass Bull's Strength" },
      { level: 7, id: "578t0lra5ll3aifs", name: "Control Weather" },
      { level: 8, id: "a5gcbpwfhu4hh5ic", name: "Earthquake" },
      { level: 9, id: "n4e35m6qu9nmkhgm", name: "Storm of Vengeance" },
    ],
    ability: {
      name: "Battle Spirit",
      summary:
        "Allies within 30 ft. (including the shaman) gain a +1 morale bonus on attack rolls and weapon damage rolls (+2 at 8th level, +3 at 16th). Usable 3 + Cha modifier rounds/day, not necessarily consecutive.",
    },
    hexes: [
      hex(
        "battle",
        "battleMaster",
        "Battle Master",
        "Grant an ally a bonus combat feat for 1 round, using the shaman's own base attack bonus to qualify.",
      ),
      hex(
        "battle",
        "battleWard",
        "Battle Ward",
        "Grant a touched creature a scaling deflection bonus to AC for a number of rounds.",
      ),
      hex(
        "battle",
        "curseOfSuffering",
        "Curse of Suffering",
        "Curse a creature so its critical hit multiplier drops by 1 (minimum x2) for a number of rounds.",
      ),
      hex(
        "battle",
        "eyesOfBattle",
        "Eyes of Battle",
        "Grant an ally a scaling insight bonus on initiative checks and a limited number of extra AoOs.",
      ),
      hex(
        "battle",
        "hamperingHex",
        "Hampering Hex",
        "Curse a creature with a penalty to its speed for a number of rounds.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks fiercer and gains a +2 natural armor bonus to AC (or +2 more if it already has one).",
  },
  {
    tag: "bones",
    name: "Bones",
    spiritMagicSpells: [
      { level: 1, id: "9tww9fc9049h6iqc", name: "Cause Fear" },
      { level: 2, id: "3ze0kso9hxff5u2f", name: "False Life" },
      { level: 3, id: "8uwmrygxgih1fb57", name: "Animate Dead" },
      { level: 4, id: "be88e90guqbi1q1z", name: "Fear" },
      { level: 5, id: "dg3mrasygkm83c3e", name: "Slay Living" },
      { level: 6, id: "3a162m66toj22fpa", name: "Circle of Death" },
      { level: 7, id: "wkp8u7xl1dgpk362", name: "Control Undead" },
      { level: 8, id: "e8zen5nzixnt7bde", name: "Horrid Wilting" },
      { level: 9, id: "wplgawb6aznjx7se", name: "Wail of the Banshee" },
    ],
    ability: {
      name: "Touch of the Grave",
      summary:
        "Standard action melee touch attack infused with negative energy: 1d4 damage + 1 per 2 shaman levels.",
    },
    hexes: [
      hex(
        "bones",
        "boneLock",
        "Bone Lock",
        "Bind a corpse-based construct or undead more securely to the shaman's control.",
      ),
      hex(
        "bones",
        "boneWard",
        "Bone Ward",
        "Grant a touched creature a scaling armor bonus to AC from spectral bone plating.",
      ),
      hex(
        "bones",
        "deathlyBeing",
        "Deathly Being",
        "Gain a scaling resistance to death effects, energy drain, and similar necromantic hazards.",
      ),
      hex(
        "bones",
        "fearfulGaze",
        "Fearful Gaze",
        "Force a creature within range to make a Will save or become shaken, then frightened at higher levels.",
      ),
      hex(
        "bones",
        "graveSight",
        "Grave Sight",
        "Detect undead within range and sense how a nearby corpse died.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal glows ghostly and is under a constant blur effect at the shaman's caster level.",
  },
  {
    tag: "flame",
    name: "Flame",
    spiritMagicSpells: [
      { level: 1, id: "lndeaqm2j2nvgm6p", name: "Burning Hands" },
      { level: 2, id: "tkjnm3lw7ni82tag", name: "Resist Energy" },
      { level: 3, id: "6oq1wcryviik9ice", name: "Fireball" },
      { level: 4, id: "92hth51cs9oi0nfe", name: "Wall of Fire" },
      { level: 5, id: "hd7ukybisvv7j5r6", name: "Summon Monster V (fire elementals only)" },
      { level: 6, id: "0hknfnoaljc75fj3", name: "Fire Seeds" },
      { level: 7, id: "9wl8ijy6argdvz5f", name: "Fire Storm" },
      { level: 8, id: "iq0as5470o8q9y39", name: "Incendiary Cloud" },
      { level: 9, id: "qk3oeq4awbc1smjw", name: "Fiery Body" },
    ],
    ability: {
      name: "Touch of Flame",
      summary: "Standard action melee touch attack: 1d6 fire damage + 1 per 2 shaman levels.",
    },
    hexes: [
      hex(
        "flame",
        "cinderDance",
        "Cinder Dance",
        "Gain a scaling enhancement bonus to speed and bonus feats related to mobility at higher levels.",
      ),
      hex(
        "flame",
        "fireNimbus",
        "Fire Nimbus",
        "Curse a creature to shed light and take a penalty against fire effects.",
      ),
      hex(
        "flame",
        "flameCurse",
        "Flame Curse",
        "Curse a creature with vulnerability to fire damage for a number of rounds.",
      ),
      hex(
        "flame",
        "gazeOfFlames",
        "Gaze of Flames",
        "See through fire and smoke without penalty; scry through flames at higher levels.",
      ),
      hex(
        "flame",
        "wardOfFlames",
        "Ward of Flames",
        "Grant a touched creature protection that burns melee attackers with fire damage.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal is wreathed in a warm, harmless nimbus of flame, is immune to fire damage, and is vulnerable to cold.",
  },
  {
    tag: "heavens",
    name: "Heavens",
    spiritMagicSpells: [
      { level: 1, id: "qcjskol4ac3eemhy", name: "Color Spray" },
      { level: 2, id: "zyfm6dq35i4hip4u", name: "Hypnotic Pattern" },
      { level: 3, id: "7x2z0i8rcx7s81fk", name: "Daylight" },
      { level: 4, id: "6lebv7569xsypp8u", name: "Rainbow Pattern" },
      { level: 5, id: "wqvy12w1xgk6l9b0", name: "Overland Flight" },
      { level: 6, id: "6vfauefzzmwl4az7", name: "Chain Lightning" },
      { level: 7, id: "mb819hvwpk0zmw53", name: "Prismatic Spray" },
      { level: 8, id: "j2mwv9wfxhqch10g", name: "Sunburst" },
      { level: 9, id: "xhzme0v6tjq95fg6", name: "Meteor Swarm" },
    ],
    ability: {
      name: "Stardust",
      summary:
        "Standard action: stardust materializes around a creature within 30 ft., making it shed light like a candle and denying it the benefit of concealment or invisibility, plus a scaling penalty to attack rolls and sight-based Perception checks for several rounds. Usable a number of times/day tied to Charisma modifier.",
    },
    hexes: [
      hex(
        "heavens",
        "envelopingVoid",
        "Enveloping Void",
        "Curse a creature so its darkvision and low-light vision fail and it takes a penalty on sight-based checks in dim light or darkness.",
      ),
      hex(
        "heavens",
        "guidingStar",
        "Guiding Star",
        "Never get lost outdoors at night and gain a bonus on Survival checks to navigate by starlight.",
      ),
      hex(
        "heavens",
        "heavensLeap",
        "Heaven's Leap",
        "Gain a scaling bonus on Acrobatics checks to jump and take no falling damage from a fall the shaman survives.",
      ),
      hex(
        "heavens",
        "lureOfTheHeavens",
        "Lure of the Heavens",
        "Gain progressively better unassisted movement: untrackable, then hovering, at higher levels.",
      ),
      hex(
        "heavens",
        "starburn",
        "Starburn",
        "Curse a creature so it takes a penalty against death effects and energy drain the shaman herself is resistant to.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal's flesh reflects the visible night sky and can be read as a star map; it gains (or improves) a fly speed.",
  },
  {
    tag: "life",
    name: "Life",
    spiritMagicSpells: [
      { level: 1, id: "aa0w7tk852iqn3ni", name: "Detect Undead" },
      { level: 2, id: "fxz69pwpqt9b6uss", name: "Lesser Restoration" },
      { level: 3, id: "6l904edkt8jv9jor", name: "Neutralize Poison" },
      { level: 4, id: "anya5qwdjhdfyk8u", name: "Restoration" },
      { level: 5, id: "qiiis9ekgy3syu7j", name: "Breath of Life" },
      { level: 6, id: "4re1j2w8wkvsvnsi", name: "Heal" },
      { level: 7, id: "igmb8lisqcnsxd2d", name: "Greater Restoration" },
      { level: 8, id: "klcvk9ct1l7mhjwp", name: "Mass Heal" },
      { level: 9, id: "mxqi375ya2rka7cp", name: "True Resurrection" },
    ],
    ability: {
      name: "Channel",
      summary:
        "Channel positive energy like a cleric, using the shaman's level as her effective cleric level for the amount healed/dealt and the save DC. Usable 1 + Cha modifier times/day.",
    },
    hexes: [
      hex(
        "life",
        "curseOfSuffering",
        "Curse of Suffering",
        "Curse a creature so its critical hit multiplier drops by 1 (minimum x2) for a number of rounds.",
      ),
      hex(
        "life",
        "denySuccor",
        "Deny Succor",
        "Curse a creature so it heals only half the normal amount from magical healing for a number of rounds.",
      ),
      hex(
        "life",
        "enhancedCures",
        "Enhanced Cures",
        "The shaman's cure spells heal beyond their normal die-roll cap, scaling with her level.",
      ),
      hex(
        "life",
        "lifeLink",
        "Life Link",
        "Bond to a creature: it heals automatically each round it is wounded, at the cost of the shaman's own hit points.",
      ),
      hex(
        "life",
        "lifeSight",
        "Life Sight",
        "Sense living and undead creatures within range as if by blindsight for them.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks unusually healthy and vibrant, and gains (or improves) fast healing 1.",
  },
  {
    tag: "nature",
    name: "Nature",
    spiritMagicSpells: [
      { level: 1, id: "pg7dbmuuaksxhp3v", name: "Charm Animal" },
      { level: 2, id: "la7kuehewu85ybnt", name: "Barkskin" },
      { level: 3, id: "rrsefzpm3nhztvld", name: "Speak with Plants" },
      { level: 4, id: "0sssdtv0tkbns2r3", name: "Grove of Respite" },
      { level: 5, id: "h9qiwo9kx8d1hqrn", name: "Awaken" },
      { level: 6, id: "wgm8mm1za909pwch", name: "Stone Tell" },
      { level: 7, id: "f828mjoo5afszqnk", name: "Creeping Doom" },
      { level: 8, id: "3ah9mmg0odateh8l", name: "Animal Shapes" },
      { level: 9, id: "refg1teqkrdtxllg", name: "World Wave" },
    ],
    ability: {
      name: "Storm Burst",
      summary:
        "Standard action: a small storm of swirling wind and rain forms around a creature within 30 ft., granting a 20% miss chance against it for 1 round + 1 round per 4 shaman levels.",
    },
    hexes: [
      hex(
        "nature",
        "entanglingCurse",
        "Entangling Curse",
        "Immobilize a creature within 30 ft. with grasping plants for a number of rounds equal to the shaman's Charisma modifier.",
      ),
      hex(
        "nature",
        "erosionCurse",
        "Erosion Curse",
        "Deal damage to constructs and objects, ignoring hardness and damage reduction.",
      ),
      hex(
        "nature",
        "friendToAnimals",
        "Friend to Animals",
        "Spontaneously cast summon nature's ally spells; nearby animals gain a bonus on their saving throws.",
      ),
      hex(
        "nature",
        "speakWithAnimals",
        "Speak with Animals",
        "Communicate with one type of animal, gaining additional types at higher levels.",
      ),
      hex(
        "nature",
        "stormwalker",
        "Stormwalker",
        "Move unimpeded through fog, rain, snow, and similar environmental effects.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks feral and can move through undergrowth or natural difficult terrain at full speed unimpeded.",
  },
  {
    tag: "stone",
    name: "Stone",
    spiritMagicSpells: [
      { level: 1, id: "fv9mgob508qv99zz", name: "Magic Stone" },
      { level: 2, id: "gqtg9ruv8kkd0knf", name: "Stone Call" },
      { level: 3, id: "dkv9v4verb82fmpx", name: "Meld into Stone" },
      { level: 4, id: "l83djt5019ujasjh", name: "Wall of Stone" },
      { level: 5, id: "knyako6zopc1chrv", name: "Stoneskin" },
      { level: 6, id: "wgm8mm1za909pwch", name: "Stone Tell" },
      { level: 7, id: "g52zx1t1giteg5h1", name: "Statue" },
      { level: 8, id: "oeemcnfjod9zd7my", name: "Repel Metal or Stone" },
      { level: 9, id: "o8jhvddxgunzx94i", name: "Clashing Rocks" },
    ],
    ability: {
      name: "Touch of Acid",
      summary:
        "Standard action melee touch attack: 1d6 acid damage + 1 per 2 shaman levels. Usable 3 + Cha modifier times/day; at 11th level the shaman's weapons are treated as corrosive.",
    },
    hexes: [
      hex(
        "stone",
        "crystalSight",
        "Crystal Sight",
        "See through stone, earth, or sand as if they were transparent, for a number of rounds/day.",
      ),
      hex(
        "stone",
        "lodestone",
        "Lodestone",
        "Curse a creature to become heavy and lethargic, imposing a penalty to speed and Reflex saves.",
      ),
      hex(
        "stone",
        "metalCurse",
        "Metal Curse",
        "Curse a creature to become slightly magnetic, taking an AC penalty against metal weapons.",
      ),
      hex(
        "stone",
        "stoneStability",
        "Stone Stability",
        "Gain a bonus to CMD against bull rush and trip attempts, plus related bonus feats at higher levels.",
      ),
      hex(
        "stone",
        "wardOfStone",
        "Ward of Stone",
        "Grant a touched creature temporary damage reduction 5/adamantine.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks stony, with gemstones embedded in its flesh, and gains DR 5/adamantine.",
  },
  {
    tag: "waves",
    name: "Waves",
    spiritMagicSpells: [
      { level: 1, id: "ohy0ty2dawfaaqwd", name: "Hydraulic Push" },
      { level: 2, id: "7fvsn0gbv6ynlp63", name: "Slipstream" },
      { level: 3, id: "7m5us8d4a9lwh1ap", name: "Water Breathing" },
      { level: 4, id: "ijui94bv4uzu8awb", name: "Wall of Ice" },
      { level: 5, id: "nll8ip8348eti0ff", name: "Geyser" },
      { level: 6, id: "h4nlrm44ubsyzuhz", name: "Fluid Form" },
      { level: 7, id: "tpid8izzs2rrfxv3", name: "Vortex" },
      { level: 8, id: "o4rwtizvdj7216qd", name: "Seamantle" },
      { level: 9, id: "ltda70etgwje43x6", name: "Tsunami" },
    ],
    ability: {
      name: "Wave Strike",
      summary:
        "Standard action melee touch attack that drenches and shoves a creature: 1d6 nonlethal damage + 1 per 2 shaman levels, pushed 5 ft. directly away from the shaman.",
    },
    hexes: [
      hex(
        "waves",
        "beckoningChill",
        "Beckoning Chill",
        "Curse a creature within range with a penalty to Fortitude saves against cold and exhaustion/fatigue effects.",
      ),
      hex(
        "waves",
        "crashingWaves",
        "Crashing Waves",
        "Knock a creature within range prone with a wave of force unless it succeeds on a Reflex save.",
      ),
      hex(
        "waves",
        "fluidMagic",
        "Fluid Magic",
        "The shaman's spells with the cold or water descriptor are treated as if empowered a limited number of times/day.",
      ),
      hex(
        "waves",
        "mistsShroud",
        "Mist's Shroud",
        "Conjure a cloud of concealing mist in a radius around the shaman.",
      ),
      hex(
        "waves",
        "waterSight",
        "Water Sight",
        "See through fog without penalty; scry using any pool of water.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal's skin ripples like a disturbed pond; it gains Mobility as a bonus feat (ignoring prerequisites) and can breathe underwater.",
  },
];

export const SHAMAN_SPIRITS: Record<string, ShamanSpiritDef> = Object.fromEntries(
  SPIRIT_LIST.map((s) => [s.tag, s]),
);

export const SHAMAN_SPIRIT_TAGS: readonly string[] = SPIRIT_LIST.map((s) => s.tag);

/** All hex defs available to a given spirit tag, in table order. */
export function hexesForSpirit(spiritTag: string): ShamanSpiritHex[] {
  return SHAMAN_SPIRITS[spiritTag]?.hexes ?? [];
}

/** Look up a single hex def by its `<spiritTag>:<camelCaseName>` id, across every spirit. */
export function findShamanHex(hexId: string): ShamanSpiritHex | undefined {
  const spiritTag = hexId.split(":")[0];
  if (!spiritTag) return undefined;
  return SHAMAN_SPIRITS[spiritTag]?.hexes.find((h) => h.id === hexId);
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3c: `RefData.shamanSpirits` is the FULL published catalog
 * (18 entries after junk filtering), prose only — same "catalog from data,
 * mechanics as overlay" pattern as `rage-powers.ts`'s
 * `mergedRagePowerCatalog`. The hand-verified 8-core-spirit table above
 * stays authoritative for spirit magic spells/ability/hexes; this section
 * merges the two for browsing.
 *
 * Matching is by NORMALIZED NAME. Collision audit (all 8 hand-authored
 * spirits): all 8 matched a vendored entry by normalized name (the vendored
 * dictionary keys ARE this table's own `tag`s, verified) — no aliasing
 * needed.
 */

const SHAMAN_SPIRIT_NAME_ALIASES: Record<string, string> = {};

function normalizeSpiritName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedShamanSpiritEntry extends ShamanSpiritDef {
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only spirit with no hand-authored spirit magic/ability/hex data — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredSpiritToDef(entry: ShamanSpirit): MergedShamanSpiritEntry {
  return {
    tag: entry.id,
    name: entry.name,
    spiritMagicSpells: [],
    ability: { name: "", summary: "" },
    hexes: [],
    spiritAnimalNote: "",
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked spirit tag (`doc.build.shamanSpirit`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveShamanSpirit(
  tag: string,
  refData: RefData,
): MergedShamanSpiritEntry | undefined {
  const hand = SHAMAN_SPIRITS[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = refData.shamanSpirits?.[tag];
  return vendored ? vendoredSpiritToDef(vendored) : undefined;
}

/** The full picker-browsable catalog: every vendored spirit, with any that collides (by normalized name) against a hand-authored entry replaced by that def, plus any hand-authored entry with no vendored counterpart appended. */
export function mergedShamanSpiritCatalog(refData: RefData): MergedShamanSpiritEntry[] {
  const handByNormName = new Map<string, ShamanSpiritDef>();
  for (const s of SPIRIT_LIST) {
    handByNormName.set(normalizeSpiritName(SHAMAN_SPIRIT_NAME_ALIASES[s.tag] ?? s.name), s);
  }

  const usedHandTags = new Set<string>();
  const merged: MergedShamanSpiritEntry[] = [];
  for (const v of Object.values(refData.shamanSpirits ?? {})) {
    const handMatch = handByNormName.get(normalizeSpiritName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredSpiritToDef(v));
    }
  }
  for (const s of SPIRIT_LIST) {
    if (!usedHandTags.has(s.tag)) merged.push({ ...s, displayOnly: false });
  }
  return merged;
}
