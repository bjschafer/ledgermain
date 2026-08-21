/**
 * Monk's slice of the pipeline. Per the per-class file convention (documented
 * in `index.ts`), this file owns BOTH of monk's pipeline artifacts —
 * `MONK_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) and
 * `MONK_ARCHETYPE_EFFECTS_EXTRACTED` (the machine-extracted `Change`-shaped
 * effects table) — so a future wave working on a different class never has a
 * reason to touch this file; only `index.ts` (the aggregator) needs one new
 * import + one new spread per class.
 *
 * ── MONK_ARCHETYPE_FEATURE_CLASSIFICATION ─────────────────────────────────
 *
 * Classification audit: EVERY feature of EVERY vendored monk archetype (56
 * archetypes, 328 features), individually hand-read and bucketed as
 * `numeric` / `situational` / `subsystem` / `blocked` (see the fighter
 * pilot's rubric for the full bucket definitions). 26 numeric, 37
 * situational, 260 subsystem, 5 blocked.
 *
 * A handful of archetype ids are byte-identical (or near-identical) twins of
 * another archetype already classified in this file, stamped separately by
 * two different vendored sources for the same published content: Ironskin
 * Monk / Maneuver Master, Nimble Guardian / Nornkith, Hellcat / (the original)
 * Invested Regent content, Elemental Monk / Harrow Warden, Black Asp /
 * (the original) Brazen Disciple content, and Master of Many Styles / Martial
 * Artist (every Master of Many Styles feature in this data slice is a
 * curly-quote-only variant of a Martial Artist feature's prose, not the
 * genuine Ultimate Combat Master of Many Styles kit). Each twin gets its own
 * classification entry (and, where numeric, its own extracted entry —
 * `resolveArchetypeFeatureEffect` looks up by exact feature id, so a twin
 * under a different id resolves to nothing without one) rather than being
 * skipped, even where the judgment matches its sibling exactly.
 *
 * Monk's kit still skews heavily toward ki-spend activated abilities,
 * immunities, choice-menus (ki powers, mortifications, style feats,
 * chakras), and bonus-feat LIST changes (not counts) — none of which are
 * Change-shaped:
 *  - A "Ki Pool" entry either reproduces the base pool's own formula
 *    unchanged (already rides the generic resource-pool pipeline for free) or
 *    layers an activated, resource-gated power on top with no baseline
 *    always-on number; a single-clause "spend N ki for a temporary bonus"
 *    ability is `situational` (a real, disclosed number the static sheet
 *    can't apply), while one bundling several entangled activated effects
 *    with no single number standing out is `subsystem`.
 *  - A "bonus feat" entry usually modifies the LIST of feats a monk's
 *    existing bonus-feat slot can pick from, not the slot's own
 *    count/schedule — no number to extract. Martial Artist's Bonus Feats is
 *    the one exception: a genuinely additive +1 slot (traded for Abundant
 *    Step, not for any part of the base schedule), safe to extract.
 *  - A qualified save bonus ("+2 vs. fear/poison/etc.") is `numeric` via
 *    `allSavingThrows` + `Change.saveCategories` only when every named
 *    condition (or at least one) has a real `SAVE_CATEGORIES` entry
 *    (save-categories.ts's closed vocabulary — alignment subtypes have none);
 *    otherwise `situational`.
 *  - A pure immunity grant is `numeric` via `immEffect.<slug>` only when the
 *    slug is in defenses.ts's closed `EFFECT_IMMUNITY_LABELS` vocabulary
 *    (fatigue, exhaustion, stunned, deathEffects, energyDrain,
 *    abilityDamage, abilityDrain, mindAffecting, etc. all qualify; "pain" and
 *    partial/percentage immunities do not).
 *  - Real, precisely-scaling numbers that are gated on a specific combat
 *    event (a confirmed critical hit), a reactive grant to an ADJACENT ALLY
 *    or MOUNT rather than the sheet owner, or holding at least 1 point in a
 *    resource pool (no `@data` roll-data path for live pool balance — the
 *    formula DSL can gate on persistent character state like `@armor.type`,
 *    never on that) are `situational`, same honesty bar `traits.ts`'s
 *    `courageous`/`birthmark` already established.
 *
 * **THE documented composition trap, applied (Ironskin Monk, both its own
 * vendored id and its Maneuver Master twin), classified `blocked`:**
 *  - `iron-skin:1` — "This ability replaces the monk's AC bonus ability and
 *    the ability to add his Wisdom bonus to his AC." An UNPAIRED swap
 *    displacing base monk's "AC Bonus (MNK)" class feature, which carries a
 *    REAL vendored Wis-to-AC `Change`. Backfilling Iron Skin's own natural
 *    armor number without suppressing AC Bonus would double-count; there is
 *    also no generic mechanism to suppress AC Bonus (MNK) only for THIS
 *    feature without also nuking it for any other monk feature that doesn't
 *    touch it. Recorded, not guessed at.
 *  - `tough-as-nails:6` — "This ability replaces fast movement and slow
 *    fall." Fast Movement carries a REAL vendored `landSpeed` Change. Same
 *    shape of trap: an unpaired swap of a real numeric base feature for a
 *    new number (DR) that can't be safely reconciled either way.
 *  - Softstrike Monk's `nonlethal-strikes:1` is a THIRD, differently-shaped
 *    trap: it shifts the EFFECTIVE monk level fed into the unarmed-strike
 *    damage-die progression by ±4 depending on damage type. That progression
 *    is `tables.ts`'s hardcoded `unarmedDamageDie(classLevel, size)`, which
 *    produces ONE die size from the real monk level with no per-damage-type
 *    split and no override hook — backfilling would require touching
 *    `tables.ts`/`compute.ts` (out of scope for this pipeline) and risks
 *    double-counting the level the table already reads directly.
 *  - No other monk archetype touches AC Bonus (MNK), Fast Movement, or Flurry
 *    of Blows' own numeric progression in an ambiguous/unpaired way (several
 *    archetypes alter flurry/unarmed-strike-die eligibility, but those
 *    progressions are hardcoded `tables.ts` lookups with no per-archetype
 *    override hook at all today, and there is no vendored `Change` on the
 *    base feature for them to ambiguously displace — `subsystem`, not
 *    `blocked`).
 *
 * **Suspected vendored-data bugs found (not fixed here — flagged in the
 * relevant entries' notes too):**
 *  - `maneuver-master:evasion:9` AND `nornkith:evasion:9` — both archetypes
 *    already replace base Evasion with their own ability at 2nd level
 *    (Resilience / Defensive Aid respectively), yet each also carries a
 *    SEPARATE feature at level 9 whose description is verbatim vanilla
 *    base-monk Evasion text. The identical artifact appearing independently
 *    on two different archetypes suggests a shared CSV-compilation quirk
 *    rather than two unrelated authoring mistakes. Their Ironskin Monk /
 *    Nimble Guardian twins do NOT repeat this artifact — each carries a
 *    normal, short "gains Evasion, replaces Improved Evasion" statement at
 *    the same level 9 slot instead.
 *  - `maneuver-master:ki-pool-cold-iron-silver:7`, `-lawful:10`,
 *    `-adamantine:16` — each restates the ENTIRE Ki Pool ability's full text
 *    verbatim (identical to `ki-pool-magic:4`, including its own "at 4th
 *    level" language) at a different level number. Likely an artifact of the
 *    CSV compilation splitting one archetype's single evolving ability into
 *    one row per named tier, rather than a real distinct feature per tier.
 *  - `water-dancer:nereid-s-grace:0` — the vendored text scales the AC dodge
 *    bonus "per monk level" on top of the Charisma bonus (`1 point of
 *    Charisma bonus per monk level`), which would produce an absurdly large
 *    bonus at high level; RAW is a flat Charisma-bonus dodge bonus with no
 *    level multiplier. Not extracted rather than risk a wrong formula from
 *    ambiguous prose.
 *  - `windstep-master:weapon-and-armor-proficiency:1` — the vendored
 *    description is copy-pasted verbatim from Softstrike Monk's own
 *    proficiency text ("A softstrike monk is proficient with...").
 *
 * ── MONK_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────────
 *
 * 20 numeric entries (19 newly extracted here, plus Nornkith's pre-existing
 * hand-verified `nimble-reflexes:3`, which stays in `archetype-effects.ts`
 * rather than being duplicated here). See each entry's own comment for its
 * source sentence and any dropped riders.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
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
  "monk:drunken-master:drunken-resilience:13": {
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
    note: "custom fire-cone damage with no named-spell equivalent, costed in ki points rather than a day/week counter — spell-equivalent effect, cross-pool spend",
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
  "monk:maneuver-master:iron-skin:1": {
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
    note: "the vendored description under this id is Ironskin Monk's Ki Pool replacement text (an object/construct damage bonus that replaces the speed option), stamped onto the wrong archetype id — Maneuver Master's real published kit never touches the base Ki Pool at all. Treated as vendored-data contamination: the base ki-spend toggle table (ki-spends.ts) does NOT exclude the speed option for Maneuver Master monks, unlike the genuine Ironskin Monk replacement this text is copied from.",
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
  "monk:maneuver-master:ki-pool:7": {
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
    bucket: "numeric",
    note: "the +1 Stunning Fist/Quivering Palm DC half is flat and unconditional, now expressible via abilityDC.stunningFist/abilityDC.quiveringPalm (ability-dcs.ts); the +1 crit-confirm half stays unwired — critConfirm has no APPLIED target in this engine (compute.ts never consumes it). Vendored description text under this archetypeId is a byte-identical (modulo curly-quote encoding) stamp of martial-artist:pain-points:3's — see this file's header doc comment on cross-tag twins; verdict mirrors that entry's.",
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
  "monk:master-of-many-styles:physical-resistance:7": {
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
  "monk:monk-of-the-seven-forms:elemental-fist:1": {
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
  "monk:black-asp:black-asp-s-path:1": {
    archetypeId: "monk:black-asp",
    name: "Black Asp's Path",
    level: 1,
    bucket: "subsystem",
    note: "duplicate of brazen-disciple's already-classified Black Asp's Path under a separate vendored archetype id — poison-handling immunity plus Adder Strike as a bonus feat without prerequisites, no Change-shaped number",
  },
  "monk:black-asp:forbidden-powers:4": {
    archetypeId: "monk:black-asp",
    name: "Forbidden Powers",
    level: 4,
    bucket: "subsystem",
    note: "duplicate of brazen-disciple's already-classified Forbidden Powers — choice of forbidden ki powers, a choice-menu swap mechanism with no Change-shaped number of its own",
  },
  "monk:brazen-disciple:confounding-koan:12": {
    archetypeId: "monk:brazen-disciple",
    name: "Confounding Koan",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend confusion effect (DC-based) imposed on a target — no Change-shaped number for the monk's own sheet",
  },
  "monk:brazen-disciple:efreeti-s-guile:3": {
    archetypeId: "monk:brazen-disciple",
    name: "Efreeti's Guile",
    level: 3,
    bucket: "subsystem",
    note: "ability-score-basis swap (Wisdom instead of Charisma) — no Change-shaped target for changing which ability a calculation keys on (Bluff/Disguise)",
  },
  "monk:brazen-disciple:feinting-flurry:1": {
    archetypeId: "monk:brazen-disciple",
    name: "Feinting Flurry",
    level: 1,
    bucket: "subsystem",
    note: "Bluff-check feint mechanic folded into flurry of blows, plus a denied-Dex-bonus rider at 6th — a rule change, no Change-shaped number",
  },
  "monk:brazen-disciple:genie-apotheosis:20": {
    archetypeId: "monk:brazen-disciple",
    name: "Genie Apotheosis",
    level: 20,
    bucket: "numeric",
    note: "creature-type change and a 1/day limited wish are unmodeled, but the fire immunity is flat and unconditional at this capstone level",
  },
  "monk:elemental-monk:elemental-precision:10": {
    archetypeId: "monk:elemental-monk",
    name: "Elemental Precision",
    level: 10,
    bucket: "subsystem",
    note: "duplicate of harrow-warden's already-classified Elemental Precision — changes which DR types unarmed strikes overcome, no Change target for an attacker-side DR-bypass rule",
  },
  "monk:elemental-monk:elemental-strike:1": {
    archetypeId: "monk:elemental-monk",
    name: "Elemental Strike",
    level: 1,
    bucket: "subsystem",
    note: "duplicate of harrow-warden's already-classified Elemental Strike — bonus feat (Elemental Fist) without prerequisites, no baseline number",
  },
  "monk:elemental-monk:genie-style:2": {
    archetypeId: "monk:elemental-monk",
    name: "Genie Style",
    level: 2,
    bucket: "subsystem",
    note: "duplicate of harrow-warden's already-classified Genie Style — choice-list access to style feats by level, no Change-shaped number",
  },
  "monk:elemental-monk:planar-guide:14": {
    archetypeId: "monk:elemental-monk",
    name: "Planar Guide",
    level: 14,
    bucket: "subsystem",
    note: "duplicate of harrow-warden's already-classified Planar Guide — activated ki-spend plane shift for a group, no baseline number",
  },
  "monk:far-strike-monk:bonus-feats:0": {
    archetypeId: "monk:far-strike-monk",
    name: "Bonus Feats",
    level: 0,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list, not its count/schedule — no Change-shaped number",
  },
  "monk:far-strike-monk:fast-thrower:1": {
    archetypeId: "monk:far-strike-monk",
    name: "Fast Thrower",
    level: 1,
    bucket: "subsystem",
    note: "bonus feats (Quick Draw, Shot on the Run) plus extra penalized ranged attacks during movement — an action-economy grant, no flat Change-shaped number",
  },
  "monk:far-strike-monk:flurry-of-blows:0": {
    archetypeId: "monk:far-strike-monk",
    name: "Flurry of Blows",
    level: 0,
    bucket: "subsystem",
    note: "restricts flurry of blows to thrown weapons — alters an existing hardcoded progression, no Change target",
  },
  "monk:far-strike-monk:invisible-blade:3": {
    archetypeId: "monk:far-strike-monk",
    name: "Invisible Blade",
    level: 3,
    bucket: "situational",
    note: "real, narrower Stealth penalty (-10 instead of -20), but scoped to maintaining an obscured location specifically after sniping — a specific action, not a general Stealth bonus",
  },
  "monk:far-strike-monk:ki-missile:5": {
    archetypeId: "monk:far-strike-monk",
    name: "Ki Missile",
    level: 5,
    bucket: "subsystem",
    note: "ki-spend die-swap for thrown-weapon damage — resource-gated, and dice-based damage isn't modeled as a flat Change either way",
  },
  "monk:far-strike-monk:ki-pool:4": {
    archetypeId: "monk:far-strike-monk",
    name: "Ki Pool",
    level: 4,
    bucket: "situational",
    note: "real, precisely-scaling number (+20 ft. thrown-weapon range increment for 1 round), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:far-strike-monk:trick-throw:11": {
    archetypeId: "monk:far-strike-monk",
    name: "Trick Throw",
    level: 11,
    bucket: "subsystem",
    note: "ki-spend ignore-concealment/cover ability — a boolean capability grant, no numeric magnitude to extract",
  },
  "monk:far-strike-monk:weapon-and-armor-proficiency:0": {
    archetypeId: "monk:far-strike-monk",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:flowing-monk:bonus-feat:0": {
    archetypeId: "monk:flowing-monk",
    name: "Bonus Feat",
    level: 0,
    bucket: "subsystem",
    note: "replaces the entire monk bonus-feat LIST, not its count/schedule — no Change-shaped number",
  },
  "monk:flowing-monk:elusive-target:5": {
    archetypeId: "monk:flowing-monk",
    name: "Elusive Target",
    level: 5,
    bucket: "subsystem",
    note: "ki-spend opposed-Reflex-save damage mitigation, redirectable to a flanking ally — a special defensive mechanic with no Change-shaped target, resource-gated regardless",
  },
  "monk:flowing-monk:flowing-dodge:3": {
    archetypeId: "monk:flowing-monk",
    name: "Flowing Dodge",
    level: 3,
    bucket: "situational",
    note: "real dodge bonus (+1 per adjacent enemy, capped at Wis mod), but scales on a live combat-state count (adjacent enemies) the static sheet can't track",
  },
  "monk:flowing-monk:redirection:1": {
    archetypeId: "monk:flowing-monk",
    name: "Redirection",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (reactive reposition/trip maneuver against an attacker)",
  },
  "monk:flowing-monk:unbalancing-counter:2": {
    archetypeId: "monk:flowing-monk",
    name: "Unbalancing Counter",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (attack-of-opportunity rider, DC-based flat-footed effect on the target)",
  },
  "monk:flowing-monk:volley-spell:15": {
    archetypeId: "monk:flowing-monk",
    name: "Volley Spell",
    level: 15,
    bucket: "subsystem",
    note: "ki-spend spell-turning ability, gated on spell resistance already stopping an effect — no baseline Change-shaped number",
  },
  "monk:gray-disciple:born-in-darkness:7": {
    archetypeId: "monk:gray-disciple",
    name: "Born in Darkness",
    level: 7,
    bucket: "subsystem",
    note: "functions as darkness, costed in ki points rather than a day/week counter — cross-pool spend",
  },
  "monk:gray-disciple:earth-glide:12": {
    archetypeId: "monk:gray-disciple",
    name: "Earth Glide",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend earth glide movement ability — activated, resource-gated, no bonus magnitude to extract",
  },
  "monk:gray-disciple:earthen-thrall:17": {
    archetypeId: "monk:gray-disciple",
    name: "Earthen Thrall",
    level: 17,
    bucket: "subsystem",
    note: "DC-based dominate effect on an earth-subtype creature — no Change-shaped number for the gray disciple's own sheet",
  },
  "monk:gray-disciple:entomb:15": {
    archetypeId: "monk:gray-disciple",
    name: "Entomb",
    level: 15,
    bucket: "subsystem",
    note: "DC-based instant-kill/ejection effect on a target via a combat maneuver — no Change-shaped number for the gray disciple's own sheet",
  },
  "monk:gray-disciple:fade-from-sight:4": {
    archetypeId: "monk:gray-disciple",
    name: "Fade from Sight",
    level: 4,
    bucket: "subsystem",
    note: "functions as invisibility, costed in ki points rather than a day/week counter — cross-pool spend, additionally gated on already having invisibility as an SLA from elsewhere",
  },
  "monk:gray-disciple:gray-heart:6": {
    archetypeId: "monk:gray-disciple",
    name: "Gray Heart",
    level: 6,
    bucket: "subsystem",
    note: "functions as enlarge person, costed in ki points rather than a day/week counter — cross-pool spend, additionally gated on already having enlarge person as an SLA from elsewhere",
  },
  "monk:hamatulatsu-master:alignment:0": {
    archetypeId: "monk:hamatulatsu-master",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction — no Change-shaped effect",
  },
  "monk:hamatulatsu-master:bonus-feats:0": {
    archetypeId: "monk:hamatulatsu-master",
    name: "Bonus Feats",
    level: 0,
    bucket: "subsystem",
    note: "replaces the monk bonus-feat LIST, plus an optional trade for extra Stunning Fist uses/day — no Change-shaped count",
  },
  "monk:hamatulatsu-master:infernal-resilience:5": {
    archetypeId: "monk:hamatulatsu-master",
    name: "Infernal Resilience",
    level: 5,
    bucket: "numeric",
    note: "immunity to pain-descriptor effects isn't extracted (no 'pain' slug in the closed immEffect vocabulary); of the qualified save bonus (sicken/nauseate/stagger/stun), 'stun' and 'nausea' (covers sicken/nauseate) are SAVE_CATEGORIES entries, so both are extracted; stagger alone has none and is dropped",
  },
  "monk:hamatulatsu-master:ki-pool:0": {
    archetypeId: "monk:hamatulatsu-master",
    name: "Ki Pool",
    level: 0,
    bucket: "subsystem",
    note: "activated, ki-spend ability (extra flurry attack, extra Stunning Fist use, or a +2 immediate-action retaliatory strike) — resource-gated temporary effect bundling multiple clauses, not a single baseline sheet number",
  },
  "monk:hamatulatsu-master:stunning-fist:0": {
    archetypeId: "monk:hamatulatsu-master",
    name: "Stunning Fist",
    level: 0,
    bucket: "subsystem",
    note: "expands Stunning Fist's condition menu (shaken/bleed/frightened) — the feat's own DC/uses aren't a Change target this archetype adds to",
  },
  "monk:hellcat:alignment:0": {
    archetypeId: "monk:hellcat",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction — no Change-shaped effect",
  },
  "monk:hellcat:bonus-feat:0": {
    archetypeId: "monk:hellcat",
    name: "Bonus Feat",
    level: 0,
    bucket: "subsystem",
    note: "duplicate of invested-regent's already-classified Bonus Feat — modifies the LIST, not the count/schedule",
  },
  "monk:hellcat:class-skills:0": {
    archetypeId: "monk:hellcat",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "class-skill list change — no Change-shaped effect",
  },
  "monk:hellcat:crucible-of-pain:3": {
    archetypeId: "monk:hellcat",
    name: "Crucible of Pain",
    level: 3,
    bucket: "subsystem",
    note: "duplicate of invested-regent's already-classified Crucible of Pain — DR scoped to nonlethal damage specifically, which this engine's generic dr target can't express without also reducing lethal damage",
  },
  "monk:hellcat:hellcat-fury:1": {
    archetypeId: "monk:hellcat",
    name: "Hellcat Fury",
    level: 1,
    bucket: "situational",
    note: "duplicate of invested-regent's already-classified Hellcat Fury — real number (scaling bleed damage), but triggers only on a confirmed critical hit with a slashing unarmed strike — a specific combat event the static sheet can't condition on; also dice-based",
  },
  "monk:hellcat:hellcat-ki:4": {
    archetypeId: "monk:hellcat",
    name: "Hellcat Ki",
    level: 4,
    bucket: "subsystem",
    note: "duplicate of invested-regent's already-classified Hellcat Ki — unchanged Ki Pool baseline plus several bundled activated senses/resistances, no additional baseline number",
  },
  "monk:hellcat:torture-training:2": {
    archetypeId: "monk:hellcat",
    name: "Torture Training",
    level: 2,
    bucket: "subsystem",
    note: "duplicate of invested-regent's already-classified Torture Training — grants a second saving throw, no Change-shaped target for 're-roll a failed save'",
  },
  "monk:hellcat:weapon-proficiency:0": {
    archetypeId: "monk:hellcat",
    name: "Weapon Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:hungry-ghost-monk:life-from-a-stone:11": {
    archetypeId: "monk:hungry-ghost-monk",
    name: "Life from a Stone",
    level: 11,
    bucket: "subsystem",
    note: "extends Life Funnel/Steal Ki's applicability to non-living creatures — no NEW number, both underlying abilities stay resource+event-gated",
  },
  "monk:hungry-ghost-monk:life-funnel:7": {
    archetypeId: "monk:hungry-ghost-monk",
    name: "Life Funnel",
    level: 7,
    bucket: "situational",
    note: "real number (heal equal to monk level), but triggers only on a confirmed critical hit against a living enemy — a specific combat event the static sheet can't condition on, additionally gated on holding at least 1 ki point",
  },
  "monk:hungry-ghost-monk:punishing-kick:1": {
    archetypeId: "monk:hungry-ghost-monk",
    name: "Punishing Kick",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (push distance tied to a specific feat's on-hit trigger)",
  },
  "monk:hungry-ghost-monk:sipping-demon:0": {
    archetypeId: "monk:hungry-ghost-monk",
    name: "Sipping Demon",
    level: 0,
    bucket: "situational",
    note: "real number (temp HP on hit (Wis mod on a crit), capped at monk level), but triggers only on hitting with a melee attack — a specific combat event the static sheet can't condition on, additionally gated on holding at least 1 ki point",
  },
  "monk:hungry-ghost-monk:steal-ki:5": {
    archetypeId: "monk:hungry-ghost-monk",
    name: "Steal Ki",
    level: 5,
    bucket: "subsystem",
    note: "ki-pool refill mechanic gated on a crit/kill event — a resource-pool mechanic, no baseline Change",
  },
  "monk:invested-regent:investiture:1": {
    archetypeId: "monk:invested-regent",
    name: "Investiture",
    level: 1,
    bucket: "subsystem",
    note: "grants an entirely new resource pool (investiture points) plus an activated save bonus spendable from it — resource-gated, no baseline number",
  },
  "monk:invested-regent:vested-power:2": {
    archetypeId: "monk:invested-regent",
    name: "Vested Power",
    level: 2,
    bucket: "subsystem",
    note: "choice of a vested power in place of a bonus feat — a choice-menu swap mechanism, no Change-shaped number",
  },
  "monk:ironskin-monk:bonus-feat:1": {
    archetypeId: "monk:ironskin-monk",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "mirrors maneuver-master's Bonus feat — modifies the CONTENTS of the bonus-feat list, not its count/schedule",
  },
  "monk:ironskin-monk:evasion:9": {
    archetypeId: "monk:ironskin-monk",
    name: "Evasion",
    level: 9,
    bucket: "subsystem",
    note: "trades Improved Evasion for Evasion — a save-outcome rule with no vendored Change to begin with (unlike maneuver-master's identically-slotted feature, this vendor's text is the normal short grant, not the verbatim-vanilla-text restatement artifact)",
  },
  "monk:ironskin-monk:iron-skin:1": {
    archetypeId: "monk:ironskin-monk",
    name: "Iron Skin",
    level: 1,
    bucket: "blocked",
    note: "THE documented Ironskin Monk trap, same as maneuver-master:iron-skin:1: an UNPAIRED swap of base monk's AC Bonus (MNK) class feature, which carries a REAL vendored Wis-to-AC Change. Backfilling this archetype's own scaling natural-armor number without suppressing AC Bonus would double-count; no generic per-feature suppression mechanism exists. Recorded, not guessed at.",
  },
  "monk:ironskin-monk:ki-pool:4": {
    archetypeId: "monk:ironskin-monk",
    name: "Ki Pool",
    level: 4,
    bucket: "situational",
    note: "real, precisely-scaling number (damage bonus vs. objects/constructs equal to 1/2 monk level), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:ironskin-monk:resilience:2": {
    archetypeId: "monk:ironskin-monk",
    name: "Resilience",
    level: 2,
    bucket: "subsystem",
    note: "save-outcome rule (Fortitude-negates a partial-effect attack) — the replaced Evasion carries no vendored Change to begin with, so nothing to suppress or backfill",
  },
  "monk:ironskin-monk:staggering-blow:5": {
    archetypeId: "monk:ironskin-monk",
    name: "Staggering Blow",
    level: 5,
    bucket: "subsystem",
    note: "ki-spend stagger effect on a confirmed critical hit — a status-imposing ability with no Change-shaped number, this app has no reroll/status-effect machinery for it",
  },
  "monk:ironskin-monk:surefooted:17": {
    archetypeId: "monk:ironskin-monk",
    name: "Surefooted",
    level: 17,
    bucket: "subsystem",
    note: "removes a difficult-terrain speed penalty the engine never modeled in the first place — nothing to reduce",
  },
  "monk:ironskin-monk:tough-as-nails:6": {
    archetypeId: "monk:ironskin-monk",
    name: "Tough as Nails",
    level: 6,
    bucket: "blocked",
    note: "the Ironskin Monk's SECOND documented trap, same as maneuver-master:tough-as-nails:6: 'replaces fast movement and slow fall' — Fast Movement carries a REAL vendored landSpeed Change. An unpaired swap for a new DR number would either double-count or silently zero out a real speed bonus.",
  },
  "monk:ironskin-monk:unbreakable:20": {
    archetypeId: "monk:ironskin-monk",
    name: "Unbreakable",
    level: 20,
    bucket: "numeric",
    note: "the 75%-chance crit/sneak-attack mitigation isn't modeled (not a full immunity), but death-effect immunity, stun immunity, and ability-damage/-drain immunity are unconditional flags in the closed immEffect vocabulary",
  },
  "monk:karmic-monk:alignment:0": {
    archetypeId: "monk:karmic-monk",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction — no Change-shaped effect",
  },
  "monk:karmic-monk:balanced-mind:3": {
    archetypeId: "monk:karmic-monk",
    name: "Balanced Mind",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (save bonus scoped to chaos/evil/good/law-subtype effects and creatures — no matching SAVE_CATEGORIES entry exists; that vocabulary has no alignment axis)",
  },
  "monk:karmic-monk:class-skills:0": {
    archetypeId: "monk:karmic-monk",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "class-skill list change — no Change-shaped effect",
  },
  "monk:karmic-monk:harmonic-self:20": {
    archetypeId: "monk:karmic-monk",
    name: "Harmonic Self",
    level: 20,
    bucket: "subsystem",
    note: "alters Perfect Self's DR qualifier (chaotic-only to all-alignment) — Perfect Self itself carries no vendored Change to begin with, and this engine has no target for a multi-alignment-qualifier DR bypass",
  },
  "monk:karmic-monk:harmony:9": {
    archetypeId: "monk:karmic-monk",
    name: "Harmony",
    level: 9,
    bucket: "subsystem",
    note: "temporary self-alignment shift for the purpose of alignment-dependent effects — no Change-shaped number",
  },
  "monk:karmic-monk:karmic-disruption:16": {
    archetypeId: "monk:karmic-monk",
    name: "Karmic Disruption",
    level: 16,
    bucket: "subsystem",
    note: "ki-spend bonus damage vs. a chosen alignment — resource-gated and dice-based",
  },
  "monk:karmic-monk:karmic-strike:1": {
    archetypeId: "monk:karmic-monk",
    name: "Karmic Strike",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (bonus only vs. a creature that attacked first, tracked per-creature over time)",
  },
  "monk:karmic-monk:ki-pool:7": {
    archetypeId: "monk:karmic-monk",
    name: "Ki Pool",
    level: 7,
    bucket: "subsystem",
    note: "alters ki strike's alignment-bypass tags — no baseline number change",
  },
  "monk:kata-master:dizzying-defense:15": {
    archetypeId: "monk:kata-master",
    name: "Dizzying Defense",
    level: 15,
    bucket: "subsystem",
    note: "grants a swashbuckler deed — an unmodeled subsystem grant, no Change",
  },
  "monk:kata-master:ki-pool:4": {
    archetypeId: "monk:kata-master",
    name: "Ki Pool",
    level: 4,
    bucket: "subsystem",
    note: "lets ki points double as panache points — a currency-equivalence rule, no Change",
  },
  "monk:kata-master:menacing-swordplay:3": {
    archetypeId: "monk:kata-master",
    name: "Menacing Swordplay",
    level: 3,
    bucket: "subsystem",
    note: "grants a swashbuckler deed — an unmodeled subsystem grant, no Change",
  },
  "monk:kata-master:panache:1": {
    archetypeId: "monk:kata-master",
    name: "Panache",
    level: 1,
    bucket: "subsystem",
    note: "grants the swashbuckler panache resource pool plus two deeds — a whole unmodeled subsystem, no baseline Change",
  },
  "monk:kata-master:targeted-strike:7": {
    archetypeId: "monk:kata-master",
    name: "Targeted Strike",
    level: 7,
    bucket: "subsystem",
    note: "grants a swashbuckler deed — an unmodeled subsystem grant, no Change",
  },
  "monk:ki-mystic:ki-mystic:3": {
    archetypeId: "monk:ki-mystic",
    name: "Ki Mystic",
    level: 3,
    bucket: "situational",
    note: "real, precisely-scaling number (+2 Knowledge checks and a swift-action +4 insight bonus), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:ki-mystic:mystic-insight:5": {
    archetypeId: "monk:ki-mystic",
    name: "Mystic Insight",
    level: 5,
    bucket: "subsystem",
    note: "activated, ki-spend ability (grants an ally a reroll) — resource-gated temporary effect bundling multiple clauses, not a single baseline sheet number; also ally-targeted",
  },
  "monk:ki-mystic:mystic-persistence:19": {
    archetypeId: "monk:ki-mystic",
    name: "Mystic Persistence",
    level: 19,
    bucket: "subsystem",
    note: "activated, ki-spend ability (roll-twice-take-better aura for self and allies) — resource-gated temporary effect bundling multiple clauses, not a single baseline sheet number",
  },
  "monk:ki-mystic:mystic-prescience:13": {
    archetypeId: "monk:ki-mystic",
    name: "Mystic Prescience",
    level: 13,
    bucket: "numeric",
    note: "flat insight bonus to AC and CMD, unconditional past 13th level, doubling at 20th — no gating clause",
  },
  "monk:ki-mystic:mystic-visions:11": {
    archetypeId: "monk:ki-mystic",
    name: "Mystic Visions",
    level: 11,
    bucket: "subsystem",
    note: "ki-spend divination-like dream, resource-gated, no combat-facing number",
  },
  "monk:lifting-hand:bonus-feat:1": {
    archetypeId: "monk:lifting-hand",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "modifies the CONTENTS of the monk bonus-feat list, not its count/schedule",
  },
  "monk:lifting-hand:counter-throw:12": {
    archetypeId: "monk:lifting-hand",
    name: "Counter-Throw",
    level: 12,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (+2 CMB scoped to a single readied-action grapple attempt)",
  },
  "monk:lifting-hand:joint-lock:10": {
    archetypeId: "monk:lifting-hand",
    name: "Joint Lock",
    level: 10,
    bucket: "subsystem",
    note: "sickened/fatigued status effect imposed via a maintained grapple — no self-facing Change-shaped number",
  },
  "monk:lifting-hand:savage-toss:1": {
    archetypeId: "monk:lifting-hand",
    name: "Savage Toss",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Savage Slam) plus a forced-movement throw distance scaled off a grapple check margin — feat grant plus a battlefield effect on the TARGET, no number for the character's own sheet; no engine target for forced movement regardless",
  },
  "monk:martial-artist:alignment:0": {
    archetypeId: "monk:martial-artist",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "no alignment restriction, no Change-shaped effect",
  },
  "monk:martial-artist:bonus-feats:12": {
    archetypeId: "monk:martial-artist",
    name: "Bonus Feats:",
    level: 12,
    bucket: "numeric",
    note: "flat +1 bonus-feat slot, purely additive against monk's atomic Bonus Feat (MNK) formula (traded for Abundant Step, not for any part of the base bonus-feat schedule) — no double-count risk",
  },
  "monk:martial-artist:defensive-roll:13": {
    archetypeId: "monk:martial-artist",
    name: "Defensive Roll",
    level: 13,
    bucket: "subsystem",
    note: "grants uses/day of the defensive roll advanced rogue talent — a resource-gated ability, no baseline number",
  },
  "monk:martial-artist:exploit-weakness:4": {
    archetypeId: "monk:martial-artist",
    name: "Exploit Weakness",
    level: 4,
    bucket: "situational",
    note: "real per-round combat bonuses, but each is a swift-action choice scoped to a single attack or a single opponent that round",
  },
  "monk:martial-artist:extreme-endurance:5": {
    archetypeId: "monk:martial-artist",
    name: "Extreme Endurance",
    level: 5,
    bucket: "numeric",
    note: "a run of immunities unlocking by level, all present in the closed immEffect vocabulary (fatigue, exhaustion, stunned, death effects, energy drain)",
  },
  "monk:martial-artist:greater-defensive-roll:19": {
    archetypeId: "monk:martial-artist",
    name: "Greater Defensive Roll",
    level: 19,
    bucket: "subsystem",
    note: "upgrades the (unmodeled) defensive roll ability's outcome — no Change-shaped number",
  },
  "monk:martial-artist:martial-arts-master:4": {
    archetypeId: "monk:martial-artist",
    name: "Martial Arts Master",
    level: 4,
    bucket: "subsystem",
    note: "lets monk level satisfy fighter-level feat prerequisites — a prerequisite-checking rule, no Change-shaped number",
  },
  "monk:martial-artist:pain-points:3": {
    archetypeId: "monk:martial-artist",
    name: "Pain Points",
    level: 3,
    bucket: "numeric",
    note: "the +1 Stunning Fist/Quivering Palm DC half is flat and unconditional, now expressible via abilityDC.stunningFist/abilityDC.quiveringPalm (ability-dcs.ts); the +1 crit-confirm half stays unwired — critConfirm has no APPLIED target in this engine (compute.ts never consumes it)",
  },
  "monk:martial-artist:physical-resistance:7": {
    archetypeId: "monk:martial-artist",
    name: "Physical Resistance",
    level: 7,
    bucket: "subsystem",
    note: "reduces incoming ability-damage/drain effects by a scaling amount — no Change target exists for 'reduce incoming ability damage'",
  },
  "monk:martial-artist:quivering-palm:0": {
    archetypeId: "monk:martial-artist",
    name: "Quivering Palm",
    level: 0,
    bucket: "subsystem",
    note: "adds extra daily uses to the base Quivering Palm ability, whose own use-count isn't tracked as an engine resource pool",
  },
  "monk:menhir-guardian:alignment:0": {
    archetypeId: "monk:menhir-guardian",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction — no Change-shaped effect",
  },
  "monk:menhir-guardian:claws:0": {
    archetypeId: "monk:menhir-guardian",
    name: "Claws",
    level: 0,
    bucket: "subsystem",
    note: "alters the monk's unarmed-strike-die/flurry-of-blows progression — a hardcoded tables.ts lookup with no per-archetype override mechanism; also alters ki pool's ki-strike aspect, no Change",
  },
  "monk:menhir-guardian:rebuking-strike:1": {
    archetypeId: "monk:menhir-guardian",
    name: "Rebuking Strike",
    level: 1,
    bucket: "situational",
    note: "real number (scaling forced-movement distance and a Fortitude DC), but triggers only on a successful claw-attack hit — a specific combat event the static sheet can't condition on; also no engine target for forced movement regardless",
  },
  "monk:menhir-guardian:weapon-and-armor-proficiency:0": {
    archetypeId: "monk:menhir-guardian",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:menhir-guardian:wild-flurry:0": {
    archetypeId: "monk:menhir-guardian",
    name: "Wild Flurry",
    level: 0,
    bucket: "subsystem",
    note: "alters the monk's unarmed-strike-die/flurry-of-blows progression — a hardcoded tables.ts lookup with no per-archetype override mechanism",
  },
  "monk:monk-of-the-four-winds:aspect-of-the-carp:1": {
    archetypeId: "monk:monk-of-the-four-winds",
    name: "Aspect of the Carp",
    level: 1,
    bucket: "numeric",
    note: "canonical id for the archetype's choose-one aspect pick (six mutually-exclusive options chosen at 1st level): swim/climb/fly speed set to land speed and the flat 30 ft. fly speed are wired via choiceChanges; gaseous form (oni) and the hourly charge-speed multiplier (tiger) have no Change target and emit nothing when picked — the other five aspect ids just point back here",
  },
  "monk:monk-of-the-four-winds:aspect-of-the-ki-rin:1": {
    archetypeId: "monk:monk-of-the-four-winds",
    name: "Aspect of the Ki-Rin",
    level: 1,
    bucket: "subsystem",
    note: "one of six mutually-exclusive aspects chosen at 1st level; the pick and its wired branches live on the canonical id aspect-of-the-carp:1",
  },
  "monk:monk-of-the-four-winds:aspect-of-the-monkey:1": {
    archetypeId: "monk:monk-of-the-four-winds",
    name: "Aspect of the Monkey",
    level: 1,
    bucket: "subsystem",
    note: "one of six mutually-exclusive aspects chosen at 1st level; the pick and its wired branches live on the canonical id aspect-of-the-carp:1",
  },
  "monk:monk-of-the-four-winds:aspect-of-the-oni:1": {
    archetypeId: "monk:monk-of-the-four-winds",
    name: "Aspect of the Oni",
    level: 1,
    bucket: "subsystem",
    note: "one of six mutually-exclusive aspects chosen at 1st level; the pick lives on the canonical id aspect-of-the-carp:1, where this option emits nothing (gaseous form has no Change target)",
  },
  "monk:monk-of-the-four-winds:aspect-of-the-owl:1": {
    archetypeId: "monk:monk-of-the-four-winds",
    name: "Aspect of the Owl",
    level: 1,
    bucket: "subsystem",
    note: "one of six mutually-exclusive aspects chosen at 1st level; the pick and its wired branches live on the canonical id aspect-of-the-carp:1",
  },
  "monk:monk-of-the-four-winds:aspect-of-the-tiger:1": {
    archetypeId: "monk:monk-of-the-four-winds",
    name: "Aspect of the Tiger",
    level: 1,
    bucket: "subsystem",
    note: "one of six mutually-exclusive aspects chosen at 1st level; the pick lives on the canonical id aspect-of-the-carp:1, where this option emits nothing (the hourly charge-speed multiplier has no Change target)",
  },
  "monk:monk-of-the-healing-hand:ancient-healing-hand:7": {
    archetypeId: "monk:monk-of-the-healing-hand",
    name: "Ancient Healing Hand",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend touch heal — activated, resource-gated, no baseline number",
  },
  "monk:monk-of-the-healing-hand:ki-sacrifice:11": {
    archetypeId: "monk:monk-of-the-healing-hand",
    name: "Ki Sacrifice",
    level: 11,
    bucket: "subsystem",
    note: "ki-spend raise dead/resurrection ritual — activated, resource-gated, one-off",
  },
  "monk:monk-of-the-healing-hand:true-sacrifice:20": {
    archetypeId: "monk:monk-of-the-healing-hand",
    name: "True Sacrifice",
    level: 20,
    bucket: "subsystem",
    note: "capstone self-sacrifice mass-resurrection — one-time narrative ability, no Change-shaped number",
  },
  "monk:monk-of-the-lotus:learned-master:17": {
    archetypeId: "monk:monk-of-the-lotus",
    name: "Learned Master",
    level: 17,
    bucket: "subsystem",
    note: "grants Knowledge/Linguistics as class skills keyed on Wisdom instead of Intelligence — a class-skill/key-ability swap, no Change-shaped number",
  },
  "monk:monk-of-the-lotus:touch-of-peace:15": {
    archetypeId: "monk:monk-of-the-lotus",
    name: "Touch of Peace",
    level: 15,
    bucket: "subsystem",
    note: "DC-based charm effect on a target via an unarmed strike — no self-facing Change-shaped number",
  },
  "monk:monk-of-the-lotus:touch-of-serenity:1": {
    archetypeId: "monk:monk-of-the-lotus",
    name: "Touch of Serenity",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Touch of Serenity) with a scaling duration tracked on the feat itself, not a Change target",
  },
  "monk:monk-of-the-lotus:touch-of-surrender:12": {
    archetypeId: "monk:monk-of-the-lotus",
    name: "Touch of Surrender",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend charm-on-defeat effect on a target — resource-gated, no self-facing number",
  },
  "monk:monk-of-the-mantis:debilitating-blows:6": {
    archetypeId: "monk:monk-of-the-mantis",
    name: "Debilitating Blows",
    level: 6,
    bucket: "subsystem",
    note: "status effects (entangled/exhausted) chained onto a successful Stunning Fist — no Change-shaped number",
  },
  "monk:monk-of-the-mantis:disabling-palm:15": {
    archetypeId: "monk:monk-of-the-mantis",
    name: "Disabling Palm",
    level: 15,
    bucket: "subsystem",
    note: "alters Quivering Palm's outcome (unconscious instead of dead) — no Change-shaped number",
  },
  "monk:monk-of-the-mantis:pressuring-strikes:2": {
    archetypeId: "monk:monk-of-the-mantis",
    name: "Pressuring Strikes",
    level: 2,
    bucket: "subsystem",
    note: "grants rogue-style sneak attack usable only during flurry of blows — dice-based extra damage, and replaces several bonus-feat slots outright rather than modifying the count",
  },
  "monk:monk-of-the-sacred-mountain:adamantine-monk:9": {
    archetypeId: "monk:monk-of-the-sacred-mountain",
    name: "Adamantine Monk",
    level: 9,
    bucket: "numeric",
    note: "the level-scaled baseline DR is unconditional; the ki-spend doubling on top of it is resource-gated and not extracted",
  },
  "monk:monk-of-the-sacred-mountain:bastion-stance:4": {
    archetypeId: "monk:monk-of-the-sacred-mountain",
    name: "Bastion Stance",
    level: 4,
    bucket: "subsystem",
    note: "forced-movement immunity conditional on starting/ending turn in the same space — no Change-shaped target for immunity to forced movement",
  },
  "monk:monk-of-the-sacred-mountain:iron-limb-defense:5": {
    archetypeId: "monk:monk-of-the-sacred-mountain",
    name: "Iron Limb Defense",
    level: 5,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (+2/+4 shield AC/CMD conditional on starting/ending turn in the same space, the +4 tier additionally ki-gated)",
  },
  "monk:monk-of-the-sacred-mountain:iron-monk:2": {
    archetypeId: "monk:monk-of-the-sacred-mountain",
    name: "Iron Monk",
    level: 2,
    bucket: "numeric",
    note: "flat, unconditional +1 natural armor bonus (plus a Toughness bonus feat, unextracted) — replaces Evasion, which carries no vendored Change to conflict with",
  },
  "monk:monk-of-the-sacred-mountain:vow-of-silence:17": {
    archetypeId: "monk:monk-of-the-sacred-mountain",
    name: "Vow of Silence",
    level: 17,
    bucket: "situational",
    note: "real insight AC/CMD and skill bonuses, but conditional on maintaining an ongoing vow of silence — a behavioral condition with no @data path (breaking it suspends the feature for 24h)",
  },
  "monk:nimble-guardian:defensive-aid:2": {
    archetypeId: "monk:nimble-guardian",
    name: "Defensive Aid",
    level: 2,
    bucket: "situational",
    note: "duplicate of nornkith's already-classified Defensive Aid — real +4 circumstance bonus, but a reactive, limited-use grant to an ADJACENT ALLY, not the sheet owner",
  },
  "monk:nimble-guardian:defensive-mastery:5": {
    archetypeId: "monk:nimble-guardian",
    name: "Defensive Mastery",
    level: 5,
    bucket: "subsystem",
    note: "duplicate of nornkith's already-classified Defensive Mastery — adds uses/day to Defensive Aid (not an engine resource pool) plus a reactive ki-spend damage negation, no baseline number",
  },
  "monk:nimble-guardian:evasion:9": {
    archetypeId: "monk:nimble-guardian",
    name: "Evasion",
    level: 9,
    bucket: "subsystem",
    note: "duplicate of nornkith's already-classified Evasion — vanilla base-monk Evasion text re-slotted at level 9 for an archetype that already replaced Evasion with Defensive Aid at 2nd; Evasion carries no vendored Change regardless",
  },
  "monk:nimble-guardian:guardian-feline:7": {
    archetypeId: "monk:nimble-guardian",
    name: "Guardian Feline",
    level: 7,
    bucket: "subsystem",
    note: "duplicate of nornkith's already-classified Guardian Feline — ki-spend alternate-wild-shape transformation, no baseline number",
  },
  "monk:nimble-guardian:nimble-reflexes:3": {
    archetypeId: "monk:nimble-guardian",
    name: "Nimble Reflexes",
    level: 3,
    bucket: "numeric",
    note: "identical text to nornkith's hand-verified Nimble Reflexes, but a distinct vendored feature id (separate archetype entity) — needs its own extracted entry to resolve on the sheet",
  },
  "monk:ouat:awaken-divinity:1": {
    archetypeId: "monk:ouat",
    name: "Awaken Divinity",
    level: 1,
    bucket: "subsystem",
    note: "grants a temporary ki point to another creature for a scaling buff menu — resource-gated and ally-targeted, no baseline number for the Ouat's own sheet",
  },
  "monk:ouat:know-the-unseen-disciples:7": {
    archetypeId: "monk:ouat",
    name: "Know the Unseen Disciples",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend see invisibility — activated, resource-gated, no baseline number",
  },
  "monk:ouat:spurn-tradition:0": {
    archetypeId: "monk:ouat",
    name: "Spurn Tradition",
    level: 0,
    bucket: "subsystem",
    note: "halves the effectiveness of other creatures' anti-dwarf abilities, plus a weapon proficiency — no Change-shaped target for 'halve an opponent's own class feature'",
  },
  "monk:perfect-scholar:eye-of-the-sun-and-moon:13": {
    archetypeId: "monk:perfect-scholar",
    name: "Eye of the Sun and Moon",
    level: 13,
    bucket: "subsystem",
    note: "grants a language-reading/writing ability — no Change-shaped number",
  },
  "monk:perfect-scholar:learn-from-failure:4": {
    archetypeId: "monk:perfect-scholar",
    name: "Learn from Failure",
    level: 4,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (bonus only vs. the same target within 24h of a prior miss/failed check)",
  },
  "monk:perfect-scholar:lore:4": {
    archetypeId: "monk:perfect-scholar",
    name: "Lore",
    level: 4,
    bucket: "numeric",
    note: "flat, unconditional Knowledge-skill bonus scaling only on monk level, same target/formula shape as Cloistered Cleric's Breadth of Knowledge; the 'usable untrained' rider isn't modeled",
  },
  "monk:perfect-scholar:walk-with-the-master:20": {
    archetypeId: "monk:perfect-scholar",
    name: "Walk with the Master",
    level: 20,
    bucket: "subsystem",
    note: "choice-gated among etherealness/plane shift/shadow walk, costed in ki points rather than a day/week counter — cross-pool spend; the outsider type change stays unmodeled",
  },
  "monk:qinggong-monk:activation:0": {
    archetypeId: "monk:qinggong-monk",
    name: "Activation",
    level: 0,
    bucket: "subsystem",
    note: "reference text for the qinggong ki-powers appendix (activation rules / level requirements / the powers list itself), not a distinct numeric ability — likely a vendored-data artifact splitting one long appendix into several 'feature' rows; no baseline number regardless, same choice-menu posture as every other ki-power picker in this file",
  },
  "monk:qinggong-monk:requirements:0": {
    archetypeId: "monk:qinggong-monk",
    name: "Requirements",
    level: 0,
    bucket: "subsystem",
    note: "reference text for the qinggong ki-powers appendix (activation rules / level requirements / the powers list itself), not a distinct numeric ability — likely a vendored-data artifact splitting one long appendix into several 'feature' rows; no baseline number regardless, same choice-menu posture as every other ki-power picker in this file",
  },
  "monk:qinggong-monk:source:0": {
    archetypeId: "monk:qinggong-monk",
    name: "Source",
    level: 0,
    bucket: "subsystem",
    note: "reference text for the qinggong ki-powers appendix (activation rules / level requirements / the powers list itself), not a distinct numeric ability — likely a vendored-data artifact splitting one long appendix into several 'feature' rows; no baseline number regardless, same choice-menu posture as every other ki-power picker in this file",
  },
  "monk:sage-counselor:cunning-fist:1": {
    archetypeId: "monk:sage-counselor",
    name: "Cunning Fist",
    level: 1,
    bucket: "subsystem",
    note: "bonus feats (Combat Expertise, Improved/Greater Feint) without prerequisites — no Change-shaped number",
  },
  "monk:sage-counselor:deceptive-ki:4": {
    archetypeId: "monk:sage-counselor",
    name: "Deceptive Ki",
    level: 4,
    bucket: "subsystem",
    note: "ki-spend Bluff bonus — activated, resource-gated, no baseline number",
  },
  "monk:sage-counselor:feinting-flurry:4": {
    archetypeId: "monk:sage-counselor",
    name: "Feinting Flurry",
    level: 4,
    bucket: "subsystem",
    note: "trades an extra flurry attack for a feint check within flurry — a rule change, no Change-shaped number",
  },
  "monk:scaled-fist:draconic-breath:12": {
    archetypeId: "monk:scaled-fist",
    name: "Draconic Breath",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend breath-weapon attack — activated, resource-gated, and dice-based damage isn't modeled as a flat Change either way",
  },
  "monk:scaled-fist:draconic-fury:3": {
    archetypeId: "monk:scaled-fist",
    name: "Draconic Fury",
    level: 3,
    bucket: "subsystem",
    note: "grants the elemental fury ki power — a choice/subsystem grant, no number of its own",
  },
  "monk:scaled-fist:draconic-mettle:4": {
    archetypeId: "monk:scaled-fist",
    name: "Draconic Mettle",
    level: 4,
    bucket: "numeric",
    note: "qualified save bonus vs. fear/sleep/paralysis, mirroring monkUnchained's identically-worded twin; all three are real SAVE_CATEGORIES entries",
  },
  "monk:scarred-monk:armor-of-scars:1": {
    archetypeId: "monk:scarred-monk",
    name: "Armor of Scars",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks (same posture as Soul Shepherd's Mortification) — even the one real number here (+1 natural armor, stacking) is additionally gated on holding at least 1 ki point, a resource state the static sheet can't check",
  },
  "monk:scarred-monk:blood-eagle:1": {
    archetypeId: "monk:scarred-monk",
    name: "Blood Eagle",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification) — no self-facing bonus, deals damage to a grappler",
  },
  "monk:scarred-monk:contortionist:1": {
    archetypeId: "monk:scarred-monk",
    name: "Contortionist",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification)",
  },
  "monk:scarred-monk:doll-face:1": {
    archetypeId: "monk:scarred-monk",
    name: "Doll Face",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification); requires the Face Collector mortification too",
  },
  "monk:scarred-monk:eyes-stitched-shut:1": {
    archetypeId: "monk:scarred-monk",
    name: "Eyes Stitched Shut",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification)",
  },
  "monk:scarred-monk:face-collector:1": {
    archetypeId: "monk:scarred-monk",
    name: "Face Collector",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification)",
  },
  "monk:scarred-monk:pain-binding:1": {
    archetypeId: "monk:scarred-monk",
    name: "Pain Binding",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification) — no self-facing bonus, redirects damage taken onto a bound creature",
  },
  "monk:scarred-monk:rings-of-pain:10": {
    archetypeId: "monk:scarred-monk",
    name: "Rings of Pain",
    level: 10,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification)",
  },
  "monk:scarred-monk:share-pain:1": {
    archetypeId: "monk:scarred-monk",
    name: "Share Pain",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification) — no self-facing bonus, redirects damage taken onto an attacker",
  },
  "monk:scarred-monk:third-eye:13": {
    archetypeId: "monk:scarred-monk",
    name: "Third Eye",
    level: 13,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification)",
  },
  "monk:scarred-monk:tongueless-master:1": {
    archetypeId: "monk:scarred-monk",
    name: "Tongueless Master",
    level: 1,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification)",
  },
  "monk:scarred-monk:torturous-vision:13": {
    archetypeId: "monk:scarred-monk",
    name: "Torturous Vision",
    level: 13,
    bucket: "subsystem",
    note: "one of several ki-gated mortification picks with no schema field/picker (same posture as Soul Shepherd's Mortification); requires the Share Pain mortification too",
  },
  "monk:sensei:advice:0": {
    archetypeId: "monk:sensei",
    name: "Advice",
    level: 0,
    bucket: "subsystem",
    note: "grants a bardic-performance-equivalent resource — a whole unmodeled subsystem, no baseline Change",
  },
  "monk:sensei:insightful-strike:2": {
    archetypeId: "monk:sensei",
    name: "Insightful Strike",
    level: 2,
    bucket: "subsystem",
    note: "ability-score-basis swap (Wisdom instead of Strength/Dexterity) — no Change-shaped target for changing which ability a calculation keys on (attack rolls/CMB with unarmed strikes or monk weapons)",
  },
  "monk:sensei:mystic-wisdom:6": {
    archetypeId: "monk:sensei",
    name: "Mystic Wisdom",
    level: 6,
    bucket: "subsystem",
    note: "grants abilities to an ally via ki-spend — activated, resource-gated, and ally-targeted rather than self",
  },
  "monk:sensei:skills:0": {
    archetypeId: "monk:sensei",
    name: "Skills",
    level: 0,
    bucket: "subsystem",
    note: "class-skill list change — no Change-shaped effect",
  },
  "monk:serpent-fire-adept:chakra-adept:6": {
    archetypeId: "monk:serpent-fire-adept",
    name: "Chakra Adept",
    level: 6,
    bucket: "subsystem",
    note: "bonus feat plus a chakra-maintenance rule — gated on the unmodeled chakra subsystem (which chakras are currently open), a different unmodeled state than ki-pool balance — no Change-shaped number regardless",
  },
  "monk:serpent-fire-adept:chakra-expertise:2": {
    archetypeId: "monk:serpent-fire-adept",
    name: "Chakra Expertise",
    level: 2,
    bucket: "subsystem",
    note: "save bonus scoped to maintaining awakened chakras specifically — gated on the unmodeled chakra subsystem (which chakras are currently open), a different unmodeled state than ki-pool balance — no Change-shaped number regardless",
  },
  "monk:serpent-fire-adept:chakra-mastery:10": {
    archetypeId: "monk:serpent-fire-adept",
    name: "Chakra Mastery",
    level: 10,
    bucket: "subsystem",
    note: "bonus feat plus a chakra-pool-size increase (a separate, unmodeled resource pool) — gated on the unmodeled chakra subsystem (which chakras are currently open), a different unmodeled state than ki-pool balance — no Change-shaped number regardless",
  },
  "monk:serpent-fire-adept:chakra-training:1": {
    archetypeId: "monk:serpent-fire-adept",
    name: "Chakra Training",
    level: 1,
    bucket: "subsystem",
    note: "bonus feats granting early access to the chakra subsystem — gated on the unmodeled chakra subsystem (which chakras are currently open), a different unmodeled state than ki-pool balance — no Change-shaped number regardless",
  },
  "monk:serpent-fire-adept:light-spirit:4": {
    archetypeId: "monk:serpent-fire-adept",
    name: "Light Spirit",
    level: 4,
    bucket: "subsystem",
    note: "fly speed while the sacral chakra is open — gated on the unmodeled chakra subsystem (which chakras are currently open), a different unmodeled state than ki-pool balance — no Change-shaped number regardless",
  },
  "monk:serpent-fire-adept:linked-chakras:8": {
    archetypeId: "monk:serpent-fire-adept",
    name: "Linked Chakras",
    level: 8,
    bucket: "subsystem",
    note: "lets multiple chakras open at once — gated on the unmodeled chakra subsystem (which chakras are currently open), a different unmodeled state than ki-pool balance — no Change-shaped number regardless",
  },
  "monk:sin-monk:burden-with-sin:12": {
    archetypeId: "monk:sin-monk",
    name: "Burden with Sin",
    level: 12,
    bucket: "subsystem",
    note: "curse effect imposed on a target via Stunning Fist use — no self-facing Change-shaped number",
  },
  "monk:sin-monk:simultaneous-sins:19": {
    archetypeId: "monk:sin-monk",
    name: "Simultaneous Sins",
    level: 19,
    bucket: "subsystem",
    note: "spends 3 sin-pool points to combine two sins — a resource-pool mechanic, no baseline number",
  },
  "monk:sin-monk:sinful-strike:7": {
    archetypeId: "monk:sin-monk",
    name: "Sinful Strike",
    level: 7,
    bucket: "situational",
    note: "real number (flat bonus damage equal to monk level), but triggers only on the next damage dealt before the end of the next turn — a specific combat event the static sheet can't condition on, additionally gated on spending 2 sin-pool points",
  },
  "monk:sin-monk:spawn-of-sin:20": {
    archetypeId: "monk:sin-monk",
    name: "Spawn of Sin",
    level: 20,
    bucket: "numeric",
    note: "creature-type change and a post-death sinspawn rule are unmodeled, but mind-affecting immunity is a flat, unconditional flag in the closed immEffect vocabulary",
  },
  "monk:sin-monk:well-of-sin:4": {
    archetypeId: "monk:sin-monk",
    name: "Well of Sin",
    level: 4,
    bucket: "subsystem",
    note: "grants a whole new sin-point resource pool with an 8-option activated menu (Envy/Gluttony/Greed/Lust/Pride/Sloth/Wrath/etc.) — no schema field/picker exists for the choice, and no single number stands out as extractable",
  },
  "monk:softstrike-monk:feather-touch:1": {
    archetypeId: "monk:softstrike-monk",
    name: "Feather Touch",
    level: 1,
    bucket: "subsystem",
    note: "removes a nonlethal-attack penalty and permits Stunning Fist with nonlethal weapon attacks — a rule change, no Change-shaped number",
  },
  "monk:softstrike-monk:incapacitating-palm:15": {
    archetypeId: "monk:softstrike-monk",
    name: "Incapacitating Palm",
    level: 15,
    bucket: "subsystem",
    note: "alters Quivering Palm's outcome (unconscious instead of dead) — no Change-shaped number",
  },
  "monk:softstrike-monk:life-giving-blows:6": {
    archetypeId: "monk:softstrike-monk",
    name: "Life-Giving Blows",
    level: 6,
    bucket: "subsystem",
    note: "ki-spend anti-undead/construct ability — activated, resource-gated, condition-threshold effect on the target",
  },
  "monk:softstrike-monk:nonlethal-strikes:1": {
    archetypeId: "monk:softstrike-monk",
    name: "Nonlethal Strikes",
    level: 1,
    bucket: "blocked",
    note: "shifts the EFFECTIVE monk level fed into the unarmed-strike damage-die progression by +4 (nonlethal) or -4 (lethal, minimum 1st) — that progression is tables.ts's hardcoded unarmedDamageDie(classLevel, size), which produces ONE die size from the real monk level with no per-damage-type split and no override hook; backfilling would require touching tables.ts/compute.ts (out of scope) and risks double-counting the level the table already reads directly. Same trap monkUnchained's identically-worded twin already documents.",
  },
  "monk:softstrike-monk:resilient-body:19": {
    archetypeId: "monk:softstrike-monk",
    name: "Resilient Body",
    level: 19,
    bucket: "subsystem",
    note: "converts incoming precision damage to nonlethal — a damage-type-conversion rule, no Change-shaped target",
  },
  "monk:softstrike-monk:tenet-of-life:1": {
    archetypeId: "monk:softstrike-monk",
    name: "Tenet of Life",
    level: 1,
    bucket: "subsystem",
    note: "roleplay restriction with a ki-pool-loss penalty on violation — no positive number to grant",
  },
  "monk:softstrike-monk:weapon-and-armor-proficiency:1": {
    archetypeId: "monk:softstrike-monk",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:softstrike-monk:wholeness-of-body-and-spirit:7": {
    archetypeId: "monk:softstrike-monk",
    name: "Wholeness of Body and Spirit",
    level: 7,
    bucket: "subsystem",
    note: "alters Wholeness of Body's target scope (self or others, nonlethal only) — a choice-gated ki power, no baseline number",
  },
  "monk:sohei:bonus-feats:0": {
    archetypeId: "monk:sohei",
    name: "Bonus Feats",
    level: 0,
    bucket: "subsystem",
    note: "restricts bonus-feat selection to mounted-combat feats — no count change",
  },
  "monk:sohei:devoted-guardian:1": {
    archetypeId: "monk:sohei",
    name: "Devoted Guardian",
    level: 1,
    bucket: "numeric",
    note: "the flat, level-scaled initiative bonus is unconditional; the always-act-in-a-surprise-round clause and the 20th-level auto-natural-20 aren't modeled as they're not flat additive numbers",
  },
  "monk:sohei:ki-weapon:4": {
    archetypeId: "monk:sohei",
    name: "Ki Weapon",
    level: 4,
    bucket: "situational",
    note: "real, precisely-scaling number (scaling enhancement bonus to attack/damage on a wielded weapon), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:sohei:monastic-mount:4": {
    archetypeId: "monk:sohei",
    name: "Monastic Mount",
    level: 4,
    bucket: "situational",
    note: "real number (temp HP and shared class-ability access), but granted to an ally/mount rather than the sheet owner; even with companion-master-effects able to route always-on level-scaled Changes onto a tracked mount, this grant fires on a live ki-pool spend rather than a stored build choice, so it has no gate to attach to there either",
  },
  "monk:sohei:skills:0": {
    archetypeId: "monk:sohei",
    name: "Skills",
    level: 0,
    bucket: "subsystem",
    note: "class-skill list change — no Change-shaped effect",
  },
  "monk:sohei:unarmed-strike:0": {
    archetypeId: "monk:sohei",
    name: "Unarmed Strike",
    level: 0,
    bucket: "subsystem",
    note: "freezes unarmed-strike damage progression — alters the monk's unarmed-strike-die/flurry-of-blows progression — a hardcoded tables.ts lookup with no per-archetype override mechanism",
  },
  "monk:sohei:weapon-and-armor-proficiency:0": {
    archetypeId: "monk:sohei",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "monk:sohei:weapon-training:6": {
    archetypeId: "monk:sohei",
    name: "Weapon Training",
    level: 6,
    bucket: "subsystem",
    note: "free player choice of weapon group (same free-choice shape as fighter's own Weapon Training) — no fixed group to hardcode into a Change",
  },
  "monk:soul-shepherd:calming-strike:1": {
    archetypeId: "monk:soul-shepherd",
    name: "Calming Strike",
    level: 1,
    bucket: "subsystem",
    note: "DC-based calm effect on an incorporeal undead target, or a touch attack vs. a haunt — no self-facing Change-shaped number",
  },
  "monk:soul-shepherd:otherworldly-resilience:2": {
    archetypeId: "monk:soul-shepherd",
    name: "Otherworldly Resilience",
    level: 2,
    bucket: "numeric",
    note: "flat, wholly unconditional DR/adamantine plus cold and electricity resistance, scaling once at 9th level — no activation, no resource spend",
  },
  "monk:soul-shepherd:spirit-sense:12": {
    archetypeId: "monk:soul-shepherd",
    name: "Spirit Sense",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend temporary spiritsense grant — activated, resource-gated, no baseline number",
  },
  "monk:soul-shepherd:yamaraj-s-judgment:16": {
    archetypeId: "monk:soul-shepherd",
    name: "Yamaraj's Judgment",
    level: 16,
    bucket: "subsystem",
    note: "ki-spend targeted dispel to free a soul from imprisonment — activated, resource-gated, no self-facing number",
  },
  "monk:spirit-master:diamond-spirit:5": {
    archetypeId: "monk:spirit-master",
    name: "Diamond Spirit",
    level: 5,
    bucket: "subsystem",
    note: "negative-level mitigation and an auto-succeed Fortitude save 1/day — no Change-shaped target for negative levels in this engine",
  },
  "monk:spirit-master:purifying-palm:15": {
    archetypeId: "monk:spirit-master",
    name: "Purifying Palm",
    level: 15,
    bucket: "subsystem",
    note: "DC-based positive/negative-energy-block effect on a target — no self-facing Change-shaped number",
  },
  "monk:spirit-master:resilient-soul:3": {
    archetypeId: "monk:spirit-master",
    name: "Resilient Soul",
    level: 3,
    bucket: "numeric",
    note: "flat, unconditional +2 save bonus vs. necromancy spells and effects, expressible via Change.saveCategories (['necromancy'])",
  },
  "monk:spirit-master:spirit-burst:7": {
    archetypeId: "monk:spirit-master",
    name: "Spirit Burst",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend AoE heal/damage triggered by destroying an undead creature — resource+event-gated, and the magnitude is dice/HD-based, not flat",
  },
  "monk:spirit-master:spirit-combat:3": {
    archetypeId: "monk:spirit-master",
    name: "Spirit Combat",
    level: 3,
    bucket: "subsystem",
    note: "grants the ability to damage incorporeal creatures with unarmed strikes — a targeting-rule change with a uses/day cap, no additive Change-shaped number",
  },
  "monk:spirit-master:spirit-flow:19": {
    archetypeId: "monk:spirit-master",
    name: "Spirit Flow",
    level: 19,
    bucket: "subsystem",
    note: "ki-spend swap of healing source (negative energy instead of harming) — activated, resource-gated, no baseline number",
  },
  "monk:spirit-master:spirit-mastery:20": {
    archetypeId: "monk:spirit-master",
    name: "Spirit Mastery",
    level: 20,
    bucket: "numeric",
    note: "the weekly true-resurrection ritual is unmodeled, but DR/evil and ability-damage/-drain immunity are flat, unconditional at this capstone level",
  },
  "monk:student-of-stone:body-of-stone:9": {
    archetypeId: "monk:student-of-stone",
    name: "Body of Stone",
    level: 9,
    bucket: "subsystem",
    note: "grants the light fortification armor property — no Change-shaped target for fortification",
  },
  "monk:student-of-stone:bones-of-stone:7": {
    archetypeId: "monk:student-of-stone",
    name: "Bones of Stone",
    level: 7,
    bucket: "situational",
    note: "real, precisely-scaling number (scaling DR (2/magic, then 2/chaotic, then 5/chaotic) until the start of the next turn), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:student-of-stone:bonus-feat:6": {
    archetypeId: "monk:student-of-stone",
    name: "Bonus Feat",
    level: 6,
    bucket: "subsystem",
    note: "adds Elemental Fist and the Shaitan style-feat chain to the bonus-feat list — no count change",
  },
  "monk:student-of-stone:hard-as-stone:2": {
    archetypeId: "monk:student-of-stone",
    name: "Hard as Stone",
    level: 2,
    bucket: "subsystem",
    note: "+4 AC scoped specifically to an opponent's crit-confirmation roll — no Change-shaped target for a confirmation-only AC bonus (same posture as critConfirm elsewhere in this file)",
  },
  "monk:student-of-stone:soul-of-stone:12": {
    archetypeId: "monk:student-of-stone",
    name: "Soul of Stone",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend temporary tremorsense grant — activated, resource-gated, no baseline number",
  },
  "monk:student-of-stone:stone-self:20": {
    archetypeId: "monk:student-of-stone",
    name: "Stone Self",
    level: 20,
    bucket: "numeric",
    note: "capstone (earth outsider, DR/chaotic, burrow speed, tremorsense) is flat and wholly unconditional — no activation, no resource spend",
  },
  "monk:student-of-stone:strength-of-stone:3": {
    archetypeId: "monk:student-of-stone",
    name: "Strength of Stone",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (bonus only while both combatants are touching the ground)",
  },
  "monk:terra-cotta-monk:class-skills:0": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "class-skill list change — no Change-shaped effect",
  },
  "monk:terra-cotta-monk:petrifying-strike:15": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Petrifying Strike",
    level: 15,
    bucket: "subsystem",
    note: "DC-based petrification effect on a target via an unarmed strike — no self-facing Change-shaped number",
  },
  "monk:terra-cotta-monk:rainmaker:19": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Rainmaker",
    level: 19,
    bucket: "subsystem",
    note: "functions as earthquake, costed in ki points rather than a day/week counter — cross-pool spend, additionally location-gated (underground)",
  },
  "monk:terra-cotta-monk:stone-grip:5": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Stone Grip",
    level: 5,
    bucket: "numeric",
    note: "the flat class-level Climb bonus is unconditional; the ki-spend spider climb rider is resource-gated and not extracted",
  },
  "monk:terra-cotta-monk:sudden-adit:12": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Sudden Adit",
    level: 12,
    bucket: "subsystem",
    note: "functions as passwall, costed in ki points rather than a day/week counter — cross-pool spend",
  },
  "monk:terra-cotta-monk:trap-dodge:10": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Trap Dodge",
    level: 10,
    bucket: "numeric",
    note: 'unconditional Wisdom-modifier bonus on ALL saving throws vs. mechanical-trap effects — traps allows all three saves (save-categories.ts), so allSavingThrows + saveCategories: ["traps"] covers it exactly. Wired in MONK_ARCHETYPE_EFFECTS_EXTRACTED.',
  },
  "monk:terra-cotta-monk:trap-intuition:2": {
    archetypeId: "monk:terra-cotta-monk",
    name: "Trap Intuition",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (Perception bonus scoped to noticing traps specifically, not general Perception)",
  },
  "monk:tetori:bonus-feat:0": {
    archetypeId: "monk:tetori",
    name: "Bonus Feat",
    level: 0,
    bucket: "subsystem",
    note: "replaces the entire monk bonus-feat LIST, not its count/schedule",
  },
  "monk:tetori:break-free:5": {
    archetypeId: "monk:tetori",
    name: "Break Free",
    level: 5,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (bonus scoped to escaping a grapple specifically); ki-spend reroll clause is separately resource-gated",
  },
  "monk:tetori:counter-grapple:4": {
    archetypeId: "monk:tetori",
    name: "Counter-Grapple",
    level: 4,
    bucket: "subsystem",
    note: "grants an attack-of-opportunity trigger against a grappling attacker — an ability grant, not a flat bonus number",
  },
  "monk:tetori:errata:0": {
    archetypeId: "monk:tetori",
    name: "Errata",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text errata row, no mechanical content",
  },
  "monk:tetori:form-lock:13": {
    archetypeId: "monk:tetori",
    name: "Form Lock",
    level: 13,
    bucket: "subsystem",
    note: "ki-spend polymorph-negation Wisdom check with a monk-level bonus — no Change-shaped target for an unmodeled opposed check, resource-gated regardless",
  },
  "monk:tetori:graceful-grappler:0": {
    archetypeId: "monk:tetori",
    name: "Graceful Grappler",
    level: 0,
    bucket: "subsystem",
    note: "uses monk level instead of BAB for grapple CMB/CMD — a calculation-basis swap, no additive Change; also replaces flurry of blows, alters the monk's unarmed-strike-die/flurry-of-blows progression — a hardcoded tables.ts lookup with no per-archetype override mechanism",
  },
  "monk:tetori:inescapable-grasp:9": {
    archetypeId: "monk:tetori",
    name: "Inescapable Grasp",
    level: 9,
    bucket: "subsystem",
    note: "ki-spend suppression of an opponent's escape bonuses — activated, resource-gated",
  },
  "monk:tetori:iron-body:19": {
    archetypeId: "monk:tetori",
    name: "Iron Body",
    level: 19,
    bucket: "subsystem",
    note: "functions as iron body, costed in ki points rather than a day/week counter — cross-pool spend",
  },
  "monk:treetop-monk:branch-runner:3": {
    archetypeId: "monk:treetop-monk",
    name: "Branch Runner",
    level: 3,
    bucket: "subsystem",
    note: "adds half of Fast Movement's own level-tiered bonus to a racial climb speed — depends on both Fast Movement's table value and a pre-existing racial climb speed, not simply own-level scaling; no reliable single formula",
  },
  "monk:treetop-monk:freedom-of-movement:12": {
    archetypeId: "monk:treetop-monk",
    name: "Freedom of Movement",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend freedom of movement — activated, resource-gated",
  },
  "monk:treetop-monk:wood-affinity:5": {
    archetypeId: "monk:treetop-monk",
    name: "Wood Affinity",
    level: 5,
    bucket: "subsystem",
    note: "ki-spend repair-wooden-object plus Lunge access — activated, resource-gated, no bonus magnitude",
  },
  "monk:underfoot-adept:improved-underfoot-grace:5": {
    archetypeId: "monk:underfoot-adept",
    name: "Improved Underfoot Grace",
    level: 5,
    bucket: "subsystem",
    note: "removes an Acrobatics-check penalty the engine never modeled in the first place — nothing to reduce",
  },
  "monk:underfoot-adept:underfoot-grace:1": {
    archetypeId: "monk:underfoot-adept",
    name: "Underfoot Grace",
    level: 1,
    bucket: "subsystem",
    note: "reduces an Acrobatics-check penalty the engine never modeled in the first place — nothing to reduce",
  },
  "monk:underfoot-adept:underfoot-trip:1": {
    archetypeId: "monk:underfoot-adept",
    name: "Underfoot Trip",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Improved Trip) plus a size-step adjustment scoped to trip attempts specifically — no Change-shaped target for a maneuver-scoped size step",
  },
  "monk:wanderer:class-skills:0": {
    archetypeId: "monk:wanderer",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "class-skill list change — no Change-shaped effect",
  },
  "monk:wanderer:disappear-unnoticed:12": {
    archetypeId: "monk:wanderer",
    name: "Disappear Unnoticed",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend Stealth-while-observed permission — activated, resource-gated, not a bonus magnitude",
  },
  "monk:wanderer:far-traveler:1": {
    archetypeId: "monk:wanderer",
    name: "Far Traveler",
    level: 1,
    bucket: "subsystem",
    note: "grants a language or weapon-proficiency choice — no Change-shaped number",
  },
  "monk:wanderer:free-step:13": {
    archetypeId: "monk:wanderer",
    name: "Free Step",
    level: 13,
    bucket: "subsystem",
    note: "continuous freedom of movement — an immunity/status-negation effect, no Change-shaped target",
  },
  "monk:wanderer:inscrutable:5": {
    archetypeId: "monk:wanderer",
    name: "Inscrutable",
    level: 5,
    bucket: "subsystem",
    note: "raises the DC for others to read the wanderer (no target for an opponent's DC) plus a ki-spend nondetection — resource-gated",
  },
  "monk:wanderer:light-step:5": {
    archetypeId: "monk:wanderer",
    name: "Light Step",
    level: 5,
    bucket: "subsystem",
    note: "choice-gated among ant haul/feather step/pass without trace/tireless pursuit, costed in ki points rather than a day/week counter — cross-pool spend",
  },
  "monk:wanderer:long-walk:3": {
    archetypeId: "monk:wanderer",
    name: "Long Walk",
    level: 3,
    bucket: "numeric",
    note: "flat, unconditional +2 save bonus vs. exhaustion/fatigue effects, expressible via Change.saveCategories (['fatigue']); the Endurance bonus feat and forced-march Constitution-check doubling aren't Change-shaped and are dropped",
  },
  "monk:wanderer:wanderer-s-wisdom:7": {
    archetypeId: "monk:wanderer",
    name: "Wanderer’s Wisdom",
    level: 7,
    bucket: "subsystem",
    note: "ki-spend bardic-inspire-equivalent — activated, resource-gated, and ally-targeted rather than self",
  },
  "monk:wasteland-meditant:dehydrating-strike:0": {
    archetypeId: "monk:wasteland-meditant",
    name: "Dehydrating Strike",
    level: 0,
    bucket: "subsystem",
    note: "DC-based fatigue/exhaustion/damage effect imposed on a target via an unarmed strike — no self-facing Change-shaped number",
  },
  "monk:wasteland-meditant:desert-strider:4": {
    archetypeId: "monk:wasteland-meditant",
    name: "Desert Strider",
    level: 4,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar (scaling self-concealment, but only while double-moving through desert terrain)",
  },
  "monk:wasteland-meditant:improved-vigor:9": {
    archetypeId: "monk:wasteland-meditant",
    name: "Improved Vigor",
    level: 9,
    bucket: "subsystem",
    note: "save-outcome rule (Fortitude-negates-with-half-on-fail) — the replaced improved evasion carries no vendored Change to begin with, so nothing to suppress or backfill",
  },
  "monk:wasteland-meditant:pillar-of-salt:15": {
    archetypeId: "monk:wasteland-meditant",
    name: "Pillar of Salt",
    level: 15,
    bucket: "subsystem",
    note: "DC-based ongoing ability-drain/petrification effect on a target — no self-facing Change-shaped number",
  },
  "monk:wasteland-meditant:vigor:2": {
    archetypeId: "monk:wasteland-meditant",
    name: "Vigor",
    level: 2,
    bucket: "subsystem",
    note: "save-outcome rule (Fortitude-negates a partial-effect attack) — the replaced Evasion carries no vendored Change to begin with, so nothing to suppress or backfill",
  },
  "monk:water-dancer:burn:2": {
    archetypeId: "monk:water-dancer",
    name: "Burn",
    level: 2,
    bucket: "subsystem",
    note: "grants the kineticist burn resource mechanic to a non-kineticist; resources.ts's burn-pool resolution is hardcoded to classTag === 'kineticist' (the gate every kineticist burn number rides), so this grant needs a hook there before a pool derives — the gap is that gate, not an unmodeled subsystem",
  },
  "monk:water-dancer:elemental-focus-su-and-sp:0": {
    archetypeId: "monk:water-dancer",
    name: "Elemental Focus (Su and Sp)",
    level: 0,
    bucket: "subsystem",
    note: "grants kinetic blast (dice-based, resource-gated) — no flat Change-shaped number",
  },
  "monk:water-dancer:metakinesis:9": {
    archetypeId: "monk:water-dancer",
    name: "Metakinesis",
    level: 9,
    bucket: "subsystem",
    note: "grants the kineticist metakinesis (empower) ability — a resource-cost/damage-multiplier mechanic, no flat number",
  },
  "monk:water-dancer:nereid-s-grace:0": {
    archetypeId: "monk:water-dancer",
    name: "Nereid’s Grace",
    level: 0,
    bucket: "subsystem",
    note: "vendored text scales the dodge bonus 'per monk level' on top of Charisma bonus — suspected vendored-data anomaly (RAW is a flat Cha-bonus dodge bonus with no level multiplier); not safely extractable without risking a wrong formula. Also rebases ki pool onto Charisma, an ability-basis swap with no Change-shaped target",
  },
  "monk:water-dancer:unarmed-strike:0": {
    archetypeId: "monk:water-dancer",
    name: "Unarmed Strike",
    level: 0,
    bucket: "subsystem",
    note: "alters the monk's unarmed-strike-die/unarmed-strike-die progression — a hardcoded tables.ts lookup with no per-archetype override mechanism",
  },
  "monk:water-dancer:water-dance:4": {
    archetypeId: "monk:water-dancer",
    name: "Water Dance",
    level: 4,
    bucket: "subsystem",
    note: "grants water-walking with a scaling distance CAP, not a speed value — no Change-shaped target for a capped movement permission",
  },
  "monk:water-dancer:water-stride:12": {
    archetypeId: "monk:water-dancer",
    name: "Water Stride",
    level: 12,
    bucket: "subsystem",
    note: "ki-spend dimension-door-like movement between water sources — activated, resource-gated",
  },
  "monk:water-dancer:wild-talents:2": {
    archetypeId: "monk:water-dancer",
    name: "Wild Talents",
    level: 2,
    bucket: "subsystem",
    note: "grants kineticist wild-talent picks by level — a choice-menu grant with no schema field/picker",
  },
  "monk:weapon-adept:evasion:9": {
    archetypeId: "monk:weapon-adept",
    name: "Evasion",
    level: 9,
    bucket: "subsystem",
    note: "save-outcome rule (standard Evasion) — the replaced Improved Evasion carries no vendored Change to begin with, so nothing to suppress or backfill",
  },
  "monk:weapon-adept:perfect-strike:1": {
    archetypeId: "monk:weapon-adept",
    name: "Perfect Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Perfect Strike) with a roll-3-take-best mechanic — no Change-shaped target for choosing among multiple attack rolls",
  },
  "monk:weapon-adept:pure-power:20": {
    archetypeId: "monk:weapon-adept",
    name: "Pure Power",
    level: 20,
    bucket: "numeric",
    note: "flat, unconditional +2 to Strength, Dexterity, and Wisdom at this capstone level — no gating clause",
  },
  "monk:weapon-adept:uncanny-initiative:17": {
    archetypeId: "monk:weapon-adept",
    name: "Uncanny Initiative",
    level: 17,
    bucket: "subsystem",
    note: "lets the monk choose his own initiative result — no Change-shaped target for substituting a chosen roll result",
  },
  "monk:weapon-adept:way-of-the-weapon-master:2": {
    archetypeId: "monk:weapon-adept",
    name: "Way of the Weapon Master",
    level: 2,
    bucket: "subsystem",
    note: "bonus feats (Weapon Focus, then Weapon Specialization) on one weapon — the feats' own bonuses are handled by the feat-effects pipeline, not this archetype feature",
  },
  "monk:wildcat:bonus-feat:0": {
    archetypeId: "monk:wildcat",
    name: "Bonus Feat",
    level: 0,
    bucket: "subsystem",
    note: "adds feats to the bonus-feat LIST at 6th/10th, not its count/schedule",
  },
  "monk:wildcat:brawler-maneuver-training:4": {
    archetypeId: "monk:wildcat",
    name: "Brawler Maneuver Training",
    level: 4,
    bucket: "numeric",
    note: "the dirty trick tier (fixed at 4th, +1/+2/+3/+4 at 4th/7th/10th/16th) is expressible via Change.maneuverCategories and wired in MONK_ARCHETYPE_EFFECTS_EXTRACTED. The 7th/10th/16th-level picks of ANOTHER combat maneuver are a free player choice with no CharacterDoc field recording them — same unrecorded-choice bar as base brawler's own Maneuver Training — so only the dirty-trick portion is modeled.",
  },
  "monk:wildcat:dirty-blow:19": {
    archetypeId: "monk:wildcat",
    name: "Dirty Blow",
    level: 19,
    bucket: "subsystem",
    note: "deals bonus unarmed damage as a rider on a successful dirty trick maneuver — no Change-shaped target for a maneuver-success damage rider",
  },
  "monk:wildcat:improvised-weapon-mastery:4": {
    archetypeId: "monk:wildcat",
    name: "Improvised Weapon Mastery",
    level: 4,
    bucket: "subsystem",
    note: "overrides improvised-weapon damage dice — a hardcoded per-weapon-type override this engine has no mechanism for",
  },
  "monk:wildcat:knockout:9": {
    archetypeId: "monk:wildcat",
    name: "Knockout",
    level: 9,
    bucket: "subsystem",
    note: "DC-based unconsciousness effect on a target via an unarmed strike — no self-facing Change-shaped number",
  },
  "monk:wildcat:ready-for-anything:3": {
    archetypeId: "monk:wildcat",
    name: "Ready for Anything",
    level: 3,
    bucket: "numeric",
    note: "the flat +2 initiative bonus is unconditional; the +2 Perception bonus is scoped to acting in a surprise round specifically and isn't extracted (partial extraction, same posture as Hawkeye's split)",
  },
  "monk:wildcat:turn-the-tables:13": {
    archetypeId: "monk:wildcat",
    name: "Turn the Tables",
    level: 13,
    bucket: "subsystem",
    note: "grants an attack-of-opportunity trigger when an opponent fails a maneuver — an ability grant, not a flat bonus number",
  },
  "monk:windstep-master:hurricane-punch:1": {
    archetypeId: "monk:windstep-master",
    name: "Hurricane Punch",
    level: 1,
    bucket: "situational",
    note: "real, scaling bull-rush target-size cap and push-distance bonus, but only while using the granted Hurricane Punch feat to bull rush — a per-maneuver condition, and no engine target represents a bull-rush size cap or push distance regardless",
  },
  "monk:windstep-master:swift-ki:4": {
    archetypeId: "monk:windstep-master",
    name: "Swift Ki",
    level: 4,
    bucket: "situational",
    note: "real, precisely-scaling number (sustains wind step or extends its distance by 20 ft. for 1 round), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:windstep-master:weapon-and-armor-proficiency:1": {
    archetypeId: "monk:windstep-master",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "vendored description is copy-pasted from softstrike-monk's own proficiency text (suspected vendored-data artifact) — proficiency change regardless, no Change-shaped target",
  },
  "monk:windstep-master:wind-step:4": {
    archetypeId: "monk:windstep-master",
    name: "Wind Step",
    level: 4,
    bucket: "subsystem",
    note: "air-walk movement capped by Fast Movement's own level-tiered bonus — depends on Fast Movement's table value, not simply own-level scaling; also a movement-permission grant rather than a speed value",
  },
  "monk:zen-archer:bonus-feat:6": {
    archetypeId: "monk:zen-archer",
    name: "Bonus Feat",
    level: 6,
    bucket: "subsystem",
    note: "restricts bonus-feat selection to an archery-focused list — no count change",
  },
  "monk:zen-archer:flurry-of-blows:1": {
    archetypeId: "monk:zen-archer",
    name: "Flurry of Blows",
    level: 1,
    bucket: "subsystem",
    note: "restricts flurry of blows to bows — alters the monk's unarmed-strike-die/flurry-of-blows progression — a hardcoded tables.ts lookup with no per-archetype override mechanism",
  },
  "monk:zen-archer:ki-arrows:5": {
    archetypeId: "monk:zen-archer",
    name: "Ki Arrows",
    level: 5,
    bucket: "situational",
    note: "real, precisely-scaling number (changes arrow damage dice to unarmed-strike dice for 1 round), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:zen-archer:ki-focus-bow:17": {
    archetypeId: "monk:zen-archer",
    name: "Ki Focus Bow",
    level: 17,
    bucket: "subsystem",
    note: "grants ki-focus-weapon eligibility to arrows while holding at least 1 ki point — an eligibility flag, not a bonus magnitude",
  },
  "monk:zen-archer:ki-pool:4": {
    archetypeId: "monk:zen-archer",
    name: "Ki Pool",
    level: 4,
    bucket: "situational",
    note: "real, precisely-scaling number (+50 ft. bow range increment for 1 round), but gated on spending a ki-pool point for a temporary duration — no baseline sheet value, and no @data path for live pool balance either way",
  },
  "monk:zen-archer:perfect-strike:1": {
    archetypeId: "monk:zen-archer",
    name: "Perfect Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Perfect Strike) with a roll-3-take-best mechanic — no Change-shaped target for choosing among multiple attack rolls",
  },
  "monk:zen-archer:point-blank-master:3": {
    archetypeId: "monk:zen-archer",
    name: "Point Blank Master",
    level: 3,
    bucket: "subsystem",
    note: "bonus feat (Point-Blank Master) — no Change-shaped number",
  },
  "monk:zen-archer:reflexive-shot:9": {
    archetypeId: "monk:zen-archer",
    name: "Reflexive Shot",
    level: 9,
    bucket: "subsystem",
    note: "grants attacks of opportunity with a bow — an ability grant, not a flat bonus number",
  },
  "monk:zen-archer:trick-shot:11": {
    archetypeId: "monk:zen-archer",
    name: "Trick Shot",
    level: 11,
    bucket: "subsystem",
    note: "ki-spend ignore-concealment/cover ability — a boolean capability grant, no numeric magnitude",
  },
  "monk:zen-archer:way-of-the-bow:2": {
    archetypeId: "monk:zen-archer",
    name: "Way of the Bow",
    level: 2,
    bucket: "subsystem",
    note: "bonus feats (Weapon Focus, then Weapon Specialization) on one bow type — handled by the feat-effects pipeline, not this archetype feature",
  },
  "monk:zen-archer:zen-archery:3": {
    archetypeId: "monk:zen-archer",
    name: "Zen Archery",
    level: 3,
    bucket: "subsystem",
    note: "ability-score-basis swap (Wisdom instead of Dexterity) — no Change-shaped target for changing which ability a calculation keys on (ranged attack rolls with a bow)",
  },
};

/**
 * Machine-extracted mechanical effects. 19 of the 268 features this pass
 * classified cleared the `numeric` bar — this class's archetype kit still
 * leans heavily on ki-spend activated abilities, choice-menus, and
 * ability-basis swaps, but several duplicate-archetype twins (Ironskin Monk /
 * Nimble Guardian mirroring already-hand-verified Maneuver Master / Nornkith
 * content under separate vendored ids) and a handful of flat, level-gated
 * capstone grants (immunities, DR, ability-score bonuses) were genuinely
 * unconditional.
 *
 * Confidence rubric (same as every other class file in this pipeline):
 *  - "high": a literal, fully general (no scope restriction) reading of a
 *    single, clearly-worded sentence, using an already-established target
 *    idiom.
 *  - "medium": a real-but-partial condition/qualifier from the prose is
 *    dropped because this engine has no way to check it or no matching
 *    vocabulary entry, flagged in `detail`.
 */
