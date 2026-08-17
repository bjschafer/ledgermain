/**
 * Antipaladin's slice of the pipeline (2026-08-09). Per the per-class file
 * convention (documented in `index.ts`), this file owns BOTH of antipaladin's
 * pipeline artifacts — `ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit,
 * 9 archetypes, 45 features, every description read individually) — so a
 * future wave working on a different class never has a reason to touch this
 * file; only `index.ts` (the aggregator, a later integration step not done
 * here) needs one new import + spread per class.
 *
 * ── Antipaladin-specific mechanical facts this pass relies on ─────────────
 *
 * 1. **Smite Good, Touch of Corruption, Cruelties, and Fiendish Boon** — the
 *    four base features antipaladin archetypes most often replace — are all
 *    resource/pick-list subsystems, none `Change`-shaped (all four carry
 *    `changes: []` in `class-features.json`; verified). Smite Good and Touch
 *    of Corruption DO carry vendored `uses.maxFormula` resource pools
 *    (`"1 + floor((@class.unlevel - 1) / 3)"` and
 *    `"floor(@class.unlevel / 2) + @abilities.cha.mod"` respectively),
 *    applied generically by `deriveResourcePools`/`resources.ts` — so any
 *    archetype feature that changes a pool's SIZE or cadence is `blocked`
 *    (extracting it would double-count or conflict with the vendored
 *    formula; the one case here is Dread Vanguard's Beacon of Evil).
 *    Reflavors, riders, and spend-option changes on these four are
 *    `subsystem`/`situational` on their own merits — mirroring `paladin.ts`'s
 *    treatment of Smite Evil / Lay on Hands / Mercies / Divine Bond almost
 *    one-for-one.
 * 2. **Enemy-facing auras are never the character's own sheet numbers**
 *    (standing ruling): Aura of Cowardice / Aura of Despair and every
 *    archetype reflavor of them put their numbers on ENEMIES inside the
 *    radius — never extracted, bucketed `situational` with a note. An aura
 *    granting the antipaladin himself an unconditional bonus would be
 *    extractable for his own share only; none of the nine archetypes' auras
 *    clears that bar (their ally-facing halves name "allies" without
 *    explicitly including the antipaladin himself, so there is no
 *    unambiguous own-share to extract — same self-inclusion caution as
 *    `class-feature-effects.ts`'s Tranquility Aura note).
 * 3. **Base antipaladin DR is hand-tabled, not a vendored `Change`**: Aura of
 *    Depravity (17th, DR 5/good) and Unholy Champion's 20th-level bump to
 *    10/good live in `tables.ts`'s `antipaladinDamageReduction`, pushed by
 *    `defenses.ts` and suppressed by `archetypes.ts`'s
 *    `antipaladinDamageReductionReplaced` whenever an active archetype
 *    cleanly pairs a feature to Aura of Depravity's uuid
 *    (`Compendium.pf1.class-abilities.Item.LkbGAZaa2KDrnS89`). Knight of the
 *    Sepulcher's Soul of the Crypt (17th) IS such a clean pairing, so its
 *    DR 5/bludgeoning-and-good extraction below cannot double-count the base
 *    table — the whole hand-tabled contribution (including the 20th-level
 *    bump) is withheld for that combo. Undying Champion (20th) then raises
 *    the same qualifier to 10; both entries share the one
 *    `dr.bludgeoning-and-good` target, and `defenses.ts`'s
 *    `groupByQualifier` keeps only the highest value per qualifier, so the
 *    pair composes to the published 5-then-10 with no arithmetic tricks.
 *    (An AND-compound bypass as a single qualifier follows the established
 *    `dr.good-and-silver`/`dr.adamantine-and-magic` convention in
 *    `bloodrager-bloodlines.ts`/`bloodlines.ts` — unlike the OR-compound
 *    `paladin.ts` declined for Aura of Self-Righteousness.)
 * 4. **Insinuator's Invocation** gates every supernatural/spell-like class
 *    ability on a daily outsider-invocation choice no build field tracks —
 *    that daily choice also decides the VALUE of several otherwise-real
 *    numbers (Aura of Indomitability's DR 10/opposed-alignment vs. 5/—),
 *    which is why they sit in `situational` rather than `numeric`. Bonus
 *    feats are neither Su nor Sp, so the Bonus Feat count stays extractable.
 *
 * Confidence rubric (identical to magus.ts's/kineticist.ts's):
 *  - "high": a single, clearly-worded, fully general (no scope restriction)
 *    bonus or grant, extracted whole with no interpretation.
 *  - "medium": the extraction dropped a real clause of the same feature (a
 *    fortification percentage, an unmodeled type change) while keeping the
 *    clause that DOES clear the bar, or the formula composes with a sibling
 *    entry (Will of the Crypt's delta) — partial honesty, flagged in
 *    `detail`/the classification note.
 *  - "low": not used in this pass.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── antipaladin:blighted-myrmidon ──
  "antipaladin:blighted-myrmidon:smite-nature:1": {
    archetypeId: "antipaladin:blighted-myrmidon",
    name: "Smite Nature",
    level: 1,
    bucket: "situational",
    note: "Smite Good reflavor scoped to animals/plants/vermin (and nature-tied creatures for the doubled damage) — same single-target scoping as base Smite Good (class note 1)",
  },
  "antipaladin:blighted-myrmidon:corrupted-companion:5": {
    archetypeId: "antipaladin:blighted-myrmidon",
    name: "Corrupted Companion",
    level: 5,
    bucket: "subsystem",
    note: "fiendish boon variant (summon nature's ally servant option) — boon choice-list change, no flat number (class note 1)",
  },
  "antipaladin:blighted-myrmidon:feed-on-decay:10": {
    archetypeId: "antipaladin:blighted-myrmidon",
    name: "Feed on Decay",
    level: 10,
    bucket: "situational",
    note: "real +1 morale attack/damage/save bonus, but only for 1 round after damaging a smite-nature target — a per-round, smite-conditional buff state",
  },
  "antipaladin:blighted-myrmidon:aura-of-decay:11": {
    archetypeId: "antipaladin:blighted-myrmidon",
    name: "Aura of Decay",
    level: 11,
    bucket: "situational",
    note: "activated (two smite-nature uses) 1-minute aura whose damage lands on ENEMIES in the radius — enemy-facing aura numbers are never the character's own sheet numbers (class note 2); the self-heal rider is damage-dependent",
  },
  "antipaladin:blighted-myrmidon:enervating-touch:15": {
    archetypeId: "antipaladin:blighted-myrmidon",
    name: "Enervating Touch",
    level: 15,
    bucket: "subsystem",
    note: "healing-suppression rider on touch of corruption — the numbers land on the touched target, and touch of corruption is a resource subsystem this engine doesn't Change-model (class note 1)",
  },
  "antipaladin:blighted-myrmidon:unnatural-champion:20": {
    archetypeId: "antipaladin:blighted-myrmidon",
    name: "Unnatural Champion",
    level: 20,
    bucket: "situational",
    note: "banishment rider on smite nature vs. extraplanar elementals/fey — single-target/enemy-type scoped; 'otherwise functions as unholy champion' restates no DR text, and the hand-tabled base 10/good bump (class note 3) correctly stays live for this archetype (Unholy Champion's slot is paired, but the DR suppression keys on Aura of Depravity, which this archetype keeps)",
  },

  // ── antipaladin:dread-vanguard ──
  "antipaladin:dread-vanguard:beacon-of-evil:4": {
    archetypeId: "antipaladin:dread-vanguard",
    name: "Beacon of Evil",
    level: 4,
    bucket: "blocked",
    note: "blocked: the one unconditional numeric clause ('gains one additional use of his touch of corruption ability per day' at 4th and every 4 levels) is a POOL-SIZE change to Touch of Corruption's vendored uses.maxFormula — extracting it would double-count/conflict with the vendored resource formula (class note 1). Everything else is an activated standard-action aura (self+ally morale AC/attack/damage/fear-save bonuses, fast healing, later riders) — resource-spend + ally-facing, not extractable either way",
  },
  "antipaladin:dread-vanguard:dark-emissary:17": {
    archetypeId: "antipaladin:dread-vanguard",
    name: "Dark Emissary",
    level: 17,
    bucket: "subsystem",
    note: "activated, resource-spent site-marking utility (desecrate/crushing despair/symbols) — no sheet number. Vendored-data oddity: the id/level says 17 but the text's own grant level is 14th, and the text says 'replaces aura of sin' while the vendored pairing points at Aura of Depravity (17th) — reported, not fixed; nothing here is Change-shaped regardless",
  },

  // ── antipaladin:fearmonger ──
  "antipaladin:fearmonger:feed-on-fear:2": {
    archetypeId: "antipaladin:fearmonger",
    name: "Feed on Fear",
    level: 2,
    bucket: "subsystem",
    note: "new limited-use self-heal/temp-HP resource pool (1/2 level + Cha uses/day) replacing touch of corruption — a bespoke resource subsystem, trigger-conditional, no baseline number (class note 1)",
  },
  "antipaladin:fearmonger:frightening-cruelty:3": {
    archetypeId: "antipaladin:fearmonger",
    name: "Frightening Cruelty",
    level: 3,
    bucket: "subsystem",
    note: "forces specific cruelty picks at 3rd/6th/9th and adds a panicked cruelty at 12th — cruelty pick-list changes are subsystem (class note 1)",
  },

  // ── antipaladin:insinuator ──
  "antipaladin:insinuator:detect-balance:1": {
    archetypeId: "antipaladin:insinuator",
    name: "Detect Balance",
    level: 1,
    bucket: "subsystem",
    note: "Detect Good reflavor to neutrality detection — narrative utility, no number",
  },
  "antipaladin:insinuator:invocation:1": {
    archetypeId: "antipaladin:insinuator",
    name: "Invocation",
    level: 1,
    bucket: "subsystem",
    note: "daily outsider-invocation mechanic gating all the insinuator's Su/Sp class abilities and setting their alignment behavior — a state machine, no number of its own (class note 4)",
  },
  "antipaladin:insinuator:smite-impudence:1": {
    archetypeId: "antipaladin:insinuator",
    name: "Smite Impudence",
    level: 1,
    bucket: "situational",
    note: "Smite Good variant (Cha to attack, half level to damage, invocation-dependent target restriction) — same single-target scoping as base Smite Good; the temp-HP-on-declare rider is activation-triggered (class notes 1/4)",
  },
  "antipaladin:insinuator:selfish-healing:2": {
    archetypeId: "antipaladin:insinuator",
    name: "Selfish Healing",
    level: 2,
    bucket: "subsystem",
    note: "self-only lay-on-hands analog replacing touch of corruption — a resource pool, not Change-shaped (class note 1; same posture as paladin.ts's Lay on Hands rulings)",
  },
  "antipaladin:insinuator:aura-of-ego:3": {
    archetypeId: "antipaladin:insinuator",
    name: "Aura of Ego",
    level: 3,
    bucket: "situational",
    note: "the enemy-facing -2 fear-save half is never extractable (class note 2); the +2 half names 'each ally within 10 feet' without explicitly including the insinuator himself, so there is no unambiguous own-share — and the whole aura is Su, gated on the daily invocation (class note 4)",
  },
  "antipaladin:insinuator:greed:3": {
    archetypeId: "antipaladin:insinuator",
    name: "Greed",
    level: 3,
    bucket: "subsystem",
    note: "self-only paladin mercies replacing cruelty — mercy/cruelty pick-lists are subsystem (class note 1)",
  },
  "antipaladin:insinuator:stubborn-health:3": {
    archetypeId: "antipaladin:insinuator",
    name: "Stubborn Health",
    level: 3,
    bucket: "subsystem",
    note: "halves disease/poison damage and floors ability scores at 1 vs. those effects — damage-halving and ability-damage-floor rules, not Change-shaped numbers; replaces plague bringer (no vendored number)",
  },
  "antipaladin:insinuator:bonus-feat:4": {
    archetypeId: "antipaladin:insinuator",
    name: "Bonus Feat",
    level: 4,
    bucket: "numeric",
    note: "one bonus feat at 4th, another at 7th and every 3 levels thereafter — pure additive bonusFeats count with no paired base-feature slot (replaces antipaladin spells, which aren't Change-shaped; the spell-slot removal itself is a separate unmodeled gap). Feats are not Su/Sp, so the invocation gate (class note 4) doesn't apply; the combat/Skill Focus list restriction isn't modeled, only the count — extracted (see ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED below)",
  },
  "antipaladin:insinuator:channel-energy:4": {
    archetypeId: "antipaladin:insinuator",
    name: "Channel Energy",
    level: 4,
    bucket: "subsystem",
    note: "channel variant whose energy type and effective cleric level depend on the daily invocation, consuming selfish-healing uses — resource trade on an unmodeled channel subsystem (class notes 1/4)",
  },
  "antipaladin:insinuator:ambitious-bond:5": {
    archetypeId: "antipaladin:insinuator",
    name: "Ambitious Bond",
    level: 5,
    bucket: "subsystem",
    note: "fiendish boon variant (invocation-matched weapon abilities or outsider servant) — boon choice-list change, no flat number (class note 1)",
  },
  "antipaladin:insinuator:aura-of-ambition:8": {
    archetypeId: "antipaladin:insinuator",
    name: "Aura of Ambition",
    level: 8,
    bucket: "situational",
    note: "the enemy-facing -1 all-saves half is never extractable (class note 2); the +1 half names 'all allies within 10 feet' without explicitly including the insinuator himself, and the aura is Su, invocation-gated (class note 4) — no unconditional own-share",
  },
  "antipaladin:insinuator:aura-of-glory:11": {
    archetypeId: "antipaladin:insinuator",
    name: "Aura of Glory",
    level: 11,
    bucket: "subsystem",
    note: "grants allies use of smite impudence via a two-use spend — resource-spend ally grant, no exploitable number (same shape as paladin.ts's aura of justice rulings)",
  },
  "antipaladin:insinuator:aura-of-belief:14": {
    archetypeId: "antipaladin:insinuator",
    name: "Aura of Belief",
    level: 14,
    bucket: "subsystem",
    note: "weapon-alignment DR-bypass keyed to the daily invocation — a qualifier grant, not a number (same pattern as paladin.ts's DR-bypass aura reflavors)",
  },
  "antipaladin:insinuator:aura-of-indomitability:17": {
    archetypeId: "antipaladin:insinuator",
    name: "Aura of Indomitability",
    level: 17,
    bucket: "situational",
    note: "real DR, but both the amount and the bypass depend on which outsider was invoked that day (10/opposed-alignment, or 5/— while neutral) — an untracked daily choice (class note 4). Cleanly paired to Aura of Depravity, so defenses.ts's antipaladinDamageReductionReplaced already withholds the hand-tabled base 5/good→10/good for this combo (class note 3) — correct suppression, nothing safe to author in its place",
  },
  "antipaladin:insinuator:personal-champion:20": {
    archetypeId: "antipaladin:insinuator",
    name: "Personal Champion",
    level: 20,
    bucket: "situational",
    note: "raises aura of indomitability's invocation-dependent DR (to 15, or 10 while neutral) and doubles smite impudence's bonuses — both ride the same untracked daily-invocation state / smite target scoping as their base entries",
  },

  // ── antipaladin:iron-tyrant ──
  "antipaladin:iron-tyrant:iron-fist:2": {
    archetypeId: "antipaladin:iron-tyrant",
    name: "Iron Fist",
    level: 2,
    bucket: "subsystem",
    note: "named bonus feat (Improved Unarmed Strike) + warpriest sacred-weapon damage-die progression on gauntlets/armor spikes — named-feat grants aren't a bonusFeats count, and there's no engine target for damage-die progressions; replaces touch of corruption (a resource pool, class note 1; the forgone pool isn't suppressed — deriveResourcePools has no archetype-swap awareness, a pre-existing gap, not fixed here)",
  },
  "antipaladin:iron-tyrant:bonus-feats:3": {
    archetypeId: "antipaladin:iron-tyrant",
    name: "Bonus Feats",
    level: 3,
    bucket: "numeric",
    note: "a bonus feat at 3rd and every 3 levels thereafter — clean bonusFeats count, cleanly paired to Cruelty (which carries zero vendored changes, so nothing to double-count; class note 1). The armor/shield combat-feat list restriction isn't modeled, only the count — extracted (see ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED below)",
  },
  "antipaladin:iron-tyrant:unstoppable:4": {
    archetypeId: "antipaladin:iron-tyrant",
    name: "Unstoppable",
    level: 4,
    bucket: "subsystem",
    note: "ignores movement-halving terrain while in heavy armor — a movement rule, not a number (same posture as paladin.ts's Woodland Stride); replaces channel negative energy (not Change-shaped)",
  },
  "antipaladin:iron-tyrant:fiendish-bond:5": {
    archetypeId: "antipaladin:iron-tyrant",
    name: "Fiendish Bond",
    level: 5,
    bucket: "subsystem",
    note: "armor-bond variant of fiendish boon — activated (standard action, 1 min/level, limited uses/day) enhancement-bonus/special-ability choice-list, not a passive number (class note 1)",
  },

  // ── antipaladin:knight-of-the-sepulcher ──
  "antipaladin:knight-of-the-sepulcher:touch-of-the-crypt:5": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Touch of the Crypt",
    level: 5,
    bucket: "numeric",
    note: "unconditional +2 on saves vs. mind-affecting/death/poison — all three scopes exist in SAVE_CATEGORIES ('mind'/'death'/'poison'), extracted via Change.saveCategories; the undead-like negative-energy affinity and 25% fortification halves have no Change target and are dropped (flagged in detail). Paired to Fiendish Boon (zero vendored changes, nothing to double-count)",
  },
  "antipaladin:knight-of-the-sepulcher:fortitude-of-the-crypt:8": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Fortitude of the Crypt",
    level: 8,
    bucket: "numeric",
    note: "unconditional poison immunity (immEffect.poison, the closed-vocabulary slug bloodlines.ts already uses) + darkvision 60 ft. (sensedv, highest-wins resolution handles 'if he does not already possess it') — both clauses extracted whole; replaces aura of despair (enemy-facing, zero vendored changes)",
  },
  "antipaladin:knight-of-the-sepulcher:cloak-of-the-crypt:10": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Cloak of the Crypt",
    level: 10,
    bucket: "numeric",
    note: "unconditional energy-drain immunity (immEffect.energyDrain) — extracted; 'harmful negative energy effects' has no matching immEffect slug (necromancyEffects would over-claim) and 50% fortification isn't an immunity, both dropped. The forgone 10th-level smite good use is a pool-size reduction to a vendored uses.maxFormula — unmodeled (class note 1), noted not extracted",
  },
  "antipaladin:knight-of-the-sepulcher:will-of-the-crypt:11": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Will of the Crypt",
    level: 11,
    bucket: "numeric",
    note: "raises touch of the crypt's +2 vs. mind-affecting/death to +4 — authored as the +2 DELTA on those two categories (untyped bonuses SUM in stacking.ts, so the pair of entries composes to the published +4; the poison scope correctly stays +2) — extracted (see the entry's own comment)",
  },
  "antipaladin:knight-of-the-sepulcher:weapons-of-sin:14": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Weapons of Sin",
    level: 14,
    bucket: "subsystem",
    note: "weapon-alignment DR-bypass grant — a qualifier, not a number (same pattern as paladin.ts's DR-bypass aura reflavors); replaces aura of sin (zero vendored changes)",
  },
  "antipaladin:knight-of-the-sepulcher:crypt-lord:15": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Crypt Lord",
    level: 15,
    bucket: "numeric",
    note: "unconditional immunities to death effects/paralysis/sleep/stunning/fatigue — all five have exact immEffect slugs (deathEffects/paralysis/sleep/stunned/fatigue), extracted; the 75% fortification and the exhausted-becomes-fatigued downgrade have no Change target and are dropped; replaces cruelty (zero vendored changes)",
  },
  "antipaladin:knight-of-the-sepulcher:soul-of-the-crypt:17": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Soul of the Crypt",
    level: 17,
    bucket: "numeric",
    note: "unconditional DR 5/bludgeoning and good — one AND-compound qualifier (dr.bludgeoning-and-good, the bloodlines.ts convention). Cleanly paired to Aura of Depravity, so the hand-tabled base 5/good→10/good is withheld via antipaladinDamageReductionReplaced (class note 3) — no double-count",
  },
  "antipaladin:knight-of-the-sepulcher:undying-champion:20": {
    archetypeId: "antipaladin:knight-of-the-sepulcher",
    name: "Undying Champion",
    level: 20,
    bucket: "numeric",
    note: "the 'DR increases to 10/bludgeoning and good' half is extracted on the same dr.bludgeoning-and-good qualifier as soul of the crypt — defenses.ts groupByQualifier keeps only the highest per qualifier, so 10 wins and 5 is struck through, no double-count (class note 3). The undead type change, undead traits, no-Con/Cha-for-hp-and-Fort rework, and disease-carrier rider are far beyond Change vocabulary and dropped (flagged in detail)",
  },

  // ── antipaladin:rough-rampage ──
  "antipaladin:rough-rampage:aura-of-blood:3": {
    archetypeId: "antipaladin:rough-rampage",
    name: "Aura of Blood",
    level: 3,
    bucket: "situational",
    note: "enemy-facing aura: the -4 penalty on checks to stop bleed/stabilize lands on ENEMIES in the radius — never the character's own sheet numbers (class note 2); replaces aura of cowardice (itself enemy-facing, zero vendored changes)",
  },
  "antipaladin:rough-rampage:aura-of-putrefaction:8": {
    archetypeId: "antipaladin:rough-rampage",
    name: "Aura of Putrefaction",
    level: 8,
    bucket: "situational",
    note: "enemy-facing aura: 1 bleed damage/round to injured ENEMIES in the radius — never extracted (class note 2); replaces aura of despair (enemy-facing, zero vendored changes)",
  },
  "antipaladin:rough-rampage:aura-of-quietus:14": {
    archetypeId: "antipaladin:rough-rampage",
    name: "Aura of Quietus",
    level: 14,
    bucket: "situational",
    note: "enemy-facing aura: suppresses healing of ENEMIES in the radius (caster-level check DC = class level + 11 lands on the enemy caster) — never extracted (class note 2); replaces aura of sin",
  },

  // ── antipaladin:seal-breaker ──
  "antipaladin:seal-breaker:aura-of-the-grave:3": {
    archetypeId: "antipaladin:seal-breaker",
    name: "Aura of the Grave",
    level: 3,
    bucket: "situational",
    note: "behavioral aura: mindless undead won't attack unless they pass a Will save — the DC lands on the undead, not on the seal-breaker's sheet (class note 2); replaces aura of cowardice",
  },
  "antipaladin:seal-breaker:corpse-rider:5": {
    archetypeId: "antipaladin:seal-breaker",
    name: "Corpse Rider",
    level: 5,
    bucket: "subsystem",
    note: "if the undead-mount boon is chosen, grants a mount with effective druid level equal to antipaladin level 1:1 — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block. The undead type swap (Charisma in place of Constitution, an undead save array) has no matching companion stat surface and stays unwired; the bonded-weapon boon option is a separate, unrelated choice (class note 1)",
  },
  "antipaladin:seal-breaker:aura-of-death:8": {
    archetypeId: "antipaladin:seal-breaker",
    name: "Aura of Death",
    level: 8,
    bucket: "situational",
    note: "the +2 profane save bonus lands on OTHER undead creatures in the radius, never on the seal-breaker himself — other-creature-facing aura, not the character's sheet numbers (class note 2); replaces aura of despair",
  },
  "antipaladin:seal-breaker:aura-of-rebirth:11": {
    archetypeId: "antipaladin:seal-breaker",
    name: "Aura of Rebirth",
    level: 11,
    bucket: "subsystem",
    note: "activated (two smite good uses) corpse-to-mohrg summon — a resource-spend summon ability, no sheet number; replaces aura of vengeance (zero vendored changes)",
  },

  // ── antipaladin:tyrant ──
  "antipaladin:tyrant:diabolic-boon:5": {
    archetypeId: "antipaladin:tyrant",
    name: "Diabolic Boon",
    level: 5,
    bucket: "subsystem",
    note: "restricts the fiendish boon servant choice to lawful evil creatures — a boon pick-list restriction, no number (class note 1)",
  },
};

/**
 * ── ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────
 *
 * Machine-extracted mechanical effects for antipaladin archetype class
 * features (the prose→Change extraction pipeline, antipaladin slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table, which has no
 * antipaladin entries) — every entry here additionally carries
 * `confidence`/`provenance` so a reviewer (or the UI) can never confuse "a
 * human read the rulebook and checked this" with "an extraction pass
 * inferred this from prose." 9 of antipaladin's 45 features cleared the
 * `numeric` bar (see `ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION` above
 * for the full per-feature audit) — six of the nine belong to Knight of the
 * Sepulcher, whose undead-adjacent kit is unusually rich in unconditional
 * immunities, save-category bonuses, and flat DR; the rest of the class's
 * kit leans on smite/touch-of-corruption riders and enemy-facing auras,
 * none of which clear the bar (see the header doc comment's class notes).
 */
