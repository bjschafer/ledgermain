/**
 * Barbarian's slice of the issue #45 batch-extraction pipeline (2026-07-06),
 * repeating the fighter pilot's exact methodology (`./fighter.ts`) for the 40
 * vendored barbarian archetypes / 149 archetype features. Per the per-class
 * file convention (`./index.ts`'s doc comment), this file owns BOTH of
 * barbarian's pipeline artifacts — `BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED`
 * (the machine-extracted `Change`-shaped effects table) and
 * `BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) —
 * so a future wave working on a different class never has a reason to touch
 * this file; only `index.ts` (the aggregator, out of scope for this wave —
 * see below) needs one new import + one new spread per class.
 *
 * ── BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION ────────────────────────────
 *
 * Every feature of every vendored barbarian archetype, read in full (not
 * heuristically, unlike the fighter pilot's 383-feature bulk pass — 149
 * features is small enough to read exhaustively) and bucketed as `numeric` /
 * `situational` / `subsystem` / `blocked` per the same rubric fighter.ts
 * established:
 *  - "numeric": an unconditional (or armor-state-gated, `@armor.type`-style)
 *    bonus expressible via a real `packages/engine/src/targets.ts` target.
 *  - "situational": a REAL number scoped to a specific maneuver, weapon,
 *    enemy state/type, terrain, or rage-state condition the engine can't
 *    check without over-applying — vendored prose stays the source of truth.
 *  - "subsystem": grants an unrelated ability/resource/proficiency/choice
 *    list, imposes an effect on a FOE rather than a bonus to self, or
 *    removes a penalty this engine never modeled (bleed, terrain
 *    difficulty, grapple penalties, hardness, reach, crit-confirm — none of
 *    these have an `APPLIED_TARGET`) — no Change-shaped number to extract.
 *  - "blocked": a genuine composition trap, recorded rather than guessed at.
 *    Two shapes occur in this class's data (see the barbarian-specific
 *    mechanical notes this wave was briefed with):
 *      1. A feature that changes barbarian Rage's ROUNDS/DAY count or
 *         cadence (a flat reduction, an effective-level shift, or a
 *         triggered per-kill/per-hit "gain N rounds" mechanic) — any of
 *         these would double-count or fight the vendored Rage
 *         `uses.maxFormula` (`4 + @abilities.con.mod + (2 * (@class.unlevel
 *         - 1))`) already applied generically by `deriveResourcePools`.
 *         Recorded, not modeled.
 *      2. A suspected vendored-data issue: an UNPAIRED feature whose prose
 *         either (a) is a byte-identical reflavor of a base class feature
 *         the pairing script should have linked (Sharptooth's "Swim Like a
 *         Fish" vs. Fast Movement), or (b) restates the base Damage
 *         Reduction progression verbatim with no "this ability replaces…"
 *         language at all and a `level` field that contradicts its own
 *         prose (Jungle Rager's "Damage reduction" entry) — extracting a
 *         number for either risks sitting on top of a base grant this table
 *         has no way to confirm is actually suppressed. See the report notes
 *         for the specific ids.
 *
 * Precedent this pass leaned on:
 *  - Fast Movement (base L1) carries a real vendored Change (`landSpeed`,
 *    type "base", gated on `@armor.type<=1` and not encumbered) but is a
 *    SINGLE flat grant at ONE level (not tiered like fighter's Armor
 *    Training) — a clean 1:1 `pairedBaseFeatureUuid` swap is already
 *    suppressed for free by `activeArchetypeSwaps`/`collect.ts`, so this
 *    pass never needed a `blocked` entry purely for "replaces fast
 *    movement" the way fighter needed one for partial-tier Armor Training.
 *    Most "replaces fast movement" features in this data are themselves
 *    `situational`/`subsystem` (maneuver/enemy-state-scoped, or a whole
 *    unrelated ability), so there was nothing to extract that could clash
 *    with the base grant either way — noted per-entry where relevant.
 *  - Trap Sense (base L3) carries an EMPTY vendored `changes: []` — nothing
 *    to suppress, ever, so a Trap-Sense-replacing feature's own bucket is
 *    decided purely on its own textual merits (most land on `situational`
 *    anyway, matching Trap Sense's own real-world "vs. traps only" scoping).
 *  - Damage Reduction (base L7, hardcoded in `tables.ts`, gated by
 *    `archetypes.ts`'s `barbarianDamageReductionReplaced`) is suppressed for
 *    free on any clean 1:1 paired swap (several of this class's DR-replacing
 *    features are exactly that — Cave Dweller, Superstitious, Untamed
 *    Rager, Pack Rager all pair cleanly to "Damage Reduction" and grant
 *    something with no number to extract, so the base DR just disappears,
 *    correctly, with no table entry needed here). The already-hand-curated
 *    `AMBIGUOUS_DR_REPLACEMENTS` map (`archetypes.ts`) only covers
 *    Invulnerable Rager today; this pass found one more UNPAIRED candidate
 *    worth flagging (Jungle Rager, see above) but did not add it (out of
 *    scope — `archetypes.ts` is owned by the integration step).
 *  - Rage's ability-score bonuses (Str/Con/Dex) are NOT auto-applied
 *    anywhere in this engine (a manual player-toggled buff, same posture as
 *    ki/grit/panache) — confirmed via the existing Urban Barbarian hand
 *    table entry's own doc comment (`archetype-effects.ts`). Every feature
 *    in this data that merely reflavors WHICH ability rage boosts, or by
 *    how much, is `subsystem` for the same reason: there is no baseline
 *    number to override. Rage Powers themselves are prose-only picks with
 *    no per-power Change modeling in this engine at all, so any feature that
 *    swaps/grants/restricts rage powers is also `subsystem`.
 *
 * Methodology note (disclosed, same posture as fighter.ts): every one of the
 * 149 features was read in full against its vendored `description` prose
 * (HTML tags stripped mentally, never transcribed) — no heuristic bulk pass
 * was used for this class, so the `situational`/`subsystem` split carries the
 * same individual-judgment weight as the `numeric`/`blocked` buckets do.
 *
 * NOT re-added here: the four barbarian ids already hand-verified in
 * `archetype-effects.ts` (`barbarian:urban-barbarian:controlled-rage-ex:1`,
 * `barbarian:invulnerable-rager:invulnerability-ex:2`,
 * `barbarian:savage-barbarian:natural-toughness-1:7`,
 * `barbarian:wildborn:damage-reduction:7`) still get a classification entry
 * below (covering EVERY feature, matching fighter.ts's own posture of
 * classifying its hand-verified ids too) but are never duplicated into
 * `BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED` — `resolveArchetypeFeatureEffect`
 * already prefers the hand-verified table, and a second, different-shaped
 * entry here would just be confusing, not additive.
 *
 * Wiring note: per the task boundary for this wave, `./index.ts` (the
 * aggregator) is NOT touched by this file — a later integration pass wires
 * `BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED`/`BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION`
 * into the merged production tables the same one-import-one-spread way
 * fighter's are wired in today. Until that happens, `compute()` does not yet
 * apply this file's `changes` (see this class's fixture test file for how it
 * verifies the extracted formulas directly instead of via the full
 * `collect.ts` pipeline).
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── Armored Hulk ───────────────────────────────────────────────────────
  "barbarian:armored-hulk:armored-swiftness-ex:2": {
    archetypeId: "barbarian:armored-hulk",
    name: "Armored Swiftness (Ex)",
    level: 2,
    bucket: "numeric",
    note: "+5 ft. land speed while wearing medium/heavy armor (@armor.type gated) — replaces uncanny dodge, which carries nothing to suppress",
  },
  "barbarian:armored-hulk:improved-armored-swiftness:5": {
    archetypeId: "barbarian:armored-hulk",
    name: "Improved Armored Swiftness",
    level: 5,
    bucket: "numeric",
    note: "+10 ft. land speed in any armor short of a heavy load — literal Fast-Movement-shaped condition, paired to Improved Uncanny Dodge (nothing to suppress)",
  },
  "barbarian:armored-hulk:indomitable-stance-ex:1": {
    archetypeId: "barbarian:armored-hulk",
    name: "Indomitable Stance (Ex)",
    level: 1,
    bucket: "situational",
    note: "real numbers, but each scoped to a specific maneuver (overrun), a specific save (vs. trample), or a specific enemy state (charging) — unpaired swap of fast movement, whose own real Change stays unsuppressed either way since nothing here is added on top",
  },
  "barbarian:armored-hulk:resilience-of-steel-1:3": {
    archetypeId: "barbarian:armored-hulk",
    name: "Resilience of Steel (+1)",
    level: 3,
    bucket: "subsystem",
    note: "AC bonus scoped to critical-hit-confirmation rolls only — `critConfirm` is a known vendored target string but is not in targets.ts's APPLIED_TARGETS, so no live Change is possible regardless of scoping",
  },
  "barbarian:armored-hulk:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarian:armored-hulk",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant — no numeric target",
  },

  // ── Beastkin Berserker ─────────────────────────────────────────────────
  "barbarian:beastkin-berserker:feral-transformation-su:4": {
    archetypeId: "barbarian:beastkin-berserker",
    name: "Feral Transformation (Su)",
    level: 4,
    bucket: "subsystem",
    note: "polymorph (beast shape I/II/III) — no numeric effect to model",
  },
  "barbarian:beastkin-berserker:savage-rapport-ex:1": {
    archetypeId: "barbarian:beastkin-berserker",
    name: "Savage Rapport (Ex)",
    level: 1,
    bucket: "situational",
    note: "half-level skill bonus scoped to checks involving a specific chosen animal kind — subject-scoped, engine can't check",
  },

  // ── Breaker ────────────────────────────────────────────────────────────
  "barbarian:breaker:battle-scavenger-1:3": {
    archetypeId: "barbarian:breaker",
    name: "Battle Scavenger (+1)",
    level: 3,
    bucket: "situational",
    note: "no attack penalty + damage bonus scoped to improvised/broken weapons specifically — weapon-condition scoped, not a real weapon-group",
  },
  "barbarian:breaker:destructive-ex:1": {
    archetypeId: "barbarian:breaker",
    name: "Destructive (Ex)",
    level: 1,
    bucket: "situational",
    note: "half-level damage bonus scoped to sunder combat maneuvers/unattended objects — maneuver-scoped; unpaired swap of fast movement, nothing added here to double-count against it",
  },

  // ── Brutal Pugilist ────────────────────────────────────────────────────
  "barbarian:brutal-pugilist:improved-savage-grapple-ex:5": {
    archetypeId: "barbarian:brutal-pugilist",
    name: "Improved Savage Grapple (Ex)",
    level: 5,
    bucket: "situational",
    note: "removes grappled-condition penalties + a size-treatment rule — condition-state scoped, no flat bonus",
  },
  "barbarian:brutal-pugilist:pit-fighter-1:3": {
    archetypeId: "barbarian:brutal-pugilist",
    name: "Pit Fighter (+1)",
    level: 3,
    bucket: "situational",
    note: "CMB/CMD bonus on a player-chosen combat maneuver — free-choice maneuver scoping, no generic maneuver target exists",
  },
  "barbarian:brutal-pugilist:savage-grapple-ex:2": {
    archetypeId: "barbarian:brutal-pugilist",
    name: "Savage Grapple (Ex)",
    level: 2,
    bucket: "situational",
    note: "halves grappled-condition penalties + a +2 CMD bonus scoped to a specific attack-of-opportunity-vs-grapple scenario — maneuver/action scoped",
  },

  // ── Brutish Swamper ────────────────────────────────────────────────────
  "barbarian:brutish-swamper:home-2:2": {
    archetypeId: "barbarian:brutish-swamper",
    name: "Home (+2)",
    level: 2,
    bucket: "situational",
    note: 'initiative + skill bonuses scoped to "in swamps" — terrain condition the engine can\'t check',
  },
  "barbarian:brutish-swamper:marsh-march-ex:1": {
    archetypeId: "barbarian:brutish-swamper",
    name: "Marsh March (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "removes swamp/bog terrain movement penalties this engine never modeled",
  },
  "barbarian:brutish-swamper:stubborn-2:3": {
    archetypeId: "barbarian:brutish-swamper",
    name: "Stubborn (-2)",
    level: 3,
    bucket: "situational",
    note: "vs.-traps-only save/AC bonus — same scoping bar Trap Sense's own real-world text fails",
  },
  "barbarian:brutish-swamper:wrastlin-ex:6": {
    archetypeId: "barbarian:brutish-swamper",
    name: "Wrastlin (Ex)",
    level: 6,
    bucket: "situational",
    note: "CMD/damage bonus scoped to grapple combat maneuvers while raging — maneuver- and rage-state-scoped",
  },

  // ── Cave Dweller ───────────────────────────────────────────────────────
  "barbarian:cave-dweller:sun-walker-1:7": {
    archetypeId: "barbarian:cave-dweller",
    name: "Sun Walker (+1)",
    level: 7,
    bucket: "situational",
    note: "AC/save bonus + penalty reduction scoped to light-descriptor effects specifically — effect-type scoped; paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed regardless of this feature's own bucket",
  },
  "barbarian:cave-dweller:tight-tunnels-ex:1": {
    archetypeId: "barbarian:cave-dweller",
    name: "Tight Tunnels (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "turning-radius rule + squeezing-penalty removal — no numeric target",
  },
  "barbarian:cave-dweller:tunnel-vision-1:3": {
    archetypeId: "barbarian:cave-dweller",
    name: "Tunnel Vision (+1)",
    level: 3,
    bucket: "situational",
    note: 'darkvision grant (subsystem-shaped) plus a Perception bonus scoped to "while in darkness" — environmental condition the engine can\'t check',
  },

  // ── Deepwater Rager ────────────────────────────────────────────────────
  "barbarian:deepwater-rager:crushing-grapple-ex:14": {
    archetypeId: "barbarian:deepwater-rager",
    name: "Crushing Grapple (Ex)",
    level: 14,
    bucket: "subsystem",
    note: "grants the constrict special attack — unrelated ability grant",
  },
  "barbarian:deepwater-rager:disorienting-grapple-ex:5": {
    archetypeId: "barbarian:deepwater-rager",
    name: "Disorienting Grapple (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "imposes sickened + a save on the grappled FOE — not a bonus to the character's own sheet",
  },
  "barbarian:deepwater-rager:full-lungs-ex:17": {
    archetypeId: "barbarian:deepwater-rager",
    name: "Full Lungs (Ex)",
    level: 17,
    bucket: "subsystem",
    note: "no breathing needed while raging — utility, no number",
  },
  "barbarian:deepwater-rager:spiraling-charge-ex:2": {
    archetypeId: "barbarian:deepwater-rager",
    name: "Spiraling Charge (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "charge-movement rule change — no numeric effect",
  },
  "barbarian:deepwater-rager:strong-lungs-ex:1": {
    archetypeId: "barbarian:deepwater-rager",
    name: "Strong Lungs (Ex)",
    level: 1,
    bucket: "numeric",
    note: "Con-mod-to-Intimidate half is a real, effectively-unconditional bonus (extracted); the hold-breath half has no numeric target",
  },

  // ── Dreadnought ────────────────────────────────────────────────────────
  "barbarian:dreadnought:dead-calm-ex:1": {
    archetypeId: "barbarian:dreadnought",
    name: "Dead Calm (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "alters rage's action economy/downsides (half bonuses, no AC penalty) — rage's ability bonuses aren't auto-applied in the first place, nothing baseline to override",
  },
  "barbarian:dreadnought:fearless-killer-su:14": {
    archetypeId: "barbarian:dreadnought",
    name: "Fearless Killer (Su)",
    level: 14,
    bucket: "subsystem",
    note: "binary fear immunity while raging — no number",
  },
  "barbarian:dreadnought:instant-dispassion-ex:17": {
    archetypeId: "barbarian:dreadnought",
    name: "Instant Dispassion (Ex)",
    level: 17,
    bucket: "subsystem",
    note: "rage re-entry timing rule — no number",
  },
  "barbarian:dreadnought:stead-gait-ex:1": {
    archetypeId: "barbarian:dreadnought",
    name: "Stead Gait (Ex)",
    level: 1,
    bucket: "situational",
    note: "save/CMD bonus scoped to effects that slow/immobilize specifically — effect-type scoped despite the level-based tier scaling being checkable",
  },

  // ── Drunken Brute ──────────────────────────────────────────────────────
  "barbarian:drunken-brute:raging-drunk-ex:1": {
    archetypeId: "barbarian:drunken-brute",
    name: "Raging Drunk (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "rage-round/alcohol resource-trade mechanic — no flat number",
  },

  // ── Drunken Rager ──────────────────────────────────────────────────────
  "barbarian:drunken-rager:drunken-rage-ex:1": {
    archetypeId: "barbarian:drunken-rager",
    name: "Drunken Rage (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "whole drunken-rage-point resource subsystem (occasionally spent for +20 ft. speed or +1 rage round) — unmodeled resource pool, not a static formula term; unpaired swap of fast movement",
  },
  "barbarian:drunken-rager:drunken-swing-ex:12": {
    archetypeId: "barbarian:drunken-rager",
    name: "Drunken Swing (Ex)",
    level: 12,
    bucket: "subsystem",
    note: "resource-point-gated, swift-action-activated crit-range increase for a single attack — activated ability, same posture as ki/grit/panache",
  },
  "barbarian:drunken-rager:improved-staggering-evasion-ex:5": {
    archetypeId: "barbarian:drunken-rager",
    name: "Improved Staggering Evasion (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "grants improved evasion, resource-gated — unrelated ability grant",
  },
  "barbarian:drunken-rager:staggering-evasion-ex:2": {
    archetypeId: "barbarian:drunken-rager",
    name: "Staggering Evasion (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "grants evasion, resource-gated — unrelated ability grant",
  },
  "barbarian:drunken-rager:tolerance-1:3": {
    archetypeId: "barbarian:drunken-rager",
    name: "Tolerance (+1)",
    level: 3,
    bucket: "situational",
    note: "save bonus scoped to nauseate/poison/sicken/addiction effects, also resource-gated — effect-type scoped",
  },

  // ── Elemental Kin ──────────────────────────────────────────────────────
  "barbarian:elemental-kin:elemental-fury:3": {
    archetypeId: "barbarian:elemental-kin",
    name: "Elemental Fury",
    level: 3,
    bucket: "blocked",
    note: 'triggered "gain +1 (scaling) round of rage when taking energy damage while raging" — a rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },

  // ── Fearsome Defender ──────────────────────────────────────────────────
  "barbarian:fearsome-defender:bloodlust-ex:5": {
    archetypeId: "barbarian:fearsome-defender",
    name: "Bloodlust (Ex)",
    level: 5,
    bucket: "numeric",
    note: "Cha-mod-to-initiative half is a real, unconditional ability-mod bonus (extracted); the always-acts-in-surprise-round half has no numeric target",
  },
  "barbarian:fearsome-defender:intractable-ex:1": {
    archetypeId: "barbarian:fearsome-defender",
    name: "Intractable (Ex)",
    level: 1,
    bucket: "situational",
    note: "save bonus scoped to pain effects specifically, plus a DC increase imposed on OTHERS' checks against her (no self-target exists for that half)",
  },
  "barbarian:fearsome-defender:off-the-leash-ex:2": {
    archetypeId: "barbarian:fearsome-defender",
    name: "Off the Leash (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "action-economy rule (draw weapon while raging) — no number",
  },
  "barbarian:fearsome-defender:silent-threat-1:3": {
    archetypeId: "barbarian:fearsome-defender",
    name: "Silent Threat (+1)",
    level: 3,
    bucket: "numeric",
    note: "general Intimidate half is a clean scaling bonus (extracted); the ally-demoralize-DC half has no self-target and is dropped, flagged in the extracted entry's detail",
  },

  // ── Feral Gnasher ──────────────────────────────────────────────────────
  "barbarian:feral-gnasher:greater-lockjaw-ex:9": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Greater Lockjaw (Ex)",
    level: 9,
    bucket: "subsystem",
    note: "grab-size-increment rule — no number",
  },
  "barbarian:feral-gnasher:impromptu-armament-ex:2": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Impromptu Armament (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "bonus feat + rage-power swap — feat/choice grants, no number",
  },
  "barbarian:feral-gnasher:improved-lockjaw-ex:6": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Improved Lockjaw (Ex)",
    level: 6,
    bucket: "subsystem",
    note: "grappled-condition immunity while controlling a grapple — condition removal, no number",
  },
  "barbarian:feral-gnasher:improvised-weapon-mastery-ex:2": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Improvised Weapon Mastery (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "bonus feat grant — no number",
  },
  "barbarian:feral-gnasher:lockjaw-ex:3": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Lockjaw (Ex)",
    level: 3,
    bucket: "subsystem",
    note: "grab ability on a bite attack — unrelated ability grant",
  },
  "barbarian:feral-gnasher:savage-bite-ex:1": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Savage Bite (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "grants a natural bite attack — natural-attack targets (nattack/ndamage) are not in targets.ts's APPLIED_TARGETS, so no live Change is possible; unpaired swap of fast movement",
  },
  "barbarian:feral-gnasher:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency LOSS list — no numeric target",
  },
  "barbarian:feral-gnasher:wicked-improvisation-1:12": {
    archetypeId: "barbarian:feral-gnasher",
    name: "Wicked Improvisation (+1)",
    level: 12,
    bucket: "situational",
    note: "damage bonus scoped to natural attacks/improvised weapons (neither is a real WEAPON_GROUPS slug) while raging (unmodeled live condition) — doubly scoped",
  },

  // ── Flesheater ─────────────────────────────────────────────────────────
  "barbarian:flesheater:feast-su:14": {
    archetypeId: "barbarian:flesheater",
    name: "Feast (Su)",
    level: 14,
    bucket: "subsystem",
    note: "expands which consumed creature's abilities can be emulated — choice flexibility, no number",
  },
  "barbarian:flesheater:one-flesh-su:2": {
    archetypeId: "barbarian:flesheater",
    name: "One Flesh (Su)",
    level: 2,
    bucket: "subsystem",
    note: "polymorph/ability-borrowing from a consumed creature — bundles uncanny dodge, improved uncanny dodge, and two rage powers into one unpaired swap, but none of those base grants carry a number this engine models anyway, so nothing to suppress or double-count",
  },
  "barbarian:flesheater:rage:1": {
    archetypeId: "barbarian:flesheater",
    name: "Rage",
    level: 1,
    bucket: "subsystem",
    note: "alters rage with an extra Int penalty while raging — rage's ability effects aren't auto-applied, nothing baseline to override",
  },
  "barbarian:flesheater:unbound-form-su:20": {
    archetypeId: "barbarian:flesheater",
    name: "Unbound Form (Su)",
    level: 20,
    bucket: "subsystem",
    note: "polymorph, replaces mighty rage — no number",
  },
  "barbarian:flesheater:unbound-rage-su:11": {
    archetypeId: "barbarian:flesheater",
    name: "Unbound Rage (Su)",
    level: 11,
    bucket: "subsystem",
    note: "rage-conditional enlarge-person-style size/Str bonus, replaces greater rage — rage bonuses aren't auto-applied, nothing to override",
  },

  // ── Geminate Invoker ───────────────────────────────────────────────────
  "barbarian:geminate-invoker:contemplative-ex:1": {
    archetypeId: "barbarian:geminate-invoker",
    name: "Contemplative (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "class skill additions + alignment rule — no number",
  },
  "barbarian:geminate-invoker:haunt-channeler-1:3": {
    archetypeId: "barbarian:geminate-invoker",
    name: "Haunt Channeler (+1)",
    level: 3,
    bucket: "subsystem",
    note: "haunt-damage special mechanic — no matching target",
  },
  "barbarian:geminate-invoker:spirit-conduit-su:4": {
    archetypeId: "barbarian:geminate-invoker",
    name: "Spirit Conduit (Su)",
    level: 4,
    bucket: "subsystem",
    note: "grants a rage power via trance — rage powers are prose-only picks with no per-power modeling",
  },
  "barbarian:geminate-invoker:trance-ex:1": {
    archetypeId: "barbarian:geminate-invoker",
    name: "Trance (Ex)",
    level: 1,
    bucket: "subsystem",
    note: 'whole alternate-rage ("trance") subsystem with its own ability bonuses — same posture as rage\'s own unmodeled ability bonuses',
  },

  // ── Giant Stalker ──────────────────────────────────────────────────────
  "barbarian:giant-stalker:giant-baiter-1:3": {
    archetypeId: "barbarian:giant-stalker",
    name: "Giant Baiter (+1)",
    level: 3,
    bucket: "situational",
    note: "AC bonus scoped to a specific baited-giant enemy state — enemy-state scoped",
  },
  "barbarian:giant-stalker:harangue-giant-ex:2": {
    archetypeId: "barbarian:giant-stalker",
    name: "Harangue Giant (Ex)",
    level: 2,
    bucket: "situational",
    note: "Intimidate bonus scoped to speaking Giant while raging — double-conditional (language + live rage state)",
  },
  "barbarian:giant-stalker:smell-giants-ex:2": {
    archetypeId: "barbarian:giant-stalker",
    name: "Smell Giants (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "scent vs. a specific creature subtype — special-sense grant, no number",
  },

  // ── Hateful Rager ──────────────────────────────────────────────────────
  "barbarian:hateful-rager:amplified-by-hate-ex:9": {
    archetypeId: "barbarian:hateful-rager",
    name: "Amplified by Hate (Ex)",
    level: 9,
    bucket: "situational",
    note: "DC bonus to rage powers used against a favored enemy — scoped to enemy type + rage-power mechanic, and rage powers/save DCs aren't modeled targets anyway",
  },
  "barbarian:hateful-rager:favored-enemy-ex:2": {
    archetypeId: "barbarian:hateful-rager",
    name: "Favored Enemy (Ex)",
    level: 2,
    bucket: "situational",
    note: "ranger favored-enemy analog — real numbers scoped to a chosen enemy type, engine can't check target creature type",
  },
  "barbarian:hateful-rager:feed-the-rage-ex:5": {
    archetypeId: "barbarian:hateful-rager",
    name: "Feed the Rage (Ex)",
    level: 5,
    bucket: "blocked",
    note: 'triggered "gain 1 round of rage per favored enemy defeated" — rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },
  "barbarian:hateful-rager:reduced-rage:2": {
    archetypeId: "barbarian:hateful-rager",
    name: "Reduced Rage",
    level: 2,
    bucket: "blocked",
    note: "directly reduces the per-level rage-round increment from 2 to 1 — a literal rounds/day formula change that would need to override, not add to, vendored Rage uses.maxFormula",
  },

  // ── Hurler ─────────────────────────────────────────────────────────────
  "barbarian:hurler:skilled-thrower:1": {
    archetypeId: "barbarian:hurler",
    name: "Skilled Thrower",
    level: 1,
    bucket: "subsystem",
    note: "+10 ft. thrown weapon range increment — no engine target models range increments (same gap as fighter's Archer/Hawkeye precedent); unpaired swap of fast movement",
  },

  // ── Invulnerable Rager ─────────────────────────────────────────────────
  "barbarian:invulnerable-rager:extreme-endurance:3": {
    archetypeId: "barbarian:invulnerable-rager",
    name: "Extreme Endurance",
    level: 3,
    bucket: "situational",
    note: "fire OR cold energy resistance — real eres.<x> target exists, but which energy type applies is a player build-time choice this table has no generic way to record",
  },
  "barbarian:invulnerable-rager:invulnerability-ex:2": {
    archetypeId: "barbarian:invulnerable-rager",
    name: "Invulnerability (Ex)",
    level: 2,
    bucket: "numeric",
    note: "hand-verified, ground truth (archetype-effects.ts) — DR/— reflavor, also folds in uncanny dodge/improved uncanny dodge",
  },

  // ── Jungle Rager ───────────────────────────────────────────────────────
  "barbarian:jungle-rager:damage-reduction:8": {
    archetypeId: "barbarian:jungle-rager",
    name: "Damage reduction",
    level: 8,
    bucket: "blocked",
    note: 'suspected vendored-data issue: restates the base Damage Reduction progression verbatim (1/— at 7th, +1 every 3 levels) with NO "this ability replaces…" language and an unpaired uuid, and its own `level` field (8) contradicts its own prose ("At 7th level…"). Jungle Rager\'s other 3 features swap uncanny dodge/improved uncanny dodge/trap sense, never damage reduction, so this reads as a vendored duplicate/reminder of the unchanged base feature rather than a real swap. Extracting a second DR number here would sit on top of the already-unsuppressed hardcoded barbarianDamageReduction table (barbarianDamageReductionReplaced returns false for this archetype) — recorded, not modeled. See report for a suggested follow-up.',
  },
  "barbarian:jungle-rager:home-ground-advantage-ex:2": {
    archetypeId: "barbarian:jungle-rager",
    name: "Home Ground Advantage (Ex)",
    level: 2,
    bucket: "situational",
    note: "cover/concealment bonus scoped to a chosen favored terrain — terrain condition the engine can't check",
  },
  "barbarian:jungle-rager:home-ground-supremacy:5": {
    archetypeId: "barbarian:jungle-rager",
    name: "Home Ground Supremacy",
    level: 5,
    bucket: "situational",
    note: "woodland stride + AC bonus, both scoped to the same chosen favored terrain",
  },
  "barbarian:jungle-rager:jungle-endurance-1:3": {
    archetypeId: "barbarian:jungle-rager",
    name: "Jungle Endurance (+1)",
    level: 3,
    bucket: "situational",
    note: "Fortitude bonus scoped to hot-weather/disease effects specifically — effect-type scoped",
  },

  // ── Mad Dog ────────────────────────────────────────────────────────────
  "barbarian:mad-dog:ferocious-fetch-ex:5": {
    archetypeId: "barbarian:mad-dog",
    name: "Ferocious Fetch (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "war-beast (animal companion) ability — no number to the character's own sheet",
  },
  "barbarian:mad-dog:pack-tactics-ex:2": {
    archetypeId: "barbarian:mad-dog",
    name: "Pack Tactics (Ex)",
    level: 2,
    bucket: "situational",
    note: "+4-instead-of-+2 flanking bonus, scoped to flanking specifically alongside the war beast — combat-state scoped",
  },
  "barbarian:mad-dog:rage:4": {
    archetypeId: "barbarian:mad-dog",
    name: "Rage",
    level: 4,
    bucket: "blocked",
    note: "shifts rage's effective barbarian level by -3 for rounds/day purposes — would need to override the @class.unlevel term inside vendored Rage uses.maxFormula, not addable as a separate Change",
  },
  "barbarian:mad-dog:throat-cutter-ex:14": {
    archetypeId: "barbarian:mad-dog",
    name: "Throat Cutter (Ex)",
    level: 14,
    bucket: "subsystem",
    note: "grants a triggered attack of opportunity off the war beast's maneuver — no number",
  },
  "barbarian:mad-dog:war-beast-ex:1": {
    archetypeId: "barbarian:mad-dog",
    name: "War Beast (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "animal companion grant, replaces several rage powers (unmodeled either way) — no number",
  },

  // ── Mooncursed ─────────────────────────────────────────────────────────
  "barbarian:mooncursed:greater-shifting-rage:11": {
    archetypeId: "barbarian:mooncursed",
    name: "Greater Shifting Rage",
    level: 11,
    bucket: "subsystem",
    note: "polymorph size upgrade, replaces greater rage — no number",
  },
  "barbarian:mooncursed:hybrid-rage:5": {
    archetypeId: "barbarian:mooncursed",
    name: "Hybrid Rage",
    level: 5,
    bucket: "subsystem",
    note: "polymorph hybrid-form option — no number",
  },
  "barbarian:mooncursed:mighty-shifting-rage:20": {
    archetypeId: "barbarian:mooncursed",
    name: "Mighty Shifting Rage",
    level: 20,
    bucket: "subsystem",
    note: "polymorph size upgrade, replaces mighty rage — no number",
  },
  "barbarian:mooncursed:shifting-rage-su:1": {
    archetypeId: "barbarian:mooncursed",
    name: "Shifting Rage (Su)",
    level: 1,
    bucket: "subsystem",
    note: "replaces rage's ability bonuses/penalties with a polymorph while consuming the same rage-round pool (cadence unchanged, so not a blocked rounds/day case) — no number",
  },

  // ── Numerian Liberator ─────────────────────────────────────────────────
  "barbarian:numerian-liberator:disruptor:5": {
    archetypeId: "barbarian:numerian-liberator",
    name: "Disruptor",
    level: 5,
    bucket: "subsystem",
    note: "raises foes' concentration DC to cast defensively near her — a DC imposed on OTHERS, not a bonus to her own sheet",
  },
  "barbarian:numerian-liberator:hard-hitter-ex:2": {
    archetypeId: "barbarian:numerian-liberator",
    name: "Hard Hitter (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "bypasses object/creature hardness — no matching target",
  },
  "barbarian:numerian-liberator:hide-from-constructs-su:14": {
    archetypeId: "barbarian:numerian-liberator",
    name: "Hide from Constructs (Su)",
    level: 14,
    bucket: "subsystem",
    note: "concealment-vs-constructs ability, resource-gated — no number",
  },

  // ── Pack Hunter ────────────────────────────────────────────────────────
  "barbarian:pack-hunter:in-and-out-1:3": {
    archetypeId: "barbarian:pack-hunter",
    name: "In and Out (+1)",
    level: 3,
    bucket: "situational",
    note: "dodge AC bonus scoped to attacks of opportunity only — the engine's `ac` target applies to all attacks, so a flat Change would over-apply",
  },
  "barbarian:pack-hunter:sympathetic-rage:6": {
    archetypeId: "barbarian:pack-hunter",
    name: "Sympathetic Rage",
    level: 6,
    bucket: "subsystem",
    note: "rage-state-sharing rule with an unconscious ally — no number",
  },

  // ── Pack Rager ─────────────────────────────────────────────────────────
  "barbarian:pack-rager:bonus-feat:2": {
    archetypeId: "barbarian:pack-rager",
    name: "Bonus Feat",
    level: 2,
    bucket: "numeric",
    note: 'bonus-feat COUNT scaling is a clean, unconditional formula (extracted) — the "must be a combat/teamwork feat" restriction is dropped, same posture as the ranger combat-style-feat precedent in archetype-effects.ts',
  },
  "barbarian:pack-rager:raging-tactician-30ft-1-feat:7": {
    archetypeId: "barbarian:pack-rager",
    name: "Raging Tactician (30ft., 1 feat)",
    level: 7,
    bucket: "subsystem",
    note: "shares a teamwork feat with allies in range — ally-facing grant, no bonus to self; paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed",
  },

  // ── Primal Hunter ──────────────────────────────────────────────────────
  "barbarian:primal-hunter:exceptional-pull:1": {
    archetypeId: "barbarian:primal-hunter",
    name: "Exceptional Pull",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat + weapon strength-rating increase — no generic target; unpaired swap of fast movement",
  },
  "barbarian:primal-hunter:focused-rage-ex:1": {
    archetypeId: "barbarian:primal-hunter",
    name: "Focused Rage (Ex)",
    level: 1,
    bucket: "situational",
    note: "attack bonus scoped to ranged weapons specifically while raging — doubly scoped (weapon category restriction that isn't a WEAPON_GROUPS slug, plus live rage-state)",
  },

  // ── Raging Cannibal ────────────────────────────────────────────────────
  "barbarian:raging-cannibal:animal-fury:2": {
    archetypeId: "barbarian:raging-cannibal",
    name: "Animal Fury",
    level: 2,
    bucket: "subsystem",
    note: "grants a bite natural attack while raging — no natural-attack target is applied by this engine",
  },
  "barbarian:raging-cannibal:consume-vigor:2": {
    archetypeId: "barbarian:raging-cannibal",
    name: "Consume Vigor",
    level: 2,
    bucket: "blocked",
    note: 'triggered "gain N rounds of rage" on reducing a same-type creature to 0 hp — rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },
  "barbarian:raging-cannibal:feed-from-fury-ex:5": {
    archetypeId: "barbarian:raging-cannibal",
    name: "Feed from Fury (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "triggered temporary-hit-point gain on a specific crit — no matching target for a triggered temp-HP grant",
  },
  "barbarian:raging-cannibal:intimidating-gouge-ex:3": {
    archetypeId: "barbarian:raging-cannibal",
    name: "Intimidating Gouge (Ex)",
    level: 3,
    bucket: "situational",
    note: "Intimidate bonus, triggered by a specific crit against a same-type creature, lasting only for the rage's duration — action- and rage-state-scoped",
  },
  "barbarian:raging-cannibal:razor-toothed-fury-ex:6": {
    archetypeId: "barbarian:raging-cannibal",
    name: "Razor-Toothed Fury (Ex)",
    level: 6,
    bucket: "situational",
    note: "attack-penalty-for-bleed-damage trade, scoped to the bite attack specifically and a per-attack player choice — same shape as fighter's Overhand Chop precedent",
  },

  // ── Savage Barbarian ───────────────────────────────────────────────────
  "barbarian:savage-barbarian:naked-courage-1:3": {
    archetypeId: "barbarian:savage-barbarian",
    name: "Naked Courage (+1)",
    level: 3,
    bucket: "numeric",
    note: "dodge AC half is armor-gated (@armor.type, same convention this archetype's own hand-verified Natural Toughness uses) and extracted; the vs.-fear save half is dropped and flagged in the extracted entry's detail",
  },
  "barbarian:savage-barbarian:natural-toughness-1:7": {
    archetypeId: "barbarian:savage-barbarian",
    name: "Natural Toughness (+1)",
    level: 7,
    bucket: "numeric",
    note: "hand-verified, ground truth (archetype-effects.ts) — natural-armor Damage-Reduction replacement",
  },

  // ── Savage Technologist ────────────────────────────────────────────────
  "barbarian:savage-technologist:crack-shot:5": {
    archetypeId: "barbarian:savage-technologist",
    name: "Crack Shot",
    level: 5,
    bucket: "situational",
    note: "Dex-to-damage with firearms (a real weapon group) while raging — the live rage-state condition disqualifies it despite the weapon-group half being otherwise checkable",
  },
  "barbarian:savage-technologist:primal-magnetism:3": {
    archetypeId: "barbarian:savage-technologist",
    name: "Primal Magnetism",
    level: 3,
    bucket: "subsystem",
    note: "resource-spend (rage rounds) activated Diplomacy bonus — activated ability, not a passive number",
  },
  "barbarian:savage-technologist:rage:1": {
    archetypeId: "barbarian:savage-technologist",
    name: "Rage",
    level: 1,
    bucket: "subsystem",
    note: "reflavors rage's morale bonus onto Dex instead of Con — rage's ability bonuses aren't auto-applied, nothing baseline to override (same posture as the hand-verified Urban Barbarian Controlled Rage entry)",
  },
  "barbarian:savage-technologist:sword-and-gun:2": {
    archetypeId: "barbarian:savage-technologist",
    name: "Sword and Gun",
    level: 2,
    bucket: "subsystem",
    note: "grants a Two-Weapon-Fighting-shaped combat style + no-AoO rule — unrelated ability grant",
  },
  "barbarian:savage-technologist:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarian:savage-technologist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency list — no numeric target",
  },

  // ── Scarred Rager ──────────────────────────────────────────────────────
  "barbarian:scarred-rager:improved-tolerance:5": {
    archetypeId: "barbarian:scarred-rager",
    name: "Improved Tolerance",
    level: 5,
    bucket: "subsystem",
    note: "extends an unmodeled re-save mechanic to more conditions — no number",
  },
  "barbarian:scarred-rager:scarification-1:3": {
    archetypeId: "barbarian:scarred-rager",
    name: "Scarification (+1)",
    level: 3,
    bucket: "subsystem",
    note: "bleed-damage mitigation — bleed isn't a tracked mechanic in this engine, no target",
  },
  "barbarian:scarred-rager:terrifying-visage:1": {
    archetypeId: "barbarian:scarred-rager",
    name: "Terrifying Visage",
    level: 1,
    bucket: "situational",
    note: "Intimidate bonus scoped to humanoids outside barbarian tribes + an unmodeled fear-DC increase — enemy-type scoped; unpaired swap of fast movement",
  },
  "barbarian:scarred-rager:tolerance:2": {
    archetypeId: "barbarian:scarred-rager",
    name: "Tolerance",
    level: 2,
    bucket: "subsystem",
    note: "extra-save-or-halved-duration mechanic vs. specific conditions — no flat number",
  },

  // ── Sea Reaver ─────────────────────────────────────────────────────────
  "barbarian:sea-reaver:eyes-of-the-storm:2": {
    archetypeId: "barbarian:sea-reaver",
    name: "Eyes of the Storm",
    level: 2,
    bucket: "subsystem",
    note: "ignores weather concealment + halves an existing weather Perception penalty — penalty mitigation this engine never modeled, no target",
  },
  "barbarian:sea-reaver:marine-terror:1": {
    archetypeId: "barbarian:sea-reaver",
    name: "Marine Terror",
    level: 1,
    bucket: "subsystem",
    note: "hold-breath + terrain movement + cover-ignoring vs. submerged targets — no numeric target; unpaired swap of fast movement",
  },
  "barbarian:sea-reaver:savage-sailor-1:3": {
    archetypeId: "barbarian:sea-reaver",
    name: "Savage Sailor (+1)",
    level: 3,
    bucket: "situational",
    note: "skill bonuses scoped to aquatic terrain — terrain condition the engine can't check",
  },
  "barbarian:sea-reaver:sure-footed-ex:5": {
    archetypeId: "barbarian:sea-reaver",
    name: "Sure-Footed (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "removes slick-surface penalties — penalty this engine never modeled",
  },
  "barbarian:sea-reaver:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarian:sea-reaver",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency list — no numeric target",
  },

  // ── Sharptooth ─────────────────────────────────────────────────────────
  "barbarian:sharptooth:blood-in-the-water:6": {
    archetypeId: "barbarian:sharptooth",
    name: "Blood in the Water",
    level: 6,
    bucket: "subsystem",
    note: "bleed damage while raging — bleed isn't a tracked mechanic here, also rage-state scoped",
  },
  "barbarian:sharptooth:ocean-breath-1:3": {
    archetypeId: "barbarian:sharptooth",
    name: "Ocean Breath (+1)",
    level: 3,
    bucket: "subsystem",
    note: "hold-breath boost + a Con-check bonus for an unmodeled hold-breath mechanic — no target",
  },
  "barbarian:sharptooth:scent-of-blood-keen-scent:5": {
    archetypeId: "barbarian:sharptooth",
    name: "Scent of Blood (Keen Scent)",
    level: 5,
    bucket: "subsystem",
    note: "keen scent sense upgrade — no number",
  },
  "barbarian:sharptooth:scent-of-blood-scent:2": {
    archetypeId: "barbarian:sharptooth",
    name: "Scent of Blood (Scent)",
    level: 2,
    bucket: "subsystem",
    note: "scent sense grant — no number",
  },
  "barbarian:sharptooth:swim-like-a-fish-10-ft:1": {
    archetypeId: "barbarian:sharptooth",
    name: "Swim Like a Fish (10 ft.)",
    level: 1,
    bucket: "blocked",
    note: "suspected vendored-data issue: this feature's prose is a byte-identical reflavor of the base Fast Movement class feature (same +10 ft., same @armor.type<=1/not-heavy-load condition, even the same \"stacks with other bonuses\" sentence) yet carries no pairedBaseFeatureUuid at all. Extracting a duplicate Change would be harmless in practice (landSpeed's \"base\" type takes highest-only, so the total wouldn't double), but recording rather than guessing per the blocked-bucket rubric — the vendored pairing script likely dropped a link here that should point at Fast Movement's uuid.",
  },

  // ── Shoanti Burn Rider ─────────────────────────────────────────────────
  "barbarian:shoanti-burn-rider:cinder-dance-ex:3": {
    archetypeId: "barbarian:shoanti-burn-rider",
    name: "Cinder Dance (Ex)",
    level: 3,
    bucket: "subsystem",
    note: "reflex-save-triggered repositioning ability — no flat number",
  },
  "barbarian:shoanti-burn-rider:cinder-sight-ex:2": {
    archetypeId: "barbarian:shoanti-burn-rider",
    name: "Cinder Sight (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "see-through-fire/fog/smoke sense — no number",
  },
  "barbarian:shoanti-burn-rider:flame-runner-10-ft:1": {
    archetypeId: "barbarian:shoanti-burn-rider",
    name: "Flame Runner (+10 ft.)",
    level: 1,
    bucket: "subsystem",
    note: "once-per-rage speed boost applied to her MOUNT, not herself — no self-facing target; unpaired swap of fast movement",
  },
  "barbarian:shoanti-burn-rider:give-me-fire-ex:5": {
    archetypeId: "barbarian:shoanti-burn-rider",
    name: "Give Me Fire (Ex)",
    level: 5,
    bucket: "blocked",
    note: 'triggered "regain 1 round of rage when taking fire damage while raging" — rounds/day-cadence-changing mechanic that would fight vendored Rage uses.maxFormula; recorded, not modeled',
  },
  "barbarian:shoanti-burn-rider:mount:4": {
    archetypeId: "barbarian:shoanti-burn-rider",
    name: "Mount",
    level: 4,
    bucket: "subsystem",
    note: "animal companion (mount) grant, replaces several rage powers (unmodeled either way) — no number",
  },

  // ── Superstitious ──────────────────────────────────────────────────────
  "barbarian:superstitious:keen-senses-blindsense-30ft:16": {
    archetypeId: "barbarian:superstitious",
    name: "Keen Senses (Blindsense 30ft.)",
    level: 16,
    bucket: "subsystem",
    note: "special-sense grant tier — no number",
  },
  "barbarian:superstitious:keen-senses-blindsight-30ft:19": {
    archetypeId: "barbarian:superstitious",
    name: "Keen Senses (Blindsight 30ft.)",
    level: 19,
    bucket: "subsystem",
    note: "special-sense grant tier — no number",
  },
  "barbarian:superstitious:keen-senses-darkvision:10": {
    archetypeId: "barbarian:superstitious",
    name: "Keen Senses (Darkvision)",
    level: 10,
    bucket: "subsystem",
    note: "special-sense grant tier — no number",
  },
  "barbarian:superstitious:keen-senses-low-light-vision:7": {
    archetypeId: "barbarian:superstitious",
    name: "Keen Senses (Low-light Vision)",
    level: 7,
    bucket: "subsystem",
    note: "special-sense grant tier, paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed — no number of its own",
  },
  "barbarian:superstitious:keen-senses-scent:13": {
    archetypeId: "barbarian:superstitious",
    name: "Keen Senses (Scent)",
    level: 13,
    bucket: "subsystem",
    note: "special-sense grant tier — no number",
  },
  "barbarian:superstitious:sixth-sense-1:3": {
    archetypeId: "barbarian:superstitious",
    name: "Sixth Sense (+1)",
    level: 3,
    bucket: "numeric",
    note: "general initiative half is a clean scaling bonus (extracted); the surprise-round-only AC half is dropped and flagged in the extracted entry's detail",
  },

  // ── Titan Mauler ───────────────────────────────────────────────────────
  "barbarian:titan-mauler:big-game-hunter-ex:1": {
    archetypeId: "barbarian:titan-mauler",
    name: "Big Game Hunter (Ex)",
    level: 1,
    bucket: "situational",
    note: "attack/AC bonus scoped to melee vs. larger-than-self creatures — enemy-size scoped; unpaired swap of fast movement",
  },
  "barbarian:titan-mauler:evade-reach-ex:5": {
    archetypeId: "barbarian:titan-mauler",
    name: "Evade Reach (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "reduces a chosen foe's effective reach — `reach` is a known vendored target string but is not in targets.ts's APPLIED_TARGETS, so no live effect is possible regardless of scoping",
  },
  "barbarian:titan-mauler:jotungrip-ex:2": {
    archetypeId: "barbarian:titan-mauler",
    name: "Jotungrip (Ex)",
    level: 2,
    bucket: "subsystem",
    note: "uncanny-dodge-equivalent immunity to flat-footedness — binary immunity, no number",
  },
  "barbarian:titan-mauler:massive-weapons-1:3": {
    archetypeId: "barbarian:titan-mauler",
    name: "Massive Weapons (+1)",
    level: 3,
    bucket: "situational",
    note: "reduces the oversized-weapon attack penalty — scoped to a specific gear/size choice, not a general attack bonus",
  },
  "barbarian:titan-mauler:titanic-rage-su:14": {
    archetypeId: "barbarian:titan-mauler",
    name: "Titanic Rage (Su)",
    level: 14,
    bucket: "subsystem",
    note: "rage-conditional enlarge person, resource-gated (2 rage rounds/round) — activated ability, no static number",
  },

  // ── True Primitive ─────────────────────────────────────────────────────
  "barbarian:true-primitive:favored-terrain-ex:1": {
    archetypeId: "barbarian:true-primitive",
    name: "Favored Terrain (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "ranger favored-terrain analog — terrain-scoped bonuses this engine doesn't model for any class; unpaired swap of fast movement",
  },
  "barbarian:true-primitive:illiteracy:1": {
    archetypeId: "barbarian:true-primitive",
    name: "Illiteracy",
    level: 1,
    bucket: "subsystem",
    note: "flavor restriction — no number",
  },
  "barbarian:true-primitive:trophy-fetish-ex:3": {
    archetypeId: "barbarian:true-primitive",
    name: "Trophy Fetish (Ex)",
    level: 3,
    bucket: "situational",
    note: "damage/save bonus scoped to a specific fetish-attached weapon/armor item — per-item scoped, not a weapon category",
  },
  "barbarian:true-primitive:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarian:true-primitive",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency list — no numeric target",
  },

  // ── Untamed Rager ──────────────────────────────────────────────────────
  "barbarian:untamed-rager:deplorable-tactics:5": {
    archetypeId: "barbarian:untamed-rager",
    name: "Deplorable Tactics",
    level: 5,
    bucket: "subsystem",
    note: "bonus feat (Greater Dirty Trick) — no number",
  },
  "barbarian:untamed-rager:despicable-tactics:2": {
    archetypeId: "barbarian:untamed-rager",
    name: "Despicable Tactics",
    level: 2,
    bucket: "subsystem",
    note: "bonus feat (Improved Dirty Trick) — no number",
  },
  "barbarian:untamed-rager:dishonorable:7": {
    archetypeId: "barbarian:untamed-rager",
    name: "Dishonorable",
    level: 7,
    bucket: "situational",
    note: "CMB/CMD bonus scoped to the dirty trick maneuver specifically — maneuver scoped; paired 1:1 to Damage Reduction so the base DR grant is already cleanly suppressed",
  },
  "barbarian:untamed-rager:feral-appearance-1:3": {
    archetypeId: "barbarian:untamed-rager",
    name: "Feral Appearance (+1)",
    level: 3,
    bucket: "numeric",
    note: "fully general, unconditional Intimidate scaling bonus — no dropped clauses",
  },

  // ── Urban Barbarian ────────────────────────────────────────────────────
  "barbarian:urban-barbarian:controlled-rage-ex:1": {
    archetypeId: "barbarian:urban-barbarian",
    name: "Controlled Rage (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "hand-verified, ground truth (archetype-effects.ts) — rage's ability bonuses aren't auto-applied, nothing baseline to override",
  },
  "barbarian:urban-barbarian:crowd-control-ex:1": {
    archetypeId: "barbarian:urban-barbarian",
    name: "Crowd Control (Ex)",
    level: 1,
    bucket: "situational",
    note: "attack/AC bonus scoped to being adjacent to 2+ enemies + an Intimidate bonus scoped to influencing crowds — both combat/action-state scoped; unpaired swap of fast movement",
  },
  "barbarian:urban-barbarian:greater-controlled-rage:11": {
    archetypeId: "barbarian:urban-barbarian",
    name: "Greater Controlled rage",
    level: 11,
    bucket: "subsystem",
    note: "bumps Controlled Rage's morale bonus tier (already summarized in that hand-verified entry's static detail string) — rage's ability bonuses aren't auto-applied, nothing to override",
  },
  "barbarian:urban-barbarian:mighty-conrtolled-rage:20": {
    archetypeId: "barbarian:urban-barbarian",
    name: "Mighty Conrtolled rage",
    level: 20,
    bucket: "subsystem",
    note: 'same as Greater Controlled Rage, final tier — nothing to override (vendored id/name both carry a "Conrtolled" typo, left as-is since it\'s the real RefEntity id)',
  },

  // ── Wild Rager ─────────────────────────────────────────────────────────
  "barbarian:wild-rager:rage-conversion:5": {
    archetypeId: "barbarian:wild-rager",
    name: "Rage Conversion",
    level: 5,
    bucket: "subsystem",
    note: "mind-affecting-save reroll into an alternate rage/confusion effect — conditional ability, no flat number",
  },
  "barbarian:wild-rager:uncontrolled-rage-ex:1": {
    archetypeId: "barbarian:wild-rager",
    name: "Uncontrolled Rage (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "adds a confusion-risk mechanic to rage without touching rounds/day cadence — no number",
  },
  "barbarian:wild-rager:wild-fighting-ex:2": {
    archetypeId: "barbarian:wild-rager",
    name: "Wild Fighting (Ex)",
    level: 2,
    bucket: "subsystem",
    note: 'grants a whole extra full-attack-action attack with accompanying attack/AC penalties — no single Change target represents "one extra attack this round"',
  },

  // ── Wildborn ───────────────────────────────────────────────────────────
  "barbarian:wildborn:damage-reduction:7": {
    archetypeId: "barbarian:wildborn",
    name: "Damage reduction",
    level: 7,
    bucket: "numeric",
    note: "hand-verified, ground truth (archetype-effects.ts) — literal Damage Reduction reflavor",
  },
  "barbarian:wildborn:illiteracy:1": {
    archetypeId: "barbarian:wildborn",
    name: "Illiteracy",
    level: 1,
    bucket: "subsystem",
    note: "flavor restriction — no number",
  },
  "barbarian:wildborn:rage-power:4": {
    archetypeId: "barbarian:wildborn",
    name: "Rage power",
    level: 4,
    bucket: "subsystem",
    note: "bonus-feat-or-rage-power choice list — rage powers are prose-only, no per-power modeling",
  },
  "barbarian:wildborn:weapon-and-armor-proficiency:1": {
    archetypeId: "barbarian:wildborn",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency + two bonus feats grant — no numeric target",
  },
};

/**
 * ── BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────
 *
 * The `numeric`-bucket subset of the classification table above, given a
 * real `Change`. Deliberately excludes the four ids already hand-verified in
 * `archetype-effects.ts` (see this file's header comment) — those stay
 * governed entirely by that table via `resolveArchetypeFeatureEffect`'s
 * verified-wins-over-extracted precedence.
 */
