/**
 * Oracle's slice of the pipeline (wave 2, 2026-07-06). Per the per-class file
 * convention (documented in `index.ts`), this file owns BOTH of oracle's
 * pipeline artifacts — `ORACLE_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `ORACLE_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) — so
 * a future wave working on a different class never has a reason to touch this
 * file; only `index.ts` (the aggregator) needs one new import + one new spread
 * per class.
 *
 * ── ORACLE_ARCHETYPE_FEATURE_CLASSIFICATION ───────────────────────────────
 *
 * Classification audit: EVERY feature of EVERY vendored oracle archetype (26
 * archetypes, 79 features), read individually and bucketed `numeric` /
 * `situational` / `subsystem` / `blocked` per the same bucket definitions
 * as `archetype-extracted/fighter.ts`'s doc comment. Oracle is a
 * brand-new class in this repo (2026-07-06) whose mystery/curse/revelation
 * machinery is ENTIRELY hand-authored (`oracle-mysteries.ts`/
 * `oracle-curses.ts`), unlike fighter's vendored `RefData.classFeatures`
 * `changes[]` — this shape drove almost every non-`numeric` bucket call:
 *
 * 1. **Revelations are deferred entirely** (no `build.revelations` field
 *    exists — a player's per-level revelation picks aren't tracked at all,
 *    same posture as Rogue Talents). The overwhelming majority of oracle
 *    archetype features are phrased as "this replaces the revelation gained
 *    at Nth level" or "you must take this revelation at Nth level" — i.e.
 *    they add or replace an entry in a MENU the player picks from, not an
 *    automatic archetype grant. Since there's no build field recording which
 *    revelation (if any) was actually taken, none of these can be safely
 *    auto-applied — even when the prose states a clean, unconditional number
 *    (e.g. Hermit's Recluse's Stride: "+10 ft. base speed," gated behind "you
 *    must take this revelation at 1st level"). All classified `subsystem`.
 *    The one exception: a mystery's 20th-level **Final Revelation** is NOT a
 *    menu pick — it's a single, automatically-granted capstone (paired to the
 *    base "Final Revelation" class feature, uuid
 *    `Compendium.pf1.class-abilities.Item.8vF0UoXribL1DOG2`, itself
 *    guaranteed and un-tied to a build field) — archetype swaps of THAT slot
 *    are evaluated on their own numeric merits like any other capstone.
 * 2. **Mystery/curse machinery is an unsuppressible hand table**, the same
 *    gap already documented for sorcerer bloodlines (`archetype-effects.ts`'s
 *    Sorcerer of Sleep entry): `ORACLE_CURSES`/`ORACLE_MYSTERIES` are applied
 *    in `collect.ts` keyed on `doc.build.oracleCurse`/`build.oracleMystery`
 *    with zero `activeArchetypeSwaps`/`pairedBaseFeatureUuid` awareness. An
 *    archetype feature that wholesale REPLACES the oracle's curse with a
 *    custom (non-hand-tabled) mechanic — Black-Blooded Oracle's Curse of
 *    Black Blood is the one case this wave found — can't be safely composed
 *    against a player's independently-set `build.oracleCurse`: `blocked`,
 *    citing this gap explicitly, per the task's instruction. Features that
 *    merely RESTRICT the curse CHOICE to a subset of the existing 6 hand-
 *    tabled tags (Cyclopean Seer, Possessed Oracle, Psychic Searcher,
 *    Reincarnated Oracle) don't hit this gap — the underlying curse (if
 *    chosen from the restricted list) still applies normally — `subsystem`.
 * 3. **Mystery bonus spells and class-skill grants aren't Change-shaped at
 *    all** (`OracleMysteryDef` has no `changes` field — see
 *    `oracle-mysteries.ts`'s doc comment) — every "these bonus spells replace
 *    the oracle's mystery bonus spells" archetype feature is `subsystem` with
 *    nothing to compose against, gap or not.
 *
 * Also checked and ruled out: `chaSkills`/`dexSkills` (the ability-based
 * skill-GROUP targets) are listed in `targets.ts`'s `UNAPPLIED_TARGET_LABELS`,
 * not `APPLIED_TARGETS` — `compute` never folds them into a displayed skill
 * total (see `oracle-curses.ts`'s own Wasting-curse doc comment, which authors
 * one anyway purely for vendored-data fidelity, disclosed as inert).
 * Black-Blooded Oracle's Curse of Black Blood has a real "-4 Dex-based skill
 * checks" number that would have used this target had it not already been
 * `blocked` on the mystery/curse-gap grounds above.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const ORACLE_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "oracle:ancient-lorekeeper:elven-arcana:2": {
    archetypeId: "oracle:ancient-lorekeeper",
    name: "Elven Arcana",
    level: 2,
    bucket: "subsystem",
    note: "adds bonus known spells in place of mystery bonus spells — neither is Change-shaped in this engine",
  },
  "oracle:black-blooded-oracle:black-blood-revelation:1": {
    archetypeId: "oracle:black-blooded-oracle",
    name: "Black Blood Revelation",
    level: 1,
    bucket: "subsystem",
    note: "bundle of activated, resource-gated abilities (touch attack, save-reroll, darkvision) — no unconditional Change-shaped number; darkvision isn't a sheet stat this engine models",
  },
  "oracle:black-blooded-oracle:curse-of-black-blood:1": {
    archetypeId: "oracle:black-blooded-oracle",
    name: "Curse of Black Blood",
    level: 1,
    bucket: "blocked",
    note: "blocked: wholesale, unpaired replacement of the oracle's curse with a custom mechanic (positive/negative energy reversal, -4 Dex-skill penalty, scaling cold resistance) that isn't one of the 6 hand-tabled ORACLE_CURSES entries — the same unsuppressible-hand-table gap already documented for sorcerer bloodlines (ORACLE_CURSES/build.oracleCurse have zero archetype-swap awareness in collect.ts). Extracting a number here can't be safely composed against a player's independently-chosen build.oracleCurse.",
  },
  "oracle:community-guardian:spirit-of-community:1": {
    archetypeId: "oracle:community-guardian",
    name: "Spirit of Community",
    level: 1,
    bucket: "subsystem",
    note: "activated, ally-targeting, player-choice skill-check bonus — a revelation-list addition (revelations are deferred)",
  },
  "oracle:community-guardian:bonus-spell:2": {
    archetypeId: "oracle:community-guardian",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:community-guardian:renewing-radiance:3": {
    archetypeId: "oracle:community-guardian",
    name: "Renewing Radiance",
    level: 3,
    bucket: "situational",
    note: "real, cleanly-scaling ally AC/heal choice, but ally-targeting + a revelation-list addition (must be taken at 3rd, not guaranteed) — doubly excluded",
  },
  "oracle:cyclopean-seer:assume-fate:1": {
    archetypeId: "oracle:cyclopean-seer",
    name: "Assume Fate",
    level: 1,
    bucket: "subsystem",
    note: "replaces the 1st-level revelation — revelation-list modification, deferred",
  },
  "oracle:cyclopean-seer:bonus-spells:1": {
    archetypeId: "oracle:cyclopean-seer",
    name: "Bonus Spells",
    level: 1,
    bucket: "subsystem",
    note: "alters mystery bonus spells — not Change-shaped either way",
  },
  "oracle:cyclopean-seer:oracle-s-curse:1": {
    archetypeId: "oracle:cyclopean-seer",
    name: "Oracle's Curse",
    level: 1,
    bucket: "subsystem",
    note: "restricts the curse choice to a subset of the 6 hand-tabled tags (haunted/hunger/powerless prophecy/tongues) — no numeric effect; the underlying curse works normally if one of the hand-tabled ones is chosen",
  },
  "oracle:cyclopean-seer:brutal-trance:7": {
    archetypeId: "oracle:cyclopean-seer",
    name: "Brutal Trance",
    level: 7,
    bucket: "subsystem",
    note: "replaces the 7th-level revelation with an activated commune-emulation ability — revelation-list modification, deferred",
  },
  "oracle:cyclopean-seer:final-revelation:20": {
    archetypeId: "oracle:cyclopean-seer",
    name: "Final Revelation",
    level: 20,
    bucket: "subsystem",
    note: "discern location, prying eyes, and stone tell, wired via the spell-like-abilities route; the flash-of-insight resource-refund rider isn't modeled",
  },
  "oracle:divine-numerologist:calculate-the-odds:1": {
    archetypeId: "oracle:divine-numerologist",
    name: "Calculate the Odds",
    level: 1,
    bucket: "subsystem",
    note: "activated, once-per-day circumstance bonus to the NEXT d20 roll — too narrowly scoped/activated to auto-apply",
  },
  "oracle:divine-numerologist:program-the-divine-algorithm:7": {
    archetypeId: "oracle:divine-numerologist",
    name: "Program the Divine Algorithm",
    level: 7,
    bucket: "subsystem",
    note: "activated reroll-as-average/maximum mechanic, resource-gated — no flat number",
  },
  "oracle:divine-numerologist:bonus-spell:10": {
    archetypeId: "oracle:divine-numerologist",
    name: "Bonus Spell",
    level: 10,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:divine-numerologist:final-revelation:20": {
    archetypeId: "oracle:divine-numerologist",
    name: "Final Revelation",
    level: 20,
    bucket: "subsystem",
    note: "cleanly paired to the mystery's Final Revelation capstone, but grants an aging immunity + an ally crit-auto-confirm rider — no flat number",
  },
  "oracle:dual-cursed-oracle:revelation:5": {
    archetypeId: "oracle:dual-cursed-oracle",
    name: "Revelation",
    level: 5,
    bucket: "subsystem",
    note: "grants an extra revelation slot — revelations are deferred entirely",
  },
  "oracle:dual-cursed-oracle:revelation:13": {
    archetypeId: "oracle:dual-cursed-oracle",
    name: "Revelation",
    level: 13,
    bucket: "subsystem",
    note: "grants an extra revelation slot — revelations are deferred entirely",
  },
  "oracle:elementalist-oracle:elemental-linguist:1": {
    archetypeId: "oracle:elementalist-oracle",
    name: "Elemental Linguist",
    level: 1,
    bucket: "subsystem",
    note: "bonus language grants, narrative",
  },
  "oracle:elementalist-oracle:bonus-spell:4": {
    archetypeId: "oracle:elementalist-oracle",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High), also not Change-shaped) — not Change-shaped either way",
  },
  "oracle:elementalist-oracle:elemental-form:11": {
    archetypeId: "oracle:elementalist-oracle",
    name: "Elemental Form",
    level: 11,
    bucket: "numeric",
    note: "wired via the archetypeFeature PickChoice mechanism: air grants fly speed 30 ft., earth grants tremorsense 30 ft., fire grants fire immunity (the accompanying cold vulnerability has no matching target), water grants swim speed 30 ft. (the accompanying water-breathing has no matching target)",
  },
  "oracle:elementalist-oracle:elemental-revelation:20": {
    archetypeId: "oracle:elementalist-oracle",
    name: "Elemental Revelation",
    level: 20,
    bucket: "subsystem",
    note: "cleanly paired to the mystery's Final Revelation capstone, but grants a metamagic rider + energy-resistance-ignoring crits — no flat number",
  },
  "oracle:enlightened-philosopher:bonus-spell:4": {
    archetypeId: "oracle:enlightened-philosopher",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High)) — not Change-shaped either way",
  },
  "oracle:enlightened-philosopher:mental-acuity:7": {
    archetypeId: "oracle:enlightened-philosopher",
    name: "Mental Acuity",
    level: 7,
    bucket: "subsystem",
    note: "a scaling +1 inherent Intelligence bonus, but explicitly gained 'upon TAKING this revelation' — a revelation-list addition, not automatic; revelations are deferred",
  },
  "oracle:enlightened-philosopher:final-revelation:20": {
    archetypeId: "oracle:enlightened-philosopher",
    name: "Final Revelation",
    level: 20,
    bucket: "numeric",
    note: "unconditional Cha-bonus-to-all-saving-throws, cleanly paired to the mystery's Final Revelation capstone (guaranteed, not a menu pick) — extracted (see ORACLE_ARCHETYPE_EFFECTS_EXTRACTED below); the confusion/exhaustion/fatigue/nausea/sickened immunities, take-20-on-Knowledge, and reincarnate-on-death extras are not modeled",
  },
  "oracle:hermit:recluse-s-stride:3": {
    archetypeId: "oracle:hermit",
    name: "Recluse's Stride",
    level: 3,
    bucket: "situational",
    note: "real, unconditional +10 ft. base speed, but 'you must take this revelation at 1st level' — a revelation-list addition, not automatic; revelations are deferred",
  },
  "oracle:hermit:bonus-spell:4": {
    archetypeId: "oracle:hermit",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High)) — not Change-shaped either way",
  },
  "oracle:hermit:fade-from-memory:7": {
    archetypeId: "oracle:hermit",
    name: "Fade from Memory",
    level: 7,
    bucket: "subsystem",
    note: "conditional concealment when alone — a revelation-list addition (must be taken at 7th), also action/state-conditional",
  },
  "oracle:inerrant-voice:vigilant-protector:3": {
    archetypeId: "oracle:inerrant-voice",
    name: "Vigilant Protector",
    level: 3,
    bucket: "subsystem",
    note: "activated ally-protection ability spending a spell slot, resource-gated — no flat number",
  },
  "oracle:inerrant-voice:bonus-spell:4": {
    archetypeId: "oracle:inerrant-voice",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High)) — not Change-shaped either way",
  },
  "oracle:keleshite-prophet:divining-dance:1": {
    archetypeId: "oracle:keleshite-prophet",
    name: "Divining Dance",
    level: 1,
    bucket: "subsystem",
    note: "activated, Perform-check-gated random daily buff table — no unconditional number",
  },
  "oracle:keleshite-prophet:bonus-spell:6": {
    archetypeId: "oracle:keleshite-prophet",
    name: "Bonus Spell",
    level: 6,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:ocean-s-echo:inspiring-song:1": {
    archetypeId: "oracle:ocean-s-echo",
    name: "Inspiring Song",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance emulation, activated/resource-gated — no flat number",
  },
  "oracle:ocean-s-echo:bonus-spell:4": {
    archetypeId: "oracle:ocean-s-echo",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High)) — not Change-shaped either way",
  },
  "oracle:pei-zin-practitioner:healer-s-way:1": {
    archetypeId: "oracle:pei-zin-practitioner",
    name: "Healer's Way",
    level: 1,
    bucket: "subsystem",
    note: "new lay-on-hands-like healing ability — a new resource, no Change-shaped target for its healing dice",
  },
  "oracle:pei-zin-practitioner:master-herbalist:1": {
    archetypeId: "oracle:pei-zin-practitioner",
    name: "Master Herbalist",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) competence bonus to Profession (herbalist) specifically, using the established skill.pro.herbalist target (same convention as the witch's Herb Witch entry) — extracted (see ORACLE_ARCHETYPE_EFFECTS_EXTRACTED below); the Cha-instead-of-Wis key-ability-score swap and the potion-identification-via-Profession-instead-of-Spellcraft rider have no engine hook and are dropped",
  },
  "oracle:pei-zin-practitioner:master-healing-technique:7": {
    archetypeId: "oracle:pei-zin-practitioner",
    name: "Master Healing Technique",
    level: 7,
    bucket: "subsystem",
    note: "conditional condition-removal ability tied to a Profession check, resource-gated — no flat number",
  },
  "oracle:planar-oracle:bonus-spell:2": {
    archetypeId: "oracle:planar-oracle",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:planar-oracle:planar-resistance:3": {
    archetypeId: "oracle:planar-oracle",
    name: "Planar Resistance",
    level: 3,
    bucket: "situational",
    note: "real, cleanly-scaling energy resistance 10/20, but the affected energy type depends on an untracked 'chosen plane' pick — same 'untracked choice' exclusion as Cavern Sniper's bow-or-crossbow pick",
  },
  "oracle:possessed-oracle:oracle-s-curse:1": {
    archetypeId: "oracle:possessed-oracle",
    name: "Oracle's Curse",
    level: 1,
    bucket: "subsystem",
    note: "restricts the curse choice to haunted/tongues (both hand-tabled) — no numeric effect, the underlying curse works normally",
  },
  "oracle:possessed-oracle:two-minds:1": {
    archetypeId: "oracle:possessed-oracle",
    name: "Two Minds",
    level: 1,
    bucket: "situational",
    note: "real +2 Will bonus, but scoped to enchantment effects specifically (not general Will saves) — narrow scope excludes it; the 7th-level reroll is separately activated/resource-gated",
  },
  "oracle:possessed-oracle:bonus-spell:2": {
    archetypeId: "oracle:possessed-oracle",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:psychic-searcher:oracle-s-curse:1": {
    archetypeId: "oracle:psychic-searcher",
    name: "Oracle's Curse",
    level: 1,
    bucket: "subsystem",
    note: "curse-choice text carried over from the base class entry (no restriction stated in this feature's own prose) — no numeric effect",
  },
  "oracle:psychic-searcher:inspiration:2": {
    archetypeId: "oracle:psychic-searcher",
    name: "Inspiration",
    level: 2,
    bucket: "subsystem",
    note: "new investigator-style inspiration pool, replaces the 2nd-level mystery spell (not Change-shaped) — a new resource, no Change target",
  },
  "oracle:psychic-searcher:psychic-talent:3": {
    archetypeId: "oracle:psychic-searcher",
    name: "Psychic Talent",
    level: 3,
    bucket: "subsystem",
    note: "replaces the 3rd-level revelation with an investigator/rogue talent choice — revelation-list modification, deferred",
  },
  "oracle:psychic-searcher:bonus-spell:4": {
    archetypeId: "oracle:psychic-searcher",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High)) — not Change-shaped either way",
  },
  "oracle:purifier:diminished-spellcasting:1": {
    archetypeId: "oracle:purifier",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spells/day by one per level — spells-per-day comes from apps/web's hardcoded table, not a Change target",
  },
  "oracle:purifier:bonus-spell:2": {
    archetypeId: "oracle:purifier",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:purifier:see-sin:3": {
    archetypeId: "oracle:purifier",
    name: "See Sin",
    level: 3,
    bucket: "situational",
    note: "real +1/2-level bonus, but scoped to sensing/identifying enchantment-school and curse/emotion-descriptor magic specifically — narrow scope excludes it, same bar as Aquanaut's damage-type scoping",
  },
  "oracle:purifier:sacred-scourge:5": {
    archetypeId: "oracle:purifier",
    name: "Sacred Scourge",
    level: 5,
    bucket: "subsystem",
    note: "grants Alignment Channel (feat emulation) as an activated ability vs. evil outsiders, resource-gated — no flat number",
  },
  "oracle:purifier:celestial-armor:7": {
    archetypeId: "oracle:purifier",
    name: "Celestial Armor",
    level: 7,
    bucket: "numeric",
    note: "grants Armor Training (fighter, 4 levels lower than oracle level) — a pure additive grant (oracle has no base armor-training progression to conflict with) reusing the same mDexA/acpA formula shape as the hand-verified table's Weapon Master entry, offset by the level substitution — extracted (see ORACLE_ARCHETYPE_EFFECTS_EXTRACTED below); the armor-weight-halving and 11th-level heavy-armor-proficiency riders are not modeled",
  },
  "oracle:purifier:holy-terror:9": {
    archetypeId: "oracle:purifier",
    name: "Holy Terror",
    level: 9,
    bucket: "subsystem",
    note: "Turn-Undead-style fear effect vs. evil outsiders via sacred scourge — activated, no flat number",
  },
  "oracle:purifier:sin-eater:11": {
    archetypeId: "oracle:purifier",
    name: "Sin Eater",
    level: 11,
    bucket: "subsystem",
    note: "activated curse/enchantment/emotion-consumption ability, resource-gated — no flat number",
  },
  "oracle:purifier:celestial-master:13": {
    archetypeId: "oracle:purifier",
    name: "Celestial Master",
    level: 13,
    bucket: "subsystem",
    note: "Command-Undead-style compulsion vs. good outsiders via sacred scourge — activated, no flat number",
  },
  "oracle:reincarnated-oracle:oracle-s-curse:1": {
    archetypeId: "oracle:reincarnated-oracle",
    name: "Oracle's Curse",
    level: 1,
    bucket: "subsystem",
    note: "restricts the curse choice to haunted/tongues (both hand-tabled) — no numeric effect, the underlying curse works normally",
  },
  "oracle:reincarnated-oracle:bonus-spell:2": {
    archetypeId: "oracle:reincarnated-oracle",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:river-soul:river-bound-curse:1": {
    archetypeId: "oracle:river-soul",
    name: "River Bound Curse",
    level: 1,
    bucket: "subsystem",
    note: "narrative drawback (spellcasting tied to a physical vessel) — no number",
  },
  "oracle:river-soul:river-flow:1": {
    archetypeId: "oracle:river-soul",
    name: "River Flow",
    level: 1,
    bucket: "subsystem",
    note: "removes underwater-attack penalties — no roll-data path to the character's current underwater-combat penalty to cancel it with a formula (same shape as paladin Swiftsurge); the 11th-level River Form is a separate activated transformation",
  },
  "oracle:river-soul:bonus-spell:2": {
    archetypeId: "oracle:river-soul",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:river-soul:river-soul-revelation:20": {
    archetypeId: "oracle:river-soul",
    name: "River Soul Revelation",
    level: 20,
    bucket: "situational",
    note: "real fast-healing/immunity list, cleanly paired to the mystery's Final Revelation capstone, but conditional on 'while traveling on or immersed in the river' — a location state the engine can't check",
  },
  "oracle:seeker:tinkering:1": {
    archetypeId: "oracle:seeker",
    name: "Tinkering",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) Disable Device bonus — same formula the hand-verified table already extracts for sorcerer:seeker:tinkering:1 (a DIFFERENT id — this archetype is vendored separately per class), extracted here for the oracle id (see ORACLE_ARCHETYPE_EFFECTS_EXTRACTED below); the companion 'checks to locate traps' Perception bonus is scoped and excluded, matching the sorcerer entry's own precedent",
  },
  "oracle:seeker:seeker-lore:3": {
    archetypeId: "oracle:seeker",
    name: "Seeker Lore",
    level: 3,
    bucket: "subsystem",
    note: "replaces the 3rd-level revelation with a concentration/CL/Knowledge/Spellcraft bonus scoped to topics tied to the seeker's own bonus spells — revelation-list modification (deferred) AND narrowly scoped either way",
  },
  "oracle:seeker:seeker-magic:15": {
    archetypeId: "oracle:seeker",
    name: "Seeker Magic",
    level: 15,
    bucket: "subsystem",
    note: "replaces the 15th-level revelation with a metamagic-cost reduction on mystery bonus spells — revelation-list modification, deferred",
  },
  "oracle:seer:natural-divination:1": {
    archetypeId: "oracle:seer",
    name: "Natural Divination",
    level: 1,
    bucket: "subsystem",
    note: "grants the nature mystery's own 1st-level revelation as a required pick — revelation-list modification, deferred",
  },
  "oracle:seer:gift-of-prophecy:3": {
    archetypeId: "oracle:seer",
    name: "Gift of Prophecy",
    level: 3,
    bucket: "subsystem",
    note: "activated, once-per-day divination-spell emulation — revelation-list modification (deferred) AND activated",
  },
  "oracle:seer:bonus-spell:4": {
    archetypeId: "oracle:seer",
    name: "Bonus Spell",
    level: 4,
    bucket: "subsystem",
    note: "replaces mystery bonus spells (paired to Exchange Spell (High)) — not Change-shaped either way",
  },
  "oracle:shigenjo:bonus-spell:2": {
    archetypeId: "oracle:shigenjo",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:shigenjo:ki-pool:7": {
    archetypeId: "oracle:shigenjo",
    name: "Ki Pool",
    level: 7,
    bucket: "subsystem",
    note: "new ki-pool resource + activated swift-action riders — no Change target for a ki pool's max",
  },
  "oracle:shigenjo:quivering-palm:15": {
    archetypeId: "oracle:shigenjo",
    name: "Quivering Palm",
    level: 15,
    bucket: "subsystem",
    note: "monk-ability emulation 'in place of a revelation' — revelation-list modification, deferred",
  },
  "oracle:shigenjo:final-revelation:20": {
    archetypeId: "oracle:shigenjo",
    name: "Final Revelation",
    level: 20,
    bucket: "subsystem",
    note: "cleanly paired to the mystery's Final Revelation capstone, but grants language comprehension + environmental-hardship immunity + reincarnate-on-death — no flat number",
  },
  "oracle:spirit-guide:bonded-spirit:3": {
    archetypeId: "oracle:spirit-guide",
    name: "Bonded Spirit",
    level: 3,
    bucket: "subsystem",
    note: "grants a shaman hex + spirit-magic spells daily — new subsystem, no flat number",
  },
  "oracle:stargazer:guiding-star:1": {
    archetypeId: "oracle:stargazer",
    name: "Guiding Star",
    level: 1,
    bucket: "subsystem",
    note: "grants the heavens mystery's own 1st-level revelation as a required pick — revelation-list modification, deferred",
  },
  "oracle:stargazer:bonus-spell:2": {
    archetypeId: "oracle:stargazer",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:stargazer:star-chart:7": {
    archetypeId: "oracle:stargazer",
    name: "Star Chart",
    level: 7,
    bucket: "subsystem",
    note: "grants the heavens mystery's own 7th-level revelation as a required pick — revelation-list modification, deferred",
  },
  "oracle:tree-soul:transform-wood:1": {
    archetypeId: "oracle:tree-soul",
    name: "Transform Wood",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated temporary-transmutation utility — no flat number",
  },
  "oracle:tree-soul:weapon-and-armor-proficiency:1": {
    archetypeId: "oracle:tree-soul",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency restriction (no metal armor/shields) — no number",
  },
  "oracle:tree-soul:bonus-spell:2": {
    archetypeId: "oracle:tree-soul",
    name: "Bonus Spell",
    level: 2,
    bucket: "subsystem",
    note: "replaces mystery bonus spells — not Change-shaped either way",
  },
  "oracle:tree-soul:living-steel-dolls:11": {
    archetypeId: "oracle:tree-soul",
    name: "Living Steel Dolls",
    level: 11,
    bucket: "subsystem",
    note: "adds a spell to spells known + a material-transformation rider — spell-list addition, no flat number",
  },
  "oracle:tree-soul:tree-soul-revelation:20": {
    archetypeId: "oracle:tree-soul",
    name: "Tree Soul Revelation",
    level: 20,
    bucket: "numeric",
    note: "unconditional +4 natural armor + DR 10/slashing, cleanly paired to the mystery's Final Revelation capstone (guaranteed, not a menu pick) — extracted (see ORACLE_ARCHETYPE_EFFECTS_EXTRACTED below); limb regeneration and the once/day treant-shape activated ability are not modeled",
  },
  "oracle:warsighted:martial-flexibility:1": {
    archetypeId: "oracle:warsighted",
    name: "Martial Flexibility",
    level: 1,
    bucket: "subsystem",
    note: "activated feat-emulation ability (gains the benefit of a combat feat temporarily), resource-gated — no flat number",
  },
  // The "oracle-<name>-power" ids below are a SEPARATE synthetic bucket from
  // the ordinary archetypes above (e.g. `oracle:black-blooded-oracle`,
  // `oracle:cyclopean-seer`) — same underlying content, individually
  // re-vendored per sub-ability instead of bundled into one description.
  // Checked against each archetype's own top-level `archetypes.json`
  // description (not just the feature prose) to tell apart two genuinely
  // different shapes: Black Blood's three abilities are listed as the
  // Black-Blooded Oracle's own unconditional "class features" (nothing ties
  // them to `build.oracleCurse`'s separate hand-tabled-curse gap — that gap
  // only affects the ALREADY-classified `curse-of-black-blood:1`, a distinct
  // feature that actually swaps the curse mechanism); Cyclopean Seer's three
  // and Dual-Cursed's two are explicitly described as revelations ("this
  // ability alters the revelation class feature" / "may select ... in place
  // of a mystery revelation") layered on top of an ordinary, hand-tabled
  // curse choice — deferred under rule 1 above, same as Hermit's Recluse's
  // Stride, regardless of how clean the underlying number is.
  "oracle:oracle-black-blood-power:black-blood-spray:1": {
    archetypeId: "oracle:oracle-black-blood-power",
    name: "Black Blood Spray",
    level: 1,
    bucket: "situational",
    note: "real 1d8 + 1 per 2 levels cold damage, but an immediate-action reactive attack triggered by taking piercing/slashing damage, resource-gated (1/2 level/day) — a combat-event trigger, per the honesty bar",
  },
  "oracle:oracle-black-blood-power:dark-resilience:7": {
    archetypeId: "oracle:oracle-black-blood-power",
    name: "Dark Resilience",
    level: 7,
    bucket: "situational",
    note: "real +4 circumstance bonus on a saving-throw reroll, but triggered only after failing a save vs. a specific effect list, resource-gated (1-3/day by level) — a combat-event trigger, per the honesty bar",
  },
  "oracle:oracle-black-blood-power:darkvision:15": {
    archetypeId: "oracle:oracle-black-blood-power",
    name: "Darkvision",
    level: 15,
    bucket: "numeric",
    note: "darkvision 90 ft. at 15th — a base archetype feature, not gated on the curse-selection gap that blocks curse-of-black-blood:1 above (this feature never touches build.oracleCurse) — extracted via the sensedv target (see ORACLE_ARCHETYPE_EFFECTS_EXTRACTED below); collect.ts's own level-gate means the id's earlier 60 ft. clause can't apply below 15th (it's bundled into the already-classified black-blood-revelation:1 sibling entry instead, an under-count below 15th, not a double-count). The sibling entry's own note calling darkvision unmodeled predates this file's sense-target extraction; not corrected there (out of scope), but not repeated here",
  },
  "oracle:oracle-cyclopean-seer-power:doomsaying:1": {
    archetypeId: "oracle:oracle-cyclopean-seer-power",
    name: "Doomsaying",
    level: 1,
    bucket: "subsystem",
    note: "activated, once-per-day-per-Cha-bonus penalty debuff granted as a revelation ('this ability alters the revelation class feature') — revelation-list addition, deferred, also resource-gated",
  },
  "oracle:oracle-cyclopean-seer-power:flash-of-insight:1": {
    archetypeId: "oracle:oracle-cyclopean-seer-power",
    name: "Flash of Insight",
    level: 1,
    bucket: "subsystem",
    note: "grants the cyclops racial Flash of Insight ability, which the vendored archetype text marks (Su) not (Sp) — not a spell-like ability at all, so out of this table's scope regardless",
  },
  "oracle:oracle-cyclopean-seer-power:prescience:5": {
    archetypeId: "oracle:oracle-cyclopean-seer-power",
    name: "Prescience",
    level: 5,
    bucket: "subsystem",
    note: "a real, clean +2-then-scaling AC-vs-AoO/concentration bonus, but granted as a revelation ('all cyclopean seers have access to the following revelations') — revelation-list addition, deferred, same Hermit's Recluse's Stride precedent (a clean number still stays subsystem when it's a menu pick, not automatic)",
  },
  "oracle:oracle-dual-cursed-power:fortune:5": {
    archetypeId: "oracle:oracle-dual-cursed-power",
    name: "Fortune",
    level: 5,
    bucket: "subsystem",
    note: "activated d20-reroll ability the dual-cursed oracle 'may select ... in place of a mystery revelation' — revelation-list addition, deferred, also resource-gated",
  },
  "oracle:oracle-dual-cursed-power:misfortune:1": {
    archetypeId: "oracle:oracle-dual-cursed-power",
    name: "Misfortune",
    level: 1,
    bucket: "subsystem",
    note: "activated foe-targeting d20-reroll ability, same revelation-in-place-of-a-mystery-revelation shape as fortune above — revelation-list addition, deferred",
  },
};

/**
 * ── ORACLE_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for oracle archetype class features
 * (5). Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine; no
 * Foundry source was consulted (DESIGN.md §6).
 *
 * `archetype-effects.ts`'s hand-verified table has no oracle entries, so
 * there's no precedence collision to worry about for this class — but note
 * `oracle:seeker:tinkering:1` is a DIFFERENT id from the hand-verified
 * table's `sorcerer:seeker:tinkering:1` (the Seeker archetype is vendored
 * separately per class it applies to), so both exist independently without
 * conflict.
 *
 * Confidence rubric (same as `archetype-extracted/fighter.ts`): "high" =
 * literal/near-literal reflavor of an already-established mechanism or a
 * single, clearly-worded, fully-general scaling bonus; "medium" = a
 * non-obvious cadence or a level-substituted formula; "low" = reserved,
 * unused this wave.
 */
