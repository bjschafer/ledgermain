/**
 * Fighter's slice of the issue #45 batch-extraction pipeline (the pilot,
 * 2026-07-06, extended 2026-07-06 once the weapon-group-targeting gap was
 * fixed — see the "reclassified after the weapon-group fix" section below).
 * Per the per-class file convention (IMPLEMENTATION_PLAN.md's dated #45
 * "Batch-extraction wave prep" section), this file owns BOTH of fighter's
 * pipeline artifacts — `FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) —
 * so a future wave working on a different class never has a reason to touch
 * this file; only `index.ts` (the aggregator) needs one new import + one new
 * spread per class.
 *
 * ── FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION ──────────────────────────────
 *
 * Classification audit for issue #45's pilot slice: EVERY feature of EVERY
 * vendored fighter archetype (67 archetypes, 383 features), read and bucketed
 * as `numeric` / `situational` / `subsystem` / `blocked` — the reviewable
 * artifact the pipeline produces alongside the extracted-effects table, and
 * the input a future wave (other classes) mechanically repeats.
 *
 * Bucket definitions (see IMPLEMENTATION_PLAN.md's dated pipeline section for
 * the full rubric this was applied against):
 *  - "numeric": an unconditional (or armor-state-gated, matching the
 *    hand-verified table's `@armor.type` precedent) bonus expressible via a
 *    real `packages/engine/src/targets.ts` target — has an entry in
 *    `archetype-effects.ts` (hand-verified) or this file's
 *    `FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED` (machine-extracted).
 *  - "situational": a REAL number, but scoped to a specific maneuver, weapon,
 *    enemy state, or action the engine can't check without over-applying —
 *    same honesty bar `traits.ts`/`feat-effects.ts` already use. Never given
 *    a Change; the vendored prose (rendered as-is by `ClassFeaturesList`)
 *    remains the source of truth for the player.
 *  - "subsystem": grants an unrelated ability, resource, proficiency, or
 *    choice-list (or removes a penalty the engine never modeled) — no
 *    Change-shaped number to extract at all.
 *  - "blocked": composition trap — an UNPAIRED archetype feature that claims
 *    to replace only PART of an atomic, single-formula base grant (Armor
 *    Training's mDexA/acpA, or Bonus Feats (FGT)'s bonusFeats count, each
 *    computed as ONE level-based formula, not discrete per-tier/per-level
 *    grants). Suppressing the whole grant would remove tiers RAW keeps;
 *    backfilling a number for the archetype's own replacement would double
 *    it on top of the base grant's still-unsuppressed formula. Recorded
 *    rather than guessed at — same shape of trap as the Ironskin Monk case
 *    already documented in IMPLEMENTATION_PLAN.md, just triggered by
 *    partial-tier atomicity instead of an ambiguous multi-feature swap. Fixing
 *    this for real needs the base feature split into discrete per-tier/
 *    per-level grants (engine work, out of scope for a table entry).
 *
 * Methodology note (disclosed, not hidden): the `numeric` and `blocked`
 * buckets were individually hand-verified against the vendored prose (each
 * carries its own reasoning below, or lives in
 * `FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED` with a `provenance` sentence). The
 * `situational` / `subsystem` split for the remaining bulk was
 * heuristic-assisted (regex over the prose for a numeric pattern vs. a known
 * non-numeric grant shape, spot-checked against every archetype this agent
 * read in full) — the boundary between those two buckets doesn't affect
 * engine correctness (neither emits a `Change`), only audit-file clarity, so
 * this is a deliberate, disclosed scoping choice for the pilot rather than an
 * oversight.
 *
 * **Weapon-group reclassification (2026-07-06):** finding 1 (the
 * weapon-group-tagging gap) is fixed — `attack.weapon.<group>`/
 * `damage.weapon.<group>` now also match a weapon's vendored,
 * semantic `.weaponGroups` (`weapon-groups.ts`), not just its free-text
 * `.group` tag. Every one of the ~41 fighter features this pilot had
 * bucketed `situational`/`subsystem` "weapon-group-scoped ... — see
 * weapon-group-tagging process note" was re-read against the vendored
 * archetype-features prose; those whose prose names one concrete, real
 * weapon group (not a player free-choice, not a maneuver/enemy-state
 * restriction on top) were promoted to `numeric` and extracted into
 * `FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED` below, using the same
 * `1 + floor((@class.unlevel - G) / 4)` Weapon-Training cadence (RAW: +1 at
 * the feature's own grant level `G`, +1 every 4 fighter levels thereafter)
 * that fighter's base Weapon Training itself uses — now that a semantic
 * `attack.weapon.<group>`/`damage.weapon.<group>` target exists for it too.
 * Features that remained ambiguous (the prose names a *player-chosen* group,
 * grants something unrelated, or additionally restricts by maneuver/enemy
 * state) stayed in their original bucket with an updated note explaining why
 * the weapon-group fix specifically did not unlock them.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "fighter:aerial-assaulter:aerial-expertise:2": {
    archetypeId: "fighter:aerial-assaulter",
    name: "Aerial Expertise",
    level: 2,
    bucket: "numeric",
    note: "general Fly-check bonus, unconditional — spot-verified against aonprd.com 2026-07-06 (still machine-tier; promotion mechanics are a future decision)",
  },
  "fighter:aerial-assaulter:take-the-high-ground:2": {
    archetypeId: "fighter:aerial-assaulter",
    name: "Take the High Ground",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:aerial-assaulter:armor-training:3": {
    archetypeId: "fighter:aerial-assaulter",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note: "literal Armor Training reflavor (identical progression)",
  },
  "fighter:aerial-assaulter:weapon-training:5": {
    archetypeId: "fighter:aerial-assaulter",
    name: "Weapon Training",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: prose is VERBATIM base Weapon Training (unmodified, " +
      "free player choice of group each tier) — not a reflavor at all. Not given its own " +
      "extracted entry; becomes modelable via build.weaponTrainingGroups + collect.ts's generic " +
      "derivation (this same archetype's fighter still gets it, same as any other fighter).",
  },
  "fighter:aerial-assaulter:aerial-dodge:19": {
    archetypeId: "fighter:aerial-assaulter",
    name: "Aerial Dodge",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:aerial-assaulter:high-ground-mastery:20": {
    archetypeId: "fighter:aerial-assaulter",
    name: "High Ground Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:airborne-ambusher:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:airborne-ambusher",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:airborne-ambusher:combat-flyer:2": {
    archetypeId: "fighter:airborne-ambusher",
    name: "Combat Flyer",
    level: 2,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:airborne-ambusher:aerobatics:5": {
    archetypeId: "fighter:airborne-ambusher",
    name: "Aerobatics",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: unrelated to weapon groups — lets a Fly check " +
      "substitute for an Acrobatics check when moving through a threatened/occupied square. No " +
      "number to extract; the weapon-group fix doesn't apply here.",
  },
  "fighter:airborne-ambusher:flying-dodger:9": {
    archetypeId: "fighter:airborne-ambusher",
    name: "Flying Dodger",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:airborne-ambusher:plummeting-charge:13": {
    archetypeId: "fighter:airborne-ambusher",
    name: "Plummeting Charge",
    level: 13,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:aldori-defender:defensive-parry:3": {
    archetypeId: "fighter:aldori-defender",
    name: "Defensive Parry",
    level: 3,
    bucket: "numeric",
    note: "literal Armor Training reflavor (identical progression)",
  },
  "fighter:aldori-defender:disarming-strike:6": {
    archetypeId: "fighter:aldori-defender",
    name: "Disarming Strike",
    level: 6,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:aldori-defender:steel-net:8": {
    archetypeId: "fighter:aldori-defender",
    name: "Steel Net",
    level: 8,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:aldori-defender:counterattack:10": {
    archetypeId: "fighter:aldori-defender",
    name: "Counterattack",
    level: 10,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:aquanaut:piercing-focus:1": {
    archetypeId: "fighter:aquanaut",
    name: "Piercing Focus",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:aquanaut:tidal-celerity:2": {
    archetypeId: "fighter:aquanaut",
    name: "Tidal Celerity",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:aquanaut:aquadynamic-paragon:3": {
    archetypeId: "fighter:aquanaut",
    name: "Aquadynamic Paragon",
    level: 3,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:aquanaut:underwater-training:5": {
    archetypeId: "fighter:aquanaut",
    name: "Underwater Training",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: scoped by DAMAGE TYPE (bludgeoning/slashing/" +
      "piercing), not by this engine's WEAPON_GROUPS vocabulary — no vendored group matches a " +
      "damage type, so the weapon-group fix doesn't unlock this. Also situational (underwater " +
      "only). Stays subsystem/unmodelable.",
  },
  "fighter:archer:hawkeye:2": {
    archetypeId: "fighter:archer",
    name: "Hawkeye",
    level: 2,
    bucket: "numeric",
    note: "hand-verified, ground truth — Perception half of Hawkeye",
  },
  "fighter:archer:trick-shot:3": {
    archetypeId: "fighter:archer",
    name: "Trick Shot",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:archer:expert-archer:5": {
    archetypeId: "fighter:archer",
    name: "Expert Archer",
    level: 5,
    bucket: "numeric",
    note:
      "fixed group (bows), unconditional, general scaling formula — extracted after the " +
      "weapon-group fix (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above).",
  },
  "fighter:archer:safe-shot:9": {
    archetypeId: "fighter:archer",
    name: "Safe Shot",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:archer:evasive-archer:13": {
    archetypeId: "fighter:archer",
    name: "Evasive Archer",
    level: 13,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:archer:volley:17": {
    archetypeId: "fighter:archer",
    name: "Volley",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:archer:ranged-defense:19": {
    archetypeId: "fighter:archer",
    name: "Ranged Defense",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:archer:weapon-mastery:20": {
    archetypeId: "fighter:archer",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:armiger:hellknight-order:1": {
    archetypeId: "fighter:armiger",
    name: "Hellknight Order",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:armiger:studious-squire:1": {
    archetypeId: "fighter:armiger",
    name: "Studious Squire",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:armiger:ardent:2": {
    archetypeId: "fighter:armiger",
    name: "Ardent",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:armor-master:deflective-shield:2": {
    archetypeId: "fighter:armor-master",
    name: "Deflective Shield",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:armor-master:armored-defense:5": {
    archetypeId: "fighter:armor-master",
    name: "Armored Defense",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: mis-tagged by the pilot's heuristic — this is a DR " +
      "progression keyed by ARMOR TYPE (light/medium/heavy), not a weapon-group bonus at all; " +
      "the weapon-group fix doesn't apply. It IS a real, @armor.type-checkable, unconditional " +
      "number (same shape as the hand-verified table's Savage Barbarian precedent) — a genuine " +
      "candidate for extraction, but out of scope for this weapon-group-focused pass; flagged " +
      "for a future audit rather than silently left mis-described.",
  },
  "fighter:armor-master:fortification:9": {
    archetypeId: "fighter:armor-master",
    name: "Fortification",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:brawler:close-control:2": {
    archetypeId: "fighter:brawler",
    name: "Close Control",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:brawler:close-combatant:3": {
    archetypeId: "fighter:brawler",
    name: "Close Combatant",
    level: 3,
    bucket: "numeric",
    note:
      "fixed group (close), unconditional, explicit capped-scaling formula (max +5 attack/+7 " +
      "damage at 19th) — extracted after the weapon-group fix (see " +
      "FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above). Composition note: this feature's vendored " +
      "pairedBaseFeatureUuid resolves to ARMOR Training's uuid, not Weapon Training's, despite " +
      "the prose saying 'replaces weapon training 1 and 2' — a vendored-data mispairing, hand- " +
      "corrected via WEAPON_TRAINING_MISPAIRED_REPLACEMENTS in archetypes.ts so Brawler can't " +
      "double-dip this bonus with a separately filled-in build.weaponTrainingGroups pick.",
  },
  "fighter:brawler:menacing-stance:7": {
    archetypeId: "fighter:brawler",
    name: "Menacing Stance",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:brawler:no-escape:9": {
    archetypeId: "fighter:brawler",
    name: "No Escape",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:brawler:stand-still:13": {
    archetypeId: "fighter:brawler",
    name: "Stand Still",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:brawler:weapon-mastery:20": {
    archetypeId: "fighter:brawler",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:cad:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:cad",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:cad:dirty-maneuvers:2": {
    archetypeId: "fighter:cad",
    name: "Dirty Maneuvers",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:cad:catch-off-guard:3": {
    archetypeId: "fighter:cad",
    name: "Catch Off-Guard",
    level: 3,
    bucket: "subsystem",
    note: "grants a named feat, no independent number",
  },
  "fighter:cad:payback:5": {
    archetypeId: "fighter:cad",
    name: "Payback",
    level: 5,
    bucket: "situational",
    note: "conditional bonus vs. a creature that attacked you since your last turn",
  },
  "fighter:cad:deadly-surprise:7": {
    archetypeId: "fighter:cad",
    name: "Deadly Surprise",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:cad:razor-sharp-chair-leg:9": {
    archetypeId: "fighter:cad",
    name: "Razor-Sharp Chair Leg",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:cad:craven-combatant:11": {
    archetypeId: "fighter:cad",
    name: "Craven Combatant",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:cad:sweeping-prank:13": {
    archetypeId: "fighter:cad",
    name: "Sweeping Prank",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:cad:treacherous-blow:15": {
    archetypeId: "fighter:cad",
    name: "Treacherous Blow",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:cad:ultimate-payback:20": {
    archetypeId: "fighter:cad",
    name: "Ultimate Payback",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:calistrian-hunter:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:calistrian-hunter:tenacious-tracker:2": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Tenacious Tracker",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:calistrian-hunter:vengeance:5": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Vengeance",
    level: 5,
    bucket: "situational",
    note: "conditional bleed damage vs. a creature that damaged you",
  },
  "fighter:calistrian-hunter:savor-the-sting:9": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Savor the Sting",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:calistrian-hunter:swift-revenge:13": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Swift Revenge",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:calistrian-hunter:perceived-wrongs:17": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Perceived Wrongs",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:calistrian-hunter:certain-revenge:20": {
    archetypeId: "fighter:calistrian-hunter",
    name: "Certain Revenge",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:cavern-sniper:bonus-feat:2": {
    archetypeId: "fighter:cavern-sniper",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:cavern-sniper:silent-shooter:2": {
    archetypeId: "fighter:cavern-sniper",
    name: "Silent Shooter",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:cavern-sniper:quick-and-deadly:4": {
    archetypeId: "fighter:cavern-sniper",
    name: "Quick and Deadly",
    level: 4,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:cavern-sniper:sniper-training:5": {
    archetypeId: "fighter:cavern-sniper",
    name: "Sniper Training",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: the group is a BINARY player choice (bow OR " +
      "crossbow, not both, not free-for-all), same unmodeled shape as base Weapon Training's " +
      "free choice — no build field captures which of the two was picked, so which target " +
      "(attack.weapon.bows vs. attack.weapon.crossbows) to emit can't be determined. Stays " +
      "situational rather than guessing; a per-archetype restricted-choice picker would be " +
      "needed to unlock this, out of scope for the generic build.weaponTrainingGroups picker " +
      "built in this pass (that picker has no restriction mechanism).",
  },
  "fighter:cavern-sniper:greater-imbued-shot:9": {
    archetypeId: "fighter:cavern-sniper",
    name: "Greater Imbued Shot",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:cavern-sniper:weapon-mastery:20": {
    archetypeId: "fighter:cavern-sniper",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:child-of-acavna-and-amaznen:eldritch-lore:1": {
    archetypeId: "fighter:child-of-acavna-and-amaznen",
    name: "Eldritch Lore",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:child-of-acavna-and-amaznen:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:child-of-acavna-and-amaznen",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:child-of-acavna-and-amaznen:lore-of-acavna-and-amaznen:2": {
    archetypeId: "fighter:child-of-acavna-and-amaznen",
    name: "Lore of Acavna and Amaznen",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:child-of-acavna-and-amaznen:eldritch-armor-training:3": {
    archetypeId: "fighter:child-of-acavna-and-amaznen",
    name: "Eldritch Armor Training",
    level: 3,
    bucket: "numeric",
    note: "Armor Training unmodified + unmodeled arcane-SF% rider",
  },
  "fighter:child-of-acavna-and-amaznen:spells:5": {
    archetypeId: "fighter:child-of-acavna-and-amaznen",
    name: "Spells",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — grants " +
      "limited bloodrager spellcasting. A pilot heuristic false-positive (the generic " +
      "placeholder note was applied to every WeaponTraining5-paired feature id without " +
      "reading each one); this one has nothing to do with Weapon Training at all.",
  },
  "fighter:corsair:bonus-feat:1": {
    archetypeId: "fighter:corsair",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:corsair:pirate-weapons:1": {
    archetypeId: "fighter:corsair",
    name: "Pirate Weapons",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:corsair:deck-fighting:2": {
    archetypeId: "fighter:corsair",
    name: "Deck Fighting",
    level: 2,
    bucket: "subsystem",
    note: "grants Cleave as a bonus feat, no independent number",
  },
  "fighter:corsair:armored-pirate:3": {
    archetypeId: "fighter:corsair",
    name: "Armored Pirate",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:corsair:improved-deck-fighting:6": {
    archetypeId: "fighter:corsair",
    name: "Improved Deck Fighting",
    level: 6,
    bucket: "subsystem",
    note: "grants Great Cleave as a bonus feat (paired oddly to Bravery slot), no independent number",
  },
  "fighter:crossbowman:deadshot:3": {
    archetypeId: "fighter:crossbowman",
    name: "Deadshot",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:crossbowman:crossbow-expert:5": {
    archetypeId: "fighter:crossbowman",
    name: "Crossbow Expert",
    level: 5,
    bucket: "numeric",
    note:
      "fixed group (crossbows), unconditional, general scaling formula — extracted after the " +
      "weapon-group fix (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above).",
  },
  "fighter:crossbowman:improved-deadshot:7": {
    archetypeId: "fighter:crossbowman",
    name: "Improved Deadshot",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:crossbowman:quick-sniper:9": {
    archetypeId: "fighter:crossbowman",
    name: "Quick Sniper",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:crossbowman:greater-deadshot:11": {
    archetypeId: "fighter:crossbowman",
    name: "Greater Deadshot",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:crossbowman:safe-shot:13": {
    archetypeId: "fighter:crossbowman",
    name: "Safe Shot",
    level: 13,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:crossbowman:pinpoint-targeting:15": {
    archetypeId: "fighter:crossbowman",
    name: "Pinpoint Targeting",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:crossbowman:meteor-shot:17": {
    archetypeId: "fighter:crossbowman",
    name: "Meteor Shot",
    level: 17,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:crossbowman:penetrating-shot:19": {
    archetypeId: "fighter:crossbowman",
    name: "Penetrating Shot",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:crossbowman:weapon-mastery:20": {
    archetypeId: "fighter:crossbowman",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:cyber-soldier:armor-training:3": {
    archetypeId: "fighter:cyber-soldier",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note: "Armor Training reflavor, reduced 2-tier cadence (1 @3rd, 2 @7th+)",
  },
  "fighter:cyber-soldier:cybernetic-combat:5": {
    archetypeId: "fighter:cyber-soldier",
    name: "Cybernetic Combat",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — bonus applies to implanted " +
      "weapons/cybernetic-arm attacks specifically (a fictional-tech category, not one of " +
      "WEAPON_GROUPS), and its own text says it does NOT stack with Weapon Training's attack " +
      "bonus. Also grants an unrelated slam natural attack. No number to extract here.",
  },
  "fighter:cyber-soldier:improved-implantation:7": {
    archetypeId: "fighter:cyber-soldier",
    name: "Improved Implantation",
    level: 7,
    bucket: "subsystem",
    note: "cybertech-slot subsystem",
  },
  "fighter:cyber-soldier:weapon-training:9": {
    archetypeId: "fighter:cyber-soldier",
    name: "Weapon Training",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:cyber-soldier:resilience:19": {
    archetypeId: "fighter:cyber-soldier",
    name: "Resilience",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:dawnflower-dervish:burst-of-speed:3": {
    archetypeId: "fighter:dawnflower-dervish",
    name: "Burst of Speed",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dawnflower-dervish:desert-stride:7": {
    archetypeId: "fighter:dawnflower-dervish",
    name: "Desert Stride",
    level: 7,
    bucket: "subsystem",
    note: "terrain-movement rule, no engine target",
  },
  "fighter:dawnflower-dervish:rapid-attack:11": {
    archetypeId: "fighter:dawnflower-dervish",
    name: "Rapid Attack",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:dawnflower-dervish:lightning-strike:15": {
    archetypeId: "fighter:dawnflower-dervish",
    name: "Lightning Strike",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:dirty-fighter:sidestep:2": {
    archetypeId: "fighter:dirty-fighter",
    name: "Sidestep",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dirty-fighter:maneuver-training:5": {
    archetypeId: "fighter:dirty-fighter",
    name: "Maneuver Training",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped at all — a real +2 number, " +
      "but scoped to the dirty trick combat maneuver specifically (CMB when using it, CMD when " +
      "targeted by it), same 'specific maneuver' exclusion as every other maneuver-scoped entry " +
      "in this table. Reclassified from subsystem (the pilot's blind placeholder) to " +
      "situational (a real number, correctly excluded on the honesty bar).",
  },
  "fighter:dirty-fighter:speedy-tricks:9": {
    archetypeId: "fighter:dirty-fighter",
    name: "Speedy Tricks",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:dirty-fighter:double-tricks:13": {
    archetypeId: "fighter:dirty-fighter",
    name: "Double Tricks",
    level: 13,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dragonheir-scion:draconic-bloodline:1": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Draconic Bloodline",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:dragonheir-scion:eldritch-strikes:1": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Eldritch Strikes",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:dragonheir-scion:fearful-might:1": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Fearful Might",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dragonheir-scion:draconic-defense:3": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Draconic Defense",
    level: 3,
    bucket: "numeric",
    note: "natural armor bonus, unconditional (energy resistance half not modeled — energy type not tracked in schema) — spot-verified against aonprd.com 2026-07-06 (still machine-tier; promotion mechanics are a future decision)",
  },
  "fighter:dragonheir-scion:draconic-strike:4": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Draconic Strike",
    level: 4,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:dragonheir-scion:draconic-presense:6": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Draconic Presense",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:dragonheir-scion:wings:15": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Wings",
    level: 15,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:dragonheir-scion:might-of-wyrms:20": {
    archetypeId: "fighter:dragonheir-scion",
    name: "Might of Wyrms",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:dragoon:skilled-rider:1": {
    archetypeId: "fighter:dragoon",
    name: "Skilled Rider",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:dragoon:bonus-feat:2": {
    archetypeId: "fighter:dragoon",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:dragoon:armor-training:3": {
    archetypeId: "fighter:dragoon",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note: "Armor Training reflavor, flat (no further scaling stated)",
  },
  "fighter:dragoon:spear-training:5": {
    archetypeId: "fighter:dragoon",
    name: "Spear Training",
    level: 5,
    bucket: "numeric",
    note:
      "fixed group (spears), unconditional, only free-choice groups are dropped (this " +
      "archetype never gains any others) — extracted after the weapon-group fix (see " +
      "FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above).",
  },
  "fighter:dragoon:spinning-lance:7": {
    archetypeId: "fighter:dragoon",
    name: "Spinning Lance",
    level: 7,
    bucket: "subsystem",
    note: "weapon-versatility rule, no number",
  },
  "fighter:dragoon:banner:9": {
    archetypeId: "fighter:dragoon",
    name: "Banner",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dragoon:piercing-lance:11": {
    archetypeId: "fighter:dragoon",
    name: "Piercing Lance",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:dragoon:banner:14": {
    archetypeId: "fighter:dragoon",
    name: "Banner",
    level: 14,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dragoon:leaping-lance:15": {
    archetypeId: "fighter:dragoon",
    name: "Leaping Lance",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:dragoon:banner:19": {
    archetypeId: "fighter:dragoon",
    name: "Banner",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:dragoon:weapon-mastery:20": {
    archetypeId: "fighter:dragoon",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:drill-sergeant:tactician:2": {
    archetypeId: "fighter:drill-sergeant",
    name: "Tactician",
    level: 2,
    bucket: "subsystem",
    note: "grants the cavalier's tactician ability wholesale",
  },
  "fighter:drill-sergeant:weapon-training:5": {
    archetypeId: "fighter:drill-sergeant",
    name: "Weapon Training",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: the group is still a FREE player choice (not " +
      "fixed) — the archetype only restricts the fighter to a single group forever (no 9th/" +
      "13th/17th picks). Not given its own extracted entry (no fixed group to hardcode); " +
      "modelable via build.weaponTrainingGroups[0] alone (the generic picker doesn't hard-" +
      "enforce the 'only one tier' restriction, same soft-validation posture as every other " +
      "free-choice picker in this app).",
  },
  "fighter:drill-sergeant:greater-tactician:9": {
    archetypeId: "fighter:drill-sergeant",
    name: "Greater Tactician",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:drill-sergeant:weapon-trainer:13": {
    archetypeId: "fighter:drill-sergeant",
    name: "Weapon Trainer",
    level: 13,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:drill-sergeant:master-tactician:17": {
    archetypeId: "fighter:drill-sergeant",
    name: "Master Tactician",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:druman-blackjacket:bonus-feat:1": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:druman-blackjacket:bonus-feat:2": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:druman-blackjacket:blackjacket-tactics:4": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Blackjacket Tactics",
    level: 4,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:druman-blackjacket:bonus-feat:6": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Bonus Feat",
    level: 6,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:druman-blackjacket:amateurs:8": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Amateurs!",
    level: 8,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:druman-blackjacket:superior-tactics:12": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Superior Tactics",
    level: 12,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:druman-blackjacket:esprit-de-corps:16": {
    archetypeId: "fighter:druman-blackjacket",
    name: "Esprit de Corps",
    level: 16,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:eldritch-guardian:familiar:1": {
    archetypeId: "fighter:eldritch-guardian",
    name: "Familiar",
    level: 1,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:eldritch-guardian:share-training:2": {
    archetypeId: "fighter:eldritch-guardian",
    name: "Share Training",
    level: 2,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:eldritch-guardian:steel-will:2": {
    archetypeId: "fighter:eldritch-guardian",
    name: "Steel Will",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:eldritch-guardian:bonus-feat:4": {
    archetypeId: "fighter:eldritch-guardian",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:foehammer:sledgehammer:3": {
    archetypeId: "fighter:foehammer",
    name: "Sledgehammer",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:foehammer:weapon-training:5": {
    archetypeId: "fighter:foehammer",
    name: "Weapon Training",
    level: 5,
    bucket: "numeric",
    note:
      "fixed group (hammers), unconditional, single-group-forever (no free choice remains) — " +
      "extracted after the weapon-group fix (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above).",
  },
  "fighter:foehammer:hammer-to-the-ground:7": {
    archetypeId: "fighter:foehammer",
    name: "Hammer to the Ground",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:foehammer:rhythmic-blows:9": {
    archetypeId: "fighter:foehammer",
    name: "Rhythmic Blows",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:foehammer:piledriver:11": {
    archetypeId: "fighter:foehammer",
    name: "Piledriver",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:foehammer:ground-breaker:13": {
    archetypeId: "fighter:foehammer",
    name: "Ground Breaker",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:foehammer:hammer-master:17": {
    archetypeId: "fighter:foehammer",
    name: "Hammer Master",
    level: 17,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:foehammer:devastating-blow:19": {
    archetypeId: "fighter:foehammer",
    name: "Devastating Blow",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:foehammer:weapon-mastery:20": {
    archetypeId: "fighter:foehammer",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:free-hand-fighter:deceptive-strike:2": {
    archetypeId: "fighter:free-hand-fighter",
    name: "Deceptive Strike",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:free-hand-fighter:elusive:3": {
    archetypeId: "fighter:free-hand-fighter",
    name: "Elusive",
    level: 3,
    bucket: "numeric",
    note: "dodge AC bonus gated on @armor.type<=1 (encumbrance half not checked)",
  },
  "fighter:free-hand-fighter:singleton:5": {
    archetypeId: "fighter:free-hand-fighter",
    name: "Singleton",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — a real number, but scoped " +
      "to a hand/stance state (wielding one melee weapon, other hand free) this engine has no " +
      "roll data for (no off-hand/empty-hand tracking). Reclassified from subsystem (the " +
      "pilot's blind placeholder) to situational.",
  },
  "fighter:free-hand-fighter:timely-tip:9": {
    archetypeId: "fighter:free-hand-fighter",
    name: "Timely Tip",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:free-hand-fighter:interference:13": {
    archetypeId: "fighter:free-hand-fighter",
    name: "Interference",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:free-hand-fighter:reversal:19": {
    archetypeId: "fighter:free-hand-fighter",
    name: "Reversal",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:gladiator:bonus-feat:1": {
    archetypeId: "fighter:gladiator",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:gladiator:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:gladiator",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:gladiator:bonus-feat:2": {
    archetypeId: "fighter:gladiator",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:gladiator:fame:2": {
    archetypeId: "fighter:gladiator",
    name: "Fame",
    level: 2,
    bucket: "subsystem",
    note: "victory-point resource subsystem",
  },
  "fighter:gloomblade:shadow-weapon:1": {
    archetypeId: "fighter:gloomblade",
    name: "Shadow Weapon",
    level: 1,
    bucket: "subsystem",
    note: "grants a summoned/scaling weapon (no engine concept of a non-itemized weapon) — NOTE: this feature's full, wholesale 'replaces armor training and heavy-armor/shield proficiency' claim is UNPAIRED, so today the base Armor Training grant is NOT suppressed at all (a related, pre-existing over-application gap, distinct from the partial-tier 'blocked' cases above — flagged here, not fixed)",
  },
  "fighter:gloomblade:student-of-darkness:1": {
    archetypeId: "fighter:gloomblade",
    name: "Student of Darkness",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:gloomblade:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:gloomblade",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:gloomblade:shadow-weapon-training:5": {
    archetypeId: "fighter:gloomblade",
    name: "Shadow Weapon Training",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: explicitly does NOT select a weapon group — the " +
      "bonus applies only to conjured 'shadow weapons' (a subsystem this app doesn't model at " +
      "all: no shadow-weapon creation/tracking). The weapon-group fix has nothing to attach to " +
      "here.",
  },
  "fighter:high-guardian:obligation:1": {
    archetypeId: "fighter:high-guardian",
    name: "Obligation",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:high-guardian:right-hand:1": {
    archetypeId: "fighter:high-guardian",
    name: "Right Hand",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:high-guardian:defender-s-reflexes:2": {
    archetypeId: "fighter:high-guardian",
    name: "Defender's Reflexes",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:high-guardian:unassailable-allegiance:2": {
    archetypeId: "fighter:high-guardian",
    name: "Unassailable Allegiance",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:high-guardian:royal-protector:4": {
    archetypeId: "fighter:high-guardian",
    name: "Royal Protector",
    level: 4,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:high-guardian:bonus-feat:6": {
    archetypeId: "fighter:high-guardian",
    name: "Bonus Feat",
    level: 6,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:lore-warden:scholastic:1": {
    archetypeId: "fighter:lore-warden",
    name: "Scholastic",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:lore-warden:skill-over-strength:2": {
    archetypeId: "fighter:lore-warden",
    name: "Skill Over Strength",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:lore-warden:swords-secret:3": {
    archetypeId: "fighter:lore-warden",
    name: "Swords Secret",
    level: 3,
    bucket: "subsystem",
    note: "choice-list subsystem (swords secrets)",
  },
  "fighter:lore-warden-pfs-field-guide:scholastic:1": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Scholastic",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:lore-warden-pfs-field-guide:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:lore-warden-pfs-field-guide:expertise:2": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Expertise",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:lore-warden-pfs-field-guide:maneuver-mastery:3": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Maneuver Mastery",
    level: 3,
    bucket: "numeric",
    note: "general CMB/CMD bonus (all maneuvers), unconditional — spot-verified against aonprd.com 2026-07-06 (still machine-tier; promotion mechanics are a future decision)",
  },
  "fighter:lore-warden-pfs-field-guide:bravery:6": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Bravery",
    level: 6,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:lore-warden-pfs-field-guide:know-thy-enemy:7": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Know Thy Enemy",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:lore-warden-pfs-field-guide:hair-s-breadth:11": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Hair's Breadth",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:lore-warden-pfs-field-guide:swift-lore:14": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Swift Lore",
    level: 14,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:lore-warden-pfs-field-guide:know-weakness:19": {
    archetypeId: "fighter:lore-warden-pfs-field-guide",
    name: "Know Weakness",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:martial-master:martial-flexibility:5": {
    archetypeId: "fighter:martial-master",
    name: "Martial Flexibility",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — a limited-use " +
      "ability to temporarily gain any combat feat. No number to extract; the pilot's " +
      "placeholder note didn't reflect this feature's actual text.",
  },
  "fighter:mobile-fighter:agility:2": {
    archetypeId: "fighter:mobile-fighter",
    name: "Agility",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:mobile-fighter:armor-training:3": {
    archetypeId: "fighter:mobile-fighter",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note: "Armor Training reflavor, reduced 2-tier cadence (1 @3rd, 2 @7th+)",
  },
  "fighter:mobile-fighter:leaping-attack:5": {
    archetypeId: "fighter:mobile-fighter",
    name: "Leaping Attack",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — a real, cleanly-scaling " +
      "number, but conditional on the specific action taken that round (moved 5+ ft. before " +
      "attacking), same 'specific action' exclusion `feat-effects.ts` already uses for Power " +
      "Attack/Deadly Aim. Reclassified from subsystem (the pilot's blind placeholder) to " +
      "situational.",
  },
  "fighter:mobile-fighter:rapid-attack:11": {
    archetypeId: "fighter:mobile-fighter",
    name: "Rapid Attack",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:mobile-fighter:fleet-footed:15": {
    archetypeId: "fighter:mobile-fighter",
    name: "Fleet Footed",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:mobile-fighter:whirlwind-blitz:20": {
    archetypeId: "fighter:mobile-fighter",
    name: "Whirlwind Blitz",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:molthuni-defender:armored-defense:3": {
    archetypeId: "fighter:molthuni-defender",
    name: "Armored Defense",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:mutation-warrior:mutagen:3": {
    archetypeId: "fighter:mutation-warrior",
    name: "Mutagen",
    level: 3,
    bucket: "subsystem",
    note: "alchemist mutagen subsystem",
  },
  "fighter:mutation-warrior:mutagen-discovery:7": {
    archetypeId: "fighter:mutation-warrior",
    name: "Mutagen Discovery",
    level: 7,
    bucket: "subsystem",
    note: "alchemist discovery choice-list subsystem",
  },
  "fighter:opportunist:duplicitous:1": {
    archetypeId: "fighter:opportunist",
    name: "Duplicitous",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:opportunist:underhanded:1": {
    archetypeId: "fighter:opportunist",
    name: "Underhanded",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:opportunist:cunning-edge:4": {
    archetypeId: "fighter:opportunist",
    name: "Cunning Edge",
    level: 4,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:opportunist:alchemical-onslaught:5": {
    archetypeId: "fighter:opportunist",
    name: "Alchemical Onslaught",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: scoped to 'alchemical weapons and bombs,' a category " +
      "not covered by this engine's WEAPON_GROUPS vocabulary (no vendored weapon carries such a " +
      "tag), so the weapon-group fix doesn't unlock it — same shape as Knife Master's weapon- " +
      "category scoping in the hand-verified table. Reclassified from subsystem (the pilot's " +
      "blind placeholder) to situational (a real, if unmodelable, +1 attack number).",
  },
  "fighter:opportunist:weapon-training:9": {
    archetypeId: "fighter:opportunist",
    name: "Weapon Training",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:pack-mule:unobtrusive:1": {
    archetypeId: "fighter:pack-mule",
    name: "Unobtrusive",
    level: 1,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:pack-mule:efficient-packer:2": {
    archetypeId: "fighter:pack-mule",
    name: "Efficient Packer",
    level: 2,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:pack-mule:weight-training:3": {
    archetypeId: "fighter:pack-mule",
    name: "Weight Training",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:pack-mule:weight-training:5": {
    archetypeId: "fighter:pack-mule",
    name: "Weight Training",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: despite the name, prose is VERBATIM base Weapon " +
      "Training (unmodified, free player choice of group each tier) — not a reflavor. Not given " +
      "its own extracted entry; modelable generically via build.weaponTrainingGroups.",
  },
  "fighter:pack-mule:healthy-as-a-mule:19": {
    archetypeId: "fighter:pack-mule",
    name: "Healthy as a Mule",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:phalanx-soldier:stand-firm:2": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Stand Firm",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:phalanx-soldier:phalanx-fighting:3": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Phalanx Fighting",
    level: 3,
    bucket: "subsystem",
    note: "weapon-handedness rule, no number",
  },
  "fighter:phalanx-soldier:ready-pike:5": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Ready Pike",
    level: 5,
    bucket: "situational",
    note: "conditional, once/day, on readying a braced weapon",
  },
  "fighter:phalanx-soldier:deft-shield:7": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Deft Shield",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:phalanx-soldier:shield-ally:9": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Shield Ally",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:phalanx-soldier:irresistible-advance:15": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Irresistible Advance",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:phalanx-soldier:shielded-fortress:20": {
    archetypeId: "fighter:phalanx-soldier",
    name: "Shielded Fortress",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:polearm-master:pole-fighting:2": {
    archetypeId: "fighter:polearm-master",
    name: "Pole Fighting",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:polearm-master:steadfast-pike:3": {
    archetypeId: "fighter:polearm-master",
    name: "Steadfast Pike",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:polearm-master:polearm-training:5": {
    archetypeId: "fighter:polearm-master",
    name: "Polearm Training",
    level: 5,
    bucket: "numeric",
    note:
      "TWO fixed groups (spears AND polearms), same bonus on each, unconditional — extracted " +
      "after the weapon-group fix (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above). Known " +
      "imprecision: a weapon vendored in BOTH groups (e.g. Tiger Fork) would receive the bonus " +
      "twice, since RAW's 'take the highest, don't stack overlapping groups' rule isn't modeled " +
      "generically — same class of limitation as base Weapon Training's own overlap rule, which " +
      "this engine also doesn't implement (extremely rare weapon; not fixed here).",
  },
  "fighter:polearm-master:flexible-flanker:9": {
    archetypeId: "fighter:polearm-master",
    name: "Flexible Flanker",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:polearm-master:sweeping-fend:13": {
    archetypeId: "fighter:polearm-master",
    name: "Sweeping Fend",
    level: 13,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:polearm-master:step-aside:17": {
    archetypeId: "fighter:polearm-master",
    name: "Step Aside",
    level: 17,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:polearm-master:polearm-parry:19": {
    archetypeId: "fighter:polearm-master",
    name: "Polearm Parry",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:polearm-master:weapon-mastery:20": {
    archetypeId: "fighter:polearm-master",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:relic-master:improved-item-mastery:3": {
    archetypeId: "fighter:relic-master",
    name: "Improved Item Mastery",
    level: 3,
    bucket: "subsystem",
    note: "item-mastery-feat subsystem",
  },
  "fighter:relic-master:relic-channeler:5": {
    archetypeId: "fighter:relic-master",
    name: "Relic Channeler",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — a limited-use " +
      "swift action that boosts a worn magic item's enhancement bonus or caster level. No " +
      "number to extract here.",
  },
  "fighter:relic-master:improvised-item-mastery:19": {
    archetypeId: "fighter:relic-master",
    name: "Improvised Item Mastery",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:rondelero-duelist:buckler-bash:2": {
    archetypeId: "fighter:rondelero-duelist",
    name: "Buckler Bash",
    level: 2,
    bucket: "subsystem",
    note: "grants a shield-bash usage rule, no number",
  },
  "fighter:rondelero-duelist:buckler-catch:3": {
    archetypeId: "fighter:rondelero-duelist",
    name: "Buckler Catch",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:rondelero-duelist:strong-swing:5": {
    archetypeId: "fighter:rondelero-duelist",
    name: "Strong Swing",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: despite the name, prose is VERBATIM base Weapon " +
      "Training (unmodified, free player choice of group each tier) — not a reflavor. Not given " +
      "its own extracted entry; modelable generically via build.weaponTrainingGroups.",
  },
  "fighter:rondelero-duelist:armor-training:7": {
    archetypeId: "fighter:rondelero-duelist",
    name: "Armor Training",
    level: 7,
    bucket: "numeric",
    note: "Armor Training reflavor, delayed onset (starts L7, bumps at 15th)",
  },
  "fighter:rondelero-duelist:weapon-training:9": {
    archetypeId: "fighter:rondelero-duelist",
    name: "Weapon Training",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:rondelero-duelist:chopping-blow:11": {
    archetypeId: "fighter:rondelero-duelist",
    name: "Chopping Blow",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:roughrider:steadfast-mount:2": {
    archetypeId: "fighter:roughrider",
    name: "Steadfast Mount",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:roughrider:armored-charger:3": {
    archetypeId: "fighter:roughrider",
    name: "Armored Charger",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:roughrider:mounted-mettle:5": {
    archetypeId: "fighter:roughrider",
    name: "Mounted Mettle",
    level: 5,
    bucket: "situational",
    note: "conditional on being mounted/adjacent to mount (no mounted-state roll data)",
  },
  "fighter:roughrider:leap-from-the-saddle:7": {
    archetypeId: "fighter:roughrider",
    name: "Leap from the Saddle",
    level: 7,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:roughrider:relentless-steed:11": {
    archetypeId: "fighter:roughrider",
    name: "Relentless Steed",
    level: 11,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:roughrider:ride-them-down:15": {
    archetypeId: "fighter:roughrider",
    name: "Ride Them Down",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:roughrider:unavoidable-onslaught:15": {
    archetypeId: "fighter:roughrider",
    name: "Unavoidable Onslaught",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:roughrider:indomitable-steed:19": {
    archetypeId: "fighter:roughrider",
    name: "Indomitable Steed",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:savage-warrior:spark-of-life:2": {
    archetypeId: "fighter:savage-warrior",
    name: "Spark of Life",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:savage-warrior:natural-savagery:5": {
    archetypeId: "fighter:savage-warrior",
    name: "Natural Savagery",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: fixed group (natural weapons), unconditional, clean " +
      "scaling formula — but 'natural' is not one of this engine's WEAPON_GROUPS (no vendored " +
      "weapon carries it at all; natural attacks aren't in weapons.json). Unlike Unarmed " +
      "Fighter's monk+natural combo, there's no OTHER group here to fall back to, so nothing is " +
      "extractable. Also carries a grapple-CMB/CMD half, which would be maneuver-scoped " +
      "(excluded per the honesty bar) even if the vocabulary gap were fixed.",
  },
  "fighter:savage-warrior:savage-charge:9": {
    archetypeId: "fighter:savage-warrior",
    name: "Savage Charge",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:savage-warrior:careful-claw:13": {
    archetypeId: "fighter:savage-warrior",
    name: "Careful Claw",
    level: 13,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:savage-warrior:greater-savage-charge:17": {
    archetypeId: "fighter:savage-warrior",
    name: "Greater Savage Charge",
    level: 17,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:savage-warrior:natural-weapon-mastery:20": {
    archetypeId: "fighter:savage-warrior",
    name: "Natural Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:scrapper:scrap-armor:3": {
    archetypeId: "fighter:scrapper",
    name: "Scrap Armor",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:scrapper:scrapper-training:5": {
    archetypeId: "fighter:scrapper",
    name: "Scrapper Training",
    level: 5,
    bucket: "situational",
    note: "conditional on performing a sunder maneuver with the chosen group",
  },
  "fighter:seasoned-commander:tactician:3": {
    archetypeId: "fighter:seasoned-commander",
    name: "Tactician",
    level: 3,
    bucket: "subsystem",
    note: "grants the cavalier's tactician ability wholesale",
  },
  "fighter:seasoned-commander:inspiring-speech:5": {
    archetypeId: "fighter:seasoned-commander",
    name: "Inspiring Speech",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — an activated, once/day, " +
      "bardic-Inspire-Courage-style party buff. Same 'no generic activated-performance-buff " +
      "mechanism' gap already documented for Archaeologist's Luck (archetype-effects.ts's " +
      "notes-only slice).",
  },
  "fighter:seasoned-commander:inspire-greatness:9": {
    archetypeId: "fighter:seasoned-commander",
    name: "Inspire Greatness",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:seasoned-commander:greater-tactician:11": {
    archetypeId: "fighter:seasoned-commander",
    name: "Greater Tactician",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:seasoned-commander:inspire-heroics:15": {
    archetypeId: "fighter:seasoned-commander",
    name: "Inspire Heroics",
    level: 15,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:seasoned-commander:master-tactician:17": {
    archetypeId: "fighter:seasoned-commander",
    name: "Master Tactician",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:sensate:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:sensate",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:sensate:guarded-senses:2": {
    archetypeId: "fighter:sensate",
    name: "Guarded Senses",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:sensate:uncanny-dodge:3": {
    archetypeId: "fighter:sensate",
    name: "Uncanny Dodge",
    level: 3,
    bucket: "subsystem",
    note: "grants an ability (uncanny dodge), no number",
  },
  "fighter:sensate:centered-senses:5": {
    archetypeId: "fighter:sensate",
    name: "Centered Senses",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — a real, scaling insight " +
      "bonus (attack/damage/Will), but only while an activated 'centered' stance is active " +
      "(entered as a move action, dropped by several conditions). This engine has no generic " +
      "'active stance' auto-toggle; a player could hand-model it as a manually-toggled custom " +
      "buff already, so no archetype-table entry is needed.",
  },
  "fighter:sensate:improved-uncanny-dodge:7": {
    archetypeId: "fighter:sensate",
    name: "Improved Uncanny Dodge",
    level: 7,
    bucket: "subsystem",
    note: "grants an ability (improved uncanny dodge), no number",
  },
  "fighter:sensate:evasion:11": {
    archetypeId: "fighter:sensate",
    name: "Evasion",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:sensate:steady:15": {
    archetypeId: "fighter:sensate",
    name: "Steady",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:sensate:perfect-senses:19": {
    archetypeId: "fighter:sensate",
    name: "Perfect Senses",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:sensate:precision:20": {
    archetypeId: "fighter:sensate",
    name: "Precision",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:shielded-fighter:active-defense:3": {
    archetypeId: "fighter:shielded-fighter",
    name: "Active Defense",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:shielded-fighter:shield-fighter:5": {
    archetypeId: "fighter:shielded-fighter",
    name: "Shield Fighter",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — a real, scaling number, " +
      "but limited to shield BASH attacks specifically (shields aren't in WEAPON_GROUPS and " +
      "this app doesn't track 'attacking with the shield' as a distinct attack line). " +
      "Reclassified from subsystem (the pilot's blind placeholder) to situational.",
  },
  "fighter:shielded-fighter:shield-buffet:9": {
    archetypeId: "fighter:shielded-fighter",
    name: "Shield Buffet",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:shielded-fighter:shield-guard:17": {
    archetypeId: "fighter:shielded-fighter",
    name: "Shield Guard",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:shielded-fighter:shield-mastery:19": {
    archetypeId: "fighter:shielded-fighter",
    name: "Shield Mastery",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:shielded-fighter:shield-ward:20": {
    archetypeId: "fighter:shielded-fighter",
    name: "Shield Ward",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:siegebreaker:breaker-rush:1": {
    archetypeId: "fighter:siegebreaker",
    name: "Breaker Rush",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:siegebreaker:armored-vigor:2": {
    archetypeId: "fighter:siegebreaker",
    name: "Armored Vigor",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:siegebreaker:breaker-momentum:2": {
    archetypeId: "fighter:siegebreaker",
    name: "Breaker Momentum",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:siegebreaker:persistent-menace:4": {
    archetypeId: "fighter:siegebreaker",
    name: "Persistent Menace",
    level: 4,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:siegebreaker:bonus-feat:6": {
    archetypeId: "fighter:siegebreaker",
    name: "Bonus Feat",
    level: 6,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:siegebreaker:disorienting-blow:8": {
    archetypeId: "fighter:siegebreaker",
    name: "Disorienting Blow",
    level: 8,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:siegebreaker:masterful-distraction:20": {
    archetypeId: "fighter:siegebreaker",
    name: "Masterful Distraction",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:skirmisher:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:skirmisher",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:skirmisher:wilderness-training:1": {
    archetypeId: "fighter:skirmisher",
    name: "Wilderness Training",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:skirmisher:conditioning:2": {
    archetypeId: "fighter:skirmisher",
    name: "Conditioning",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:skirmisher:reconnaissance-training:2": {
    archetypeId: "fighter:skirmisher",
    name: "Reconnaissance Training",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:skirmisher:mobility-training:3": {
    archetypeId: "fighter:skirmisher",
    name: "Mobility Training",
    level: 3,
    bucket: "numeric",
    note: "dodge AC + land speed bonus gated on @armor.type<=1 (encumbrance half not checked)",
  },
  "fighter:skirmisher:conditioning:6": {
    archetypeId: "fighter:skirmisher",
    name: "Conditioning",
    level: 6,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:skirmisher:mobile-mastery:19": {
    archetypeId: "fighter:skirmisher",
    name: "Mobile Mastery",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:spear-fighter:dodge:1": {
    archetypeId: "fighter:spear-fighter",
    name: "Dodge",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:spear-fighter:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:spear-fighter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:spear-fighter:balanced-stride:2": {
    archetypeId: "fighter:spear-fighter",
    name: "Balanced Stride",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:spear-fighter:spear-parry:3": {
    archetypeId: "fighter:spear-fighter",
    name: "Spear Parry",
    level: 3,
    bucket: "subsystem",
    note: "parry/riposte subsystem (swashbuckler deed reflavor)",
  },
  "fighter:spear-fighter:weapon-training:5": {
    archetypeId: "fighter:spear-fighter",
    name: "Weapon Training",
    level: 5,
    bucket: "numeric",
    note:
      "the 5th-level pick is FORCED to spears (unconditional); 9th/13th/17th remain free " +
      "player choice per the prose (this archetype doesn't itself restrict them) — only the " +
      "guaranteed spears bonus is extracted (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above), " +
      "same partial-modeling posture as Hawkeye. Known imprecision: weaponTrainingReplaced() " +
      "suppresses the generic build.weaponTrainingGroups picker entirely for this archetype " +
      "(to avoid double-counting the 5th-level tier against the extracted entry), so the " +
      "otherwise-free 9th/13th/17th picks aren't modelable through either path today — a real, " +
      "if narrow, RAW gap flagged rather than silently accepted.",
  },
  "fighter:spear-fighter:spear-parry:7": {
    archetypeId: "fighter:spear-fighter",
    name: "Spear Parry",
    level: 7,
    bucket: "subsystem",
    note: "parry/riposte subsystem (duplicate of L3 entry in vendored data)",
  },
  "fighter:spear-fighter:weapon-mastery:20": {
    archetypeId: "fighter:spear-fighter",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:steelbound-fighter:steelbound-weapon:1": {
    archetypeId: "fighter:steelbound-fighter",
    name: "Steelbound Weapon",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:steelbound-fighter:bonus-feat:2": {
    archetypeId: "fighter:steelbound-fighter",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:steelbound-fighter:steelbound-awakening:5": {
    archetypeId: "fighter:steelbound-fighter",
    name: "Steelbound Awakening",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — the bonus is tied to ONE " +
      "specific weapon the player chose at 1st level (the 'steelbound weapon'), the same shape " +
      "as Weapon Focus's per-weapon free-text tag, but this archetype's own weapon choice isn't " +
      "tracked anywhere in the schema (no build field records which weapon is 'steelbound'). " +
      "Reclassified from subsystem (the pilot's blind placeholder) to situational.",
  },
  "fighter:swarm-fighter:athletic-prowess:1": {
    archetypeId: "fighter:swarm-fighter",
    name: "Athletic Prowess",
    level: 1,
    bucket: "numeric",
    note: "general Acrobatics/Climb bonus, unconditional — spot-verified against aonprd.com 2026-07-06 (still machine-tier; promotion mechanics are a future decision)",
  },
  "fighter:swarm-fighter:mobility:1": {
    archetypeId: "fighter:swarm-fighter",
    name: "Mobility",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:swarm-fighter:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:swarm-fighter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:swarm-fighter:safety-in-numbers:2": {
    archetypeId: "fighter:swarm-fighter",
    name: "Safety in Numbers",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:swarm-fighter:teamwork-feat:2": {
    archetypeId: "fighter:swarm-fighter",
    name: "Teamwork Feat",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:swarm-fighter:bonus-feat:4": {
    archetypeId: "fighter:swarm-fighter",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:swarm-fighter:share-space:5": {
    archetypeId: "fighter:swarm-fighter",
    name: "Share Space",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — a " +
      "positioning ability (move into a larger creature's space) with a real AC/Reflex bonus " +
      "conditional on currently sharing that space, an action-state this engine doesn't track. " +
      "Reclassified from subsystem (the pilot's blind placeholder) to situational.",
  },
  "fighter:swarm-fighter:strike-the-underbelly:9": {
    archetypeId: "fighter:swarm-fighter",
    name: "Strike the Underbelly",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:swarm-fighter:always-underfoot:13": {
    archetypeId: "fighter:swarm-fighter",
    name: "Always Underfoot",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:swarm-fighter:soft-underbelly:20": {
    archetypeId: "fighter:swarm-fighter",
    name: "Soft Underbelly",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:tactician:strategic-training:1": {
    archetypeId: "fighter:tactician",
    name: "Strategic Training",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:tactician:bonus-feat:2": {
    archetypeId: "fighter:tactician",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:tactician:tactical-awareness:2": {
    archetypeId: "fighter:tactician",
    name: "Tactical Awareness",
    level: 2,
    bucket: "numeric",
    note: "general initiative bonus, unconditional — spot-verified against aonprd.com 2026-07-06 (still machine-tier; promotion mechanics are a future decision)",
  },
  "fighter:tactician:armor-training:3": {
    archetypeId: "fighter:tactician",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note: "Armor Training reflavor, reduced 2-tier cadence (1 @3rd, 2 @7th+)",
  },
  "fighter:tactician:tactician:5": {
    archetypeId: "fighter:tactician",
    name: "Tactician",
    level: 5,
    bucket: "situational",
    note: "grants the cavalier's tactician ability wholesale, resource-gated",
  },
  "fighter:tactician:weapon-training:9": {
    archetypeId: "fighter:tactician",
    name: "Weapon Training",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:tactician:cooperative-combatant:11": {
    archetypeId: "fighter:tactician",
    name: "Cooperative Combatant",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:tactician:battle-insight:15": {
    archetypeId: "fighter:tactician",
    name: "Battle Insight",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:thunderstriker:strapped-shield:3": {
    archetypeId: "fighter:thunderstriker",
    name: "Strapped Shield",
    level: 3,
    bucket: "subsystem",
    note: "removes a two-handed-with-buckler penalty the engine never modeled",
  },
  "fighter:thunderstriker:hardbuckler:7": {
    archetypeId: "fighter:thunderstriker",
    name: "Hardbuckler",
    level: 7,
    bucket: "subsystem",
    note: "shield-bash-as-light-shield rule, no number",
  },
  "fighter:thunderstriker:knockback-smash:11": {
    archetypeId: "fighter:thunderstriker",
    name: "Knockback Smash",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:thunderstriker:hammer-and-anvil:13": {
    archetypeId: "fighter:thunderstriker",
    name: "Hammer and Anvil",
    level: 13,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:thunderstriker:buckler-defense:15": {
    archetypeId: "fighter:thunderstriker",
    name: "Buckler Defense",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:thunderstriker:balanced-bashing:17": {
    archetypeId: "fighter:thunderstriker",
    name: "Balanced Bashing",
    level: 17,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:thunderstriker:improved-buckler-defense:19": {
    archetypeId: "fighter:thunderstriker",
    name: "Improved Buckler Defense",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:titan-fighter:giant-weapon-wielder:1": {
    archetypeId: "fighter:titan-fighter",
    name: "Giant Weapon Wielder",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:titan-fighter:bonus-feat:2": {
    archetypeId: "fighter:titan-fighter",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:titan-fighter:incredible-heft:3": {
    archetypeId: "fighter:titan-fighter",
    name: "Incredible Heft",
    level: 3,
    bucket: "subsystem",
    note: "reduces an oversized-weapon attack penalty the engine never modeled",
  },
  "fighter:titan-fighter:unstoppable-momentum:5": {
    archetypeId: "fighter:titan-fighter",
    name: "Unstoppable Momentum",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — a real, scaling CMB/CMD " +
      "number, but conditional on wielding an oversized (larger-creature-sized) weapon, a " +
      "per-weapon-size-vs-wielder-size state this engine doesn't track. Reclassified from " +
      "subsystem (the pilot's blind placeholder) to situational.",
  },
  "fighter:tower-shield-specialist:tower-shield-specialist:5": {
    archetypeId: "fighter:tower-shield-specialist",
    name: "Tower Shield Specialist",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: not weapon-group-scoped — removes the tower " +
      "shield's -2 attack-roll encumbrance penalty. No new bonus to grant (this engine doesn't " +
      "track that penalty as a distinct component in the first place, so there's nothing to " +
      "remove either).",
  },
  "fighter:tower-shield-specialist:tower-shield-defense:9": {
    archetypeId: "fighter:tower-shield-specialist",
    name: "Tower Shield Defense",
    level: 9,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:tower-shield-specialist:immediate-repositioning:13": {
    archetypeId: "fighter:tower-shield-specialist",
    name: "Immediate Repositioning",
    level: 13,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:tower-shield-specialist:tower-shield-evasion:16": {
    archetypeId: "fighter:tower-shield-specialist",
    name: "Tower Shield Evasion",
    level: 16,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:trench-fighter:trench-warfare:3": {
    archetypeId: "fighter:trench-fighter",
    name: "Trench Warfare",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:tribal-fighter:battle-focus:1": {
    archetypeId: "fighter:tribal-fighter",
    name: "Battle Focus",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:tribal-fighter:forbidden-armor:1": {
    archetypeId: "fighter:tribal-fighter",
    name: "Forbidden Armor",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:tribal-fighter:tribal-weapon-training:5": {
    archetypeId: "fighter:tribal-fighter",
    name: "Tribal Weapon Training",
    level: 5,
    bucket: "numeric",
    note:
      "fixed group (tribal), unconditional, single-group-forever — extracted after the " +
      "weapon-group fix (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above). The feat-sharing half " +
      "(Weapon Focus etc. on ONE tribal weapon applies to the whole group) is not modeled — no " +
      "engine mechanism links a feat's weapon choice to a group at all.",
  },
  "fighter:two-handed-fighter:shattering-strike:2": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Shattering Strike",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:two-handed-fighter:overhand-chop:3": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Overhand Chop",
    level: 3,
    bucket: "situational",
    note: "hand-verified, ground truth — per-attack Str-double, no baseline number",
  },
  "fighter:two-handed-fighter:weapon-training:5": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Weapon Training",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: same free player choice of group as unmodified " +
      "Weapon Training, PLUS an extra condition this engine can't check at all — the bonus " +
      "only applies while wielding the weapon two-handed, and WeaponInstance has no 'currently " +
      "two-handed' flag (damageMultiplier hints at it but isn't a reliable substitute — a " +
      "player could set 1.5x for other reasons). Cleanly paired to the base Weapon Training " +
      "uuid (weaponTrainingReplaced() is true for this archetype), so the generic " +
      "build.weaponTrainingGroups picker is suppressed too and nothing replaces it — no Change " +
      "to extract, hand-verified or otherwise.",
  },
  "fighter:two-handed-fighter:backswing:7": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Backswing",
    level: 7,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:two-handed-fighter:piledriver:11": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Piledriver",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:two-handed-fighter:greater-power-attack:15": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Greater Power Attack",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:two-handed-fighter:devastating-blow:19": {
    archetypeId: "fighter:two-handed-fighter",
    name: "Devastating Blow",
    level: 19,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:two-weapon-warrior:defensive-flurry:3": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Defensive Flurry",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:two-weapon-warrior:twin-blades:5": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Twin Blades",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: despite the name, prose is VERBATIM base Weapon " +
      "Training (unmodified, free player choice of group each tier) — not a reflavor. Not given " +
      "its own extracted entry; modelable generically via build.weaponTrainingGroups.",
  },
  "fighter:two-weapon-warrior:doublestrike:9": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Doublestrike",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:two-weapon-warrior:improved-balance:11": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Improved Balance",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:two-weapon-warrior:equal-opportunity:13": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Equal Opportunity",
    level: 13,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:two-weapon-warrior:perfect-balance:15": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Perfect Balance",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:two-weapon-warrior:deft-doublestrike:17": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Deft Doublestrike",
    level: 17,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:two-weapon-warrior:deadly-defense:19": {
    archetypeId: "fighter:two-weapon-warrior",
    name: "Deadly Defense",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:unarmed-fighter:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:unarmed-fighter:bonus-feat:2": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:unarmed-fighter:harsh-training:2": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Harsh Training",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:unarmed-fighter:tough-guy:3": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Tough Guy",
    level: 3,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:unarmed-fighter:weapon-training:5": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Weapon Training",
    level: 5,
    bucket: "numeric",
    note:
      "fixed groups (monk AND natural weapons), unconditional — extracted after the " +
      "weapon-group fix, but only the monk half (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED " +
      "above): 'natural' is not one of this engine's WEAPON_GROUPS (no vendored weapon carries " +
      "it — natural attacks aren't in weapons.json at all), so that half stays unmodeled rather " +
      "than emitting a target that can never match anything. Same 'model only the modelable " +
      "half' posture as Archer's Hawkeye (fighter:archer, hand-verified table).",
  },
  "fighter:unarmed-fighter:clever-wrestler:7": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Clever Wrestler",
    level: 7,
    bucket: "subsystem",
    note: "removes grapple penalties the engine never modeled",
  },
  "fighter:unarmed-fighter:trick-throw:8": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Trick Throw",
    level: 8,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:unarmed-fighter:takedown:12": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Takedown",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:unarmed-fighter:eye-gouge:13": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Eye Gouge",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:unarmed-fighter:sucker-punch:17": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Sucker Punch",
    level: 17,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:unarmed-fighter:sheer-toughness:19": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Sheer Toughness",
    level: 19,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:unarmed-fighter:weapon-mastery:20": {
    archetypeId: "fighter:unarmed-fighter",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:unbreakable:tough-as-nails:1": {
    archetypeId: "fighter:unbreakable",
    name: "Tough as Nails",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:unbreakable:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:unbreakable",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:unbreakable:unflinching:2": {
    archetypeId: "fighter:unbreakable",
    name: "Unflinching",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:unbreakable:heroic-recovery:5": {
    archetypeId: "fighter:unbreakable",
    name: "Heroic Recovery",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — grants the " +
      "Heroic Recovery feat (or another combat feat) as a bonus feat, with extra daily uses at " +
      "higher levels. No flat number of its own to extract (the granted feat's own effect is " +
      "out of scope, same as any other bonus-feat grant).",
  },
  "fighter:unbreakable:heroic-defiance:9": {
    archetypeId: "fighter:unbreakable",
    name: "Heroic Defiance",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:unbreakable:quick-recovery:11": {
    archetypeId: "fighter:unbreakable",
    name: "Quick Recovery",
    level: 11,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:unbreakable:stalwart:13": {
    archetypeId: "fighter:unbreakable",
    name: "Stalwart",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:unbreakable:unlimited-endurance:15": {
    archetypeId: "fighter:unbreakable",
    name: "Unlimited Endurance",
    level: 15,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Armor Training tier; the base grant's mDexA/acpA is one atomic level-based formula (not per-tier), so this can't be safely suppressed or backfilled without splitting Armor Training into discrete per-tier grants (engine work, out of scope here)",
  },
  "fighter:unbreakable:miraculous-recovery:17": {
    archetypeId: "fighter:unbreakable",
    name: "Miraculous Recovery",
    level: 17,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:unbreakable:unbreakable-mind:20": {
    archetypeId: "fighter:unbreakable",
    name: "Unbreakable Mind",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-chosen-weapon ability; no engine target for crit auto-confirm",
  },
  "fighter:ustalavic-duelist:duelist-stance:1": {
    archetypeId: "fighter:ustalavic-duelist",
    name: "Duelist Stance",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:ustalavic-duelist:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:ustalavic-duelist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:ustalavic-duelist:duelist-training:5": {
    archetypeId: "fighter:ustalavic-duelist",
    name: "Duelist Training",
    level: 5,
    bucket: "numeric",
    note:
      "fixed group (blades-light), unconditional baseline, single-group-forever — extracted " +
      "after the weapon-group fix (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED above). The '+2 " +
      "extra damage while using duelist stance' addon is dropped (activated-stance condition " +
      "this engine can't check), same honesty-bar treatment as every other stance/action-gated " +
      "addon in this table.",
  },
  "fighter:ustalavic-duelist:lepidstadt-thrust:9": {
    archetypeId: "fighter:ustalavic-duelist",
    name: "Lepidstadt Thrust",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:ustalavic-duelist:science-of-the-blade:13": {
    archetypeId: "fighter:ustalavic-duelist",
    name: "Science of the Blade",
    level: 13,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:ustalavic-duelist:surgical-strike:17": {
    archetypeId: "fighter:ustalavic-duelist",
    name: "Surgical Strike",
    level: 17,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:varisian-free-style-fighter:martial-flexibility:1": {
    archetypeId: "fighter:varisian-free-style-fighter",
    name: "Martial Flexibility",
    level: 1,
    bucket: "blocked",
    note: "blocked: unpaired swap of a SINGLE Bonus Feats (FGT) instance; the base grant's bonusFeats count is one atomic level-based formula (not per-level entries), so this can't be safely suppressed or backfilled without splitting it into discrete per-level grants (engine work, out of scope here)",
  },
  "fighter:varisian-free-style-fighter:free-fighting-style:3": {
    archetypeId: "fighter:varisian-free-style-fighter",
    name: "Free Fighting Style",
    level: 3,
    bucket: "subsystem",
    note: "stance-stacking subsystem",
  },
  "fighter:venomblade:venom-projection:1": {
    archetypeId: "fighter:venomblade",
    name: "Venom Projection",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility text, no numeric or Change-shaped effect",
  },
  "fighter:venomblade:bonus-feat:2": {
    archetypeId: "fighter:venomblade",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:venomblade:sneak-attack:6": {
    archetypeId: "fighter:venomblade",
    name: "Sneak Attack",
    level: 6,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:venomblade:viper-strike:12": {
    archetypeId: "fighter:venomblade",
    name: "Viper Strike",
    level: 12,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:viking:fearsome:2": {
    archetypeId: "fighter:viking",
    name: "Fearsome",
    level: 2,
    bucket: "subsystem",
    note: "action-economy change to an existing Intimidate use, no independent number",
  },
  "fighter:viking:shield-defense:3": {
    archetypeId: "fighter:viking",
    name: "Shield Defense",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:viking:berserker:5": {
    archetypeId: "fighter:viking",
    name: "Berserker",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — grants the " +
      "barbarian Rage subsystem (using fighter level as barbarian level). Same 'rage isn't " +
      "auto-applied' posture already documented for Urban Barbarian in archetype-effects.ts.",
  },
  "fighter:viking:rage-power:6": {
    archetypeId: "fighter:viking",
    name: "Rage Power",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:warlord:evasive-dueling:1": {
    archetypeId: "fighter:warlord",
    name: "Evasive Dueling",
    level: 1,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:warlord:weapon-and-armor-proficiency:1": {
    archetypeId: "fighter:warlord",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "fighter:warlord:battle-bravado:3": {
    archetypeId: "fighter:warlord",
    name: "Battle Bravado",
    level: 3,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:warlord:weapon-training:5": {
    archetypeId: "fighter:warlord",
    name: "Weapon Training",
    level: 5,
    bucket: "situational",
    note:
      "re-read after the weapon-group fix: does NOT force a fixed group — it ADDS 'Barsoomian' " +
      "(a homebrew weapon list) as one more option among the normal free choices at each tier. " +
      "Since the group actually picked is still an unknowable player choice (same shape as " +
      "unmodified base Weapon Training), there is nothing to extract per-archetype; a player " +
      "using this archetype models any tier via the generic build.weaponTrainingGroups picker " +
      "same as any other fighter (Barsoomian itself isn't a real WEAPON_GROUPS entry — no " +
      "vendored weapon carries it — so that specific option can't be modeled either way).",
  },
  "fighter:warlord:sun-bronzed-skin:19": {
    archetypeId: "fighter:warlord",
    name: "Sun-Bronzed Skin",
    level: 19,
    bucket: "numeric",
    note:
      "DR 5/- gated on @armor.type==0 — extracted (see FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED " +
      "above). Originally DROPPED to situational in the pilot because a conditional dr-target " +
      "Change always contributed a modifier (even at value 0) and defenses.ts only showed the " +
      "Defenses stat-group when at least one dr/resistance/sr entry existed, so an armored " +
      "Warlord with no other DR source got a spurious 'DR/- 0' seal. FIXED 2026-07-06 in " +
      "defenses.ts (groupByQualifier/computeSr now drop zero-value qualifiers) — promoted to " +
      "numeric once the underlying engine wart was fixed rather than the targeting model.",
  },
  "fighter:weapon-bearer-squire:weapon-rack:1": {
    archetypeId: "fighter:weapon-bearer-squire",
    name: "Weapon Rack",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
  "fighter:weapon-bearer-squire:swift-sharpening:2": {
    archetypeId: "fighter:weapon-bearer-squire",
    name: "Swift Sharpening",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:weapon-bearer-squire:combat-repairs:3": {
    archetypeId: "fighter:weapon-bearer-squire",
    name: "Combat Repairs",
    level: 3,
    bucket: "subsystem",
    note: "item-repair subsystem",
  },
  "fighter:weapon-bearer-squire:bonus-feat:4": {
    archetypeId: "fighter:weapon-bearer-squire",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "feat-list restriction or standard bonus-feat schedule reprint, no count delta",
  },
  "fighter:weapon-bearer-squire:armor-training:7": {
    archetypeId: "fighter:weapon-bearer-squire",
    name: "Armor Training",
    level: 7,
    bucket: "numeric",
    note: "Armor Training reflavor, delayed onset (starts L7, tiers 7/11/15)",
  },
  "fighter:weapon-master:weapon-guard:2": {
    archetypeId: "fighter:weapon-master",
    name: "Weapon Guard",
    level: 2,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:weapon-master:weapon-training:3": {
    archetypeId: "fighter:weapon-master",
    name: "Weapon Training",
    level: 3,
    bucket: "numeric",
    note: "hand-verified, ground truth — Armor Training reflavor",
  },
  "fighter:weapon-master:reliable-strike:5": {
    archetypeId: "fighter:weapon-master",
    name: "Reliable Strike",
    level: 5,
    bucket: "subsystem",
    note:
      "re-read after the weapon-group fix: entirely unrelated to weapon groups — a limited-use " +
      "reroll (attack/crit-confirm/miss-chance/damage) as an immediate action. No flat number " +
      "to extract; this app doesn't model rerolls at all (no dice roller, per the project's own " +
      "posture).",
  },
  "fighter:weapon-master:mirror-move:9": {
    archetypeId: "fighter:weapon-master",
    name: "Mirror Move",
    level: 9,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:weapon-master:deadly-critical:13": {
    archetypeId: "fighter:weapon-master",
    name: "Deadly Critical",
    level: 13,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:weapon-master:critical-specialist:17": {
    archetypeId: "fighter:weapon-master",
    name: "Critical Specialist",
    level: 17,
    bucket: "situational",
    note: "real but conditional/narrowly-scoped number (specific maneuver, weapon, target state, or action) — not expressible without over-applying, per the honesty bar",
  },
  "fighter:weapon-master:unstoppable-strike:19": {
    archetypeId: "fighter:weapon-master",
    name: "Unstoppable Strike",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated ability/subsystem, no exploitable number",
  },
};

/**
 * ── FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for fighter archetype class features
 * (issue #45 — the prose→Change extraction pipeline, pilot slice, extended
 * 2026-07-06 by the weapon-group reclassification described above). Clean-room
 * from the published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." `collect.ts` and `archetypes.ts`
 * both resolve through `resolveArchetypeFeatureEffect` (`archetype-effects-resolve.ts`),
 * which always checks the hand-verified table FIRST — an id present in both
 * tables is governed entirely by the hand-verified entry, so the two tables
 * can never silently double-apply. (No fighter id is present in both tables
 * today; the precedence rule is exercised by a dedicated fixture test.)
 *
 * Extraction pass (2026-07-06): every feature of every vendored fighter
 * archetype was read and classified as `numeric` / `situational` /
 * `subsystem` / `blocked` — see `FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full, per-feature audit. Only `numeric` features get an
 * entry here. The honesty bar is identical to the hand-verified table's: a
 * bonus scoped to a specific maneuver, weapon, enemy state, or action (real
 * number, but the static sheet can't safely apply it everywhere) is
 * `situational`, not `numeric` — see the classification above and
 * IMPLEMENTATION_PLAN.md's dated pipeline section for the full rubric.
 *
 * Confidence rubric:
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism (e.g. Armor Training's mDexA/acpA, or Weapon Training's
 *    attack.weapon.<group>/damage.weapon.<group>), or a single, clearly-worded,
 *    fully general (no scope restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from prose
 *    (an irregular schedule, a delayed onset), or the bonus is gated on a
 *    real-but-partial condition this engine CAN check (`@armor.type`) while a
 *    second, textually-present condition (encumbrance, a specific shield)
 *    can't be checked and is dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pilot batch — reserved for future waves with
 *    messier prose.
 */