export const BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Armored Hulk's "Armored Swiftness" (Ultimate Combat p. 5) grants +5 ft.
  // land speed while wearing medium or heavy armor — a real, armor-gated
  // number in the same `@armor.type` idiom Fast Movement's own vendored
  // Change uses. Replaces uncanny dodge, which carries no vendored `changes`
  // upstream — nothing to suppress. The prose's "to a maximum of her speed"
  // clause (presumably meaning this can't push speed past double normal) is
  // dropped as an edge case no character sheet needs to render.
  "barbarian:armored-hulk:armored-swiftness-ex:2": {
    changes: [c("if(gte(@armor.type, 2), 5)", "landSpeed", "base")],
    detail: () => "+5 ft. land speed (medium/heavy armor)",
    confidence: "medium",
    provenance:
      "When wearing medium or heavy armor, an armored hulk can move 5 feet faster than " +
      "normal, to a maximum of her speed.",
  },

  // Armored Hulk's "Improved Armored Swiftness" (Ultimate Combat p. 5) is a
  // near-literal Fast-Movement-shaped grant — +10 ft. land speed gated on
  // wearing any armor (not just light/none) and not carrying a heavy load,
  // same `@attributes.encumbrance.level` idiom the vendored Fast Movement
  // Change uses. Replaces improved uncanny dodge, which carries no vendored
  // `changes` upstream — nothing to suppress.
  "barbarian:armored-hulk:improved-armored-swiftness:5": {
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

  // Deepwater Rager's "Strong Lungs" (Blood of the Sea) adds Con modifier to
  // Intimidate checks ON TOP OF the normal Cha modifier already baked into
  // the Intimidate skill computation — an always-on ability-mod stack, same
  // `@abilities.<id>.mod` idiom the hand-verified table's bloodline entries
  // use. The "as long as she is able to speak" qualifier is dropped (a rare
  // edge case, same posture as ignoring "this ability requires patience or
  // concentration"-style caveats elsewhere in this engine).
  "barbarian:deepwater-rager:strong-lungs-ex:1": {
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
  "barbarian:fearsome-defender:bloodlust-ex:5": {
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
  "barbarian:fearsome-defender:silent-threat-1:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.int")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Intimidate`,
    confidence: "medium",
    provenance:
      "The fearsome defender gains a +1 bonus on Intimidate checks... Both the bonus and " +
      "the increase to DCs increase by 1 at 6th level and every 3 barbarian levels thereafter.",
  },

  // Pack Rager's "Bonus Feat" (Ultimate Wilderness) grants a bonus teamwork
  // feat at 2nd level and every 4 levels thereafter — a clean, unconditional
  // feat-count formula, same shape as Cleric Crusader's bonus-feat entry
  // already hand-verified in archetype-effects.ts. The "must also be a
  // combat feat" restriction is dropped (feat choices aren't gated by list
  // anywhere in this engine), same posture as the ranger combat-style-feat
  // entries in that same table.
  "barbarian:pack-rager:bonus-feat:2": {
    changes: [c("1 + floor((@class.unlevel - 2) / 4)", "bonusFeats")],
    detail: (level) =>
      `${1 + Math.floor((level - 2) / 4)} bonus teamwork feat(s) (combat feat list)`,
    confidence: "high",
    provenance:
      "At 2nd level and every 4 levels thereafter, the pack rager can take a bonus teamwork feat.",
  },

  // Savage Barbarian's "Naked Courage" (Ultimate Combat p. 18) grants a
  // dodge AC bonus while wearing no armor — same `@armor.type` idiom this
  // archetype's own hand-verified Natural Toughness entry uses. The
  // companion "+1 morale bonus on saves against fear" clause is scoped to
  // fear specifically (same bar traits.ts's courageous/birthmark entries
  // fail) and is dropped, flagged per the medium-confidence rubric.
  "barbarian:savage-barbarian:naked-courage-1:3": {
    changes: [c("if(lt(@armor.type, 1), 1 + floor((@class.unlevel - 3) / 6), 0)", "ac", "dodge")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 6)} dodge AC (no armor worn)`,
    confidence: "medium",
    provenance:
      "the savage barbarian gains a +1 dodge bonus to AC ... when wearing no armor (shields " +
      "are allowed). This bonus increases by +1 for every six levels after 3rd.",
  },

  // Superstitious's "Sixth Sense" (Blood of the Moon) grants a general,
  // unconditional initiative bonus (+1 at 3rd, +1 every 3 levels
  // thereafter). The companion "+1 insight bonus to AC during surprise
  // rounds" clause is scoped to a specific combat-timing state (surprise
  // rounds only) and is dropped, flagged per the medium-confidence rubric.
  "barbarian:superstitious:sixth-sense-1:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "init")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} initiative`,
    confidence: "medium",
    provenance:
      "the superstitious barbarian gains a +1 bonus on initiative ... This bonus increases " +
      "by +1 for every three levels after 3rd.",
  },

  // Untamed Rager's "Feral Appearance" (Blood of the Night) grants a fully
  // general, unconditional Intimidate bonus (+1 at 3rd, +1 every 3 levels
  // thereafter) — no second clause to drop, the cleanest extraction in this
  // slice.
  "barbarian:untamed-rager:feral-appearance-1:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.int")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Intimidate`,
    confidence: "high",
    provenance:
      "the untamed rager gains a +1 bonus on Intimidate checks. This bonus increases by 1 " +
      "every 3 barbarian levels thereafter.",
  },
};
