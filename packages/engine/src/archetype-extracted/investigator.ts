/**
 * Investigator's slice of the pipeline. Covers all 153 vendored archetype
 * features across the 36 investigator archetypes that carry any (a 37th,
 * Dread Investigator, has zero linked features in the vendored pack — nothing
 * to classify there, not a gap in this pass).
 *
 * ── Investigator-specific mechanical facts this pass relies on ────────────
 *
 * 1. **Investigator Talents** are a modeled pick-list subsystem
 *    (`investigator-talents.ts`) — every talent entry there is
 *    `displayOnly: true` with `changes: []` per that file's own honesty bar.
 *    Any archetype feature that adds, restricts, or swaps into that pick-list
 *    is `subsystem`.
 * 2. **Inspiration** rides a real vendored pool (`uses.maxFormula:
 *    "max(1, @abilities.int.mod + floor(@class.unlevel / 2))"`, tagged
 *    `inspiration`). A feature that changes the pool's SIZE, cadence, or
 *    ability-score basis is `blocked` (would double-count or diverge from
 *    that vendored formula — the same trap as magus's Arcane Pool). A feature
 *    that only changes what inspiration can be used on for free, or how much
 *    it costs to spend, is `subsystem` (no baseline number, just a
 *    spend-option change).
 * 3. **Studied Combat** and **Studied Strike** are per-target, precision-
 *    damage/situational-insight-bonus mechanics already covered as
 *    display-only detail lines via `tables.ts`'s `studiedCombatBonus`/
 *    `studiedStrikeDice` — neither has a flat, always-on Change target in
 *    this engine. Any archetype feature that reflavors, retimes, or extends
 *    either is `situational`, never `numeric`.
 * 4. **Alchemy/extracts** (the investigator's `alchemy` class feature and
 *    everything built on it — mutagen-equivalents, extract-slot conversions,
 *    formula-book reflavors) are `subsystem`, matching this engine's general
 *    posture toward alchemist-style extract mechanics.
 *
 * A recurring vendoring pattern across several archetypes: an ability that
 * scales through 2nd/5th/8th level and then claims "complete immunity" at
 * 11th is frequently split across TWO feature ids — an early, unpaired one
 * carrying the growing bonus, and a later one (paired to replace the base
 * Poison Immunity class feature) carrying the IDENTICAL full text. Since
 * neither id replaces the other, both would be live simultaneously past
 * 11th; extracting the same untyped bonus from both would double it. This
 * pass extracts the earlier (unpaired) id as `numeric` when the text and
 * name agree, and classifies the later duplicate `blocked`, noting the
 * shared text. Where no `SAVE_CATEGORIES` entry matches the named effect at
 * all (drug addiction, teleportation, "psychic" spells, language-dependent
 * effects, lie-detection), both ids are `blocked` regardless.
 *
 * Two entries carry a genuine content mismatch rather than a duplicate
 * (`scavenger:construct-mastery:2`'s description is verbatim Poison
 * Resistance/Immunity boilerplate under an unrelated name, while its
 * probable real content sits under `craft-construct:11` instead) — flagged
 * `blocked`/`situational` respectively per each entry's own note, not
 * guessed at.
 *
 * Confidence rubric (same as magus.ts's):
 *  - "high": a literal, unconditional, single-clause bonus.
 *  - "medium": either the formula composes two facts (a scaling threshold
 *    plus a dropped secondary clause), or a real secondary clause in the
 *    same feature (an immunity, a doubled bonus, a resource-spend
 *    alternative) is dropped and flagged in `detail`.
 *  - "low": not used in this pass.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── investigator:antiquarian ──
  "investigator:antiquarian:curse-immunity:11": {
    archetypeId: "investigator:antiquarian",
    name: "Curse Immunity",
    level: 11,
    bucket: "blocked",
    note: "identical description to curse-resistance:2 (the ability's full text is duplicated across the level-2 and level-11 feature slots, the latter also pairing to replace Poison Immunity); the scaling bonus is already extracted under curse-resistance:2 — extracting it again here would double the same untyped bonus once both slots are unlocked, and the promised complete immunity at 11th has no Change target regardless",
  },
  "investigator:antiquarian:curse-resistance:2": {
    archetypeId: "investigator:antiquarian",
    name: "Curse Resistance",
    level: 2,
    bucket: "numeric",
    note: "unconditional, unqualified save bonus vs. curse-descriptor effects (a real SAVE_CATEGORIES entry); scales +2/+4/+6 through 8th, then the text claims complete immunity at 11th — dropped, no Change target expresses categorical save immunity",
  },
  "investigator:antiquarian:item-lore:2": {
    archetypeId: "investigator:antiquarian",
    name: "Item Lore",
    level: 2,
    bucket: "subsystem",
    note: "Spellcraft-based magic-item identification utility (detect-magic-as-Spellcraft, cursed-item detection); no flat number",
  },
  "investigator:antiquarian:relic-magic:0": {
    archetypeId: "investigator:antiquarian",
    name: "Relic Magic",
    level: 0,
    bucket: "subsystem",
    note: "reflavors the alchemy class feature into arcane relic-casting from a trinket collection — class note: alchemy/extract features are subsystem",
  },
  "investigator:antiquarian:swift-search:4": {
    archetypeId: "investigator:antiquarian",
    name: "Swift Search",
    level: 4,
    bucket: "subsystem",
    note: "take-20-in-1-minute utility for Perception; no flat number",
  },

  // ── investigator:bonded-investigator ──
  "investigator:bonded-investigator:familiar:2": {
    archetypeId: "investigator:bonded-investigator",
    name: "Familiar",
    level: 2,
    bucket: "subsystem",
    note: "grants a familiar (wizard arcane-bond analog); familiar/companion subsystem, not the investigator's own number",
  },
  "investigator:bonded-investigator:improved-familiar:7": {
    archetypeId: "investigator:bonded-investigator",
    name: "Improved Familiar",
    level: 7,
    bucket: "subsystem",
    note: "bonus feat (Improved Familiar) grant tied to the familiar subsystem",
  },
  "investigator:bonded-investigator:inspired-familiar:4": {
    archetypeId: "investigator:bonded-investigator",
    name: "Inspired Familiar",
    level: 4,
    bucket: "subsystem",
    note: "lets the familiar spend from the investigator's own inspiration pool — a spend-option change, not a size/cadence change (class note 2)",
  },
  "investigator:bonded-investigator:studied-strike:6": {
    archetypeId: "investigator:bonded-investigator",
    name: "Studied Strike",
    level: 6,
    bucket: "situational",
    note: "reflavors Studied Strike onto a slower cadence (starts 6th, +1d6 every 4 levels instead of the base 4th/every-2 progression); Studied Strike is per-target precision damage with no flat-bonus Change target (class note 3)",
  },

  // ── investigator:cartographer ──
  "investigator:cartographer:geographic-lore:3": {
    archetypeId: "investigator:cartographer",
    name: "Geographic Lore",
    level: 3,
    bucket: "subsystem",
    note: "true-north/downtime map-selling narrative ability; no flat number",
  },
  "investigator:cartographer:studied-terrain:2": {
    archetypeId: "investigator:cartographer",
    name: "Studied Terrain",
    level: 2,
    bucket: "situational",
    note: "a real +1 skill bonus, but it only applies within a specific mapped area the cartographer must spend inspiration and 10 minutes to establish, and only stacks atop an already-held free-inspiration ability on that skill — resource-spend- and location-gated",
  },
  "investigator:cartographer:swift-travels:4": {
    archetypeId: "investigator:cartographer",
    name: "Swift Travels",
    level: 4,
    bucket: "subsystem",
    note: "reclassifies terrain types for overland-speed purposes; no flat speed Change, and landSpeed doesn't model terrain-type distinctions",
  },

  // ── investigator:cipher ──
  "investigator:cipher:evasive-evasion:3": {
    archetypeId: "investigator:cipher",
    name: "Evasive (Evasion)",
    level: 3,
    bucket: "subsystem",
    note: "grants Evasion; no Change target represents the ability (matches the fighter/magus precedent for reflavored Evasion grants)",
  },
  "investigator:cipher:evasive-improved-evasion:11": {
    archetypeId: "investigator:cipher",
    name: "Evasive (Improved Evasion)",
    level: 11,
    bucket: "subsystem",
    note: "grants Improved Evasion, replacing Poison Immunity; same no-target reasoning as Evasion above",
  },
  "investigator:cipher:hide-in-plain-sight:7": {
    archetypeId: "investigator:cipher",
    name: "Hide in Plain Sight",
    level: 7,
    bucket: "subsystem",
    note: "Stealth-while-observed utility; no flat number",
  },
  "investigator:cipher:inattention-blindness:1": {
    archetypeId: "investigator:cipher",
    name: "Inattention Blindness",
    level: 1,
    bucket: "subsystem",
    note: "mind-affecting DC-based notice-suppression ability; the DC formula isn't a Change target and being ignored-as-unnoticed isn't a stat bonus",
  },
  "investigator:cipher:null-aura:4": {
    archetypeId: "investigator:cipher",
    name: "Null Aura",
    level: 4,
    bucket: "numeric",
    note: "unconditional +4 save bonus vs. divination spells/SLAs/effects, expressed via saveCategories: ['divination']; the anti-scrying/nondetection rules text (knowledge-of-target condition, 9th-level constant nondetection) isn't a Change and is dropped",
  },
  "investigator:cipher:tenuous-threat:5": {
    archetypeId: "investigator:cipher",
    name: "Tenuous Threat",
    level: 5,
    bucket: "situational",
    note: "extends studied-strike-equivalent precision damage to a non-studied target once per day on a Will-save trigger; Studied Strike is per-target with no flat-Change target (class note 3)",
  },

  // ── investigator:conspirator ──
  "investigator:conspirator:underhanded:1": {
    archetypeId: "investigator:conspirator",
    name: "Underhanded",
    level: 1,
    bucket: "numeric",
    note: "the Disguise-checks clause is unconditional; the Bluff-checks-to-appear-innocent clause is narrower (situational, dropped) and the inspiration-retarget clause is a spend-option change (subsystem, class note 2)",
  },
  "investigator:conspirator:watcher-sense:3": {
    archetypeId: "investigator:conspirator",
    name: "Watcher Sense",
    level: 3,
    bucket: "situational",
    note: "a scaling Perception bonus, but scoped to two specific sub-uses (noticing scrying sensors, acting in a surprise round) rather than the whole skill; granting it to skill.per broadly would over-apply to ordinary Perception checks",
  },

  // ── investigator:cryptid-scholar ──
  "investigator:cryptid-scholar:intuitive-monster-lore:0": {
    archetypeId: "investigator:cryptid-scholar",
    name: "Intuitive Monster Lore",
    level: 5,
    bucket: "situational",
    note: "adds Wisdom modifier to Knowledge checks, but only for the specific purpose of identifying a creature's abilities/weaknesses — narrower than the whole skill, and ambiguous which Knowledge subskill to target",
  },
  "investigator:cryptid-scholar:knowledgeable-strike:4": {
    archetypeId: "investigator:cryptid-scholar",
    name: "Knowledgeable Strike",
    level: 4,
    bucket: "situational",
    note: "replaces Studied Strike with an ALLY-targeted precision-damage grant against one specific monster type; ally-only bonuses aren't the character's own numbers",
  },
  "investigator:cryptid-scholar:opportune-advice:4": {
    archetypeId: "investigator:cryptid-scholar",
    name: "Opportune Advice",
    level: 4,
    bucket: "situational",
    note: "replaces Studied Combat with an ALLY-targeted, duration-limited insight AC/save bonus vs. one chosen creature type; ally-targeted and duration-scoped",
  },

  // ── investigator:cult-hunter ──
  "investigator:cult-hunter:ambush-defense:3": {
    archetypeId: "investigator:cult-hunter",
    name: "Ambush Defense",
    level: 3,
    bucket: "situational",
    note: "+1 insight AC/Reflex, but only during a surprise round triggered by enemies — a per-round condition",
  },
  "investigator:cult-hunter:cult-combat:4": {
    archetypeId: "investigator:cult-hunter",
    name: "Cult Combat",
    level: 4,
    bucket: "situational",
    note: "shifts Studied Combat's attack/damage bonus by +/-1 depending on whether the target belongs to a chosen cult; enemy-type-scoped, and Studied Combat itself is situational (class note 3)",
  },
  "investigator:cult-hunter:cult-strike:4": {
    archetypeId: "investigator:cult-hunter",
    name: "Cult Strike",
    level: 4,
    bucket: "situational",
    note: "changes Studied Strike's damage die (d8 vs. d4) depending on the target's cult membership; enemy-type-scoped, Studied Strike class note 3",
  },
  "investigator:cult-hunter:cultic-study:4": {
    archetypeId: "investigator:cult-hunter",
    name: "Cultic Study",
    level: 4,
    bucket: "situational",
    note: "a scaling bonus on five skills, but only against followers of one chosen deity/religion and extraplanar creatures — enemy-type-scoped",
  },
  "investigator:cult-hunter:extraplanar-expulsion:13": {
    archetypeId: "investigator:cult-hunter",
    name: "Extraplanar Expulsion",
    level: 13,
    bucket: "subsystem",
    note: "choice-gated among dispel chaos/evil/good/law, fueled by sacrificing an unused extract slot rather than a day/week counter — cross-pool spend",
  },
  "investigator:cult-hunter:purify-mind-and-body-reroll:11": {
    archetypeId: "investigator:cult-hunter",
    name: "Purify Mind and Body Reroll",
    level: 11,
    bucket: "blocked",
    note: "the name promises a reroll mechanic but the vendored description is a verbatim duplicate of Purify Mind and Body's poison-save-progression text (likely swapped/mis-pasted); extracting it would also double-count against purify-mind-and-body:2's already-extracted bonus",
  },
  "investigator:cult-hunter:purify-mind-and-body:2": {
    archetypeId: "investigator:cult-hunter",
    name: "Purify Mind and Body",
    level: 2,
    bucket: "numeric",
    note: "unconditional save bonus vs. poison (a real SAVE_CATEGORIES entry); scales +2/+4/+6 through 8th, then claims complete immunity at 11th — dropped, no Change target for categorical save immunity",
  },
  "investigator:cult-hunter:sense-madness:1": {
    archetypeId: "investigator:cult-hunter",
    name: "Sense Madness",
    level: 1,
    bucket: "numeric",
    note: "the base Sense Motive bonus is unconditional; the doubled bonus for detecting insanity specifically is a narrower secondary clause, dropped",
  },
  "investigator:cult-hunter:summoning-sense:7": {
    archetypeId: "investigator:cult-hunter",
    name: "Summoning Sense",
    level: 7,
    bucket: "subsystem",
    note: "grants uncanny dodge/improved uncanny dodge vs. summoned creatures specifically; no Change target represents (improved) uncanny dodge",
  },

  // ── investigator:empiricist ──
  "investigator:empiricist:ceaseless-observation:2": {
    archetypeId: "investigator:empiricist",
    name: "Ceaseless Observation",
    level: 2,
    bucket: "subsystem",
    note: "substitutes Intelligence for the normal ability score on four skills; no Change target expresses an ability-score substitution",
  },
  "investigator:empiricist:master-intellect:20": {
    archetypeId: "investigator:empiricist",
    name: "Master Intellect",
    level: 20,
    bucket: "subsystem",
    note: "removes the cost of using inspiration on all skills/ability checks — a spend-option change (class note 2), not a size/cadence change",
  },
  "investigator:empiricist:unfailing-logic:4": {
    archetypeId: "investigator:empiricist",
    name: "Unfailing Logic",
    level: 4,
    bucket: "numeric",
    note: "unconditional Will-save bonus vs. illusion effects that allow a disbelieve save (a real SAVE_CATEGORIES entry, Will-only which matches); the Int-for-Wis resource-spend option and the 16th-level immunity are dropped",
  },

  // ── investigator:engineer ──
  "investigator:engineer:custom-mechanism:1": {
    archetypeId: "investigator:engineer",
    name: "Custom Mechanism",
    level: 1,
    bucket: "subsystem",
    note: "activated device granting the inspiration die on a chosen skill/attack/save; resource-gated, and the granted amount (the inspiration die) isn't a flat Change",
  },
  "investigator:engineer:mechanical-understanding:3": {
    archetypeId: "investigator:engineer",
    name: "Mechanical Understanding",
    level: 3,
    bucket: "numeric",
    note: "the Knowledge (engineering) clause is unconditional; the Knowledge (arcana) bonus is scoped to identifying constructs specifically, dropped",
  },

  // ── investigator:forensic-physician ──
  "investigator:forensic-physician:blood-lore:5": {
    archetypeId: "investigator:forensic-physician",
    name: "Blood Lore",
    level: 5,
    bucket: "subsystem",
    note: "Heal-check forensic blood-analysis utility; no flat number",
  },
  "investigator:forensic-physician:disease-lore:3": {
    archetypeId: "investigator:forensic-physician",
    name: "Disease Lore",
    level: 3,
    bucket: "numeric",
    note: "unconditional, uncapped scaling save bonus vs. disease (a real SAVE_CATEGORIES entry); the fast disease-diagnosis/disinfection utility is dropped",
  },
  "investigator:forensic-physician:medical-expertise:1": {
    archetypeId: "investigator:forensic-physician",
    name: "Medical Expertise",
    level: 1,
    bucket: "numeric",
    note: "the base Heal bonus is unconditional; the doubled bonus vs. tampering is a narrower secondary clause and the inspiration-retarget is a spend-option change, both dropped",
  },

  // ── investigator:gravedigger ──
  "investigator:gravedigger:deny-death:2": {
    archetypeId: "investigator:gravedigger",
    name: "Deny Death",
    level: 2,
    bucket: "numeric",
    note: "unconditional scaling save bonus vs. death effects (a real SAVE_CATEGORIES entry) and energy drain; only the death-effects half is extracted, energy drain has no matching category",
  },
  "investigator:gravedigger:focus-talent:3": {
    archetypeId: "investigator:gravedigger",
    name: "Focus Talent",
    level: 3,
    bucket: "subsystem",
    note: "occultist focus-power pick in place of an investigator talent; deferred occultist-implement subsystem",
  },
  "investigator:gravedigger:grave-lamp:4": {
    archetypeId: "investigator:gravedigger",
    name: "Grave Lamp",
    level: 4,
    bucket: "subsystem",
    note: "a second occultist implement (lantern) fueled by inspiration; deferred subsystem, same posture as relic-focus below",
  },
  "investigator:gravedigger:grave-magic:1": {
    archetypeId: "investigator:gravedigger",
    name: "Grave Magic",
    level: 1,
    bucket: "subsystem",
    note: "fixed spell per extract-slot level sacrificed, but the cost is an extract slot rather than a day/week counter — cross-pool spend (class note 4)",
  },
  "investigator:gravedigger:kill-the-dead:4": {
    archetypeId: "investigator:gravedigger",
    name: "Kill the Dead",
    level: 4,
    bucket: "situational",
    note: "Studied Combat/Studied Strike run 2 levels lower vs. non-undead; Studied Combat/Strike class note 3 (situational)",
  },
  "investigator:gravedigger:limited-alchemy:1": {
    archetypeId: "investigator:gravedigger",
    name: "Limited Alchemy",
    level: 1,
    bucket: "subsystem",
    note: "restricts the alchemy class feature to extracts only, no discoveries; class note 4: alchemy/extract features are subsystem",
  },
  "investigator:gravedigger:read-the-bones:2": {
    archetypeId: "investigator:gravedigger",
    name: "Read the Bones",
    level: 2,
    bucket: "subsystem",
    note: "occultist object-reading utility restricted to remains; no flat number",
  },
  "investigator:gravedigger:relic-focus:1": {
    archetypeId: "investigator:gravedigger",
    name: "Relic Focus",
    level: 1,
    bucket: "subsystem",
    note: "occultist necromancy-implement grant fueled by inspiration; deferred implement subsystem",
  },
  "investigator:gravedigger:weapon-and-armor-proficiency:1": {
    archetypeId: "investigator:gravedigger",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant; no Change",
  },

  // ── investigator:guardian-of-immortality ──
  "investigator:guardian-of-immortality:desert-survivor:2": {
    archetypeId: "investigator:guardian-of-immortality",
    name: "Desert Survivor",
    level: 2,
    bucket: "numeric",
    note: "the 5th-level resist fire 10 clause is unconditional; the Endurance bonus feat, sand-terrain rule, and 8th-level sandstorm-sight/pursuit-advantage clauses are dropped (feat grant, terrain rule, and narrowly-scoped abilities respectively)",
  },
  "investigator:guardian-of-immortality:guardian-s-gaze:2": {
    archetypeId: "investigator:guardian-of-immortality",
    name: "Guardian's Gaze",
    level: 2,
    bucket: "numeric",
    note: "unconditional, unqualified Sense Motive bonus",
  },
  "investigator:guardian-of-immortality:liar-s-familiarity:7": {
    archetypeId: "investigator:guardian-of-immortality",
    name: "Liar's Familiarity",
    level: 7,
    bucket: "subsystem",
    note: "makes several skill/save uses of inspiration automatic and free — spend-option change (class note 2)",
  },
  "investigator:guardian-of-immortality:orchid-s-drop:11": {
    archetypeId: "investigator:guardian-of-immortality",
    name: "Orchid's Drop",
    level: 11,
    bucket: "numeric",
    note: "flat, unconditional alchemical bonus to ALL saving throws, replacing Poison Immunity — clean grant, no double-count risk (Poison Immunity's own vendored Change is a different target, immEffect.poison)",
  },
  "investigator:guardian-of-immortality:teleportation-warden:13": {
    archetypeId: "investigator:guardian-of-immortality",
    name: "Teleportation Warden",
    level: 13,
    bucket: "subsystem",
    note: "constant detect-teleportation sense plus a 1/day activated dispel-like ability; no flat number for the character's own stats",
  },

  // ── investigator:hallucinist ──
  "investigator:hallucinist:drug-immunity:11": {
    archetypeId: "investigator:hallucinist",
    name: "Drug Immunity",
    level: 11,
    bucket: "blocked",
    note: "no SAVE_CATEGORIES entry for drug addiction; also a duplicate of drug-resistance:2's identical text",
  },
  "investigator:hallucinist:drug-lore:2": {
    archetypeId: "investigator:hallucinist",
    name: "Drug Lore",
    level: 2,
    bucket: "subsystem",
    note: "Knowledge-based drug identification/neutralization utility; no flat number",
  },
  "investigator:hallucinist:drug-resistance:2": {
    archetypeId: "investigator:hallucinist",
    name: "Drug Resistance",
    level: 2,
    bucket: "blocked",
    note: "same scaling-save shape as the poison/curse/death progressions elsewhere in this table, but 'drug addiction' has no SAVE_CATEGORIES entry — the category string would silently match nothing",
  },
  "investigator:hallucinist:psychedelic-perception:1": {
    archetypeId: "investigator:hallucinist",
    name: "Psychedelic Perception",
    level: 1,
    bucket: "subsystem",
    note: "a mutagen-equivalent buff item with scaling bonuses while active; class note 4: alchemy/extract features are subsystem",
  },
  "investigator:hallucinist:shared-hallucinations:3": {
    archetypeId: "investigator:hallucinist",
    name: "Shared Hallucinations",
    level: 3,
    bucket: "subsystem",
    note: "functions as minor image/oneiric horror/synesthesia/aura alteration, but costed in hallucinogen-duration minutes or an inspiration use rather than a day/week counter — non-counter budget / cross-pool spend",
  },
  "investigator:hallucinist:simultaneous-study:6": {
    archetypeId: "investigator:hallucinist",
    name: "Simultaneous Study",
    level: 6,
    bucket: "situational",
    note: "lets Studied Combat track an extra target per use of inspiration spent; Studied Combat class note 3 (situational)",
  },

  // ── investigator:holomog-demolitionist ──
  "investigator:holomog-demolitionist:battlefield-preparation:6": {
    archetypeId: "investigator:holomog-demolitionist",
    name: "Battlefield Preparation",
    level: 6,
    bucket: "subsystem",
    note: "creates difficult terrain/concealment/cover in an area; area-effect terrain manipulation, no sheet Change target",
  },
  "investigator:holomog-demolitionist:ricochet:3": {
    archetypeId: "investigator:holomog-demolitionist",
    name: "Ricochet",
    level: 3,
    bucket: "subsystem",
    note: "a fixed-damage AoE attack ability (2d6/4d6 to a cone), not a bonus to the character's own stats",
  },
  "investigator:holomog-demolitionist:structural-insight:2": {
    archetypeId: "investigator:holomog-demolitionist",
    name: "Structural Insight",
    level: 2,
    bucket: "situational",
    note: "an Acrobatics bonus scoped to moving through difficult terrain, plus a sunder-attack bonus and a hardness-ignoring clause — all scoped to specific actions/objects, not general numbers",
  },
  "investigator:holomog-demolitionist:structural-knowledge:2": {
    archetypeId: "investigator:holomog-demolitionist",
    name: "Structural Knowledge",
    level: 2,
    bucket: "subsystem",
    note: "bonus feat (Improved Sunder) grant",
  },
  "investigator:holomog-demolitionist:studied-strike:4": {
    archetypeId: "investigator:holomog-demolitionist",
    name: "Studied Strike",
    level: 4,
    bucket: "situational",
    note: "reflavors Studied Strike onto a 4-level cadence instead of 2; Studied Strike class note 3 (situational)",
  },

  // ── investigator:infiltrator ──
  "investigator:infiltrator:master-of-disguise:1": {
    archetypeId: "investigator:infiltrator",
    name: "Master of Disguise",
    level: 1,
    bucket: "situational",
    note: "reduces specific Disguise penalty categories by 2 and halves prep time; scoped to Disguise's own penalty table, not a general bonus",
  },
  "investigator:infiltrator:mimic-mastery:2": {
    archetypeId: "investigator:infiltrator",
    name: "Mimic Mastery",
    level: 2,
    bucket: "situational",
    note: "+10 Disguise bonus, but only when using disguise self/polymorph extracts; extract-use-scoped and alchemy-adjacent",
  },
  "investigator:infiltrator:voice-mimicry:2": {
    archetypeId: "investigator:infiltrator",
    name: "Voice Mimicry",
    level: 2,
    bucket: "situational",
    note: "a table of Disguise-check modifiers for voice mimicry, all scoped to that one specific use of Disguise",
  },

  // ── investigator:jinyiwei ──
  "investigator:jinyiwei:celestial-insight:3": {
    archetypeId: "investigator:jinyiwei",
    name: "Celestial Insight",
    level: 3,
    bucket: "numeric",
    note: "unconditional, uncapped-progression save bonus vs. enchantment and illusion effects (both real SAVE_CATEGORIES entries, both Will-only which matches the text)",
  },
  "investigator:jinyiwei:divine-inspiration:1": {
    archetypeId: "investigator:jinyiwei",
    name: "Divine Inspiration",
    level: 1,
    bucket: "blocked",
    note: "swaps the inspiration pool's ability-score basis from Intelligence to Wisdom — a genuine size-formula divergence from the vendored Inspiration uses.maxFormula for any character whose Int != Wis (class note 2: pool-basis changes are blocked); also swaps in inquisitor spellcasting (subsystem)",
  },
  "investigator:jinyiwei:imperial-judgment:4": {
    archetypeId: "investigator:jinyiwei",
    name: "Imperial Judgment",
    level: 4,
    bucket: "subsystem",
    note: "grants the inquisitor Judgment class feature; judgments aren't modeled in this engine",
  },
  "investigator:jinyiwei:suspicious-mind:1": {
    archetypeId: "investigator:jinyiwei",
    name: "Suspicious Mind",
    level: 1,
    bucket: "numeric",
    note: "the Sense Motive clause is unconditional; the Linguistics-to-detect-forgeries and Perception-to-see-through-disguises/locate-via-Stealth/find-secret-doors clauses are each narrower than the whole skill, dropped",
  },

  // ── investigator:lamplighter ──
  "investigator:lamplighter:alchemical-illumination:2": {
    archetypeId: "investigator:lamplighter",
    name: "Alchemical Illumination",
    level: 2,
    bucket: "subsystem",
    note: "choice among light/continual flame/daylight/discovery torch/searing light/judgment light (by level), costed in a burned extract/infusion/potion rather than a day/week counter — cross-pool spend (class note 4)",
  },
  "investigator:lamplighter:lamplighter:1": {
    archetypeId: "investigator:lamplighter",
    name: "Lamplighter",
    level: 1,
    bucket: "subsystem",
    note: "ignites a held lamp/torch as a move action; no flat number",
  },
  "investigator:lamplighter:ready-for-the-revelation:3": {
    archetypeId: "investigator:lamplighter",
    name: "Ready for the Revelation",
    level: 3,
    bucket: "numeric",
    note: "the 12th-level clause adding Intelligence bonus to initiative is unconditional once reached; the free-inspiration-on-initiative, Quick-Draw-on-init, and surprise-round action-economy clauses at other tiers are spend-option/boolean and dropped",
  },

  // ── investigator:lepidstadt-inspector ──
  "investigator:lepidstadt-inspector:interrogation:1": {
    archetypeId: "investigator:lepidstadt-inspector",
    name: "Interrogation",
    level: 1,
    bucket: "numeric",
    note: "the Sense Motive clause is unconditional; the Intimidate-checks-made-to-influence-attitude clause is a narrower use of Intimidate than the whole skill, dropped",
  },
  "investigator:lepidstadt-inspector:keen-mind:3": {
    archetypeId: "investigator:lepidstadt-inspector",
    name: "Keen Mind",
    level: 3,
    bucket: "numeric",
    note: "unconditional, unqualified Perception and Will-save bonus, scaling on a clean 3-tier schedule",
  },
  "investigator:lepidstadt-inspector:perceptive-tracking:3": {
    archetypeId: "investigator:lepidstadt-inspector",
    name: "Perceptive Tracking",
    level: 3,
    bucket: "subsystem",
    note: "forces selection of a specific investigator talent; pick-list subsystem (class note 1)",
  },
  "investigator:lepidstadt-inspector:relentless-pursuit:5": {
    archetypeId: "investigator:lepidstadt-inspector",
    name: "Relentless Pursuit",
    level: 5,
    bucket: "situational",
    note: "+2 on five skills plus weapon attack/damage, but only against one specific tracked creature per day; enemy/target-scoped and duration-limited",
  },

  // ── investigator:majordomo ──
  "investigator:majordomo:delegate:1": {
    archetypeId: "investigator:majordomo",
    name: "Delegate",
    level: 1,
    bucket: "subsystem",
    note: "grants and shares teamwork feats with allies; ally-targeted action-economy ability, no number for the character's own stats",
  },
  "investigator:majordomo:inspired-manager:3": {
    archetypeId: "investigator:majordomo",
    name: "Inspired Manager",
    level: 3,
    bucket: "subsystem",
    note: "reduces ally task time and boosts an Ultimate Campaign kingdom-leadership score this engine doesn't model at all; no Change target",
  },
  "investigator:majordomo:paper-trail:1": {
    archetypeId: "investigator:majordomo",
    name: "Paper Trail",
    level: 1,
    bucket: "situational",
    note: "a real skill bonus, but scoped to specific paperwork/forgery-detection uses of Linguistics/Profession rather than the whole skills",
  },

  // ── investigator:malice-binder ──
  "investigator:malice-binder:fettering:1": {
    archetypeId: "investigator:malice-binder",
    name: "Fettering",
    level: 1,
    bucket: "subsystem",
    note: "hex-like fetter-effect pick-list with a DC formula that isn't a Change target; deferred subsystem",
  },
  "investigator:malice-binder:take-a-bit-more:11": {
    archetypeId: "investigator:malice-binder",
    name: "Take a Bit More",
    level: 11,
    bucket: "situational",
    note: "a real +2 competence CMB bonus, but scoped to steal-maneuver attempts made specifically to gather a fetter token; also grants Quick Steal (subsystem, secondary)",
  },
  "investigator:malice-binder:take-a-bit:1": {
    archetypeId: "investigator:malice-binder",
    name: "Take a Bit",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Improved Steal) plus an inspiration-cost reduction for steal maneuvers; feat-grant/spend-option subsystem",
  },
  "investigator:malice-binder:witch-lore:1": {
    archetypeId: "investigator:malice-binder",
    name: "Witch Lore",
    level: 1,
    bucket: "subsystem",
    note: "inspiration spend-option retarget (Knowledge-arcana/Spellcraft/Sleight of Hand/Survival instead of Knowledge/Linguistics); class note 2",
  },
  "investigator:malice-binder:witch-trapper:11": {
    archetypeId: "investigator:malice-binder",
    name: "Witch Trapper",
    level: 11,
    bucket: "subsystem",
    note: "swaps a fetter for a ranger trap; trap/pick-list subsystem, deferred",
  },

  // ── investigator:mastermind ──
  "investigator:mastermind:a-quiet-word:1": {
    archetypeId: "investigator:mastermind",
    name: "A Quiet Word",
    level: 1,
    bucket: "subsystem",
    note: "lets an ally use the mastermind's own skill ranks on a Diplomacy/Intimidate check; ally-targeted, no number for the mastermind's own sheet",
  },
  "investigator:mastermind:impregnable-mind:9": {
    archetypeId: "investigator:mastermind",
    name: "Impregnable Mind",
    level: 9,
    bucket: "subsystem",
    note: "near-total divination immunity; boolean effect, no Change target for categorical divination immunity",
  },
  "investigator:mastermind:mastermind-defense:4": {
    archetypeId: "investigator:mastermind",
    name: "Mastermind Defense",
    level: 4,
    bucket: "subsystem",
    note: "rolls the inspiration die and applies it as a penalty to an attacker's roll; imposes an effect on someone else's roll, and the amount is a die roll rather than a fixed number",
  },
  "investigator:mastermind:mastermind-s-inspiration:1": {
    archetypeId: "investigator:mastermind",
    name: "Mastermind's Inspiration",
    level: 1,
    bucket: "subsystem",
    note: "inspiration spend-option retarget (Diplomacy/Intimidate instead of Linguistics/Spellcraft); class note 2",
  },

  // ── investigator:natural-philosopher ──
  "investigator:natural-philosopher:herbalism:3": {
    archetypeId: "investigator:natural-philosopher",
    name: "Herbalism",
    level: 3,
    bucket: "numeric",
    note: "the Craft (alchemy) clause is unconditional and uses the established skill.crf.alchemy convention (see natural_philosopher/soul-forger precedent); the Profession (herbalist) half-bonus, the infusion-discovery grant, and the Knowledge-substitution clause are dropped",
  },
  "investigator:natural-philosopher:natural-philosopher-s-inspiration:1": {
    archetypeId: "investigator:natural-philosopher",
    name: "Natural Philosopher's Inspiration",
    level: 1,
    bucket: "subsystem",
    note: "inspiration spend-option retarget (Heal/Survival instead of Linguistics/Spellcraft); class note 2",
  },
  "investigator:natural-philosopher:track:1": {
    archetypeId: "investigator:natural-philosopher",
    name: "Track",
    level: 1,
    bucket: "situational",
    note: "+1/2 level bonus, but scoped to Survival checks made specifically to follow tracks — narrower than the whole skill (same posture as traits.ts's narrowly-scoped bonuses)",
  },
  "investigator:natural-philosopher:weapon-and-armor-proficiency:1": {
    archetypeId: "investigator:natural-philosopher",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant; no Change",
  },

  // ── investigator:portal-seeker ──
  "investigator:portal-seeker:extended-portals:11": {
    archetypeId: "investigator:portal-seeker",
    name: "Extended Portals",
    level: 11,
    bucket: "subsystem",
    note: "spends Portal Points to create temporary movement portals; resource/activated ability, no flat number",
  },
  "investigator:portal-seeker:hunt-portal:1": {
    archetypeId: "investigator:portal-seeker",
    name: "Hunt Portal",
    level: 1,
    bucket: "subsystem",
    note: "fixed-DC Knowledge check to detect nearby portals; no bonus to the character",
  },
  "investigator:portal-seeker:portal-lore:2": {
    archetypeId: "investigator:portal-seeker",
    name: "Portal Lore",
    level: 2,
    bucket: "subsystem",
    note: "fixed-DC Knowledge check to learn a portal's destination; no bonus to the character",
  },
  "investigator:portal-seeker:resist-teleportation:2": {
    archetypeId: "investigator:portal-seeker",
    name: "Resist Teleportation",
    level: 2,
    bucket: "blocked",
    note: "scaling save bonus vs. teleportation effects and imprisonment — no SAVE_CATEGORIES entry for either",
  },
  "investigator:portal-seeker:transit-portals:4": {
    archetypeId: "investigator:portal-seeker",
    name: "Transit Portals",
    level: 4,
    bucket: "subsystem",
    note: "Portal-Points-fueled short-range teleport as part of a move action; a teleportation effect, not a landSpeed increase",
  },

  // ── investigator:profiler ──
  "investigator:profiler:blood-sleuth:4": {
    archetypeId: "investigator:profiler",
    name: "Blood Sleuth",
    level: 4,
    bucket: "subsystem",
    note: "discern next of kin or blood biography, costed in inspiration uses rather than a day/week counter — cross-pool spend",
  },
  "investigator:profiler:divination-analysis:2": {
    archetypeId: "investigator:profiler",
    name: "Divination Analysis",
    level: 2,
    bucket: "numeric",
    note: "unconditional save bonus vs. divinations (+1/+2/+3 at 2nd/5th/8th), expressed via saveCategories: ['divination']; the paired caster-level-to-extract-duration increase has no 'cl' Change target (targets.ts's unapplied list) and the 11th-level inspiration/concentration-check clause is unrelated — both dropped",
  },
  "investigator:profiler:expert-profiler:1": {
    archetypeId: "investigator:profiler",
    name: "Expert Profiler",
    level: 1,
    bucket: "numeric",
    note: "the base Sense Motive bonus is unconditional; the free-inspiration-on-Sense-Motive spend-option and the creature-tracking ability are dropped",
  },
  "investigator:profiler:pack-psychology:7": {
    archetypeId: "investigator:profiler",
    name: "Pack Psychology",
    level: 7,
    bucket: "situational",
    note: "+1 AC, but only against creatures with an Intelligence score attempting to flank; enemy-type-scoped",
  },

  // ── investigator:psychic-detective ──
  "investigator:psychic-detective:phrenic-dabbler:3": {
    archetypeId: "investigator:psychic-detective",
    name: "Phrenic Dabbler",
    level: 3,
    bucket: "subsystem",
    note: "grants a phrenic-point pool and an amplification; phrenic points aren't modeled in this engine",
  },
  "investigator:psychic-detective:psychic-meddler:2": {
    archetypeId: "investigator:psychic-detective",
    name: "Psychic Meddler",
    level: 2,
    bucket: "blocked",
    note: "scaling save bonus vs. psychic spells/SLAs — no 'psychic' SAVE_CATEGORIES entry; the caster-level-check dispel clause is also unapplied (cl)",
  },
  "investigator:psychic-detective:spells:1": {
    archetypeId: "investigator:psychic-detective",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "swaps in the psychic spell list; spell-list swaps are subsystem",
  },

  // ── investigator:questioner ──
  "investigator:questioner:inspiration-for-subterfuge:1": {
    archetypeId: "investigator:questioner",
    name: "Inspiration for Subterfuge",
    level: 1,
    bucket: "subsystem",
    note: "inspiration spend-option retarget (Knowledge/Linguistics/Stealth); class note 2",
  },
  "investigator:questioner:know-it-all:2": {
    archetypeId: "investigator:questioner",
    name: "Know-It-All",
    level: 2,
    bucket: "numeric",
    note: "unconditional, uncapped-progression bonus to every Knowledge subskill (all trained-only per SKILL_TRAINED_ONLY, so the 'in which he is trained' qualifier doesn't restrict the skill.knowledge group-fan-out target — see the vendored Bardic Knowledge precedent in archetype-effects.ts); the perceptive-tracking synergy and the bonus-talent grant are dropped",
  },
  "investigator:questioner:restricted-talents:3": {
    archetypeId: "investigator:questioner",
    name: "Restricted Talents",
    level: 3,
    bucket: "subsystem",
    note: "removes the Alchemist Discovery investigator talent from the pick-list; talent-list restriction (class note 1)",
  },
  "investigator:questioner:spells:1": {
    archetypeId: "investigator:questioner",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "casts bard spells as the questioner's own spell list; spell-list swaps are subsystem",
  },

  // ── investigator:reckless-epicurean ──
  "investigator:reckless-epicurean:a-familiar-taste:2": {
    archetypeId: "investigator:reckless-epicurean",
    name: "A Familiar Taste",
    level: 2,
    bucket: "situational",
    note: "a real Perception/Spellcraft bonus, but scoped to identifying potions specifically; the poison-resistance-to-potions/drugs extension is likewise narrowly scoped",
  },
  "investigator:reckless-epicurean:experimental-potable:5": {
    archetypeId: "investigator:reckless-epicurean",
    name: "Experimental Potable",
    level: 5,
    bucket: "subsystem",
    note: "brews an unknown-formula extract with randomized side effects; alchemy/extract subsystem (class note 4)",
  },
  "investigator:reckless-epicurean:sympathetic-resistance:13": {
    archetypeId: "investigator:reckless-epicurean",
    name: "Sympathetic Resistance",
    level: 13,
    bucket: "subsystem",
    note: "an activated save bonus sized to the spell level of whichever extract/potion was just drunk — not a value any static @data path can express",
  },

  // ── investigator:ruthless-agent ──
  "investigator:ruthless-agent:agonizing-strike:4": {
    archetypeId: "investigator:ruthless-agent",
    name: "Agonizing Strike",
    level: 4,
    bucket: "situational",
    note: "converts Studied Strike damage to nonlethal plus a Fort-save-or-debuff; Studied Strike class note 3 (situational)",
  },
  "investigator:ruthless-agent:compel-obedience:11": {
    archetypeId: "investigator:ruthless-agent",
    name: "Compel Obedience",
    level: 11,
    bucket: "subsystem",
    note: "geas/quest 1/day, wired via the spell-like-abilities route (the 17th-level second-target upgrade isn't modeled)",
  },
  "investigator:ruthless-agent:concoction-of-truth:7": {
    archetypeId: "investigator:ruthless-agent",
    name: "Concoction of Truth",
    level: 7,
    bucket: "subsystem",
    note: "the fixed Discern Lies formula grant is wired via the casting-economy bonus-known table; the free extract slot for it is restricted to that spell only (doesn't count against the daily allotment), so it stays residue rather than folding into the general slot total",
  },
  "investigator:ruthless-agent:enhanced-intimidation:1": {
    archetypeId: "investigator:ruthless-agent",
    name: "Enhanced Intimidation",
    level: 1,
    bucket: "numeric",
    note: "the base Intimidate bonus is unconditional; the attitude-shift-duration and no-DC-increase-on-retry clauses are secondary and dropped",
  },
  "investigator:ruthless-agent:inspiration:1": {
    archetypeId: "investigator:ruthless-agent",
    name: "Inspiration",
    level: 1,
    bucket: "subsystem",
    note: "inspiration spend-option retarget (Intimidate/Knowledge/Sense Motive, no attack/save use); class note 2",
  },
  "investigator:ruthless-agent:interrogate:3": {
    archetypeId: "investigator:ruthless-agent",
    name: "Interrogate",
    level: 3,
    bucket: "subsystem",
    note: "imposes a scaling Bluff penalty on a QUESTIONED target, not a bonus to the agent's own sheet; no Change target represents an effect on someone else's skill",
  },

  // ── investigator:scavenger ──
  "investigator:scavenger:construct-mastery:2": {
    archetypeId: "investigator:scavenger",
    name: "Construct Mastery",
    level: 2,
    bucket: "blocked",
    note: "the vendored description is verbatim Poison Resistance/Immunity boilerplate entirely unrelated to a 'Construct Mastery' ability (likely swapped with craft-construct:11's real content during vendoring); no reliable number to extract from mismatched text",
  },
  "investigator:scavenger:craft-construct:11": {
    archetypeId: "investigator:scavenger",
    name: "Craft Construct",
    level: 11,
    bucket: "situational",
    note: "real Craft-check and weapon-damage bonuses, but both scoped to constructs specifically, plus a named bonus-feat grant (Craft Construct) — enemy/object-type-scoped throughout (its content plausibly belongs under construct-mastery:2, see that entry's note)",
  },
  "investigator:scavenger:gadgetry:1": {
    archetypeId: "investigator:scavenger",
    name: "Gadgetry",
    level: 1,
    bucket: "numeric",
    note: "unconditional Craft (clockwork) competence bonus equal to class level — Craft (clockwork) is a single fixed, non-player-chosen instance (unlike Master Smith, which spans whichever of several Craft skills the player has for metal items), so it uses the established skill.crf.<slug> convention — extracted (see INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED below); the Knowledge (engineering)-as-Spellcraft item-identification rider is dropped",
  },
  "investigator:scavenger:jury-rig:2": {
    archetypeId: "investigator:scavenger",
    name: "Jury-Rig",
    level: 2,
    bucket: "subsystem",
    note: "sacrifices a gadget for a repair/skill-check modifier sized to the gadget's extract level — an event-dependent choice, not a static @data value",
  },
  "investigator:scavenger:mechanical-inspiration:1": {
    archetypeId: "investigator:scavenger",
    name: "Mechanical Inspiration",
    level: 1,
    bucket: "subsystem",
    note: "inspiration spend-option retarget (Appraise/Disable Device/Knowledge-engineering free, Knowledge/Linguistics/Spellcraft still cost); class note 2",
  },

  // ── investigator:skeptic ──
  "investigator:skeptic:exorcising-touch:7": {
    archetypeId: "investigator:skeptic",
    name: "Exorcising Touch",
    level: 7,
    bucket: "situational",
    note: "deals studied-strike-bonus damage through a touch attack against a possessing creature; Studied Strike class note 3 (situational)",
  },
  "investigator:skeptic:fear-immunity:11": {
    archetypeId: "investigator:skeptic",
    name: "Fear Immunity",
    level: 11,
    bucket: "blocked",
    note: "identical description to suspect-hoax:2 (the same duplicated-text pattern as elsewhere in this table); the narrow scopes named (spells that fake a supernatural presence, haunts/incorporeal undead) have no matching SAVE_CATEGORIES entry, and extracting the shared text twice would double-count regardless",
  },
  "investigator:skeptic:hauntfinding:1": {
    archetypeId: "investigator:skeptic",
    name: "Hauntfinding",
    level: 1,
    bucket: "situational",
    note: "a real bonus, but scoped entirely to noticing/reacting to haunts specifically",
  },
  "investigator:skeptic:smite-haunt:4": {
    archetypeId: "investigator:skeptic",
    name: "Smite Haunt",
    level: 4,
    bucket: "situational",
    note: "deals studied-strike-bonus damage to haunts specifically; Studied Strike class note 3 (situational), plus haunt-only targeting",
  },
  "investigator:skeptic:suspect-hoax:2": {
    archetypeId: "investigator:skeptic",
    name: "Suspect Hoax",
    level: 2,
    bucket: "blocked",
    note: "same reasoning as fear-immunity:11 above (duplicate text, no matching save category)",
  },

  // ── investigator:sleuth ──
  "investigator:sleuth:deeds:1": {
    archetypeId: "investigator:sleuth",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "luck-point-spend deed list; pick-list/resource subsystem",
  },
  "investigator:sleuth:sleuth-s-luck:1": {
    archetypeId: "investigator:sleuth",
    name: "Sleuth's Luck",
    level: 1,
    bucket: "subsystem",
    note: "a fluctuating luck-point resource pool (grit/panache analog) this engine doesn't track",
  },

  // ── investigator:spiritualist ──
  "investigator:spiritualist:commune-with-spirits:1": {
    archetypeId: "investigator:spiritualist",
    name: "Commune with Spirits",
    level: 1,
    bucket: "subsystem",
    note: "choice-gated: a shared day-counter pool spent across a growing list of named spells (comprehend languages/detect secret doors/identify, later augury/speak with dead/locate object/legend lore) — not expressible as a per-spell day counter",
  },
  "investigator:spiritualist:sixth-sense:3": {
    archetypeId: "investigator:spiritualist",
    name: "Sixth Sense",
    level: 3,
    bucket: "subsystem",
    note: "spends a use of Commune with Spirits to reroll a failed save; activated resource ability",
  },
  "investigator:spiritualist:spirit-sense:2": {
    archetypeId: "investigator:spiritualist",
    name: "Spirit Sense",
    level: 2,
    bucket: "subsystem",
    note: "reduces the inspiration cost of augmenting a save vs. an incorporeal creature's effect from 2 to 1; spend-option change (class note 2)",
  },
  "investigator:spiritualist:strong-life:2": {
    archetypeId: "investigator:spiritualist",
    name: "Strong Life",
    level: 2,
    bucket: "numeric",
    note: "the death-effects half of the save bonus uses a real SAVE_CATEGORIES entry; the negative-energy-damage half isn't a saving throw category this vocabulary carries, dropped",
  },
  "investigator:spiritualist:touched-by-the-beyond:11": {
    archetypeId: "investigator:spiritualist",
    name: "Touched by the Beyond",
    level: 11,
    bucket: "subsystem",
    note: "death-effect immunity (boolean, no categorical-immunity Change target) plus half damage from negative energy (no energy-resistance target for negative energy specifically)",
  },
  "investigator:spiritualist:whispering-spirits:4": {
    archetypeId: "investigator:spiritualist",
    name: "Whispering Spirits",
    level: 4,
    bucket: "situational",
    note: "a real Wisdom-modifier insight AC/save bonus, but activated by spending a use of Commune with Spirits and limited to a 1-minute duration",
  },

  // ── investigator:star-watcher ──
  "investigator:star-watcher:astrology:1": {
    archetypeId: "investigator:star-watcher",
    name: "Astrology",
    level: 1,
    bucket: "subsystem",
    note: "reflavors the alchemy class feature into astrology-themed horoscopes; class note 4: alchemy/extract features are subsystem",
  },
  "investigator:star-watcher:investigator-talents:3": {
    archetypeId: "investigator:star-watcher",
    name: "Investigator Talents",
    level: 3,
    bucket: "subsystem",
    note: "unlocks an additional talent list; pick-list subsystem (class note 1)",
  },
  "investigator:star-watcher:starfinding:1": {
    archetypeId: "investigator:star-watcher",
    name: "Starfinding",
    level: 1,
    bucket: "numeric",
    note: "the Knowledge (geography) clause is unconditional; the Knowledge-in-place-of-Sense-Motive substitution has no Change target and is dropped",
  },
  "investigator:star-watcher:weapon-and-armor-proficiency:1": {
    archetypeId: "investigator:star-watcher",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant; no Change",
  },

  // ── investigator:steel-hound ──
  "investigator:steel-hound:investigator-talent:3": {
    archetypeId: "investigator:steel-hound",
    name: "Investigator Talent",
    level: 3,
    bucket: "subsystem",
    note: "lets Extra Grit/Rapid Reload be chosen in place of a talent; pick-list subsystem (class note 1)",
  },
  "investigator:steel-hound:packing-heat:2": {
    archetypeId: "investigator:steel-hound",
    name: "Packing Heat",
    level: 2,
    bucket: "subsystem",
    note: "bonus feats (Amateur Gunslinger, Gunsmithing) plus a battered gun item; feat/item grant, no flat number",
  },
  "investigator:steel-hound:talented-shot:11": {
    archetypeId: "investigator:steel-hound",
    name: "Talented Shot",
    level: 11,
    bucket: "subsystem",
    note: "gunslinger-deed pick in place of a talent; deferred pick-list subsystem",
  },
  "investigator:steel-hound:weapon-and-armor-proficiency:1": {
    archetypeId: "investigator:steel-hound",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant; no Change",
  },

  // ── investigator:tekritanin-arbiter ──
  "investigator:tekritanin-arbiter:expert-mediator:2": {
    archetypeId: "investigator:tekritanin-arbiter",
    name: "Expert Mediator",
    level: 2,
    bucket: "subsystem",
    note: "extends a Diplomacy attitude shift's duration and adds a fixed-DC Sense Motive check to read multi-party attitudes; no flat number for the arbiter's own stats",
  },
  "investigator:tekritanin-arbiter:fluent-speaker:3": {
    archetypeId: "investigator:tekritanin-arbiter",
    name: "Fluent Speaker",
    level: 3,
    bucket: "situational",
    note: "real, scaling Disguise/Diplomacy/Sense Motive bonuses, but all scoped to individuals native to one of the arbiter's chosen languages — a narrow subject-type condition",
  },
  "investigator:tekritanin-arbiter:hidden-meaning:2": {
    archetypeId: "investigator:tekritanin-arbiter",
    name: "Hidden Meaning",
    level: 2,
    bucket: "numeric",
    note: "unconditional, unqualified save bonus vs. language-dependent effects (a real SAVE_CATEGORIES entry now that `languageDependent` exists); scales +2/+4/+6 through 8th, then the text claims immunity at 11th — dropped, no Change target expresses categorical save immunity",
  },
  "investigator:tekritanin-arbiter:poison-resistance:5": {
    archetypeId: "investigator:tekritanin-arbiter",
    name: "Poison Resistance",
    level: 5,
    bucket: "numeric",
    note: "the same poison-save progression as purify-mind-and-body:2, just gate-delayed to 5th level by this archetype (a single, unpaired id — the delayed gate doesn't create a double-count risk); the 11th-level immunity claim is dropped as elsewhere",
  },
  "investigator:tekritanin-arbiter:tekritanin:1": {
    archetypeId: "investigator:tekritanin-arbiter",
    name: "Tekritanin",
    level: 1,
    bucket: "numeric",
    note: "the Linguistics clause is unconditional; the bonus-language grant and the Diplomacy/language-dependent-effect comprehension ability have no Change target and are dropped",
  },

  // ── investigator:toxin-codexer ──
  "investigator:toxin-codexer:modify-toxin:3": {
    archetypeId: "investigator:toxin-codexer",
    name: "Modify Toxin",
    level: 3,
    bucket: "subsystem",
    note: "inspiration-spend poison-modification list with variable alchemical bonuses/penalties; activated resource ability, alchemy/poison-adjacent (class note 4)",
  },
  "investigator:toxin-codexer:synthetic-venom:1": {
    archetypeId: "investigator:toxin-codexer",
    name: "Synthetic Venom",
    level: 1,
    bucket: "subsystem",
    note: "prepares extract slots as short-lived poisons instead of extracts; alchemy/extract subsystem (class note 4)",
  },
};

/**
 * ── INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────
 *
 * Machine-extracted mechanical effects for investigator archetype class
 * features (the prose->Change extraction pipeline, investigator slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 29 of investigator's 153
 * features cleared the `numeric` bar (see
 * `INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — investigator's kit leans heavily on the inspiration
 * pool's spend-options, investigator talents, Studied Combat/Strike
 * reflavors, and alchemy/extract mechanics, all deferred subsystems in this
 * engine today (see this file's header doc comment).
 */