export const FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // ── Armor Training reflavors (literal — identical progression) ───────────

  "fighter:aerial-assaulter:armor-training:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor)`,
    confidence: "high",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. Every four " +
      "levels thereafter (7th, 11th, and 15th), these bonuses increase by +1 each time, to a " +
      "maximum -4 reduction of the armor check penalty and a +4 increase of the maximum " +
      "Dexterity bonus allowed.",
  },
  "fighter:aldori-defender:defensive-parry:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor)`,
    confidence: "high",
    provenance:
      "Starting at 3rd level, a fighter learns to be more maneuverable while wearing armor. " +
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum of " +
      "0) and increases the maximum Dexterity bonus allowed by his armor by 1. Every four " +
      "levels thereafter (7th, 11th, and 15th), these bonuses increase by +1 each time.",
  },
  "fighter:child-of-acavna-and-amaznen:eldritch-armor-training:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) =>
      `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor); arcane spell ` +
      `failure reduction not modeled`,
    confidence: "high",
    provenance:
      "At 3rd level, a child of Acavna and Amaznen gains eldritch armor training. This " +
      "functions as armor training, except as a swift action she can also reduce the arcane " +
      "spell failure chance due to armor she is wearing by 15% for any spells she casts this " +
      "round.",
  },

  // ── Armor Training reflavors (modified cadence) ───────────────────────────

  "fighter:cyber-soldier:armor-training:3": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 7), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 7 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. At 7th " +
      "level these bonuses increase by +1.",
  },
  "fighter:mobile-fighter:armor-training:3": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 7), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 7 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. At 7th " +
      "level, these bonuses increase by +1.",
  },
  "fighter:tactician:armor-training:3": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 7), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 7 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. At 7th " +
      "level, these bonuses increase by +1.",
  },
  "fighter:dragoon:armor-training:3": {
    changes: [c("1", "mDexA"), c("-1", "acpA")],
    detail: () => "+1 max Dex / -1 ACP (armor)",
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. In addition, " +
      "a fighter can also move at his normal speed while wearing medium armor." +
      " (no further scaling stated)",
  },
  "fighter:rondelero-duelist:armor-training:7": {
    changes: [
      c("if(gte(@class.unlevel, 15), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 15), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 15 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Starting at 7th level, a fighter learns to be more maneuverable while wearing armor. " +
      "... At level 15, these bonuses increase by +1 each.",
  },
  "fighter:weapon-bearer-squire:armor-training:7": {
    changes: [
      c("clamp(floor((@class.unlevel - 3) / 4), 0, 3)", "mDexA"),
      c("-clamp(floor((@class.unlevel - 3) / 4), 0, 3)", "acpA"),
    ],
    detail: (level) => `+${Math.min(3, Math.floor((level - 3) / 4))} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Starting at 7th level, a fighter learns to be more maneuverable while wearing armor. " +
      "... Every four levels thereafter (7th, 11th, and 15th), these bonuses increase by +1 " +
      "each time.",
  },

  // ── General, unconditional skill/save/init/CMB-CMD/natural-armor bonuses ─

  "fighter:aerial-assaulter:aerial-expertise:2": {
    changes: [c("min(10, 2 + 2 * floor((@class.unlevel - 2) / 4))", "skill.fly")],
    detail: (level) => `+${Math.min(10, 2 + 2 * Math.floor((level - 2) / 4))} Fly`,
    confidence: "high",
    provenance:
      "At 2nd level, an aerial assaulter gains a +2 bonus on Fly checks. ... At 6th level and " +
      "every 4 levels thereafter, this bonus on Fly checks increases by an additional 2, to a " +
      "maximum of +10 at 18th level.",
  },
  "fighter:tactician:tactical-awareness:2": {
    changes: [c("min(5, 1 + floor((@class.unlevel - 2) / 4))", "init")],
    detail: (level) => `+${Math.min(5, 1 + Math.floor((level - 2) / 4))} initiative`,
    confidence: "high",
    provenance:
      "At 2nd level, a tactician gains a +1 bonus on initiative checks. This bonus increases " +
      "by +1 for every four levels after 2nd level (to a maximum of +5 at 18th level).",
  },
  "fighter:lore-warden-pfs-field-guide:maneuver-mastery:3": {
    changes: [
      c("min(8, 2 + 2 * floor((@class.unlevel - 3) / 4))", "cmb"),
      c("min(8, 2 + 2 * floor((@class.unlevel - 3) / 4))", "cmd"),
    ],
    detail: (level) => `+${Math.min(8, 2 + 2 * Math.floor((level - 3) / 4))} CMB/CMD`,
    confidence: "high",
    provenance:
      "At 3rd level, a lore warden gains a +2 bonus on all CMB checks and to his CMD. This " +
      "bonus increases to +4 at 7th level, +6 at 11th level, and +8 at 15th level.",
  },
  "fighter:dragonheir-scion:draconic-defense:3": {
    changes: [c("if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 7), 2, 1))", "nac", "base")],
    detail: (level) =>
      `+${level >= 13 ? 3 : level >= 7 ? 2 : 1} natural armor (energy resistance vs. chosen ` +
      `energy type not modeled — energy type isn't tracked in the schema)`,
    confidence: "high",
    provenance:
      "At 3rd level, a dragonheir scion gains a +1 natural armor bonus and energy resistance " +
      "5 against her energy type. At 7th level, this increases to a +2 natural armor bonus " +
      "and energy resistance 10; at 13th level, it increases to a +3 natural armor bonus and " +
      "energy resistance 20.",
  },
  "fighter:swarm-fighter:athletic-prowess:1": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.acr"),
      c("floor(@class.unlevel / 2)", "skill.clm"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Acrobatics/Climb`,
    confidence: "high",
    provenance:
      "A swarm fighter adds Acrobatics and Climb to her class skills, and gains a bonus on " +
      "checks with these skills equal to 1/2 her swarm fighter level.",
  },

  // ── Bonuses gated on `@armor.type` (a real, if partial, condition check) ──
  // `@armor.type` (0 none, 1 light, 2 med, 3 heavy — see rolldata.ts) already
  // has precedent in the hand-verified table (Savage Barbarian's Natural
  // Toughness). Each of these also has a SECOND textual condition (an
  // encumbrance/load state, or "not using a shield") the engine has no roll
  // data for at all — dropped rather than guessed at, and called out in
  // `detail` so the UI doesn't imply full RAW fidelity.

  "fighter:warlord:sun-bronzed-skin:19": {
    changes: [c("if(eq(@armor.type,0),5,0)", "dr")],
    detail: () => "DR 5/— (unarmored only; no-shield condition not checked)",
    confidence: "medium",
    provenance:
      "At 19th level, a warlord who is not wearing armor or using a shield gains damage " +
      "reduction 5/—.",
  },
  "fighter:free-hand-fighter:elusive:3": {
    changes: [c("if(lte(@armor.type, 1), 1 + floor((@class.unlevel - 3) / 4), 0)", "ac", "dodge")],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 4)} dodge AC (light/no armor; medium+ load not checked)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a free hand fighter gains a +1 dodge bonus to AC. This bonus increases " +
      "by +1 for every four levels after 2nd. This bonus does not apply when wearing medium " +
      "or heavy armor or carrying a medium or heavier load.",
  },
  "fighter:skirmisher:mobility-training:3": {
    changes: [
      c("if(lte(@armor.type, 1), min(4, 1 + floor((@class.unlevel - 3) / 4)), 0)", "ac", "dodge"),
      c(
        "if(lte(@armor.type, 1), if(gte(@class.unlevel, 7), 10, 5), 0)",
        "landSpeed",
        "enhancement",
      ),
    ],
    detail: (level) =>
      `+${Math.min(4, 1 + Math.floor((level - 3) / 4))} dodge AC / +${level >= 7 ? 10 : 5} ft. ` +
      `land speed (light/no armor; light load not checked)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a skirmisher learns to be more maneuverable while wearing light or no " +
      "armor. He gains a +1 dodge bonus to AC while wearing light or no armor and while " +
      "carrying no more than a light load. ... This bonus increases by 1 for every 4 levels " +
      "beyond 3rd (to a maximum of +4 at 15th level). In addition, a skirmisher gains an " +
      "enhancement bonus of +5 feet to his base speed. At 7th level, the bonus increases to " +
      "+10 feet.",
  },

  // ── Semantic weapon-group bonuses (Weapon Training reflavors, unlocked by ─
  // ── the 2026-07-06 weapon-group-targeting fix — see the header note) ─────
  // All ten of these are Weapon Training reflavors that fix (fully or
  // partially) which group the player would otherwise freely choose,
  // grafting the SAME formula shape base Weapon Training itself uses
  // (`weaponTrainingBonus` in tables.ts: 1 + floor((level - grantLevel) / 4),
  // clamped where the prose states an explicit maximum). Every one of these
  // archetypes is in `WEAPON_TRAINING_REPLACEMENTS` (archetypes.ts), so the
  // generic build.weaponTrainingGroups picker is suppressed for them — this
  // entry is the ONLY place their weapon-group bonus comes from, never both.

  "fighter:archer:expert-archer:5": {
    changes: [
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.bows"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.bows"),
    ],
    detail: (level) => `+${1 + Math.floor((level - 5) / 4)} attack/damage with bows`,
    confidence: "high",
    provenance:
      "At 5th level, an archer gains a +1 bonus on attack and damage rolls with bows. This " +
      "bonus increases by +1 for every four levels beyond 5th. This ability replaces weapon " +
      "training 1.",
  },
  "fighter:crossbowman:crossbow-expert:5": {
    changes: [
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.crossbows"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.crossbows"),
    ],
    detail: (level) => `+${1 + Math.floor((level - 5) / 4)} attack/damage with crossbows`,
    confidence: "high",
    provenance:
      "At 5th level, a crossbowman gains a +1 bonus on attack and damage rolls with crossbows. " +
      "This bonus increases by +1 per four levels after 5th. This ability replaces weapon " +
      "training 1.",
  },
  "fighter:dragoon:spear-training:5": {
    changes: [
      c("min(4, 1 + floor((@class.unlevel - 5) / 4))", "attack.weapon.spears"),
      c("min(8, 2 + 2 * floor((@class.unlevel - 5) / 4))", "damage.weapon.spears"),
    ],
    detail: (level) =>
      `+${Math.min(4, 1 + Math.floor((level - 5) / 4))} attack / +` +
      `${Math.min(8, 2 + 2 * Math.floor((level - 5) / 4))} damage with spears`,
    confidence: "high",
    provenance:
      "At 5th level, a dragoon must select weapon training with the spear group. The dragoon's " +
      "weapon training bonus with spears improves by +1 on attack rolls and +2 on damage rolls " +
      "for every four levels beyond 5th (to a maximum of +4 on attack rolls and +8 on damage " +
      "rolls at 17th level). The dragoon does not gain weapon training in any other groups as " +
      "he increases in level.",
  },
  "fighter:foehammer:weapon-training:5": {
    changes: [
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.hammers"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.hammers"),
    ],
    detail: (level) => `+${1 + Math.floor((level - 5) / 4)} attack/damage with hammers`,
    confidence: "high",
    provenance:
      "At 5th level, a foehammer must select hammers and does not gain weapon training with " +
      "other groups, though his weapon training bonus improves by +1 every four levels after " +
      "5th.",
  },
  "fighter:polearm-master:polearm-training:5": {
    changes: [
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.spears"),
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.polearms"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.spears"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.polearms"),
    ],
    detail: (level) =>
      `+${1 + Math.floor((level - 5) / 4)} attack/damage with spears and polearms ` +
      `(a weapon vendored in BOTH groups, e.g. Tiger Fork, would double-count — not fixed)`,
    confidence: "medium",
    provenance:
      "At 5th level, a polearm master gains a +1 bonus on attack and damage rolls with spears " +
      "and polearms. The bonus increases by +1 for every four levels beyond 5th.",
  },
  "fighter:tribal-fighter:tribal-weapon-training:5": {
    changes: [
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.tribal"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.tribal"),
    ],
    detail: (level) => `+${1 + Math.floor((level - 5) / 4)} attack/damage with tribal weapons`,
    confidence: "high",
    provenance:
      "At 5th level, when a tribal fighter gains the weapon training ability, he must choose " +
      "the tribal weapon group and doesn't later gain additional weapon groups, though the " +
      "weapon training bonus for tribal weapons still improves at 9th level and every 4 levels " +
      "thereafter.",
  },
  "fighter:unarmed-fighter:weapon-training:5": {
    changes: [
      c("min(4, 1 + floor((@class.unlevel - 5) / 4))", "attack.weapon.monk"),
      c("min(4, 1 + floor((@class.unlevel - 5) / 4))", "damage.weapon.monk"),
    ],
    detail: (level) =>
      `+${Math.min(4, 1 + Math.floor((level - 5) / 4))} attack/damage with monk weapons ` +
      `(natural-weapon half not modeled — "natural" isn't a vendored weapon group)`,
    confidence: "medium",
    provenance:
      "At 5th level, an unarmed fighter gains a +1 bonus on attack and damage rolls with " +
      "weapons in the monk and natural weapon groups, improving by +1 for every four levels " +
      "beyond 5th (to a maximum of +4 at 17th level). This ability replaces weapon training 1, " +
      "2, 3, and 4.",
  },
  "fighter:ustalavic-duelist:duelist-training:5": {
    changes: [
      c("min(4, 1 + floor((@class.unlevel - 5) / 4))", "attack.weapon.blades-light"),
      c("min(4, 1 + floor((@class.unlevel - 5) / 4))", "damage.weapon.blades-light"),
    ],
    detail: (level) =>
      `+${Math.min(4, 1 + Math.floor((level - 5) / 4))} attack/damage with light blades ` +
      `(+2 extra damage while using duelist stance not modeled)`,
    confidence: "medium",
    provenance:
      "At 5th level, an Ustalavic duelist must select the light blades group for the weapon " +
      "training class feature. The Ustalavic duelist's weapon training bonus with light blades " +
      "increases by 1 on attack and damage rolls for every 4 levels he possesses beyond 5th (to " +
      "a maximum of +4 on attack and damage rolls at 17th level). If he is using his duelist " +
      "stance, this damage bonus increases by 2. The Ustalavic duelist does not gain weapon " +
      "training in any other groups as he increases in level.",
  },
  "fighter:brawler:close-combatant:3": {
    changes: [
      c("min(5, 1 + floor((@class.unlevel - 3) / 4))", "attack.weapon.close"),
      c("min(7, 3 + floor((@class.unlevel - 3) / 4))", "damage.weapon.close"),
    ],
    detail: (level) =>
      `+${Math.min(5, 1 + Math.floor((level - 3) / 4))} attack / +` +
      `${Math.min(7, 3 + Math.floor((level - 3) / 4))} damage with close weapons`,
    confidence: "high",
    provenance:
      "At 3rd level, a brawler gains a +1 bonus on attack rolls and a +3 bonus on damage rolls " +
      "with weapons in the close weapon group. Both of these bonuses increase by +1 for every " +
      "four levels beyond 3rd (to a maximum of +5 on attack rolls and +7 on damage rolls at " +
      "19th level). This ability replaces weapon training 1 and 2.",
  },
  "fighter:spear-fighter:weapon-training:5": {
    changes: [
      c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.spears"),
      c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.spears"),
    ],
    detail: (level) =>
      `+${1 + Math.floor((level - 5) / 4)} attack/damage with spears (guaranteed 5th-level ` +
      `pick only; 9th/13th/17th free-choice picks not modeled — see classification note)`,
    confidence: "medium",
    provenance:
      "At 5th level, a spear fighter must choose the spears weapon group for the weapon " +
      "training class feature. Whenever he attacks with a weapon from this group, he gains a " +
      "+1 bonus on attack and damage rolls. Every four levels thereafter (9th, 13th, and " +
      "17th), a fighter becomes further trained in another group of weapons... the bonuses " +
      "granted by previous weapon groups increase by +1 each.",
  },
};
