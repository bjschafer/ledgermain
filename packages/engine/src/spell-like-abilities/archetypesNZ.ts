/**
 * Spell-like abilities granted by archetype features, classes N–Z by class
 * tag (ninja … wizard) — keyed by the vendored
 * `RefData.archetypeFeatures` id
 * (`"<classTag>:<archetypeSlug>:<featureSlug>:<level>"`). The A–M half lives
 * in `archetypesAM.ts`; the class-tag split keeps wave agents' diffs
 * disjoint, and `index.ts` merges the two.
 *
 * Defaults for this shard (see `types.ts`): caster level is the archetype's
 * class level (`@class.unlevel`); the feature's own `level` already gates
 * when the grant appears, so `minLevel` is only for a grant that upgrades
 * later than the feature's grant level. Archetype features carry no vendored
 * `uses` block at all (the pack has no such field), so `attachToSourcePool`
 * never applies here — metered grants always state their own `uses`.
 */

import type { SlaGrantDef } from "./types.js";

export const ARCHETYPE_SLA_GRANTS_NZ: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  // ── occultist ──
  "occultist:battle-host:spirit-warrior:5": [
    {
      slug: "spirit-warrior",
      spell: "Spiritual Ally",
      dcAbility: "int",
      uses: { formula: "1 + floor((@class.unlevel - 5) / 4)", per: "day" },
      note: "uses the battle host's Intelligence modifier in place of Wisdom for the spell's effects; replaces aura sight",
    },
  ],
  "occultist:esoteric-initiate:symbolism:5": [
    {
      slug: "symbolism",
      spell: "Comprehend Languages",
      uses: { formula: "@class.unlevel", per: "day" },
      note: "reading a hidden message this way also grants a Linguistics check bonus to decipher it (narrow, not modeled)",
    },
  ],

  // ── oracle ──
  "oracle:cyclopean-seer:final-revelation:20": [
    { slug: "discern-location", spell: "Discern Location", uses: { formula: "1", per: "day" } },
    { slug: "prying-eyes", spell: "Prying Eyes", uses: { formula: "1", per: "day" } },
    { slug: "stone-tell", spell: "Stone Tell", uses: { formula: "1", per: "day" } },
  ],

  // ── paladin ──
  "paladin:invigorator:champion-of-life:20": [
    {
      slug: "champion-of-life",
      spell: "Breath of Life",
      uses: { formula: "3", per: "day" },
      note: "doesn't impose the spell's normal temporary negative level",
    },
  ],
  "paladin:vindictive-bastard:locate-ally:1": [
    {
      slug: "locate-ally",
      spell: "Locate Creature",
      uses: { formula: "1", per: "day" },
      note: "only to find an ally she's spent at least 24 hours near within the last week",
    },
  ],

  // ── psychic ──
  "psychic:magaambyan-telepath:know-the-land:9": [
    {
      slug: "know-the-land",
      spell: "Commune with Nature",
      uses: { formula: "1", per: "day" },
      note: "she can also expend an unused 5th-level+ spell slot for an extra casting (not modeled)",
    },
  ],
  "psychic:terror-weaver:aura-of-intimidation:9": [
    {
      slug: "aura-of-intimidation",
      spell: "Aura of Doom",
      uses: { formula: "1", per: "day" },
      note: "shakes foes; frightens at 11th level and panics at 19th (not modeled); an unused 4th-level+ spell slot casts an extra use",
    },
  ],
  "psychic:terror-weaver:manipulation:2": [
    {
      slug: "manipulation",
      spell: "Charm Person",
      uses: { formula: "1", per: "day" },
      note: "an unused 1st-level+ spell slot casts an extra use; if she already knows charm person she may swap it for a different known 1st-level spell instead (not modeled)",
    },
  ],

  // ── ranger ──
  "ranger:spirit-ranger:spirit-bond:4": [
    {
      slug: "spirit-bond",
      spell: "Augury",
      uses: { formula: "1", per: "day" },
      note: "usable only while within one of his favored terrains; replaces hunter's bond",
    },
  ],
  "ranger:stormwalker:control-weather:16": [
    { slug: "control-weather", spell: "Control Weather", uses: { formula: "1", per: "day" } },
  ],
  "ranger:tidal-hunter:tidal-surge:16": [
    { slug: "tidal-surge", spell: "Tidal Surge", uses: { formula: "1", per: "day" } },
  ],
  "ranger:urban-ranger:invisibility-trick:17": [
    {
      slug: "invisibility-trick",
      spell: "Invisibility, Greater",
      displayName: "Greater Invisibility (self)",
      uses: { formula: "max(1, @abilities.wis.mod)", per: "day" },
      note: "self only, castable as a swift action; replaces hide in plain sight",
    },
  ],

  // ── shaman ──
  "shaman:animist:etherealness:18": [
    { slug: "etherealness", spell: "Etherealness", uses: { formula: "1", per: "day" } },
  ],
  "shaman:animist:spirit-shaman:20": [
    { slug: "ethereal-jaunt", spell: "Ethereal Jaunt", frequency: "atWill" },
    { slug: "astral-projection", spell: "Astral Projection", uses: { formula: "1", per: "day" } },
  ],
  "shaman:grasping-vine:greentongue:2": [
    {
      slug: "speak-with-plants",
      spell: "Speak with Plants",
      uses: { formula: "floor(@class.unlevel / 2)", per: "day" },
    },
    {
      slug: "suggestion",
      spell: "Suggestion",
      uses: { formula: "1 + floor((@class.unlevel - 2) / 4)", per: "day" },
      note: "usable only against a single plant creature while under her own speak with plants, ignoring its mind-affecting immunity",
    },
  ],

  // ── shifter ──
  "shifter:swarm-shifter:final-aspect:20": [
    {
      slug: "final-aspect",
      spell: "Swarm Skin",
      cl: "@attributes.hd.total",
      frequency: "atWill",
      note: "caster level equals her total character level, not just shifter level",
    },
  ],
  "shifter:verdant-shifter:speak-with-plants:1": [
    {
      slug: "speak-with-plants",
      spell: "Speak with Plants",
      uses: { formula: "3 + @abilities.cha.mod", per: "day" },
    },
  ],

  // ── skald ──
  "skald:bacchanal:fermented-fruit:1": [
    {
      slug: "fermented-fruit",
      spell: "Goodberry",
      uses: { formula: "1", per: "day" },
      note: "berries cast this way ferment: 1 point of healing plus a +1 save bonus vs. fear for 1 minute, instead of a full meal",
    },
  ],

  // ── summoner ──
  "summoner:evolutionist:transmogrify:12": [
    {
      slug: "transmogrify",
      spell: "Transmogrify",
      uses: { formula: "1", per: "day" },
      note: "no material component needed; 1-minute casting time",
    },
  ],
  "summoner:naturalist:reflect-on-the-land:12": [
    {
      slug: "reflect-on-the-land",
      spell: "Commune with Nature",
      uses: { formula: "1", per: "day" },
    },
  ],
  "summoner:naturalist:tree-talker:8": [
    {
      slug: "tree-talker",
      spell: "Speak with Plants",
      uses: { formula: "3", per: "day" },
      note: "can also relay a short message to a familiar creature, delivered the next time it's near similar vegetation (not modeled)",
    },
  ],

  // ── warpriest ──
  "warpriest:fist-of-the-godclaw:detect-chaos:3": [
    {
      slug: "detect-chaos",
      spell: "Detect Chaos",
      uses: { formula: "3", per: "day" },
      note: "becomes at-will once he has detect chaos from any other source (not modeled)",
    },
  ],

  // ── witch ──
  "witch:sea-witch:know-direction:0": [
    {
      slug: "know-direction",
      spell: "Know Direction",
      frequency: "atWill",
      note: "only while near a sizable body of water",
    },
  ],

  // ── rogue / rogueUnchained (twin archetypes, identical vendored text) ──
  "rogue:discretion-specialist:evidence-disposal:4": [
    {
      slug: "evidence-disposal",
      spell: "Dress Corpse",
      uses: { formula: "1 + floor(@class.unlevel / 5)", per: "day" },
      note: "spending two uses instead disintegrates the corpse entirely (not modeled)",
    },
  ],
  "rogueUnchained:discretion-specialist:evidence-disposal:4": [
    {
      slug: "evidence-disposal",
      spell: "Dress Corpse",
      uses: { formula: "1 + floor(@class.unlevel / 5)", per: "day" },
      note: "spending two uses instead disintegrates the corpse entirely (not modeled)",
    },
  ],
  "rogue:dreamthief:dream-infiltrator:8": [
    {
      slug: "dream-scan",
      spell: "Dream Scan",
      uses: { formula: "1", per: "day" },
      note: "at 12th level she may cast dream travel instead (not modeled: tracker always offers dream scan)",
    },
  ],
  "rogueUnchained:dreamthief:dream-infiltrator:8": [
    {
      slug: "dream-scan",
      spell: "Dream Scan",
      uses: { formula: "1", per: "day" },
      note: "at 12th level she may cast dream travel instead (not modeled: tracker always offers dream scan)",
    },
  ],
  "rogue:eldritch-raider:detect-magic:2": [
    { slug: "detect-magic", spell: "Detect Magic", frequency: "atWill" },
  ],
  "rogueUnchained:eldritch-raider:detect-magic:2": [
    { slug: "detect-magic", spell: "Detect Magic", frequency: "atWill" },
  ],
  "rogue:kintargo-rebel:misdirection:4": [
    {
      slug: "misdirection",
      spell: "Misdirection",
      dcAbility: "int",
      uses: { formula: "1", per: "day" },
      note: "self plus a chosen creature (not an object); DC +1 if the target is lawful or evil (not modeled); replaces uncanny dodge",
    },
  ],
  "rogueUnchained:kintargo-rebel:misdirection:4": [
    {
      slug: "misdirection",
      spell: "Misdirection",
      dcAbility: "int",
      uses: { formula: "1", per: "day" },
      note: "self plus a chosen creature (not an object); DC +1 if the target is lawful or evil (not modeled); replaces uncanny dodge",
    },
  ],
  "rogue:kitsune-trickster:kitsune-s-charm:3": [
    {
      slug: "kitsune-s-charm",
      spell: "Charm Person",
      cl: "@class.unlevel - 2",
      uses: { formula: "1 + floor((@class.unlevel - 3) / 3)", per: "day" },
      note: "replaces trap sense",
    },
  ],
  "rogueUnchained:kitsune-trickster:kitsune-s-charm:3": [
    {
      slug: "kitsune-s-charm",
      spell: "Charm Person",
      cl: "@class.unlevel - 2",
      uses: { formula: "1 + floor((@class.unlevel - 3) / 3)", per: "day" },
      note: "replaces trap sense",
    },
  ],
  "rogue:sanctified-rogue:divine-epiphany:8": [
    {
      slug: "divine-epiphany",
      spell: "Augury",
      uses: { formula: "1", per: "day" },
      note: "replaces improved uncanny dodge",
    },
  ],
  "rogueUnchained:sanctified-rogue:divine-epiphany:8": [
    {
      slug: "divine-epiphany",
      spell: "Augury",
      uses: { formula: "1", per: "day" },
      note: "replaces improved uncanny dodge",
    },
  ],
  "rogue:shadow-scion:shadow-speaker:14": [
    {
      slug: "shadow-speaker",
      spell: "Commune with Nature",
      uses: { formula: "if(gte(@class.unlevel, 19), 2, 1)", per: "day" },
      note: "works in any terrain but reveals only what's currently in dim light or darkness",
    },
  ],
  "rogueUnchained:shadow-scion:shadow-speaker:14": [
    {
      slug: "shadow-speaker",
      spell: "Commune with Nature",
      uses: { formula: "if(gte(@class.unlevel, 19), 2, 1)", per: "day" },
      note: "works in any terrain but reveals only what's currently in dim light or darkness",
    },
  ],
  "rogue:survivalist:endure-elements:3": [
    {
      slug: "endure-elements",
      spell: "Endure Elements",
      uses: { formula: "1", per: "day" },
      note: "replaces trap sense",
    },
  ],
  "rogueUnchained:survivalist:endure-elements:3": [
    {
      slug: "endure-elements",
      spell: "Endure Elements",
      uses: { formula: "1", per: "day" },
      note: "replaces trap sense",
    },
  ],

  // ── spiritualist ──
  "spiritualist:drowned-channeler:drowned-powers:5": [
    {
      slug: "hydraulic-push",
      spell: "Hydraulic Push",
      uses: { formula: "1 + floor(max(0, @class.unlevel - 5) / 4)", per: "day" },
    },
    {
      slug: "slipstream",
      spell: "Slipstream",
      minLevel: 7,
      uses: { formula: "1 + floor(max(0, @class.unlevel - 7) / 4)", per: "day" },
    },
    {
      slug: "ride-the-waves",
      spell: "Ride the Waves",
      minLevel: 9,
      uses: { formula: "1", per: "day" },
    },
    { slug: "fluid-form", spell: "Fluid Form", minLevel: 16, uses: { formula: "1", per: "day" } },
  ],
  "spiritualist:involutionist:involuate:11": [
    {
      slug: "involuate",
      spell: "Animate Objects",
      cl: "@attributes.hd.total",
      uses: { formula: "1 + floor(max(0, @class.unlevel - 11) / 4)", per: "day" },
      note: "caster level equals her total character level; replaces the extra calm spirit uses at 11th/15th/17th",
    },
  ],
  "spiritualist:involutionist:spirit-awareness:5": [
    {
      slug: "detect-psychic-significance",
      spell: "Detect Psychic Significance",
      cl: "@attributes.hd.total",
      frequency: "atWill",
    },
    {
      slug: "analyze-aura",
      spell: "Analyze Aura",
      cl: "@attributes.hd.total",
      uses: { formula: "1", per: "day" },
      note: "replaces detect undead",
    },
  ],
  "spiritualist:plague-eater:disfiguring-touch:7": [
    {
      slug: "disfiguring-touch",
      spell: "Disfiguring Touch",
      uses: { formula: "min(4, 1 + floor((@class.unlevel - 7) / 4))", per: "day" },
      note: "replaces calm spirit",
    },
  ],
  "spiritualist:plague-eater:remove-disease:9": [
    {
      slug: "remove-disease",
      spell: "Remove Disease",
      uses: { formula: "3", per: "day" },
      note: "replaces see invisibility",
    },
  ],
  "spiritualist:plague-eater:remove-sickness:5": [
    {
      slug: "remove-sickness",
      spell: "Remove Sickness",
      frequency: "atWill",
      note: "replaces detect undead",
    },
  ],
  "spiritualist:plague-eater:withdraw-affliction:16": [
    {
      slug: "withdraw-affliction",
      spell: "Withdraw Affliction",
      uses: { formula: "1", per: "day" },
      note: "replaces call spirit",
    },
  ],
  "spiritualist:scourge:inflict-pain:7": [
    {
      slug: "inflict-pain",
      spell: "Inflict Pain",
      uses: { formula: "1 + floor((@class.unlevel - 7) / 4)", per: "day" },
      note: "a fully manifested phantom can also use this (full-round action), sharing the same daily uses; replaces calm spirit",
    },
  ],
  "spiritualist:seeker-of-enlightenment:karmic-insight:7": [
    {
      slug: "karmic-insight",
      spell: "Augury",
      uses: { formula: "min(4, 1 + floor((@class.unlevel - 7) / 4))", per: "day" },
      note: "replaces calm spirit",
    },
  ],
  "spiritualist:seeker-of-enlightenment:knowledge-of-the-ancestors:16": [
    {
      slug: "knowledge-of-the-ancestors",
      spell: "Legend Lore",
      uses: { formula: "1", per: "day" },
      note: "replaces call spirit",
    },
  ],
  "spiritualist:seeker-of-enlightenment:pinpoint-influence:9": [
    {
      slug: "pinpoint-influence",
      spell: "Locate Object",
      uses: { formula: "1", per: "day" },
      note: "duration fixed at 10 minutes; replaces see invisibility",
    },
  ],
  "spiritualist:seeker-of-enlightenment:words-of-the-past:5": [
    {
      slug: "words-of-the-past",
      spell: "Comprehend Languages",
      frequency: "atWill",
      note: "replaces detect undead",
    },
  ],
};
