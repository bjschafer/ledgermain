/**
 * Monk's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (documented in
 * `index.ts`), this file owns BOTH of
 * monk's pipeline artifacts — `MONK_ARCHETYPE_FEATURE_CLASSIFICATION` (the
 * full per-feature audit) and `MONK_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table, empty this wave — see
 * below) — so a future wave working on a different class never has a reason
 * to touch this file; only `index.ts` (the aggregator) needs one new import +
 * one new spread per class.
 *
 * ── MONK_ARCHETYPE_FEATURE_CLASSIFICATION ─────────────────────────────────
 *
 * Classification audit: EVERY feature of EVERY vendored monk archetype (13
 * archetypes, 60 features), individually hand-read and bucketed as
 * `numeric` / `situational` / `subsystem` / `blocked` (no heuristic-assisted
 * bulk pass was needed at this class size — see the fighter pilot's rubric
 * for the full bucket definitions).
 *
 * **Result: zero NEW numeric extractions.** The only `numeric` entry is
 * Nornkith's pre-existing hand-verified `nimble-reflexes:3` (issue #7). This
 * is a real, disclosed finding, not an incomplete pass — monk's archetype
 * kit here skews heavily toward ki-spend activated abilities, immunities,
 * and bonus-feat LIST changes (not counts), none of which are Change-shaped:
 *  - Every "Ki Pool" restatement (Maneuver Master's `ki-pool-magic`/
 *    `-cold-iron-silver`/`-lawful`/`-adamantine`, Invested Regent's
 *    `hellcat-ki`) either reproduces the base pool's own formula unchanged
 *    (it already rides the generic resource-pool pipeline for free — no
 *    hand-authoring needed, same posture Arcane Pool/Arcane Reservoir get
 *    elsewhere) or layers activated, resource-gated powers on top with no
 *    baseline always-on number.
 *  - Every "bonus feat" entry (Invested Regent, Maneuver Master, Scaled Fist)
 *    modifies the LIST of feats a monk's existing bonus-feat slot can pick
 *    from, not the slot's own count/schedule — unlike fighter/cleric/ranger's
 *    `bonusFeats`-Change-shaped grants, there's no number here to extract.
 *  - Real, precisely-scaling numbers exist (Drunken Master's Drunken
 *    Resilience DR, Invested Regent's Hellcat Fury bleed, Nornkith's
 *    Defensive Aid's +4) but every one is gated on a condition the engine
 *    genuinely cannot check without over-applying: a specific combat event
 *    (a confirmed critical hit), a reactive grant to an ADJACENT ALLY rather
 *    than the sheet owner, or holding at least 1 point in a resource pool
 *    (there is no `@data` roll-data path for "current ki pool value" — see
 *    `rolldata.ts`; the formula DSL can gate on persistent character state
 *    like `@armor.type`, never on live resource-pool balances) — classified
 *    `situational`, same honesty bar `traits.ts`'s `courageous`/`birthmark`
 *    already established.
 *
 * **THE documented composition trap, applied (Ironskin Monk / Maneuver
 * Master), classified `blocked`:**
 *  - `iron-skin-1:1` — "This ability replaces the monk's AC bonus ability
 *    and the ability to add his Wisdom bonus to his AC." An UNPAIRED swap
 *    displacing base monk's "AC Bonus (MNK)" class feature, which carries a
 *    REAL vendored Wis-to-AC `Change`. Backfilling Iron Skin's own natural
 *    armor number without suppressing AC Bonus would double-count (the
 *    character keeps Wis-to-AC AND gains natural armor); there is also no
 *    generic mechanism to suppress AC Bonus (MNK) only for THIS Ironskin
 *    Monk feature without also nuking it for any other monk feature that
 *    doesn't touch it. Recorded, not guessed at.
 *  - `tough-as-nails:6` — "This ability replaces fast movement and slow
 *    fall." Fast Movement carries a REAL vendored `landSpeed` Change. Same
 *    shape of trap as `iron-skin-1` above: an unpaired swap of a real
 *    numeric base feature for a new number (DR) that can't be safely
 *    reconciled either way (double-count if unsuppressed, silent
 *    speed-loss if generically suppressed).
 *  - No other monk archetype in this vendored slice touches AC Bonus (MNK),
 *    Fast Movement, or Flurry of Blows' own numeric progression in an
 *    ambiguous/unpaired way (Monk of the Empty Hand's Wild Flurry and Monk
 *    of the Empty Hand's Claws alter flurry/unarmed-strike-die eligibility,
 *    but those progressions are hardcoded `tables.ts` lookups with no
 *    per-archetype override hook at all today — see this wave's own scoping
 *    note in the task brief — so they're `subsystem`, not `blocked`; there
 *    is no vendored `Change` on the base feature for them to ambiguously
 *    displace in the first place).
 *
 * **Suspected vendored-data bugs found (not fixed here, per the task's
 * "report suspects, don't fix" instruction — flagged in the relevant
 * entries' notes too):**
 *  - `maneuver-master:evasion:9` AND `nornkith:evasion:9` — both archetypes
 *    already replace base Evasion with their own ability at 2nd level
 *    (Resilience / Defensive Aid respectively), yet each also carries a
 *    SEPARATE feature at level 9 whose description is verbatim vanilla
 *    base-monk Evasion text. The identical artifact appearing independently
 *    on two different archetypes suggests a shared CSV-compilation quirk
 *    (e.g. a base-feature restatement keyed to the wrong level/archetype)
 *    rather than two unrelated authoring mistakes.
 *  - `maneuver-master:ki-pool-cold-iron-silver:7`,
 *    `-lawful:10`, `-adamantine:16` — each restates the ENTIRE Ki Pool
 *    ability's full text verbatim (identical to `ki-pool-magic:4`,
 *    including its own "at 4th level" language) at a different level number.
 *    Likely an artifact of the CSV compilation splitting one archetype's
 *    single evolving ability into one row per named tier, rather than a
 *    real distinct feature per tier.
 *  - No `pairedBaseFeatureUuid` mispairs (the issue #46 shape of bug) were
 *    noticed in this class's slice, but this wave did not specifically
 *    cross-check every monk feature's pairing against the base monk
 *    Compendium the way issue #46 did for fighter.
 *
 * ── MONK_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────────
 *
 * Empty this wave (see above) — kept as a real `Readonly<Record<...>>` const
 * (not omitted) so `index.ts`'s per-class merge convention stays uniform
 * across every class file regardless of how many numeric entries it found.
 */

