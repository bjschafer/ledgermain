/**
 * Bloodrager's slice of the pipeline. The vendored data lists 18 bloodrager
 * archetypes, but only 17 of them carry any `archetypeFeatures` rows — see
 * fact 9 below for the one that doesn't. Every one of the 61 vendored
 * feature rows was read in full and bucketed as `numeric` / `situational` /
 * `subsystem` / `blocked`. Per the per-class file convention (`index.ts`'s
 * doc comment), this file owns BOTH of bloodrager's pipeline artifacts —
 * `BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working
 * on a different class never has a reason to touch this file; only
 * `index.ts` (the aggregator, a later integration step not done here) needs
 * a new import + spread line.
 *
 * ── Bloodrager-specific mechanical facts this pass relies on ──────────────
 *
 * 1. **Bloodrage** itself is a hand-authored, self-contained toggle-able
 *    `Buff` (`bloodrage.ts`'s `BLOODRAGE_BUFF`) — the vendored "Bloodrage"
 *    class feature carries zero `changes` upstream, so it is NOT part of the
 *    normal `collectModifiers` Change pipeline this extraction table feeds.
 *    Any archetype feature conditioned on "while bloodraging" (a live toggle
 *    state, not a persistent build/gear fact like armor or encumbrance) is
 *    therefore always `situational`/`subsystem`, the same posture
 *    `barbarian.ts` uses for "while raging" — the static sheet can't check
 *    an activated state. An archetype feature that ALTERS bloodrage's own
 *    mechanics (ability-score allocation, Will bonus, AC penalty) has no
 *    hook into this pipeline at all: `ArchetypeFeatureEffect` can only ADD
 *    `Change`s when a feature applies, it can't rewrite or suppress the
 *    hand-authored `BLOODRAGE_BUFF` object.
 * 2. **Fast Movement** (base L1 feature) carries a real vendored
 *    `landSpeed` Change (`+10 ft.`, gated on light/no/medium armor and not
 *    heavily encumbered). Four archetype features across this slice each
 *    claim to "replace fast movement" (Bloodrider's Fast Rider, Blood
 *    Conduit's Contact Specialist, Bloody-Knuckled Rowdy's Pugilist,
 *    Steelblood's Indomitable Stance) but none of them carries a
 *    `pairedBaseFeatureUuid` — so Fast Movement's Change keeps applying in
 *    full regardless, a pre-existing over-application gap unrelated to
 *    (and not touched by) any of this file's own extractions.
 * 3. **Natural attacks** (claws, slams, bites) aren't a modeled subsystem
 *    anywhere in this engine — `nattack`/`ndamage` are explicitly listed as
 *    unapplied targets (`targets.ts`). Hag-Riven's claws, Rageshaper's
 *    Terrible Slam, and every feature riding either stay `subsystem` for
 *    that reason, independent of whatever real numbers their prose states.
 * 4. **Mounts and animal companions** (Bloodrider's Feral Mount) carry the
 *    mount's own numbers, never the bloodrager's — no mount subsystem is
 *    tracked here, the same ruling `samurai.ts`/`cavalier.ts` use for
 *    mount abilities.
 * 5. **Bloodline** (powers, bonus feats, bonus spells) is the deferred
 *    pick-list machinery `bloodrager-bloodlines.ts` already models at the
 *    base-class level; archetype features that add to, restrict, reorder,
 *    or duplicate its schedule stay `subsystem` — there's no archetype-
 *    scoped bloodline hook in the `Change` vocabulary. Bloodrager's own
 *    base "Damage Reduction" class feature carries zero vendored `changes`
 *    (only specific bloodline powers grant a real, flat `dr` bonus on top
 *    of it) — so an archetype feature that removes the base DR feature
 *    (Bloody-Knuckled Rowdy's Bloody Knuckles) has nothing modeled to
 *    strike, and one that reinterprets how bloodline DR increases stack
 *    against it (Spelleater's Blood of Life) changes nothing observable in
 *    this engine either.
 * 6. **Spells known counts and spell-list contents** aren't `Change`
 *    targets anywhere in this engine. This is the single most common
 *    bloodrager archetype feature shape after bloodline riders (0-level
 *    spells known, fixed bonus spells known at specific levels, spell-list
 *    swaps/additions, a flat spells-known reduction) — all `subsystem`.
 * 7. Rageshaper's own prose (Devastating Form, Terrible Slam, Terrible
 *    Leap) repeatedly measures its numbers "per shifter level" and once
 *    calls out "the shifter claws class ability" verbatim, even though
 *    Rageshaper is a bloodrager archetype with zero shifter class levels —
 *    almost certainly a vendoring artifact (likely bled in from the
 *    unrelated Shifter base class, whose own Aspect/Claws features read
 *    similarly). Flagged and pinned in a test rather than silently
 *    substituting "bloodrager level," since none of the affected features
 *    clear the `numeric` bar regardless of which level term is meant.
 * 8. Two different archetypes' "Bloodline" rows — Prowler at World's End's
 *    "Bloodline (Destined)" and Untouchable Rager's "Bloodline" — restate
 *    the generic base Bloodline class-feature paragraph almost verbatim
 *    instead of describing an archetype-specific restriction. Untouchable
 *    Rager additionally carries two separate archetype-feature rows both
 *    named "Raging Resistance" (levels 4 and 7) with byte-identical
 *    description text. Both are vendoring duplicates, recorded rather than
 *    guessed at; neither affects this file's bucketing either way, since
 *    both features are `subsystem` on their own (unrestricted bloodline
 *    pick / spell-resistance grant scoped to a live bloodrage state).
 * 9. **Crossblooded Rager** is the one archetype with zero
 *    `archetypeFeatures` rows — its entire mechanical content (including a
 *    real, unconditional "-2 penalty to all Will saving throws at all
 *    times") lives only in the archetype's own top-level `description`
 *    text, not in any per-feature row. This per-feature-keyed pipeline has
 *    no id to hang that number on, so it can't be captured in either export
 *    table below — recorded here (and pinned in a test) rather than
 *    silently dropped.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── bloodrager:ancestral-harbinger ──
  "bloodrager:ancestral-harbinger:spirit-guardian:2": {
    archetypeId: "bloodrager:ancestral-harbinger",
    name: "Spirit Guardian",
    level: 2,
    bucket: "subsystem",
    note: "choice-gated: spiritual weapon/summon nature's ally II/spiritual ally/summon nature's ally VI, picked at cast time with no stored pick; replaces uncanny dodge (no vendored changes) and the 6th/18th bloodline feats (class note 5)",
  },
  "bloodrager:ancestral-harbinger:spirit-servants:5": {
    archetypeId: "bloodrager:ancestral-harbinger",
    name: "Spirit Servants",
    level: 5,
    bucket: "subsystem",
    note: "adds summon monster spells to the spell list plus a morale bonus/temp-HP grant to the SUMMONED creatures while bloodraging — the summoned creatures' numbers, not the bloodrager's own (same posture as ally/mount grants); replaces improved uncanny dodge and the 12th-level bloodline feat",
  },

  // ── bloodrager:blood-conduit ──
  "bloodrager:blood-conduit:contact-specialist:1": {
    archetypeId: "bloodrager:blood-conduit",
    name: "Contact Specialist",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat chosen from a 5-feat list, also added to the bloodline-feat list — pick-list grant, no build field tracks the choice; replaces fast movement (class note 2)",
  },
  "bloodrager:blood-conduit:spell-conduit:5": {
    archetypeId: "bloodrager:blood-conduit",
    name: "Spell Conduit",
    level: 5,
    bucket: "subsystem",
    note: "delivers touch spells through a successful combat-maneuver check while wearing light/no armor — an activated delivery-mechanic swap, no number; replaces uncanny dodge and improved uncanny dodge (no vendored changes)",
  },
  "bloodrager:blood-conduit:reflexive-conduit:14": {
    archetypeId: "bloodrager:blood-conduit",
    name: "Reflexive Conduit",
    level: 14,
    bucket: "subsystem",
    note: "immediate-action touch-spell counterattack when targeted by a combat maneuver, while wearing light/no armor — activated delivery mechanic, no number; replaces indomitable will (no vendored changes)",
  },

  // ── bloodrager:bloodrider ──
  "bloodrager:bloodrider:fast-rider:1": {
    archetypeId: "bloodrager:bloodrider",
    name: "Fast Rider",
    level: 1,
    bucket: "subsystem",
    note: "unconditional +10 ft. mount speed — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's landSpeed (class note 4); replaces fast movement (unpaired, class note 2)",
  },
  "bloodrager:bloodrider:feral-mount:5": {
    archetypeId: "bloodrager:bloodrider",
    name: "Feral Mount",
    level: 5,
    bucket: "subsystem",
    note: "grants a druid-style animal companion (bloodrager level -4) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block (class note 4); the Str morale bonus while bloodraging stays unwired (gated on a live rage state this engine doesn't track); replaces uncanny dodge and improved uncanny dodge (no vendored changes)",
  },
  "bloodrager:bloodrider:blood-bond:9": {
    archetypeId: "bloodrager:bloodrider",
    name: "Blood Bond",
    level: 9,
    bucket: "subsystem",
    note: "shares the bloodrager's bloodline immunities/resistances and personal-range spell effects with the feral mount — the mount's benefit, riding an unmodeled companion (class note 4); replaces the 9th-level bloodline feat",
  },

  // ── bloodrager:bloody-knuckled-rowdy ──
  "bloodrager:bloody-knuckled-rowdy:bloody-knuckles:1": {
    archetypeId: "bloodrager:bloody-knuckled-rowdy",
    name: "Bloody Knuckles",
    level: 1,
    bucket: "subsystem",
    note: "removes the base Damage Reduction class feature — that feature carries zero vendored changes to begin with (class note 5), so there is nothing modeled to strike",
  },
  "bloodrager:bloody-knuckled-rowdy:pugilist:1": {
    archetypeId: "bloodrager:bloody-knuckled-rowdy",
    name: "Pugilist",
    level: 1,
    bucket: "subsystem",
    note: "Improved Unarmed Strike as a named bonus feat — no Change; replaces fast movement (unpaired, class note 2)",
  },
  "bloodrager:bloody-knuckled-rowdy:reduced-spells-known:1": {
    archetypeId: "bloodrager:bloody-knuckled-rowdy",
    name: "Reduced Spells Known",
    level: 1,
    bucket: "subsystem",
    note: "the -1 spell known per level is wired via the casting-economy tables",
  },
  "bloodrager:bloody-knuckled-rowdy:combat-style-student:2": {
    archetypeId: "bloodrager:bloody-knuckled-rowdy",
    name: "Combat Style Student",
    level: 2,
    bucket: "subsystem",
    note: "a style-feat bonus feat pick (treating bloodrager level as monk level for style-feat prerequisites/effects) plus a later named Combat Style Master grant — pick-list plus prereq-waiver rules, no Change; replaces uncanny dodge and improved uncanny dodge (no vendored changes)",
  },
  "bloodrager:bloody-knuckled-rowdy:hand-to-hand-training:3": {
    archetypeId: "bloodrager:bloody-knuckled-rowdy",
    name: "Hand-to-Hand Training",
    level: 3,
    bucket: "subsystem",
    note: "unarmed-strike damage as a monk of level - 2 — no engine target for unarmed-strike damage dice (same posture as samurai Brawling Blademaster's Empty Hand)",
  },

  // ── bloodrager:enlightened-bloodrager ──
  "bloodrager:enlightened-bloodrager:enlightened-bloodrage:4": {
    archetypeId: "bloodrager:enlightened-bloodrager",
    name: "Enlightened Bloodrage",
    level: 4,
    bucket: "subsystem",
    note: "lifts bloodrage's Cha/Dex/Int-skill and patience/concentration restriction — that restriction is a `BLOODRAGE_BUFF` contextNote, not a Change, so there's nothing for this pipeline to grant either (class note 1)",
  },
  "bloodrager:enlightened-bloodrager:enlightened-spellcasting:4": {
    archetypeId: "bloodrager:enlightened-bloodrager",
    name: "Enlightened Spellcasting",
    level: 4,
    bucket: "subsystem",
    note: "grants 0-level spells known plus fixed bonus druid spells known at 4th/7th/10th/13th — spells known isn't a Change target (class note 6); replaces the 1st-level bloodline power and all bloodline bonus spells",
  },
  "bloodrager:enlightened-bloodrager:bloodline-feat:6": {
    archetypeId: "bloodrager:enlightened-bloodrager",
    name: "Bloodline Feat",
    level: 6,
    bucket: "subsystem",
    note: "adds Expanded Arcana/Nameless One (and its dependents) to the bloodline-feat pick list — bloodline pick-list subsystem (class note 5)",
  },

  // ── bloodrager:greenrager ──
  "bloodrager:greenrager:unfettered-fury:3": {
    archetypeId: "bloodrager:greenrager",
    name: "Unfettered Fury",
    level: 3,
    bucket: "subsystem",
    note: "woodland stride, but only while bloodraging — live bloodrage-state condition (class note 1), and woodland stride has no Change shape anyway; replaces blood sanctuary (no vendored changes)",
  },
  "bloodrager:greenrager:summoning-rager:6": {
    archetypeId: "bloodrager:greenrager",
    name: "Summoning Rager",
    level: 6,
    bucket: "subsystem",
    note: "adds summon nature's ally I-IV as bonus known spells at 6th/7th/10th/13th — spell-list addition (class note 6); replaces the 6th-level bloodline feat",
  },
  "bloodrager:greenrager:furious-summoning:9": {
    archetypeId: "bloodrager:greenrager",
    name: "Furious Summoning",
    level: 9,
    bucket: "subsystem",
    note: "Str/Con morale bonus and woodland stride for creatures summoned via summon nature's ally — the summoned creatures' numbers, not the bloodrager's own; replaces the 9th-level bloodline feat",
  },

  // ── bloodrager:hag-riven ──
  "bloodrager:hag-riven:arcane-influence:1": {
    archetypeId: "bloodrager:hag-riven",
    name: "Arcane Influence",
    level: 1,
    bucket: "subsystem",
    note: "removes martial-weapon proficiency and restricts the bloodline choice to a 5-bloodline list — build constraints, no Change",
  },
  "bloodrager:hag-riven:claws-of-the-hag:1": {
    archetypeId: "bloodrager:hag-riven",
    name: "Claws of the Hag",
    level: 1,
    bucket: "subsystem",
    note: "grants a scaling primary claw natural attack (1d4 to 1d8, magic at 2nd, 19-20 crit at 13th) — natural-attack targets aren't consumed by this engine (class note 3)",
  },
  "bloodrager:hag-riven:sorcerous-claws:5": {
    archetypeId: "bloodrager:hag-riven",
    name: "Sorcerous Claws",
    level: 5,
    bucket: "subsystem",
    note: "swift-action enhancement bonus (up to +5) and weapon properties to her claws, paid for by sacrificing a spell slot — resource-spend ability riding the unmodeled claws (class note 3)",
  },
  "bloodrager:hag-riven:scarred-hide:7": {
    archetypeId: "bloodrager:hag-riven",
    name: "Scarred Hide",
    level: 7,
    bucket: "numeric",
    note: "flat, unconditional natural armor bonus scaling +1 per 3 levels from 7th to 19th (max +5) — a clean nac/natural Change, unpaired, so nothing to double-count",
  },
  "bloodrager:hag-riven:hexing-claws:10": {
    archetypeId: "bloodrager:hag-riven",
    name: "Hexing Claws",
    level: 10,
    bucket: "subsystem",
    note: "Critical Focus as a named bonus feat (claw-attacks only) plus a daily-chosen Critical-Focus-dependent feat swap — pick-list grants riding the unmodeled claws (class note 3)",
  },

  // ── bloodrager:id-rager ──
  "bloodrager:id-rager:atavistic-avatar:1": {
    archetypeId: "bloodrager:id-rager",
    name: "Atavistic Avatar",
    level: 1,
    bucket: "subsystem",
    note: "Skill Focus (from a 2-skill list per emotional focus) plus medium spiritualist/phantom emotional-focus powers while bloodraging — pick-list feat grant riding a deferred medium/spiritualist subsystem, no Change",
  },
  "bloodrager:id-rager:atavistic-caster:4": {
    archetypeId: "bloodrager:id-rager",
    name: "Atavistic Caster",
    level: 4,
    bucket: "subsystem",
    note: "reclassifies bloodrager spells as psychic magic and lifts the emotional-component casting restriction while bloodraging — spellcasting-type/prerequisite rules, no number; replaces eschew materials",
  },
  "bloodrager:id-rager:bonus-feat:6": {
    archetypeId: "bloodrager:id-rager",
    name: "Bonus Feat",
    level: 6,
    bucket: "subsystem",
    note: "bonus feat chosen from a fixed list every 3 levels from 6th — pick-list grant, no Change; replaces all bloodline feats",
  },

  // ── bloodrager:metamagic-rager ──
  "bloodrager:metamagic-rager:meta-rage:5": {
    archetypeId: "bloodrager:metamagic-rager",
    name: "Meta-Rage",
    level: 5,
    bucket: "subsystem",
    note: "applies a known metamagic feat to a bloodrager spell by sacrificing rounds of bloodrage — resource-spend activated ability, no baseline number; replaces improved uncanny dodge (no vendored changes)",
  },

  // ── bloodrager:primalist ──
  "bloodrager:primalist:primal-magic:1": {
    archetypeId: "bloodrager:primalist",
    name: "Primal Magic",
    level: 1,
    bucket: "subsystem",
    note: "uses-per-day swift-action reroll-or-mishap mechanic for a prepared spell — limited-use activated ability, no number; replaces arcane bond",
  },
  "bloodrager:primalist:primal-choices:4": {
    archetypeId: "bloodrager:primalist",
    name: "Primal Choices",
    level: 4,
    bucket: "subsystem",
    note: "swaps a bloodline power for two barbarian rage powers — a pick-list alteration to the deferred bloodline schedule (class note 5), no baseline number",
  },
  "bloodrager:primalist:enhance-primal-magic-event:5": {
    archetypeId: "bloodrager:primalist",
    name: "Enhance Primal Magic Event",
    level: 5,
    bucket: "subsystem",
    note: "adjusts a triggered primal-magic-event's CR by 1-2 — a resolution-procedure modifier on an activated ability's own mechanic, no baseline Change; replaces the 5th-level wizard bonus feat",
  },
  "bloodrager:primalist:primal-surge:10": {
    archetypeId: "bloodrager:primalist",
    name: "Primal Surge",
    level: 10,
    bucket: "subsystem",
    note: "grants a choice of two rolled primal-magic-event outcomes plus an SR-like resistance check against them — activated-ability resolution rules, no number; replaces the 10th-level wizard bonus feat",
  },

  // ── bloodrager:prowler-at-world-s-end ──
  "bloodrager:prowler-at-world-s-end:bloodline-destined:1": {
    archetypeId: "bloodrager:prowler-at-world-s-end",
    name: "Bloodline (Destined)",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Bloodline class-feature text nearly verbatim rather than describing an archetype-specific restriction (class note 8) — bloodline pick-list subsystem (class note 5) either way",
  },
  "bloodrager:prowler-at-world-s-end:spirit:1": {
    archetypeId: "bloodrager:prowler-at-world-s-end",
    name: "Spirit",
    level: 1,
    bucket: "subsystem",
    note: "grants the medium's spirit and spirit surge abilities (great-cat spirits only) — deferred medium-spirit subsystem, no number",
  },
  "bloodrager:prowler-at-world-s-end:bloodline-powers:4": {
    archetypeId: "bloodrager:prowler-at-world-s-end",
    name: "Bloodline Powers",
    level: 4,
    bucket: "subsystem",
    note: "reorders the bloodline-power acquisition schedule to a delayed cadence — a schedule change to the deferred bloodline machinery (class note 5), no number of its own",
  },
  "bloodrager:prowler-at-world-s-end:chosen-of-the-spirits:11": {
    archetypeId: "bloodrager:prowler-at-world-s-end",
    name: "Chosen of the Spirits",
    level: 11,
    bucket: "subsystem",
    note: "applies beast shape IV to self while bloodraging (great-cat forms only), in place of using greater/mighty bloodrage on a spell — polymorph-subsystem activated ability gated on a live bloodrage state, no number",
  },
  "bloodrager:prowler-at-world-s-end:shapeshifted-spellcasting:12": {
    archetypeId: "bloodrager:prowler-at-world-s-end",
    name: "Shapeshifted Spellcasting",
    level: 12,
    bucket: "subsystem",
    note: "a Natural Spell analog letting spells be cast while under Chosen of the Spirits — action-economy rule, no number",
  },

  // ── bloodrager:rageshaper ──
  "bloodrager:rageshaper:devastating-form:1": {
    archetypeId: "bloodrager:rageshaper",
    name: "Devastating Form",
    level: 1,
    bucket: "subsystem",
    note: "replaces bloodrage with a full-round-action size-increasing fury (rounds/day, Will-save dismissal, fatigue-on-exit, confusion-on-overrun) — a wholesale alternate-bloodrage mechanic this pipeline can't hook into (class note 1); its rounds-per-day/DC figures are stated 'per shifter level'/'his shifter level,' almost certainly a vendoring artifact (class note 7)",
  },
  "bloodrager:rageshaper:terrible-slam:1": {
    archetypeId: "bloodrager:rageshaper",
    name: "Terrible Slam",
    level: 1,
    bucket: "subsystem",
    note: "grants a slam natural attack (as \"the shifter claws class ability,\" class note 7) that ignores 5-20 points of an object's hardness — natural-attack target unmodeled (class note 3), and object hardness isn't tracked either",
  },
  "bloodrager:rageshaper:invulnerable-defenses:2": {
    archetypeId: "bloodrager:rageshaper",
    name: "Invulnerable Defenses",
    level: 2,
    bucket: "situational",
    note: "real +2 natural armor and DR 2/-, but only while in devastating form AND unencumbered AND (no armor or light/medium nonmetal armor) — the devastating-form half is a live activated-form state the static sheet can't check, same bar as the shifter class's own equivalent stance-gated entry",
  },
  "bloodrager:rageshaper:unrestrained-stride:3": {
    archetypeId: "bloodrager:rageshaper",
    name: "Unrestrained Stride",
    level: 3,
    bucket: "subsystem",
    note: "difficult-terrain immunity and entangled immunity while in devastating form — no Change shape for either, and gated on the same live devastating-form state",
  },
  "bloodrager:rageshaper:bestial-aspect:4": {
    archetypeId: "bloodrager:rageshaper",
    name: "Bestial Aspect",
    level: 4,
    bucket: "situational",
    note: "real +1 damage die / +10 ft. movement, but only on a natural attack or movement mode granted by a currently-active polymorph spell or bloodrage power — the live active-form state the engine can't check",
  },
  "bloodrager:rageshaper:furious-transformation:5": {
    archetypeId: "bloodrager:rageshaper",
    name: "Furious Transformation",
    level: 5,
    bucket: "subsystem",
    note: "extends a polymorph-subschool spell's duration (as Extend Spell) via a concentration check while bloodraging — spell-duration rule, no baseline Change; replaces improved uncanny dodge (no vendored changes)",
  },
  "bloodrager:rageshaper:terrible-leap:5": {
    archetypeId: "bloodrager:rageshaper",
    name: "Terrible Leap",
    level: 5,
    bucket: "subsystem",
    note: "a per-day, no-check jump move action while in devastating form — activated-ability action-economy rule, no number ('per shifter level' cadence, class note 7)",
  },

  // ── bloodrager:spelleater ──
  "bloodrager:spelleater:blood-of-life:2": {
    archetypeId: "bloodrager:spelleater",
    name: "Blood of Life",
    level: 2,
    bucket: "subsystem",
    note: "fast healing 1-6 while bloodraging, plus a rule reinterpreting bloodline DR increases as an 'effective DR 0' baseline — fast healing isn't a tracked mechanic, the DR rule changes nothing observable since base DR isn't modeled either (class note 5), and the healing is live-bloodrage-state gated besides; replaces uncanny dodge and damage reduction (no vendored changes to double-count against)",
  },
  "bloodrager:spelleater:spell-eating:5": {
    archetypeId: "bloodrager:spelleater",
    name: "Spell Eating",
    level: 5,
    bucket: "subsystem",
    note: "swift-action healing (1d8/spell level) by consuming an unused spell slot — resource-spend activated ability, no baseline number; replaces improved uncanny dodge (no vendored changes)",
  },

  // ── bloodrager:steelblood ──
  "bloodrager:steelblood:indomitable-stance:1": {
    archetypeId: "bloodrager:steelblood",
    name: "Indomitable Stance",
    level: 1,
    bucket: "numeric",
    note: "the +1 combat maneuver checks, +1 CMD vs. overrun, and +1 AC vs. charge clauses are all flat and unconditional, now expressible via Change.maneuverCategories/Change.acCategories (extracted below); Reflex-vs-trample and attack/damage-vs-charging-creatures have no matching save category or target and stay prose; replaces fast movement (unpaired, class note 2)",
  },
  "bloodrager:steelblood:weapon-and-armor-proficiency:1": {
    archetypeId: "bloodrager:steelblood",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "grants heavy-armor proficiency and waives arcane spell failure for bloodrager spells cast in heavy armor — proficiency/ASF rules, neither a Change target",
  },
  "bloodrager:steelblood:armored-swiftness:2": {
    archetypeId: "bloodrager:steelblood",
    name: "Armored Swiftness",
    level: 2,
    bucket: "situational",
    note: "real +5 ft. land speed in medium/heavy armor, but capped 'to a maximum of his unencumbered speed' — compute.ts applies the RAW medium/heavy-armor speed-table reduction AFTER landSpeed Changes are summed (a single unconditional Math.min step with no hook for this archetype), so a flat landSpeed Change here would just get clamped back down by that later step instead of restoring the archetype's intended speed; replaces uncanny dodge (no vendored changes)",
  },
  "bloodrager:steelblood:armor-training:5": {
    archetypeId: "bloodrager:steelblood",
    name: "Armor Training",
    level: 5,
    bucket: "numeric",
    note: "literal reflavor of the fighter Armor Training mDexA/acpA mechanism on a 5th/9th/13th/17th cadence (vs. fighter's 3rd/7th/11th/15th) — explicitly stacks with the fighter class feature of the same name, so no double-count concern; replaces improved uncanny dodge (no vendored changes)",
  },
  "bloodrager:steelblood:blood-deflection:7": {
    archetypeId: "bloodrager:steelblood",
    name: "Blood Deflection",
    level: 7,
    bucket: "subsystem",
    note: "immediate-action deflection AC bonus (equal to a sacrificed spell slot's level, even retroactively converting a hit to a miss) — a per-use, player-sized resource-spend ability, not a baseline Change; replaces damage reduction (no vendored changes)",
  },

  // ── bloodrager:symbol-striker ──
  "bloodrager:symbol-striker:rune-training:1": {
    archetypeId: "bloodrager:symbol-striker",
    name: "Rune Training",
    level: 1,
    bucket: "subsystem",
    note: "read magic at will and comprehend languages 1/day, wired via the spell-like-abilities route; the arcane mark/erase spell-list additions stay unmodeled (spells-known grant, not an SLA)",
  },
  "bloodrager:symbol-striker:weapon-rune:6": {
    archetypeId: "bloodrager:symbol-striker",
    name: "Weapon Rune",
    level: 6,
    bucket: "subsystem",
    note: "stores a touch-range spell in a wielded weapon to deliver on a later hit (uses/day scaling 1/2/3 at 6th/12th/18th) — activated-ability resource mechanic, no number",
  },
  "bloodrager:symbol-striker:rune-trap:9": {
    archetypeId: "bloodrager:symbol-striker",
    name: "Rune Trap",
    level: 9,
    bucket: "subsystem",
    note: "places a damage-dealing trap rune (1d6 + 1 per 2 levels, uses/day = 3 + Cha mod) — the trap's damage to trespassers, not the bloodrager's own stat, and an activated resource besides",
  },

  // ── bloodrager:untouchable-rager ──
  "bloodrager:untouchable-rager:bloodline:1": {
    archetypeId: "bloodrager:untouchable-rager",
    name: "Bloodline",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Bloodline class-feature text nearly verbatim (class note 8) — bloodline pick-list subsystem (class note 5) either way",
  },
  "bloodrager:untouchable-rager:raging-resistance:4": {
    archetypeId: "bloodrager:untouchable-rager",
    name: "Raging Resistance",
    level: 4,
    bucket: "subsystem",
    note: "spell resistance (8 + level, scaling +1 at 7th/10th/13th/16th) while bloodraging — spellResist is a Change target, but the live bloodrage-state gate disqualifies it (class note 1); replaces spells, blood casting, eschew materials, and bloodline spells",
  },
  "bloodrager:untouchable-rager:raging-resistance:7": {
    archetypeId: "bloodrager:untouchable-rager",
    name: "Raging Resistance",
    level: 7,
    bucket: "subsystem",
    note: "a second archetype-feature row with description text byte-identical to the 4th-level entry above — a vendoring duplicate (class note 8), not guessed at; same live-bloodrage-state disqualification either way",
  },

  // ── bloodrager:urban-bloodrager ──
  "bloodrager:urban-bloodrager:controlled-bloodrage:1": {
    archetypeId: "bloodrager:urban-bloodrager",
    name: "Controlled Bloodrage",
    level: 1,
    bucket: "subsystem",
    note: "replaces bloodrage's fixed Str/Con/Will/AC package with a player-allocated morale bonus and no Will bonus/AC penalty — rewrites the hand-authored BLOODRAGE_BUFF wholesale, which this Change-only-additive pipeline has no hook to do (class note 1)",
  },
  "bloodrager:urban-bloodrager:weapon-and-armor-proficiency:1": {
    archetypeId: "bloodrager:urban-bloodrager",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "drops shield proficiency (medium armor proficiency otherwise unchanged) — proficiency rule, no Change",
  },
  "bloodrager:urban-bloodrager:restrained-magic:3": {
    archetypeId: "bloodrager:urban-bloodrager",
    name: "Restrained Magic",
    level: 3,
    bucket: "subsystem",
    note: "grants a +2 save bonus vs. the bloodrager's own spells to OTHER targeted/area creatures — ally/bystander-facing, no self number; replaces blood sanctuary (no vendored changes)",
  },
  "bloodrager:urban-bloodrager:adopted-magic:7": {
    archetypeId: "bloodrager:urban-bloodrager",
    name: "Adopted Magic",
    level: 7,
    bucket: "subsystem",
    note: "adds bard/magus spells to the bloodrager spell list and spells known, scaling every 3 levels from 10th — spells known/spell list isn't a Change target (class note 6); replaces damage reduction (no vendored changes)",
  },
};

/**
 * ── BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────
 *
 * Machine-extracted mechanical effects for bloodrager archetype class
 * features (the prose→Change extraction pipeline, bloodrager slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * Only 3 of bloodrager's 61 features cleared the `numeric` bar (see
 * `BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — bloodrager's kit is dominated by the deferred
 * bloodline pick-list machinery, spells-known/spell-list edits, live
 * bloodrage-state conditions, an unmodeled natural-attack subsystem, and
 * resource-spend activated abilities, none of which clear the bar (see this
 * file's header facts).
 *
 * Confidence rubric (identical to fighter.ts's/samurai.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or one textually-present clause the engine can't express is
 *    dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Hag-Riven's "Scarred Hide" (Blood of the Beast) is a flat, wholly
  // unconditional natural armor bonus: +1 at 7th, +1 more at each of
  // 10th/13th/16th/19th, capped at +5. Unpaired — nothing to double-count.
  // "natural" is the established type for natural-armor Changes
  // (bloodlines.ts's `c("4", "nac", "natural")` idiom).
  "bloodrager:hag-riven:scarred-hide:7": {
    changes: [c("clamp(floor((@class.unlevel - 4) / 3), 0, 5)", "nac", "natural")],
    detail: (level) => `+${Math.min(5, Math.floor((level - 4) / 3))} natural armor`,
    confidence: "high",
    provenance:
      "She gains a +1 natural armor bonus to AC. At 10th, 13th, 16th, and 19th levels, this " +
      "bonus increases by 1.",
  },

  // Steelblood's "Indomitable Stance" packs five clauses into one sentence
  // pair. Three are flat and unconditional: "+1 bonus on combat maneuver
  // checks", "+1 to CMD against overrun combat maneuvers" (maneuverCategories
  // now covers the CMD-scoped half), and "+1 to AC against charge attacks"
  // (acCategories covers this half too). The other two (Reflex vs. trample,
  // attack/damage vs. charging creatures) are narrowly scoped to specific
  // save/attack shapes the vocabulary has no matching category or target
  // for, and stay prose. Dropping two of five clauses is why this stays
  // "medium" rather than "high".
  "bloodrager:steelblood:indomitable-stance:1": {
    changes: [
      c("1", "cmb"),
      { formula: "1", target: "cmd", type: "untyped", maneuverCategories: ["overrun"] },
      { formula: "1", target: "ac", type: "untyped", acCategories: ["charge"] },
    ],
    detail: () =>
      "+1 combat maneuver checks, +1 CMD vs. overrun, +1 AC vs. charge attacks (Reflex vs. " +
      "trample and atk/dmg vs. charging creatures not modeled)",
    confidence: "medium",
    provenance:
      "At 1st level, a steelblood gains a +1 bonus on combat maneuver checks, to CMD against " +
      "overrun combat maneuvers, and on Reflex saving throws against trample attacks. He also " +
      "gains a +1 bonus to his AC against charge attacks and on attack and damage rolls " +
      "against charging creatures. This ability replaces fast movement.",
  },

  // Steelblood's "Armor Training" (Blood of the Beast) is a literal reflavor
  // of the fighter's own Armor Training mDexA/acpA mechanism (see the
  // vendored "Armor Training" class feature: `clamp(floor((@class.unlevel +
  // 1) / 4), 0, 4)`) on a shifted cadence — 5th/9th/13th/17th instead of
  // 3rd/7th/11th/15th — reaching the same +4/-4 cap four levels later. The
  // text explicitly says it stacks with the fighter feature of the same
  // name, so untyped-vs-untyped summation is correct RAW, not a bug.
  "bloodrager:steelblood:armor-training:5": {
    changes: [
      c("clamp(floor((@class.unlevel - 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel - 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level - 1) / 4))} max Dex / -ACP (armor)`,
    confidence: "high",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a maximum of " +
      "0) and increases the maximum Dexterity bonus allowed by his armor by 1. Every 4 levels " +
      "thereafter (9th, 13th, and 17th), these bonuses increase by 1, to a maximum 4-point " +
      "reduction of the armor check penalty and a +4 increase of the maximum Dexterity bonus.",
  },
};
