/**
 * Unchained Barbarian's slice of the pipeline (2026-08-08), covering the 41
 * vendored `barbarianUnchained` archetypes / 161 archetype features. Per the
 * per-class file convention (`./index.ts`'s doc comment), this file owns BOTH
 * of this class's pipeline artifacts —
 * `BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED` (the machine-extracted
 * `Change`-shaped effects table) and
 * `BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION` (the full
 * per-feature audit) — so a future wave working on a different class never
 * has a reason to touch this file; only `index.ts` (the aggregator, out of
 * scope for this wave) needs one new import + one new spread per class.
 *
 * Load-bearing discovery this pass made before reading a single feature: the
 * vendored `archetype-features.json` slice for `barbarianUnchained:*` is
 * BYTE-IDENTICAL, entry for entry (same `name`, `level`, and full HTML
 * `description`), to the sibling `barbarian:*` (chained) slice `./barbarian.ts`
 * already covers — verified programmatically across all 161 shared slugs, zero
 * diffs. The data pipeline vendors one prose source and stamps it under both
 * class tags; Unchained's real mechanical differences (a single continuous
 * Rage progression instead of Rage/Greater Rage/Mighty Rage as separate
 * ability-bonus tiers, temp HP instead of some of the old bonuses) live in the
 * `Rage (Unchained)` BUFF (`buff-effects.ts`'s `RAGE_UNCHAINED_TEMP_HP`) and
 * base class features, not in this archetype-feature prose. So every
 * classification judgment call `./barbarian.ts` made — which clause is
 * unconditional, which target exists, which composition is a double-count
 * trap — transfers directly; this file's bucket assignments are NOT a
 * re-derivation from scratch, they are `./barbarian.ts`'s own reading of the
 * identical text, re-applied under this class's own id namespace (and
 * `pairedBaseFeatureUuid`/`archetypeId` values, which DO differ per class,
 * were re-verified independently — see `barbarianDamageReductionReplaced`'s
 * own `AMBIGUOUS_DR_REPLACEMENTS` map in `archetypes.ts`, which already treats
 * `barbarianUnchained:invulnerable-rager` as its own confirmed unpaired swap,
 * separate from the chained entry).
 *
 * This pass deliberately did NOT rubber-stamp every `./barbarian.ts` bucket,
 * for two reasons:
 *
 * 1. **Hand-verified exclusions don't carry over.** `archetype-effects.ts`
 *    (the hand-verified table `resolveArchetypeFeatureEffect` always prefers)
 *    has ZERO `barbarianUnchained:` keys — its four barbarian entries
 *    (`urban-barbarian:controlled-rage`, `invulnerable-rager:invulnerability`,
 *    `savage-barbarian:natural-toughness`, `wildborn:damage-reduction`) are
 *    filed under the `barbarian:` tag only. `./barbarian.ts` therefore leaves
 *    three of those four (all but Controlled Rage, whose own bucket is
 *    `subsystem` regardless) OUT of its own extracted table, relying on the
 *    hand-verified table to cover them. For THIS class, that hand-verified
 *    coverage doesn't exist, so all three numeric ones ARE extracted below —
 *    with formulas ported directly from `archetype-effects.ts`'s own Change
 *    literals (the underlying rules text is identical) — or resolution would
 *    silently drop them for every Unchained character.
 * 2. **A corrected reading of the special-senses target family.** Some
 *    `barbarian:*` entries this pass cross-checked classify a "gain
 *    darkvision/scent/blindsense/blindsight" grant as `subsystem` ("no
 *    number"). That undersells `targets.ts`: `sensedv`/`sensell`/`sensesc`/
 *    `sensebse`/`sensebs` are real, applied `Change` targets
 *    (`senses.ts`, highest-wins resolution per sense kind), already used this
 *    way by `rage-powers.ts`'s own Scent/Darkvision/Low-Light-Vision rage
 *    powers and several bloodline/bloodrager tables. Superstitious's split
 *    "Keen Senses" tiers and Sharptooth's "Scent of Blood" (Scent) are
 *    genuinely unconditional sense grants gated only by the character's own
 *    level (the same gate every other archetype feature is subject to), so
 *    this pass extracts them as `numeric` — seven ids that would otherwise be
 *    missed entirely. Superstitious's Cave Dweller sibling "Tunnel Vision"
 *    (unconditional darkvision 60 ft. + a separately-scoped, dropped
 *    Perception bonus) gets the same "extract the unconditional clause"
 *    treatment `archetype-effects.ts`'s own doc comment already establishes
 *    for mixed features.
 *
 * ── BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION ──────────────────
 *
 * Every feature of every vendored Unchained Barbarian archetype, bucketed
 * `numeric` / `situational` / `subsystem` / `blocked` per the same rubric
 * `fighter.ts`/`barbarian.ts` established:
 *  - "numeric": an unconditional (or armor-state-gated, `@armor.type`-style,
 *    or character-level-gated special-sense) bonus expressible via a real
 *    `packages/engine/src/targets.ts` target.
 *  - "situational": a REAL number scoped to a specific maneuver, weapon,
 *    enemy state/type/subtype, terrain, or rage-state condition the engine
 *    can't check without over-applying — vendored prose stays the source of
 *    truth.
 *  - "subsystem": grants an unrelated ability/resource/proficiency/choice
 *    list, imposes an effect on a FOE or an ally/mount rather than a bonus to
 *    the character's own sheet, or removes a penalty this engine never
 *    modeled (bleed, terrain difficulty, grapple penalties, hardness, reach,
 *    crit-confirm — none of these have an `APPLIED_TARGET`) — no
 *    Change-shaped number to extract.
 *  - "blocked": a genuine composition trap, recorded rather than guessed at.
 *    This class's data has four shapes (the first three inherited straight
 *    from `./barbarian.ts`'s own findings against the identical prose; the
 *    fourth is new to this pass, found while independently classifying the
 *    12 archetype features `./barbarian.ts` doesn't cover — see below):
 *      1. A feature that changes Rage's ROUNDS/DAY count or cadence (a flat
 *         reduction, an effective-level shift, or a triggered per-kill/
 *         per-hit "gain N rounds" mechanic) — any of these would
 *         double-count or fight the vendored Rage (UC) `uses.maxFormula`
 *         (`4 + @abilities.con.mod + (@class.unlevel - 1)*2` — confirmed the
 *         same shape as chained Rage's, just term order) already applied
 *         generically by `deriveResourcePools`. Recorded, not modeled.
 *      2. A vendored-data issue: a feature that restates the base Damage
 *         Reduction progression verbatim with no "this ability replaces…"
 *         language and a `level` field that contradicts its own prose
 *         (Jungle Rager's "Damage reduction" entry).
 *      3. A literal vendored DUPLICATE: the same feature text filed under two
 *         or more separate ids in this class's data (Pack Rager's "Rage
 *         power" at 8th duplicates its own "Bonus Feat" at 2nd verbatim;
 *         Superstitious's combined "Keen Senses" at 7th duplicates its own
 *         five individually-leveled `keen-senses-*` siblings, but — unlike
 *         Pack Rager's case — extracting the combined id AS WRITTEN would
 *         also grant every tier's sense at 7th level, years early, since the
 *         combined id's own `level` field only gates entry to 7). Extracting
 *         a second Change under the duplicate id would either double-count
 *         (Pack Rager) or over-apply early (Keen Senses); recorded instead.
 *      4. A DR value that can't be composed without a second hardcoded-table
 *         reference: Wildborn's "Inexhaustible" doubles "her damage reduction
 *         gained from barbarian levels" specifically against nonlethal
 *         damage — the same nonlethal-qualifier nuance Invulnerable Rager's
 *         own hand-verified DR entry already drops as unmodeled (no
 *         `dr.nonlethal`-stacks-additively convention exists), and doubling a
 *         value that itself comes from another table entry
 *         (`wildborn:damage-reduction:7`, below) risks reproducing it wrong
 *         rather than composing it correctly.
 *
 * Precedent this pass leaned on (identical to `./barbarian.ts`'s own, since
 * the underlying base-class mechanics are shared):
 *  - Fast Movement (base L1) carries a real vendored Change (`landSpeed`,
 *    type "base", gated on `@armor.type<=1` and not encumbered) but is a
 *    SINGLE flat grant at ONE level — a clean 1:1 `pairedBaseFeatureUuid`
 *    swap is already suppressed for free by `activeArchetypeSwaps`/
 *    `collect.ts`. Most "replaces fast movement" features in this data are
 *    themselves `situational`/`subsystem`/mount-only, so there was nothing to
 *    extract that could clash with the base grant either way.
 *  - Trap Sense (base L3) carries an EMPTY vendored `changes: []` — nothing
 *    to suppress, ever.
 *  - Damage Reduction (base L7, hardcoded in `tables.ts`'s
 *    `barbarianDamageReduction`, gated by `archetypes.ts`'s
 *    `barbarianDamageReductionReplaced`, which explicitly covers BOTH
 *    `barbarian` and `barbarianUnchained` tags) is suppressed for free on any
 *    clean 1:1 paired swap.
 *  - Rage's ability-score bonuses (Str/Con/Dex) are NOT auto-applied anywhere
 *    in this engine (a manual player-toggled buff, same posture as ki/grit/
 *    panache) — confirmed via the Urban Barbarian hand table entry's own doc
 *    comment (`archetype-effects.ts`) and this wave's own brief: the Rage
 *    (Unchained) buff's untyped bonuses are correct vendored content, not a
 *    bug, and rage-STATE modifications stay `situational`/`blocked`, never an
 *    always-on Change. Rage Powers are a modeled pick-list subsystem
 *    (`rage-powers.ts`); any feature that swaps/grants/restricts them is
 *    `subsystem`.
 *
 * A second, independent vendored-data oddity found in this class's own
 * 12-feature gap (features `./barbarian.ts` doesn't classify, because the
 * archetype data source repoint added them after that file was written —
 * same repoint `./barbarian.ts`'s own header documents): Breaker's "Feral
 * Transformation" and "Savage Rapport" are filed under `archetypeId:
 * "barbarianUnchained:breaker"` but their text is Beastkin Berserker's own
 * two abilities verbatim (Breaker's real features are "Battle Scavenger" and
 * "Destructive") — a cross-archetype content leak, not a rules question.
 * Classified on their actual text regardless of which archetype id they're
 * filed under.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── Armored Hulk ───────────────────────────────────────────────────────
  "barbarianUnchained:armored-hulk:armored-swiftness:2": {
    archetypeId: "barbarianUnchained:armored-hulk",
    name: "Armored Swiftness",
    level: 2,
    bucket: "blocked",
    note: "+5 ft. in medium/heavy armor, 'to a maximum of her speed' — a cap-relative offset against the armor speed reduction compute.ts applies via encumberedSpeed(). A plain additive Change composes wrong at both edges: Slow and Steady races skip the reduction (so +5 overshoots RAW's cap), and at 5th+ Improved Armored Swiftness's own base-type bonus wins highest-within-type instead of RAW's stacking. Needs cap-aware plumbing, not a formula",
  },
  "barbarianUnchained:armored-hulk:improved-armored-swiftness:5": {
    archetypeId: "barbarianUnchained:armored-hulk",
    name: "Improved Armored Swiftness",
    level: 5,
    bucket: "numeric",
    note: "+10 ft. land speed in any armor short of a heavy load — literal Fast-Movement-shaped condition, paired to Improved Uncanny Dodge (nothing to suppress)",
  },
  "barbarianUnchained:armored-hulk:indomitable-stance:1": {
    archetypeId: "barbarianUnchained:armored-hulk",
    name: "Indomitable Stance",
    level: 1,
    bucket: "situational",
    note: "real numbers, but each scoped to a specific maneuver (overrun), a specific save (vs. trample), or a specific enemy state (charging) — unpaired swap of fast movement, whose own real Change stays unsuppressed either way since nothing here is added on top",
  },
  "barbarianUnchained:armored-hulk:resilience-of-steel:3": {
    archetypeId: "barbarianUnchained:armored-hulk",
    name: "Resilience of Steel",
    level: 3,
    bucket: "subsystem",
    note: "AC bonus scoped to critical-hit-confirmation rolls only — `critConfirm` is a known vendored target string but is not in targets.ts's APPLIED_TARGETS, so no live Change is possible regardless of scoping",
  },
  "barbarianUnchained:armored-hulk:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarianUnchained:armored-hulk",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant — no numeric target",
  },

  // ── Beastkin Berserker ─────────────────────────────────────────────────
  "barbarianUnchained:beastkin-berserker:feral-transformation:4": {
    archetypeId: "barbarianUnchained:beastkin-berserker",
    name: "Feral Transformation",
    level: 4,
    bucket: "subsystem",
    note: "polymorph (beast shape I/II/III) — no numeric effect to model",
  },
  "barbarianUnchained:beastkin-berserker:savage-rapport:1": {
    archetypeId: "barbarianUnchained:beastkin-berserker",
    name: "Savage Rapport",
    level: 1,
    bucket: "situational",
    note: "half-level skill bonus scoped to checks involving a specific chosen animal kind — subject-scoped, engine can't check",
  },

  // ── Breaker ────────────────────────────────────────────────────────────
  "barbarianUnchained:breaker:battle-scavenger:3": {
    archetypeId: "barbarianUnchained:breaker",
    name: "Battle Scavenger",
    level: 3,
    bucket: "situational",
    note: "no attack penalty + damage bonus scoped to improvised/broken weapons specifically — weapon-condition scoped, not a real weapon-group",
  },
  "barbarianUnchained:breaker:destructive:1": {
    archetypeId: "barbarianUnchained:breaker",
    name: "Destructive",
    level: 1,
    bucket: "situational",
    note: "half-level damage bonus scoped to sunder combat maneuvers/unattended objects — maneuver-scoped; unpaired swap of fast movement, nothing added here to double-count against it",
  },
  "barbarianUnchained:breaker:feral-transformation:4": {
    archetypeId: "barbarianUnchained:breaker",
    name: "Feral Transformation",
    level: 4,
    bucket: "subsystem",
    note: "vendored-data content leak: this feature's text is Beastkin Berserker's own 'Feral Transformation (Su)' verbatim (see this archetype's own Battle Scavenger/Destructive above, which are Breaker's real features) — classified on its actual text regardless: polymorph (beast shape I/II/III), no numeric effect to model",
  },
  "barbarianUnchained:breaker:savage-rapport:1": {
    archetypeId: "barbarianUnchained:breaker",
    name: "Savage Rapport",
    level: 1,
    bucket: "situational",
    note: "same vendored-data content leak as this archetype's Feral Transformation above (Beastkin Berserker's text, not Breaker's) — half-level skill bonus scoped to checks involving a specific chosen animal kind, subject-scoped, engine can't check",
  },

  // ── Brutal Pugilist ────────────────────────────────────────────────────
  "barbarianUnchained:brutal-pugilist:improved-savage-grapple:5": {
    archetypeId: "barbarianUnchained:brutal-pugilist",
    name: "Improved Savage Grapple",
    level: 5,
    bucket: "situational",
    note: "removes grappled-condition penalties + a size-treatment rule — condition-state scoped, no flat bonus",
  },
  "barbarianUnchained:brutal-pugilist:pit-fighter:3": {
    archetypeId: "barbarianUnchained:brutal-pugilist",
    name: "Pit Fighter",
    level: 3,
    bucket: "situational",
    note: "CMB/CMD bonus on a player-chosen combat maneuver — free-choice maneuver scoping, no generic maneuver target exists",
  },
  "barbarianUnchained:brutal-pugilist:savage-grapple:2": {
    archetypeId: "barbarianUnchained:brutal-pugilist",
    name: "Savage Grapple",
    level: 2,
    bucket: "situational",
    note: "halves grappled-condition penalties + a +2 CMD bonus scoped to a specific attack-of-opportunity-vs-grapple scenario — maneuver/action scoped",
  },

  // ── Brutish Swamper ────────────────────────────────────────────────────
  "barbarianUnchained:brutish-swamper:home:2": {
    archetypeId: "barbarianUnchained:brutish-swamper",
    name: "Home",
    level: 2,
    bucket: "situational",
    note: 'initiative + skill bonuses scoped to "in swamps" — terrain condition the engine can\'t check',
  },
  "barbarianUnchained:brutish-swamper:marsh-march:1": {
    archetypeId: "barbarianUnchained:brutish-swamper",
    name: "Marsh March",
    level: 1,
    bucket: "subsystem",
    note: "removes swamp/bog terrain movement penalties this engine never modeled",
  },
  "barbarianUnchained:brutish-swamper:stubborn:3": {
    archetypeId: "barbarianUnchained:brutish-swamper",
    name: "Stubborn",
    level: 3,
    bucket: "situational",
    note: "not a save bonus at all despite replacing trap sense: it's a scaling penalty on OTHER creatures' Diplomacy/Intimidate checks made against her, not a bonus to her own roll — no Change target models a penalty on another creature's check.",
  },
  "barbarianUnchained:brutish-swamper:wrastlin:6": {
    archetypeId: "barbarianUnchained:brutish-swamper",
    name: "Wrastlin",
    level: 6,
    bucket: "situational",
    note: "CMD/damage bonus scoped to grapple combat maneuvers while raging — maneuver- and rage-state-scoped",
  },

  // ── Cave Dweller ───────────────────────────────────────────────────────
  "barbarianUnchained:cave-dweller:sun-walker:7": {
    archetypeId: "barbarianUnchained:cave-dweller",
    name: "Sun Walker",
    level: 7,
    bucket: "situational",
    note: "AC/save bonus + penalty reduction scoped to light-descriptor effects specifically — effect-type scoped; paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed regardless of this feature's own bucket",
  },
  "barbarianUnchained:cave-dweller:tight-tunnels:1": {
    archetypeId: "barbarianUnchained:cave-dweller",
    name: "Tight Tunnels",
    level: 1,
    bucket: "subsystem",
    note: "turning-radius rule + squeezing-penalty removal — no numeric target",
  },
  "barbarianUnchained:cave-dweller:tunnel-vision:3": {
    archetypeId: "barbarianUnchained:cave-dweller",
    name: "Tunnel Vision",
    level: 3,
    bucket: "numeric",
    note: "darkvision 60 ft. is a real, unconditional sense grant (sensedv target, extracted); the \"while in darkness\" Perception bonus is a separate, environment-scoped clause the engine can't check and is dropped, flagged in the extracted entry's detail",
  },

  // ── Deepwater Rager ────────────────────────────────────────────────────
  "barbarianUnchained:deepwater-rager:crushing-grapple:14": {
    archetypeId: "barbarianUnchained:deepwater-rager",
    name: "Crushing Grapple",
    level: 14,
    bucket: "subsystem",
    note: "grants the constrict special attack — unrelated ability grant",
  },
  "barbarianUnchained:deepwater-rager:disorienting-grapple:5": {
    archetypeId: "barbarianUnchained:deepwater-rager",
    name: "Disorienting Grapple",
    level: 5,
    bucket: "subsystem",
    note: "imposes sickened + a save on the grappled FOE — not a bonus to the character's own sheet",
  },
  "barbarianUnchained:deepwater-rager:full-lungs:17": {
    archetypeId: "barbarianUnchained:deepwater-rager",
    name: "Full Lungs",
    level: 17,
    bucket: "subsystem",
    note: "no breathing needed while raging — utility, no number",
  },
  "barbarianUnchained:deepwater-rager:spiraling-charge:2": {
    archetypeId: "barbarianUnchained:deepwater-rager",
    name: "Spiraling Charge",
    level: 2,
    bucket: "subsystem",
    note: "charge-movement rule change — no numeric effect",
  },
  "barbarianUnchained:deepwater-rager:strong-lungs:1": {
    archetypeId: "barbarianUnchained:deepwater-rager",
    name: "Strong Lungs",
    level: 1,
    bucket: "numeric",
    note: "Con-mod-to-Intimidate half is a real, effectively-unconditional bonus (extracted); the hold-breath half has no numeric target",
  },

  // ── Dreadnought ────────────────────────────────────────────────────────
  "barbarianUnchained:dreadnought:dead-calm:1": {
    archetypeId: "barbarianUnchained:dreadnought",
    name: "Dead Calm",
    level: 1,
    bucket: "subsystem",
    note: "alters rage's action economy/downsides (half bonuses, no AC penalty) — rage's ability bonuses aren't auto-applied in the first place, nothing baseline to override",
  },
  "barbarianUnchained:dreadnought:fearless-killer:14": {
    archetypeId: "barbarianUnchained:dreadnought",
    name: "Fearless Killer",
    level: 14,
    bucket: "subsystem",
    note: "binary fear immunity while raging — no number",
  },
  "barbarianUnchained:dreadnought:instant-dispassion:17": {
    archetypeId: "barbarianUnchained:dreadnought",
    name: "Instant Dispassion",
    level: 17,
    bucket: "subsystem",
    note: "rage re-entry timing rule — no number",
  },
  "barbarianUnchained:dreadnought:stead-gait:1": {
    archetypeId: "barbarianUnchained:dreadnought",
    name: "Stead Gait",
    level: 1,
    bucket: "situational",
    note: "save/CMD bonus scoped to effects that slow/immobilize specifically — effect-type scoped despite the level-based tier scaling being checkable",
  },

  // ── Drunken Brute ──────────────────────────────────────────────────────
  "barbarianUnchained:drunken-brute:raging-drunk:1": {
    archetypeId: "barbarianUnchained:drunken-brute",
    name: "Raging Drunk",
    level: 1,
    bucket: "subsystem",
    note: "rage-round/alcohol resource-trade mechanic — no flat number",
  },

  // ── Drunken Rager ──────────────────────────────────────────────────────
  "barbarianUnchained:drunken-rager:drunken-rage:1": {
    archetypeId: "barbarianUnchained:drunken-rager",
    name: "Drunken Rage",
    level: 1,
    bucket: "subsystem",
    note: "whole drunken-rage-point resource subsystem (occasionally spent for +20 ft. speed or +1 rage round) — unmodeled resource pool, not a static formula term; unpaired swap of fast movement",
  },
  "barbarianUnchained:drunken-rager:drunken-swing:12": {
    archetypeId: "barbarianUnchained:drunken-rager",
    name: "Drunken Swing",
    level: 12,
    bucket: "subsystem",
    note: "resource-point-gated, swift-action-activated crit-range increase for a single attack — activated ability, same posture as ki/grit/panache",
  },
  "barbarianUnchained:drunken-rager:improved-staggering-evasion:5": {
    archetypeId: "barbarianUnchained:drunken-rager",
    name: "Improved Staggering Evasion",
    level: 5,
    bucket: "subsystem",
    note: "grants improved evasion, resource-gated — unrelated ability grant",
  },
  "barbarianUnchained:drunken-rager:staggering-evasion:2": {
    archetypeId: "barbarianUnchained:drunken-rager",
    name: "Staggering Evasion",
    level: 2,
    bucket: "subsystem",
    note: "grants evasion, resource-gated — unrelated ability grant",
  },
  "barbarianUnchained:drunken-rager:tolerance:3": {
    archetypeId: "barbarianUnchained:drunken-rager",
    name: "Tolerance",
    level: 3,
    bucket: "situational",
    note: "save bonus scoped to nauseate/poison/sicken/addiction effects, also resource-gated — effect-type scoped",
  },

  // ── Elemental Kin ──────────────────────────────────────────────────────
  "barbarianUnchained:elemental-kin:elemental-fury:3": {
    archetypeId: "barbarianUnchained:elemental-kin",
    name: "Elemental Fury",
    level: 3,
    bucket: "blocked",
    note: 'triggered "gain +1 (scaling) round of rage when taking energy damage while raging" — a rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },

  // ── Fearsome Defender ──────────────────────────────────────────────────
  "barbarianUnchained:fearsome-defender:bloodlust:5": {
    archetypeId: "barbarianUnchained:fearsome-defender",
    name: "Bloodlust",
    level: 5,
    bucket: "numeric",
    note: "Cha-mod-to-initiative half is a real, unconditional ability-mod bonus (extracted); the always-acts-in-surprise-round half has no numeric target",
  },
  "barbarianUnchained:fearsome-defender:intractable:1": {
    archetypeId: "barbarianUnchained:fearsome-defender",
    name: "Intractable",
    level: 1,
    bucket: "situational",
    note: "save bonus scoped to pain effects specifically, plus a DC increase imposed on OTHERS' checks against her (no self-target exists for that half)",
  },
  "barbarianUnchained:fearsome-defender:off-the-leash:2": {
    archetypeId: "barbarianUnchained:fearsome-defender",
    name: "Off the Leash",
    level: 2,
    bucket: "subsystem",
    note: "action-economy rule (draw weapon while raging) — no number",
  },
  "barbarianUnchained:fearsome-defender:silent-threat:3": {
    archetypeId: "barbarianUnchained:fearsome-defender",
    name: "Silent Threat",
    level: 3,
    bucket: "numeric",
    note: "general Intimidate half is a clean scaling bonus (extracted); the ally-demoralize-DC half has no self-target and is dropped, flagged in the extracted entry's detail",
  },

  // ── Feral Gnasher ──────────────────────────────────────────────────────
  "barbarianUnchained:feral-gnasher:greater-lockjaw:9": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Greater Lockjaw",
    level: 9,
    bucket: "subsystem",
    note: "grab-size-increment rule — no number",
  },
  "barbarianUnchained:feral-gnasher:impromptu-armament:2": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Impromptu Armament",
    level: 2,
    bucket: "subsystem",
    note: "bonus feat + rage-power swap — feat/choice grants, no number",
  },
  "barbarianUnchained:feral-gnasher:improved-lockjaw:6": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Improved Lockjaw",
    level: 6,
    bucket: "subsystem",
    note: "grappled-condition immunity while controlling a grapple — condition removal, no number",
  },
  "barbarianUnchained:feral-gnasher:improvised-weapon-mastery:5": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Improvised Weapon Mastery",
    level: 5,
    bucket: "subsystem",
    note: "bonus feat grant — no number; the archetype data source repoint moved this from 2nd to 5th level (upstream data drift, not a rules change)",
  },
  "barbarianUnchained:feral-gnasher:lockjaw:3": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Lockjaw",
    level: 3,
    bucket: "subsystem",
    note: "grab ability on a bite attack — unrelated ability grant",
  },
  "barbarianUnchained:feral-gnasher:savage-bite:1": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Savage Bite",
    level: 1,
    bucket: "subsystem",
    note: "grants a natural bite attack — natural-attack targets (nattack/ndamage) are not in targets.ts's APPLIED_TARGETS, so no live Change is possible; unpaired swap of fast movement",
  },
  "barbarianUnchained:feral-gnasher:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency LOSS list — no numeric target",
  },
  "barbarianUnchained:feral-gnasher:wicked-improvisation:12": {
    archetypeId: "barbarianUnchained:feral-gnasher",
    name: "Wicked Improvisation",
    level: 12,
    bucket: "situational",
    note: "damage bonus scoped to natural attacks/improvised weapons (neither is a real WEAPON_GROUPS slug) while raging (unmodeled live condition) — doubly scoped",
  },

  // ── Flesheater ─────────────────────────────────────────────────────────
  "barbarianUnchained:flesheater:feast:14": {
    archetypeId: "barbarianUnchained:flesheater",
    name: "Feast",
    level: 14,
    bucket: "subsystem",
    note: "expands which consumed creature's abilities can be emulated — choice flexibility, no number",
  },
  "barbarianUnchained:flesheater:one-flesh:2": {
    archetypeId: "barbarianUnchained:flesheater",
    name: "One Flesh",
    level: 2,
    bucket: "subsystem",
    note: "polymorph/ability-borrowing from a consumed creature — bundles uncanny dodge, improved uncanny dodge, and two rage powers into one unpaired swap, but none of those base grants carry a number this engine models anyway, so nothing to suppress or double-count",
  },
  "barbarianUnchained:flesheater:rage:1": {
    archetypeId: "barbarianUnchained:flesheater",
    name: "Rage",
    level: 1,
    bucket: "subsystem",
    note: "alters rage with an extra Int penalty while raging — rage's ability effects aren't auto-applied, nothing baseline to override",
  },
  "barbarianUnchained:flesheater:unbound-form:20": {
    archetypeId: "barbarianUnchained:flesheater",
    name: "Unbound Form",
    level: 20,
    bucket: "subsystem",
    note: "polymorph, replaces mighty rage — no number",
  },
  "barbarianUnchained:flesheater:unbound-rage:11": {
    archetypeId: "barbarianUnchained:flesheater",
    name: "Unbound Rage",
    level: 11,
    bucket: "subsystem",
    note: "rage-conditional enlarge-person-style size/Str bonus, replaces greater rage — rage bonuses aren't auto-applied, nothing to override",
  },

  // ── Geminate Invoker ───────────────────────────────────────────────────
  "barbarianUnchained:geminate-invoker:contemplative:1": {
    archetypeId: "barbarianUnchained:geminate-invoker",
    name: "Contemplative",
    level: 1,
    bucket: "subsystem",
    note: "class skill additions + alignment rule — no number",
  },
  "barbarianUnchained:geminate-invoker:haunt-channeler:3": {
    archetypeId: "barbarianUnchained:geminate-invoker",
    name: "Haunt Channeler",
    level: 3,
    bucket: "subsystem",
    note: "haunt-damage special mechanic — no matching target",
  },
  "barbarianUnchained:geminate-invoker:spirit-conduit:4": {
    archetypeId: "barbarianUnchained:geminate-invoker",
    name: "Spirit Conduit",
    level: 4,
    bucket: "subsystem",
    note: "grants a rage power via trance — rage powers are prose-only picks with no per-power modeling",
  },
  "barbarianUnchained:geminate-invoker:trance:1": {
    archetypeId: "barbarianUnchained:geminate-invoker",
    name: "Trance",
    level: 1,
    bucket: "subsystem",
    note: 'whole alternate-rage ("trance") subsystem with its own ability bonuses — same posture as rage\'s own unmodeled ability bonuses',
  },

  // ── Giant Stalker ──────────────────────────────────────────────────────
  "barbarianUnchained:giant-stalker:giant-baiter:3": {
    archetypeId: "barbarianUnchained:giant-stalker",
    name: "Giant Baiter",
    level: 3,
    bucket: "situational",
    note: "AC bonus scoped to a specific baited-giant enemy state — enemy-state scoped",
  },
  "barbarianUnchained:giant-stalker:harangue-giant:2": {
    archetypeId: "barbarianUnchained:giant-stalker",
    name: "Harangue Giant",
    level: 2,
    bucket: "situational",
    note: "Intimidate bonus scoped to speaking Giant while raging — double-conditional (language + live rage state)",
  },
  "barbarianUnchained:giant-stalker:smell-giants:2": {
    archetypeId: "barbarianUnchained:giant-stalker",
    name: "Smell Giants",
    level: 2,
    bucket: "situational",
    note: "real scent grant (sensesc is an applied target — see this file's header comment on the sense-target correction), but scoped to humanoids with the giant subtype only; a flat sensesc Change would grant scent against everything, over-applying",
  },
  "barbarianUnchained:giant-stalker:giant-stalker-rage-powers:1": {
    archetypeId: "barbarianUnchained:giant-stalker",
    name: "Giant Stalker Rage Powers",
    level: 1,
    bucket: "subsystem",
    note: "grants three named rage powers (AC vs. giants while raging, trip-a-giant exception, enter-a-giant's-space maneuver) — rage powers are a modeled pick-list subsystem (rage-powers.ts), not per-power Change modeling; each power is also itself rage-state- and giant-subtype-scoped",
  },

  // ── Hateful Rager ──────────────────────────────────────────────────────
  "barbarianUnchained:hateful-rager:amplified-by-hate:9": {
    archetypeId: "barbarianUnchained:hateful-rager",
    name: "Amplified by Hate",
    level: 9,
    bucket: "situational",
    note: "DC bonus to rage powers used against a favored enemy — scoped to enemy type + rage-power mechanic, and rage powers/save DCs aren't modeled targets anyway",
  },
  "barbarianUnchained:hateful-rager:favored-enemy:2": {
    archetypeId: "barbarianUnchained:hateful-rager",
    name: "Favored Enemy",
    level: 2,
    bucket: "situational",
    note: "ranger favored-enemy analog — real numbers scoped to a chosen enemy type, engine can't check target creature type",
  },
  "barbarianUnchained:hateful-rager:feed-the-rage:5": {
    archetypeId: "barbarianUnchained:hateful-rager",
    name: "Feed the Rage",
    level: 5,
    bucket: "blocked",
    note: 'triggered "gain 1 round of rage per favored enemy defeated" — rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },
  "barbarianUnchained:hateful-rager:reduced-rage:2": {
    archetypeId: "barbarianUnchained:hateful-rager",
    name: "Reduced Rage",
    level: 2,
    bucket: "blocked",
    note: "directly reduces the per-level rage-round increment from 2 to 1 — a literal rounds/day formula change that would need to override, not add to, vendored Rage uses.maxFormula",
  },

  // ── Hurler ─────────────────────────────────────────────────────────────
  "barbarianUnchained:hurler:skilled-thrower:1": {
    archetypeId: "barbarianUnchained:hurler",
    name: "Skilled Thrower",
    level: 1,
    bucket: "subsystem",
    note: "+10 ft. thrown weapon range increment — no engine target models range increments (same gap as fighter's Archer/Hawkeye precedent); unpaired swap of fast movement",
  },

  // ── Invulnerable Rager ─────────────────────────────────────────────────
  "barbarianUnchained:invulnerable-rager:extreme-endurance:3": {
    archetypeId: "barbarianUnchained:invulnerable-rager",
    name: "Extreme Endurance",
    level: 3,
    bucket: "numeric",
    note: "fire OR cold energy resistance, wired via the archetypeFeature pick-choice mechanism (build.pickChoices) now that a generic way to record the player's build-time energy-type choice exists.",
  },
  "barbarianUnchained:invulnerable-rager:invulnerability:2": {
    archetypeId: "barbarianUnchained:invulnerable-rager",
    name: "Invulnerability",
    level: 2,
    bucket: "numeric",
    note: "DR/— equal to half class level, doubled vs. nonlethal (the doubling is dropped as unmodeled, same as chained barbarian's own hand-verified Invulnerable Rager entry) — extracted here since no archetype-effects.ts entry exists under the barbarianUnchained tag; also folds in uncanny dodge/improved uncanny dodge, nothing to suppress",
  },

  // ── Jungle Rager ───────────────────────────────────────────────────────
  "barbarianUnchained:jungle-rager:damage-reduction:8": {
    archetypeId: "barbarianUnchained:jungle-rager",
    name: "Damage reduction",
    level: 8,
    bucket: "blocked",
    note: 'suspected vendored-data issue: restates the base Damage Reduction progression verbatim (1/— at 7th, +1 every 3 levels) with NO "this ability replaces…" language and an unpaired uuid, and its own `level` field (8) contradicts its own prose ("At 7th level…"). Jungle Rager\'s other 3 features swap uncanny dodge/improved uncanny dodge/trap sense, never damage reduction, so this reads as a vendored duplicate/reminder of the unchanged base feature rather than a real swap. Extracting a second DR number here would sit on top of the already-unsuppressed hardcoded barbarianDamageReduction table (barbarianDamageReductionReplaced returns false for this archetype) — recorded, not modeled. See report for a suggested follow-up.',
  },
  "barbarianUnchained:jungle-rager:home-ground-advantage:2": {
    archetypeId: "barbarianUnchained:jungle-rager",
    name: "Home Ground Advantage",
    level: 2,
    bucket: "situational",
    note: "cover/concealment bonus scoped to a chosen favored terrain — terrain condition the engine can't check",
  },
  "barbarianUnchained:jungle-rager:home-ground-supremacy:5": {
    archetypeId: "barbarianUnchained:jungle-rager",
    name: "Home Ground Supremacy",
    level: 5,
    bucket: "situational",
    note: "woodland stride + AC bonus, both scoped to the same chosen favored terrain",
  },
  "barbarianUnchained:jungle-rager:jungle-endurance:3": {
    archetypeId: "barbarianUnchained:jungle-rager",
    name: "Jungle Endurance",
    level: 3,
    bucket: "situational",
    note: "Fortitude bonus scoped to hot-weather/disease effects specifically — effect-type scoped",
  },

  // ── Mad Dog ────────────────────────────────────────────────────────────
  "barbarianUnchained:mad-dog:ferocious-fetch:5": {
    archetypeId: "barbarianUnchained:mad-dog",
    name: "Ferocious Fetch",
    level: 5,
    bucket: "subsystem",
    note: "war-beast (animal companion) ability — no number to the character's own sheet",
  },
  "barbarianUnchained:mad-dog:pack-tactics:2": {
    archetypeId: "barbarianUnchained:mad-dog",
    name: "Pack Tactics",
    level: 2,
    bucket: "situational",
    note: "+4-instead-of-+2 flanking bonus, scoped to flanking specifically alongside the war beast — combat-state scoped",
  },
  "barbarianUnchained:mad-dog:rage:4": {
    archetypeId: "barbarianUnchained:mad-dog",
    name: "Rage",
    level: 4,
    bucket: "blocked",
    note: "shifts rage's effective barbarian level by -3 for rounds/day purposes — would need to override the @class.unlevel term inside vendored Rage uses.maxFormula, not addable as a separate Change",
  },
  "barbarianUnchained:mad-dog:throat-cutter:14": {
    archetypeId: "barbarianUnchained:mad-dog",
    name: "Throat Cutter",
    level: 14,
    bucket: "subsystem",
    note: "grants a triggered attack of opportunity off the war beast's maneuver — no number",
  },
  "barbarianUnchained:mad-dog:war-beast:1": {
    archetypeId: "barbarianUnchained:mad-dog",
    name: "War Beast",
    level: 1,
    bucket: "subsystem",
    note: "animal companion grant (barbarian level 1:1) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block; replaces several rage powers (unmodeled either way)",
  },

  // ── Mooncursed ─────────────────────────────────────────────────────────
  "barbarianUnchained:mooncursed:greater-shifting-rage:11": {
    archetypeId: "barbarianUnchained:mooncursed",
    name: "Greater Shifting Rage",
    level: 11,
    bucket: "subsystem",
    note: "polymorph size upgrade, replaces greater rage — no number",
  },
  "barbarianUnchained:mooncursed:hybrid-rage:5": {
    archetypeId: "barbarianUnchained:mooncursed",
    name: "Hybrid Rage",
    level: 5,
    bucket: "subsystem",
    note: "polymorph hybrid-form option — no number",
  },
  "barbarianUnchained:mooncursed:mighty-shifting-rage:20": {
    archetypeId: "barbarianUnchained:mooncursed",
    name: "Mighty Shifting Rage",
    level: 20,
    bucket: "subsystem",
    note: "polymorph size upgrade, replaces mighty rage — no number",
  },
  "barbarianUnchained:mooncursed:shifting-rage:1": {
    archetypeId: "barbarianUnchained:mooncursed",
    name: "Shifting Rage",
    level: 1,
    bucket: "subsystem",
    note: "replaces rage's ability bonuses/penalties with a polymorph while consuming the same rage-round pool (cadence unchanged, so not a blocked rounds/day case) — no number",
  },

  // ── Mounted Fury ───────────────────────────────────────────────────────
  "barbarianUnchained:mounted-fury:bestial-mount:5": {
    archetypeId: "barbarianUnchained:mounted-fury",
    name: "Bestial Mount",
    level: 5,
    bucket: "subsystem",
    note: "grants a druid-style animal companion (barbarian level -4) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block; the +2 morale Str bonus to the mount stays unwired (gated on a live raging-and-mounted state this engine doesn't track); replaces uncanny dodge and improved uncanny dodge, both nothing to suppress",
  },
  "barbarianUnchained:mounted-fury:fast-rider:1": {
    archetypeId: "barbarianUnchained:mounted-fury",
    name: "Fast Rider",
    level: 1,
    bucket: "subsystem",
    note: "unconditional +10 ft. mount speed — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's landSpeed; replaces fast movement, so the character's own speed neither gains this nor keeps the base grant",
  },

  // ── Numerian Liberator ─────────────────────────────────────────────────
  "barbarianUnchained:numerian-liberator:disruptor:5": {
    archetypeId: "barbarianUnchained:numerian-liberator",
    name: "Disruptor",
    level: 5,
    bucket: "subsystem",
    note: "raises foes' concentration DC to cast defensively near her — a DC imposed on OTHERS, not a bonus to her own sheet",
  },
  "barbarianUnchained:numerian-liberator:hard-hitter:2": {
    archetypeId: "barbarianUnchained:numerian-liberator",
    name: "Hard Hitter",
    level: 2,
    bucket: "subsystem",
    note: "bypasses object/creature hardness — no matching target",
  },
  "barbarianUnchained:numerian-liberator:hide-from-constructs:14": {
    archetypeId: "barbarianUnchained:numerian-liberator",
    name: "Hide from Constructs",
    level: 14,
    bucket: "subsystem",
    note: "concealment-vs-constructs ability, resource-gated — no number",
  },

  // ── Pack Hunter ────────────────────────────────────────────────────────
  "barbarianUnchained:pack-hunter:in-and-out:3": {
    archetypeId: "barbarianUnchained:pack-hunter",
    name: "In and Out",
    level: 3,
    bucket: "situational",
    note: "dodge AC bonus scoped to attacks of opportunity only — the engine's `ac` target applies to all attacks, so a flat Change would over-apply",
  },
  "barbarianUnchained:pack-hunter:sympathetic-rage:6": {
    archetypeId: "barbarianUnchained:pack-hunter",
    name: "Sympathetic Rage",
    level: 6,
    bucket: "subsystem",
    note: "rage-state-sharing rule with an unconscious ally — no number",
  },
  "barbarianUnchained:pack-hunter:bonus-feats:2": {
    archetypeId: "barbarianUnchained:pack-hunter",
    name: "Bonus Feats",
    level: 2,
    bucket: "subsystem",
    note: "lets a pack hunter take a teamwork feat INSTEAD OF a new rage power — a pick-list swap option (rage powers are prose-only, no per-power modeling), not an additive feat count",
  },

  // ── Pack Rager ─────────────────────────────────────────────────────────
  "barbarianUnchained:pack-rager:bonus-feat:2": {
    archetypeId: "barbarianUnchained:pack-rager",
    name: "Bonus Feat",
    level: 2,
    bucket: "numeric",
    note: 'bonus-feat COUNT scaling is a clean, unconditional formula (extracted) — the "must be a combat/teamwork feat" restriction is dropped, same posture as the ranger combat-style-feat precedent in archetype-effects.ts',
  },
  "barbarianUnchained:pack-rager:raging-tactician:7": {
    archetypeId: "barbarianUnchained:pack-rager",
    name: "Raging Tactician",
    level: 7,
    bucket: "subsystem",
    note: "shares a teamwork feat with allies in range — ally-facing grant, no bonus to self; paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed",
  },
  "barbarianUnchained:pack-rager:rage-power:8": {
    archetypeId: "barbarianUnchained:pack-rager",
    name: "Rage power",
    level: 8,
    bucket: "blocked",
    note: "vendored-data duplication: identical prose to this archetype's own Bonus Feat feature above (this file's `bonus-feat:2` entry) but filed under a different name/level — extracting a second additive bonusFeats formula here would double-count the same ability already granted once; recorded as a vendored bug, not modeled",
  },

  // ── Primal Hunter ──────────────────────────────────────────────────────
  "barbarianUnchained:primal-hunter:exceptional-pull:1": {
    archetypeId: "barbarianUnchained:primal-hunter",
    name: "Exceptional Pull",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat + weapon strength-rating increase — no generic target; unpaired swap of fast movement",
  },
  "barbarianUnchained:primal-hunter:focused-rage:1": {
    archetypeId: "barbarianUnchained:primal-hunter",
    name: "Focused Rage",
    level: 1,
    bucket: "situational",
    note: "attack bonus scoped to ranged weapons specifically while raging — doubly scoped (weapon category restriction that isn't a WEAPON_GROUPS slug, plus live rage-state)",
  },

  // ── Raging Cannibal ────────────────────────────────────────────────────
  "barbarianUnchained:raging-cannibal:animal-fury:2": {
    archetypeId: "barbarianUnchained:raging-cannibal",
    name: "Animal Fury",
    level: 2,
    bucket: "subsystem",
    note: "forces animal fury as the 2nd-level rage power pick — a restriction on which power is chosen, not an independent grant; Animal Fury's own bite is wired via the ragePower:animalFury PC natural-attack entry regardless of which archetype forced the pick",
  },
  "barbarianUnchained:raging-cannibal:consume-vigor:2": {
    archetypeId: "barbarianUnchained:raging-cannibal",
    name: "Consume Vigor",
    level: 2,
    bucket: "blocked",
    note: 'triggered "gain N rounds of rage" on reducing a same-type creature to 0 hp — rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },
  "barbarianUnchained:raging-cannibal:feed-from-fury:5": {
    archetypeId: "barbarianUnchained:raging-cannibal",
    name: "Feed from Fury",
    level: 5,
    bucket: "subsystem",
    note: "triggered temporary-hit-point gain on a specific crit — no matching target for a triggered temp-HP grant",
  },
  "barbarianUnchained:raging-cannibal:intimidating-gouge:3": {
    archetypeId: "barbarianUnchained:raging-cannibal",
    name: "Intimidating Gouge",
    level: 3,
    bucket: "situational",
    note: "Intimidate bonus, triggered by a specific crit against a same-type creature, lasting only for the rage's duration — action- and rage-state-scoped",
  },
  "barbarianUnchained:raging-cannibal:razor-toothed-fury:6": {
    archetypeId: "barbarianUnchained:raging-cannibal",
    name: "Razor-Toothed Fury",
    level: 6,
    bucket: "situational",
    note: "attack-penalty-for-bleed-damage trade, scoped to the bite attack specifically and a per-attack player choice — same shape as fighter's Overhand Chop precedent",
  },

  // ── Savage Barbarian ───────────────────────────────────────────────────
  "barbarianUnchained:savage-barbarian:naked-courage:3": {
    archetypeId: "barbarianUnchained:savage-barbarian",
    name: "Naked Courage",
    level: 3,
    bucket: "numeric",
    note: "dodge AC half is armor-gated (@armor.type, same convention this archetype's own Natural Toughness entry below uses) and extracted; the vs.-fear save half is dropped and flagged in the extracted entry's detail",
  },
  "barbarianUnchained:savage-barbarian:natural-toughness:7": {
    archetypeId: "barbarianUnchained:savage-barbarian",
    name: "Natural Toughness",
    level: 7,
    bucket: "numeric",
    note: "natural-armor Damage-Reduction replacement, formula ported from chained barbarian's own hand-verified archetype-effects.ts entry (identical rules text) — extracted here since no archetype-effects.ts entry exists under the barbarianUnchained tag",
  },

  // ── Savage Technologist ────────────────────────────────────────────────
  "barbarianUnchained:savage-technologist:crack-shot:5": {
    archetypeId: "barbarianUnchained:savage-technologist",
    name: "Crack Shot",
    level: 5,
    bucket: "situational",
    note: "Dex-to-damage with firearms while raging (confirmed on aonprd: 'while raging', replaces improved uncanny dodge) — the firearms weapon-group half now has a Dex-to-damage mechanism (gun-training.ts / per-weapon damageAbility), but the rage gate has no seam in this archetype-extracted route, so it stays unwired; a player can approximate it with a per-weapon damageAbility: 'dex' override while raging",
  },
  "barbarianUnchained:savage-technologist:primal-magnetism:3": {
    archetypeId: "barbarianUnchained:savage-technologist",
    name: "Primal Magnetism",
    level: 3,
    bucket: "subsystem",
    note: "resource-spend (rage rounds) activated Diplomacy bonus — activated ability, not a passive number",
  },
  "barbarianUnchained:savage-technologist:rage:1": {
    archetypeId: "barbarianUnchained:savage-technologist",
    name: "Rage",
    level: 1,
    bucket: "subsystem",
    note: "reflavors rage's morale bonus onto Dex instead of Con — rage's ability bonuses aren't auto-applied, nothing baseline to override (same posture as the hand-verified Urban Barbarian Controlled Rage entry)",
  },
  "barbarianUnchained:savage-technologist:sword-and-gun:2": {
    archetypeId: "barbarianUnchained:savage-technologist",
    name: "Sword and Gun",
    level: 2,
    bucket: "subsystem",
    note: "grants a Two-Weapon-Fighting-shaped combat style + no-AoO rule — unrelated ability grant",
  },
  "barbarianUnchained:savage-technologist:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarianUnchained:savage-technologist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency list — no numeric target",
  },

  // ── Scarred Rager ──────────────────────────────────────────────────────
  "barbarianUnchained:scarred-rager:improved-tolerance:5": {
    archetypeId: "barbarianUnchained:scarred-rager",
    name: "Improved Tolerance",
    level: 5,
    bucket: "subsystem",
    note: "extends an unmodeled re-save mechanic to more conditions — no number",
  },
  "barbarianUnchained:scarred-rager:scarification:3": {
    archetypeId: "barbarianUnchained:scarred-rager",
    name: "Scarification",
    level: 3,
    bucket: "subsystem",
    note: "bleed-damage mitigation — bleed isn't a tracked mechanic in this engine, no target",
  },
  "barbarianUnchained:scarred-rager:terrifying-visage:1": {
    archetypeId: "barbarianUnchained:scarred-rager",
    name: "Terrifying Visage",
    level: 1,
    bucket: "situational",
    note: "Intimidate bonus scoped to humanoids outside barbarian tribes + an unmodeled fear-DC increase — enemy-type scoped; unpaired swap of fast movement",
  },
  "barbarianUnchained:scarred-rager:tolerance:2": {
    archetypeId: "barbarianUnchained:scarred-rager",
    name: "Tolerance",
    level: 2,
    bucket: "subsystem",
    note: "extra-save-or-halved-duration mechanic vs. specific conditions — no flat number",
  },

  // ── Sea Reaver ─────────────────────────────────────────────────────────
  "barbarianUnchained:sea-reaver:eyes-of-the-storm:2": {
    archetypeId: "barbarianUnchained:sea-reaver",
    name: "Eyes of the Storm",
    level: 2,
    bucket: "subsystem",
    note: "ignores weather concealment + halves an existing weather Perception penalty — penalty mitigation this engine never modeled, no target",
  },
  "barbarianUnchained:sea-reaver:marine-terror:1": {
    archetypeId: "barbarianUnchained:sea-reaver",
    name: "Marine Terror",
    level: 1,
    bucket: "subsystem",
    note: "hold-breath + terrain movement + cover-ignoring vs. submerged targets — no numeric target; unpaired swap of fast movement",
  },
  "barbarianUnchained:sea-reaver:savage-sailor:3": {
    archetypeId: "barbarianUnchained:sea-reaver",
    name: "Savage Sailor",
    level: 3,
    bucket: "situational",
    note: "skill bonuses scoped to aquatic terrain — terrain condition the engine can't check",
  },
  "barbarianUnchained:sea-reaver:sure-footed:5": {
    archetypeId: "barbarianUnchained:sea-reaver",
    name: "Sure-Footed",
    level: 5,
    bucket: "subsystem",
    note: "removes slick-surface penalties — penalty this engine never modeled",
  },
  "barbarianUnchained:sea-reaver:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarianUnchained:sea-reaver",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency list — no numeric target",
  },

  // ── Sharptooth ─────────────────────────────────────────────────────────
  "barbarianUnchained:sharptooth:blood-in-the-water:6": {
    archetypeId: "barbarianUnchained:sharptooth",
    name: "Blood in the Water",
    level: 6,
    bucket: "subsystem",
    note: "bleed damage while raging — bleed isn't a tracked mechanic here, also rage-state scoped",
  },
  "barbarianUnchained:sharptooth:ocean-breath:3": {
    archetypeId: "barbarianUnchained:sharptooth",
    name: "Ocean Breath",
    level: 3,
    bucket: "subsystem",
    note: "hold-breath boost + a Con-check bonus for an unmodeled hold-breath mechanic — no target",
  },
  "barbarianUnchained:sharptooth:scent-of-blood-keen-scent:5": {
    archetypeId: "barbarianUnchained:sharptooth",
    name: "Scent of Blood (Keen Scent)",
    level: 5,
    bucket: "subsystem",
    note: "keen scent doubles the range of an existing scent ability, but this engine's own Scent grant (sensesc) isn't range-modeled (a flag-shaped Change, see this archetype's own Scent entries) — nothing to double",
  },
  "barbarianUnchained:sharptooth:scent-of-blood-scent:2": {
    archetypeId: "barbarianUnchained:sharptooth",
    name: "Scent of Blood (Scent)",
    level: 2,
    bucket: "numeric",
    note: "unconditional scent grant — sensesc is a real applied target (see this file's header comment on the sense-target correction), extracted as a flag Change matching rage-powers.ts's own Scent power idiom",
  },
  "barbarianUnchained:sharptooth:scent-of-blood:2": {
    archetypeId: "barbarianUnchained:sharptooth",
    name: "Scent of Blood",
    level: 2,
    bucket: "numeric",
    note: "vendored duplicate of this archetype's own split Scent of Blood (Scent)/(Keen Scent) siblings above (identical combined text, its own level field matches the Scent tier exactly so there's no early-grant risk unlike Superstitious's Keen Senses) — same scent Change extracted; harmless if both this and the split Scent id are ever wired together (sense resolution is highest-wins, not additive)",
  },
  "barbarianUnchained:sharptooth:swim-like-a-fish:1": {
    archetypeId: "barbarianUnchained:sharptooth",
    name: "Swim Like a Fish",
    level: 1,
    bucket: "numeric",
    note: "unconditional swim speed, 10 ft. at 1st and +5 ft. every 5 levels thereafter — extracted via the swimSpeed target (see BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED below). Its Fast Movement pairing is hand-supplied (SUPPLEMENTAL_ARCHETYPE_FEATURE_PAIRING): the source sets no replaces flag and barbarian's 1st level grants two features, so neither vendored pairing path fires",
  },

  // ── Shoanti Burn Rider ─────────────────────────────────────────────────
  "barbarianUnchained:shoanti-burn-rider:cinder-dance:3": {
    archetypeId: "barbarianUnchained:shoanti-burn-rider",
    name: "Cinder Dance",
    level: 3,
    bucket: "subsystem",
    note: "reflex-save-triggered repositioning ability — no flat number",
  },
  "barbarianUnchained:shoanti-burn-rider:cinder-sight:2": {
    archetypeId: "barbarianUnchained:shoanti-burn-rider",
    name: "Cinder Sight",
    level: 2,
    bucket: "subsystem",
    note: "see-through-fire/fog/smoke sense — no number",
  },
  "barbarianUnchained:shoanti-burn-rider:flame-runner:1": {
    archetypeId: "barbarianUnchained:shoanti-burn-rider",
    name: "Flame Runner",
    level: 1,
    bucket: "subsystem",
    note: "once-per-rage speed boost applied to her MOUNT, not herself — no self-facing target; unpaired swap of fast movement",
  },
  "barbarianUnchained:shoanti-burn-rider:give-me-fire:5": {
    archetypeId: "barbarianUnchained:shoanti-burn-rider",
    name: "Give Me Fire",
    level: 5,
    bucket: "blocked",
    note: 'triggered "regain 1 round of rage when taking fire damage while raging" — rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },
  "barbarianUnchained:shoanti-burn-rider:mount:4": {
    archetypeId: "barbarianUnchained:shoanti-burn-rider",
    name: "Mount",
    level: 4,
    bucket: "subsystem",
    note: "animal companion (mount) grant, horse/pony, barbarian level -3 — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block (species restriction unenforced, same as every other companion source); replaces several rage powers (unmodeled either way)",
  },

  // ── Superstitious ──────────────────────────────────────────────────────
  "barbarianUnchained:superstitious:keen-senses-blindsense-30ft:16": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Keen Senses (Blindsense 30ft.)",
    level: 16,
    bucket: "numeric",
    note: "unconditional blindsense 30 ft. grant — sensebse is a real applied target (see this file's header comment); extracted as a flat range Change",
  },
  "barbarianUnchained:superstitious:keen-senses-blindsight-30ft:19": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Keen Senses (Blindsight 30ft.)",
    level: 19,
    bucket: "numeric",
    note: "unconditional blindsight 30 ft. grant — sensebs is a real applied target (see this file's header comment); extracted as a flat range Change",
  },
  "barbarianUnchained:superstitious:keen-senses-darkvision:10": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Keen Senses (Darkvision)",
    level: 10,
    bucket: "numeric",
    note: 'unconditional darkvision 60 ft. grant, with an explicit "or adds 60 feet to the range of any darkvision already possessed" rider — the exact operator:"add" idiom senses.ts documents (extend an existing range rather than compete for it)',
  },
  "barbarianUnchained:superstitious:keen-senses-low-light-vision:7": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Keen Senses (Low-light Vision)",
    level: 7,
    bucket: "numeric",
    note: "unconditional low-light vision grant — sensell is a real applied flag target (see this file's header comment); paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed",
  },
  "barbarianUnchained:superstitious:keen-senses-scent:13": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Keen Senses (Scent)",
    level: 13,
    bucket: "numeric",
    note: "unconditional scent grant — sensesc is a real applied target (see this file's header comment); extracted as a flag Change matching rage-powers.ts's own Scent power idiom",
  },
  "barbarianUnchained:superstitious:keen-senses:7": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Keen Senses",
    level: 7,
    bucket: "blocked",
    note: "vendored-data duplication: identical full multi-tier text to the five separately-leveled keen-senses-* sibling ids this table extracts individually above. Unlike Sharptooth's Scent of Blood duplicate, this one's own `level` field (7) covers ALL FIVE tiers — extracting it wholesale as written would grant 10th/13th/16th/19th-level senses (darkvision/scent/blindsense/blindsight) nine to twelve levels early; recorded as a vendored bug, not modeled",
  },
  "barbarianUnchained:superstitious:sixth-sense:3": {
    archetypeId: "barbarianUnchained:superstitious",
    name: "Sixth Sense",
    level: 3,
    bucket: "numeric",
    note: "general initiative half is a clean scaling bonus (extracted); the surprise-round-only AC half is dropped and flagged in the extracted entry's detail",
  },

  // ── Titan Mauler ───────────────────────────────────────────────────────
  "barbarianUnchained:titan-mauler:big-game-hunter:1": {
    archetypeId: "barbarianUnchained:titan-mauler",
    name: "Big Game Hunter",
    level: 1,
    bucket: "situational",
    note: "attack/AC bonus scoped to melee vs. larger-than-self creatures — enemy-size scoped; unpaired swap of fast movement",
  },
  "barbarianUnchained:titan-mauler:evade-reach:5": {
    archetypeId: "barbarianUnchained:titan-mauler",
    name: "Evade Reach",
    level: 5,
    bucket: "subsystem",
    note: "reduces a chosen foe's effective reach — `reach` is a known vendored target string but is not in targets.ts's APPLIED_TARGETS, so no live effect is possible regardless of scoping",
  },
  "barbarianUnchained:titan-mauler:jotungrip:2": {
    archetypeId: "barbarianUnchained:titan-mauler",
    name: "Jotungrip",
    level: 2,
    bucket: "subsystem",
    note: "uncanny-dodge-equivalent immunity to flat-footedness — binary immunity, no number",
  },
  "barbarianUnchained:titan-mauler:massive-weapons:3": {
    archetypeId: "barbarianUnchained:titan-mauler",
    name: "Massive Weapons",
    level: 3,
    bucket: "situational",
    note: "reduces the oversized-weapon attack penalty — scoped to a specific gear/size choice, not a general attack bonus",
  },
  "barbarianUnchained:titan-mauler:titanic-rage:14": {
    archetypeId: "barbarianUnchained:titan-mauler",
    name: "Titanic Rage",
    level: 14,
    bucket: "subsystem",
    note: "rage-conditional enlarge person, resource-gated (2 rage rounds/round) — activated ability, no static number",
  },

  // ── True Primitive ─────────────────────────────────────────────────────
  "barbarianUnchained:true-primitive:favored-terrain:1": {
    archetypeId: "barbarianUnchained:true-primitive",
    name: "Favored Terrain",
    level: 1,
    bucket: "subsystem",
    note: "ranger favored-terrain analog — terrain-scoped bonuses this engine doesn't model for any class; unpaired swap of fast movement",
  },
  "barbarianUnchained:true-primitive:illiteracy:1": {
    archetypeId: "barbarianUnchained:true-primitive",
    name: "Illiteracy",
    level: 1,
    bucket: "subsystem",
    note: "flavor restriction — no number",
  },
  "barbarianUnchained:true-primitive:trophy-fetish:3": {
    archetypeId: "barbarianUnchained:true-primitive",
    name: "Trophy Fetish",
    level: 3,
    bucket: "situational",
    note: "damage/save bonus scoped to a specific fetish-attached weapon/armor item — per-item scoped, not a weapon category",
  },
  "barbarianUnchained:true-primitive:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarianUnchained:true-primitive",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency list — no numeric target",
  },

  // ── Untamed Rager ──────────────────────────────────────────────────────
  "barbarianUnchained:untamed-rager:deplorable-tactics:5": {
    archetypeId: "barbarianUnchained:untamed-rager",
    name: "Deplorable Tactics",
    level: 5,
    bucket: "subsystem",
    note: "bonus feat (Greater Dirty Trick) — no number",
  },
  "barbarianUnchained:untamed-rager:despicable-tactics:2": {
    archetypeId: "barbarianUnchained:untamed-rager",
    name: "Despicable Tactics",
    level: 2,
    bucket: "subsystem",
    note: "bonus feat (Improved Dirty Trick) — no number",
  },
  "barbarianUnchained:untamed-rager:dishonorable:7": {
    archetypeId: "barbarianUnchained:untamed-rager",
    name: "Dishonorable",
    level: 7,
    bucket: "numeric",
    note: "scaling CMB/CMD bonus vs. dirty trick, unconditional from 7th — now expressible via Change.maneuverCategories (maneuver-categories.ts), wired in BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED; paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed",
  },
  "barbarianUnchained:untamed-rager:feral-appearance:3": {
    archetypeId: "barbarianUnchained:untamed-rager",
    name: "Feral Appearance",
    level: 3,
    bucket: "numeric",
    note: "fully general, unconditional Intimidate scaling bonus — no dropped clauses",
  },

  // ── Urban Barbarian ────────────────────────────────────────────────────
  "barbarianUnchained:urban-barbarian:controlled-rage:1": {
    archetypeId: "barbarianUnchained:urban-barbarian",
    name: "Controlled Rage",
    level: 1,
    bucket: "subsystem",
    note: "same content chained barbarian's own hand-verified archetype-effects.ts entry covers (filed under the barbarian tag only, not barbarianUnchained) — rage's ability bonuses aren't auto-applied anywhere in this engine, nothing baseline to override, so there is nothing numeric to extract regardless of which tag would host it",
  },
  "barbarianUnchained:urban-barbarian:crowd-control:1": {
    archetypeId: "barbarianUnchained:urban-barbarian",
    name: "Crowd Control",
    level: 1,
    bucket: "situational",
    note: "attack/AC bonus scoped to being adjacent to 2+ enemies + an Intimidate bonus scoped to influencing crowds — both combat/action-state scoped; unpaired swap of fast movement",
  },
  "barbarianUnchained:urban-barbarian:greater-controlled-rage:11": {
    archetypeId: "barbarianUnchained:urban-barbarian",
    name: "Greater Controlled rage",
    level: 11,
    bucket: "subsystem",
    note: "bumps Controlled Rage's morale bonus tier (already summarized in that hand-verified entry's static detail string) — rage's ability bonuses aren't auto-applied, nothing to override",
  },
  "barbarianUnchained:urban-barbarian:mighty-conrtolled-rage:20": {
    archetypeId: "barbarianUnchained:urban-barbarian",
    name: "Mighty Conrtolled rage",
    level: 20,
    bucket: "subsystem",
    note: 'same as Greater Controlled Rage, final tier — nothing to override (vendored id/name both carry a "Conrtolled" typo, left as-is since it\'s the real RefEntity id)',
  },

  // ── Wild Rager ─────────────────────────────────────────────────────────
  "barbarianUnchained:wild-rager:rage-conversion:5": {
    archetypeId: "barbarianUnchained:wild-rager",
    name: "Rage Conversion",
    level: 5,
    bucket: "subsystem",
    note: "mind-affecting-save reroll into an alternate rage/confusion effect — conditional ability, no flat number",
  },
  "barbarianUnchained:wild-rager:uncontrolled-rage:1": {
    archetypeId: "barbarianUnchained:wild-rager",
    name: "Uncontrolled Rage",
    level: 1,
    bucket: "subsystem",
    note: "adds a confusion-risk mechanic to rage without touching rounds/day cadence — no number",
  },
  "barbarianUnchained:wild-rager:wild-fighting:2": {
    archetypeId: "barbarianUnchained:wild-rager",
    name: "Wild Fighting",
    level: 2,
    bucket: "subsystem",
    note: 'grants a whole extra full-attack-action attack with accompanying attack/AC penalties — no single Change target represents "one extra attack this round"',
  },

  // ── Wildborn ───────────────────────────────────────────────────────────
  "barbarianUnchained:wildborn:damage-reduction:7": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Damage reduction",
    level: 7,
    bucket: "numeric",
    note: "literal Damage Reduction reflavor, same progression as the hardcoded barbarianDamageReduction table — extracted here (no hand-verified archetype-effects.ts entry exists under the barbarianUnchained tag, unlike chained barbarian's own Wildborn)",
  },
  "barbarianUnchained:wildborn:illiteracy:1": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Illiteracy",
    level: 1,
    bucket: "subsystem",
    note: "flavor restriction — no number",
  },
  "barbarianUnchained:wildborn:rage-power:4": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Rage power",
    level: 4,
    bucket: "subsystem",
    note: "the base Rage Powers text with this archetype's own Bonus Feat text appended verbatim (a vendored duplicate of this archetype's own Bonus Feat entry below) — bonus-feat-or-rage-power choice list, rage powers are prose-only, no per-power modeling",
  },
  "barbarianUnchained:wildborn:bonus-feat:4": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "vendored duplicate of the Bonus Feat clause embedded in this archetype's own Rage power entry above (identical text, split out under its own id) — lets a wildborn take a feat from a fixed list INSTEAD OF a new rage power at 4th/10th/16th, a pick-list swap option, not an additive feat count",
  },
  "barbarianUnchained:wildborn:inexhaustible:7": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Inexhaustible",
    level: 7,
    bucket: "blocked",
    note: "doubles 'her damage reduction gained from barbarian levels' specifically against nonlethal damage — the same nonlethal-qualifier nuance the Invulnerable Rager entry above already drops as unmodeled (no dr.nonlethal-stacks-additively convention exists), and doubling a value that itself comes from this archetype's own Damage reduction entry above risks reproducing it wrong rather than composing it correctly; the rest-recovery-rate half has no matching target either. Also carries the same pairedBaseFeatureUuid as this archetype's own Damage reduction entry (both claim to replace the base Damage Reduction feature) — a vendored-data anomaly, not a suppression bug (activeArchetypeSwaps only needs one match).",
  },
  "barbarianUnchained:wildborn:live-off-the-land:3": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Live Off the Land",
    level: 3,
    bucket: "situational",
    note: "half-level Survival bonus scoped to hunting/gathering food specifically, plus a Fortitude save bonus scoped to extreme-temperature/environmental effects — both action- and effect-type scoped, same bar Jungle Endurance's own vs.-hot-weather Fortitude bonus fails elsewhere in this file",
  },
  "barbarianUnchained:wildborn:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarianUnchained:wildborn",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency + two bonus feats grant — no numeric target",
  },
};

/**
 * ── BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────
 *
 * The `numeric`-bucket subset of the classification table above (20 ids),
 * given a real `Change`. Unlike `./barbarian.ts` — which excludes three ids
 * covered by `archetype-effects.ts`'s hand-verified table under the
 * `barbarian:` tag — every numeric id for THIS class is extracted here,
 * because `archetype-effects.ts` has no `barbarianUnchained:` keys at all
 * (see this file's header comment). Three entries below (Invulnerable
 * Rager's Invulnerability, Savage Barbarian's Natural Toughness, Wildborn's
 * Damage reduction) port their `Change`/formula directly from that
 * hand-verified table's own chained-barbarian entries, since the underlying
 * rules text is byte-identical.
 */
