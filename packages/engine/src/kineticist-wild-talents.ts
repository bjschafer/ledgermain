/**
 * Clean-room PF1 kineticist WILD TALENT table (infusions + utility talents,
 * Occult Adventures, issue #65) — hand-authored from the published rules
 * (verified against legacy.aonprd.com/d20pfsrd.com's Kineticist Wild
 * Talents lists), same "vendored but not linked" provenance
 * `kineticist-elements.ts` documents: the vendored Foundry class def only
 * links the generic "Infusion"/"Wild Talents" `ClassFeature` stubs, no
 * per-talent breakdown.
 *
 * SCOPE: full parity with the vendored infusion/utility catalog across all 7
 * elements (aether, air, earth, fire, water, void, wood) plus the universal
 * pool — every vendored `kind: "infusion" | "utility"` row is either
 * hand-authored here or reachable via the vendored-catalog overlay at the
 * bottom of this file. The vendored catalog carries 81 infusions + 157
 * utility talents = 238 entries total; this table hand-authors 236 of them
 * (a handful of names — Bowling Infusion, Entangling Infusion, Kinetic
 * Cover, Heat/Cold Adaptation — are intentionally duplicated across two
 * elements that both grant them, per RAW, collapsing to one vendored row
 * each). The remaining 7 — each element's own "Basic <Element>kinesis"
 * utility talent (Basic Telekinesis, Aerokinesis, Geokinesis, Pyrokinesis,
 * Hydrokinesis, Chaokinesis, Phytokinesis) — are deliberately NOT
 * hand-authored here: RAW auto-grants each the moment its element is known,
 * so it's already modeled as `KineticistElementDef.basicUtility`
 * (`kineticist-elements.ts`) rather than as a second, separately-selectable
 * pick that would double-count against the utility-talent budget.
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
 * Every entry here except the promoted set below is display-only (activated
 * abilities spent as a standard/move/swift action with their own
 * save/duration — not a passive always-on bonus a sheet `Change` could
 * safely target), same honesty bar `occultist-implements.ts`'s base/menu
 * focus powers and `witch-hexes.ts` use for their own activated abilities.
 *
 * The promoted set (a real unconditional `changes[]`, applied by
 * `collect.ts`'s wild-talent loop — see each entry's RAW citation):
 *
 *   - `earth:clockworkHeart` — the benefits of Improved Initiative and
 *     Lightning Reflexes while the graft stays wound (daily upkeep, kept as
 *     a contextNotes reminder rather than a live gate).
 *
 * Two flagged near-misses stay display-only, so a future pass doesn't
 * re-litigate them: `earth:earthWalk` (its overflow bonus lands on
 * CMD-vs-two-maneuvers and balance-scoped Acrobatics — maneuver- and
 * task-scoped targets this engine doesn't have, the same class of gap as
 * the save-category near-misses in `oracle-revelations.ts`) and
 * `fire:firesFury` (adds to blast damage, and blasts aren't rolled by the
 * sheet at all — no blast weapon model). Both would ALSO need
 * elemental-overflow state (the bonus scales with burn accepted today),
 * which nothing models yet; even with it, the scoped-target blockers stand.
 *
 * The vendored catalog overlay at the bottom of this file (issue #74) — see
 * `mergedKineticistWildTalentCatalog` — still exists for completeness (a
 * vendored entry whose name doesn't normalize-match a hand-authored one falls
 * back to vendored-only display), but every infusion/utility talent this
 * table's 7 elements + universal pool cover is now hand-verified.
 */