export const ORACLE_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  "oracle:enlightened-philosopher:final-revelation:20": {
    changes: [c("@abilities.cha.mod", "allSavingThrows")],
    detail: () => "+Cha to all saving throws",
    confidence: "high",
    provenance: "You receive a bonus on all saving throws equal to your Charisma modifier.",
  },
  "oracle:tree-soul:tree-soul-revelation:20": {
    changes: [c("4", "nac", "base"), c("10", "dr.slashing")],
    detail: () => "+4 natural armor, DR 10/slashing",
    confidence: "high",
    provenance:
      "This bark-like skin grants you a +4 natural armor bonus to your Armor Class and DR " +
      "10/slashing.",
  },
  "oracle:seeker:tinkering:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device`,
    confidence: "high",
    provenance:
      "At 1st level, a seeker adds half his oracle or sorcerer level on Perception checks made " +
      "to locate traps and on all Disable Device skill checks (minimum +1). (only the general " +
      "Disable Device half is extracted, matching the hand-verified sorcerer:seeker entry's own " +
      "precedent — the Perception half is scoped to 'checks made to locate traps' specifically)",
  },
  "oracle:pei-zin-practitioner:master-herbalist:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.pro.herbalist", "competence")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Profession (herbalist) (Cha-for-Wis swap not modeled)`,
    confidence: "high",
    provenance:
      "She gains a competence bonus on Profession (herbalist) checks equal to 1/2 her oracle " +
      "level (minimum 1), and uses her Charisma modifier in place of her Wisdom modifier when " +
      "attempting Profession (herbalist) checks. Additionally, a Pei Zin practitioner can " +
      "identify potions as if via detect magic using Profession (herbalist) instead of " +
      "Spellcraft, and she can attempt such a check after holding a potion for 1 round. " +
      "(only the flat bonus is extracted; the key-ability swap and potion-identification rider " +
      "are not modeled)",
  },
  "oracle:purifier:celestial-armor:7": {
    changes: [
      c("clamp(floor((@class.unlevel - 3) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel - 3) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) =>
      `+${Math.min(4, Math.max(0, Math.floor((level - 3) / 4)))} max Dex / -ACP (armor, as fighter 4 levels lower)`,
    confidence: "medium",
    provenance:
      "At 7th level, a purifier's armor takes on a golden or silvery sheen ... and she also " +
      "gains armor training as a fighter 4 levels lower than her oracle level. (armor-weight " +
      "reduction and 11th-level heavy armor proficiency not modeled)",
  },

  // Black-Blooded Oracle's "Darkvision" is vendored as ONE feature id at
  // level 15 even though its own prose covers both the base 60 ft. grant AND
  // the 90 ft. upgrade — but `collect.ts` gates every archetype feature's
  // Change on `f.level <= classLevel` (same as base class features), so this
  // id's formula only ever runs once the character is already 15th level or
  // higher. The base 60 ft. grant (levels 1-14) isn't reachable through THIS
  // id at all — it's bundled instead into the already-classified (subsystem)
  // black-blood-revelation:1 sibling entry, so a level 1-14 black-blooded
  // oracle shows no darkvision from either entry: an under-count, not a
  // double-count. Formula is a flat "90" rather than a conditional, since the
  // <15 branch can never execute.
  "oracle:oracle-black-blood-power:darkvision:15": {
    changes: [c("90", "sensedv", "base")],
    detail: () => "darkvision 90 ft.",
    confidence: "medium",
    provenance:
      "A black-blooded oracle gains darkvision with a range of 60 feet. The range increases " +
      "to 90 feet at 15th level.",
  },

  // Elementalist Oracle's "Elemental Form" grants one of four subtypes at
  // 11th level. Fly speed (air) and swim speed (water) use the flat-grant
  // "base"/"set" idiom; tremorsense (earth) uses the sensets sense target;
  // fire immunity uses the imm.fire target (a flag, "1" turns it on). The
  // fire subtype's cold VULNERABILITY and the water subtype's water-breathing
  // both have no matching Change target and are dropped.
  "oracle:elementalist-oracle:elemental-form:11": {
    changes: [],
    choice: {
      label: "Subtype",
      options: [
        { id: "air", label: "Air (fly speed 30 ft.)" },
        { id: "earth", label: "Earth (tremorsense 30 ft.)" },
        { id: "fire", label: "Fire (immune to fire)" },
        { id: "water", label: "Water (swim speed 30 ft.)" },
      ],
    },
    choiceChanges: {
      air: [{ formula: "30", target: "flySpeed", type: "base", operator: "set" }],
      earth: [c("30", "sensets", "base")],
      fire: [c("1", "imm.fire")],
      water: [{ formula: "30", target: "swimSpeed", type: "base", operator: "set" }],
    },
    detail: () =>
      "air: fly 30 ft. · earth: tremorsense 30 ft. · fire: immune to fire (cold vulnerability not modeled) · water: swim 30 ft. (water breathing not modeled)",
    confidence: "high",
    provenance:
      "At 11th level, you gain the air, earth, fire, or water subtype and an associated " +
      "ability: Air: Fly speed of 30 feet with perfect maneuverability. Earth: Tremorsense " +
      "with a range of 30 feet. Fire: Immunity to fire and vulnerability to cold. Water: Swim " +
      "speed of 30 feet and the ability to breathe underwater.",
  },
};
