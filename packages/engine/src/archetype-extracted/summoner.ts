/**
 * Summoner's slice of the pipeline. All 88 vendored archetype features across
 * summoner's 23 archetypes (2 of which — Wild Caller (ARG) and Wild Caller
 * (HotW) — contribute zero unique features to `archetype-features.json`, so
 * only 21 archetypes actually appear as keys below) are read in full and
 * bucketed as `numeric` / `situational` / `subsystem` / `blocked`, per the
 * per-class file convention (`index.ts`'s doc comment).
 *
 * ── Summoner-specific mechanical facts this pass relies on ────────────────
 *
 * 1. **The eidolon** is modeled as its own derived creature in this engine
 *    (`eidolon.ts`/`eidolon-unchained.ts`: subtypes, base forms, evolutions,
 *    its own stat block) — but there are NO archetype hooks into that model.
 *    Nothing wires an archetype feature's prose into a change to the
 *    eidolon's subtype, base form, evolution pool, or evolutions. Every
 *    feature that only modifies the EIDOLON (its stats, form, evolutions, or
 *    abilities) is therefore `subsystem`, never `numeric` — there is no
 *    applied target on the summoner's own sheet for any of it, and the
 *    eidolon side of the pipeline doesn't exist to receive it either.
 * 2. **Life Link, Shield Ally (and Greater Shield Ally), and Bond Senses**
 *    (the base summoner class features these archetypes constantly reflavor)
 *    are companion-interaction features — their bonuses only apply while the
 *    eidolon is present, in reach, and not grappled/helpless/paralyzed/
 *    stunned/unconscious, and Bond Senses/Life Link are pure
 *    information/HP-sacrifice mechanics with no flat modifier at all. Every
 *    reflavor of these three (Brood Link, Brood Bond, Fused Link, Shielded
 *    Meld, Greater Shielded Meld, etc.) is `situational`: a real shield/
 *    circumstance bonus exists in the text, but it's conditioned on eidolon
 *    presence/state the static sheet can't track, same posture as an
 *    ally-only or stance-gated bonus elsewhere in this pipeline.
 * 3. **Summon monster / summon nature's ally spell-like-ability changes**
 *    (new creature lists, templates applied to summoned creatures, casting
 *    it as a different spell, planar binding upgrades) are `subsystem` — no
 *    schema field or Change target represents "what a summon monster SLA
 *    currently summons," so there is nothing to attach a number to even when
 *    the archetype states one (e.g., a flat bonus applied to the SUMMONED
 *    CREATURE, not the summoner, per the ally-only rule below).
 * 4. **Ally/companion-only bonuses never count**, per the pipeline's general
 *    rule: a bonus that lands on the eidolon, a summoned creature, or "an
 *    ally within the eidolon's reach" is not a number on the SUMMONER's own
 *    sheet, regardless of how flat or unconditional it reads. Only a number
 *    that lands on the summoner's own character sheet clears the `numeric`
 *    bar.
 * 5. **Spells-known-count changes** (bonus spells known at fixed levels,
 *    minus one spell known per level for spell levels 1-6) have no Change
 *    target — `targets.ts` has nothing for "spells known" — so every
 *    spell-list/spells-known alteration in this table is `subsystem`.
 *
 * Given these five facts, summoner's kit — built almost entirely around the
 * eidolon, summon monster, and the three companion-interaction class
 * features above — produces two `numeric` entries across all 88 features:
 * Twinned Summoner's Teamwork Feat (an unconditional bonus-feat count) and
 * Storm Caller's Storm's Wings, whose 10th-level clause moves the flight
 * evolution from the eidolon's build onto the summoner's OWN sheet — the one
 * exception to fact 1 above, since at that point it's no longer an eidolon
 * stat. This was verified by reading each of the 88 features individually,
 * not inferred from a class-level heuristic; see each entry's `note`.
 *
 * ── Vendored-data oddities found (worth flagging, no numeric impact) ───────
 *
 * - `naturalist:natural-focus:1`'s ability, and two of its sibling features
 *   (`reflect-on-the-land:12`, `tree-talker:8`), use "occultist level" and a
 *   "generic mental focus" resource that summoner has no other reference to
 *   anywhere in this archetype's kit — apparent copy-paste bleed from an
 *   unrelated occultist source text (`blocked`, see its entry).
 * - `pyroclast`'s three features are near-verbatim reprints of `morphic-savant`'s
 *   text (down to "a morphic savant gains..." — the archetype name was never
 *   swapped), and `spirit-summoner`'s two features are near-verbatim reprints of
 *   `shadow-caller`'s ("a shadow caller's eidolon is..."), from unrelated
 *   sourcebooks. No numeric content is affected (both pairs are entirely
 *   `subsystem`), but flagged since it means `pyroclast`/`spirit-summoner`'s
 *   own actual published abilities aren't represented in this vendored slice
 *   at all.
 * - `summoner:unwavering-conduit:eidolon-of-law:0` and
 *   `:unwavering-monsters:0` carry a `:0` id suffix but a real `level: 3` —
 *   an id/level mismatch in the vendored key generation. This file's
 *   classification `level` fields use the real `level`, matching
 *   `ref.archetypeFeatures`, not the id's embedded digit.
 * - `twinned-summoner:teamwork-feat:4` and `:teamwork-feats:12` carry
 *   byte-identical descriptions (both grant the same 4th/12th-level bonus
 *   teamwork feat in one sentence) — the known duplicate-id vendoring trap.
 *   The earlier (`:4`) is extracted; the later is `blocked` as a duplicate.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── summoner:blood-god-disciple ──
  "summoner:blood-god-disciple:avatar-gambit:7": {
    archetypeId: "summoner:blood-god-disciple",
    name: "Avatar Gambit",
    level: 7,
    bucket: "subsystem",
    note: "grants a barbarian-style rage state (for half summoner level rounds) triggered by dismissing the eidolon — an activated whole-buff-state grant into another class's subsystem, not a flat number; replaces the summon monster IV SLA (class note 3)",
  },
  "summoner:blood-god-disciple:blood-feast:1": {
    archetypeId: "summoner:blood-god-disciple",
    name: "Blood Feast",
    level: 1,
    bucket: "subsystem",
    note: "lets the eidolon manifest a temporary evolution onto the summoner after eating a fallen foe — modifies evolutions, a resource-gated (X/day) eidolon-subsystem mechanic with no engine hook (class note 1)",
  },
  "summoner:blood-god-disciple:bloody-gift:3": {
    archetypeId: "summoner:blood-god-disciple",
    name: "Bloody Gift",
    level: 3,
    bucket: "subsystem",
    note: "extends blood feast's manifested evolution to a touched ally — ally-only evolution grant, doubly out of scope (class notes 1 and 4); replaces the summon monster II SLA",
  },
  "summoner:blood-god-disciple:rage-power:11": {
    archetypeId: "summoner:blood-god-disciple",
    name: "Rage Power",
    level: 11,
    bucket: "subsystem",
    note: "grants a barbarian rage power selection usable while raging — a feat/power pick-list this engine doesn't model, tied to the same deferred rage subsystem as Avatar Gambit; replaces the summon monster VI and VIII SLAs",
  },

  // ── summoner:blood-summoner ──
  "summoner:blood-summoner:blood-offering:4": {
    archetypeId: "summoner:blood-summoner",
    name: "Blood Offering",
    level: 4,
    bucket: "situational",
    note: "real +4 circumstance bonus on Diplomacy/Charisma checks, but scoped to bargaining specifically with the one evil outsider just offered blood, for 10 minutes, once per outsider per day — a specific-interaction-and-duration condition the static sheet can't check; the +2 ability-score bonus half lands on the outsider (ally-only, class note 4); replaces shield ally",
  },
  "summoner:blood-summoner:blood-possession:16": {
    archetypeId: "summoner:blood-summoner",
    name: "Blood Possession",
    level: 16,
    bucket: "subsystem",
    note: "lets the eidolon possess a corporeal creature's body — an unrelated activated ability, no number; replaces merge forms",
  },
  "summoner:blood-summoner:blood-travel:8": {
    archetypeId: "summoner:blood-summoner",
    name: "Blood Travel",
    level: 8,
    bucket: "subsystem",
    note: "alters maker's call so the eidolon travels via blood/a corpse instead of teleporting to the summoner's side — resource-gated activated-ability variant, no flat number; replaces transposition",
  },
  "summoner:blood-summoner:fiendish-calling:10": {
    archetypeId: "summoner:blood-summoner",
    name: "Fiendish Calling",
    level: 10,
    bucket: "subsystem",
    note: "lets the summon monster SLA double as planar binding against evil outsiders — summon-monster-mechanic change (class note 3); replaces greater shield ally",
  },

  // ── summoner:broodmaster ──
  "summoner:broodmaster:bond-senses:2": {
    archetypeId: "summoner:broodmaster",
    name: "Bond senses",
    level: 2,
    bucket: "situational",
    note: "restates the eidolon-brood split (see eidolon-brood:2 below, subsystem) but closes with the actual Bond Senses restriction — sharing only one brood-eidolon's senses at a time; Bond Senses itself is a companion-interaction information mechanic with no flat modifier (class note 2)",
  },
  "summoner:broodmaster:brood-bond:14": {
    archetypeId: "summoner:broodmaster",
    name: "Brood Bond",
    level: 14,
    bucket: "situational",
    note: "Life Bond restricted to transferring damage to one brood-eidolon at a time — companion-interaction mechanic, same posture as Life Link/Shield Ally reflavors (class note 2); replaces life bond",
  },
  "summoner:broodmaster:brood-link:2": {
    archetypeId: "summoner:broodmaster",
    name: "Brood Link",
    level: 2,
    bucket: "situational",
    note: "Life Link restricted to sacrificing HP for one brood-eidolon at a time — companion-interaction mechanic (class note 2); replaces life link",
  },
  "summoner:broodmaster:eidolon-brood:2": {
    archetypeId: "summoner:broodmaster",
    name: "Eidolon Brood",
    level: 2,
    bucket: "subsystem",
    note: "replaces the single eidolon with two smaller eidolons whose base stats/evolution pool are split between them — a wholesale eidolon-subsystem restructure with no engine hook (class note 1); replaces the summoner's normal eidolon ability",
  },
  "summoner:broodmaster:greater-shield-ally:12": {
    archetypeId: "summoner:broodmaster",
    name: "Greater shield ally",
    level: 12,
    bucket: "situational",
    note: "Greater Shield Ally reflavored across the brood (+2/+4 shield AC and circumstance saves to whichever ally is in an eidolon's reach) — companion-interaction, presence/state-gated (class note 2)",
  },
  "summoner:broodmaster:larger-brood:8": {
    archetypeId: "summoner:broodmaster",
    name: "Larger Brood",
    level: 8,
    bucket: "subsystem",
    note: "spends evolution points to upsize brood-eidolons (Large/Huge) — eidolon evolution-pool mechanic with no engine hook (class note 1)",
  },
  "summoner:broodmaster:maker-s-call:6": {
    archetypeId: "summoner:broodmaster",
    name: "Maker's call",
    level: 6,
    bucket: "subsystem",
    note: "Maker's Call restricted to calling one brood-eidolon at a time — activated teleport ability, resource-gated (X/day), no flat number",
  },
  "summoner:broodmaster:merge-forms:16": {
    archetypeId: "summoner:broodmaster",
    name: "Merge forms",
    level: 16,
    bucket: "subsystem",
    note: "Merge Forms restricted to one brood-eidolon at a time — activated fusion ability, no flat number; replaces merge forms",
  },
  "summoner:broodmaster:shield-ally:4": {
    archetypeId: "summoner:broodmaster",
    name: "Shield ally",
    level: 4,
    bucket: "situational",
    note: "base Shield Ally reflavored across the brood — companion-interaction, presence/state-gated (class note 2)",
  },
  "summoner:broodmaster:transposition:8": {
    archetypeId: "summoner:broodmaster",
    name: "Transposition",
    level: 8,
    bucket: "subsystem",
    note: "Transposition restricted to swapping with one brood-eidolon at a time — activated teleport ability, no flat number",
  },

  // ── summoner:counter-summoner ──
  "summoner:counter-summoner:brood-bond:1": {
    archetypeId: "summoner:counter-summoner",
    name: "Brood Bond",
    level: 1,
    bucket: "situational",
    note: "vendored name/text mismatch — the description is actually Counter-Summon (Su), not Brood Bond. clCheck.dispel exists, but this +5 only applies against summon monster/summon nature's ally spells specifically, and only a limited number of times per day (3 + Cha mod) — a spell-subset scope and a resource-spend clCheck.dispel doesn't carry; replaces summon monster",
  },
  "summoner:counter-summoner:detect-summons:2": {
    archetypeId: "summoner:counter-summoner",
    name: "Detect Summons",
    level: 2,
    bucket: "subsystem",
    note: "swift-action detection + Spellcraft identification of a summoned creature's conjuring spell — an unrelated information ability, no flat number; replaces bond senses",
  },
  "summoner:counter-summoner:improved-weaken-summons:18": {
    archetypeId: "summoner:counter-summoner",
    name: "Improved Weaken Summons",
    level: 18,
    bucket: "situational",
    note: "raises weaken summons's penalty to -4, but that penalty lands on a targeted ENEMY summoned creature via an activated, save-negated, once-per-target-per-day ability — not the summoner's own sheet; replaces greater aspect",
  },
  "summoner:counter-summoner:weaken-summons:10": {
    archetypeId: "summoner:counter-summoner",
    name: "Weaken Summons",
    level: 10,
    bucket: "situational",
    note: "-2 penalty to a targeted summoned creature's attack/damage/AC, activated (standard action), save-negated (DC formula not a Change target), once per target per day — an enemy-scoped debuff, not the summoner's own number; replaces aspect",
  },

  // ── summoner:evolutionist ──
  "summoner:evolutionist:evolve-base-form:8": {
    archetypeId: "summoner:evolutionist",
    name: "Evolve Base Form",
    level: 8,
    bucket: "subsystem",
    note: "lets the eidolon's base form change on level-up — eidolon-subsystem change with no engine hook (class note 1); replaces transposition",
  },
  "summoner:evolutionist:mutate-eidolon:6": {
    archetypeId: "summoner:evolutionist",
    name: "Mutate Eidolon",
    level: 6,
    bucket: "subsystem",
    note: "lets the eidolon's evolutions be re-chosen via a 24-hour ritual — eidolon-subsystem change (class note 1); replaces maker's call",
  },
  "summoner:evolutionist:transmogrify:12": {
    archetypeId: "summoner:evolutionist",
    name: "Transmogrify",
    level: 12,
    bucket: "subsystem",
    note: "transmogrify, wired via the spell-like-abilities route; replaces greater shield ally",
  },

  // ── summoner:first-worlder ──
  "summoner:first-worlder:eidolon:1": {
    archetypeId: "summoner:first-worlder",
    name: "Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "changes the eidolon's type/Hit Die/BAB progression/good saves/class skills/senses — a base-eidolon-stat-block alteration with no engine hook (class note 1)",
  },
  "summoner:first-worlder:fey-summons:3": {
    archetypeId: "summoner:first-worlder",
    name: "Fey Summons",
    level: 3,
    bucket: "subsystem",
    note: "adds specific creatures to the summon nature's ally lists — summon-list mechanic (class note 3)",
  },
  "summoner:first-worlder:summon-nature-s-ally:1": {
    archetypeId: "summoner:first-worlder",
    name: "Summon Nature's Ally",
    level: 1,
    bucket: "subsystem",
    note: "swaps the summon monster SLA for the summon nature's ally SLA — summon-mechanic change (class note 3); replaces the summon monster ability",
  },

  // ── summoner:god-caller ──
  "summoner:god-caller:divine-awareness:10": {
    archetypeId: "summoner:god-caller",
    name: "Divine Awareness",
    level: 10,
    bucket: "subsystem",
    note: "grants the EIDOLON a clairaudience/clairvoyance SLA (X/day) — ally-only ability grant, no summoner number (class note 4)",
  },
  "summoner:god-caller:divine-might:18": {
    archetypeId: "summoner:god-caller",
    name: "Divine Might",
    level: 18,
    bucket: "subsystem",
    note: "the EIDOLON's attacks count as epic for DR/mythic purposes — ally-only qualitative effect, no Change target exists for it anyway",
  },
  "summoner:god-caller:divine-word:8": {
    archetypeId: "summoner:god-caller",
    name: "Divine Word",
    level: 8,
    bucket: "subsystem",
    note: "roll-twice-take-better on Diplomacy/Intimidate (when the eidolon aids another) and a social-influence-step bonus — neither is a flat modifier a Change can express, and both are gated on the eidolon's action",
  },
  "summoner:god-caller:guidance:1": {
    archetypeId: "summoner:god-caller",
    name: "Guidance",
    level: 1,
    bucket: "subsystem",
    note: "grants the EIDOLON an at-will guidance SLA (with a range-based HP penalty on the eidolon itself) — ally-only, no summoner number",
  },
  "summoner:god-caller:overwhelming-presence:20": {
    archetypeId: "summoner:god-caller",
    name: "Overwhelming Presence",
    level: 20,
    bucket: "subsystem",
    note: "grants the EIDOLON an overwhelming presence SLA (3/day, DC keyed to the eidolon's own Cha) — ally-only ability grant, no summoner number",
  },

  // ── summoner:leshy-caller ──
  "summoner:leshy-caller:leshy-eidolon:1": {
    archetypeId: "summoner:leshy-caller",
    name: "Leshy Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "changes the eidolon's type/base forms to plant-themed statblocks — base-eidolon-stat-block alteration with no engine hook (class note 1)",
  },
  "summoner:leshy-caller:summon-nature-s-ally:1": {
    archetypeId: "summoner:leshy-caller",
    name: "Summon Nature's Ally",
    level: 1,
    bucket: "subsystem",
    note: "swaps summon monster SLA progression for summon nature's ally, with specific leshy creatures substituted in — summon-mechanic change (class note 3)",
  },

  // ── summoner:master-summoner ──
  "summoner:master-summoner:augment-summoning:2": {
    archetypeId: "summoner:master-summoner",
    name: "Augment Summoning",
    level: 2,
    bucket: "subsystem",
    note: "grants the specific named feat Augment Summoning outright, not an extra feat slot — bonusFeats only counts additional feat CHOICES, not a fixed feat grant (same posture as Kensai's Weapon Focus grant in magus.ts); replaces bond senses",
  },
  "summoner:master-summoner:lesser-eidolon:1": {
    archetypeId: "summoner:master-summoner",
    name: "Lesser Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "halves effective summoner level for all eidolon-derived statistics — an eidolon-computation change with no engine hook (class note 1); replaces the summoner's normal eidolon ability",
  },
  "summoner:master-summoner:summoning-mastery:1": {
    archetypeId: "summoner:master-summoner",
    name: "Summoning Mastery",
    level: 1,
    bucket: "subsystem",
    note: "alters the summon monster I SLA's uses/interaction with the eidolon being summoned — summon-mechanic change (class note 3); replaces the summon monster I ability and shield ally",
  },

  // ── summoner:morphic-savant ──
  "summoner:morphic-savant:chaos-magic:2": {
    archetypeId: "summoner:morphic-savant",
    name: "Chaos Magic",
    level: 2,
    bucket: "subsystem",
    note: "the -1 known per spell level (1-6) and the six fixed replacement spells known are both wired via the casting-economy tables",
  },
  "summoner:morphic-savant:eidolon-of-chaos:1": {
    archetypeId: "summoner:morphic-savant",
    name: "Eidolon of Chaos",
    level: 1,
    bucket: "subsystem",
    note: "restricts the eidolon's alignment/subtype and base-form choices, and reduces its evolution/skill points — eidolon-stat alteration with no engine hook (class note 1)",
  },
  "summoner:morphic-savant:morphic-monsters:2": {
    archetypeId: "summoner:morphic-savant",
    name: "Morphic Monsters",
    level: 2,
    bucket: "subsystem",
    note: "changes summoned creatures' alignment/template and duration, and grants them a free evolution — summon-mechanic change plus an ally-only bonus (class notes 3 and 4)",
  },

  // ── summoner:naturalist ──
  "summoner:naturalist:animal-focus:4": {
    archetypeId: "summoner:naturalist",
    name: "Animal Focus",
    level: 4,
    bucket: "subsystem",
    note: "applies a hunter's animal aspect to the EIDOLON — an ally-only grant from a deferred pick-list (hunter animal aspects aren't modeled); replaces shield ally and greater shield ally",
  },
  "summoner:naturalist:natural-focus:1": {
    archetypeId: "summoner:naturalist",
    name: "Natural Focus",
    level: 1,
    bucket: "blocked",
    note: "grants a 1/round resource-spend +1d6 (later 1d8/1d10) to a check/save — the granted amount is a dice term (evaluateFormula throws on dice, no flat number to extract) AND the spending resource ('generic mental focus') is never defined anywhere else in this archetype's kit, an apparent copy-paste bleed from an occultist source (this same archetype's later features reference 'occultist level', see reflect-on-the-land/tree-talker below) — no formula to safely build",
  },
  "summoner:naturalist:nature-s-call:1": {
    archetypeId: "summoner:naturalist",
    name: "Nature's Call",
    level: 1,
    bucket: "subsystem",
    note: "swaps summon monster I for summon nature's ally I, restricted to animal/magical beast/vermin types — summon-mechanic change (class note 3); replaces summon monster I",
  },
  "summoner:naturalist:reflect-on-the-land:12": {
    archetypeId: "summoner:naturalist",
    name: "Reflect on the Land",
    level: 12,
    bucket: "subsystem",
    note: "commune with nature, wired via the spell-like-abilities route (defaults CL to the summoner's own class level; the vendored text's 'occultist level' phrase is a data oddity, see natural-focus above)",
  },
  "summoner:naturalist:second-animal-focus:10": {
    archetypeId: "summoner:naturalist",
    name: "Second Animal Focus",
    level: 10,
    bucket: "subsystem",
    note: "lets animal focus apply two aspects to the EIDOLON at once — ally-only, same deferred pick-list as animal-focus:4; replaces the aspect ability",
  },
  "summoner:naturalist:shared-focus:10": {
    archetypeId: "summoner:naturalist",
    name: "Shared Focus",
    level: 10,
    bucket: "subsystem",
    note: "the naturalist also gains whichever hunter's animal aspect was applied to the eidolon — the value is entirely dependent on the deferred animal-aspect pick-list (class note 1's sibling problem, no known effect to attach a formula to); replaces life bond",
  },
  "summoner:naturalist:third-animal-focus:18": {
    archetypeId: "summoner:naturalist",
    name: "Third Animal Focus",
    level: 18,
    bucket: "subsystem",
    note: "lets animal focus apply three aspects to the EIDOLON at once — same deferred pick-list as animal-focus:4; replaces greater aspect",
  },
  "summoner:naturalist:tree-talker:8": {
    archetypeId: "summoner:naturalist",
    name: "Tree Talker",
    level: 8,
    bucket: "subsystem",
    note: "speak with plants, wired via the spell-like-abilities route (defaults CL to the summoner's own class level; the vendored text's 'occultist level' phrase is a data oddity, see natural-focus's note); the message-relay rider isn't modeled",
  },

  // ── summoner:pyroclast ──
  "summoner:pyroclast:chaos-magic:1": {
    archetypeId: "summoner:pyroclast",
    name: "Chaos Magic",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of morphic-savant's Chaos Magic (never renamed) — same spells-known count change, no Change target exists (class note 5)",
  },
  "summoner:pyroclast:eidolon-of-chaos:1": {
    archetypeId: "summoner:pyroclast",
    name: "Eidolon of Chaos",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of morphic-savant's Eidolon of Chaos — eidolon alignment/base-form/stat alteration, no engine hook (class note 1)",
  },
  "summoner:pyroclast:morphic-monsters:1": {
    archetypeId: "summoner:pyroclast",
    name: "Morphic Monsters",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of morphic-savant's Morphic Monsters — summon-mechanic and ally-only evolution grant, same as morphic-savant's version (class notes 3 and 4)",
  },

  // ── summoner:shadow-caller ──
  "summoner:shadow-caller:shadow-eidolon:1": {
    archetypeId: "summoner:shadow-caller",
    name: "Shadow Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "reflavors the eidolon as a detached shadow (removes the shared summoner-rune identifier) — eidolon-subsystem reflavor, no number",
  },
  "summoner:shadow-caller:shadow-summoning:1": {
    archetypeId: "summoner:shadow-caller",
    name: "Shadow Summoning",
    level: 1,
    bucket: "subsystem",
    note: "swaps the summon monster creature lists for shadow-themed alternatives and applies the shadow creature template — summon-mechanic change (class note 3)",
  },

  // ── summoner:shaitan-binder ──
  "summoner:shaitan-binder:earth-glide:10": {
    archetypeId: "summoner:shaitan-binder",
    name: "Earth Glide",
    level: 10,
    bucket: "subsystem",
    note: "grants the EIDOLON earth glide, conditioned on it already having the burrow evolution — ally-only and evolution-dependent (class notes 1 and 4); replaces aspect",
  },
  "summoner:shaitan-binder:fused-eidolon:1": {
    archetypeId: "summoner:shaitan-binder",
    name: "Fused Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "+2 ability-score bonus while the EIDOLON is in biped form — ally-only bonus (class note 4)",
  },
  "summoner:shaitan-binder:noble-eidolon:20": {
    archetypeId: "summoner:shaitan-binder",
    name: "Noble Eidolon",
    level: 20,
    bucket: "subsystem",
    note: "grants the EIDOLON a 1/day limited wish SLA — ally-only ability grant, no summoner number; replaces twin eidolon",
  },
  "summoner:shaitan-binder:stone-curse:18": {
    archetypeId: "summoner:shaitan-binder",
    name: "Stone Curse",
    level: 18,
    bucket: "subsystem",
    note: "adds a 4-point evolution option to the eidolon's evolution list — eidolon-evolution mechanic with no engine hook (class note 1); replaces greater aspect",
  },

  // ── summoner:spirit-summoner ──
  "summoner:spirit-summoner:shadow-eidolon:1": {
    archetypeId: "summoner:spirit-summoner",
    name: "Shadow Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of shadow-caller's Shadow Eidolon (from an unrelated sourcebook, never renamed) — eidolon-subsystem reflavor, no number",
  },
  "summoner:spirit-summoner:shadow-summoning:1": {
    archetypeId: "summoner:spirit-summoner",
    name: "Shadow Summoning",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of shadow-caller's Shadow Summoning — summon-mechanic change (class note 3)",
  },

  // ── summoner:storm-caller ──
  "summoner:storm-caller:electrical-polarity:4": {
    archetypeId: "summoner:storm-caller",
    name: "Electrical Polarity",
    level: 4,
    bucket: "subsystem",
    note: "an activated, resource-spent lightning-line attack (dice damage, not a flat number) plus a 12th-level clause granting the summoner the eidolon's OWN resistance/immunity (electricity) evolution while within 30 ft — that value is whatever evolution the eidolon happens to have purchased, an unknowable pick-list input on top of the proximity condition",
  },
  "summoner:storm-caller:storm-s-wings:6": {
    archetypeId: "summoner:storm-caller",
    name: "Storm's Wings",
    level: 6,
    bucket: "numeric",
    note: "at 10th level the storm caller automatically and unconditionally gains a fly speed equal to base land speed, average maneuverability, on his OWN sheet — the flight evolution's own numbers, unambiguous even though this feature's text only cross-references it (Pathfinder Unchained 37), extracted below. The 6th-level clause (optionally buying the evolution early by spending 2 of the eidolon's evolution points) stays unmodeled: it's a resource spend against the eidolon's own pool, not an unconditional grant",
  },
  "summoner:storm-caller:stormy-eidolon:1": {
    archetypeId: "summoner:storm-caller",
    name: "Stormy Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "requires the eidolon to have an electricity-resistant/immune subtype/evolution or become nauseated — an eidolon-build restriction with no engine hook (class note 1)",
  },
  "summoner:storm-caller:summon-storm-s-fury:1": {
    archetypeId: "summoner:storm-caller",
    name: "Summon Storm's Fury",
    level: 1,
    bucket: "subsystem",
    note: "restricts summon monster to storm-themed creatures and adds a call-lightning-style dice-damage ability — summon-mechanic change plus dice-based damage, neither a flat modifier",
  },

  // ── summoner:story-summoner ──
  "summoner:story-summoner:evolve-base-form:8": {
    archetypeId: "summoner:story-summoner",
    name: "Evolve Base Form",
    level: 8,
    bucket: "subsystem",
    note: "lets the eidolon's base form change on level-up — eidolon-subsystem change with no engine hook (class note 1); replaces transposition",
  },
  "summoner:story-summoner:storykin-eidolon:0": {
    archetypeId: "summoner:story-summoner",
    name: "Storykin Eidolon",
    level: 0,
    bucket: "subsystem",
    note: "draws a harrow card to temporarily change the EIDOLON's alignment and grant it a +4 enhancement bonus — ally-only, resource-gated (X/day) grant (class note 4)",
  },
  "summoner:story-summoner:summon-arcana:2": {
    archetypeId: "summoner:story-summoner",
    name: "Summon Arcana",
    level: 2,
    bucket: "subsystem",
    note: "applies an alignment-based template to a summoned creature based on a drawn harrow card — summon-mechanic change (class note 3); replaces bond senses",
  },

  // ── summoner:synthesist ──
  "summoner:synthesist:fused-eidolon:1": {
    archetypeId: "summoner:synthesist",
    name: "Fused Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "matches the eidolon's alignment to the summoner and grants an oracle curse selection — a deferred pick-list (oracle curses aren't modeled for summoner) plus an eidolon-alignment tie, no flat number",
  },
  "summoner:synthesist:fused-link:1": {
    archetypeId: "summoner:synthesist",
    name: "Fused Link",
    level: 1,
    bucket: "situational",
    note: "Life Link reflavor (sacrifice HP to prevent the eidolon's temp-HP loss) — companion-interaction mechanic, no flat modifier (class note 2); replaces life link",
  },
  "summoner:synthesist:greater-shielded-meld:12": {
    archetypeId: "summoner:synthesist",
    name: "Greater Shielded Meld",
    level: 12,
    bucket: "situational",
    note: "Greater Shield Ally reflavored to trigger only while fused with the eidolon — a real +4/+4 bonus, but scoped to an activated fusion stance (class note 2); replaces greater shield ally",
  },
  "summoner:synthesist:maker-s-jump:6": {
    archetypeId: "summoner:synthesist",
    name: "Maker's Jump",
    level: 6,
    bucket: "subsystem",
    note: "grants dimension door as an SLA while fused, resource-gated (X/day) — activated teleport ability, no flat number; replaces maker's call and transposition",
  },
  "summoner:synthesist:shielded-meld:4": {
    archetypeId: "summoner:synthesist",
    name: "Shielded Meld",
    level: 4,
    bucket: "situational",
    note: "Shield Ally reflavored to trigger only while fused with the eidolon — a real +2/+2 bonus, but scoped to an activated fusion stance (class note 2); replaces shield ally",
  },
  "summoner:synthesist:split-forms:16": {
    archetypeId: "summoner:synthesist",
    name: "Split Forms",
    level: 16,
    bucket: "subsystem",
    note: "lets the fused synthesist/eidolon split back into two creatures for a limited duration — an unrelated activated ability, no flat number; replaces merge forms",
  },

  // ── summoner:twinned-summoner ──
  "summoner:twinned-summoner:evolve-base-form:8": {
    archetypeId: "summoner:twinned-summoner",
    name: "Evolve Base Form",
    level: 8,
    bucket: "subsystem",
    note: "vendored text still says 'story summoner' (copy-paste bleed from story-summoner's identical ability, never renamed) — lets the eidolon's base form change on level-up, eidolon-subsystem change (class note 1); replaces transposition",
  },
  "summoner:twinned-summoner:storykin-eidolon:1": {
    archetypeId: "summoner:twinned-summoner",
    name: "Storykin Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "vendored text still says 'story summoner' (copy-paste bleed, never renamed) — draws a harrow card to temporarily alter the EIDOLON's alignment and grant it a +4 enhancement bonus, ally-only (class note 4)",
  },
  "summoner:twinned-summoner:summon-arcana:2": {
    archetypeId: "summoner:twinned-summoner",
    name: "Summon Arcana",
    level: 2,
    bucket: "subsystem",
    note: "vendored text still says 'story summoner' (copy-paste bleed, never renamed) — applies an alignment template to a summoned creature via a drawn harrow card, summon-mechanic change (class note 3); replaces bond senses",
  },
  "summoner:twinned-summoner:teamwork-feat:4": {
    archetypeId: "summoner:twinned-summoner",
    name: "Teamwork Feat",
    level: 4,
    bucket: "numeric",
    note: "unconditional bonus-feat count, gated only on the twinned summoner's own level (4th, then 12th) — a clean bonusFeats grant; the teamwork-feat-only restriction and the grant-to-eidolon clause aren't modeled, only the count",
  },
  "summoner:twinned-summoner:teamwork-feats:12": {
    archetypeId: "summoner:twinned-summoner",
    name: "Teamwork Feats",
    level: 12,
    bucket: "blocked",
    note: "byte-identical vendored description to teamwork-feat:4 — a duplicate-id vendoring artifact reprinting the same 4th-and-12th-level grant in one sentence. teamwork-feat:4 is the canonical id and its extracted formula already counts both breakpoints (1 feat at 4th, 2 at 12th); this id carries no independent grant and stays blocked to avoid double-counting",
  },
  "summoner:twinned-summoner:twin-summoner:16": {
    archetypeId: "summoner:twinned-summoner",
    name: "Twin Summoner",
    level: 16,
    bucket: "subsystem",
    note: "transforms the EIDOLON to mirror the summoner's mental scores and cast the summoner's spells for a limited duration — ally-only, unrelated mechanic, no summoner number; replaces merge forms",
  },
  "summoner:twinned-summoner:twinned-eidolon:1": {
    archetypeId: "summoner:twinned-summoner",
    name: "Twinned Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "restricts the eidolon to the biped base form (and matching size) — eidolon-subsystem restriction with no engine hook (class note 1)",
  },
  "summoner:twinned-summoner:twinned-transposition:6": {
    archetypeId: "summoner:twinned-summoner",
    name: "Twinned Transposition",
    level: 6,
    bucket: "subsystem",
    note: "Transposition reflavor (swap locations with the eidolon via dimension door, later as a swift action), resource-gated (X/day) — activated teleport ability, no flat number; replaces maker's call",
  },

  // ── summoner:unwavering-conduit ──
  "summoner:unwavering-conduit:alignment:0": {
    archetypeId: "summoner:unwavering-conduit",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "pure build restriction ('Any lawful') — not even an ability, no Change",
  },
  "summoner:unwavering-conduit:eidolon-of-law:0": {
    archetypeId: "summoner:unwavering-conduit",
    name: "Eidolon of Law",
    level: 3,
    bucket: "subsystem",
    note: "restricts the eidolon's alignment/subtype and evolution choices, freezes its evolutions between level-ups, and grants the EIDOLON a scaling resistance bonus vs. three spell schools — all ally-only or eidolon-stat changes (class notes 1 and 4); the id carries a stale ':0' suffix, but the vendored `level` field (used here) is 3",
  },
  "summoner:unwavering-conduit:law-magic:0": {
    archetypeId: "summoner:unwavering-conduit",
    name: "Law Magic",
    level: 0,
    bucket: "subsystem",
    note: "the -1 known per spell level (1-6) and the six fixed replacement spells known are both wired via the casting-economy tables",
  },
  "summoner:unwavering-conduit:unwavering-monsters:0": {
    archetypeId: "summoner:unwavering-conduit",
    name: "Unwavering Monsters",
    level: 3,
    bucket: "subsystem",
    note: "fixes (rather than randomizes) the number of creatures summon monster produces and grants SUMMONED CREATURES a scaling resistance bonus vs. three spell schools — summon-mechanic change plus an ally-only bonus (class notes 3 and 4); the id carries a stale ':0' suffix, but the vendored `level` field (used here) is 3",
  },

  // ── summoner:wild-caller ──
  "summoner:wild-caller:eidolon-of-law:1": {
    archetypeId: "summoner:wild-caller",
    name: "Eidolon of Law",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of unwavering-conduit's Eidolon of Law (references 'the unwavering conduit', not renamed) — same eidolon-stat/ally-only changes (class notes 1 and 4)",
  },
  "summoner:wild-caller:law-magic:1": {
    archetypeId: "summoner:wild-caller",
    name: "Law Magic",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of unwavering-conduit's Law Magic — spells-known count change, no Change target exists (class note 5)",
  },
  "summoner:wild-caller:unwavering-monsters:1": {
    archetypeId: "summoner:wild-caller",
    name: "Unwavering Monsters",
    level: 1,
    bucket: "subsystem",
    note: "vendored text is a near-verbatim reprint of unwavering-conduit's Unwavering Monsters — summon-mechanic change plus an ally-only bonus (class notes 3 and 4)",
  },
};

/**
 * ── SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────────
 *
 * Machine-extracted mechanical effects for summoner archetype class features
 * (the prose→Change extraction pipeline, summoner slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 1 of summoner's 88
 * features cleared the `numeric` bar (see
 * `SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit) — summoner's kit is built almost entirely around the eidolon
 * (an unhooked derived-creature subsystem in this engine), summon monster
 * SLA changes, and the three companion-interaction class features
 * (Life Link, Shield Ally, Bond Senses), none of which land a number on the
 * summoner's own sheet (see this file's header doc comment).
 *
 * Confidence rubric (identical to magus.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose (an irregular schedule, a delayed onset, or combining two
 *    same-sentence level gates into one cumulative count).
 *  - "low": not used in this pass.
 */