import type {
  ArchetypeFeatureClassificationEntry,
  ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const MONK_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "monk:brazen-disciple:black-asp-s-path:1": {
    archetypeId: "monk:brazen-disciple",
    name: "Black Asp's Path",
    level: 1,
    bucket: "subsystem",
    note: "poison-handling immunity plus a bonus feat (Adder Strike) even without prerequisites — a feat/proficiency grant, no Change-shaped number",
  },
  "monk:brazen-disciple:forbidden-powers:4": {
    archetypeId: "monk:brazen-disciple",
    name: "Forbidden Powers",
    level: 4,
    bucket: "subsystem",
    note: "choice of forbidden ki powers replacing several named monk features — a choice-menu swap mechanism, no Change-shaped number of its own",
  },
  "monk:disciple-of-wholeness:healing-ki:4": {
    archetypeId: "monk:disciple-of-wholeness",
    name: "Healing Ki",
    level: 4,
    bucket: "subsystem",
    note: "activated ki-spend healing touch — resource-gated ability, no baseline number",
  },
  "monk:disciple-of-wholeness:hone-body:5": {
    archetypeId: "monk:disciple-of-wholeness",
    name: "Hone Body",
    level: 5,
    bucket: "subsystem",
    note: "conditional disease immunity (while undamaged) plus an activated ki-spend immunity grant — no Change-shaped number",
  },
  "monk:disciple-of-wholeness:greater-hone-body:11": {
    archetypeId: "monk:disciple-of-wholeness",
    name: "Greater Hone Body",
    level: 11,
    bucket: "subsystem",
    note: "extends Hone Body to poison — same posture, no Change-shaped number",
  },
  "monk:disciple-of-wholeness:hone-soul:13": {
    archetypeId: "monk:disciple-of-wholeness",
    name: "Hone Soul",
    level: 13,
    bucket: "subsystem",
    note: "activated ki-spend targeted dispel — resource-gated ability, no baseline number",
  },
  "monk:drunken-master:drunken-ki:3": {
    archetypeId: "monk:drunken-master",
    name: "Drunken Ki",
    level: 3,
    bucket: "subsystem",
    note: "grants a separate, drink-activated 'drunken ki' resource pool — a resource mechanic, no baseline Change; replaces still mind, which carries no vendored number to suppress",
  },
  "monk:drunken-master:drunken-strength:5": {
    archetypeId: "monk:drunken-master",
    name: "Drunken Strength",
    level: 5,
    bucket: "subsystem",
    note: "activated ki-spend extra melee damage die — resource-gated, and dice-based extra damage isn't modelable as a flat Change (no dice roller, per this project's posture)",
  },
  "monk:drunken-master:drunken-courage:11": {
    archetypeId: "monk:drunken-master",
    name: "Drunken Courage",
    level: 11,
    bucket: "subsystem",
    note: "fear immunity conditional on holding at least 1 drunken ki point — an immunity, no Change-shaped number",
  },
  "monk:drunken-master:drunken-resilience-1:13": {
    archetypeId: "monk:drunken-master",
    name: "Drunken Resilience",
    level: 13,
    bucket: "situational",
    note: "real, precisely-scaling DR (1/2/3 at 13th/16th/19th), but conditional on holding at least 1 drunken ki point — a live resource-pool-balance condition the formula DSL has no @data path to check (unlike a persistent state such as @armor.type), so applying it unconditionally would over-grant DR once the pool is spent dry",
  },
  "monk:drunken-master:firewater-breath:19": {
    archetypeId: "monk:drunken-master",
    name: "Firewater Breath",
    level: 19,
    bucket: "subsystem",
    note: "one-shot ki-gated cone damage spell-like ability — activated, resource-gated, and dice-based damage isn't modeled as a flat Change either way",
  },
  "monk:harrow-warden:elemental-strike:1": {
    archetypeId: "monk:harrow-warden",
    name: "Elemental Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Elemental Fist) even without prerequisites — a feat grant, no baseline number",
  },
  "monk:harrow-warden:genie-style:2": {
    archetypeId: "monk:harrow-warden",
    name: "Genie Style",
    level: 2,
    bucket: "subsystem",
    note: "grants access to a menu of genie-themed style feats by level — a choice-list mechanism, no Change-shaped number",
  },
  "monk:harrow-warden:elemental-precision:10": {
    archetypeId: "monk:harrow-warden",
    name: "Elemental Precision",
    level: 10,
    bucket: "subsystem",
    note: "changes which damage reduction types unarmed strikes overcome — no Change target represents an attacker-side DR-bypass rule",
  },
  "monk:harrow-warden:planar-guide:14": {
    archetypeId: "monk:harrow-warden",
    name: "Planar Guide",
    level: 14,
    bucket: "subsystem",
    note: "activated ki-spend plane shift for a group — resource-gated ability, no baseline number",
  },
  "monk:invested-regent:bonus-feat:1": {
    archetypeId: "monk:invested-regent",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list, not its count/schedule — no Change-shaped number",
  },
  "monk:invested-regent:hellcat-fury:1": {
    archetypeId: "monk:invested-regent",
    name: "Hellcat Fury",
    level: 1,
    bucket: "situational",
    note: "real, precisely-scaling bleed damage (1d4 up to 1d12), but only triggers on a confirmed critical hit with a slashing unarmed strike — a specific combat event the static sheet can't condition on, same bar as fighter's crit-triggered entries; also dice-based, which this app doesn't model as a flat number regardless",
  },
  "monk:invested-regent:weapon-and-armor-proficiency:1": {
    archetypeId: "monk:invested-regent",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:invested-regent:torture-training:2": {
    archetypeId: "monk:invested-regent",
    name: "Torture Training",
    level: 2,
    bucket: "subsystem",
    note: "grants a second saving throw against certain conditions — no Change-shaped target for 're-roll a failed save'",
  },
  "monk:invested-regent:crucible-of-pain:3": {
    archetypeId: "monk:invested-regent",
    name: "Crucible of Pain",
    level: 3,
    bucket: "subsystem",
    note: "DR scoped to nonlethal damage specifically — this engine's dr target reduces damage from weapon/natural-attack sources generically with no notion of 'only vs. nonlethal', so applying it via the generic dr target would incorrectly also reduce lethal damage; no safe Change-shaped target exists for this exact scoping",
  },
  "monk:invested-regent:hellcat-ki:4": {
    archetypeId: "monk:invested-regent",
    name: "Hellcat Ki",
    level: 4,
    bucket: "subsystem",
    note: "Ki Pool (unchanged progression, rides the generic resource-pool pipeline for free) plus several activated, resource-gated senses/resistances layered on top — no additional baseline number",
  },
  "monk:maneuver-master:bonus-feat:1": {
    archetypeId: "monk:maneuver-master",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list (adds Power Attack/Improved Sunder/Greater Sunder, removes Dodge/Mobility/Spring Attack), not its count/schedule — no Change-shaped number",
  },
  "monk:maneuver-master:iron-skin-1:1": {
    archetypeId: "monk:maneuver-master",
    name: "Iron Skin",
    level: 1,
    bucket: "blocked",
    note: "THE documented Ironskin Monk trap: an UNPAIRED swap of base monk's AC Bonus (MNK) class feature, which carries a REAL vendored Wis-to-AC Change ('replaces the monk's AC bonus ability and the ability to add his Wisdom bonus to his AC'). Backfilling Iron Skin's own scaling natural-armor number without suppressing AC Bonus would double-count; there's no generic per-feature suppression mechanism that wouldn't also incorrectly zero out AC Bonus for any other Ironskin Monk feature. Recorded, not guessed at.",
  },
  "monk:maneuver-master:resilience:2": {
    archetypeId: "monk:maneuver-master",
    name: "Resilience",
    level: 2,
    bucket: "subsystem",
    note: "replaces evasion with a Fortitude-negates variant — evasion is a save-outcome rule with no vendored Change to begin with, so there's nothing to suppress or backfill",
  },
  "monk:maneuver-master:ki-pool-magic:4": {
    archetypeId: "monk:maneuver-master",
    name: "Ki Pool",
    level: 4,
    bucket: "subsystem",
    note: "Ki Pool (unchanged progression, rides the generic resource-pool pipeline for free) minus the speed-increase power — no baseline number change",
  },
  "monk:maneuver-master:staggering-blow:5": {
    archetypeId: "monk:maneuver-master",
    name: "Staggering Blow",
    level: 5,
    bucket: "subsystem",
    note: "ki-spend stagger effect on a confirmed critical hit — a status-imposing ability with no Change-shaped number; this app has no reroll/status-effect machinery for this, same posture as fighter's Reliable Strike",
  },
  "monk:maneuver-master:tough-as-nails:6": {
    archetypeId: "monk:maneuver-master",
    name: "Tough as Nails",
    level: 6,
    bucket: "blocked",
    note: "the Ironskin Monk's SECOND documented trap: 'replaces fast movement and slow fall' — Fast Movement carries a REAL vendored landSpeed Change. An unpaired swap displacing it for a new DR number would either double-count (if Fast Movement stays unsuppressed) or silently zero out a real speed bonus (if generically suppressed) — same shape of trap as iron-skin-1 above.",
  },
  "monk:maneuver-master:ki-pool-cold-iron-silver:7": {
    archetypeId: "monk:maneuver-master",
    name: "Ki Pool (Cold Iron/Silver)",
    level: 7,
    bucket: "subsystem",
    note: "vendored description is a verbatim repeat of ki-pool-magic:4's full text (including its own 'at 4th level' language) — suspected vendored-data restatement artifact, not a distinct feature; still a Ki Pool restatement either way, no new number",
  },
  "monk:maneuver-master:evasion:9": {
    archetypeId: "monk:maneuver-master",
    name: "Evasion",
    level: 9,
    bucket: "subsystem",
    note: "vendored description is vanilla base-monk Evasion text, attached at level 9 for an archetype that already replaced Evasion with Resilience at 2nd level — suspected vendored-data artifact (the identical pattern also appears on Nornkith, below, suggesting a shared CSV-compilation quirk). Evasion carries no vendored Change regardless. Issue #47: the vendored pairing on this row pointed at the base class's level-9 SLOT (Improved Evasion, not the already-replaced Evasion), incorrectly striking it through in classFeatures — fixed via `SPURIOUS_DUPLICATE_PAIRINGS` in `archetypes.ts` (display-only; Improved Evasion carries no vendored Change either).",
  },
  "monk:maneuver-master:ki-pool-lawful:10": {
    archetypeId: "monk:maneuver-master",
    name: "Ki Pool (Lawful)",
    level: 10,
    bucket: "subsystem",
    note: "same verbatim Ki Pool restatement artifact as ki-pool-cold-iron-silver:7, at a different level tier",
  },
  "monk:maneuver-master:ki-pool-adamantine:16": {
    archetypeId: "monk:maneuver-master",
    name: "Ki Pool (Adamantine)",
    level: 16,
    bucket: "subsystem",
    note: "same verbatim Ki Pool restatement artifact, at a different level tier",
  },
  "monk:maneuver-master:surefooted:17": {
    archetypeId: "monk:maneuver-master",
    name: "Surefooted",
    level: 17,
    bucket: "subsystem",
    note: "removes a difficult-terrain speed penalty — the engine never modeled that penalty in the first place, so nothing to reduce",
  },
  "monk:maneuver-master:unbreakable:20": {
    archetypeId: "monk:maneuver-master",
    name: "Unbreakable",
    level: 20,
    bucket: "subsystem",
    note: "grants several immunities/damage-mitigation traits (death effects, stunning, ability damage/drain, crit/sneak-attack resistance) — no Change-shaped number",
  },
  "monk:master-of-many-styles:pain-points:3": {
    archetypeId: "monk:master-of-many-styles",
    name: "Pain Points",
    level: 3,
    bucket: "subsystem",
    note: "+1 crit-confirm bonus and +1 to Stunning Fist/Quivering Palm DC — critConfirm has no APPLIED target in this engine (compute.ts never consumes it) and there's no target for feat-DC bumps either, so neither half is expressible",
  },
  "monk:master-of-many-styles:exploit-weakness:4": {
    archetypeId: "monk:master-of-many-styles",
    name: "Exploit Weakness",
    level: 4,
    bucket: "situational",
    note: "real per-round combat bonuses (attack/DR-bypass, or a dodge/Sense-Motive/Reflex bonus vs. one chosen opponent), but each is a swift-action choice scoped to a single attack or a single opponent that round — same bar as traits.ts's combat-situational entries; replaces ki pool, which has no baseline number of its own to suppress",
  },
  "monk:master-of-many-styles:martial-arts-master:4": {
    archetypeId: "monk:master-of-many-styles",
    name: "Martial Arts Master",
    level: 4,
    bucket: "subsystem",
    note: "lets monk level satisfy fighter-level feat prerequisites — a prerequisite-checking rule, no Change-shaped number",
  },
  "monk:master-of-many-styles:extreme-endurance:5": {
    archetypeId: "monk:master-of-many-styles",
    name: "Extreme Endurance",
    level: 5,
    bucket: "subsystem",
    note: "grants a run of immunities by level (fatigue/exhaustion/stunning/death effects/energy drain) — no Change-shaped number",
  },
  "monk:master-of-many-styles:physical-resistance-1:7": {
    archetypeId: "monk:master-of-many-styles",
    name: "Physical Resistance",
    level: 7,
    bucket: "subsystem",
    note: "reduces ability-damage/drain/penalty effects by a scaling flat amount — no Change target exists for 'reduce incoming ability damage', so there is nothing to apply this number to",
  },
  "monk:master-of-many-styles:defensive-roll:13": {
    archetypeId: "monk:master-of-many-styles",
    name: "Defensive Roll",
    level: 13,
    bucket: "subsystem",
    note: "grants uses/day of the defensive roll advanced rogue talent — a resource-gated ability, no baseline number",
  },
  "monk:master-of-many-styles:quivering-palm:15": {
    archetypeId: "monk:master-of-many-styles",
    name: "Quivering Palm",
    level: 15,
    bucket: "subsystem",
    note: "adds extra daily uses to the base Quivering Palm ability, whose own use-count isn't tracked as an engine resource pool — nothing to add a number to",
  },
  "monk:master-of-many-styles:greater-defensive-roll:19": {
    archetypeId: "monk:master-of-many-styles",
    name: "Greater Defensive Roll",
    level: 19,
    bucket: "subsystem",
    note: "upgrades the (unmodeled) defensive roll ability's damage-negation outcome — no Change-shaped number",
  },
  "monk:monk-of-the-empty-hand:claws:1": {
    archetypeId: "monk:monk-of-the-empty-hand",
    name: "Claws",
    level: 1,
    bucket: "subsystem",
    note: "replaces unarmed strike with the shifter's claws natural attack — the monk's unarmed-strike-die progression is a hardcoded tables.ts table with no per-archetype override mechanism (per this wave's own scoping note), same posture as every other archetype altering that progression",
  },
  "monk:monk-of-the-empty-hand:rebuking-strike:1": {
    archetypeId: "monk:monk-of-the-empty-hand",
    name: "Rebuking Strike",
    level: 1,
    bucket: "situational",
    note: "real, scaling knockback distance and a Fortitude DC, but only triggers on a successful claw-attack hit — a specific combat event, and there is no engine target for a forced-movement effect regardless",
  },
  "monk:monk-of-the-empty-hand:weapon-and-armor-proficiency:1": {
    archetypeId: "monk:monk-of-the-empty-hand",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:monk-of-the-empty-hand:wild-flurry:1": {
    archetypeId: "monk:monk-of-the-empty-hand",
    name: "Wild Flurry",
    level: 1,
    bucket: "subsystem",
    note: "alters which attacks flurry of blows can use — flurry's own progression is a hardcoded tables.ts table with no per-archetype override mechanism, same posture as Claws above",
  },
  "monk:monk-of-the-seven-forms:elemental-fist-1d6:1": {
    archetypeId: "monk:monk-of-the-seven-forms",
    name: "Elemental Fist (1d6)",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Elemental Fist) with a scaling EXTRA DAMAGE DIE (1d6 up to 4d6) — dice-based damage isn't modelable as a flat Change (no dice roller, per this project's posture), so there's no number to extract even though the scaling itself is real",
  },
  "monk:monk-of-the-seven-forms:slow-time:12": {
    archetypeId: "monk:monk-of-the-seven-forms",
    name: "Slow Time",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend extra standard actions in a turn — resource-gated ability, no baseline number",
  },
  "monk:monk-of-the-seven-forms:aspect-master:17": {
    archetypeId: "monk:monk-of-the-seven-forms",
    name: "Aspect Master",
    level: 17,
    bucket: "subsystem",
    note: "one-time alignment-gated character-defining choice with narrative/roleplay effects — no Change-shaped number described",
  },
  "monk:monk-of-the-seven-forms:immortality:20": {
    archetypeId: "monk:monk-of-the-seven-forms",
    name: "Immortality",
    level: 20,
    bucket: "subsystem",
    note: "capstone narrative ability (no aging, reincarnation on death) — no Change-shaped number",
  },
  "monk:nornkith:defensive-aid:2": {
    archetypeId: "monk:nornkith",
    name: "Defensive Aid",
    level: 2,
    bucket: "situational",
    note: "real +4 circumstance bonus, but it's a reactive, limited-use grant to an ADJACENT ALLY (not the nimble guardian herself) — no target for granting another character a conditional AC/save bonus from the sheet owner's own build",
  },
  "monk:nornkith:nimble-reflexes:3": {
    archetypeId: "monk:nornkith",
    name: "Nimble Reflexes",
    level: 3,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts",
  },
  "monk:nornkith:defensive-mastery:5": {
    archetypeId: "monk:nornkith",
    name: "Defensive Mastery",
    level: 5,
    bucket: "subsystem",
    note: "adds uses/day to Defensive Aid (itself not an engine resource pool) plus a reactive ki-spend damage negation — no baseline number",
  },
  "monk:nornkith:guardian-feline:7": {
    archetypeId: "monk:nornkith",
    name: "Guardian Feline",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend alternate-wild-shape-like transformation into a feline — an activated polymorph ability, no baseline number (this engine doesn't model per-form combat stats anyway)",
  },
  "monk:nornkith:evasion:9": {
    archetypeId: "monk:nornkith",
    name: "Evasion",
    level: 9,
    bucket: "subsystem",
    note: "vendored description is vanilla base-monk Evasion text, attached at level 9 for an archetype that already replaced Evasion with Defensive Aid at 2nd level — suspected vendored-data artifact (the identical pattern also appears on Maneuver Master, above, suggesting a shared CSV-compilation quirk rather than two independent errors). Evasion carries no vendored Change regardless. Issue #47: the vendored pairing on this row pointed at the base class's level-9 SLOT (Improved Evasion, not the already-replaced Evasion), incorrectly striking it through in classFeatures — fixed via `SPURIOUS_DUPLICATE_PAIRINGS` in `archetypes.ts` (display-only; Improved Evasion carries no vendored Change either).",
  },
  "monk:sage-counselor:awaken-divinity:1": {
    archetypeId: "monk:sage-counselor",
    name: "Awaken Divinity",
    level: 1,
    bucket: "subsystem",
    note: "grants OTHER creatures a temporary ki point usable for a scaling AC/speed/ability-penalty/reroll/perfect-self buff — a complex, resource-gated, other-creature-targeting ability with no baseline number for the Ouat herself",
  },
  "monk:sage-counselor:spurn-tradition:1": {
    archetypeId: "monk:sage-counselor",
    name: "Spurn Tradition",
    level: 1,
    bucket: "subsystem",
    note: "halves the effectiveness of other creatures' anti-dwarf abilities against her and grants a weapon proficiency — no Change-shaped target represents 'halve an opponent's own class feature'",
  },
  "monk:sage-counselor:know-the-unseen-disciples:7": {
    archetypeId: "monk:sage-counselor",
    name: "Know the Unseen Disciples",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend see-invisibility — resource-gated ability, no baseline number",
  },
  "monk:scaled-fist:bonus-feat:1": {
    archetypeId: "monk:scaled-fist",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list (adds Dragon Style/Intimidating Prowess/etc.), not its count/schedule — no Change-shaped number",
  },
  "monk:scaled-fist:draconic-might:1": {
    archetypeId: "monk:scaled-fist",
    name: "Draconic Might",
    level: 1,
    bucket: "subsystem",
    note: "rebases several Wisdom-keyed calculations (Stunning Fist DC, etc.) onto Charisma — an ability-score-basis swap, not an additive bonus; no Change-shaped target represents 'use a different ability score for this calculation'",
  },
  "monk:soul-shepherd:mortification:4": {
    archetypeId: "monk:soul-shepherd",
    name: "Mortification",
    level: 4,
    bucket: "subsystem",
    note: "a large menu of choosable ki-gated powers (mortifications), most activated and several targeting other creatures — deferred, no schema field or picker exists for this choice-bearing menu (same posture as Magus Arcana / Arcanist Exploits before its own picker / Oracle Revelations). One mortification (Armor of Scars, a stackable +1 natural armor) is a real number, but it's one menu choice with no per-choice schema field to select it, and conditional on holding ki in a dedicated mortification-only pool — same unmodelable resource-state gate as Drunken Resilience above.",
  },
};

/**
 * Machine-extracted mechanical effects — empty this wave (see the file-level
 * doc comment above for why). Kept as a real object, not omitted, so
 * `index.ts`'s per-class merge stays uniform.
 */
export const MONK_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {};
