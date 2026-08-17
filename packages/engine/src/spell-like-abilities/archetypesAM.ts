/**
 * Spell-like abilities granted by archetype features, classes A–M by class
 * tag (alchemist … monkUnchained) — keyed by the vendored
 * `RefData.archetypeFeatures` id
 * (`"<classTag>:<archetypeSlug>:<featureSlug>:<level>"`). The N–Z half lives
 * in `archetypesNZ.ts`; the class-tag split keeps wave agents' diffs
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

export const ARCHETYPE_SLA_GRANTS_AM: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  // Published archetype text (bloodrager:symbol-striker, Rune Training,
  // 1st): "A symbol striker can cast read magic at will and comprehend
  // languages once per day, but only to decipher written text." The
  // arcane-mark/erase spell-list additions are a separate spells-known
  // rider, not an SLA.
  "bloodrager:symbol-striker:rune-training:1": [
    { slug: "read-magic", spell: "Read Magic", frequency: "atWill" },
    {
      slug: "comprehend-languages",
      spell: "Comprehend Languages",
      uses: { formula: "1", per: "day" },
      note: "written text only",
    },
  ],
  // Ultimate Magic p.? bard:animal-speaker, Nature's Speaker (5th): "the bard
  // can use speak with animals at will on animals of his selected kinds."
  // The kind restriction (widened again at 11th/17th) is a rider, not a
  // metering shape.
  "bard:animal-speaker:nature-s-speaker:5": [
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      frequency: "atWill",
      note: "only on the bard's selected animal kind(s)",
    },
  ],
  // Blood of the Night (ARG tiefling) p.210, bard:shadow-puppeteer, Shadow
  // Servant (1st): "identical to an unseen servant ..., except it appears as
  // a formless shadow." No frequency is stated anywhere in the published
  // text (verified against d20pfsrd) — genuinely at will, unlike a prepared
  // spell slot.
  "bard:shadow-puppeteer:shadow-servant:1": [
    {
      slug: "shadow-servant",
      spell: "Unseen Servant",
      displayName: "Shadow Servant",
      frequency: "atWill",
      note: "appears as a formless shadow; relies on visual components",
    },
  ],
  // Published archetype text (arcanist:occultist, Planar Contact, 7th):
  // "an occultist can cast augury once per day and contact other plane once
  // per week, using her arcanist level as her caster level."
  "arcanist:occultist:planar-contact:7": [
    { slug: "augury", spell: "Augury", uses: { formula: "1", per: "day" } },
    {
      slug: "contact-other-plane",
      spell: "Contact Other Plane",
      uses: { formula: "1", per: "week" },
    },
  ],
  // Pathfinder Player Companion: Knights of the Inner Sea, cavalier:herald-squire,
  // Transcend Language (3rd): "three times per day, a herald squire can cast
  // tongues on herself, using her herald squire level as her caster level."
  "cavalier:herald-squire:transcend-language:3": [
    { slug: "tongues", spell: "Tongues", uses: { formula: "3", per: "day" } },
  ],
  // Pathfinder Player Companion: Legacy of the First World, cavalier:hooded-knight,
  // Champion of the Roads (9th): "dimension door ... once per day, plus one
  // additional time for every 4 levels beyond 9th, to a maximum of three
  // times per day at 17th level." min(3, 1 + floor((level-9)/4)) matches: 1
  // at 9th-12th, 2 at 13th-16th, 3 at 17th+.
  "cavalier:hooded-knight:champion-of-the-roads:9": [
    {
      slug: "dimension-door",
      spell: "Dimension Door",
      uses: { formula: "min(3, 1 + floor((@class.unlevel - 9) / 4))", per: "day" },
      note: "a ridden mount doesn't count against the creature limit; off-road destinations shunt to the nearest road",
    },
  ],
  // Advanced Race Guide (tiefling), cleric:fiendish-vessel, Fiendish Familiar
  // (3rd): Fiendish Augury "acts like the augury spell ... once per day" at
  // 3rd; Fiendish Divination "acts like the divination spell ... once per
  // day" at 9th, and Extra Divination raises that to 3/day at 13th (the
  // familiar acting as spell mouthpiece isn't a Change-shaped rider).
  "cleric:fiendish-vessel:fiendish-familiar:3": [
    {
      slug: "fiendish-augury",
      spell: "Augury",
      displayName: "Fiendish Augury",
      uses: { formula: "1", per: "day" },
    },
    {
      slug: "fiendish-divination",
      spell: "Divination",
      displayName: "Fiendish Divination",
      uses: { formula: "if(gte(@class.unlevel, 13), 3, 1)", per: "day" },
      minLevel: 9,
    },
  ],
  // Pathfinder Player Companion: Knights of the Inner Sea p.22, druid:restorer,
  // Guide across Lifetimes (13th): "once per day ... can cast reincarnate
  // without a material component."
  "druid:restorer:guide-across-lifetimes:13": [
    {
      slug: "reincarnate",
      spell: "Reincarnate",
      uses: { formula: "1", per: "day" },
      note: "no material component required",
    },
  ],
  // Ultimate Wilderness, hunter:forester, Breath of Life (10th): "a forester
  // can cast breath of life once per day as a spell-like ability."
  "hunter:forester:breath-of-life:10": [
    { slug: "breath-of-life", spell: "Breath of Life", uses: { formula: "1", per: "day" } },
  ],
  // Ultimate Wilderness, inquisitor:green-faith-marshal, Nature's Ally (5th):
  // "gains the ability to cast commune with nature once per week."
  "inquisitor:green-faith-marshal:nature-s-ally:5": [
    {
      slug: "commune-with-nature",
      spell: "Commune with Nature",
      uses: { formula: "1", per: "week" },
    },
  ],
  // Pathfinder Player Companion: Antihero's Handbook, investigator:ruthless-agent,
  // Compel Obedience (11th): "once per day ... acts like geas/quest ...
  // using the ruthless agent's investigator level as the caster level." The
  // 17th-level upgrade to two simultaneous targets isn't Change-shaped.
  "investigator:ruthless-agent:compel-obedience:11": [
    {
      slug: "geas-quest",
      spell: "Geas/Quest",
      displayName: "Compel Obedience",
      uses: { formula: "1", per: "day" },
      note: "at 17th level can bind a second creature at once (not modeled)",
    },
  ],
  // Published archetype text (monkUnchained:brazen-disciple, Genie
  // Apotheosis, 20th): "Once per day, the brazen disciple can grant a
  // limited wish (as per the spell limited wish) to a non-outsider as a
  // spell-like ability (CL 20th)" — the text pins CL 20 explicitly rather
  // than deferring to class level.
  "monkUnchained:brazen-disciple:genie-apotheosis:20": [
    {
      slug: "limited-wish",
      spell: "Limited Wish",
      uses: { formula: "1", per: "day" },
      cl: "20",
      note: "target must be a non-outsider",
    },
  ],
};