export const ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // ── Pure additive bonus-feat grants ───────────────────────────────────────

  // Insinuator's "Bonus Feat" (4th, then 7th and every 3 levels) has no
  // paired base-feature slot — it replaces antipaladin spells, which have no
  // bonus-feat progression to swap out — so this is a pure additive count,
  // same posture as paladin.ts's Divine Guardian / Tempered Champion
  // entries. The combat-feat/Skill Focus list restriction isn't modeled.
  "antipaladin:insinuator:bonus-feat:4": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2 + floor((@class.unlevel - 7) / 3), 1)", "bonusFeats"),
    ],
    detail: (level) =>
      `${level >= 7 ? 2 + Math.floor((level - 7) / 3) : 1} bonus feat(s) (combat or Skill Focus)`,
    confidence: "high",
    provenance:
      "At 4th level, an insinuator gains one bonus feat, which must be selected from the list " +
      "of combat feats or Skill Focus. At 7th level and every 3 antipaladin levels thereafter, " +
      "the insinuator gains one additional combat or Skill Focus feat.",
  },

  // Iron Tyrant's "Bonus Feats" (3rd and every 3 levels) is cleanly paired
  // to Cruelty, which carries zero vendored changes — nothing to
  // double-count, and the vendored pairing strikes the base feature through.
  // The armor/shield combat-feat list restriction isn't modeled.
  "antipaladin:iron-tyrant:bonus-feats:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "bonusFeats")],
    detail: (level) =>
      `${1 + Math.floor((level - 3) / 3)} bonus feat(s) (armor/shield combat feats)`,
    confidence: "high",
    provenance:
      "At 3rd level and every 3 antipaladin levels thereafter, an iron tyrant gains a bonus " +
      "feat in addition to those gained from normal advancement.",
  },

  // ── Knight of the Sepulcher's undead-adjacent ladder ──────────────────────

  // Touch of the Crypt's save half names three scopes that all exist in
  // SAVE_CATEGORIES ("mind"/"death"/"poison") — one Change with
  // saveCategories covers all three lines. The negative-energy affinity and
  // the 25% fortification chance have no Change target and are dropped
  // (flagged in detail).
  "antipaladin:knight-of-the-sepulcher:touch-of-the-crypt:5": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["mind", "death", "poison"],
      },
    ],
    detail: () =>
      "+2 saves vs. mind-affecting/death/poison (negative-energy affinity, 25% fortification not modeled)",
    confidence: "medium",
    provenance:
      "At 5th level, a knight of the sepulcher gains a +2 bonus on saving throws against " +
      "mind-affecting effects, death effects, and poison.",
  },

  // Fortitude of the Crypt: both clauses extract whole. Poison immunity uses
  // the closed immEffect vocabulary's exact slug (bloodlines.ts precedent);
  // darkvision uses the sensedv target with NO operator — sense resolution
  // is highest-wins, which is precisely the published "if he does not
  // already possess it" semantics (a 60-ft racial darkvision neither stacks
  // nor doubles).
  "antipaladin:knight-of-the-sepulcher:fortitude-of-the-crypt:8": {
    changes: [c("1", "immEffect.poison"), c("60", "sensedv")],
    detail: () => "immune to poison; darkvision 60 ft.",
    confidence: "high",
    provenance:
      "At 8th level, a knight of the sepulcher gains immunity to poison. He also gains " +
      "darkvision 60 feet if he does not already possess it.",
  },

  // Cloak of the Crypt: only the energy-drain immunity matches the closed
  // immEffect vocabulary. "Harmful negative energy effects" has no slug
  // (necromancyEffects would over-claim — enervation IS a necromancy effect
  // but so are plenty of non-negative-energy spells), and a 50% fortification
  // CHANCE is not an immunity — both dropped rather than guessed.
  "antipaladin:knight-of-the-sepulcher:cloak-of-the-crypt:10": {
    changes: [c("1", "immEffect.energyDrain")],
    detail: () =>
      "immune to energy drain (negative-energy-effect immunity, 50% fortification not modeled)",
    confidence: "medium",
    provenance:
      "At 10th level, the knight of the sepulcher gains immunity to energy drain and harmful " +
      "negative energy effects.",
  },

  // Will of the Crypt raises Touch of the Crypt's +2 to +4 on the
  // mind-affecting and death scopes only. Both entries are UNTYPED, and
  // untyped bonuses SUM in stacking.ts — so unlike the spell-dancer
  // insight-AC pair in magus.ts (typed, highest-wins, authored as flat
  // values), this entry must be the +2 DELTA: 2 (Touch) + 2 (Will) = the
  // published +4, while the poison scope correctly stays at +2. Authoring
  // the flat 4 here would compose to a wrong +6.
  "antipaladin:knight-of-the-sepulcher:will-of-the-crypt:11": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["mind", "death"],
      },
    ],
    detail: () => "+2 more vs. mind-affecting/death (+4 total with Touch of the Crypt)",
    confidence: "medium",
    provenance:
      "At 11th level, a knight of the sepulcher's bonus on saving throws against " +
      "mind-affecting effects and death effects increases to +4.",
  },

  // Crypt Lord: five of the listed immunities have exact immEffect slugs and
  // extract whole; the 75% fortification chance and the exhausted-becomes-
  // fatigued downgrade have no Change target and are dropped (flagged in
  // detail). "He no longer sleeps" is a narrative rider, not a number.
  "antipaladin:knight-of-the-sepulcher:crypt-lord:15": {
    changes: [
      c("1", "immEffect.deathEffects"),
      c("1", "immEffect.paralysis"),
      c("1", "immEffect.sleep"),
      c("1", "immEffect.stunned"),
      c("1", "immEffect.fatigue"),
    ],
    detail: () =>
      "immune to death effects/paralysis/sleep/stunning/fatigue (75% fortification, exhaustion downgrade not modeled)",
    confidence: "medium",
    provenance:
      "He gains immunity to death effects, paralysis, sleep effects, and stunning. He no " +
      "longer sleeps. The knight of the sepulcher also gains immunity to effects that cause " +
      "fatigue, and effects that would cause him to become exhausted instead cause him to " +
      "become fatigued.",
  },

  // Soul of the Crypt: DR 5 behind a single AND-compound bypass qualifier
  // (dr.bludgeoning-and-good — the established dr.good-and-silver/
  // dr.adamantine-and-magic convention). Cleanly paired to Aura of
  // Depravity, so `antipaladinDamageReductionReplaced` (archetypes.ts)
  // withholds the hand-tabled base antipaladin DR (5/good at 17th, 10/good
  // at 20th) for this combo — this entry replaces it rather than stacking
  // beside it (this file's class note 3).
  "antipaladin:knight-of-the-sepulcher:soul-of-the-crypt:17": {
    changes: [c("5", "dr.bludgeoning-and-good")],
    detail: () => "DR 5/bludgeoning and good",
    confidence: "high",
    provenance: "At 17th level, a knight of the sepulcher gains DR 5/bludgeoning and good.",
  },

  // Undying Champion's DR half rides the SAME dr.bludgeoning-and-good
  // qualifier as Soul of the Crypt — defenses.ts's groupByQualifier keeps
  // only the highest value per qualifier (10 applies, 5 struck through), so
  // the pair reproduces the published "increases to 10" with no
  // double-count. The undead type change and the no-Con/Cha-for-hp-and-Fort
  // rework are far beyond Change vocabulary and dropped.
  "antipaladin:knight-of-the-sepulcher:undying-champion:20": {
    changes: [c("10", "dr.bludgeoning-and-good")],
    detail: () => "DR 10/bludgeoning and good (undead type change, Cha-for-Con rework not modeled)",
    confidence: "medium",
    provenance: "His DR increases to 10/bludgeoning and good.",
  },
};
