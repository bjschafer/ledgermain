/**
 * Unchained Monk's slice of the pipeline (2026-08-08), covering all 69
 * vendored `monkUnchained:*` archetype features across 14 archetypes. Per the
 * per-class file convention (`./index.ts`'s doc comment), this file owns BOTH
 * of this class's pipeline artifacts —
 * `MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working
 * on a different class never has a reason to touch this file; only
 * `index.ts` (the aggregator, out of scope for this wave) needs one new
 * import + one new spread per class.
 *
 * ── Overlap with chained monk's prose (verified, not assumed) ─────────────
 *
 * Before reading a single feature, this pass diffed all 69
 * `monkUnchained:<archetype>:<feature>:<level>` descriptions against the
 * corresponding `monk:<archetype>:<feature>:<level>` id (normalizing one
 * vendored slug typo, `disciple-of-wholness` vs. `disciple-of-wholeness`) —
 * same method the unchained-barbarian wave (`./barbarianUnchained.ts`) used
 * against chained barbarian. Result: 66 of 69 are byte-identical (same
 * `name`/`level`/full HTML `description`); the vendored data stamps one prose
 * source under both class tags for archetypes that work with either chassis.
 * The 3 exceptions are all in Disciple of Wholeness (`greater-hone-body:11`,
 * `healing-ki:4`, `hone-soul:13`) and are genuinely unchained-specific rules
 * text (references to "the ki power gained at 12th/14th level" and "the
 * wholeness of body ki power" instead of chained monk's class-feature
 * language) — the classification judgment is identical either way (all three
 * are ki-spend/resource-gated abilities with no baseline number), so the
 * wording difference has zero effect on this pass's buckets.
 *
 * `./monk.ts` (chained monk's own file, wave 2) only classified 60 of the 328
 * features now vendored under `monk:*` (13 archetypes, before a later
 * archetype-data-source repoint expanded monk's own slice) — see that file's
 * header. Of this class's 14 archetypes, only 6 (black-asp is a partial
 * exception — see below; brazen-disciple, disciple-of-wholeness,
 * invested-regent, sage-counselor, scaled-fist, soul-shepherd) fall inside
 * that audited 13-archetype set, and this pass PORTED `./monk.ts`'s own
 * judgment for every shared id in those 6 (re-verified against the identical
 * text pulled above, not blind-copied) rather than re-deriving from scratch.
 * The remaining 8 archetypes (black-asp, elemental-monk, lifting-hand,
 * monk-of-the-mantis, perfect-scholar, serpent-fire-adept, softstrike-monk,
 * windstep-master) — plus a handful of ids inside the 6 "shared" archetypes
 * that `./monk.ts` itself never classified (Invested Regent's `investiture:1`
 * and `vested-power:2`, Scaled Fist's `draconic-mettle:4`, Soul Shepherd's
 * `otherworldly-resilience:2` — all outside `./monk.ts`'s original 60-feature
 * scope) — were read and classified fresh from the vendored prose for this
 * pass. `elemental-monk`'s own four features are also textually identical to
 * chained monk's separately-named `harrow-warden` archetype (same four
 * ability names: Elemental Strike, Genie Style, Elemental Precision, Planar
 * Guide) — a second content-reuse pattern, cross-checked but not required
 * since `elemental-monk` itself needed a fresh read anyway.
 *
 * Three real numeric findings resulted, none carried over from `./monk.ts`
 * (which found zero for monk's overlapping archetypes) because none of the
 * three sit in ids `./monk.ts` actually classified:
 *
 * 1. **Perfect Scholar's "Lore"** (`lore:4`) is a flat, unconditional
 *    Knowledge bonus scaling with monk level — the same `skill.knowledge`
 *    fan-out-alias idiom `archetype-effects.ts`'s own Bardic Knowledge entry
 *    and `psychic-disciplines.ts`/`shaman-spirits.ts` already establish. The
 *    "can attempt Knowledge checks untrained" half has no matching target
 *    (class-skill/trained-only exemptions aren't Change-shaped) and is
 *    dropped.
 * 2. **Scaled Fist's "Draconic Mettle"** (`draconic-mettle:4`) is a flat +2
 *    on saves against fear, paralysis, and sleep — a `Change.saveCategories`
 *    case (`allSavingThrows` + `saveCategories`, the idiom
 *    `class-feature-effects.ts`'s Unchained Heart and `./slayer.ts`'s Pureblade
 *    already use). `paralysis` has no `SAVE_CATEGORIES` entry in
 *    `save-categories.ts` (only `fear`/`sleep`/etc. are modeled, both children
 *    of `mind`) — that third of the three named effect types is dropped,
 *    flagged in `detail`, same posture as every other partial-condition entry
 *    in this pipeline.
 * 3. **Soul Shepherd's "Otherworldly Resilience"** (`otherworldly-resilience:2`)
 *    is a flat, wholly unconditional DR/adamantine plus cold and electricity
 *    resistance, scaling once at 9th level — no activation, no resource
 *    spend, nothing to drop. `dr.adamantine`/`eres.cold`/`eres.electricity`
 *    are established qualified targets (`bloodlines.ts`/
 *    `bloodrager-bloodlines.ts` use the identical strings extensively).
 *
 * ── This class's own trap, applied ─────────────────────────────────────────
 *
 * **Softstrike Monk's "Nonlethal Strikes"** (`nonlethal-strikes:1`), bucketed
 * `blocked`: it shifts the EFFECTIVE monk level fed into the unarmed-strike
 * damage-die progression by +4 (nonlethal damage) or -4 (lethal damage,
 * minimum 1st). That progression is `tables.ts`'s hardcoded
 * `unarmedDamageDie(classLevel, size)`, called with the character's real monk
 * level and producing a SINGLE die size — there is no per-damage-type (lethal
 * vs. nonlethal) output to split, and no override hook for the level input
 * that wouldn't require touching `tables.ts`/`compute.ts` (out of scope for
 * this pipeline) and risk double-counting against the level the table already
 * reads directly. Recorded, not guessed at — the class brief's own standing
 * guidance for this class ("flurry/unarmed-damage progressions ride engine
 * hand tables... altering them is blocked") applies exactly here.
 *
 * Every other numeric-looking scaling number in this class's kit (Chakra
 * Mastery's/Invested Regent's/Vested Power's own new resource pools; Hellcat
 * Fury's crit-triggered bleed; every ki-spend activated ability) is either a
 * brand-new, entirely unmodeled resource this engine tracks nowhere (not a
 * vendored `uses.maxFormula` override, so no double-count risk either — just
 * nothing to hang a number on) or gated on a live combat/resource-spend event
 * this pipeline's bar already excludes — bucketed `subsystem`/`situational`
 * per the same rubric `./monk.ts`/`./magus.ts` established, with each entry's
 * own `note` explaining the specific reason.
 *
 * Ki powers and style strikes are modeled pick-lists elsewhere
 * (`monk-ki-powers.ts`, `monk-style-strikes.ts`); any feature here that
 * grants, swaps, or restricts a specific power/style is `subsystem` for that
 * reason alone, same as Magus Arcana in `./magus.ts`.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── monkUnchained:black-asp ──
  "monkUnchained:black-asp:black-asp-s-path:1": {
    archetypeId: "monkUnchained:black-asp",
    name: "Black Asp's Path",
    level: 1,
    bucket: "subsystem",
    note: "poison-handling immunity plus a bonus feat (Adder Strike) even without prerequisites — a feat/proficiency grant, no Change-shaped number (identical text to chained monk's brazen-disciple:black-asp-s-path:1, which `./monk.ts` classifies the same way)",
  },
  "monkUnchained:black-asp:forbidden-powers:4": {
    archetypeId: "monkUnchained:black-asp",
    name: "Forbidden Powers",
    level: 4,
    bucket: "subsystem",
    note: "choice of a forbidden ki power in place of a normal monk ki power — a pick-list swap (ki powers are modeled elsewhere as their own pick-list), no Change-shaped number",
  },

  // ── monkUnchained:brazen-disciple ──
  "monkUnchained:brazen-disciple:black-asp-s-path:1": {
    archetypeId: "monkUnchained:brazen-disciple",
    name: "Black Asp's Path",
    level: 1,
    bucket: "subsystem",
    note: "poison-handling immunity plus a bonus feat (Adder Strike) even without prerequisites — a feat/proficiency grant, no Change-shaped number",
  },
  "monkUnchained:brazen-disciple:confounding-koan:12": {
    archetypeId: "monkUnchained:brazen-disciple",
    name: "Confounding Koan",
    level: 12,
    bucket: "subsystem",
    note: "functions as confusion (language-dependent), costed in ki points rather than a day/week counter — cross-pool spend",
  },
  "monkUnchained:brazen-disciple:efreeti-s-guile:3": {
    archetypeId: "monkUnchained:brazen-disciple",
    name: "Efreeti's Guile",
    level: 3,
    bucket: "subsystem",
    note: "rebases Bluff/Disguise from Charisma onto Wisdom — an ability-score-basis swap, not an additive bonus; same posture as Scaled Fist's Draconic Might below (no Change-shaped target represents 'use a different ability score for this calculation')",
  },
  "monkUnchained:brazen-disciple:feinting-flurry:1": {
    archetypeId: "monkUnchained:brazen-disciple",
    name: "Feinting Flurry",
    level: 1,
    bucket: "subsystem",
    note: "lets a flurry attack be forgone for a Bluff-check feint that denies Dex to AC — an activated maneuver with no flat number of its own, only a state it imposes on an opponent",
  },
  "monkUnchained:brazen-disciple:forbidden-powers:4": {
    archetypeId: "monkUnchained:brazen-disciple",
    name: "Forbidden Powers",
    level: 4,
    bucket: "subsystem",
    note: "choice of a forbidden ki power in place of a named monk class ability at various levels — a pick-list swap mechanism, no Change-shaped number",
  },
  "monkUnchained:brazen-disciple:genie-apotheosis:20": {
    archetypeId: "monkUnchained:brazen-disciple",
    name: "Genie Apotheosis",
    level: 20,
    bucket: "subsystem",
    note: "capstone creature-type change and energy immunity/vulnerability stay no-Change (same posture as monk-of-the-seven-forms' Immortality capstone in `./monk.ts`); the 1/day limited wish is wired via the spell-like-abilities route",
  },

  // ── monkUnchained:disciple-of-wholness ──
  "monkUnchained:disciple-of-wholness:greater-hone-body:11": {
    archetypeId: "monkUnchained:disciple-of-wholness",
    name: "Greater Hone Body",
    level: 11,
    bucket: "subsystem",
    note: "conditional (while-undamaged) poison immunity plus an activated ki-spend immunity grant — no Change-shaped number; text differs slightly from chained monk's version (references 'the ki power gained at 12th level' instead of a class feature) but the classification is identical either way",
  },
  "monkUnchained:disciple-of-wholness:healing-ki:4": {
    archetypeId: "monkUnchained:disciple-of-wholness",
    name: "Healing Ki",
    level: 4,
    bucket: "subsystem",
    note: "activated ki-spend healing touch — resource-gated ability, no baseline number",
  },
  "monkUnchained:disciple-of-wholness:hone-body:5": {
    archetypeId: "monkUnchained:disciple-of-wholness",
    name: "Hone Body",
    level: 5,
    bucket: "subsystem",
    note: "conditional disease immunity (while undamaged) plus an activated ki-spend immunity grant — no Change-shaped number",
  },
  "monkUnchained:disciple-of-wholness:hone-soul:13": {
    archetypeId: "monkUnchained:disciple-of-wholness",
    name: "Hone Soul",
    level: 13,
    bucket: "subsystem",
    note: "activated ki-spend targeted dispel — resource-gated ability, no baseline number; text differs slightly from chained monk's version (references 'the ki power gained at 14th level') but the classification is identical either way",
  },

  // ── monkUnchained:elemental-monk ──
  "monkUnchained:elemental-monk:elemental-precision:10": {
    archetypeId: "monkUnchained:elemental-monk",
    name: "Elemental Precision",
    level: 10,
    bucket: "subsystem",
    note: "changes which damage reduction types unarmed strikes overcome — no Change target represents an attacker-side DR-bypass rule (identical text to chained monk's harrow-warden:elemental-precision:10)",
  },
  "monkUnchained:elemental-monk:elemental-strike:1": {
    archetypeId: "monkUnchained:elemental-monk",
    name: "Elemental Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Elemental Fist) even without prerequisites, plus a per-hit energy-type choice — a feat grant, no baseline number",
  },
  "monkUnchained:elemental-monk:genie-style:2": {
    archetypeId: "monkUnchained:elemental-monk",
    name: "Genie Style",
    level: 2,
    bucket: "subsystem",
    note: "grants access to a menu of genie-themed style feats by level — choice-list mechanism; the 18th-level Janni Style enlarge/reduce person grant is choice-gated (player's choice each activation) and constant only while that specific style feat is active, no Change-shaped number",
  },
  "monkUnchained:elemental-monk:planar-guide:14": {
    archetypeId: "monkUnchained:elemental-monk",
    name: "Planar Guide",
    level: 14,
    bucket: "subsystem",
    note: "activated ki-spend plane shift for a group — resource-gated ability, no baseline number",
  },

  // ── monkUnchained:invested-regent ──
  "monkUnchained:invested-regent:bonus-feat:1": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Bonus feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list, not its count/schedule — no Change-shaped number",
  },
  "monkUnchained:invested-regent:crucible-of-pain:3": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Crucible of Pain",
    level: 3,
    bucket: "subsystem",
    note: "DR scoped to nonlethal damage specifically — this engine's dr target reduces damage generically with no notion of 'only vs. nonlethal', so applying it via the generic dr target would incorrectly also reduce lethal damage; no safe Change-shaped target exists for this exact scoping",
  },
  "monkUnchained:invested-regent:hellcat-fury:1": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Hellcat Fury",
    level: 1,
    bucket: "situational",
    note: "real, precisely-scaling bleed damage (1d4 up to 1d12), but only triggers on a confirmed critical hit with a slashing unarmed strike — a specific combat event the static sheet can't condition on; also dice-based, which this app doesn't model as a flat number regardless",
  },
  "monkUnchained:invested-regent:hellcat-ki:4": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Hellcat Ki",
    level: 4,
    bucket: "subsystem",
    note: "Ki Pool (unchanged progression, rides the generic resource-pool pipeline for free) plus several activated, resource-gated senses/resistances layered on top — no additional baseline number",
  },
  "monkUnchained:invested-regent:investiture:1": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Investiture",
    level: 1,
    bucket: "subsystem",
    note: "grants a brand-new, entirely unmodeled investiture-point resource pool (size 1/2 monk level + Cha mod, not the class's Ki Pool) that can be spent for an activated, swift-action sacred save bonus — resource-gated activation, not an always-on number; not in `./monk.ts`'s original 60-feature scope",
  },
  "monkUnchained:invested-regent:torture-training:2": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Torture Training",
    level: 2,
    bucket: "subsystem",
    note: "grants a second saving throw against certain conditions — no Change-shaped target for 're-roll a failed save'",
  },
  "monkUnchained:invested-regent:vested-power:2": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Vested Power",
    level: 2,
    bucket: "subsystem",
    note: "lets a bonus-feat slot be spent on a vested power (a named pick-list) instead of a feat — a choice-menu swap, no Change-shaped number; not in `./monk.ts`'s original 60-feature scope",
  },
  "monkUnchained:invested-regent:weapon-and-armor-proficiency:1": {
    archetypeId: "monkUnchained:invested-regent",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change plus a flurry-of-blows weapon addition — no Change-shaped target",
  },

  // ── monkUnchained:lifting-hand ──
  "monkUnchained:lifting-hand:bonus-feat:1": {
    archetypeId: "monkUnchained:lifting-hand",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list (adds Whirling Hold/Dramatic Slam/Overhead Flip/Savage Leap), not its count/schedule — no Change-shaped number",
  },
  "monkUnchained:lifting-hand:counter-throw:12": {
    archetypeId: "monkUnchained:lifting-hand",
    name: "Counter-Throw",
    level: 12,
    bucket: "situational",
    note: "real +2 bonus on a grapple combat maneuver check, but only usable via a readied action triggered by an incoming attack — a specific action/trigger condition, and there is no generic per-maneuver CMB target regardless",
  },
  "monkUnchained:lifting-hand:joint-lock:10": {
    archetypeId: "monkUnchained:lifting-hand",
    name: "Joint Lock",
    level: 10,
    bucket: "subsystem",
    note: "imposes sickened/fatigued on a grappled FOE — not a bonus to the character's own sheet",
  },
  "monkUnchained:lifting-hand:savage-toss:1": {
    archetypeId: "monkUnchained:lifting-hand",
    name: "Savage Toss",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Savage Slam) plus a forced-movement throw distance scaled off a grapple check margin — feat grant plus a battlefield effect on the target, no number for the character's own sheet; no engine target for forced movement regardless",
  },

  // ── monkUnchained:monk-of-the-mantis ──
  "monkUnchained:monk-of-the-mantis:debilitating-blows:6": {
    archetypeId: "monkUnchained:monk-of-the-mantis",
    name: "Debilitating Blows",
    level: 6,
    bucket: "subsystem",
    note: "imposes entangled/exhausted conditions on a target already stunned by Stunning Fist, replacing several ki powers — imposes a state on a FOE, no Change-shaped number for the monk's own sheet",
  },
  "monkUnchained:monk-of-the-mantis:disabling-palm:15": {
    archetypeId: "monkUnchained:monk-of-the-mantis",
    name: "Disabling Palm",
    level: 15,
    bucket: "subsystem",
    note: "alters Quivering Palm's outcome (unconscious instead of dead) — no Change-shaped number",
  },
  "monkUnchained:monk-of-the-mantis:pressuring-strikes:2": {
    archetypeId: "monkUnchained:monk-of-the-mantis",
    name: "Pressuring Strikes",
    level: 2,
    bucket: "subsystem",
    note: "grants rogue-style sneak attack usable only during a flurry, replacing several bonus feats — dice-based extra damage isn't modelable as a flat Change (no dice roller, per this project's posture), same posture as monk-of-the-seven-forms' Elemental Fist in `./monk.ts`",
  },

  // ── monkUnchained:perfect-scholar ──
  "monkUnchained:perfect-scholar:eye-of-the-sun-and-moon:13": {
    archetypeId: "monkUnchained:perfect-scholar",
    name: "Eye of the Sun and Moon",
    level: 13,
    bucket: "subsystem",
    note: "grants the ability to read/write every language encountered — a binary language grant, no Change-shaped number",
  },
  "monkUnchained:perfect-scholar:learn-from-failure:4": {
    archetypeId: "monkUnchained:perfect-scholar",
    name: "Learn from Failure",
    level: 4,
    bucket: "situational",
    note: "real, scaling +1 insight bonus, but only against the SAME TARGET the scholar already missed an attack or Research check against, within the next 24 hours — a reactive, per-target condition the static sheet can't track",
  },
  "monkUnchained:perfect-scholar:lore:4": {
    archetypeId: "monkUnchained:perfect-scholar",
    name: "Lore",
    level: 4,
    bucket: "numeric",
    note: "flat, unconditional bonus equal to half monk level on all Knowledge checks — the same skill.knowledge fan-out-alias idiom Bardic Knowledge (archetype-effects.ts) and psychic-disciplines.ts already use; the 'can attempt untrained' half has no Change-shaped target and is dropped",
  },
  "monkUnchained:perfect-scholar:walk-with-the-master:20": {
    archetypeId: "monkUnchained:perfect-scholar",
    name: "Walk with the Master",
    level: 20,
    bucket: "subsystem",
    note: "capstone ki-spend group-less planar travel plus a creature-type change — activated ability, no baseline number",
  },

  // ── monkUnchained:sage-counselor ──
  "monkUnchained:sage-counselor:awaken-divinity:1": {
    archetypeId: "monkUnchained:sage-counselor",
    name: "Awaken Divinity",
    level: 1,
    bucket: "subsystem",
    note: "grants OTHER creatures a temporary ki point usable for a scaling AC/speed/ability-penalty/reroll/perfect-self buff — a complex, resource-gated, other-creature-targeting ability with no baseline number for the Ouat herself",
  },
  "monkUnchained:sage-counselor:cunning-fist:1": {
    archetypeId: "monkUnchained:sage-counselor",
    name: "Cunning Fist",
    level: 1,
    bucket: "subsystem",
    note: "bonus feats (Combat Expertise, Improved Feint, Greater Feint) even without prerequisites — feat grants, no Change-shaped number",
  },
  "monkUnchained:sage-counselor:deceptive-ki:4": {
    archetypeId: "monkUnchained:sage-counselor",
    name: "Deceptive Ki",
    level: 4,
    bucket: "subsystem",
    note: "activated ki-spend +4 insight bonus on a single Bluff check — resource-gated, not a passive number",
  },
  "monkUnchained:sage-counselor:feinting-flurry:4": {
    archetypeId: "monkUnchained:sage-counselor",
    name: "Feinting Flurry",
    level: 4,
    bucket: "subsystem",
    note: "trades the ki-spend flurry-extra-attack option for a ki-spend feint-during-flurry option — an action-economy swap, no flat number",
  },
  "monkUnchained:sage-counselor:know-the-unseen-disciples:7": {
    archetypeId: "monkUnchained:sage-counselor",
    name: "Know the Unseen Disciples",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend see-invisibility — resource-gated ability, no baseline number",
  },
  "monkUnchained:sage-counselor:spurn-tradition:1": {
    archetypeId: "monkUnchained:sage-counselor",
    name: "Spurn Tradition",
    level: 1,
    bucket: "subsystem",
    note: "halves the effectiveness of other creatures' anti-dwarf abilities against her and grants a weapon proficiency — no Change-shaped target represents 'halve an opponent's own class feature'",
  },

  // ── monkUnchained:scaled-fist ──
  "monkUnchained:scaled-fist:bonus-feat:1": {
    archetypeId: "monkUnchained:scaled-fist",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list (adds Dragon Style/Intimidating Prowess/etc.), not its count/schedule — no Change-shaped number",
  },
  "monkUnchained:scaled-fist:draconic-breath:12": {
    archetypeId: "monkUnchained:scaled-fist",
    name: "Draconic Breath",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend breath-weapon attack — activated, resource-gated, and dice-based damage isn't modeled as a flat Change either way",
  },
  "monkUnchained:scaled-fist:draconic-fury:3": {
    archetypeId: "monkUnchained:scaled-fist",
    name: "Draconic Fury",
    level: 3,
    bucket: "subsystem",
    note: "grants a specific ki power (Elemental Fury) — ki powers are a modeled pick-list elsewhere, no Change-shaped number of its own",
  },
  "monkUnchained:scaled-fist:draconic-mettle:4": {
    archetypeId: "monkUnchained:scaled-fist",
    name: "Draconic Mettle",
    level: 4,
    bucket: "numeric",
    note: "flat, unconditional +2 save bonus vs. fear, paralysis, and sleep effects — fear/sleep are real Change.saveCategories entries (save-categories.ts); paralysis has no SAVE_CATEGORIES entry at all and is dropped, flagged in detail. Not in `./monk.ts`'s original 60-feature scope",
  },
  "monkUnchained:scaled-fist:draconic-might:1": {
    archetypeId: "monkUnchained:scaled-fist",
    name: "Draconic Might",
    level: 1,
    bucket: "subsystem",
    note: "rebases several Wisdom-keyed calculations (Stunning Fist DC, etc.) onto Charisma — an ability-score-basis swap, not an additive bonus; no Change-shaped target represents 'use a different ability score for this calculation' (`./monk.ts` classifies the chained-monk version, identical text, the same way)",
  },

  // ── monkUnchained:serpent-fire-adept ──
  "monkUnchained:serpent-fire-adept:chakra-adept:6": {
    archetypeId: "monkUnchained:serpent-fire-adept",
    name: "Chakra Adept",
    level: 6,
    bucket: "subsystem",
    note: "bonus feat (Chakra Adept) plus an extension to the unmodeled chakra subsystem's maintenance rules — feat grant, no baseline number",
  },
  "monkUnchained:serpent-fire-adept:chakra-expertise:2": {
    archetypeId: "monkUnchained:serpent-fire-adept",
    name: "Chakra Expertise",
    level: 2,
    bucket: "subsystem",
    note: "a scaling Fort/Will save bonus, but scoped to checks 'attempted to maintain awakened chakras' — a check type from the entirely unmodeled chakra subsystem, not a real save-vs-effect category (no SAVE_CATEGORIES entry fits)",
  },
  "monkUnchained:serpent-fire-adept:chakra-mastery:10": {
    archetypeId: "monkUnchained:serpent-fire-adept",
    name: "Chakra Mastery",
    level: 10,
    bucket: "subsystem",
    note: "bonus feat plus an increase to the size of the serpent-fire ki pool — a brand-new resource this engine never tracks in the first place (introduced via the Chakra Initiate bonus feat, not a vendored uses.maxFormula), so nothing to double-count against, but also nothing to hang a size number on",
  },
  "monkUnchained:serpent-fire-adept:chakra-training:1": {
    archetypeId: "monkUnchained:serpent-fire-adept",
    name: "Chakra Training",
    level: 1,
    bucket: "subsystem",
    note: "bonus feats (Chakra Initiate, Psychic Sensitivity) that introduce the unmodeled chakra/serpent-fire-ki subsystem — feat grants, no baseline number",
  },
  "monkUnchained:serpent-fire-adept:light-spirit:4": {
    archetypeId: "monkUnchained:serpent-fire-adept",
    name: "Light Spirit",
    level: 4,
    bucket: "situational",
    note: "real fly speed grant, but conditional on having the sacral chakra open (part of the unmodeled chakra subsystem) and lasting only a limited duration once closed — a live subsystem-state condition, not a persistent one the formula DSL can check",
  },
  "monkUnchained:serpent-fire-adept:linked-chakras:8": {
    archetypeId: "monkUnchained:serpent-fire-adept",
    name: "Linked Chakras",
    level: 8,
    bucket: "subsystem",
    note: "lets multiple chakras be opened at once, with daily-use limits — an activation mechanic within the unmodeled chakra subsystem, no baseline number",
  },

  // ── monkUnchained:softstrike-monk ──
  "monkUnchained:softstrike-monk:feather-touch:1": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Feather Touch",
    level: 1,
    bucket: "subsystem",
    note: "removes an attack-roll penalty this engine never modeled (nonlethal damage with a lethal weapon), plus a Stunning Fist usage exception — nothing to reduce, no Change-shaped number",
  },
  "monkUnchained:softstrike-monk:incapacitating-palm:15": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Incapacitating Palm",
    level: 15,
    bucket: "subsystem",
    note: "alters Quivering Palm's outcome (unconscious instead of dead) — no Change-shaped number",
  },
  "monkUnchained:softstrike-monk:life-giving-blows:6": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Life-Giving Blows",
    level: 6,
    bucket: "subsystem",
    note: "activated ki-spend ability that strips an undead/construct foe's nonlethal-damage immunity — resource-gated, imposes a state on a foe, no number for the monk's own sheet",
  },
  "monkUnchained:softstrike-monk:nonlethal-strikes:1": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Nonlethal Strikes",
    level: 1,
    bucket: "blocked",
    note: "shifts the EFFECTIVE monk level fed into the unarmed-strike damage-die progression by +4 (nonlethal) or -4 (lethal, minimum 1st) — that progression is tables.ts's hardcoded unarmedDamageDie(classLevel, size), which produces one die size from the real monk level with no per-damage-type split and no override hook; backfilling this would require touching tables.ts/compute.ts (out of scope) and risks double-counting the level the table already reads directly. Recorded, not guessed at",
  },
  "monkUnchained:softstrike-monk:resilient-body:19": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Resilient Body",
    level: 19,
    bucket: "subsystem",
    note: "converts precision damage taken into nonlethal damage — this engine has no notion of 'precision damage taken by the character' to convert, no Change-shaped target",
  },
  "monkUnchained:softstrike-monk:tenet-of-life:1": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Tenet of Life",
    level: 1,
    bucket: "subsystem",
    note: "a roleplay/alignment restriction with a shaken-condition and ki-loss penalty for breaking it — no Change-shaped number to grant",
  },
  "monkUnchained:softstrike-monk:weapon-and-armor-proficiency:1": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monkUnchained:softstrike-monk:wholeness-of-body-and-spirit:7": {
    archetypeId: "monkUnchained:softstrike-monk",
    name: "Wholeness of Body and Spirit",
    level: 7,
    bucket: "subsystem",
    note: "extends Wholeness of Body to other creatures and nonlethal-only healing, plus a conditional sanctuary-like pact effect on an unconscious foe — no Change-shaped number",
  },

  // ── monkUnchained:soul-shepherd ──
  "monkUnchained:soul-shepherd:calming-strike:1": {
    archetypeId: "monkUnchained:soul-shepherd",
    name: "Calming Strike",
    level: 1,
    bucket: "subsystem",
    note: "immediate-action calm-effect vs. incorporeal undead/haunts — an activated ability imposing a state on a FOE, no baseline number",
  },
  "monkUnchained:soul-shepherd:mortification:4": {
    archetypeId: "monkUnchained:soul-shepherd",
    name: "Mortification",
    level: 4,
    bucket: "subsystem",
    note: "a large menu of choosable ki-gated powers (mortifications), most activated and several targeting other creatures — deferred, no schema field or picker exists for this choice-bearing menu, same posture `./monk.ts` gives the identical text under Soul Shepherd's own archetype id",
  },
  "monkUnchained:soul-shepherd:otherworldly-resilience:2": {
    archetypeId: "monkUnchained:soul-shepherd",
    name: "Otherworldly Resilience",
    level: 2,
    bucket: "numeric",
    note: "flat, wholly unconditional DR/adamantine plus cold and electricity resistance, scaling once at 9th level — no activation, no resource spend, nothing dropped. dr.adamantine/eres.cold/eres.electricity are established qualified targets. Not in `./monk.ts`'s original 60-feature scope",
  },
  "monkUnchained:soul-shepherd:spirit-sense:12": {
    archetypeId: "monkUnchained:soul-shepherd",
    name: "Spirit Sense",
    level: 12,
    bucket: "subsystem",
    note: "activated ki-spend living/undead detection — resource-gated ability, no baseline number",
  },
  "monkUnchained:soul-shepherd:yamaraj-s-judgment:16": {
    archetypeId: "monkUnchained:soul-shepherd",
    name: "Yamaraj's Judgment",
    level: 16,
    bucket: "subsystem",
    note: "activated ki-spend targeted dispel to free an imprisoned soul — resource-gated ability, no baseline number",
  },

  // ── monkUnchained:windstep-master ──
  "monkUnchained:windstep-master:hurricane-punch:1": {
    archetypeId: "monkUnchained:windstep-master",
    name: "Hurricane Punch",
    level: 1,
    bucket: "situational",
    note: "real, scaling bull-rush target-size cap and push-distance bonus, but only while using the granted Hurricane Punch feat to bull rush — a per-maneuver condition, and no engine target represents a bull-rush size cap or push distance regardless",
  },
  "monkUnchained:windstep-master:swift-ki:4": {
    archetypeId: "monkUnchained:windstep-master",
    name: "Swift Ki",
    level: 4,
    bucket: "subsystem",
    note: "activated ki-spend extensions to the Wind Step ability (sustain, +20 ft. distance) — resource-gated, not a passive number",
  },
  "monkUnchained:windstep-master:weapon-and-armor-proficiency:1": {
    archetypeId: "monkUnchained:windstep-master",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monkUnchained:windstep-master:wind-step:4": {
    archetypeId: "monkUnchained:windstep-master",
    name: "Wind Step",
    level: 4,
    bucket: "subsystem",
    note: "activated move-action air walk whose distance is keyed off the monk's own Fast Movement bonus (a value this engine already computes elsewhere, not a new number) — an activated ability, no passive Change",
  },
};

/**
 * ── MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────
 *
 * Machine-extracted mechanical effects for unchained monk archetype class
 * features (the prose→Change extraction pipeline, monkUnchained slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 3 of this class's 69
 * features cleared the `numeric` bar (see
 * `MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — this class's kit leans heavily on ki-spend activated
 * abilities, bonus-feat LIST changes, and entirely unmodeled sub-resource
 * pools (investiture, chakras/serpent-fire ki), none of which are
 * Change-shaped.
 *
 * Confidence rubric (identical to `./magus.ts`'s):
 *  - "high": a literal, fully general (no scope restriction) reading of a
 *    single, clearly-worded sentence, using an already-established target
 *    idiom.
 *  - "medium": a real-but-partial condition/qualifier from the prose is
 *    dropped because this engine has no way to check it or no matching
 *    vocabulary entry, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Perfect Scholar's "Lore" grants a flat, unconditional bonus equal to half
  // monk level on Knowledge checks. `skill.knowledge` is a fan-out alias
  // (tables.ts) expanding to every Knowledge sub-skill — the same idiom
  // Bardic Knowledge (archetype-effects.ts) and psychic-disciplines.ts'
  // Knowledge discipline power already use. The "can attempt Knowledge
  // checks untrained" half has no Change-shaped target and is dropped.
  "monkUnchained:perfect-scholar:lore:4": {
    changes: [c("floor(@class.unlevel / 2)", "skill.knowledge")],
    detail: (level) =>
      `+${Math.floor(level / 2)} all Knowledge checks (untrained access not modeled)`,
    confidence: "high",
    provenance:
      "At 4th level, the perfect scholar gains a bonus equal to 1/2 his monk level on Knowledge " +
      "checks and can attempt Knowledge checks untrained.",
  },

  // Scaled Fist's "Draconic Mettle" grants a flat, unconditional +2 on saves
  // vs. fear, paralysis, and sleep effects — no level scaling, no activation.
  // `fear` and `sleep` are real Change.saveCategories entries
  // (save-categories.ts); `paralysis` has no SAVE_CATEGORIES entry at all
  // (only the modeled subset of PF1's save-category vocabulary exists there)
  // and is dropped, flagged in `detail`.
  "monkUnchained:scaled-fist:draconic-mettle:4": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["fear", "sleep"],
      },
    ],
    detail: () => "+2 vs. fear/sleep saves (paralysis not modeled)",
    confidence: "medium",
    provenance:
      "At 4th level, a scaled fist gains a +2 bonus on saving throws attempted against all fear, " +
      "paralysis, and sleep effects.",
  },

  // Soul Shepherd's "Otherworldly Resilience" is a flat, wholly unconditional
  // DR/adamantine plus cold and electricity resistance, scaling once at 9th
  // level — no activation, no resource spend, no condition to drop.
  // dr.adamantine/eres.cold/eres.electricity are established qualified
  // targets already used extensively by bloodlines.ts/bloodrager-bloodlines.ts.
  "monkUnchained:soul-shepherd:otherworldly-resilience:2": {
    changes: [
      c("if(gte(@class.unlevel, 9), 5, 2)", "dr.adamantine"),
      c("if(gte(@class.unlevel, 9), 10, 5)", "eres.cold"),
      c("if(gte(@class.unlevel, 9), 10, 5)", "eres.electricity"),
    ],
    detail: (level) =>
      level >= 9
        ? "DR 5/adamantine; cold/electricity resistance 10"
        : "DR 2/adamantine; cold/electricity resistance 5",
    confidence: "high",
    provenance:
      "At 2nd level, a soul shepherd gains DR 2/adamantine, cold resistance 5, and electricity " +
      "resistance 5. At 9th level, this improves to DR 5/adamantine, cold resistance 10, and " +
      "electricity resistance 10.",
  },
};