import type { Change, ContextNote, KineticWildTalent, RefData, SourceRef } from "@pf1/schema";

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
  /**
   * Typed modifiers this talent grants unconditionally — empty/omitted for
   * all but the promoted set (see the file doc comment's honesty-bar
   * paragraph; Clockwork Heart is the first). Applied by `collect.ts`'s
   * wild-talent loop.
   */
  changes?: Change[];
  /** Non-mechanical reminders (upkeep, scaling, prerequisites). */
  contextNotes?: ContextNote[];
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
    slug: "bladeRush",
    name: "Blade Rush",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 2,
    burn: 2,
    summary:
      "Requires Kinetic Blade; instantly move 30 ft. in any direction and make one kinetic-blade attack at +2 to hit / -2 AC until your next turn.",
  },
  {
    slug: "focusedBlast",
    name: "Focused Blast",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 2,
    burn: 2,
    summary:
      "Blast gains a +1 enhancement bonus to attack rolls and CL checks to beat SR; more burn raises the bonus (up to +5 for 10 burn), or halve blast damage to halve the burn cost.",
  },
  {
    slug: "kundaliniInfusion",
    name: "Kundalini Infusion",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 2,
    burn: 0,
    summary:
      "Requires a ki pool and Kinetic Fist; accept burn equal to a chosen chakra's number so your infused unarmed strikes block that chakra on a hit, as the Block Chakras feats.",
  },
  {
    slug: "spindle",
    name: "Spindle",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 2,
    burn: 2,
    summary:
      "Throw a 5-by-10-ft. spindle of elemental matter up to 30 ft. away, hitting two adjacent squares (Reflex negates; physical blasts deal half damage, energy blasts deal full).",
  },
  {
    slug: "venomAdmixture",
    name: "Venom Admixture",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 2,
    burn: 2,
    summary:
      "Requires Venom Speaker; consume a held dose of poison (or a poison-producing feat/racial use) to infuse your blast with it, applying that poison's own type/save/effect to anyone it damages.",
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
    slug: "elementalTrap",
    name: "Elemental Trap",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 3,
    burn: 2,
    summary:
      "Plant a hidden 5-ft. trap that detonates your blast on anyone within 10 ft. when triggered by 10+ lbs. of weight (Reflex half for anyone but the trigger); 2 extra unreducible burn lets you lay a second trap without dismissing the first.",
  },
  {
    slug: "stylishInfusion",
    name: "Stylish Infusion",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 3,
    burn: 2,
    summary:
      "Requires flurry of blows/brawler's flurry and Kinetic Fist; pick an unchained monk style strike to use during your flurry alongside your infused blast (repeatable for different style strikes).",
  },
  {
    slug: "venomInfusion",
    name: "Venom Infusion",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 4,
    burn: 3,
    summary:
      "Requires Venom Speaker; every blast that damages a creature also sickens it for 1 round (Fortitude negates).",
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
  {
    slug: "bladeWhirlwind",
    name: "Blade Whirlwind",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 5,
    burn: 3,
    summary:
      "Requires Kinetic Blade; manifest the blade and sweep it through every foe within reach as one attack roll (confirm crits only against the first creature hit).",
  },
  {
    slug: "whipHurricane",
    name: "Whip Hurricane",
    category: "infusion",
    kind: "form",
    element: "universal",
    level: 6,
    burn: 4,
    summary:
      "Requires Kinetic Blade, Kinetic Whip, and Blade Whirlwind; as Blade Whirlwind but manifests a reach whip that lingers until your next turn or your next blade/whip infusion.",
  },
  {
    slug: "shepherdOfSouls",
    name: "Shepherd of Souls",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 7,
    burn: 4,
    summary:
      "When your blast kills a living creature, raise dead and similar spells targeting it require a caster level check (DC 11 + your kineticist level) or the spell fails and its material component is wasted.",
  },
  {
    slug: "venomInfusionGreater",
    name: "Venom Infusion, Greater",
    category: "infusion",
    kind: "substance",
    element: "universal",
    level: 7,
    burn: 4,
    summary:
      "Requires Venom Speaker and Venom Infusion; as the greater toxic infusion talent, but applies to any creature your blast damages regardless of damage type.",
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
    slug: "infernalBargain",
    name: "Infernal Bargain",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Requires a tiefling or Hell-tied planar heritage; as a swift action, apply a conditional-favor-style bonus to any beneficial utility talent you use on a willing target.",
  },
  {
    slug: "kineticAwe",
    name: "Kinetic Awe",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Functions as Dazzling Display (usable as a standard action instead of a feat's normal action), adding half your kineticist level to the Intimidate check if you gathered power that round.",
  },
  {
    slug: "kineticDissolution",
    name: "Kinetic Dissolution",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Requires being a wayang with the matching racial trait; spend 1 burn to reuse your dissolution's child or light and dark racial trait even with no daily uses left.",
  },
  {
    slug: "mesmerizingElementalist",
    name: "Mesmerizing Elementalist",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Requires being nagaji; gain (or sharpen the save DC of) the hypnotic gaze racial trait, and spend 1 burn to use it beyond its normal daily limit.",
  },
  {
    slug: "nineTailedKineticist",
    name: "Nine-Tailed Kineticist",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Requires being a kitsune with a Magical Tail feat; spend 1 burn to cast that feat's spell-like ability past its daily limit, gated by matching wild-talent level, and may learn a Magical Tail feat in place of a wild talent.",
  },
  {
    slug: "tenguBladeLore",
    name: "Tengu Blade Lore",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Requires being a tengu; any Kinetic Blade (or blade-prerequisite infusion) weapon you create also carries one weapon special feature of your choice — blocking, brace, deadly, disarm, distracting, sunder, or trip.",
  },
  {
    slug: "venomSpeaker",
    name: "Venom Speaker",
    category: "utility",
    element: "universal",
    level: 1,
    burn: 0,
    summary:
      "Gain the investigator's poison lore using your kineticist level, and gather power freely while holding poison; at 6th level, may learn swift poisoning or an alchemist poison discovery in place of a utility talent.",
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
    slug: "pastLifeEvoker",
    name: "Past Life Evoker",
    category: "utility",
    element: "universal",
    level: 2,
    burn: 0,
    summary:
      "Requires being a samsaran; once per day, spend 1 burn to borrow any element's simple blast for 1 minute, damage based on your kineticist level - 2 (no prerequisites satisfied by it).",
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
      "Summon and guide a Medium elemental of your element as summon monster IV (scaling with level) for 1 round per kineticist level.",
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
  {
    slug: "elementalExile",
    name: "Elemental Exile",
    category: "utility",
    element: "universal",
    level: 8,
    burn: 1,
    summary:
      "Touch-banish a creature to your element's home plane (Will negates, SR yes), landing it 5-500 miles from any intended spot with no return route provided.",
  },
];

const AETHER_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "telekineticBoomerang",
    name: "Telekinetic Boomerang",
    category: "infusion",
    kind: "form",
    element: "aether",
    level: 1,
    burn: 1,
    summary:
      "As telekinetic blast, but the thrown object stays tethered by aether and returns to your hand undamaged instead of striking; on a miss, snap it back next turn for a second attack.",
  },
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
    slug: "telekineticFinesse",
    name: "Telekinetic Finesse",
    category: "utility",
    element: "aether",
    level: 1,
    burn: 0,
    summary:
      "Perform fine manipulation at close range without touching the target, including Sleight of Hand and Disable Device checks.",
  },
  {
    slug: "angelicProtection",
    name: "Angelic Protection",
    category: "utility",
    element: "aether",
    level: 2,
    burn: 0,
    summary:
      "Requires Kinetic Healer (and an aasimar or Planar Infusion tie to Elysium/Heaven/Nirvana); a creature you heal with it also gains protection from evil for 1 round.",
  },
  {
    slug: "telekineticHaul",
    name: "Telekinetic Haul",
    category: "utility",
    element: "aether",
    level: 2,
    burn: 0,
    summary:
      "Requires Basic Telekinesis; move or throw objects up to 100 lb. per kineticist level (1,000 lb./level and a 1-minute/level duration for 1 burn).",
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
    slug: "primalAether",
    name: "Primal Aether",
    category: "utility",
    element: "aether",
    level: 3,
    burn: 0,
    summary:
      "After a Spellscar Desert attunement ritual, wind gathered aether tight enough to detonate into a primal magic event with a CR equal to your kineticist level.",
  },
  {
    slug: "telekineticInvisibility",
    name: "Telekinetic Invisibility",
    category: "utility",
    element: "aether",
    level: 3,
    burn: 0,
    summary:
      "As invisibility, bending light and dampening sound, but your Stealth bonus against sight-based detection is halved in exchange for defeating sound-based blindsense/blindsight.",
  },
  {
    slug: "healingBurst",
    name: "Healing Burst",
    category: "utility",
    element: "aether",
    level: 4,
    burn: 1,
    summary:
      "Requires Kinetic Healer; spend the burn yourself to heal every creature in a 30-ft. radius around you, at half your Kinetic Healer amount (full if it's based on a positive blast).",
  },
  {
    slug: "spyingTouchsight",
    name: "Spying Touchsight",
    category: "utility",
    element: "aether",
    level: 4,
    burn: 0,
    summary:
      "Requires Touchsight; a ranged touch attack tethers an invisible aether strand to a target, letting you concentrate to spy through any one of your five senses along it.",
  },
  {
    slug: "telekineticManeuvers",
    name: "Telekinetic Maneuvers",
    category: "utility",
    element: "aether",
    level: 4,
    burn: 0,
    summary:
      "Perform combat maneuvers telekinetically using your Constitution modifier for CMB; with Telekinetic Finesse, add dirty trick and steal, using Dexterity instead.",
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
  {
    slug: "reactiveTouchsight",
    name: "Reactive Touchsight",
    category: "utility",
    element: "aether",
    level: 5,
    burn: 0,
    summary:
      "Requires Touchsight; you're never denied your Dex bonus to AC from flat-footedness or an unseen/invisible attacker within 30 ft., and always act in the surprise round against foes in that range.",
  },
  {
    slug: "kineticRevivification",
    name: "Kinetic Revivification",
    category: "utility",
    element: "aether",
    level: 6,
    burn: 0,
    summary:
      "Requires Kinetic Healer; bring an ally who died within the last round back as breath of life, healing your normal Kinetic Healer amount at the cost of extra burn (yours or theirs).",
  },
  {
    slug: "suffocate",
    name: "Suffocate",
    category: "utility",
    element: "aether",
    level: 6,
    burn: 0,
    summary:
      "Fortitude partial, SR applies; use aether, air, or water to deny a creature within 120 ft. breathable air while you concentrate (1 burn instead drops it to 0 hp, then unconscious, on two straight failed saves).",
  },
  {
    slug: "spellDeflection",
    name: "Spell Deflection",
    category: "utility",
    element: "aether",
    level: 7,
    burn: 0,
    summary:
      "Until your next turn, any spell targeting you that spell turning could affect instead bounces back at a randomly rolled spell-turning level (1 burn extends this to 10 minutes/level, capped at 10 total spell levels deflected).",
  },
  {
    slug: "telekineticDeflection",
    name: "Telekinetic Deflection",
    category: "utility",
    element: "aether",
    level: 8,
    burn: 0,
    summary:
      "As the deflection spell, redirecting an incoming attack back at its source for 1 round (1 burn extends the duration to 1 round per kineticist level).",
  },
  {
    slug: "telekineticGlobe",
    name: "Telekinetic Globe",
    category: "utility",
    element: "aether",
    level: 8,
    burn: 0,
    summary:
      "Requires Force Barrier; create a mobile globe of force (as telekinetic sphere) that lasts as long as you concentrate, or 1 minute/level with no concentration needed for 1 burn.",
  },
  {
    slug: "aetherArchitect",
    name: "Aether Architect",
    category: "utility",
    element: "aether",
    level: 9,
    burn: 0,
    summary:
      "Concentrate for 10 minutes to spin a wall-of-force-strength edifice from aether, sized to your kineticist level; 1 burn makes it permanent instead of concentration-only.",
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
    slug: "energizeWeapon",
    name: "Energize Weapon",
    category: "infusion",
    kind: "form",
    element: "air",
    level: 1,
    burn: 1,
    summary:
      "Imbue a wielded manufactured weapon with your blast's element as part of an attack, adding 1d6 damage (plus 1d6 per 6 levels past 7th) of the blast's type to every hit until your next turn, ignoring SR.",
  },
  {
    slug: "penetratingInfusion",
    name: "Penetrating Infusion",
    category: "infusion",
    kind: "substance",
    element: "air",
    level: 2,
    burn: 2,
    summary:
      "Treat a foe's cold, electricity, or fire resistance as 5 lower against your infused blast (doesn't stack with Searing Flame); extra burn lowers it 5 further per point, though immunity is unaffected.",
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
    slug: "bolt",
    name: "Bolt",
    category: "infusion",
    kind: "form",
    element: "air",
    level: 3,
    burn: 2,
    summary:
      "Reflex half; a 5-ft.-wide, 30-ft. vertical lightning bolt slams down on a point within 30 ft. for full blast damage (plus 1 point per die if outdoors in a storm).",
  },
  {
    slug: "synapticInfusion",
    name: "Synaptic Infusion",
    category: "infusion",
    kind: "substance",
    element: "air",
    level: 3,
    burn: 2,
    summary:
      "Will negates, mind-affecting; a hit scrambles the target's nerves with electricity, staggering it for 1 round (a move action lets it shake the condition off early).",
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
    slug: "unfoldingWindInfusion",
    name: "Unfolding Wind Infusion",
    category: "infusion",
    kind: "substance",
    element: "air",
    level: 5,
    burn: 3,
    summary:
      "Requires Kinetic Fist and Monastery of Unfolding Wind membership; move 5 ft. without provoking before your first unarmed strike and after each one with the infused blast.",
  },
  {
    slug: "cloud",
    name: "Cloud",
    category: "infusion",
    kind: "form",
    element: "air",
    level: 7,
    burn: 4,
    summary:
      "Requires Extended Range; release a 20-ft.-radius cloud within 120 ft. dealing 1/4 blast damage on creation (half to anything entering or ending its turn there), obscuring vision like obscuring mist for several rounds.",
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
    slug: "airShroud",
    name: "Air Shroud",
    category: "utility",
    element: "air",
    level: 1,
    burn: 0,
    summary:
      "Constant air bubble effect around yourself; 1 burn extends it to nearby allies (up to your Con modifier) for 1 minute per kineticist level.",
  },
  {
    slug: "airsReach",
    name: "Air's Reach",
    category: "utility",
    element: "air",
    level: 1,
    burn: 0,
    summary:
      "Double the effective range of your air blasts, air wild talents, and air composite blasts (applied after Extended Range) — but not the area of an infusion like Cloud or Cyclone.",
  },
  {
    slug: "voiceOfTheWind",
    name: "Voice of the Wind",
    category: "utility",
    element: "air",
    level: 1,
    burn: 0,
    summary:
      "SR applies, no save; carry your whispered voice to anyone you can see within 120 ft. as message, or send it as whispering wind to a distant location.",
  },
  {
    slug: "livingCapacitor",
    name: "Living Capacitor",
    category: "utility",
    element: "air",
    level: 2,
    burn: 0,
    summary:
      "Constantly store electricity damage you take, then unleash it via a touch attack; you must take electricity damage again before it recharges.",
  },
  {
    slug: "voiceOfTheWindGreater",
    name: "Voice of the Wind, Greater",
    category: "utility",
    element: "air",
    level: 2,
    burn: 0,
    summary:
      "Requires Voice of the Wind; also throw/disguise your voice as ventriloquism and vocal alteration, and relay whispering-wind-style messages up to 50 miles per kineticist level via a fast, high-altitude gust.",
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
  {
    slug: "engulfingWinds",
    name: "Engulfing Winds",
    category: "utility",
    element: "air",
    level: 3,
    burn: 0,
    summary:
      "Trade your Enveloping Winds defense until your next turn for a wind wall effect (1 burn extends it to 1 round per kineticist level).",
  },
  {
    slug: "magnetism",
    name: "Magnetism",
    category: "utility",
    element: "air",
    level: 3,
    burn: 0,
    summary:
      "Requires Magnetic Infusion; push or pull metal objects/creatures via bull rush or drag combat maneuvers, no save, SR applies.",
  },
  {
    slug: "wingsOfAir",
    name: "Wings of Air",
    category: "utility",
    element: "air",
    level: 3,
    burn: 0,
    summary:
      "Requires Air Cushion or Air's Leap; constant fly effect, re-activatable as a standard action if dispelled.",
  },
  {
    slug: "bodyOfAir",
    name: "Body of Air",
    category: "utility",
    element: "air",
    level: 4,
    burn: 0,
    summary:
      "Transform into gas as gaseous form; you can't use kinetic blasts while in this state.",
  },
  {
    slug: "airShroudGreater",
    name: "Air Shroud, Greater",
    category: "utility",
    element: "air",
    level: 5,
    burn: 0,
    summary:
      "Requires Air Shroud; upgrades it to a life bubble effect, and burn spent extending it to others lasts until your burn is next removed instead of expiring on its own.",
  },
  {
    slug: "windsightGreater",
    name: "Windsight, Greater",
    category: "utility",
    element: "air",
    level: 5,
    burn: 0,
    summary:
      "Requires Windsight; send a breeze up to 480 ft. out and back to relay delayed sight/sound from its destination, or concentrate for continuous (if delayed) remote sensing.",
  },
  {
    slug: "windManipulator",
    name: "Wind Manipulator",
    category: "utility",
    element: "air",
    level: 6,
    burn: 0,
    summary:
      "Requires Engulfing Winds; alter wind over a huge area as control winds while concentrating (1 burn extends this to 10 minutes per kineticist level with no concentration needed).",
  },
  {
    slug: "skyWalk",
    name: "Sky Walk",
    category: "utility",
    element: "air",
    level: 7,
    burn: 1,
    summary:
      "Requires Wings of Air plus Air Cushion or Air's Leap; spend the burn to grant nearby allies flight as mass fly for 10 minutes.",
  },
  {
    slug: "weatherMaster",
    name: "Weather Master",
    category: "utility",
    element: "air",
    level: 8,
    burn: 0,
    summary:
      "After a 10-minute focus, create powerful weather as control weather — tornadoes or hurricane winds always, plus hot/cold/wet weather with access to fire or water too.",
  },
  {
    slug: "hurricaneQueen",
    name: "Hurricane Queen",
    category: "utility",
    element: "air",
    level: 9,
    burn: 0,
    summary:
      "After a grueling attunement flight around the Eye of Abendego, your Enveloping Winds defense deflects an extra 25% of nonmagical ranged attacks past its usual cap, and wind/weather effects (including a whirlwind creature's) affect you only if you allow it.",
  },
  {
    slug: "magnetismGreater",
    name: "Magnetism, Greater",
    category: "utility",
    element: "air",
    level: 9,
    burn: 0,
    summary:
      "Requires Magnetic Infusion and Magnetism; repel or pull metal objects in a long line as repel metal or stone for 1 round (1 burn extends this to 1 round per kineticist level).",
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
    slug: "impale",
    name: "Impale",
    category: "infusion",
    kind: "form",
    element: "earth",
    level: 3,
    burn: 2,
    summary:
      "Blast extends into a 30-ft. line as a single attack roll against each target hit, dealing full damage to each in order from closest; the spike stops if it fails to deal damage or can't punch through a barrier.",
  },
  {
    slug: "tremor",
    name: "Tremor",
    category: "infusion",
    kind: "form",
    element: "earth",
    level: 5,
    burn: 3,
    summary:
      "While in contact with a solid surface, channel a kinetic blast as a tremor through it to strike a burrowing or incorporeal creature sharing that surface — grants no attacks above ground and bypasses no cover but burrowing.",
  },
  {
    slug: "untwistingIronInfusion",
    name: "Untwisting Iron Infusion",
    category: "infusion",
    kind: "substance",
    element: "earth",
    level: 5,
    burn: 3,
    summary:
      "Requires Kinetic Fist and membership in the Monastery of Untwisting Iron; each unarmed strike hit with the infused blast raises your flesh of stone DR/adamantine by 1 until your next turn.",
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
    slug: "earthWalk",
    name: "Earth Walk",
    category: "utility",
    element: "earth",
    level: 1,
    burn: 0,
    // Deliberately display-only: the bonus lands on CMD against two specific
    // maneuvers and on balance-scoped Acrobatics — scoped targets this
    // engine doesn't have (see the file doc comment's near-miss paragraph) —
    // and it scales with elemental overflow, which nothing models either.
    summary:
      "While standing on an earthen surface, ignore difficult terrain from rock, earth, or mud, and add your elemental overflow bonus to CMD against bull rush/trip and to Acrobatics checks to balance.",
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
    slug: "clockworkHeart",
    name: "Clockwork Heart",
    category: "utility",
    element: "earth",
    level: 3,
    burn: 0,
    summary:
      "Requires metal blast; keep clockwork components grafted into your body wound to gain the benefits of both Improved Initiative and Lightning Reflexes.",
    // RAW (aonprd.com, KineticistTalentsDisplay.aspx?ItemName=Clockwork%20Heart,
    // Heroes of Golarion p.27): "While these clockwork components are kept
    // wound ... they gain the benefits of both Improved Initiative and
    // Lightning Reflexes feats" — +4 initiative and +2 Reflex (both feats are
    // untyped flat bonuses). The winding upkeep is daily maintenance, not a
    // per-scene activation, so the numbers apply as always-on with the
    // upkeep kept as a reminder.
    changes: [
      { formula: "4", target: "init", type: "untyped" },
      { formula: "2", target: "ref", type: "untyped" },
    ],
    contextNotes: [
      {
        target: "init",
        text: "Only while the clockwork components are kept wound (the clockwork subtype's winding ability) — lapse the upkeep and both feat benefits stop.",
      },
    ],
  },
  {
    slug: "earthChild",
    name: "Earth Child",
    category: "utility",
    element: "earth",
    level: 3,
    burn: 0,
    summary:
      "Replaces a 3rd-level-or-lower utility talent after a nine-day in-fiction attunement ritual; transmutes you into something akin to an oread, keeping your own racial abilities alongside an oread's type, speed, and racial traits.",
  },
  {
    slug: "pillar",
    name: "Pillar",
    category: "utility",
    element: "earth",
    level: 3,
    burn: 0,
    summary:
      "Requires Kinetic Cover; raise a 5-ft.-square pillar of earth up to 15 ft. tall over 1 full round, lifting willing occupants with it until it crumbles after your Constitution bonus in rounds.",
  },
  {
    slug: "tremorsense",
    name: "Tremorsense",
    category: "utility",
    element: "earth",
    level: 3,
    burn: 0,
    summary:
      "Move action grants tremorsense 30 ft. for 1 round on a touched earth or stone surface (1 burn extends it to 1 round per kineticist level); while active, earth blasts ignore concealment against creatures detected this way.",
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
    slug: "earthmeld",
    name: "Earthmeld",
    category: "utility",
    element: "earth",
    level: 4,
    burn: 0,
    summary:
      "Requires Earth Climb; meld a willing creature into stone as meld into stone for 10 minutes per kineticist level (1 burn extends a melded creature until your next burn recovery instead), letting it eavesdrop unseen and choose when to emerge.",
  },
  {
    slug: "enduringEarth",
    name: "Enduring Earth",
    category: "utility",
    element: "earth",
    level: 4,
    burn: 0,
    summary:
      "Doubles the duration of any earth blast, earth wild talent, or earth-inclusive composite blast effect that already lasts longer than 1 round.",
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
  {
    slug: "clockworkPuppet",
    name: "Clockwork Puppet",
    category: "utility",
    element: "earth",
    level: 5,
    burn: 0,
    summary:
      "Requires metal blast; as Aether Puppet, but the animated object becomes a clockwork construct instead of an ordinary one.",
  },
  {
    slug: "elementalTransmission",
    name: "Elemental Transmission",
    category: "utility",
    element: "earth",
    level: 5,
    burn: 0,
    summary:
      "Concentrate for 10 minutes to open a two-way scrying-and-speech conduit between an earthen manifestation and a familiar creature near a matching manifestation elsewhere, lasting until you end it or the creature leaves.",
  },
  {
    slug: "sparkOfInnovation",
    name: "Spark of Innovation",
    category: "utility",
    element: "earth",
    level: 5,
    burn: 0,
    summary:
      "Requires metal blast; as Spark of Life (summon and guide a Medium elemental as summon monster IV, scaling with level), but the elemental is a clockwork earth elemental with the construct type and clockwork traits instead.",
  },
  {
    slug: "stoneSculptor",
    name: "Stone Sculptor",
    category: "utility",
    element: "earth",
    level: 5,
    burn: 0,
    summary: "Shape stone as the stone shape spell.",
  },
  {
    slug: "tremorsenseGreater",
    name: "Tremorsense, Greater",
    category: "utility",
    element: "earth",
    level: 5,
    burn: 0,
    summary:
      "Requires Tremorsense; spend 10 minutes underground to learn three facts as commune with nature, excluding whether a creature is woodland or unnaturally powerful.",
  },
  {
    slug: "shiftEarthGreater",
    name: "Shift Earth, Greater",
    category: "utility",
    element: "earth",
    level: 7,
    burn: 0,
    summary:
      "Requires Kinetic Cover and Shift Earth; move earth on the scale of the move earth spell.",
  },
  {
    slug: "earthTongue",
    name: "Earth Tongue",
    category: "utility",
    element: "earth",
    level: 8,
    burn: 0,
    summary:
      "Requires Tremorsense and Greater Tremorsense; constantly speak with rocks and stone as stone tell, including unprompted comments from talkative stone.",
  },
  {
    slug: "seismicMaster",
    name: "Seismic Master",
    category: "utility",
    element: "earth",
    level: 9,
    burn: 0,
    summary: "Trigger a localized tremor as the earthquake spell.",
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
    slug: "dazzlingInfusion",
    name: "Dazzling Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 1,
    burn: 1,
    summary:
      "A hit that penetrates SR dazzles the target for 1 minute (Will negates) whether or not it takes damage; halving the blast's damage raises the save DC by 2.",
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
    slug: "foxfireInfusion",
    name: "Foxfire Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 3,
    burn: 2,
    summary:
      "Requires Foxfire or positive blast; a hit that penetrates SR leaves the target outlined as faerie fire for 1 minute (or until your next turn on a successful Will save) even without damage; halving the blast's damage raises the DC by 2.",
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
    slug: "detonation",
    name: "Detonation",
    category: "infusion",
    kind: "form",
    element: "fire",
    level: 4,
    burn: 3,
    summary:
      "Flames burst from your body in a 20-ft. radius, dealing full blast damage to everyone caught (Reflex half).",
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
    slug: "unblinkingFlameInfusion",
    name: "Unblinking Flame Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 5,
    burn: 3,
    summary:
      "Requires Kinetic Fist and membership in the Monastery of Unblinking Flame; an unarmed strike hit with the infused blast lets everyone see the target as true seeing for 1 round.",
  },
  {
    slug: "brilliantInfusion",
    name: "Brilliant Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 6,
    burn: 4,
    summary:
      "Requires Flash Infusion; the blast's path, target square, or area becomes the center of a continual flame effect (as a 6th-level light spell) lasting until the end of your next turn.",
  },
  {
    slug: "explosion",
    name: "Explosion",
    category: "infusion",
    kind: "form",
    element: "fire",
    level: 7,
    burn: 4,
    summary:
      "Requires Extended Range; detonate a burst of your chosen radius (5-20 ft.) anywhere within 120 ft., dealing full blast damage to everyone caught (Reflex half, Dexterity-based DC).",
  },
  {
    slug: "pureFlameInfusion",
    name: "Pure-flame Infusion",
    category: "infusion",
    kind: "substance",
    element: "fire",
    level: 7,
    burn: 4,
    summary: "Infused blast ignores spell resistance entirely.",
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
    slug: "firesFury",
    name: "Fire's Fury",
    category: "utility",
    element: "fire",
    level: 1,
    burn: 0,
    // Deliberately display-only: adds to BLAST damage, and blasts aren't
    // rolled by the sheet at all (no blast weapon model) — plus the bonus is
    // elemental overflow, which nothing models. See the file doc comment's
    // near-miss paragraph.
    summary:
      "Add your elemental overflow bonus to fire (and fire-inclusive composite) blast damage; stacks with blasts that already double that bonus.",
  },
  {
    slug: "fireSteed",
    name: "Fire Steed",
    category: "utility",
    element: "fire",
    level: 2,
    burn: 0,
    summary:
      "Wreathe a willing mount in flame for 1 round (1 burn extends it to 1 round per kineticist level), granting fire resistance 10 and +10 ft. speed; anyone but you touching, striking, or mounting it takes 1d6 fire damage per round of contact.",
  },
  {
    slug: "flameTrap",
    name: "Flame Trap",
    category: "utility",
    element: "fire",
    level: 2,
    burn: 0,
    summary:
      "After 10 minutes in contact with a container, trap it so the next creature besides you to open it takes your fire blast's damage (Reflex negates past 30 ft., no save from farther away) while you selectively spare or destroy its contents; functions as a magical trap with Perception/Disable Device DC 10 + kineticist level + Dex modifier.",
  },
  {
    slug: "foxfire",
    name: "Foxfire",
    category: "utility",
    element: "fire",
    level: 2,
    burn: 0,
    summary:
      "Requires fire or positive blast; outline a creature in flame as faerie fire (SR applies); used with fire, the glow inflicts severe-heat nonlethal damage after 10 minutes absent a Fortitude save, and is extinguishable as a full-round action.",
  },
  {
    slug: "searingFlame",
    name: "Searing Flame",
    category: "utility",
    element: "fire",
    level: 2,
    burn: 0,
    summary:
      "Requires Burning Infusion; rolling its burn damage against a foe also reduces that foe's fire resistance by the unmodified roll for 1/2 your kineticist level in rounds, stacking down to a minimum of 0.",
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
    slug: "firesight",
    name: "Firesight",
    category: "utility",
    element: "fire",
    level: 3,
    burn: 0,
    summary:
      "See through flame and smoke as if transparent; burning creatures or those with the fire subtype never gain concealment against you.",
  },
  {
    slug: "smokeStorm",
    name: "Smoke Storm",
    category: "utility",
    element: "fire",
    level: 3,
    burn: 0,
    summary:
      "Turn an open flame within 120 ft. into a choking 20-ft.-radius smoke cloud; creatures starting their turn inside are sickened (Fortitude negates) for as long as they remain plus 1d4+1 rounds after.",
  },
  {
    slug: "purifyingFlames",
    name: "Purifying Flames",
    category: "utility",
    element: "fire",
    level: 4,
    burn: 1,
    summary:
      "Attempt a caster level check (1d20 + kineticist level) against a poison afflicting the target to neutralize it as neutralize poison; optionally take fire damage equal to a burn's worth to lower one poison's DC by 2 until the end of your next turn.",
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
  {
    slug: "fireCorridor",
    name: "Fire Corridor",
    category: "utility",
    element: "fire",
    level: 5,
    burn: 1,
    summary:
      "Carve a safe 5-ft.-wide, 8-ft.-tall passage through fire or lava (10 ft. long, +5 ft. per 3 kineticist levels) that lasts 1 hour or until dismissed.",
  },
  {
    slug: "flameJetGreater",
    name: "Flame Jet, Greater",
    category: "utility",
    element: "fire",
    level: 5,
    burn: 0,
    summary:
      "Requires Flame Jet; use it as a move action, and hover in place on a mild flame jet without spending an action.",
  },
  {
    slug: "improvedFireSteed",
    name: "Improved Fire Steed",
    category: "utility",
    element: "fire",
    level: 5,
    burn: 0,
    summary:
      "Requires Fire Steed; the mount's fire resistance rises to 20, its speed bonus increases by another 10 ft., and it crosses lava without penalty.",
  },
  {
    slug: "trailOfFlames",
    name: "Trail of Flames",
    category: "utility",
    element: "fire",
    level: 5,
    burn: 0,
    summary: "Withdrawing or running leaves a 1-round wall of fire in every square you vacate.",
  },
  {
    slug: "purgingFlame",
    name: "Purging Flame",
    category: "utility",
    element: "fire",
    level: 6,
    burn: 1,
    summary:
      "Functions as break enchantment on a willing target, who takes 2 fire damage per character level and 1 point of burn (yours only if you're the target); usable even while under an effect break enchantment could remove.",
  },
  {
    slug: "fireSteedGreater",
    name: "Fire Steed, Greater",
    category: "utility",
    element: "fire",
    level: 8,
    burn: 0,
    summary:
      "Requires Fire Steed and Improved Fire Steed; the mount gains fire immunity, another +10 ft. of speed, and can run on steep slopes without a Ride check.",
  },
  {
    slug: "fromTheAshes",
    name: "From the Ashes",
    category: "utility",
    element: "fire",
    level: 9,
    burn: 2,
    summary:
      "When about to drop to unconsciousness or die, burst into an inert ash immune to most harm as an immediate action; if enough ash survives, you reform there at the start of your next turn, taking the triggering damage but healing 5 hp per kineticist level.",
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
    slug: "slickInfusion",
    name: "Slick Infusion",
    category: "infusion",
    kind: "substance",
    element: "water",
    level: 2,
    burn: 2,
    summary:
      "Requires Slick and a form infusion with an area; your blast leaves difficult, Acrobatics-penalizing slick ground behind it for a round after it passes.",
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
    slug: "unbreakingWavesInfusion",
    name: "Unbreaking Waves Infusion",
    category: "infusion",
    kind: "substance",
    element: "water",
    level: 5,
    burn: 3,
    summary:
      "Requires Kinetic Fist and Monastery of Unbreaking Waves membership; each target your infused blast damages also eats a reposition or trip maneuver using your Constitution modifier.",
  },
  {
    slug: "maelstrom",
    name: "Maelstrom",
    category: "infusion",
    kind: "substance",
    element: "water",
    level: 8,
    burn: 4,
    summary:
      "Requires Extended Range; whip a 20-ft.-radius maelstrom into a nearby body of water that batters and repositions everyone caught in it (partial damage regardless of save) for rounds equal to your Constitution modifier.",
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
    slug: "icewalker",
    name: "Icewalker",
    category: "utility",
    element: "water",
    level: 1,
    burn: 0,
    summary:
      "Move across wet or icy surfaces (including your own Slick) without Acrobatics checks for slipperiness, and never suffer seasickness.",
  },
  {
    slug: "slick",
    name: "Slick",
    category: "utility",
    element: "water",
    level: 1,
    burn: 0,
    summary:
      "As a standard action, coat an area in slippery water or ice for 1 round (as grease); accept 1 burn on your next turn to stretch the duration to minutes per level.",
  },
  {
    slug: "waterAlteration",
    name: "Water Alteration",
    category: "utility",
    element: "water",
    level: 1,
    burn: 0,
    summary:
      "Convert a contained volume of fresh water to seawater (or back) and adjust its temperature, up to 2 gallons per kineticist level.",
  },
  {
    slug: "veilOfMists",
    name: "Veil of Mists",
    category: "utility",
    element: "water",
    level: 2,
    burn: 0,
    summary:
      "Disguise yourself in a misty veil (as disguise self) for minutes equal to your Constitution modifier; 1 burn makes it last until dismissed.",
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
    slug: "waterManipulator",
    name: "Water Manipulator",
    category: "utility",
    element: "water",
    level: 3,
    burn: 0,
    summary:
      "Requires Kinetic Cover; raise, lower, or redirect a mass of water as control water while concentrating each round, slowing water creatures caught in it.",
  },
  {
    slug: "waterdancer",
    name: "Waterdancer",
    category: "utility",
    element: "water",
    level: 3,
    burn: 0,
    summary: "Call up a current that speeds your movement and swimming with no time limit.",
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
  {
    slug: "watersense",
    name: "Watersense",
    category: "utility",
    element: "water",
    level: 4,
    burn: 0,
    summary:
      "Gain 30-ft. tremorsense through any body of water you touch, and your water blasts ignore concealment miss chances against creatures it detects.",
  },
  {
    slug: "shimmeringMirage",
    name: "Shimmering Mirage",
    category: "utility",
    element: "water",
    level: 5,
    burn: 1,
    summary:
      "Requires Shroud of Water; light-bending shimmer grants a 20% concealment miss chance while the shroud is active, until burn is next removed.",
  },
  {
    slug: "splashOfTheStyx",
    name: "Splash of the Styx",
    category: "utility",
    element: "water",
    level: 5,
    burn: 1,
    summary:
      "Requires a fiendish planar tie (tiefling or Planar Infusion); spend a full round drawing on the River Styx to erase a target's memories (as modify memory, Will negates).",
  },
  {
    slug: "waterdancerGreater",
    name: "Waterdancer, Greater",
    category: "utility",
    element: "water",
    level: 5,
    burn: 0,
    summary:
      "Requires Waterdancer; move across water at will (as water walk), breathe underwater, and fight underwater without the usual slashing/bludgeoning penalty.",
  },
  {
    slug: "watersenseGreater",
    name: "Watersense, Greater",
    category: "utility",
    element: "water",
    level: 5,
    burn: 0,
    summary:
      "Requires Watersense; scry through a connected body of water, viewing a location or (with a Will save) a tracked creature via a thin funnel of water.",
  },
  {
    slug: "icePath",
    name: "Ice Path",
    category: "utility",
    element: "water",
    level: 6,
    burn: 0,
    summary:
      "Requires Icewalker; freeze a walkable path of ice through the air (as air walk), the ice trail melting 1 round after you pass.",
  },
  {
    slug: "cryokineticStasis",
    name: "Cryokinetic Stasis",
    category: "utility",
    element: "water",
    level: 8,
    burn: 1,
    summary:
      "Encase yourself or a willing target in an icy stasis (as temporal stasis), though 3rd-level+ fire effects can dispel it as if with dispel magic.",
  },
  {
    slug: "tidalWave",
    name: "Tidal Wave",
    category: "utility",
    element: "water",
    level: 9,
    burn: 1,
    summary: "Summon a devastating tidal wave, as the tsunami spell.",
  },
];

const VOID_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "dampeningInfusion",
    name: "Dampening Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 1,
    burn: 1,
    summary:
      "A hit wreathes the target in clinging shadow that hampers its vision — the dark-flavored mirror of a light-based dazzling attack.",
  },
  {
    slug: "pullingInfusion",
    name: "Pulling Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 1,
    burn: 1,
    summary:
      "A hit drags the target 5 ft. toward you (more for extra burn) via a free drag combat maneuver using your Constitution modifier.",
  },
  {
    slug: "weighingInfusion",
    name: "Weighing Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 2,
    burn: 2,
    summary:
      "As Entangling Infusion, but the target is immobilized by crushing gravity rather than physical restraints (Reflex negates).",
  },
  {
    slug: "darknessInfusion",
    name: "Darkness Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 3,
    burn: 2,
    summary:
      "Every square your blast passes through is wreathed in magical darkness (as a 3rd-level darkness effect) until the end of your next turn.",
  },
  {
    slug: "unnervingInfusion",
    name: "Unnerving Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 3,
    burn: 2,
    summary: "A living creature damaged by the blast's negative energy becomes shaken for 1 round.",
  },
  {
    slug: "singularity",
    name: "Singularity",
    category: "infusion",
    kind: "form",
    element: "void",
    level: 4,
    burn: 3,
    summary:
      "Creates a gravitational hazard at a target intersection dealing partial blast damage (Reflex half) that grows in radius over your next two turns; treated as a magical trap for detection and disarming.",
  },
  {
    // Vendored `elements: [void, wood]` — RAW's real prerequisite is negative
    // blast (void) OR positive blast (wood), an either/or blast-compatibility
    // tag, not a dual-element requirement. Filed under void (its
    // `elements[0]`) since this table assumes one element per talent.
    slug: "turningBlast",
    name: "Turning Blast",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 4,
    burn: 3,
    summary:
      "Undead damaged by a hit must save or flee in fear for 1 round (success grants 24 hours of immunity). Usable with negative blast (void) or positive blast (wood).",
  },
  {
    slug: "vampiricInfusion",
    name: "Vampiric Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 5,
    burn: 3,
    summary:
      "Requires Void Healer; a hit lets you trigger Void Healer on yourself as a free action (paying its burn), draining the target to heal you despite being a living creature.",
  },
  {
    slug: "darknessInfusionGreater",
    name: "Darkness Infusion, Greater",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 6,
    burn: 4,
    summary:
      "Requires Darkness Infusion; as Darkness Infusion, but deeper — equivalent to a 6th-level darkness effect.",
  },
  {
    slug: "enervatingInfusion",
    name: "Enervating Infusion",
    category: "infusion",
    kind: "substance",
    element: "void",
    level: 7,
    burn: 4,
    summary:
      "A creature damaged by the blast also takes a temporary negative level that fades after 24 hours.",
  },
  {
    slug: "voidHealer",
    name: "Void Healer",
    category: "utility",
    element: "void",
    level: 1,
    burn: 1,
    summary:
      "As Kinetic Healer, but restores hit points to undead and other creatures healed by negative energy instead of the living.",
  },
  {
    slug: "eyesOfTheVoid",
    name: "Eyes of the Void",
    category: "utility",
    element: "void",
    level: 2,
    burn: 0,
    summary: "Grants 60 ft. darkvision, or extends existing darkvision by 30 ft.",
  },
  {
    slug: "noBreath",
    name: "No Breath",
    category: "utility",
    element: "void",
    level: 2,
    burn: 0,
    summary: "Grants the No Breath universal monster ability, including survival in a vacuum.",
  },
  {
    slug: "gravityControl",
    name: "Gravity Control",
    category: "utility",
    element: "void",
    level: 3,
    burn: 0,
    summary:
      "Propel yourself through the air via gravity manipulation, as the fire element's Flame Jet.",
  },
  {
    slug: "undeadGrip",
    name: "Undead Grip",
    category: "utility",
    element: "void",
    level: 3,
    burn: 0,
    summary:
      "As Elemental Grip, but usable against a single undead creature as halt undead; mindless undead save at a -4 penalty.",
  },
  {
    slug: "absentia",
    name: "Absentia",
    category: "utility",
    element: "void",
    level: 4,
    burn: 0,
    summary:
      "Requires Emptiness; grants permanent personal nondetection (restorable as a standard action if dispelled); 1 burn extends the same effect to a touched creature.",
  },
  {
    slug: "corpsePuppet",
    name: "Corpse Puppet",
    category: "utility",
    element: "void",
    level: 4,
    burn: 0,
    summary:
      "Animates a nearby corpse into a zombie (fast zombie at higher levels) that requires a move action each round to direct, or 1 burn to act autonomously for a time.",
  },
  {
    slug: "curseBreaker",
    name: "Curse Breaker",
    category: "utility",
    element: "void",
    level: 4,
    burn: 0,
    summary:
      "Requires Emptiness; grants a +4 save bonus against curses and hexes; 1 burn lets you attempt a caster level check to end (or indefinitely suppress) a curse on yourself or an ally.",
  },
  {
    slug: "eyesOfTheVoidGreater",
    name: "Eyes of the Void, Greater",
    category: "utility",
    element: "void",
    level: 5,
    burn: 0,
    summary:
      "Requires Eyes of the Void; grants true darkness-piercing sight, as the see in darkness monster ability.",
  },
  {
    slug: "gravityControlGreater",
    name: "Gravity Control, Greater",
    category: "utility",
    element: "void",
    level: 5,
    burn: 0,
    summary:
      "Requires Gravity Control; as Gravity Control, with greater range and control over your gravity-driven movement.",
  },
  {
    slug: "gravityMaster",
    name: "Gravity Master",
    category: "utility",
    element: "void",
    level: 9,
    burn: 0,
    summary: "Creates a zone of reversed gravity you can redirect at will, as reverse gravity.",
  },
];

const WOOD_TALENTS: KineticistWildTalentDef[] = [
  {
    slug: "photokineticInfusion",
    name: "Photokinetic Infusion",
    category: "infusion",
    kind: "substance",
    element: "wood",
    level: 1,
    burn: 1,
    summary:
      "Blast damage becomes light-based: full damage to undead but only minimum damage to the living, plus bonus damage per die against undead vulnerable to sunlight.",
  },
  {
    slug: "toxicInfusion",
    name: "Toxic Infusion",
    category: "infusion",
    kind: "substance",
    element: "wood",
    level: 4,
    burn: 3,
    summary:
      "A target taking piercing or slashing damage from the blast becomes sickened for 1 round.",
  },
  {
    slug: "sporeInfusion",
    name: "Spore Infusion",
    category: "infusion",
    kind: "substance",
    element: "wood",
    level: 5,
    burn: 3,
    summary:
      "A failed Fortitude save against piercing/slashing blast damage infects the target with fungal growth (damage over 10 rounds, then a lingering disease); an infected target grants your wood blasts +2 on attacks, DCs, and CL checks against it.",
  },
  {
    slug: "toxicInfusionGreater",
    name: "Toxic Infusion, Greater",
    category: "infusion",
    kind: "substance",
    element: "wood",
    level: 7,
    burn: 4,
    summary:
      "Requires Toxic Infusion; choose a physical ability score, and a target taking piercing/slashing blast damage must save or take injury-poison damage to that score over several rounds.",
  },
  {
    slug: "woodlandStep",
    name: "Woodland Step",
    category: "utility",
    element: "wood",
    level: 1,
    burn: 0,
    summary:
      "Constant woodland stride; a standard action and caster level check also lets you ignore magically manipulated plant obstacles.",
  },
  {
    slug: "roots",
    name: "Roots",
    category: "utility",
    element: "wood",
    level: 1,
    burn: 0,
    summary:
      "As Earth Walk, but anchors your footing against forced movement on soft ground (soil, snow) rather than stone.",
  },
  {
    slug: "woodHealer",
    name: "Wood Healer",
    category: "utility",
    element: "wood",
    level: 1,
    burn: 1,
    summary:
      "Requires Positive Blast; as Kinetic Healer, but healing is drawn from Positive Blast rather than Wood Blast.",
  },
  {
    slug: "mercifulFoliage",
    name: "Merciful Foliage",
    category: "utility",
    element: "wood",
    level: 2,
    burn: 0,
    summary: "Wood (and composite wood) blasts can deal nonlethal damage with no attack penalty.",
  },
  {
    slug: "brachiation",
    name: "Brachiation",
    category: "utility",
    element: "wood",
    level: 3,
    burn: 0,
    summary: "Grants a climb speed equal to your base speed while moving through forested terrain.",
  },
  {
    slug: "thornFlesh",
    name: "Thorn Flesh",
    category: "utility",
    element: "wood",
    level: 3,
    burn: 1,
    summary:
      "As Jagged Flesh, but the barbs are thorns: creatures striking you in melee take damage.",
  },
  {
    slug: "warpWood",
    name: "Warp Wood",
    category: "utility",
    element: "wood",
    level: 3,
    burn: 0,
    summary:
      "Functions as the warp wood spell, bending and twisting wood and wooden objects at will.",
  },
  {
    slug: "greensight",
    name: "Greensight",
    category: "utility",
    element: "wood",
    level: 4,
    burn: 0,
    summary: "Grants greensight out to 60 ft., letting you see through plant material.",
  },
  {
    slug: "herbalAntivenom",
    name: "Herbal Antivenom",
    category: "utility",
    element: "wood",
    level: 4,
    burn: 0,
    summary:
      "Grants a +5 alchemical bonus on poison saves; touch a creature to attempt an immediate treat-poison check without a kit (1 burn instead produces a full neutralize poison).",
  },
  {
    slug: "plantDisguise",
    name: "Plant Disguise",
    category: "utility",
    element: "wood",
    level: 4,
    burn: 0,
    summary:
      "As Tree Shape, but you can become any ordinary Small or Medium plant, not just a tree.",
  },
  {
    slug: "shapeWood",
    name: "Shape Wood",
    category: "utility",
    element: "wood",
    level: 4,
    burn: 0,
    summary: "Functions as the wood shape spell, reshaping wooden material to your design.",
  },
  {
    slug: "plantPuppet",
    name: "Plant Puppet",
    category: "utility",
    element: "wood",
    level: 5,
    burn: 0,
    summary:
      "As Aether Puppet, but animates and directs plants instead of an object; animated Large-or-bigger plants gain hardness 5 at 12th level.",
  },
  {
    slug: "wildGrowth",
    name: "Wild Growth",
    category: "utility",
    element: "wood",
    level: 5,
    burn: 0,
    summary:
      "Functions as the plant growth spell, enriching growth to aid allies and crops or choking terrain to hinder foes.",
  },
  {
    slug: "woodlandStepGreater",
    name: "Woodland Step, Greater",
    category: "utility",
    element: "wood",
    level: 5,
    burn: 0,
    summary:
      "Requires Woodland Step; extends woodland-stride-like benefits to you and all allies within 30 ft., as forest friend.",
  },
  {
    slug: "greenTongue",
    name: "Green Tongue",
    category: "utility",
    element: "wood",
    level: 6,
    burn: 0,
    summary: "Grants constant speak with plants.",
  },
  {
    slug: "greenTongueGreater",
    name: "Green Tongue, Greater",
    category: "utility",
    element: "wood",
    level: 7,
    burn: 0,
    summary:
      "Requires Green Tongue; after 10 minutes of concentration outdoors, commune with fey or leshy spirits for a handful of questions, as commune with nature.",
  },
  {
    slug: "treeStep",
    name: "Tree Step",
    category: "utility",
    element: "wood",
    level: 7,
    burn: 1,
    summary:
      "Enter a tree to teleport to another tree of the same type within range, as tree stride, a number of times per activation equal to your kineticist level; an extra burn spends all remaining steps at once.",
  },
  {
    slug: "woodSoldiers",
    name: "Wood Soldiers",
    category: "utility",
    element: "wood",
    level: 8,
    burn: 1,
    summary:
      "Whenever you recover burn, animate four wooden guardians at no cost; optional seasonal blast riders grant one guardian flight, fire resistance and damage, burrowing, or cold damage.",
  },
  {
    slug: "forestSiege",
    name: "Forest Siege",
    category: "utility",
    element: "wood",
    level: 9,
    burn: 0,
    summary:
      "Sustains a greater siege-of-trees effect requiring concentration (changeable as a bonus action); 1 optional burn removes the concentration requirement until burn resets.",
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
  ...VOID_TALENTS,
  ...WOOD_TALENTS,
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

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.kineticWildTalents` (see that type's doc
 * comment) is the FULL published catalog, every kind — infusions, utility
 * talents, simple/composite blasts, defense talents — prose only, plus
 * (unlike rage powers/investigator talents/arcanist exploits) real
 * structured `level`/`burn`/`elements` fields for infusions and utility
 * talents specifically, EMPIRICALLY VALIDATED against this table: Extended
 * Range (universal, level 1/burn 1), Extreme Range (universal, level
 * 3/burn 2), Air Cushion (air, level 1/burn 0), and Aerial Evasion (air,
 * level 3/burn 1) all match their vendored counterpart's parsed `level`/
 * `burn` exactly — so, unlike `RagePower.level`, `KineticWildTalent.level`
 * IS the real `minKineticistLevelForTalent` gate, not a within-chain tier
 * marker. This overlay merges only the `kind: "infusion" | "utility"`
 * subset (the two BUDGETED picks, `build.kineticistWildTalents`) — simple
 * blasts/defense talents stay display-only data with no merge machinery
 * (see `KineticWildTalent`'s doc comment for why); composite blasts merge
 * separately, through `kineticist-elements.ts`'s `mergedCompositeBlastCatalog`.
 *
 * Collision audit (all 236 hand-authored entries, run against the pinned Pf
 * Data 1e slice): 216 matched a vendored entry by normalized name directly;
 * 20 needed an alias (the hand table's "X, Greater" naming vs. the source's
 * "Greater X" — see `KINETICIST_WILD_TALENT_NAME_ALIASES`). The remaining 7
 * vendored infusion/utility rows with no hand-authored match are each
 * element's auto-granted "Basic <Element>kinesis" entry (see file doc
 * comment's SCOPE section) — the only intentional gap. No name collides
 * within the vendored catalog itself (checked across the full 278-entry
 * catalog, not just the infusion/utility subset). A handful of matched entries'
 * vendored `burn` reads lower than this table's own (Spark of Life, Celerity
 * — vendored burn 0 vs. this table's 1) — read as this table's OWN "0 or 1,
 * simplified to its base" scoping choice (see `KineticistWildTalentDef.burn`'s
 * doc comment) landing on the non-zero option, not a data error; the
 * hand-authored `burn` stays authoritative for a matched entry regardless.
 */

/** Alias for the hand-authored entries whose vendored counterpart uses "Greater X" instead of this table's "X, Greater". */
const KINETICIST_WILD_TALENT_NAME_ALIASES: Record<string, string> = {
  "universal:skilledKineticistGreater": "Greater Skilled Kineticist",
  "universal:elementalWhispersGreater": "Greater Elemental Whispers",
  "universal:venomInfusionGreater": "Greater Venom Infusion",
  "aether:selfTelekinesisGreater": "Greater Self Telekinesis",
  "air:airShroudGreater": "Greater Air Shroud",
  "air:magnetismGreater": "Greater Magnetism",
  "air:voiceOfTheWindGreater": "Greater Voice of the Wind",
  "air:windsightGreater": "Greater Windsight",
  "earth:tremorsenseGreater": "Greater Tremorsense",
  "earth:shiftEarthGreater": "Greater Shift Earth",
  "fire:flameJetGreater": "Greater Flame Jet",
  "fire:fireSteedGreater": "Greater Fire Steed",
  "water:waterdancerGreater": "Greater Waterdancer",
  "water:watersenseGreater": "Greater Watersense",
  "void:darknessInfusionGreater": "Greater Darkness Infusion",
  "void:eyesOfTheVoidGreater": "Greater Eyes of the Void",
  "void:gravityControlGreater": "Greater Gravity Control",
  "wood:toxicInfusionGreater": "Greater Toxic Infusion",
  "wood:woodlandStepGreater": "Greater Woodland Step",
  "wood:greenTongueGreater": "Greater Green Tongue",
};

function normalizeWildTalentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

/** A catalog entry the picker can browse — either the hand-authored def (matched) with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedKineticistWildTalentEntry extends KineticistWildTalentDef {
  /** The vendored slug id (`"<elementTag-or-universal>:<slug>"`), when a vendored entry backs this row — differs from the hand-authored `id()` shape for a vendored-only row (the RAW dataset key, e.g. `"air_cushion"`, has no element prefix), so callers needing an id use THIS field, not `id(element, slug)`. */
  id: string;
  /**
   * ALL element tags this talent is scoped to, for picker menu-scoping —
   * `[element]` for a matched/hand-authored row, but the FULL vendored
   * `elements` array for a vendored-only row (some vendored infusions list
   * several elements — the union of their RAW "Associated Blasts"'
   * elements, e.g. Pushing Infusion's `[aether, air, earth, void, water,
   * wood]` — NOT the same as this table's `element: "universal"`
   * simplification for the SAME infusion when hand-authored, which ignores
   * Associated Blasts entirely per this file's own doc comment; a
   * vendored-only multi-element entry keeps its full element list rather
   * than collapsing to one arbitrarily, so the picker never hides it from a
   * character who knows one of its OTHER elements). Callers doing
   * known-element menu scoping should filter on THIS field, not `element`
   * (which stays single-valued for `KineticistWildTalentDef` shape
   * compatibility).
   */
  elements: readonly string[];
  /** Ability-type suffix as published, e.g. "(Su)" — undefined for the (currently none) hand-authored-only case. */
  nameSuffix?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: KineticWildTalent): MergedKineticistWildTalentEntry {
  const elements = entry.elements.length > 0 ? entry.elements : ["universal"];
  return {
    id: entry.id,
    slug: entry.id,
    name: entry.name,
    category: entry.kind === "infusion" ? "infusion" : "utility",
    kind: entry.infusionKind,
    element: elements[0]!,
    elements,
    // Real level/burn gate (see file doc comment) — unlike rage powers'
    // vendored `level`, this IS safe to use for a vendored-only entry.
    level: entry.level ?? 1,
    burn: entry.burn,
    summary: plainTextPreview(entry.description ?? ""),
    nameSuffix: entry.nameSuffix,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked wild-talent id (`doc.build.kineticistWildTalents`
 * entries) to its definition — hand-authored table first (mechanics-
 * authoritative), falling back to the vendored catalog (infusion/utility
 * kinds only — see file doc comment) for an id that only exists there. Used
 * by `archetypes.ts`/`model/kineticistBuild.ts` instead of indexing
 * `KINETICIST_WILD_TALENTS`/`findKineticistWildTalent` directly, so a
 * vendored-only pick resolves to a real (display-only) definition rather
 * than being silently dropped.
 */
export function resolveKineticistWildTalent(
  talentId: string,
  refData: RefData,
): MergedKineticistWildTalentEntry | undefined {
  const hand = KINETICIST_WILD_TALENTS[talentId];
  if (hand) return { ...hand, id: talentId, elements: [hand.element] };
  const vendored = refData.kineticWildTalents?.[talentId];
  if (!vendored || (vendored.kind !== "infusion" && vendored.kind !== "utility")) return undefined;
  return vendoredToDef(vendored);
}

/**
 * The full picker-browsable catalog of infusion/utility wild talents: every
 * vendored `kind: "infusion" | "utility"` entry, with any that collides (by
 * normalized name, alias-mapped) against a hand-authored entry REPLACED by
 * that hand-authored def (keeping its own `id()` and real mechanics, but
 * carrying the vendored entry's prose/sources along for display); no
 * hand-authored-only entries exist to append per the collision audit above.
 * A caller wanting a "modeled" badge distinguishes a real entry from a
 * vendored-only one by checking whether `KINETICIST_WILD_TALENTS[entry.id]`
 * exists (a vendored-only row's `id` is the RAW dataset key, never a
 * hand-authored `id()` shape).
 */
export function mergedKineticistWildTalentCatalog(
  refData: RefData,
): MergedKineticistWildTalentEntry[] {
  const handByNormName = new Map<string, KineticistWildTalentDef>();
  for (const t of ALL_TALENTS) {
    const talentId = id(t.element, t.slug);
    handByNormName.set(
      normalizeWildTalentName(KINETICIST_WILD_TALENT_NAME_ALIASES[talentId] ?? t.name),
      t,
    );
  }

  const vendored = Object.values(refData.kineticWildTalents ?? {}).filter(
    (t) => t.kind === "infusion" || t.kind === "utility",
  );
  const merged: MergedKineticistWildTalentEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeWildTalentName(v.name));
    merged.push(
      handMatch
        ? {
            ...handMatch,
            id: id(handMatch.element, handMatch.slug),
            elements: [handMatch.element],
            nameSuffix: v.nameSuffix,
            description: v.description,
            sources: v.sources,
          }
        : vendoredToDef(v),
    );
  }
  return merged;
}