export const INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Antiquarian's "Curse Resistance" is an unconditional, uncapped-at-8th
  // save bonus vs. curse-descriptor effects — a real SAVE_CATEGORIES entry.
  // The text's own claim of complete immunity at 11th has no Change target
  // (categorical save immunity isn't expressible) and is dropped.
  "investigator:antiquarian:curse-resistance:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["curse"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. curse effects (11th-level immunity not modeled)`,
    confidence: "medium",
    provenance:
      "an antiquarian gains a +2 bonus on all saving throws against spells and effects with " +
      "the curse descriptor. This bonus increases to +4 at 5th level and to +6 at 8th level.",
  },

  // Cipher's "Null Aura" grants a flat, unconditional +4 save bonus vs.
  // divination spells/SLAs/effects — a real SAVE_CATEGORIES entry. The
  // anti-scrying/nondetection rules text (knowledge-of-target condition,
  // 9th-level constant nondetection) isn't a Change and is dropped.
  "investigator:cipher:null-aura:4": {
    changes: [
      {
        formula: "4",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["divination"],
      },
    ],
    detail: () =>
      "+4 vs. divination spells/SLAs/effects (anti-scrying/nondetection rules text not modeled)",
    confidence: "medium",
    provenance:
      "He gains a +4 bonus on saving throws against divination spells, spell-like abilities, " +
      "and effects.",
  },

  // Conspirator's "Underhanded" grants an unconditional half-level Disguise
  // bonus; the accompanying Bluff bonus is scoped to "checks to appear
  // innocent" (narrower than the whole skill) and is dropped.
  "investigator:conspirator:underhanded:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dis")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Disguise (Bluff-to-appear-innocent clause not modeled)`,
    confidence: "medium",
    provenance:
      "A conspirator adds half his investigator level (minimum 1) on Bluff checks to appear " +
      "innocent and on Disguise checks.",
  },

  // Cult Hunter's "Purify Mind and Body" is the vanilla investigator Poison
  // Resistance/Immunity text under a new name — same shape and same dropped
  // 11th-level-immunity caveat as Curse Resistance above.
  "investigator:cult-hunter:purify-mind-and-body:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["poison"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. poison (11th-level immunity not modeled)`,
    confidence: "medium",
    provenance:
      "an investigator gains a +2 bonus on all saving throws against poison. This bonus " +
      "increases to +4 at 5th level, and to +6 at 8th level.",
  },

  // Cult Hunter's "Sense Madness" base clause ("on Sense Motive checks") is
  // unconditional; the doubled bonus for detecting insanity specifically is
  // a narrower secondary clause and is dropped.
  "investigator:cult-hunter:sense-madness:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.sen")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Sense Motive (doubled vs. insanity checks not modeled)`,
    confidence: "high",
    provenance:
      "A cult hunter adds a bonus equal to 1/2 his class level (minimum +1) on Sense Motive checks",
  },

  // Empiricist's "Unfailing Logic" grants an unconditional Will-save bonus
  // vs. illusion effects that allow a disbelieve save — "illusion" is a real
  // SAVE_CATEGORIES entry and is Will-only, matching the text. The
  // Int-for-Wis resource-spend option and the 16th-level immunity are
  // dropped.
  "investigator:empiricist:unfailing-logic:4": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 4, 2)",
        target: "allSavingThrows",
        type: "insight",
        saveCategories: ["illusion"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 4 : 2} insight vs. illusion disbelief saves (16th-level immunity, Int-for-Wis swap not modeled)`,
    confidence: "medium",
    provenance:
      "an empiricist gains a +2 insight bonus on all Will saving throws against illusion " +
      "spells or spell-like abilities that allow a save to disbelieve their effects",
  },

  // Engineer's "Mechanical Understanding" Knowledge (engineering) clause is
  // unconditional; the Knowledge (arcana) bonus is scoped to identifying
  // constructs specifically and is dropped.
  "investigator:engineer:mechanical-understanding:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.ken")],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 3)} Knowledge (engineering) (Knowledge-arcana-vs-constructs clause not modeled)`,
    confidence: "medium",
    provenance:
      "a +1 bonus on Knowledge (engineering) checks. This bonus increases by 1 at 6th level " +
      "and every 3 levels thereafter.",
  },

  // Forensic Physician's "Disease Lore" save-bonus clause is unconditional
  // and uncapped; the Heal-based diagnosis/disinfection utility is dropped.
  "investigator:forensic-physician:disease-lore:3": {
    changes: [
      {
        formula: "2 + 2 * max(0, floor((@class.unlevel - 3) / 3))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["disease"],
      },
    ],
    detail: (level) => `+${2 + 2 * Math.max(0, Math.floor((level - 3) / 3))} vs. disease`,
    confidence: "high",
    provenance:
      "he receives a +2 bonus on saving throws against diseases. This bonus increases by 2 " +
      "at 6th level and every 3 investigator levels thereafter.",
  },

  // Forensic Physician's "Medical Expertise" base Heal bonus is
  // unconditional; the doubled-vs-tampering clause and the inspiration
  // retarget are dropped.
  "investigator:forensic-physician:medical-expertise:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.hea")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Heal (doubled vs. tampering not modeled)`,
    confidence: "medium",
    provenance: "A forensic physician adds half his investigator level (minimum 1) on Heal checks.",
  },

  // Gravedigger's "Deny Death" grants an unconditional, uncapped-at-11th
  // save bonus vs. death effects AND energy drain — only the death-effects
  // half is extracted; energy drain has no matching SAVE_CATEGORIES entry.
  "investigator:gravedigger:deny-death:2": {
    changes: [
      {
        formula:
          "if(gte(@class.unlevel, 11), 8, if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2)))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["death"],
      },
    ],
    detail: (level) => {
      const v = level >= 11 ? 8 : level >= 8 ? 6 : level >= 5 ? 4 : 2;
      return `+${v} vs. death effects (energy-drain clause not modeled)`;
    },
    confidence: "medium",
    provenance:
      "a gravedigger gains a +2 bonus on all saving throws against death effects and energy " +
      "drain. This increases to +4 at 5th level, to +6 at 8th level, and to +8 at 11th level.",
  },

  // Guardian of Immortality's "Desert Survivor" 5th-level resist-fire clause
  // is unconditional; the Endurance feat grant, sand-terrain rule, and
  // 8th-level sandstorm-sight/pursuit-advantage clauses are dropped.
  "investigator:guardian-of-immortality:desert-survivor:2": {
    changes: [c("if(gte(@class.unlevel, 5), 10, 0)", "eres.fire")],
    detail: (level) =>
      level >= 5
        ? "fire resistance 10 (Endurance feat, desert-terrain features not modeled)"
        : "no fire resistance yet below 5th (grants Endurance, desert-terrain features not modeled)",
    confidence: "medium",
    provenance: "At 5th level, he gains resist fire 10.",
  },

  // Guardian of Immortality's "Guardian's Gaze" is a clean, unqualified
  // Sense Motive bonus.
  "investigator:guardian-of-immortality:guardian-s-gaze:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.sen")],
    detail: (level) => `+${Math.floor(level / 2)} Sense Motive`,
    confidence: "high",
    provenance:
      "a guardian of immortality adds 1/2 his investigator level as a bonus on Sense Motive checks.",
  },

  // Guardian of Immortality's "Orchid's Drop" grants a flat, unconditional
  // alchemical bonus to ALL saving throws, replacing Poison Immunity — clean
  // grant, no double-count risk (Poison Immunity's own vendored Change is a
  // different target, immEffect.poison).
  "investigator:guardian-of-immortality:orchid-s-drop:11": {
    changes: [{ formula: "1", target: "allSavingThrows", type: "alchemical" }],
    detail: () => "+1 alchemical bonus on all saving throws",
    confidence: "high",
    provenance: "granting him a +1 alchemical bonus on all saving throws.",
  },

  // Jinyiwei's "Celestial Insight" grants an unconditional, uncapped-at-18th
  // save bonus vs. enchantment AND illusion effects — both real
  // SAVE_CATEGORIES entries, both Will-only, matching the text.
  "investigator:jinyiwei:celestial-insight:3": {
    changes: [
      {
        formula: "min(6, 1 + floor((@class.unlevel - 3) / 3))",
        target: "allSavingThrows",
        type: "competence",
        saveCategories: ["enchantment", "illusion"],
      },
    ],
    detail: (level) =>
      `+${Math.min(6, 1 + Math.floor((level - 3) / 3))} competence vs. enchantment/illusion`,
    confidence: "high",
    provenance:
      "She gains a +1 competence bonus on saving throws to resist enchantment and illusion " +
      "effects. At 6th level and every 3 levels thereafter, these bonuses increase by 1 (to a " +
      "maximum of +6 at 18th level).",
  },

  // Jinyiwei's "Suspicious Mind" Sense Motive clause is unconditional; the
  // Linguistics-to-detect-forgeries and Perception-to-see-through-disguises/
  // locate-via-Stealth/find-secret-doors clauses are each narrower than the
  // whole skill and are dropped.
  "investigator:jinyiwei:suspicious-mind:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.sen")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Sense Motive (Linguistics/Perception clauses not modeled)`,
    confidence: "medium",
    provenance: "A jinyiwei adds half her level (minimum 1) to Sense Motive checks",
  },

  // Lamplighter's "Ready for the Revelation" 12th-level clause adding
  // Intelligence bonus to initiative is unconditional once reached — the
  // earlier free-inspiration-on-init, Quick-Draw-on-init, and surprise-round
  // action-economy tiers are spend-option/boolean and are dropped.
  "investigator:lamplighter:ready-for-the-revelation:3": {
    changes: [c("if(gte(@class.unlevel, 12), @abilities.int.mod, 0)", "init")],
    detail: (level) =>
      level >= 12
        ? "+Int modifier to initiative (other surprise-round upgrades not modeled)"
        : "no initiative bonus below 12th (free-inspiration-on-init and surprise-round upgrades not modeled)",
    confidence: "medium",
    provenance:
      "At 12th level, the lamplighter adds his Intelligence bonus as well as his Dexterity " +
      "bonus to initiative checks.",
  },

  // Lepidstadt Inspector's "Interrogation" Sense Motive clause is
  // unconditional; the Intimidate-checks-made-to-influence-attitude clause
  // is a narrower use of Intimidate than the whole skill and is dropped.
  "investigator:lepidstadt-inspector:interrogation:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.sen")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Sense Motive (Intimidate-to-influence-attitude clause not modeled)`,
    confidence: "medium",
    provenance:
      "He adds 1/2 his class level (minimum 1) to Intimidate checks made to inf luence a " +
      "creature's attitude and to Sense Motive checks.",
  },

  // Lepidstadt Inspector's "Keen Mind" is a clean, unqualified Perception
  // and Will-save bonus on a 3-tier schedule — both clauses extracted in
  // full, nothing dropped.
  "investigator:lepidstadt-inspector:keen-mind:3": {
    changes: [
      c("if(gte(@class.unlevel, 15), 3, if(gte(@class.unlevel, 9), 2, 1))", "skill.per"),
      c("if(gte(@class.unlevel, 15), 3, if(gte(@class.unlevel, 9), 2, 1))", "will"),
    ],
    detail: (level) => `+${level >= 15 ? 3 : level >= 9 ? 2 : 1} Perception / Will saves`,
    confidence: "high",
    provenance:
      "He gains a +1 bonus on Perception checks and Will saves. These bonuses increase to +2 " +
      "at 9th level and +3 at 15th level.",
  },

  // Natural Philosopher's "Herbalism" Craft (alchemy) clause is
  // unconditional and uses the established skill.crf.alchemy convention
  // (see archetype-effects.ts's own use of that target); the Profession
  // (herbalist) half-bonus, the infusion-discovery grant, and the
  // Knowledge-substitution clause are dropped.
  "investigator:natural-philosopher:herbalism:3": {
    changes: [c("@class.unlevel", "skill.crf.alchemy", "competence")],
    detail: (level) =>
      `+${level} competence on Craft (alchemy) (Profession-herbalist half-bonus not modeled)`,
    confidence: "medium",
    provenance:
      "He also gains a competence bonus equal to his class level on Craft (alchemy) checks to " +
      "create alchemical items",
  },

  // Profiler's "Divination Analysis" save-bonus clause is unconditional
  // (+1/+2/+3 at 2nd/5th/8th) — a real SAVE_CATEGORIES entry. The paired
  // caster-level-to-extract-duration increase has no 'cl' Change target
  // (targets.ts's unapplied list) and the 11th-level inspiration/
  // concentration-check clause is unrelated; both dropped.
  "investigator:profiler:divination-analysis:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 3, if(gte(@class.unlevel, 5), 2, 1))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["divination"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 3 : level >= 5 ? 2 : 1} vs. divinations (caster-level/extract-duration increase and 11th-level inspiration clause not modeled)`,
    confidence: "medium",
    provenance:
      "His caster level to determine the duration of his divination extracts increases by 1, " +
      "and he gains a +1 bonus on saving throws against divinations. The increases to caster " +
      "level and bonus on saving throws increase by 1 at 5th level and by another 1 at 8th level.",
  },

  // Profiler's "Expert Profiler" base Sense Motive bonus is unconditional;
  // the free-inspiration-on-Sense-Motive spend-option and the
  // creature-tracking ability are dropped.
  "investigator:profiler:expert-profiler:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.sen")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Sense Motive`,
    confidence: "high",
    provenance:
      "A profiler gains a bonus equal to 1/2 his class level (minimum +1) on Sense Motive checks.",
  },

  // Questioner's "Know-It-All" grants an unconditional, uncapped-at-17th
  // bonus to every Knowledge subskill (skill.knowledge fans out to the
  // whole family — see compute.ts's SKILL_GROUPS, same target the vendored
  // Bardic Knowledge class feature uses). Every Knowledge subskill is
  // trained-only (tables.ts's SKILL_TRAINED_ONLY), so the text's "in which
  // he is trained" qualifier doesn't narrow the target beyond what the game
  // already enforces. The perceptive-tracking synergy and the bonus-talent
  // grant are dropped.
  "investigator:questioner:know-it-all:2": {
    changes: [c("min(6, 1 + floor((@class.unlevel - 2) / 3))", "skill.knowledge")],
    detail: (level) => `+${Math.min(6, 1 + Math.floor((level - 2) / 3))} all Knowledge skills`,
    confidence: "high",
    provenance:
      "a questioner receives a +1 bonus on skill checks for all Knowledge skills in which he " +
      "is trained. This bonus increases by 1 at 5th level and every 3 investigator levels " +
      "thereafter, to a maximum of +6 at 17th level.",
  },

  // Ruthless Agent's "Enhanced Intimidation" base bonus is unconditional;
  // the attitude-shift-duration and no-DC-increase-on-retry clauses are
  // secondary and are dropped.
  "investigator:ruthless-agent:enhanced-intimidation:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.int")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Intimidate`,
    confidence: "high",
    provenance:
      "A ruthless agent adds half her investigator level (minimum +1) as a bonus on Intimidate checks.",
  },

  // Scavenger's "Gadgetry" Craft (clockwork) clause is unconditional and
  // names one fixed instance (unlike Master Smith's multi-slug "metal
  // items" span); the Knowledge (engineering)-as-Spellcraft item-ID rider
  // is dropped.
  "investigator:scavenger:gadgetry:1": {
    changes: [c("@class.unlevel", "skill.crf.clockwork", "competence")],
    detail: (level) => `+${level} competence Craft (clockwork)`,
    confidence: "high",
    provenance: "he gains a competence bonus on Craft (clockwork) checks equal to his class level.",
  },

  // Spiritualist's "Strong Life" death-effects clause uses a real
  // SAVE_CATEGORIES entry; the negative-energy-damage half isn't a saving
  // throw category this vocabulary carries and is dropped.
  "investigator:spiritualist:strong-life:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["death"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. death effects (negative-energy-damage clause not modeled)`,
    confidence: "medium",
    provenance:
      "He gains a +2 bonus on saving throws against death effects and negative energy damage. " +
      "This bonus increases to +4 at 5th level, and to +6 at 8th level.",
  },

  // Star Watcher's "Starfinding" Knowledge (geography) clause is
  // unconditional; the Knowledge-in-place-of-Sense-Motive substitution has
  // no Change target and is dropped.
  "investigator:star-watcher:starfinding:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.kge")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Knowledge (geography)`,
    confidence: "high",
    provenance:
      "A star watcher adds half his level (minimum 1) as a bonus on Knowledge (geography) checks.",
  },

  // Tekritanin Arbiter's "Hidden Meaning" is the same unconditional,
  // uncapped-at-8th save-progression shape as Antiquarian's Curse Resistance,
  // scoped to language-dependent effects — a real SAVE_CATEGORIES entry. The
  // text's own claim of complete immunity at 11th has no Change target
  // (categorical save immunity isn't expressible) and is dropped.
  "investigator:tekritanin-arbiter:hidden-meaning:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["languageDependent"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. language-dependent effects (11th-level immunity not modeled)`,
    confidence: "medium",
    provenance:
      "he gains a +2 bonus on all saving throws against language-dependent effects. This bonus " +
      "increases to +4 at 5th level and to +6 at 8th level.",
  },

  // Tekritanin Arbiter's "Poison Resistance" is the same poison-save
  // progression as Cult Hunter's Purify Mind and Body, just gated to unlock
  // 3 levels later by this archetype (a single, unpaired id — the delayed
  // gate creates no double-count risk since nothing else keys off this same
  // id). The 11th-level immunity claim is dropped, same as elsewhere.
  "investigator:tekritanin-arbiter:poison-resistance:5": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, 4)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["poison"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : 4} vs. poison (11th-level immunity not modeled; this archetype delays the progression to 5th)`,
    confidence: "medium",
    provenance: "This bonus increases to +4 at 5th level, and to +6 at 8th level.",
  },

  // Tekritanin Arbiter's own "Tekritanin" Linguistics clause is
  // unconditional; the bonus-language grant and the Diplomacy/
  // language-dependent-effect comprehension ability have no Change target
  // and are dropped.
  "investigator:tekritanin-arbiter:tekritanin:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.lin")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Linguistics`,
    confidence: "high",
    provenance: "A Tekritanin arbiter adds 1/2 his level (minimum 1) to Linguistics checks.",
  },
};