export const SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Twinned Summoner's "Teamwork Feat" grants one bonus teamwork feat at 4th
  // level and a second at 12th, both stated in the same sentence — an
  // unpaired, additive bonusFeats grant (no baseline summoner bonus-feat
  // progression to swap out). The prerequisite restriction (must be a
  // teamwork feat) and the grant-to-eidolon clause aren't modeled, only the
  // cumulative count, same posture as magus's Iron-Ring Striker Bonus Feat
  // entry. teamwork-feats:12 carries a byte-identical description and is
  // recorded as a blocked duplicate rather than extracted a second time.
  "summoner:twinned-summoner:teamwork-feat:4": {
    changes: [
      c("if(gte(@class.unlevel, 4), 1, 0) + if(gte(@class.unlevel, 12), 1, 0)", "bonusFeats"),
    ],
    detail: (level) =>
      `${(level >= 4 ? 1 : 0) + (level >= 12 ? 1 : 0)} bonus teamwork feat(s) (restriction not modeled)`,
    confidence: "medium",
    provenance: "At 4th level and at 12th level, a twinned summoner gains a bonus teamwork feat.",
  },

  // Storm's Wings' 10th-level clause: "the storm caller automatically gains
  // the flight evolution without reducing the number of evolution points
  // available to the eidolon" — a `set`-operator flySpeed grant equal to
  // base land speed, average maneuverability, mirroring the flight
  // evolution's own definition (`eidolon.ts`'s "flight" evolution: `speed: {
  // mode: "fly", amount: "base" }`, "A fly speed equal to base speed
  // (average maneuverability)") since the archetype text itself only
  // cross-references the evolution by name rather than restating its
  // number. `if(gte(..., 10), ..., 0)` below 10th level, the same
  // threshold-gated `set` idiom `bloodrager-bloodlines.ts` uses for a
  // speed grant that only turns on at a specific level (e.g. its own
  // 12th-level swimSpeed entry) — average maneuverability has no Change
  // target in this engine (`targets.ts` carries no maneuverability slug),
  // so it stays a `detail()` reminder only. The 6th-level optional early
  // grant (spending 2 of the eidolon's own evolution points) isn't
  // modeled — see the classification entry's note.
  "summoner:storm-caller:storm-s-wings:6": {
    changes: [
      {
        formula: "if(gte(@classes.summoner.level, 10), @attributes.speed.land.total, 0)",
        target: "flySpeed",
        type: "base",
        operator: "set",
      },
    ],
    detail: (level) =>
      level >= 10
        ? "fly speed equal to base land speed (average maneuverability)"
        : "no automatic flight yet (10th level required for the free grant)",
    confidence: "medium",
    provenance:
      "At 10th level, the storm caller automatically gains the flight evolution without reducing the number of evolution points available to the eidolon.",
  },
};
