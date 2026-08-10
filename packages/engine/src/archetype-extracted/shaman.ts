/**
 * Shaman's slice of the pipeline: every vendored shaman archetype feature (16
 * archetypes, 61 features) read in full and bucketed as `numeric` /
 * `situational` / `subsystem` / `blocked`, with the `numeric` ones getting a
 * real `Change`-shaped extraction. Per the per-class file convention
 * (`index.ts`'s doc comment), this file owns BOTH of shaman's pipeline
 * artifacts — `SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION` — so a wave working on a
 * different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs a new
 * import + spread line.
 *
 * ── Shaman-specific mechanical facts this pass relies on ──────────────────
 *
 * 1. **Spirits** (spirit / greater spirit / true spirit), the **wandering
 *    spirit**, **spirit animals**, and **hexes** are all deferred subsystems
 *    in this engine — no picker, no per-spirit/per-hex Change modeling. The
 *    wandering spirit in particular is deliberately unmodeled by owner
 *    decision, so features that modify it (second wandering spirits, daily
 *    spirit-bond tradeoffs, wandering-hex cadence changes) stay `subsystem`
 *    with a plain note. Spirit-granted or hex-granted numbers belong to the
 *    subsystem, not to the archetype feature — only numbers the archetype
 *    feature itself grants unconditionally are extractable.
 * 2. **Spirit magic** spell-list swaps are the single most common shaman
 *    archetype feature shape (a fixed nine-spell list replacing the spirit's
 *    or wandering spirit's list) — spells-known/spell-list contents aren't
 *    Change targets, so every one of them is `subsystem`.
 * 3. Every paired base feature the vendored shaman rows point at — Hex
 *    (SHA), Wandering Hex, Wandering Spirit, and Spirit (greater) — carries
 *    zero vendored `changes` in `class-features.json`, so there is no
 *    replacement-suppression double-count risk anywhere in this class.
 * 4. **Channel energy** grants (Spirit Warden's Rebuke Spirits, Witch
 *    Doctor's Channel Energy) are a resource subsystem (uses/day pool +
 *    activated effect), not a baseline number.
 * 5. Class-skill list edits (Deep Spirit's Swim, Mysteries of the Past's
 *    five additions, Unnatural Mien's swap) aren't Change-expressible —
 *    class-skill lists aren't tracked per-archetype in this engine.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── shaman:animist ──
  "shaman:animist:animist-spirit-magic:1": {
    archetypeId: "shaman:animist",
    name: "Animist Spirit Magic",
    level: 1,
    bucket: "subsystem",
    note: "spirit magic spell-list swap (class note 2) — replaces the spirit's spirit magic spells, no Change-shaped number",
  },
  "shaman:animist:contact-with-the-spirit-world:12": {
    archetypeId: "shaman:animist",
    name: "Contact with the Spirit World",
    level: 12,
    bucket: "subsystem",
    note: "rounds-per-day activated ghost-touch/see-ethereal ability — resource-gated quality grant, not a number; replaces the L12 hex (no vendored changes, class note 3)",
  },
  "shaman:animist:dominate-spirit:10": {
    archetypeId: "shaman:animist",
    name: "Dominate Spirit",
    level: 10,
    bucket: "subsystem",
    note: "uses-per-day magic jar/possess object possession ability delivered through the familiar — activated resource mechanic, no number",
  },
  "shaman:animist:etherealness:18": {
    archetypeId: "shaman:animist",
    name: "Etherealness",
    level: 18,
    bucket: "subsystem",
    note: "1/day etherealness spell-like ability — resource-gated, no number",
  },
  "shaman:animist:exorcism:8": {
    archetypeId: "shaman:animist",
    name: "Exorcism",
    level: 8,
    bucket: "subsystem",
    note: "full-round touch ability ending possession/domination effects (Will DC 10 + 1/2 level + Wis) — activated ability, DC formulas aren't Change targets",
  },
  "shaman:animist:spirit-shaman:20": {
    archetypeId: "shaman:animist",
    name: "Spirit Shaman",
    level: 20,
    bucket: "subsystem",
    note: "at-will ethereal jaunt + 1/day astral projection spell-like abilities, replaces manifestation — no number",
  },
  "shaman:animist:wrangle-condition:2": {
    archetypeId: "shaman:animist",
    name: "Wrangle Condition",
    level: 2,
    bucket: "subsystem",
    note: "uses-per-day Diplomacy-check condition-removal ability — activated resource mechanic; the DC table is a resolution procedure, not a modifier",
  },

  // ── shaman:benefactor ──
  "shaman:benefactor:benefactor-ethos:1": {
    archetypeId: "shaman:benefactor",
    name: "Benefactor Ethos",
    level: 1,
    bucket: "subsystem",
    note: "removes curse-descriptor spells from the class spell list — spell-list restriction, no number",
  },
  "shaman:benefactor:benefactor-hexes:2": {
    archetypeId: "shaman:benefactor",
    name: "Benefactor Hexes",
    level: 2,
    bucket: "subsystem",
    note: "hex pick-list addition/restriction — hexes are a deferred subsystem (class note 1)",
  },

  // ── shaman:crystal-tender ──
  "shaman:crystal-tender:cabochon-form:20": {
    archetypeId: "shaman:crystal-tender",
    name: "Cabochon Form",
    level: 20,
    bucket: "subsystem",
    note: "1/day 12-hour iron body transformation — activated resource ability, not a baseline number",
  },
  "shaman:crystal-tender:invoke-latent-facets:8": {
    archetypeId: "shaman:crystal-tender",
    name: "Invoke Latent Facets",
    level: 8,
    bucket: "subsystem",
    note: "shares worn ioun stone benefits with the spirit animal within 100 ft — item-dependent sharing with the spirit-animal subsystem (class note 1), no number of the feature's own",
  },
  "shaman:crystal-tender:reciprocal-resonance:4": {
    archetypeId: "shaman:crystal-tender",
    name: "Reciprocal Resonance",
    level: 4,
    bucket: "subsystem",
    note: "trades a wandering-spirit ability pick for scaling DR/adamantine within 10 ft of the spirit animal — a wandering-spirit tradeoff (deliberately unmodeled subsystem, class note 1), and the DR is proximity-conditional besides",
  },
  "shaman:crystal-tender:scion-of-the-stones:1": {
    archetypeId: "shaman:crystal-tender",
    name: "Scion of the Stones",
    level: 1,
    bucket: "subsystem",
    note: "spirit animal natural-armor bonus/type change/replacement cost — the spirit animal's numbers, not the character's (class note 1)",
  },

  // ── shaman:deep-shaman ──
  "shaman:deep-shaman:aquatic-hexes:1": {
    archetypeId: "shaman:deep-shaman",
    name: "Aquatic Hexes",
    level: 1,
    bucket: "subsystem",
    note: "modifies specific hexes (beckoning chill, crashing waves) and swaps two hex picks — hex subsystem (class note 1)",
  },
  "shaman:deep-shaman:aquatic-spirit-abilities:1": {
    archetypeId: "shaman:deep-shaman",
    name: "Aquatic Spirit Abilities",
    level: 1,
    bucket: "subsystem",
    note: "modifies waves-spirit abilities (wave strike, fluid mastery) — spirit-granted numbers belong to the spirit subsystem, not this feature (class note 1); the underwater scoping is uncheckable besides",
  },
  "shaman:deep-shaman:brine-dragon-form:1": {
    archetypeId: "shaman:deep-shaman",
    name: "Brine Dragon Form",
    level: 1,
    bucket: "subsystem",
    note: "hours-per-day brine-dragon polymorph gated on the true waves spirit — activated resource ability riding the spirit subsystem",
  },
  "shaman:deep-shaman:deep-spirit:1": {
    archetypeId: "shaman:deep-shaman",
    name: "Deep Spirit",
    level: 1,
    bucket: "subsystem",
    note: "forces the waves spirit + an aquatic spirit animal, and adds Swim as a class skill — spirit restriction plus a class-skill edit, neither Change-expressible (class notes 1/5)",
  },

  // ── shaman:draconic-shaman ──
  "shaman:draconic-shaman:drake-companion:1": {
    archetypeId: "shaman:draconic-shaman",
    name: "Drake Companion",
    level: 1,
    bucket: "subsystem",
    note: "swaps the spirit animal for a drake companion and delays spirit magic/primary spirit — companion + spirit subsystem restructuring, no number",
  },

  // ── shaman:grasping-vine ──
  "shaman:grasping-vine:flower-s-form:8": {
    archetypeId: "shaman:grasping-vine",
    name: "Flower's Form",
    level: 8,
    bucket: "subsystem",
    note: "minutes-per-day plant shape I/II/III transformation — activated resource ability, not a baseline number",
  },
  "shaman:grasping-vine:greentongue:2": {
    archetypeId: "shaman:grasping-vine",
    name: "Greentongue",
    level: 2,
    bucket: "subsystem",
    note: "uses-per-day speak with plants + suggestion spell-like abilities — resource-gated, no number",
  },
  "shaman:grasping-vine:spirit:1": {
    archetypeId: "shaman:grasping-vine",
    name: "Spirit",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Spirit class feature (with a spirit-choice recommendation and an oracle-mystery matching rule) — spirit subsystem (class note 1), no number",
  },
  "shaman:grasping-vine:verdant-magic:1": {
    archetypeId: "shaman:grasping-vine",
    name: "Verdant Magic",
    level: 1,
    bucket: "subsystem",
    note: "spirit magic spell-list addition (class note 2) — no Change-shaped number",
  },

  // ── shaman:name-keeper ──
  "shaman:name-keeper:inherited-wayfinder:1": {
    archetypeId: "shaman:name-keeper",
    name: "Inherited Wayfinder",
    level: 1,
    bucket: "subsystem",
    note: "grants a wizard-style bonded object (a wayfinder) — bonded-item subsystem, no number",
  },
  "shaman:name-keeper:keeper-spirit-magic:1": {
    archetypeId: "shaman:name-keeper",
    name: "Keeper Spirit Magic",
    level: 1,
    bucket: "subsystem",
    note: "spirit magic spell-list swap (class note 2) — no Change-shaped number",
  },
  "shaman:name-keeper:pathfinders-past:4": {
    archetypeId: "shaman:name-keeper",
    name: "Pathfinders Past",
    level: 4,
    bucket: "subsystem",
    note: "daily-chosen Scrolls/Spells/Swords benefit menu replacing the wandering spirit — a wandering-spirit replacement with per-day player choices (class note 1), nothing unconditional to extract",
  },
  "shaman:name-keeper:versatile-hex:6": {
    archetypeId: "shaman:name-keeper",
    name: "Versatile Hex",
    level: 6,
    bucket: "subsystem",
    note: "daily temporary hex pick replacing the wandering hex — hex subsystem (class note 1)",
  },

  // ── shaman:overseer ──
  "shaman:overseer:controlling-magic:1": {
    archetypeId: "shaman:overseer",
    name: "Controlling Magic",
    level: 1,
    bucket: "subsystem",
    note: "spirit magic spell-list addition (class note 2) — no Change-shaped number",
  },
  "shaman:overseer:spirit-surge:3": {
    archetypeId: "shaman:overseer",
    name: "Spirit Surge",
    level: 3,
    bucket: "situational",
    note: "real +2 effective caster level, but only for mind-affecting spells delivered through the spirit animal's touch — a per-cast delivery condition the engine can't check, and 'cl' isn't an applied target anyway (targets.ts unapplied list)",
  },

  // ── shaman:possessed-shaman ──
  "shaman:possessed-shaman:crowded-vessel:2": {
    archetypeId: "shaman:possessed-shaman",
    name: "Crowded Vessel",
    level: 2,
    bucket: "subsystem",
    note: "grants a delayed re-save against failed charm/compulsion effects — a reroll mechanic, not a modifier; replaces the L2 hex (no vendored changes, class note 3)",
  },
  "shaman:possessed-shaman:shared-skill:1": {
    archetypeId: "shaman:possessed-shaman",
    name: "Shared Skill",
    level: 1,
    bucket: "situational",
    note: "real skill numbers, but on two PLAYER-CHOSEN skills with treat-ranks-as-level + Wis-for-ability substitution semantics — no build field tracks the choice, and rank substitution (non-stacking with real ranks) isn't a flat modifier a Change can express",
  },
  "shaman:possessed-shaman:wandering-hex:14": {
    archetypeId: "shaman:possessed-shaman",
    name: "Wandering Hex",
    level: 14,
    bucket: "subsystem",
    note: "the second-wandering-hex upgrade slot; its vendored description restates the base 6th-level Wandering Hex text (vendoring artifact, see report) — hex subsystem either way (class note 1)",
  },
  "shaman:possessed-shaman:wandering-skills:6": {
    archetypeId: "shaman:possessed-shaman",
    name: "Wandering Skills",
    level: 6,
    bucket: "situational",
    note: "real skill numbers, but on a DAILY-CHOSEN skill (re-picked with the wandering spirit) with the same treat-ranks-as-level + Wis substitution semantics as Shared Skill — per-day choice-bearing and not expressible as a flat modifier; the choice cadence rides the unmodeled wandering spirit (class note 1)",
  },

  // ── shaman:primal-warden ──
  "shaman:primal-warden:greater-primal-blessing:12": {
    archetypeId: "shaman:primal-warden",
    name: "Greater Primal Blessing",
    level: 12,
    bucket: "subsystem",
    note: "upgrades the primal blessing hex's random-effect table — a per-use hex targeting another creature, hex subsystem (class note 1)",
  },
  "shaman:primal-warden:hex:2": {
    archetypeId: "shaman:primal-warden",
    name: "Hex",
    level: 2,
    bucket: "subsystem",
    note: "restricts the hex pick-list (no chant/evil eye/misfortune/witch hexes) and appends the base Hex class-feature text verbatim (vendoring artifact, see report) — hex subsystem (class note 1)",
  },
  "shaman:primal-warden:primal-blessing:4": {
    archetypeId: "shaman:primal-warden",
    name: "Primal Blessing",
    level: 4,
    bucket: "subsystem",
    note: "a per-use hex bestowing a random 1d4-rolled effect on a target within 30 ft — activated, target-scoped, random; hex subsystem (class note 1)",
  },

  // ── shaman:serendipity-shaman ──
  "shaman:serendipity-shaman:limited-calling:1": {
    archetypeId: "shaman:serendipity-shaman",
    name: "Limited Calling",
    level: 1,
    bucket: "subsystem",
    note: "an archetype qualification prerequisite (a racial luck trait or Defiant Luck) — no mechanical effect of its own",
  },
  "shaman:serendipity-shaman:luck-hexes:2": {
    archetypeId: "shaman:serendipity-shaman",
    name: "Luck Hexes",
    level: 2,
    bucket: "subsystem",
    note: "hex pick-list addition — hex subsystem (class note 1)",
  },
  "shaman:serendipity-shaman:luck-magic:1": {
    archetypeId: "shaman:serendipity-shaman",
    name: "Luck Magic",
    level: 1,
    bucket: "subsystem",
    note: "spirit magic spell-list swap (Luck domain spells, class note 2) — no Change-shaped number",
  },

  // ── shaman:speaker-for-the-past ──
  "shaman:speaker-for-the-past:mysteries-of-the-past:1": {
    archetypeId: "shaman:speaker-for-the-past",
    name: "Mysteries of the Past",
    level: 1,
    bucket: "subsystem",
    note: "class-skill additions + spell-list additions + removes the familiar — class-skill lists and spell lists aren't Change targets (class notes 2/5)",
  },
  "shaman:speaker-for-the-past:revelations-of-the-past:4": {
    archetypeId: "shaman:speaker-for-the-past",
    name: "Revelations of the Past",
    level: 4,
    bucket: "subsystem",
    note: "grants oracle revelations (ancestor/time mysteries) in place of wandering spirit and wandering hex — revelations are a deferred pick-list subsystem, and the replaced features are unmodeled anyway (class note 1)",
  },

  // ── shaman:spirit-warden ──
  "shaman:spirit-warden:laugh-at-death:10": {
    archetypeId: "shaman:spirit-warden",
    name: "Laugh at Death",
    level: 10,
    bucket: "numeric",
    note: "flat, unconditional +4 insight bonus on saves vs. death effects — a clean Change.saveCategories case ('death' is a real save-categories.ts entry); the negative-levels half has no SAVE_CATEGORIES entry and is dropped, flagged in detail. Replaces the L10 hex (no vendored changes, class note 3)",
  },
  "shaman:spirit-warden:rebuke-spirits:2": {
    archetypeId: "shaman:spirit-warden",
    name: "Rebuke Spirits",
    level: 2,
    bucket: "subsystem",
    note: "channel positive energy (harm-undead-only) with a 3 + Cha uses/day pool — channel-energy resource subsystem (class note 4)",
  },
  "shaman:spirit-warden:restless-magic:1": {
    archetypeId: "shaman:spirit-warden",
    name: "Restless Magic",
    level: 1,
    bucket: "subsystem",
    note: "spirit magic spell-list swap (class note 2) — no Change-shaped number",
  },
  "shaman:spirit-warden:unnatural-mien:1": {
    archetypeId: "shaman:spirit-warden",
    name: "Unnatural Mien",
    level: 1,
    bucket: "situational",
    note: "real +2 Intimidate bonus, but scoped to demoralize attempts only — applying it to the whole Intimidate skill would over-apply; the Diplomacy/Handle Animal/Intimidate class-skill swap isn't Change-expressible either (class note 5)",
  },

  // ── shaman:true-silvered-throne ──
  "shaman:true-silvered-throne:occult-grimoire:1": {
    archetypeId: "shaman:true-silvered-throne",
    name: "Occult Grimoire",
    level: 1,
    bucket: "subsystem",
    note: "spell-preparation mechanic (grimoire replaces spirit-animal communion) — replaces spirit animal, no number",
  },
  "shaman:true-silvered-throne:ritual-hex:1": {
    archetypeId: "shaman:true-silvered-throne",
    name: "Ritual Hex",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat grant (Ritual Hex) — a specific named feat, granted as a pick not a count",
  },
  "shaman:true-silvered-throne:scarab-of-the-second-throne:4": {
    archetypeId: "shaman:true-silvered-throne",
    name: "Scarab of the Second Throne",
    level: 4,
    bucket: "situational",
    note: "real +4 AC, but only against sneak attacks and attacks of opportunity, and only while the scarab construct is worn in the amulet slot — attack-circumstance-scoped AC isn't expressible without over-applying",
  },
  "shaman:true-silvered-throne:wandering-ritual:6": {
    archetypeId: "shaman:true-silvered-throne",
    name: "Wandering Ritual",
    level: 6,
    bucket: "subsystem",
    note: "daily temporary hex pick (a Wandering Hex reflavor) — hex subsystem (class note 1)",
  },

  // ── shaman:unsworn-shaman ──
  "shaman:unsworn-shaman:minor-spirit:1": {
    archetypeId: "shaman:unsworn-shaman",
    name: "Minor Spirit",
    level: 1,
    bucket: "subsystem",
    note: "daily temporary hex access via minor-spirit bonds, scaling to more picks — hex/spirit subsystem (class note 1)",
  },
  "shaman:unsworn-shaman:second-wandering-spirit:6": {
    archetypeId: "shaman:unsworn-shaman",
    name: "Second Wandering Spirit",
    level: 6,
    bucket: "subsystem",
    note: "accelerates and doubles the wandering spirit schedule — the wandering spirit is deliberately unmodeled (class note 1)",
  },
  "shaman:unsworn-shaman:spirit-animal:2": {
    archetypeId: "shaman:unsworn-shaman",
    name: "Spirit Animal",
    level: 2,
    bucket: "subsystem",
    note: "spirit animal gains a daily-chosen wandering-spirit bonus — the spirit animal's numbers, riding the unmodeled wandering spirit (class note 1)",
  },
  "shaman:unsworn-shaman:wandering-spirit:2": {
    archetypeId: "shaman:unsworn-shaman",
    name: "Wandering Spirit",
    level: 2,
    bucket: "subsystem",
    note: "the early-access wandering-spirit slot; its vendored description restates the base 4th-level Wandering Spirit text (vendoring artifact, see report) — deliberately unmodeled either way (class note 1)",
  },

  // ── shaman:visionary ──
  "shaman:visionary:discern-magical-expertise:4": {
    archetypeId: "shaman:visionary",
    name: "Discern Magical Expertise",
    level: 4,
    bucket: "subsystem",
    note: "activated detect-magic-riding divination of a creature's casting subsystems (Will negates) — activated ability, no number; replaces the L4 wandering spirit (unmodeled, class note 1)",
  },
  "shaman:visionary:diviner-s-delving:4": {
    archetypeId: "shaman:visionary",
    name: "Diviner's Delving",
    level: 4,
    bucket: "subsystem",
    note: "bonus feat grant (Diviner's Delving) — a specific named feat, granted as a pick not a count",
  },
  "shaman:visionary:improved-divination:6": {
    archetypeId: "shaman:visionary",
    name: "Improved Divination",
    level: 6,
    bucket: "subsystem",
    note: "per-spell behavior upgrades (augury/divination accuracy, scrying prep level and cast time) — spell-behavior modifications with no Change target",
  },
  "shaman:visionary:vision-spirit-magic:4": {
    archetypeId: "shaman:visionary",
    name: "Vision Spirit Magic",
    level: 4,
    bucket: "subsystem",
    note: "spirit magic spell-list swap for the wandering spirit's spells (class notes 1/2) — no Change-shaped number",
  },
  "shaman:visionary:wandering-hex:14": {
    archetypeId: "shaman:visionary",
    name: "Wandering Hex",
    level: 14,
    bucket: "subsystem",
    note: "the second-wandering-hex upgrade slot; its vendored description restates the base 6th-level Wandering Hex text (vendoring artifact, see report) — hex subsystem either way (class note 1)",
  },

  // ── shaman:witch-doctor ──
  "shaman:witch-doctor:alignment:0": {
    archetypeId: "shaman:witch-doctor",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction (non-evil) — a build constraint, no number; carries the vendored level 0 (see report)",
  },
  "shaman:witch-doctor:channel-energy:4": {
    archetypeId: "shaman:witch-doctor",
    name: "Channel Energy",
    level: 4,
    bucket: "subsystem",
    note: "channel positive energy at shaman level - 3, 3 + Cha uses/day — channel-energy resource subsystem (class note 4); replaces the L4/L12 hexes (no vendored changes, class note 3)",
  },
  "shaman:witch-doctor:counter-curse:8": {
    archetypeId: "shaman:witch-doctor",
    name: "Counter Curse",
    level: 8,
    bucket: "subsystem",
    note: "spontaneous dispel magic/remove curse via spirit-magic-slot sacrifice, with a sacrifice-scaled caster-level-check bonus — spend-gated resource mechanic, and 'cl' checks aren't an applied target anyway",
  },
  "shaman:witch-doctor:countering-hex:10": {
    archetypeId: "shaman:witch-doctor",
    name: "Countering Hex",
    level: 10,
    bucket: "subsystem",
    note: "readied-action counterspell-as-dispel mechanic with a 24-hour lockout — an activated procedure, no modifier",
  },
};

/**
 * ── SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for shaman archetype class features
 * (the prose→Change extraction pipeline, shaman slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * Only 1 of shaman's 61 features cleared the `numeric` bar (see
 * `SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit) — shaman's kit is almost entirely spirits, wandering spirits,
 * spirit animals, hexes, and spirit-magic spell-list swaps, all deferred
 * subsystems in this engine (see the header doc comment).
 *
 * Confidence rubric (identical to fighter.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or one textually-present clause the engine can't express is
 *    dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Spirit Warden's "Laugh at Death" (Advanced Class Guide) is a flat,
  // wholly unconditional insight bonus on saves against death effects —
  // `death` is a real save-categories.ts entry (Fortitude-scoped), so
  // `allSavingThrows` + `saveCategories: ["death"]` is the established
  // idiom (class-feature-effects.ts's Bravery/Still Mind shape). The "and
  // to avoid or remove negative levels" half has no SAVE_CATEGORIES entry
  // (energy drain isn't in the modeled vocabulary), so it's dropped and
  // flagged in `detail` — the same partial-honesty posture as Scaled
  // Fist's Draconic Mettle dropping paralysis. Replaces the hex gained at
  // 10th level; the base Hex (SHA) class feature carries zero vendored
  // `changes`, so there is nothing to double-count.
  "shaman:spirit-warden:laugh-at-death:10": {
    changes: [
      {
        ...c("4", "allSavingThrows", "insight"),
        saveCategories: ["death"],
      },
    ],
    detail: () => "+4 insight vs. death-effect saves (negative levels not modeled)",
    confidence: "medium",
    provenance:
      "She gains a +4 insight bonus on saving throws against death effects and to avoid or " +
      "remove negative levels.",
  },
};
