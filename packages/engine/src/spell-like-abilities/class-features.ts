/**
 * Spell-like abilities granted by class features and by domain/school/
 * inquisition granted powers — one table, keyed by the vendored
 * `RefData.classFeatures` pack id (granted powers are classFeatures entries
 * too, and flow through `collectGrantedFeatures` with their granting class's
 * tag exactly like the per-day-activation table's keys).
 *
 * Defaults for this shard (see `types.ts`): caster level is the GRANTING
 * class's level (`@class.unlevel`); a `uses.formula` also evaluates with
 * `@class.unlevel` bound to that class. A feature whose vendored entry
 * already carries `uses.maxFormula` should attach (`attachToSourcePool`)
 * instead of restating the budget. `minLevel` is rarely needed — the vendored
 * grant level already gates when the feature appears.
 */

import type { PickChoice } from "../rage-powers.js";
import type { SlaGrantDef } from "./types.js";

export const CLASS_FEATURE_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  // Inquisitor, Discern Lies (5th): "can Discern Lies, as per the spell, for
  // a number of rounds per day equal to her inquisitor level" — vendored
  // uses.maxFormula already carries that budget.
  S9lYCsz7oA7v3GzR: [{ slug: "discern-lies", spell: "Discern Lies", attachToSourcePool: true }],
  // Hellknight, Discern Lies (2nd): "a number of times per day equal to 3 +
  // his Charisma modifier"; caster level equal to character level. No
  // vendored uses block, so a formula-metered def.
  ZvwRtHL9eolE7jSJ: [
    {
      slug: "discern-lies",
      spell: "Discern Lies",
      uses: { formula: "3 + @abilities.cha.mod", per: "day" },
      cl: "@attributes.hd.total",
    },
  ],
  // Hellknight Signifer, Discern Lies (6th): same shape, "total character
  // level" stated explicitly.
  AXci9ACyCugALXQq: [
    {
      slug: "discern-lies",
      spell: "Discern Lies",
      uses: { formula: "3 + @abilities.cha.mod", per: "day" },
      cl: "@attributes.hd.total",
    },
  ],
  // Sleepless Detective, Discern Lies (7th): "rounds per day equal to her
  // class level," no vendored uses block.
  R7Byu97rL8jPeqaz: [
    {
      slug: "discern-lies",
      spell: "Discern Lies",
      uses: { formula: "@class.unlevel", per: "day" },
    },
  ],

  // Cleric domain power, Lightning Lord (8th): "call down a number of bolts
  // ... per day equal to your cleric level ... otherwise functions as call
  // lightning" — vendored uses.maxFormula carries the budget.
  FZdWscHJvJpGPoDz: [{ slug: "call-lightning", spell: "Call Lightning", attachToSourcePool: true }],
  // Cleric domain power, Remote Viewing (6th): "use Clairaudience/
  // Clairvoyance at will ... for a number of rounds per day equal to your
  // cleric level" — names the actual combined spell, not a style-alike; the
  // vendored uses block already carries the rounds/day budget.
  yUdt1JIkSsQabXTF: [
    {
      slug: "clairaudience-clairvoyance",
      spell: "Clairaudience/Clairvoyance",
      attachToSourcePool: true,
    },
  ],
  // Wizard arcane discovery, Send Senses: "the sensor otherwise functions as
  // a Clairaudience/Clairvoyance spell" — vendored uses.maxFormula carries
  // "3 + Intelligence modifier" per day.
  OLh9DNRqDf7yjSwM: [
    {
      slug: "clairaudience-clairvoyance",
      spell: "Clairaudience/Clairvoyance",
      attachToSourcePool: true,
    },
  ],
  // Wizard arcane discovery, Creator's Will: "cast Minor Creation ... At 12th
  // level, this ability improves to Major Creation." Both tiers share one
  // vendored budget (half wizard level/day); only the 12th-level Major
  // Creation form is wired, since the def shape has no upper-level gate to
  // retire the 8th-level Minor Creation tier once it's superseded.
  HMmsaPUiNgB5Xa8u: [
    { slug: "major-creation", spell: "Major Creation", attachToSourcePool: true, minLevel: 12 },
  ],
  // Wizard arcane discovery, Invisibility Field (8th): "you can make yourself
  // Invisible as a swift action for a number of rounds per day equal to your
  // wizard level ... this otherwise functions as Invisibility, Greater."
  // Vendored uses.maxFormula carries the budget.
  W7nMOLi2kXGEKe72: [
    { slug: "invisibility-greater", spell: "Invisibility, Greater", attachToSourcePool: true },
  ],

  // Inquisition granted powers (inquisitor). None of these state a DC
  // ability in the published text, so the Charisma default applies.
  //
  // Reformation, Awaken Discontent (8th): "charm person ... times per day
  // equal to your Wisdom modifier," DC keyed to Wisdom explicitly.
  "inquisition-power:reformation:awaken-discontent": [
    {
      slug: "charm-person",
      spell: "Charm Person",
      uses: { formula: "@abilities.wis.mod", per: "day" },
      dcAbility: "wis",
    },
  ],
  // Heresy, Word of Anathema (8th): "once per day ... acts as bestow curse."
  "inquisition-power:heresy:word-of-anathema": [
    { slug: "bestow-curse", spell: "Bestow Curse", uses: { formula: "1", per: "day" } },
  ],
  // Banishment, Dismissive Touch (8th): "cast dismissal once per day ...
  // upon making a successful unarmed touch attack against an evil outsider.
  // The DC ... increases by 2" (rider not modeled as a number).
  "inquisition-power:banishment:dismissive-touch": [
    {
      slug: "dismissal",
      spell: "Dismissal",
      uses: { formula: "1", per: "day" },
      note: "touch attack vs. an evil outsider; DC +2 against that target",
    },
  ],
  // Truth, Grasp of Honesty (8th): "any creature you are grappling or
  // pinning is affected by zone of truth ... rounds per day equal to your
  // inquisitor level."
  "inquisition-power:truth:grasp-of-honesty": [
    {
      slug: "zone-of-truth",
      spell: "Zone of Truth",
      uses: { formula: "@class.unlevel", per: "day" },
      note: "requires grappling, pinning, or touching the target",
    },
  ],
  // Redemption, Second Chance (8th): "Once per day ... cast atonement as a
  // spell-like ability."
  "inquisition-power:redemption:second-chance": [
    { slug: "atonement", spell: "Atonement", uses: { formula: "1", per: "day" } },
  ],
  // Torture, Torturer's Touch: "use touch of fatigue ... times per day equal
  // to 3 + your Wisdom modifier" (the "add Wisdom modifier to damage" rider
  // isn't expressible as a number here).
  "inquisition-power:torture:torturer-s-touch": [
    {
      slug: "touch-of-fatigue",
      spell: "Touch of Fatigue",
      uses: { formula: "3 + @abilities.wis.mod", per: "day" },
    },
  ],
  // Politics, Heart's Desire (8th): "Once per day, you can use commune as a
  // spell-like ability using your inquisitor level as your caster level."
  "inquisition-power:politics:heart-s-desire": [
    { slug: "commune", spell: "Commune", uses: { formula: "1", per: "day" } },
  ],
  // Fate, Augury: "Once per day, you can use augury as a spell-like
  // ability."
  "inquisition-power:fate:augury": [
    { slug: "augury", spell: "Augury", uses: { formula: "1", per: "day" } },
  ],
  // Crime, Criminal Minds: "otherwise functions as per crime of opportunity
  // ... times per day equal to 3 + your Wisdom modifier (minimum 1)."
  "inquisition-power:crime:criminal-minds": [
    {
      slug: "crime-of-opportunity",
      spell: "Crime of Opportunity",
      uses: { formula: "max(1, 3 + @abilities.wis.mod)", per: "day" },
    },
  ],
  // Final Rest, Disrupt Animation: "use disrupt undead as a spell-like
  // ability, adding your wisdom modifier to the damage" (damage rider not
  // modeled). Uses equal 3 + Wisdom modifier per day.
  "inquisition-power:final_rest:disrupt-animation": [
    {
      slug: "disrupt-undead",
      spell: "Disrupt Undead",
      uses: { formula: "3 + @abilities.wis.mod", per: "day" },
      note: "damage gains a bonus equal to Wisdom modifier (not modeled)",
    },
  ],

  // Druid domain power, Remembrance (Ruins, 4th): "Once per day for every 4
  // druid levels you possess, you can cast divination as a spell-like
  // ability." The commune-with-nature synergy rider isn't a separate grant.
  "druid-domain:ruins:remembrance": [
    {
      slug: "divination",
      spell: "Divination",
      uses: { formula: "floor(@class.unlevel / 4)", per: "day" },
    },
  ],
  // Druid domain power, Agent of Rebirth (Vulture, 8th): "expend ... oils
  // worth 1,000 gp to cast reincarnate as a spell-like ability usable once
  // per day."
  "druid-domain:vulture:agent-of-rebirth": [
    {
      slug: "reincarnate",
      spell: "Reincarnate",
      uses: { formula: "1", per: "day" },
      note: "consumes 1,000 gp of special oils per use",
    },
  ],

  // Exalted (prestige class), Ardent Vision (8th): detect chaos/evil/good/
  // law at will against ONE alignment opposed to the exalted's own, chosen
  // once and fixed — no stored pick to key a single spell from. Left
  // unwired (choice-gated).
  //
  // Exalted, Expanded Portfolio (5th): a chosen domain's spells as 1/day
  // SLAs — the domain choice and its spell list aren't stored per-spell.
  // Left unwired (choice-gated).

  // Nature warden, Plant Speech (7th): "cast speak with plants at will when
  // in her favored terrain. Outside her favored terrain, ... once per day."
  // The tracker has no notion of "currently in favored terrain," so only the
  // guaranteed once-per-day fallback is wired.
  SY96O48qbFnXat9N: [
    {
      slug: "speak-with-plants",
      spell: "Speak with Plants",
      uses: { formula: "1", per: "day" },
      note: "at will while in favored terrain (not modeled); once/day otherwise",
    },
  ],
  // Nature warden, Animal Speech (3rd): same at-will-in-terrain/once-per-day
  // shape.
  iu1bWa1gesZkMOEL: [
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      uses: { formula: "1", per: "day" },
      note: "at will while in favored terrain (not modeled); once/day otherwise",
    },
  ],
  // Nature warden, Woodforging (6th): "she may use wood shape as a
  // spell-like ability with a caster level equal to her nature warden
  // level," once per day.
  WXXdAw7okLKxurhD: [
    { slug: "wood-shape", spell: "Wood Shape", uses: { formula: "1", per: "day" } },
  ],

  // Spiritualist, Detect Undead (5th): "use detect undead at will as a
  // spell-like ability."
  izFlIPdU4a9yHBDm: [{ slug: "detect-undead", spell: "Detect Undead", frequency: "atWill" }],
  // Spiritualist, See Invisibility (9th): vendored 1/day uses block.
  GRfwR4nZHTx7JifZ: [
    { slug: "see-invisibility", spell: "See Invisibility", attachToSourcePool: true },
  ],
  // Spiritualist, Call Spirit (16th): vendored 1/day uses block. Call Spirit
  // is itself a vendored spell (the spiritualist's own list), so this
  // resolves cleanly.
  OsRZD888rDOpHqoZ: [{ slug: "call-spirit", spell: "Call Spirit", attachToSourcePool: true }],
  // Spiritualist, Calm Spirit (7th): vendored uses.maxFormula already scales
  // "an additional time per 4 levels after 7th, max 4/day at 19th."
  bwPeas5tuLvKhuE4: [{ slug: "calm-spirit", spell: "Calm Spirit", attachToSourcePool: true }],

  // Psychic, Detect Thoughts (2nd): vendored 1/day uses block. (The
  // spell-slot-expenditure alternative isn't a separate grant.)
  H13C5vWmFxF6NRdZ: [
    { slug: "detect-thoughts", spell: "Detect Thoughts", attachToSourcePool: true },
  ],
  // Psychic, Telepathic Bond (9th): vendored 1/day uses block.
  pI96OyLrjc1EyhaE: [
    { slug: "telepathic-bond", spell: "Telepathic Bond", attachToSourcePool: true },
  ],

  // Reforged Heart (Heritor Knight, 6th): "cast greater make whole
  // (Pathfinder Campaign Setting: Technology Guide) as a spell-like
  // ability." Greater Make Whole isn't in the vendored spell slice. Left
  // unwired (unresolvable spell).

  // Lantern Bearer, Lantern Arcana (1st): a tiered SLA list. Caster level and
  // save-DC ability are pinned to character level / Intelligence by the
  // published text (overriding both shard defaults); the Intelligence-score
  // gate per tier ("must have an Intelligence score equal to at least 10 +
  // the spell-like ability's spell level") is a rider, not encoded. Each
  // tier's use count is 1/day when first gained, +1 every 2 class levels
  // after that: `floor((level - tierLevel) / 2) + 1`.
  rJ8E3SxHrK2PR5S8: [
    {
      slug: "dancing-lights",
      spell: "Dancing Lights",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      frequency: "atWill",
    },
    {
      slug: "light",
      spell: "Light",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      frequency: "atWill",
    },
    {
      slug: "spark",
      spell: "Spark",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      frequency: "atWill",
    },
    {
      slug: "faerie-fire",
      spell: "Faerie Fire",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      uses: { formula: "floor((@class.unlevel - 1) / 2) + 1", per: "day" },
    },
    {
      slug: "pass-without-trace",
      spell: "Pass without Trace",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      uses: { formula: "floor((@class.unlevel - 1) / 2) + 1", per: "day" },
    },
    {
      slug: "protection-from-evil",
      spell: "Protection from Evil",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      uses: { formula: "floor((@class.unlevel - 1) / 2) + 1", per: "day" },
    },
    {
      slug: "darkvision",
      spell: "Darkvision",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 3,
      uses: { formula: "floor((@class.unlevel - 3) / 2) + 1", per: "day" },
      note: "self only",
    },
    {
      slug: "delay-poison",
      spell: "Delay Poison",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 3,
      uses: { formula: "floor((@class.unlevel - 3) / 2) + 1", per: "day" },
      note: "self only",
    },
    {
      slug: "see-invisibility",
      spell: "See Invisibility",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 3,
      uses: { formula: "floor((@class.unlevel - 3) / 2) + 1", per: "day" },
    },
    {
      slug: "continual-flame",
      spell: "Continual Flame",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 5,
      spellLevel: 3,
      uses: { formula: "floor((@class.unlevel - 5) / 2) + 1", per: "day" },
      note: "lasts up to 10 minutes per level; can be extinguished within 20 feet to cast searing light (not modeled)",
    },
    {
      slug: "dispel-magic",
      spell: "Dispel Magic",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 5,
      uses: { formula: "floor((@class.unlevel - 5) / 2) + 1", per: "day" },
    },
    {
      slug: "magic-circle-against-evil",
      spell: "Magic Circle against Evil",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 5,
      uses: { formula: "floor((@class.unlevel - 5) / 2) + 1", per: "day" },
      note: "self only",
    },
    {
      slug: "daylight",
      displayName: "Heightened Daylight",
      spell: "Daylight",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 7,
      spellLevel: 4,
      uses: { formula: "floor((@class.unlevel - 7) / 2) + 1", per: "day" },
    },
    {
      slug: "dimensional-anchor",
      spell: "Dimensional Anchor",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 7,
      uses: { formula: "floor((@class.unlevel - 7) / 2) + 1", per: "day" },
    },
    {
      slug: "freedom-of-movement",
      spell: "Freedom of Movement",
      cl: "@attributes.hd.total",
      dcAbility: "int",
      minLevel: 7,
      uses: { formula: "floor((@class.unlevel - 7) / 2) + 1", per: "day" },
      note: "self only",
    },
  ],

  // Living Monolith, Assumption of Stone (9th): "may use statue as a
  // spell-like ability with a range of personal at will."
  uSDamJbUefOqi2jH: [{ slug: "statue", spell: "Statue", frequency: "atWill", note: "self only" }],

  // Sacred Sentinel, Swift Shield Other (8th): "use shield other as a
  // quickened spell-like ability a number of times per day equal to her
  // Charisma bonus (minimum once per day)."
  r4c0rB7XE9KGLisb: [
    {
      slug: "shield-other",
      spell: "Shield Other",
      uses: { formula: "max(1, @abilities.cha.mod)", per: "day" },
    },
  ],

  // Sanguine Angel, Mystique of Ardad Lili (7th): "the sanguine angel can
  // use dominate person as a spell-like ability" once per day (the
  // Diplomacy/Intimidate bonus half isn't Change-shaped).
  "2PyGmB1R6ciYAaBb": [
    { slug: "dominate-person", spell: "Dominate Person", uses: { formula: "1", per: "day" } },
  ],

  // Stargazer's "Arcana: The Rider" and "Arcana: The Stranger" (would-be
  // phantom steed / cultural adaptation grants) are left unwired: the
  // vendored class list auto-lists all twelve Sidereal Arcana at 1st level
  // (Arcana: The Rider at 4th) with no choice-tracking, so a def keyed to
  // either feature id would grant it to every stargazer regardless of pick
  // (see this feature's classification note, "Arcana: The Thrush").

  // Sleepless Detective, Deductive Examination (3rd): "use the spell
  // residual tracking three times per day."
  TLFiwIpn9Aogn7QT: [
    { slug: "residual-tracking", spell: "Residual Tracking", uses: { formula: "3", per: "day" } },
  ],
  // Sleepless Detective, Hematomancy (5th): "use the spell blood biography
  // three times per day."
  WCLjLkw2CREssenw: [
    { slug: "blood-biography", spell: "Blood Biography", uses: { formula: "3", per: "day" } },
  ],

  // Red Mantis Assassin, Mantis Doom (9th): "use creeping doom as a
  // spell-like ability three times per day (with a caster level equal to
  // her character level)."
  cREFsbYTS8hi7VaZ: [
    {
      slug: "creeping-doom",
      spell: "Creeping Doom",
      cl: "@attributes.hd.total",
      uses: { formula: "3", per: "day" },
    },
  ],

  // Spherewalker, Longstrider (1st): "may use longstrider once per day. Her
  // caster level is equal to her character level."
  wlfWioBaK9Ihu0uk: [
    {
      slug: "longstrider",
      spell: "Longstrider",
      cl: "@attributes.hd.total",
      uses: { formula: "1", per: "day" },
    },
  ],

  // Diabolist, Hellfire Ray (8th): "cast hellfire ray twice per day as a
  // spell-like ability."
  "2spu5uxi4HgJK2yG": [
    { slug: "hellfire-ray", spell: "Hellfire Ray", uses: { formula: "2", per: "day" } },
  ],

  // Rivethun Emissary, Sixth Sense (2nd): "gains detect undead as a
  // spell-like ability, usable a number of times per day equal to her
  // Rivethun emissary level." (The 2nd/3rd-level fey/outsider detection
  // riders aren't separate grants.)
  "8stNZEPBiuVXSFOJ": [
    {
      slug: "detect-undead",
      spell: "Detect Undead",
      uses: { formula: "@class.unlevel", per: "day" },
      note: "also detects fey (2nd level) and outsiders (3rd level) with concentration",
    },
  ],
  // Rivethun Emissary, Parley (5th): "cast calm spirit three times per day
  // ... her caster level equals her character level." (6th/7th-level target
  // widening isn't a separate grant.)
  jETvA8X0eAsfHWKt: [
    {
      slug: "calm-spirit",
      spell: "Calm Spirit",
      cl: "@attributes.hd.total",
      uses: { formula: "3", per: "day" },
      note: "also affects corporeal undead/outsiders at 6th level, fey at 7th",
    },
  ],

  // Aspis Agent's "Agency Secret: Shrunken Smuggle" (would-be shrink item
  // grant) is left unwired: all nine Agency Secrets auto-list at 1st level
  // with no choice-tracking, so a def would grant it to every Aspis agent
  // regardless of which secret was actually picked.

  // Gray Corsair, Breathe Easy (4th): "can cast water breathing once per
  // day."
  LcQNqDSEbKjyAwnD: [
    { slug: "water-breathing", spell: "Water Breathing", uses: { formula: "1", per: "day" } },
  ],
  // Gray Corsair, Grant Freedom (9th): "gains the effects of freedom of
  // movement as a constant spell-like ability." (The swift-action transfer
  // to another creature is a rider, not a separate grant.)
  NzFkRthJoZIlSyFg: [
    {
      slug: "freedom-of-movement",
      spell: "Freedom of Movement",
      frequency: "constant",
      note: "can transfer the effect to another creature as a swift action",
    },
  ],
  // Gray Corsair, Whisk to Freedom (10th): "gains wind walk and word of
  // recall as spell-like abilities (caster level 10th), each usable once per
  // day."
  uBDwUbHyKlGMTAWj: [
    { slug: "wind-walk", spell: "Wind Walk", cl: "10", uses: { formula: "1", per: "day" } },
    {
      slug: "word-of-recall",
      spell: "Word of Recall",
      cl: "10",
      uses: { formula: "1", per: "day" },
      note: "must return the caster to a Gray Corsair ship",
    },
  ],

  // Harrower, Divination (6th, from 1st-level list): "gains the ability to
  // cast divination once per day ... caster level equals her character
  // level."
  nB3FkWMDt8b75D3p: [
    {
      slug: "divination",
      spell: "Divination",
      cl: "@attributes.hd.total",
      uses: { formula: "1", per: "day" },
    },
  ],

  // Hunter, Raise Animal Companion (10th): "gains Raise Animal Companion as
  // a spell-like ability," no per-day limit stated (its cost is a permanent
  // negative level, self-limiting). The 16th-level upgrade to a
  // resurrection-equivalent isn't a separately named vendored spell.
  h0hqYiLG7hkjPCin: [
    {
      slug: "raise-animal-companion",
      spell: "Raise Animal Companion",
      frequency: "atWill",
      note: "costs a permanent negative level; at 16th level functions as resurrection instead (not modeled)",
    },
  ],

  // Rose Warden's "Insurgent: Wall of Roses" (would-be wall of thorns grant)
  // is left unwired: the Insurgent Technique options auto-list at 1st level
  // with no choice-tracking, so a def would grant it to every rose warden
  // regardless of which technique was actually picked.

  // Souldrinker, Enervation (2nd): "cast enervation twice per day ... At 5th
  // level, four times per day, and at 8th level, six times per day (CL =
  // character level)."
  mMt5L8PmgkhviG3G: [
    {
      slug: "enervation",
      spell: "Enervation",
      cl: "@attributes.hd.total",
      uses: {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        per: "day",
      },
    },
  ],

  // Paladin, Detect Evil (1st): "At will, a paladin can use Detect Evil, as
  // the spell."
  "2YqtYAfLcV7KWkpJ": [{ slug: "detect-evil", spell: "Detect Evil", frequency: "atWill" }],
  // Antipaladin, Detect Good (1st): "At will, an antipaladin can use Detect
  // Good, as the spell."
  "4RSsmGUZBhTiGmSj": [{ slug: "detect-good", spell: "Detect Good", frequency: "atWill" }],
  // Pure Legion Enforcer, Divine Detective (2nd): "gains the ability to cast
  // detect magic at will as a spell-like ability."
  cRntFAMgTGBFSQhN: [{ slug: "detect-magic", spell: "Detect Magic", frequency: "atWill" }],

  // Brightness Seeker, One With Nature (4th): "may cast commune with nature
  // as a spell-like ability usable at will."
  dp8MEft2WJHEyarb: [
    { slug: "commune-with-nature", spell: "Commune with Nature", frequency: "atWill" },
  ],

  // Dawnflower Anchorite, Sunbeam (7th): "cast sunbeam once per day ... At
  // 10th level ... twice per day. His caster level is equal to his Hit
  // Dice" (Hit Dice = total character level here).
  zAxurbQLNDVcNC41: [
    {
      slug: "sunbeam",
      spell: "Sunbeam",
      cl: "@attributes.hd.total",
      uses: { formula: "if(gte(@class.unlevel, 10), 2, 1)", per: "day" },
    },
  ],

  // Exalted, Ardent Vision (8th): "the exalted can always discern the
  // enemies of her faith. She gains the ability to cast detect
  // chaos/evil/good/law at will, with a caster level equal to her character
  // level. The exalted must choose one alignment to detect that is opposed
  // to her alignment (or one of her choice is if she is neutral), and once
  // this choice is made it can't be changed." Four options, one per
  // alignment axis; `when` gates each on the matching stored pick — see
  // `CLASS_FEATURE_SLA_CHOICES` below for the picker descriptor. The
  // published "opposed to her alignment"/neutral-picks-freely constraint on
  // WHICH of the four is available isn't enforced here (same posture as
  // every other free-choice picker in this codebase); the "can't be changed
  // once made" lock isn't enforced either, since nothing in this engine
  // enforces build-choice permanence.
  lRmf8xptuEyiZ8o5: [
    {
      slug: "detect-chaos",
      spell: "Detect Chaos",
      frequency: "atWill",
      cl: "@attributes.hd.total",
      when: (doc) => doc.build.pickChoices?.["classFeature:lRmf8xptuEyiZ8o5"] === "chaos",
    },
    {
      slug: "detect-evil",
      spell: "Detect Evil",
      frequency: "atWill",
      cl: "@attributes.hd.total",
      when: (doc) => doc.build.pickChoices?.["classFeature:lRmf8xptuEyiZ8o5"] === "evil",
    },
    {
      slug: "detect-good",
      spell: "Detect Good",
      frequency: "atWill",
      cl: "@attributes.hd.total",
      when: (doc) => doc.build.pickChoices?.["classFeature:lRmf8xptuEyiZ8o5"] === "good",
    },
    {
      slug: "detect-law",
      spell: "Detect Law",
      frequency: "atWill",
      cl: "@attributes.hd.total",
      when: (doc) => doc.build.pickChoices?.["classFeature:lRmf8xptuEyiZ8o5"] === "law",
    },
  ],

  // Pure Legion Enforcer, Aura Sense (1st): "can cast detect chaos/evil/
  // good/law at will as a spell-like ability, though he can detect only
  // auras of moderate or higher power. He can detect only one type of aura
  // at any given time." No caster level is stated, so the grant defaults to
  // the granting class's level (this shard's own default, see the file's
  // header). Unlike Ardent Vision the published text doesn't lock the pick
  // permanently ("at any given time" implies it's re-selectable), but both
  // routes through the same free-choice `pickChoices` posture either way.
  c61UW4qjDBxLEBaK: [
    {
      slug: "detect-chaos",
      spell: "Detect Chaos",
      frequency: "atWill",
      note: "detects only auras of moderate power or higher",
      when: (doc) => doc.build.pickChoices?.["classFeature:c61UW4qjDBxLEBaK"] === "chaos",
    },
    {
      slug: "detect-evil",
      spell: "Detect Evil",
      frequency: "atWill",
      note: "detects only auras of moderate power or higher",
      when: (doc) => doc.build.pickChoices?.["classFeature:c61UW4qjDBxLEBaK"] === "evil",
    },
    {
      slug: "detect-good",
      spell: "Detect Good",
      frequency: "atWill",
      note: "detects only auras of moderate power or higher",
      when: (doc) => doc.build.pickChoices?.["classFeature:c61UW4qjDBxLEBaK"] === "good",
    },
    {
      slug: "detect-law",
      spell: "Detect Law",
      frequency: "atWill",
      note: "detects only auras of moderate power or higher",
      when: (doc) => doc.build.pickChoices?.["classFeature:c61UW4qjDBxLEBaK"] === "law",
    },
  ],
};

/**
 * Choice descriptors (dropdown prompt + option list) for the enumerable
 * choice-gated `CLASS_FEATURE_SLA_GRANTS` entries above — read by
 * `apps/web`'s `model/featureChoices.ts` (`classFeatureChoiceDescriptor`) to
 * render the same choose-one select `CLASS_FEATURE_CHOICES` gets, keyed by
 * the granting feature's own vendored id. Not consulted by the engine itself
 * (the `when` predicates above key directly off `build.pickChoices`); purely
 * a UI-facing declaration, same split as `PickChoice` elsewhere.
 */
export const CLASS_FEATURE_SLA_CHOICES: Readonly<Record<string, PickChoice>> = {
  lRmf8xptuEyiZ8o5: {
    label: "Detected alignment",
    options: [
      { id: "chaos", label: "Chaos" },
      { id: "evil", label: "Evil" },
      { id: "good", label: "Good" },
      { id: "law", label: "Law" },
    ],
  },
  c61UW4qjDBxLEBaK: {
    label: "Aura type",
    options: [
      { id: "chaos", label: "Chaos" },
      { id: "evil", label: "Evil" },
      { id: "good", label: "Good" },
      { id: "law", label: "Law" },
    ],
  },
};