export const BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Armored Hulk's "Improved Armored Swiftness" (Ultimate Combat p. 5) is a
  // near-literal Fast-Movement-shaped grant — +10 ft. land speed gated on
  // wearing any armor (not just light/none) and not carrying a heavy load,
  // same `@attributes.encumbrance.level` idiom the vendored Fast Movement
  // Change uses. Replaces improved uncanny dodge, which carries no vendored
  // `changes` upstream — nothing to suppress.
  "barbarianUnchained:armored-hulk:improved-armored-swiftness:5": {
    changes: [
      c(
        "if(and(gte(@armor.type, 1), lt(@attributes.encumbrance.level, 2)), 10)",
        "landSpeed",
        "base",
      ),
    ],
    detail: () => "+10 ft. land speed (any armor, no heavy load)",
    confidence: "high",
    provenance:
      "an armored hulk's land speed is faster than the norm for her race by +10 feet. This " +
      "benefit applies when she is wearing any armor, including heavy armor, but not while " +
      "carrying a heavy load.",
  },

  // Cave Dweller's "Tunnel Vision" grants unconditional darkvision 60 ft. —
  // `sensedv` is a real applied sense target (senses.ts). The companion "+1
  // Perception (increasing every 3 levels) while in darkness" clause is
  // scoped to an environment condition the engine can't check and is
  // dropped, flagged per the medium-confidence rubric (mixed-feature
  // precedent: extract the unconditional clause, note the rest).
  "barbarianUnchained:cave-dweller:tunnel-vision:3": {
    changes: [c("60", "sensedv")],
    detail: () => "Darkvision 60 ft. (Perception-in-darkness bonus not modeled)",
    confidence: "medium",
    provenance: "She gains darkvision to a range of 60 feet",
  },

  // Deepwater Rager's "Strong Lungs" (Blood of the Sea) adds Con modifier to
  // Intimidate checks ON TOP OF the normal Cha modifier already baked into
  // the Intimidate skill computation — an always-on ability-mod stack, same
  // `@abilities.<id>.mod` idiom the hand-verified table's bloodline entries
  // use. The "as long as she is able to speak" qualifier is dropped (a rare
  // edge case, same posture as ignoring "this ability requires patience or
  // concentration"-style caveats elsewhere in this engine).
  "barbarianUnchained:deepwater-rager:strong-lungs:1": {
    changes: [c("@abilities.con.mod", "skill.int")],
    detail: () => "+Con mod Intimidate (stacks with Cha)",
    confidence: "medium",
    provenance:
      "as long as she is able to speak, the deepwater rager adds her Constitution modifier " +
      "to Intimidate skill checks in addition to her Charisma modifier.",
  },

  // Fearsome Defender's "Bloodlust" (Legacy of the First World) adds Cha
  // modifier to initiative checks — an always-on ability-mod bonus. The
  // companion "always acts during the surprise round" clause has no numeric
  // target (initiative order rules aren't modeled) and is dropped, flagged
  // here per the medium-confidence rubric.
  "barbarianUnchained:fearsome-defender:bloodlust:5": {
    changes: [c("@abilities.cha.mod", "init")],
    detail: () => "+Cha mod initiative (also always acts in the surprise round)",
    confidence: "medium",
    provenance:
      "She adds her Charisma modifier to initiative checks and always acts during the " +
      "surprise round.",
  },

  // Fearsome Defender's "Silent Threat" (Legacy of the First World) grants a
  // general, unconditional Intimidate bonus (+1 at 3rd, +1 every 3 levels
  // thereafter) — the companion "DCs of Intimidate checks to demoralize her
  // allies increase" clause imposes a DC on OTHERS' checks (no self-facing
  // target exists for it) and is dropped, flagged per the medium-confidence
  // rubric.
  "barbarianUnchained:fearsome-defender:silent-threat:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.int")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Intimidate`,
    confidence: "medium",
    provenance:
      "The fearsome defender gains a +1 bonus on Intimidate checks, and the DCs of " +
      "Intimidate checks to demoralize her allies within 30 feet increase by 1. Both the " +
      "bonus and the increase to DCs increase by 1 at 6th level and every 3 barbarian " +
      "levels thereafter.",
  },

  // Invulnerable Rager's "Invulnerability" (Advanced Player's Guide p. 18)
  // grants DR/— equal to half class level. Formula ported from chained
  // barbarian's own hand-verified `archetype-effects.ts` entry (identical
  // rules text; no `barbarianUnchained` entry exists there to defer to
  // instead). The "doubled against nonlethal damage" clause is dropped as
  // unmodeled (no qualifier-scoped DR-doubling convention exists), same as
  // the chained entry — flagged in `detail`. Also folds in uncanny
  // dodge/improved uncanny dodge, both nothing to suppress.
  "barbarianUnchained:invulnerable-rager:invulnerability:2": {
    changes: [c("floor(@class.unlevel / 2)", "dr")],
    detail: (level) => `DR ${Math.floor(level / 2)}/— (×2 vs. nonlethal, not modeled)`,
    confidence: "high",
    provenance:
      "the invulnerable rager gains DR/— equal to half her barbarian level. This damage " +
      "reduction is doubled against nonlethal damage.",
  },

  // Invulnerable Rager's "Extreme Endurance" (Advanced Class Guide p. 27) is
  // a fire-or-cold pick made when the feature is gained — identical rules
  // text to chained barbarian's own entry (see `./barbarian.ts`), wired via
  // the same `archetypeFeature:<id>` pick-choice mechanism. `changes` stays
  // empty; both `choiceChanges` branches share the identical scaling
  // formula, targeting the chosen energy's `eres.<type>`.
  "barbarianUnchained:invulnerable-rager:extreme-endurance:3": {
    changes: [],
    choice: {
      label: "Energy type",
      options: [
        { id: "fire", label: "Fire" },
        { id: "cold", label: "Cold" },
      ],
    },
    choiceChanges: {
      fire: [c("max(0, floor((@class.unlevel - 3) / 3))", "eres.fire")],
      cold: [c("max(0, floor((@class.unlevel - 3) / 3))", "eres.cold")],
    },
    detail: (level) =>
      `fire or cold resistance ${Math.max(0, Math.floor((level - 3) / 3))} (choice stored per pick)`,
    confidence: "high",
    provenance:
      "the invulnerable rager is inured to either hot or cold climate effects (choose one) as " +
      "if using endure elements. In addition, the barbarian gains 1 point of fire or cold " +
      "resistance for every three levels beyond 3rd.",
  },

  // Pack Rager's "Bonus Feat" (Ultimate Wilderness) grants a bonus teamwork
  // feat at 2nd level and every 4 levels thereafter — a clean, unconditional
  // feat-count formula, same shape as Cleric Crusader's bonus-feat entry
  // already hand-verified in archetype-effects.ts. The "must also be a
  // combat feat" restriction is dropped (feat choices aren't gated by list
  // anywhere in this engine), same posture as the ranger combat-style-feat
  // entries in that same table.
  "barbarianUnchained:pack-rager:bonus-feat:2": {
    changes: [c("1 + floor((@class.unlevel - 2) / 4)", "bonusFeats")],
    detail: (level) =>
      `${1 + Math.floor((level - 2) / 4)} bonus teamwork feat(s) (combat feat list)`,
    confidence: "high",
    provenance:
      "At 2nd level and every 4 levels thereafter, the pack rager can take a bonus teamwork feat.",
  },

  // Savage Barbarian's "Naked Courage" (Ultimate Combat p. 18) grants a
  // dodge AC bonus while wearing no armor — same `@armor.type` idiom this
  // archetype's own Natural Toughness entry below uses. The companion "+1
  // morale bonus on saves against fear" clause is scoped to fear
  // specifically (same bar traits.ts's courageous/birthmark entries fail)
  // and is dropped, flagged per the medium-confidence rubric.
  "barbarianUnchained:savage-barbarian:naked-courage:3": {
    changes: [c("if(lt(@armor.type, 1), 1 + floor((@class.unlevel - 3) / 6), 0)", "ac", "dodge")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 6)} dodge AC (no armor worn)`,
    confidence: "medium",
    provenance:
      "the savage barbarian gains a +1 dodge bonus to AC and a +1 morale bonus on saving " +
      "throws against fear when wearing no armor (shields are allowed). This bonus " +
      "increases by +1 for every six levels after 3rd.",
  },

  // Savage Barbarian's "Natural Toughness" (Ultimate Combat p. 18) replaces
  // Damage Reduction with a scaling natural armor bonus while wearing no
  // armor (shields still allowed) — +1 at 7th, +1 every 3 levels thereafter.
  // Formula ported from chained barbarian's own hand-verified
  // `archetype-effects.ts` entry (identical rules text; no
  // `barbarianUnchained` entry exists there to defer to instead). `nac`/type
  // "base" matches the vendored natural-armor convention so it correctly
  // doesn't stack with another natural-armor source.
  "barbarianUnchained:savage-barbarian:natural-toughness:7": {
    changes: [c("if(lt(@armor.type, 1), 1 + floor((@class.unlevel - 7) / 3), 0)", "nac", "base")],
    detail: (level) => `+${1 + Math.floor((level - 7) / 3)} natural armor (no armor worn)`,
    confidence: "high",
    provenance:
      "the savage barbarian gains a +1 natural armor bonus to AC when wearing no armor " +
      "(shields are allowed). This bonus increases by +1 for every three levels beyond 7th.",
  },

  // Sharptooth's "Scent of Blood (Scent)" (Blood of the Sea) grants the
  // universal-monster-rule Scent ability, unconditionally, at 2nd level —
  // `sensesc` is a real applied sense target (senses.ts), extracted as the
  // same flag-shaped `c("1", "sensesc")` idiom `rage-powers.ts`'s own Scent
  // rage power and `psychic-disciplines.ts` already use (Scent has no RAW
  // fixed range to model as a distance). The 5th-level "Keen Scent" upgrade
  // (doubles an existing scent's range) has nothing to double under that
  // idiom and stays classified `subsystem`.
  "barbarianUnchained:sharptooth:scent-of-blood-scent:2": {
    changes: [c("1", "sensesc")],
    detail: () => "Scent",
    confidence: "high",
    provenance: "At 2nd level, a sharptooth gains scent as per the universal monster rule.",
  },

  // Sharptooth's "Scent of Blood" is a vendored duplicate of the split
  // "Scent of Blood (Scent)" entry above — identical combined text, same
  // 2nd-level gate, so extracting the same Scent grant under this id is
  // harmless even if a future integration pass wires both (sense resolution
  // is highest-wins, not additive).
  "barbarianUnchained:sharptooth:scent-of-blood:2": {
    changes: [c("1", "sensesc")],
    detail: () => "Scent",
    confidence: "high",
    provenance: "At 2nd level, a sharptooth gains scent as per the universal monster rule.",
  },

  // Sharptooth's "Swim Like a Fish" grants a swim speed outright, so the
  // swimSpeed/"base"/"set" idiom applies rather than an additive bonus. The
  // 5-level step is uncapped in the prose; 20th level is where it stops
  // mattering in play (30 ft.).
  "barbarianUnchained:sharptooth:swim-like-a-fish:1": {
    changes: [
      {
        formula: "10 + 5 * floor(@class.unlevel / 5)",
        target: "swimSpeed",
        type: "base",
        operator: "set",
      },
    ],
    detail: (level) => `swim speed ${10 + 5 * Math.floor(level / 5)} ft.`,
    confidence: "high",
    provenance:
      "A sharptooth gains a swim speed of 10 feet. At 5th level and every 5 levels " +
      "thereafter, her swim speed increases by 5 feet.",
  },

  // Superstitious's "Keen Senses" is split across five separately-leveled
  // ids in the vendored data, one per sense tier — each gated purely by the
  // character reaching that id's own `level` (the normal archetype-feature
  // mechanism), so each gets its own clean, ungated Change. Low-light vision
  // (7th) is a flag sense (`sensell`), matching `racial-traits.ts`'s own
  // idiom.
  "barbarianUnchained:superstitious:keen-senses-low-light-vision:7": {
    changes: [c("1", "sensell")],
    detail: () => "Low-light vision",
    confidence: "high",
    provenance: "the superstitious barbarian gains low-light vision",
  },

  // Darkvision (10th) is the one tier phrased as "gain X, or +X to existing
  // darkvision" — senses.ts's documented `operator: "add"` idiom (extend the
  // winner instead of competing for it) reproduces both halves from a single
  // formula, the same shape Lesser Moon Totem and the shifter's Wolf aspect
  // already use. `c()` doesn't carry an `operator` field, so this entry is a
  // full Change literal rather than a `c(...)` call.
  "barbarianUnchained:superstitious:keen-senses-darkvision:10": {
    changes: [{ formula: "60", target: "sensedv", type: "untyped", operator: "add" }],
    detail: () => "Darkvision 60 ft. (or +60 ft. to existing darkvision)",
    confidence: "high",
    provenance:
      "she gains darkvision 60 feet (or adds 60 feet to the range of any darkvision already " +
      "possessed)",
  },

  // Scent (13th) — same flag-sense idiom as the 7th-level tier above.
  "barbarianUnchained:superstitious:keen-senses-scent:13": {
    changes: [c("1", "sensesc")],
    detail: () => "Scent",
    confidence: "high",
    provenance: "she gains scent",
  },

  // Blindsense 30 ft. (16th) — a flat ranged-sense grant, `sensebse`.
  "barbarianUnchained:superstitious:keen-senses-blindsense-30ft:16": {
    changes: [c("30", "sensebse")],
    detail: () => "Blindsense 30 ft.",
    confidence: "high",
    provenance: "she gains blindsense 30 feet",
  },

  // Blindsight 30 ft. (19th) — a flat ranged-sense grant, `sensebs`.
  "barbarianUnchained:superstitious:keen-senses-blindsight-30ft:19": {
    changes: [c("30", "sensebs")],
    detail: () => "Blindsight 30 ft.",
    confidence: "high",
    provenance: "she gains blindsight 30 feet",
  },

  // Superstitious's "Sixth Sense" (Blood of the Moon) grants a general,
  // unconditional initiative bonus (+1 at 3rd, +1 every 3 levels
  // thereafter). The companion "+1 insight bonus to AC during surprise
  // rounds" clause is scoped to a specific combat-timing state (surprise
  // rounds only) and is dropped, flagged per the medium-confidence rubric.
  "barbarianUnchained:superstitious:sixth-sense:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "init")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} initiative`,
    confidence: "medium",
    provenance:
      "the superstitious barbarian gains a +1 bonus on initiative and a +1 insight bonus " +
      "to AC during surprise rounds. This bonus increases by +1 for every three levels " +
      "after 3rd.",
  },

  // Untamed Rager's "Feral Appearance" (Blood of the Night) grants a fully
  // general, unconditional Intimidate bonus (+1 at 3rd, +1 every 3 levels
  // thereafter) — no second clause to drop, the cleanest extraction in this
  // slice.
  "barbarianUnchained:untamed-rager:feral-appearance:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.int")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Intimidate`,
    confidence: "high",
    provenance:
      "the untamed rager gains a +1 bonus on Intimidate checks. This bonus increases by 1 " +
      "every 3 barbarian levels thereafter.",
  },

  // Untamed Rager's "Dishonorable" (Change.maneuverCategories — mirrors the
  // chained barbarian's identically-worded feature in ./barbarian.ts).
  "barbarianUnchained:untamed-rager:dishonorable:7": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 7), 1 + floor((@class.unlevel - 7) / 3), 0)",
        target: "cmb",
        type: "untyped",
        maneuverCategories: ["dirtyTrick"],
      },
      {
        formula: "if(gte(@class.unlevel, 7), 1 + floor((@class.unlevel - 7) / 3), 0)",
        target: "cmd",
        type: "untyped",
        maneuverCategories: ["dirtyTrick"],
      },
    ],
    detail: (level) =>
      level >= 7
        ? `+${1 + Math.floor((level - 7) / 3)} CMB/CMD vs. dirty trick`
        : "not yet granted",
    confidence: "high",
    provenance:
      "At 7th level and every 3 barbarian levels thereafter, the untamed rager gains a +1 " +
      "bonus on combat maneuver checks when performing dirty tricks and to her CMD to resist " +
      "others' dirty tricks. This ability replaces damage reduction.",
  },

  // Wildborn's "Damage reduction" (Blood of the Beast) replaces the base
  // Damage Reduction class feature with an identical progression (1/— at
  // 7th, +1 every 3 levels) — a pure reflavor, same numbers as
  // `tables.ts`'s `barbarianDamageReduction`. Formula ported from chained
  // barbarian's own hand-verified `archetype-effects.ts` entry (identical
  // rules text; no `barbarianUnchained` entry exists there to defer to
  // instead).
  "barbarianUnchained:wildborn:damage-reduction:7": {
    changes: [c("1 + floor((@class.unlevel - 7) / 3)", "dr")],
    detail: (level) => `DR ${1 + Math.floor((level - 7) / 3)}/—`,
    confidence: "high",
    provenance:
      "a barbarian gains damage reduction. Subtract 1 from the damage the barbarian takes " +
      "each time she is dealt damage from a weapon or a natural attack. At 10th level, and " +
      "every three barbarian levels thereafter (13th, 16th, and 19th level), this damage " +
      "reduction rises by 1 point.",
  },
};