export const MONK_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Nimble Guardian's "Nimble Reflexes" is byte-identical to Nornkith's own
  // hand-verified entry (archetype-effects.ts) — same archetype, a different
  // vendored id (a second source stamped the same prose under a separate
  // archetype entity). resolveArchetypeFeatureEffect looks up by exact
  // feature id, so this twin needs its own entry to actually apply.
  "monk:nimble-guardian:nimble-reflexes:3": {
    changes: [c("2", "ref")],
    detail: () => "+2 Reflex saves",
    confidence: "high",
    provenance: "At 3rd level, a nimble guardian gains a +2 bonus on all Reflex saving throws.",
  },

  // Terra-Cotta Monk's "Trap Dodge" — traps allows all three saves
  // (save-categories.ts), matching this Wisdom-scaling, all-saves bonus
  // exactly.
  "monk:terra-cotta-monk:trap-dodge:10": {
    changes: [
      {
        formula: "@abilities.wis.mod",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["traps"],
      },
    ],
    detail: () => "Wis modifier bonus on saves vs. mechanical traps",
    confidence: "high",
    provenance:
      "At 10th level, a terra-cotta monk gains a bonus equal to his Wisdom modifier on all " +
      "saving throws made against effects produced by mechanical traps. This ability replaces " +
      "improved evasion.",
  },

  // Wildcat's "Brawler Maneuver Training" — only the FIXED dirty-trick tier
  // is modeled; the 7th/10th/16th-level picks of another maneuver are a
  // free player choice this table can't express (same gap as base brawler's
  // own Maneuver Training).
  "monk:wildcat:brawler-maneuver-training:4": {
    changes: [
      {
        formula:
          "if(gte(@class.unlevel, 16), 4, if(gte(@class.unlevel, 10), 3, if(gte(@class.unlevel, 7), 2, if(gte(@class.unlevel, 4), 1, 0))))",
        target: "cmb",
        type: "untyped",
        maneuverCategories: ["dirtyTrick"],
      },
      {
        formula:
          "if(gte(@class.unlevel, 16), 4, if(gte(@class.unlevel, 10), 3, if(gte(@class.unlevel, 7), 2, if(gte(@class.unlevel, 4), 1, 0))))",
        target: "cmd",
        type: "untyped",
        maneuverCategories: ["dirtyTrick"],
      },
    ],
    detail: (level) => {
      const v = level >= 16 ? 4 : level >= 10 ? 3 : level >= 7 ? 2 : level >= 4 ? 1 : 0;
      return v > 0
        ? `+${v} CMB/CMD vs. dirty trick (further picks at 7th/10th/16th not modeled)`
        : "not yet granted";
    },
    confidence: "medium",
    provenance:
      "At 4th level, a wildcat gains additional training with the dirty trick combat maneuver " +
      "(Advanced Player’s Guide 320). He gains a +1 bonus on combat maneuver checks when " +
      "attempting this combat maneuver and a +1 bonus to his CMD when defending against this " +
      "maneuver. At 7th, 10th, and 16th levels, a wildcat becomes further trained in another " +
      "combat maneuver, gaining the above +1 bonus on combat maneuver checks and to CMD. In " +
      "addition, the bonuses granted by previous maneuver training increase by 1 each. For " +
      "example, when a wildcat reaches 7th level, he gains a +1 bonus on one type of combat " +
      "maneuver, +1 to her CMD against that combat maneuver, and the bonuses for the dirty " +
      "trick combat maneuver increase to +2.",
  },

  // Ironskin Monk's "Unbreakable" capstone: the 75%-chance crit/sneak-attack
  // mitigation isn't a full immunity (no partial-chance immEffect target
  // exists) and is dropped, but death-effect immunity, stun immunity, and
  // ability-damage/-drain immunity are flat, unconditional flags — all four
  // slugs are in defenses.ts's closed EFFECT_IMMUNITY_LABELS vocabulary.
  "monk:ironskin-monk:unbreakable:20": {
    changes: [
      c("1", "immEffect.deathEffects"),
      c("1", "immEffect.stunned"),
      c("1", "immEffect.abilityDamage"),
      c("1", "immEffect.abilityDrain"),
    ],
    detail: () => "immune to death effects, stunning, ability damage, ability drain",
    confidence: "medium",
    provenance:
      "At 20th level, an ironskin monk sets aside many of the frailties of mortal flesh. He " +
      "becomes immune to death effects and stunning. He is not subject to ability damage or " +
      "ability drain, and has a 75% chance of ignoring the extra damage dealt by critical hits " +
      "and sneak attacks.",
  },

  // Ki Mystic's "Mystic Prescience" is a flat insight bonus to AC and CMD,
  // unconditional from 13th level on, doubling at 20th — no activation, no
  // resource spend.
  "monk:ki-mystic:mystic-prescience:13": {
    changes: [
      c("if(gte(@class.unlevel, 20), 4, 2)", "ac", "insight"),
      c("if(gte(@class.unlevel, 20), 4, 2)", "cmd", "insight"),
    ],
    detail: (level) => (level >= 20 ? "+4 insight AC/CMD" : "+2 insight AC/CMD"),
    confidence: "high",
    provenance:
      "At 13th level, a ki mystic gains a +2 insight bonus to AC and CMD. At 20th level, the " +
      "bonus increases to +4.",
  },

  // Martial Artist's "Bonus Feats" grant is purely additive: it doesn't
  // displace any tier of base monk's atomic Bonus Feat (MNK) formula
  // (`1 + floor((@class.unlevel + 2) / 4)`, target bonusFeats) — it's traded
  // for Abundant Step instead, so there's no double-count risk the way an
  // unpaired swap of the bonus-feat schedule itself would create.
  "monk:martial-artist:bonus-feats:12": {
    changes: [c("if(gte(@class.unlevel, 12), 1, 0)", "bonusFeats")],
    detail: (level) => (level >= 12 ? "+1 bonus feat" : "no bonus feat yet"),
    confidence: "high",
    provenance:
      "At 12th level, a martial artist gains an additional bonus feat, selected from those " +
      "available in the monk class feature.",
  },

  // Martial Artist's "Extreme Endurance" is a run of immunities unlocking at
  // fixed levels — all five slugs (fatigue, exhaustion, stunned, deathEffects,
  // energyDrain) are in defenses.ts's closed EFFECT_IMMUNITY_LABELS
  // vocabulary, each gated only on the monk's own level.
  "monk:martial-artist:extreme-endurance:5": {
    changes: [
      c("if(gte(@class.unlevel, 5), 1, 0)", "immEffect.fatigue"),
      c("if(gte(@class.unlevel, 10), 1, 0)", "immEffect.exhaustion"),
      c("if(gte(@class.unlevel, 15), 1, 0)", "immEffect.stunned"),
      c("if(gte(@class.unlevel, 20), 1, 0)", "immEffect.deathEffects"),
      c("if(gte(@class.unlevel, 20), 1, 0)", "immEffect.energyDrain"),
    ],
    detail: (level) =>
      level >= 20
        ? "immune to fatigue, exhaustion, stunning, death effects, energy drain"
        : level >= 15
          ? "immune to fatigue, exhaustion, stunning"
          : level >= 10
            ? "immune to fatigue, exhaustion"
            : "immune to fatigue",
    confidence: "high",
    provenance:
      "At 5th level, a martial artist gains immunity to fatigue. At 10th level, he also gains " +
      "immunity to exhaustion. At 15th level, he gains immunity to stunning. At 20th level, he " +
      "gains immunity to death effects and energy drain.",
  },

  // Monk of the Sacred Mountain's "Iron Monk" is a flat, unconditional +1
  // natural armor bonus (plus a Toughness bonus feat, unextracted) — replaces
  // Evasion, which carries no vendored Change to conflict with.
  "monk:monk-of-the-sacred-mountain:iron-monk:2": {
    changes: [c("1", "nac", "natural")],
    detail: () => "+1 natural armor",
    confidence: "high",
    provenance:
      "At 2nd level, a monk of the sacred mountain gains Toughness as a bonus feat. In addition, " +
      "the monk gains a +1 natural armor bonus.",
  },

  // Monk of the Sacred Mountain's "Adamantine Monk" baseline DR is flat and
  // wholly unconditional (1/— at 9th, +1 every 3 levels thereafter); the
  // ki-spend doubling on top of it is resource-gated and not extracted, same
  // "baseline vs. activated rider" split the class's own Bones of Stone
  // (situational) draws.
  "monk:monk-of-the-sacred-mountain:adamantine-monk:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 3)", "dr")],
    detail: (level) => `DR ${1 + Math.floor((level - 9) / 3)}/—`,
    confidence: "high",
    provenance:
      "At 9th level, a monk of the sacred mountain has muscles so strong and skin so resilient " +
      "that he gains DR 1/—. This DR increases by 1 for every three levels thereafter.",
  },

  // Perfect Scholar's "Lore" grants a flat, unconditional bonus equal to half
  // monk level on Knowledge checks — the same skill.knowledge fan-out-alias
  // idiom Bardic Knowledge (archetype-effects.ts) and monkUnchained's own
  // identically-worded Perfect Scholar twin already use. The "can attempt
  // Knowledge checks untrained" half has no Change-shaped target and is
  // dropped.
  "monk:perfect-scholar:lore:4": {
    changes: [c("floor(@class.unlevel / 2)", "skill.knowledge")],
    detail: (level) =>
      `+${Math.floor(level / 2)} all Knowledge checks (untrained access not modeled)`,
    confidence: "high",
    provenance:
      "At 4th level, the perfect scholar gains a bonus equal to 1/2 his monk level on Knowledge " +
      "checks and can attempt Knowledge checks untrained.",
  },

  // Scaled Fist's "Draconic Mettle" grants a flat, unconditional +2 on saves
  // vs. fear, paralysis, and sleep effects — mirrors monkUnchained's
  // identically-worded Scaled Fist twin exactly. `fear`/`paralysis`/`sleep`
  // are all real Change.saveCategories entries (save-categories.ts), so
  // nothing is dropped.
  "monk:scaled-fist:draconic-mettle:4": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["fear", "paralysis", "sleep"],
      },
    ],
    detail: () => "+2 vs. fear/paralysis/sleep saves",
    confidence: "high",
    provenance:
      "At 4th level, a scaled fist gains a +2 bonus on saving throws attempted against all fear, " +
      "paralysis, and sleep effects.",
  },

  // Hamatulatsu Master's "Infernal Resilience": immunity to pain-descriptor
  // effects isn't extracted (no "pain" slug in the closed immEffect
  // vocabulary). Of the qualified save bonus, "stun" and "nausea" (which
  // covers sicken/nauseate) are real SAVE_CATEGORIES entries
  // (save-categories.ts) — stagger alone has none and is dropped.
  "monk:hamatulatsu-master:infernal-resilience:5": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["stun", "nausea"],
      },
    ],
    detail: () =>
      "+2 vs. sicken/nauseate/stun saves (stagger not modeled; pain immunity not modeled)",
    confidence: "medium",
    provenance:
      "At 5th level, a hamatulatsu master gains immunity to all spells, spell-like abilities, " +
      "and effects with the pain descriptor, as well as a +2 bonus on saving throws against " +
      "effects that would sicken, nauseate, stagger, or stun her.",
  },

  // Sohei's "Devoted Guardian" flat init bonus scales only on monk level and
  // applies with no gating clause; the always-act-in-a-surprise-round grant
  // and the 20th-level "always a natural 20" rider aren't flat additive
  // numbers and are dropped.
  "monk:sohei:devoted-guardian:1": {
    changes: [c("floor(@class.unlevel / 2)", "init")],
    detail: (level) =>
      `+${Math.floor(level / 2)} initiative (surprise-round/nat-20 riders not modeled)`,
    confidence: "medium",
    provenance:
      "In addition, a sohei gains a bonus on initiative rolls equal to 1/2 his monk level. At " +
      "20th level, a sohei's initiative roll is automatically a natural 20.",
  },

  // Soul Shepherd's "Otherworldly Resilience" is a flat, wholly unconditional
  // DR/adamantine plus cold and electricity resistance, scaling once at 9th
  // level — no activation, no resource spend, nothing to drop. Mirrors
  // monkUnchained's identically-worded Soul Shepherd twin exactly.
  // dr.adamantine/eres.cold/eres.electricity are established qualified
  // targets already used extensively by bloodlines.ts/bloodrager-bloodlines.ts.
  "monk:soul-shepherd:otherworldly-resilience:2": {
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

  // Spirit Master's "Resilient Soul" grants a flat, unconditional +2 save
  // bonus vs. necromancy spells and effects — a real Change.saveCategories
  // entry (save-categories.ts), and nothing else in the ability's single
  // sentence is dropped.
  "monk:spirit-master:resilient-soul:3": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["necromancy"],
      },
    ],
    detail: () => "+2 vs. necromancy spells and effects",
    confidence: "high",
    provenance:
      "At 3rd level, a spirit master gains a +2 bonus on saving throws against necromancy " +
      "spells and effects. This ability replaces still mind.",
  },

  // Spirit Master's "Spirit Mastery" capstone: the weekly true-resurrection
  // ritual is unmodeled, but DR/evil and ability-damage/-drain immunity are
  // flat and wholly unconditional at 20th level.
  "monk:spirit-master:spirit-mastery:20": {
    changes: [
      c("10", "dr.evil"),
      c("1", "immEffect.abilityDamage"),
      c("1", "immEffect.abilityDrain"),
    ],
    detail: () => "DR 10/evil; immune to ability damage/drain",
    confidence: "high",
    provenance:
      "At 20th level, a spirit master gains DR 10/evil and becomes immune to ability drain and " +
      "ability damage.",
  },

  // Student of Stone's "Stone Self" capstone (earth subtype, DR/chaotic,
  // burrow speed, tremorsense) is flat and wholly unconditional at 20th
  // level — no activation, no resource spend. burrowSpeed and sensets
  // (tremorsense) are both APPLIED_TARGETS; the earth-subtype/outsider-type
  // change itself has no Change-shaped target and is dropped.
  "monk:student-of-stone:stone-self:20": {
    changes: [c("5", "dr.chaotic"), c("20", "burrowSpeed"), c("20", "sensets")],
    detail: () => "DR 5/chaotic; burrow speed 20 ft.; tremorsense 20 ft.",
    confidence: "high",
    provenance:
      "At 20th level, a student of stone becomes an earth outsider. He gains the earth subtype, " +
      "as well as DR 5/chaotic, burrow speed 20 feet, and tremorsense 20 feet.",
  },

  // Terra-Cotta Monk's "Stone Grip" Climb bonus is flat and scales only on
  // monk level, unconditional — same skill.clm target idiom used throughout
  // this pipeline. The ki-spend spider climb rider is resource-gated and not
  // extracted.
  "monk:terra-cotta-monk:stone-grip:5": {
    changes: [c("@class.unlevel", "skill.clm")],
    detail: (level) => `+${level} Climb (spider climb rider not modeled)`,
    confidence: "high",
    provenance:
      "At 5th level, a terra-cotta monk adds a bonus equal to his class level on all Climb checks.",
  },

  // Wanderer's "Long Walk" grants a flat, unconditional +2 save bonus vs.
  // exhaustion/fatigue effects — a real Change.saveCategories entry
  // (save-categories.ts's `fatigue`). The Endurance bonus feat and the
  // forced-march Constitution-check doubling aren't Change-shaped and are
  // dropped.
  "monk:wanderer:long-walk:3": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["fatigue"],
      },
    ],
    detail: () =>
      "+2 vs. exhaustion/fatigue effects (Endurance feat/forced-march doubling not modeled)",
    confidence: "medium",
    provenance:
      "At 3rd level, the wanderer gains Endurance as a bonus feat, and the feat bonus doubles " +
      "when he makes Constitution checks because of a forced march. In addition, a wanderer " +
      "gains a +2 bonus on saving throws against spells and effects that cause exhaustion and " +
      "fatigue. This ability replaces still mind.",
  },

  // Weapon Adept's "Pure Power" capstone: a flat, unconditional +2 to
  // Strength, Dexterity, and Wisdom at 20th level — no bonus type is named in
  // the source text, so this uses the default untyped bonus.
  "monk:weapon-adept:pure-power:20": {
    changes: [c("2", "str"), c("2", "dex"), c("2", "wis")],
    detail: () => "+2 Str/Dex/Wis",
    confidence: "high",
    provenance:
      "At 20th level, a weapon adept forsakes the ideals of the perfect self to become a bastion " +
      "of the physical and mental virtues monks hold dear. The monk gains a +2 bonus to " +
      "Strength, Dexterity, and Wisdom.",
  },

  // Wildcat's "Ready for Anything" flat +2 initiative bonus is unconditional;
  // the +2 Perception bonus is scoped to acting in a surprise round
  // specifically and isn't extracted (partial extraction, same posture as
  // Hawkeye's split in fighter.ts).
  "monk:wildcat:ready-for-anything:3": {
    changes: [c("2", "init")],
    detail: () => "+2 initiative (surprise-round Perception bonus not modeled)",
    confidence: "medium",
    provenance:
      "At 3rd level, a wildcat gains a +2 bonus on initiative checks and Perception checks to " +
      "act in a surprise round.",
  },

  // Sin Monk's "Spawn of Sin" capstone: the aberration type change and
  // post-death sinspawn rule are unmodeled, but mind-affecting immunity is a
  // flat, unconditional flag in the closed immEffect vocabulary.
  "monk:sin-monk:spawn-of-sin:20": {
    changes: [c("1", "immEffect.mindAffecting")],
    detail: () => "immune to mind-affecting effects",
    confidence: "high",
    provenance:
      "At 20th level, the sin monk becomes the physical manifestation of his sins. He is " +
      "forevermore treated as an aberration rather than a humanoid (or whatever the monk's " +
      "creature type was) for the purpose of spells and magical effects, and his mind is so " +
      "consumed by sin that he gains immunity to mind-affecting effects.",
  },

  // Brazen Disciple's "Genie Apotheosis" capstone: the creature-type change
  // and 1/day limited wish are unmodeled, but the fire immunity is flat and
  // unconditional at 20th level. imm.fire uses this engine's own
  // damage-type-immunity convention (defenses.ts's isImmTarget).
  "monk:brazen-disciple:genie-apotheosis:20": {
    changes: [c("1", "imm.fire")],
    detail: () => "immune to fire",
    confidence: "high",
    provenance: "He has immunity to fire and vulnerability to cold.",
  },

  // Martial Artist's "Pain Points": the DC half is flat and unconditional,
  // landing on abilityDC.stunningFist/abilityDC.quiveringPalm
  // (ability-dcs.ts). The crit-confirm half is dropped — critConfirm has no
  // APPLIED target in this engine (compute.ts never consumes it).
  "monk:martial-artist:pain-points:3": {
    changes: [c("1", "abilityDC.stunningFist"), c("1", "abilityDC.quiveringPalm")],
    detail: () => "+1 Stunning Fist/Quivering Palm DC (crit-confirm bonus not modeled)",
    confidence: "medium",
    provenance:
      "At 3rd level, a martial artist's advanced knowledge of humanoid anatomy grants a +1 " +
      "bonus on critical hit confirmation rolls and increases the DC of his stunning fist and " +
      "quivering palm by 1. This ability replaces still mind.",
  },

  // Master of Many Styles' vendored "Pain Points" row is a byte-identical
  // (modulo curly-quote encoding) stamp of martial-artist:pain-points:3's
  // description text under a different archetypeId — see this file's header
  // doc comment on cross-tag twins. resolveArchetypeFeatureEffect looks up
  // by exact feature id, so the twin needs its own entry to actually apply;
  // verdict mirrors the martial-artist entry above.
  "monk:master-of-many-styles:pain-points:3": {
    changes: [c("1", "abilityDC.stunningFist"), c("1", "abilityDC.quiveringPalm")],
    detail: () => "+1 Stunning Fist/Quivering Palm DC (crit-confirm bonus not modeled)",
    confidence: "medium",
    provenance:
      "At 3rd level, a martial artist's advanced knowledge of humanoid anatomy grants a +1 " +
      "bonus on critical hit confirmation rolls and increases the DC of his stunning fist and " +
      "quivering palm by 1. This ability replaces still mind.",
  },

  // Monk of the Four Winds' six Aspects are a choose-one pick at 1st level;
  // aspect-of-the-carp:1 is the canonical id the choice/choiceChanges live
  // on (see its classification entry). Carp/Monkey grant a swim/climb speed
  // equal to base land speed (the swimSpeed/climbSpeed "base"/"set" idiom);
  // Ki-Rin grants the same for fly speed, with a "must land each turn"
  // maneuvering caveat that has no numeric effect; Owl grants a flat 30 ft.
  // fly speed. Oni's gaseous form and Tiger's hourly charge-speed multiplier
  // have no Change target and emit nothing when picked.
  "monk:monk-of-the-four-winds:aspect-of-the-carp:1": {
    changes: [],
    choice: {
      label: "Aspect",
      options: [
        { id: "carp", label: "Carp (swim speed)" },
        { id: "ki-rin", label: "Ki-Rin (fly speed, lawful good only)" },
        { id: "monkey", label: "Monkey (climb speed)" },
        { id: "oni", label: "Oni (gaseous form, evil only)" },
        { id: "owl", label: "Owl (fly speed 30 ft.)" },
        { id: "tiger", label: "Tiger (charge speed multiplier)" },
      ],
    },
    choiceChanges: {
      carp: [
        {
          formula: "@attributes.speed.land.total",
          target: "swimSpeed",
          type: "base",
          operator: "set",
        },
      ],
      "ki-rin": [
        {
          formula: "@attributes.speed.land.total",
          target: "flySpeed",
          type: "base",
          operator: "set",
        },
      ],
      monkey: [
        {
          formula: "@attributes.speed.land.total",
          target: "climbSpeed",
          type: "base",
          operator: "set",
        },
      ],
      oni: [],
      owl: [{ formula: "30", target: "flySpeed", type: "base", operator: "set" }],
      tiger: [],
    },
    detail: () =>
      "carp: swim speed = land speed · ki-rin: fly speed = land speed (must land each turn) · " +
      "monkey: climb speed = land speed · owl: fly speed 30 ft. · oni/tiger: no baseline number " +
      "(choice stored per pick)",
    confidence: "high",
    provenance:
      "Aspect of the Carp: he can breathe water and gains a swim speed equal to his land speed. " +
      "Aspect of the Ki-Rin: he gains a fly speed equal to his land speed, but he must end each " +
      "turn on the ground. Aspect of the Monkey: the monk gains a climb speed equal to his land " +
      "speed. Aspect of the Owl: he gains a fly speed of 30 feet. Aspect of the Oni: he can " +
      "assume gaseous form as a standard action for 1 minute per day per monk level. Aspect of " +
      "the Tiger: once per hour, the monk can move at 10 times his normal land speed when he " +
      "makes a charge and is treated as if he had the pounce ability.",
  },
};
