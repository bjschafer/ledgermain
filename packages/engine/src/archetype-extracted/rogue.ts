/**
 * Rogue's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06 — see IMPLEMENTATION_PLAN.md's dated "Batch-extraction wave
 * prep" section for the per-class file convention this follows). Covers all
 * 77 vendored rogue archetypes, 241 features, read individually (rogue's
 * archetype count is small enough to afford the exhaustive per-feature pass
 * the fighter pilot's own recommendation flagged as optional for smaller
 * classes — no heuristic-assisted situational/subsystem split here).
 *
 * ── Key finding that shapes this file's `blocked` bucket ──────────────────
 *
 * The task brief for this wave flagged rogue's base features with "real
 * vendored changes (sneak attack via `sneakAttackDice` in tables.ts, trap
 * sense, etc.)" as the double-count trap to watch for. On inspection, that
 * premise only half-holds: EVERY rogue base class feature's vendored
 * `changes[]` is empty upstream (Trapfinding, Evasion, Trap Sense, Uncanny
 * Dodge, Improved Uncanny Dodge, Advanced Talents, Master Strike — confirmed
 * against `class-features.json`), and none of them have a hand-authored
 * numeric table in the engine either (unlike e.g. barbarian's Damage
 * Reduction). They contribute a flat ZERO to the derived sheet today. Only
 * **Sneak Attack's die count** is modeled at all, and only as a display
 * string — `sneakAttackDice(rogueLevel)` (`tables.ts`), called directly by
 * `archetypes.ts`'s `resolveClassFeatures` from the character's raw rogue
 * class level, with NO awareness of `applied`/`replacedBy` at all (i.e. even
 * a fully-suppressed Sneak Attack grant still shows its dice count — the
 * function isn't gated on the swap machinery).
 *
 * Practical consequence for classification:
 *  - Replacing Trap Sense / Trapfinding / Uncanny Dodge / Improved Uncanny
 *    Dodge / Advanced Talents / Master Strike (whether cleanly paired via
 *    `pairedBaseFeatureUuid` — levels 3/4/8/10/20 are each a single base
 *    grant, so the data pipeline's level-based pairing heuristic pairs them
 *    automatically — or left ambiguous, as EVERY level 1/2 feature is,
 *    since those levels each grant two base features at once) is always
 *    safe to backfill a real number for: there is nothing to double-count,
 *    because the thing being "replaced" was already contributing zero.
 *    This is why this file's `blocked` bucket is much narrower than
 *    fighter's (no Armor-Training-style atomic-partial-tier trap exists for
 *    rogue — none of its base features carry a real scaling formula at all).
 *  - The ONE genuine trap is a feature that claims to modify **Sneak
 *    Attack's own die-count progression** — since that's hardcoded and
 *    unconditional in `tables.ts`/`archetypes.ts` (both out of this file's
 *    scope: only `archetype-extracted/rogue.ts` and this directory's
 *    `index.ts` may be touched by this wave), no per-archetype override is
 *    possible without engine work. See the `blocked` entries below — all
 *    three are "Sneak Attack" feature rows that turn out to be byte-
 *    identical reprints of the UNMODIFIED base Sneak Attack description
 *    (no stated change, no "this ability replaces/alters..." language) —
 *    a suspected vendored-data artifact (see IMPLEMENTATION_PLAN.md
 *    reference / this wave's report), not a real mechanical change. Left
 *    unmodeled rather than risk anything touching the hardcoded formula.
 *  - Features that upsize/downsize sneak attack's die **type** (d8 vs d6,
 *    e.g. Knife Master's Sneak Stab, Skulking Slayer's Bold Strike,
 *    Waylayer's Ambuscading Sneak Attack, Gun Smuggler's Selective
 *    Targeting) are `subsystem`, not `blocked` — they don't touch the
 *    count/progression `sneakAttackDice()` computes, they'd need a
 *    dedicated "sneak attack die type" Change target that doesn't exist in
 *    `targets.ts` at all. No composition risk, just nothing to extract.
 *
 * ── Rubric (same as the fighter pilot) ─────────────────────────────────────
 *  - "numeric": an unconditional bonus, or one gated on a condition this
 *    engine can check (`@armor.type`), expressible via a real
 *    `packages/engine/src/targets.ts` target.
 *  - "situational": a REAL number scoped to a specific check purpose (e.g.
 *    "Perception checks to avoid surprise," not general Perception), enemy
 *    state, maneuver, terrain/lighting condition with no roll data, or
 *    effect-type-scoped save (fear, poison, curses, specific descriptors —
 *    `targets.ts` only has `fort`/`ref`/`will`/`allSavingThrows`, no scoped
 *    variant) — same honesty bar as `traits.ts`/the hand-verified table.
 *  - "subsystem": grants an unrelated ability, resource, proficiency,
 *    choice-list (including anything that substitutes for or expands the
 *    rogue-talent list — talents are out of scope for this wave per the
 *    brief), applies a debuff/effect to a TARGET rather than a bonus to the
 *    rogue's own sheet, is an action/roll-substitution mechanic, or grants a
 *    sense (darkvision range, blindsight, etc.) — declined here even where a
 *    technically-real but permanently-UNAPPLIED target exists (`sensedv`),
 *    since emitting a Change that moves no number on the sheet would badge
 *    the archetype as "modeled" dishonestly.
 *  - "blocked": entangled with the hardcoded, atomic `sneakAttackDice()`
 *    progression this file cannot safely touch (see above) — narrower here
 *    than fighter's atomic-partial-tier trap, for the reasons explained
 *    above.
 *
 * Confidence: "high" = literal/near-literal unconditional bonus, clearly
 * worded. "medium" = a real ability with a second component this table
 * drops (an unmodelable rider, an armor/load double-condition where only the
 * armor half is checkable, or a modest interpretive read of "these bonuses"
 * scaling language). "low" unused, same as fighter's pass.
 *
 * Knife Master and Scout already have entries in the hand-verified table
 * (`archetype-effects.ts`, issue #7 — Hidden Blade and Scout's Charge
 * respectively) and IMPLEMENTATION_PLAN.md's archetype round-2 audit already
 * covers the REST of both archetypes' features as notes-only. Per the
 * pipeline's precedence rule (hand-verified always wins, never duplicated),
 * this file's classification entries for those two ids reference the
 * existing coverage rather than re-adding a second entry to the extracted
 * table.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

const BLOCKED_SNEAK_ATTACK_REPRINT =
  "byte-identical reprint of the UNMODIFIED base Sneak Attack description under an archetype " +
  "'feature' row — no stated change, no 'this ability replaces/alters...' language at all. " +
  "Suspected vendored-data artifact (a duplicate/mistagged CSV row), not a real archetype " +
  "modification — see this wave's report. Left unmodeled rather than risk anything touching " +
  "the hardcoded, atomic sneakAttackDice() progression (tables.ts, out of this file's scope).";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const ROGUE_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── Acrobat ────────────────────────────────────────────────────────────
  "rogue:acrobat:expert-acrobat:1": {
    archetypeId: "rogue:acrobat",
    name: "Expert Acrobat",
    level: 1,
    bucket: "numeric",
    note:
      "the +2 competence Acrobatics/Fly bonus while unarmored is a real, @armor.type-checkable " +
      "number — extracted. The 'no ACP on listed skills while in light armor' half has no " +
      "engine target (ACP suppression isn't Change-shaped) and is dropped. Replaces " +
      "trapfinding (contributes 0 upstream — safe either way).",
  },
  "rogue:acrobat:second-chance:3": {
    archetypeId: "rogue:acrobat",
    name: "Second Chance",
    level: 3,
    bucket: "subsystem",
    note: "reroll-a-just-made-check-at-a-penalty ability — no flat number to extract",
  },

  // ── Bandit ─────────────────────────────────────────────────────────────
  "rogue:bandit:ambush:4": {
    archetypeId: "rogue:bandit",
    name: "Ambush",
    level: 4,
    bucket: "subsystem",
    note: "extra actions in the surprise round — no Change-shaped number",
  },
  "rogue:bandit:fearsome-strike:8": {
    archetypeId: "rogue:bandit",
    name: "Fearsome Strike",
    level: 8,
    bucket: "situational",
    note: "conditional frighten rider on a confirmed sneak-attack crit — action-scoped, not an always-on number",
  },

  // ── Bekyar Kidnapper ───────────────────────────────────────────────────
  "rogue:bekyar-kidnapper:clean-capture:1": {
    archetypeId: "rogue:bekyar-kidnapper",
    name: "Clean Capture",
    level: 1,
    bucket: "situational",
    note: "real penalty-reduction number scoped to a single combat maneuver (tie up a restrained target) — same 'specific maneuver' exclusion used throughout this table",
  },
  "rogue:bekyar-kidnapper:abductor:3": {
    archetypeId: "rogue:bekyar-kidnapper",
    name: "Abductor",
    level: 3,
    bucket: "situational",
    note: "+1/3-level CMB/effective-CMB bonus scoped to the grapple maneuver specifically, not general cmb/cmd",
  },

  // ── Bellflower Irrigator ───────────────────────────────────────────────
  "rogue:bellflower-irrigator:bellflower-crop:1": {
    archetypeId: "rogue:bellflower-irrigator",
    name: "Bellflower Crop",
    level: 1,
    bucket: "subsystem",
    note: "designates an ally group for other Bellflower abilities to reference — no number of its own",
  },
  "rogue:bellflower-irrigator:poison-use:1": {
    archetypeId: "rogue:bellflower-irrigator",
    name: "Poison Use",
    level: 1,
    bucket: "subsystem",
    note: "removes a self-poisoning risk the engine never modeled — nothing to remove",
  },
  "rogue:bellflower-irrigator:grafting:4": {
    archetypeId: "rogue:bellflower-irrigator",
    name: "Grafting",
    level: 4,
    bucket: "situational",
    note: "grants flanking status under a specific ally-positioning condition — not an always-on bonus",
  },
  "rogue:bellflower-irrigator:irrigation:8": {
    archetypeId: "rogue:bellflower-irrigator",
    name: "Irrigation",
    level: 8,
    bucket: "subsystem",
    note: "conditional death/paralysis rider on a 3-round-studied sneak attack — no Change-shaped number",
  },

  // ── Burglar ────────────────────────────────────────────────────────────
  "rogue:burglar:careful-disarm:4": {
    archetypeId: "rogue:burglar",
    name: "Careful Disarm",
    level: 4,
    bucket: "subsystem",
    note: "trap-triggering-avoidance mechanic referencing the unmodeled Trap Sense bonus — no Change-shaped number",
  },
  "rogue:burglar:distraction:8": {
    archetypeId: "rogue:burglar",
    name: "Distraction",
    level: 8,
    bucket: "subsystem",
    note: "opposed Bluff-vs-Sense-Motive check to cover a failed Stealth attempt — no flat bonus granted",
  },

  // ── Carnivalist ────────────────────────────────────────────────────────
  "rogue:carnivalist:familiar:1": {
    archetypeId: "rogue:carnivalist",
    name: "Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar — familiar stat derivation is out of this table's scope",
  },
  "rogue:carnivalist:pet-performance:1": {
    archetypeId: "rogue:carnivalist",
    name: "Pet Performance",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance-style pet abilities — activated/resource-gated, no baseline number",
  },
  "rogue:carnivalist:sneak-attack:2": {
    archetypeId: "rogue:carnivalist",
    name: "Sneak Attack",
    level: 2,
    bucket: "blocked",
    note: BLOCKED_SNEAK_ATTACK_REPRINT,
  },
  "rogue:carnivalist:animal-trainer:3": {
    archetypeId: "rogue:carnivalist",
    name: "Animal Trainer",
    level: 3,
    bucket: "situational",
    note: "+1/2-level Handle Animal bonus scoped to Tiny/Small animals only — not general Handle Animal",
  },

  // ── Cat Burglar ────────────────────────────────────────────────────────
  "rogue:cat-burglar:phantom-presence:4": {
    archetypeId: "rogue:cat-burglar",
    name: "Phantom Presence",
    level: 4,
    bucket: "subsystem",
    note: "take-10-on-Stealth + leaves-no-trail utility ability — no flat number",
  },
  "rogue:cat-burglar:trap-saboteur:8": {
    archetypeId: "rogue:cat-burglar",
    name: "Trap Saboteur",
    level: 8,
    bucket: "subsystem",
    note: "trap-bypass timing/suppression ability — no Change-shaped number",
  },

  // ── Chameleon ──────────────────────────────────────────────────────────
  "rogue:chameleon:misdirection:1": {
    archetypeId: "rogue:chameleon",
    name: "Misdirection",
    level: 1,
    bucket: "subsystem",
    note: "a Bluff-ranks-sized resource pool spent on Stealth checks — an activated resource, not itself a flat Change",
  },
  "rogue:chameleon:effortless-sneak:3": {
    archetypeId: "rogue:chameleon",
    name: "Effortless Sneak",
    level: 3,
    bucket: "subsystem",
    note: "take-10-on-Stealth in a chosen favored terrain — no flat number",
  },

  // ── Charlatan ──────────────────────────────────────────────────────────
  "rogue:charlatan:natural-born-liar:1": {
    archetypeId: "rogue:charlatan",
    name: "Natural Born Liar",
    level: 1,
    bucket: "subsystem",
    note: "conditional penalty imposed on a TARGET's future Bluff checks against this character — not a bonus to the character's own sheet",
  },
  "rogue:charlatan:grand-hoax:3": {
    archetypeId: "rogue:charlatan",
    name: "Grand Hoax",
    level: 3,
    bucket: "subsystem",
    note: "grants an advanced rogue talent early — talent-list change, out of scope",
  },

  // ── Consigliere ────────────────────────────────────────────────────────
  "rogue:consigliere:convincing-attitude:1": {
    archetypeId: "rogue:consigliere",
    name: "Convincing Attitude",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonus feat + a rogue talent + a Diplomacy-failure-mitigation rule — no flat number",
  },
  "rogue:consigliere:bonus-feats:4": {
    archetypeId: "rogue:consigliere",
    name: "Bonus Feats",
    level: 4,
    bucket: "subsystem",
    note: "lets teamwork feats be taken in place of rogue talents — talent-list substitution, out of scope",
  },
  "rogue:consigliere:combat-advisor:4": {
    archetypeId: "rogue:consigliere",
    name: "Combat Advisor",
    level: 4,
    bucket: "situational",
    note: "conditional insight bonus granted to an ALLY's next attack after this character misses — no target for a bonus applied to another creature, and action/condition-scoped besides",
  },
  "rogue:consigliere:field-boss:10": {
    archetypeId: "rogue:consigliere",
    name: "Field Boss",
    level: 10,
    bucket: "subsystem",
    note: "grants a teamwork feat to nearby allies — no self-facing number",
  },

  // ── Construct Saboteur ─────────────────────────────────────────────────
  "rogue:construct-saboteur:arcane-strike:1": {
    archetypeId: "rogue:construct-saboteur",
    name: "Arcane Strike",
    level: 1,
    bucket: "subsystem",
    note: "grants Arcane Strike as a bonus feat — no independent number (Arcane Strike itself is a situational feat, same posture as feat-effects.ts)",
  },
  "rogue:construct-saboteur:arcane-sabotage:2": {
    archetypeId: "rogue:construct-saboteur",
    name: "Arcane Sabotage",
    level: 2,
    bucket: "subsystem",
    note: "menu of conditional, sneak-attack-dice-forgone debuffs against constructs — no self-facing flat number",
  },
  "rogue:construct-saboteur:dismantling-strikes:3": {
    archetypeId: "rogue:construct-saboteur",
    name: "Dismantling Strikes",
    level: 3,
    bucket: "situational",
    note: "DR/hardness-bypass amount scoped to attacking constructs specifically — no target for a scoped bypass number",
  },

  // ── Counterfeit Mage ───────────────────────────────────────────────────
  "rogue:counterfeit-mage:magical-expertise:1": {
    archetypeId: "rogue:counterfeit-mage",
    name: "Magical Expertise",
    level: 1,
    bucket: "situational",
    note: "+1/2-level bonus scoped to three narrow use-cases (locate/disarm magical traps, activate scrolls/wands via UMD) — narrower than an unconditional whole-skill bonus (contrast Seeker's unconditional Disable Device in the hand-verified table)",
  },
  "rogue:counterfeit-mage:signature-wand:4": {
    archetypeId: "rogue:counterfeit-mage",
    name: "Signature Wand",
    level: 4,
    bucket: "subsystem",
    note: "designates one wand for no-UMD-check activation — no flat number",
  },
  "rogue:counterfeit-mage:wand-adept:6": {
    archetypeId: "rogue:counterfeit-mage",
    name: "Wand Adept",
    level: 6,
    bucket: "subsystem",
    note: "substitutes Dex for Cha on wand UMD checks — an ability-swap, not a bonus",
  },

  // ── Cutpurse ───────────────────────────────────────────────────────────
  "rogue:cutpurse:measure-the-mark:1": {
    archetypeId: "rogue:cutpurse",
    name: "Measure the Mark",
    level: 1,
    bucket: "subsystem",
    note: "lets the rogue see a target's Perception result before deciding whether to attempt Sleight of Hand — no flat bonus",
  },
  "rogue:cutpurse:stab-and-grab:3": {
    archetypeId: "rogue:cutpurse",
    name: "Stab and Grab",
    level: 3,
    bucket: "situational",
    note: "conditional (sneak-attack-damage-dealt-gated) Sleight of Hand steal rider — action-scoped",
  },

  // ── Dark Lurker ────────────────────────────────────────────────────────
  "rogue:dark-lurker:blades-from-the-shadows:2": {
    archetypeId: "rogue:dark-lurker",
    name: "Blades from the Shadows",
    level: 2,
    bucket: "subsystem",
    note: "grants a bonus rogue talent + (at 6th) precision damage vs. total concealment — talent grant + conditional rider, no flat number",
  },
  "rogue:dark-lurker:blind-fight:2": {
    archetypeId: "rogue:dark-lurker",
    name: "Blind-Fight",
    level: 2,
    bucket: "subsystem",
    note: "grants Blind-Fight as a bonus feat",
  },
  "rogue:dark-lurker:improved-blind-fight:8": {
    archetypeId: "rogue:dark-lurker",
    name: "Improved Blind-Fight",
    level: 8,
    bucket: "subsystem",
    note: "grants Improved Blind-Fight as a bonus feat",
  },
  "rogue:dark-lurker:greater-blind-fight:14": {
    archetypeId: "rogue:dark-lurker",
    name: "Greater Blind-Fight",
    level: 14,
    bucket: "subsystem",
    note: "grants Greater Blind-Fight as a bonus feat",
  },
  "rogue:dark-lurker:instinctual-sense:20": {
    archetypeId: "rogue:dark-lurker",
    name: "Instinctual Sense",
    level: 20,
    bucket: "subsystem",
    note: "grants blindsight — a sense grant has no safely-extractable target (see this file's header note on declining UNAPPLIED-target Changes)",
  },

  // ── Deadly Courtesan ───────────────────────────────────────────────────
  "rogue:deadly-courtesan:bardic-performance:2": {
    archetypeId: "rogue:deadly-courtesan",
    name: "Bardic Performance",
    level: 2,
    bucket: "subsystem",
    note: "grants the bardic-performance resource + fascinate — activated/resource-gated, no baseline number",
  },
  "rogue:deadly-courtesan:inspire-competence:3": {
    archetypeId: "rogue:deadly-courtesan",
    name: "Inspire Competence",
    level: 3,
    bucket: "subsystem",
    note: "activated bardic-performance-style ally buff — same 'no generic activated-performance-buff mechanism' gap as Archaeologist's Luck (bard, hand-verified table)",
  },
  "rogue:deadly-courtesan:performance-strike:8": {
    archetypeId: "rogue:deadly-courtesan",
    name: "Performance Strike",
    level: 8,
    bucket: "subsystem",
    note: "spends bardic-performance rounds for a scaling morale attack bonus — resource-gated activated ability",
  },

  // ── Desert Raider ──────────────────────────────────────────────────────
  "rogue:desert-raider:desert-tracker:1": {
    archetypeId: "rogue:desert-raider",
    name: "Desert Tracker",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) Survival bonus scoped to desert-terrain tracking specifically — not general Survival",
  },
  "rogue:desert-raider:sun-at-your-back:2": {
    archetypeId: "rogue:desert-raider",
    name: "Sun at Your Back",
    level: 2,
    bucket: "subsystem",
    note: "grants a Stealth-without-cover option (at a self-imposed -5) — a rules permission, not a bonus number",
  },
  "rogue:desert-raider:light-step:3": {
    archetypeId: "rogue:desert-raider",
    name: "Light Step",
    level: 3,
    bucket: "situational",
    note: "the Survival-DC-to-track-HER increase isn't a bonus to her own checks at all; the Perception-vs-surprise bonus is scoped to a narrow check purpose",
  },

  // ── Discretion Specialist ──────────────────────────────────────────────
  "rogue:discretion-specialist:fast-talker:1": {
    archetypeId: "rogue:discretion-specialist",
    name: "Fast Talker",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) bonus across all of Bluff/Diplomacy/Intimidate — extracted",
  },
  "rogue:discretion-specialist:obfuscation:3": {
    archetypeId: "rogue:discretion-specialist",
    name: "Obfuscation",
    level: 3,
    bucket: "subsystem",
    note: "targeted memory-alteration ability with its own save DC — no bonus to the character's own sheet",
  },
  "rogue:discretion-specialist:evidence-disposal:4": {
    archetypeId: "rogue:discretion-specialist",
    name: "Evidence Disposal",
    level: 4,
    bucket: "subsystem",
    note: "dress-corpse spell-like ability — resource-gated, no baseline number",
  },
  "rogue:discretion-specialist:no-loose-ends:4": {
    archetypeId: "rogue:discretion-specialist",
    name: "No Loose Ends",
    level: 4,
    bucket: "subsystem",
    note: "conditional debuffs imposed on a sneak-attacked TARGET — not a bonus to the character",
  },

  // ── Dreamthief ─────────────────────────────────────────────────────────
  "rogue:dreamthief:dreamshard-focus:1": {
    archetypeId: "rogue:dreamthief",
    name: "Dreamshard Focus",
    level: 1,
    bucket: "subsystem",
    note: "grants spiritualist-emotional-focus abilities + bonus skill ranks in two chosen skills — choice-bearing rank grant, not a Change-shaped bonus",
  },
  "rogue:dreamthief:lucid-dreamer:3": {
    archetypeId: "rogue:dreamthief",
    name: "Lucid Dreamer",
    level: 3,
    bucket: "subsystem",
    note: "grants Lucid Dreamer as a bonus feat",
  },
  "rogue:dreamthief:soothe-dreaming:4": {
    archetypeId: "rogue:dreamthief",
    name: "Soothe Dreaming",
    level: 4,
    bucket: "subsystem",
    note: "mesmerist touch-treatment-equivalent ability — resource-gated",
  },
  "rogue:dreamthief:dream-infiltrator:8": {
    archetypeId: "rogue:dreamthief",
    name: "Dream Infiltrator",
    level: 8,
    bucket: "subsystem",
    note: "dream scan/dream travel spell-like abilities — resource-gated",
  },

  // ── Driver ─────────────────────────────────────────────────────────────
  "rogue:driver:hard-drive:1": {
    archetypeId: "rogue:driver",
    name: "Hard Drive",
    level: 1,
    bucket: "subsystem",
    note: "vehicle-driving-check DC/speed rule — no PC-facing Change target",
  },
  "rogue:driver:driver-s-fortitude:3": {
    archetypeId: "rogue:driver",
    name: "Driver's Fortitude",
    level: 3,
    bucket: "subsystem",
    note: "a fixed-DC Fortitude check to remain conscious below 0 hp — a special stabilization rule, not a bonus",
  },

  // ── Earthshadow ────────────────────────────────────────────────────────
  "rogue:earthshadow:earthlink:1": {
    archetypeId: "rogue:earthshadow",
    name: "Earthlink",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) Acrobatics/Perception bonus gated on contact with natural earth/unworked stone — a terrain-contact condition the engine can't check",
  },
  "rogue:earthshadow:earthcraft:2": {
    archetypeId: "rogue:earthshadow",
    name: "Earthcraft",
    level: 2,
    bucket: "subsystem",
    note: "a daily point pool spent on spell-like abilities — resource-gated",
  },

  // ── Eldritch Raider ────────────────────────────────────────────────────
  "rogue:eldritch-raider:detect-magic:2": {
    archetypeId: "rogue:eldritch-raider",
    name: "Detect Magic",
    level: 2,
    bucket: "subsystem",
    note: "at-will detect magic spell-like ability — no flat number",
  },
  "rogue:eldritch-raider:eldritch-intuition:3": {
    archetypeId: "rogue:eldritch-raider",
    name: "Eldritch Intuition",
    level: 3,
    bucket: "situational",
    note: "+1/3-level UMD bonus scoped to activating arcane spell-completion/trigger items specifically — narrower than the whole Use Magic Device skill",
  },

  // ── Eldritch Scoundrel ─────────────────────────────────────────────────
  "rogue:eldritch-scoundrel:spells:1": {
    archetypeId: "rogue:eldritch-scoundrel",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "grants a whole prepared-arcane spellcasting subsystem (magus-style spell slots) — out of scope for a table entry",
  },
  "rogue:eldritch-scoundrel:weapon-and-armor-proficiency:1": {
    archetypeId: "rogue:eldritch-scoundrel",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "rogue:eldritch-scoundrel:alarm-sense:3": {
    archetypeId: "rogue:eldritch-scoundrel",
    name: "Alarm Sense",
    level: 3,
    bucket: "subsystem",
    note: "a trap-spotter-talent variant limited to magic traps within 10 ft. — a detection ability, no flat number",
  },
  "rogue:eldritch-scoundrel:sneak-attack:3": {
    archetypeId: "rogue:eldritch-scoundrel",
    name: "Sneak Attack",
    level: 3,
    bucket: "blocked",
    note: BLOCKED_SNEAK_ATTACK_REPRINT,
  },
  "rogue:eldritch-scoundrel:uncanny-training:4": {
    archetypeId: "rogue:eldritch-scoundrel",
    name: "Uncanny Training",
    level: 4,
    bucket: "subsystem",
    note: "changes WHEN uncanny dodge/improved uncanny dodge are taken (talent-list substitution), not their numeric effect (boolean/prose upstream anyway)",
  },

  // ── Escapologist ───────────────────────────────────────────────────────
  "rogue:escapologist:elusive:1": {
    archetypeId: "rogue:escapologist",
    name: "Elusive",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) bonus across ALL Disable Device and Escape Artist checks — extracted",
  },
  "rogue:escapologist:unfettered-mind:3": {
    archetypeId: "rogue:escapologist",
    name: "Unfettered Mind",
    level: 3,
    bucket: "subsystem",
    note: "removes a mind-affecting effect via an Escape Artist check — a save-equivalent action, not a bonus",
  },
  "rogue:escapologist:impossible-escape:8": {
    archetypeId: "rogue:escapologist",
    name: "Impossible Escape",
    level: 8,
    bucket: "subsystem",
    note: "substitutes a penalized Escape Artist check for a failed save/AC — an action-substitution mechanic, not a flat bonus",
  },

  // ── False Medium ───────────────────────────────────────────────────────
  "rogue:false-medium:dim-the-lights:1": {
    archetypeId: "rogue:false-medium",
    name: "Dim the Lights",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Bluff/Disguise/Sleight of Hand bonus gated on a lighting condition (dim light/darkness) the engine has no roll data for",
  },
  "rogue:false-medium:false-sensitivity:2": {
    archetypeId: "rogue:false-medium",
    name: "False Sensitivity",
    level: 2,
    bucket: "subsystem",
    note: "lets Bluff fake occult skill-unlock results — an opposed-check mechanic, no flat bonus",
  },
  "rogue:false-medium:haunting-presences:3": {
    archetypeId: "rogue:false-medium",
    name: "Haunting Presences",
    level: 3,
    bucket: "subsystem",
    note: "Bluff-powered illusion-mimicry ability with a scaling range — the range isn't a Change-shaped PC stat",
  },

  // ── Fey Prankster ──────────────────────────────────────────────────────
  "rogue:fey-prankster:treacherous-plants:1": {
    archetypeId: "rogue:fey-prankster",
    name: "Treacherous Plants",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Bluff bonus scoped to two specific Bluff uses (distraction-to-hide, feint) near plants — narrower than general Bluff",
  },
  "rogue:fey-prankster:improved-dirty-trick:2": {
    archetypeId: "rogue:fey-prankster",
    name: "Improved Dirty Trick",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a bonus feat",
  },
  "rogue:fey-prankster:steal-appearance:4": {
    archetypeId: "rogue:fey-prankster",
    name: "Steal Appearance",
    level: 4,
    bucket: "subsystem",
    note: "swaps two creatures'/items' apparent identity — a disguise-equivalent effect, no flat bonus",
  },
  "rogue:fey-prankster:greater-dirty-trick:6": {
    archetypeId: "rogue:fey-prankster",
    name: "Greater Dirty Trick",
    level: 6,
    bucket: "subsystem",
    note: "grants Greater Dirty Trick as a bonus feat",
  },
  "rogue:fey-prankster:plant-traps:8": {
    archetypeId: "rogue:fey-prankster",
    name: "Plant Traps",
    level: 8,
    bucket: "subsystem",
    note: "converts a plant into a trap with fixed DCs — no PC-facing bonus",
  },
  "rogue:fey-prankster:unseen-trickster:12": {
    archetypeId: "rogue:fey-prankster",
    name: "Unseen Trickster",
    level: 12,
    bucket: "subsystem",
    note: "Stealth-without-cover permission near plants — a rules permission, not a bonus",
  },

  // ── Filcher ────────────────────────────────────────────────────────────
  "rogue:filcher:quicker-than-the-eye:2": {
    archetypeId: "rogue:filcher",
    name: "Quicker than the Eye",
    level: 2,
    bucket: "subsystem",
    note: "reduces an OPPONENT's Perception DC to notice a Sleight of Hand attempt + speeds up drawing a hidden item — not a bonus to the filcher's own checks",
  },
  "rogue:filcher:rummage:3": {
    archetypeId: "rogue:filcher",
    name: "Rummage",
    level: 3,
    bucket: "numeric",
    note: "unconditional scaling Appraise bonus — extracted",
  },
  "rogue:filcher:filch:4": {
    archetypeId: "rogue:filcher",
    name: "Filch",
    level: 4,
    bucket: "subsystem",
    note: "substitutes Sleight of Hand for CMB on the steal maneuver — a roll-substitution mechanic, not an additive Change",
  },
  "rogue:filcher:superior-filching:8": {
    archetypeId: "rogue:filcher",
    name: "Superior Filching",
    level: 8,
    bucket: "subsystem",
    note: "grants Greater Steal as a bonus feat + negates an OPPONENT's CMD bonus — the CMD-negation is opponent-side, not a PC bonus",
  },

  // ── Galtan Agitator ────────────────────────────────────────────────────
  "rogue:galtan-agitator:reputation:1": {
    archetypeId: "rogue:galtan-agitator",
    name: "Reputation",
    level: 1,
    bucket: "subsystem",
    note: "social-influence/reputation mechanic (renown-talent equivalent) — no flat number",
  },
  "rogue:galtan-agitator:ready-for-betrayal:3": {
    archetypeId: "rogue:galtan-agitator",
    name: "Ready for Betrayal",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Perception (recognize disguises/notice hiding) and Sense Motive (disbelieve lies) bonuses — both scoped to specific check purposes",
  },
  "rogue:galtan-agitator:enthralling-agitation:4": {
    archetypeId: "rogue:galtan-agitator",
    name: "Enthralling Agitation",
    level: 4,
    bucket: "subsystem",
    note: "enthrall spell-like ability + an influence-shifting check — resource-gated, no baseline number",
  },
  "rogue:galtan-agitator:revolutionary-s-cause:8": {
    archetypeId: "rogue:galtan-agitator",
    name: "Revolutionary's Cause",
    level: 8,
    bucket: "subsystem",
    note: "a suggestion-equivalent effect on an already-enthralled crowd — resource-gated, no baseline number",
  },
  "rogue:galtan-agitator:leadership:12": {
    archetypeId: "rogue:galtan-agitator",
    name: "Leadership",
    level: 12,
    bucket: "subsystem",
    note: "grants Leadership as a bonus feat (with a Leadership-score-doubling rider) — no independent Change target for a Leadership score",
  },

  // ── Guerrilla ──────────────────────────────────────────────────────────
  "rogue:guerrilla:skilled-liar:1": {
    archetypeId: "rogue:guerrilla",
    name: "Skilled Liar",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) Bluff bonus scoped to the opposed roll when deceiving someone — narrower than general Bluff",
  },
  "rogue:guerrilla:cover-of-night:2": {
    archetypeId: "rogue:guerrilla",
    name: "Cover of Night",
    level: 2,
    bucket: "situational",
    note: "+5 Disguise/Sleight of Hand/Stealth bonus gated on a lighting condition (dim light/darkness) the engine has no roll data for",
  },
  "rogue:guerrilla:secret-messenger:3": {
    archetypeId: "rogue:guerrilla",
    name: "Secret Messenger",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Bluff (convey) and Sense Motive (discern) bonuses scoped to secret-message use specifically",
  },
  "rogue:guerrilla:guerrilla-sniping:4": {
    archetypeId: "rogue:guerrilla",
    name: "Guerrilla Sniping",
    level: 4,
    bucket: "subsystem",
    note: "reduces a specific sniping-Stealth penalty from -20 to -10 — no target for a scoped penalty reduction",
  },

  // ── Guild Agent ────────────────────────────────────────────────────────
  "rogue:guild-agent:honor-among-thieves:1": {
    archetypeId: "rogue:guild-agent",
    name: "Honor Among Thieves",
    level: 1,
    bucket: "subsystem",
    note: "guild-membership/organizational-influence bookkeeping — no PC-facing number",
  },
  "rogue:guild-agent:guild-connections:2": {
    archetypeId: "rogue:guild-agent",
    name: "Guild Connections",
    level: 2,
    bucket: "situational",
    note: "+1/2-level Knowledge (local)/Diplomacy bonus scoped to gathering info about the guild's own base of operations — narrower than general use of those skills",
  },
  "rogue:guild-agent:pull-rank:8": {
    archetypeId: "rogue:guild-agent",
    name: "Pull Rank",
    level: 8,
    bucket: "subsystem",
    note: "calls in NPC guild members to assist — no PC-facing number",
  },
  "rogue:guild-agent:criminal-mastermind:20": {
    archetypeId: "rogue:guild-agent",
    name: "Criminal Mastermind",
    level: 20,
    bucket: "subsystem",
    note: "renown-talent-equivalent reputation mechanic — no flat number",
  },

  // ── Gun Smuggler ───────────────────────────────────────────────────────
  "rogue:gun-smuggler:hidden-gun:1": {
    archetypeId: "rogue:gun-smuggler",
    name: "Hidden Gun",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Sleight of Hand bonus scoped to concealing a one-handed firearm specifically; the DC-increase-for-opponents'-Perception half is opponent-facing, no PC target either way",
  },
  "rogue:gun-smuggler:secret-sidearm:1": {
    archetypeId: "rogue:gun-smuggler",
    name: "Secret Sidearm",
    level: 1,
    bucket: "subsystem",
    note: "grants a battered gun + Gunsmithing — equipment/feat grant, no flat number",
  },
  "rogue:gun-smuggler:selective-targeting:1": {
    archetypeId: "rogue:gun-smuggler",
    name: "Selective Targeting",
    level: 1,
    bucket: "subsystem",
    note: "changes sneak attack die SIZE (d4 vs d6) for non-signature weapons — no engine target for sneak attack die size (same gap as Knife Master's Sneak Stab)",
  },
  "rogue:gun-smuggler:weapon-and-armor-proficiency:1": {
    archetypeId: "rogue:gun-smuggler",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "rogue:gun-smuggler:stolen-shots:3": {
    archetypeId: "rogue:gun-smuggler",
    name: "Stolen Shots",
    level: 3,
    bucket: "subsystem",
    note: "a daily ammunition-resource mechanic — no Change-shaped number",
  },
  "rogue:gun-smuggler:uncanny-aim:4": {
    archetypeId: "rogue:gun-smuggler",
    name: "Uncanny Aim",
    level: 4,
    bucket: "subsystem",
    note: "range-increment increase + a damage-die-step increase for specific pistols — no engine target for either",
  },

  // ── Heister ────────────────────────────────────────────────────────────
  "rogue:heister:rum-dubber:2": {
    archetypeId: "rogue:heister",
    name: "Rum Dubber",
    level: 2,
    bucket: "subsystem",
    note: "changes a lock-DC-without-tools penalty from -10 to -2 — no target for a scoped DC-penalty change",
  },
  "rogue:heister:ferret-s-grace:4": {
    archetypeId: "rogue:heister",
    name: "Ferret's Grace",
    level: 4,
    bucket: "subsystem",
    note: "grants Stealthy + squeezing-size/DC rules — no flat number",
  },
  "rogue:heister:unseen:8": {
    archetypeId: "rogue:heister",
    name: "Unseen",
    level: 8,
    bucket: "subsystem",
    note: "Stealth-while-observed permission + a duplicated rogue talent grant — no flat bonus",
  },

  // ── Investigator ───────────────────────────────────────────────────────
  "rogue:investigator:follow-up:1": {
    archetypeId: "rogue:investigator",
    name: "Follow Up",
    level: 1,
    bucket: "subsystem",
    note: "roll-twice-and-keep-both-results mechanic for gather-information Diplomacy — not a flat additive bonus",
  },

  // ── Kintargo Rebel ─────────────────────────────────────────────────────
  "rogue:kintargo-rebel:sophisticated-stealth:3": {
    archetypeId: "rogue:kintargo-rebel",
    name: "Sophisticated Stealth",
    level: 3,
    bucket: "numeric",
    note: "the Knowledge (nobility) portion is unconditional and scaling — extracted. The Bluff/Sense Motive portion is scoped to secret-message use and dropped.",
  },
  "rogue:kintargo-rebel:misdirection:4": {
    archetypeId: "rogue:kintargo-rebel",
    name: "Misdirection",
    level: 4,
    bucket: "subsystem",
    note: "self-only misdirection spell-like ability — resource-gated",
  },

  // ── Kitsune Trickster ──────────────────────────────────────────────────
  "rogue:kitsune-trickster:kitsune-s-guile:1": {
    archetypeId: "rogue:kitsune-trickster",
    name: "Kitsune's Guile",
    level: 1,
    bucket: "numeric",
    note: "unconditional Int-modifier bonus across Bluff/Diplomacy/Disguise/Sense Motive — extracted",
  },
  "rogue:kitsune-trickster:kitsune-s-charm:3": {
    archetypeId: "rogue:kitsune-trickster",
    name: "Kitsune's Charm",
    level: 3,
    bucket: "subsystem",
    note: "charm person spell-like ability — resource-gated",
  },

  // ── Knife Master ───────────────────────────────────────────────────────
  "rogue:knife-master:hidden-blade:1": {
    archetypeId: "rogue:knife-master",
    name: "Hidden Blade",
    level: 1,
    bucket: "numeric",
    note: "already covered by the hand-verified table (archetype-effects.ts, issue #7) — not duplicated here per the pipeline's precedence rule",
  },
  "rogue:knife-master:sneak-stab:1": {
    archetypeId: "rogue:knife-master",
    name: "Sneak Stab",
    level: 1,
    bucket: "subsystem",
    note: "upsizes sneak attack die TYPE for a named weapon list (and downsizes for all others) — no engine target for sneak attack die size; already audited in IMPLEMENTATION_PLAN.md's archetype round-2 notes",
  },
  "rogue:knife-master:blade-sense:3": {
    archetypeId: "rogue:knife-master",
    name: "Blade Sense",
    level: 3,
    bucket: "situational",
    note: "dodge AC bonus that only applies against attacks made WITH light blades — depends on the attacker's own weapon, which the static sheet can't know; already audited in IMPLEMENTATION_PLAN.md's archetype round-2 notes",
  },

  // ── Makeshift Scrapper ─────────────────────────────────────────────────
  "rogue:makeshift-scrapper:improvised-weapons:1": {
    archetypeId: "rogue:makeshift-scrapper",
    name: "Improvised Weapons",
    level: 1,
    bucket: "subsystem",
    note: "grants Catch Off-Guard + Throw Anything as bonus feats",
  },
  "rogue:makeshift-scrapper:weapon-and-armor-proficiency:1": {
    archetypeId: "rogue:makeshift-scrapper",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "rogue:makeshift-scrapper:supernatural-improvisation:3": {
    archetypeId: "rogue:makeshift-scrapper",
    name: "Supernatural Improvisation",
    level: 3,
    bucket: "subsystem",
    note: "a per-day resource pool granting a swift-action, alternating enhancement/shield buff — activated/resource-gated",
  },
  "rogue:makeshift-scrapper:improvised-weapon-mastery:12": {
    archetypeId: "rogue:makeshift-scrapper",
    name: "Improvised Weapon Mastery",
    level: 12,
    bucket: "subsystem",
    note: "grants Improvised Weapon Mastery as a bonus feat (talent-slot substitution)",
  },

  // ── Master of Disguise ─────────────────────────────────────────────────
  "rogue:master-of-disguise:consummate-actor:1": {
    archetypeId: "rogue:master-of-disguise",
    name: "Consummate Actor",
    level: 1,
    bucket: "numeric",
    note: "the Disguise portion is unconditional — extracted. The Bluff-to-stay-in-character portion is scoped and dropped.",
  },
  "rogue:master-of-disguise:grandmaster-of-disguise:10": {
    archetypeId: "rogue:master-of-disguise",
    name: "Grandmaster of Disguise",
    level: 10,
    bucket: "subsystem",
    note: "an unlimited-use advanced rogue talent grant — talent-list, out of scope",
  },

  // ── Nameless Shadow ────────────────────────────────────────────────────
  "rogue:nameless-shadow:harmless-guise:1": {
    archetypeId: "rogue:nameless-shadow",
    name: "Harmless Guise",
    level: 1,
    bucket: "subsystem",
    note: "vigilante-identity subsystem + a conditional AC penalty imposed on a TARGET — not a bonus to the character's own sheet",
  },
  "rogue:nameless-shadow:face-in-the-crowd:4": {
    archetypeId: "rogue:nameless-shadow",
    name: "Face in the Crowd",
    level: 4,
    bucket: "subsystem",
    note: "lets Bluff/Disguise substitute for Stealth in a crowd — a roll-substitution mechanic, not an additive bonus",
  },

  // ── Needler ────────────────────────────────────────────────────────────
  "rogue:needler:adroit-poisoner:2": {
    archetypeId: "rogue:needler",
    name: "Adroit Poisoner",
    level: 2,
    bucket: "numeric",
    note: "the base unconditional Sleight of Hand bonus is extracted; the further +2 rider while drawing a poisoned weapon is scoped and dropped",
  },
  "rogue:needler:subtle-poisoning:4": {
    archetypeId: "rogue:needler",
    name: "Subtle Poisoning",
    level: 4,
    bucket: "subsystem",
    note: "changes poison-application timing + reduces the POISON's own save DC by 1 — targets the poison, not the character's own defenses",
  },
  "rogue:needler:needle-poisoner:6": {
    archetypeId: "rogue:needler",
    name: "Needle Poisoner",
    level: 6,
    bucket: "subsystem",
    note: "swift-action poison application — an action-economy change, no number",
  },
  "rogue:needler:concealed-delivery:8": {
    archetypeId: "rogue:needler",
    name: "Concealed Delivery",
    level: 8,
    bucket: "subsystem",
    note: "a Sleight-of-Hand-vs-Perception poison-delivery mechanic — not a bonus",
  },

  // ── Numerian Scavenger ─────────────────────────────────────────────────
  "rogue:numerian-scavenger:technic-training:1": {
    archetypeId: "rogue:numerian-scavenger",
    name: "Technic Training",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) Perception/Disable Device bonus scoped to mechanical/high-tech traps specifically — not general Perception/DD",
  },
  "rogue:numerian-scavenger:lucky-glitch:4": {
    archetypeId: "rogue:numerian-scavenger",
    name: "Lucky Glitch",
    level: 4,
    bucket: "subsystem",
    note: "roll-twice-and-choose for a glitch table, plus a flat bonus on that specific roll only — the roll it modifies isn't a modeled Change target",
  },
  "rogue:numerian-scavenger:robot-slayer:8": {
    archetypeId: "rogue:numerian-scavenger",
    name: "Robot Slayer",
    level: 8,
    bucket: "situational",
    note: "ignores a robot's hardness on sneak attack damage — a hardness-bypass scoped to one creature type, no target",
  },

  // ── Okeno Liberator ────────────────────────────────────────────────────
  "rogue:okeno-liberator:bond-breaker:1": {
    archetypeId: "rogue:okeno-liberator",
    name: "Bond Breaker",
    level: 1,
    bucket: "numeric",
    note: "the Escape Artist portion is unconditional — extracted. The no-penalty-for-improvised-DD-tools half removes a penalty the engine never modeled, so there's nothing to add there.",
  },
  "rogue:okeno-liberator:covert-commander:3": {
    archetypeId: "rogue:okeno-liberator",
    name: "Covert Commander",
    level: 3,
    bucket: "subsystem",
    note: "grants a competence bonus to ALLIES' Disguise/Stealth checks — no target for a bonus applied to another creature",
  },
  "rogue:okeno-liberator:catch-off-guard:4": {
    archetypeId: "rogue:okeno-liberator",
    name: "Catch Off-Guard",
    level: 4,
    bucket: "subsystem",
    note: "grants Catch Off-Guard as a bonus feat",
  },

  // ── Phantom Thief ──────────────────────────────────────────────────────
  "rogue:phantom-thief:refined-education:1": {
    archetypeId: "rogue:phantom-thief",
    name: "Refined Education",
    level: 1,
    bucket: "subsystem",
    note: "adds class skills + a per-skill half-level bonus on PLAYER-CHOSEN skills — choice-bearing, same posture as rogue talents",
  },
  "rogue:phantom-thief:broad-education:2": {
    archetypeId: "rogue:phantom-thief",
    name: "Broad Education",
    level: 2,
    bucket: "subsystem",
    note: "expands which rogue talents/feats are selectable — talent-list change, out of scope",
  },
  "rogue:phantom-thief:social-sense:3": {
    archetypeId: "rogue:phantom-thief",
    name: "Social Sense",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Sense Motive/Bluff/initiative bonuses all scoped to the surprise-round context specifically",
  },
  "rogue:phantom-thief:master-of-all:20": {
    archetypeId: "rogue:phantom-thief",
    name: "Master of All",
    level: 20,
    bucket: "subsystem",
    note: "a once-per-minute reroll on trained class-skill checks — not a flat bonus",
  },

  // ── Pirate ─────────────────────────────────────────────────────────────
  "rogue:pirate:sea-legs:1": {
    archetypeId: "rogue:pirate",
    name: "Sea Legs",
    level: 1,
    bucket: "subsystem",
    note: "grants the Sea Legs feat as a bonus feat",
  },
  "rogue:pirate:swinging-reposition:2": {
    archetypeId: "rogue:pirate",
    name: "Swinging Reposition",
    level: 2,
    bucket: "subsystem",
    note: "a positional/movement rule while charging or bull-rushing near ship structures — no Change-shaped number",
  },
  "rogue:pirate:unflinching:3": {
    archetypeId: "rogue:pirate",
    name: "Unflinching",
    level: 3,
    bucket: "situational",
    note: "+1/3-level save bonus scoped to fear AND mind-affecting effects specifically — no matching target (would over-apply as a blanket Will bonus)",
  },

  // ── Planar Sneak ───────────────────────────────────────────────────────
  "rogue:planar-sneak:planar-sense:3": {
    archetypeId: "rogue:planar-sneak",
    name: "Planar Sense",
    level: 3,
    bucket: "situational",
    note: "+1/3-level save bonus scoped to eight specific descriptors (air/chaos/earth/evil/fire/good/law/water) — no matching target",
  },
  "rogue:planar-sneak:elemental-execution:4": {
    archetypeId: "rogue:planar-sneak",
    name: "Elemental Execution",
    level: 4,
    bucket: "subsystem",
    note: "lets sneak attack (at half damage) and crits apply to elemental/outsider creatures normally immune — a targeting-rule change, not a flat number",
  },

  // ── Poisoner ───────────────────────────────────────────────────────────
  "rogue:poisoner:poison-use:1": {
    archetypeId: "rogue:poisoner",
    name: "Poison Use",
    level: 1,
    bucket: "subsystem",
    note: "removes a self-poisoning risk the engine never modeled — nothing to remove",
  },
  "rogue:poisoner:master-poisoner:3": {
    archetypeId: "rogue:poisoner",
    name: "Master Poisoner",
    level: 3,
    bucket: "situational",
    note: "+1/2-level Craft (alchemy) bonus scoped to working with poison specifically — narrower than the whole Craft (alchemy) subskill (contrast this table's own Underground Chemist entry)",
  },

  // ── Rake ───────────────────────────────────────────────────────────────
  "rogue:rake:bravado-s-blade:1": {
    archetypeId: "rogue:rake",
    name: "Bravado's Blade",
    level: 1,
    bucket: "subsystem",
    note: "forgoes sneak attack dice for a free Intimidate check with a scaling circumstance bonus — a resource-trade action, not an always-on Change",
  },
  "rogue:rake:rake-s-smile:3": {
    archetypeId: "rogue:rake",
    name: "Rake's Smile",
    level: 3,
    bucket: "numeric",
    note: "unconditional morale bonus on Bluff and Diplomacy — extracted",
  },

  // ── Relic Raider ───────────────────────────────────────────────────────
  "rogue:relic-raider:curse-sense:4": {
    archetypeId: "rogue:relic-raider",
    name: "Curse Sense",
    level: 4,
    bucket: "situational",
    note: "every component (Perception-vs-haunts, Spellcraft-vs-cursed-items, saves-vs-curses/haunts, dodge-AC-vs-haunt-attacks) is scoped to curses/haunts specifically",
  },
  "rogue:relic-raider:disable-curse:8": {
    archetypeId: "rogue:relic-raider",
    name: "Disable Curse",
    level: 8,
    bucket: "subsystem",
    note: "a Disable-Device-in-place-of-remove-curse mechanic with its own uses/day — an action-substitution, not a bonus",
  },

  // ── River Rat ──────────────────────────────────────────────────────────
  "rogue:river-rat:swamper:1": {
    archetypeId: "rogue:river-rat",
    name: "Swamper",
    level: 1,
    bucket: "numeric",
    note: "the Swim bonus is gated on light/no armor (@armor.type-checkable) — extracted, medium confidence since the further light-load condition can't be checked and is dropped. The bog/undergrowth terrain-movement rules have no target.",
  },
  "rogue:river-rat:rat-s-resilience:3": {
    archetypeId: "rogue:river-rat",
    name: "Rat's Resilience",
    level: 3,
    bucket: "situational",
    note: "+1/3-level save bonus scoped to disease AND poison effects specifically — no matching target",
  },

  // ── Roof Runner ────────────────────────────────────────────────────────
  "rogue:roof-runner:roof-running:1": {
    archetypeId: "rogue:roof-runner",
    name: "Roof Running",
    level: 1,
    bucket: "subsystem",
    note: "removes rooftop movement/Reflex-save penalties while lightly armored — no engine-modeled penalty exists to remove",
  },
  "rogue:roof-runner:tumbling-descent:2": {
    archetypeId: "rogue:roof-runner",
    name: "Tumbling Descent",
    level: 2,
    bucket: "subsystem",
    note: "an Acrobatics-based descent mechanic with its own DC — not a bonus to a check",
  },

  // ── Rotdrinker ─────────────────────────────────────────────────────────
  "rogue:rotdrinker:poison-resistance:2": {
    archetypeId: "rogue:rotdrinker",
    name: "Poison Resistance",
    level: 2,
    bucket: "situational",
    note: "+2/+4 save bonus scoped to poison specifically — no matching target (would over-apply as a blanket Fortitude bonus)",
  },
  "rogue:rotdrinker:unnatural-ingestion:4": {
    archetypeId: "rogue:rotdrinker",
    name: "Unnatural Ingestion",
    level: 4,
    bucket: "subsystem",
    note: "poison immunity + temporary-HP-on-ingestion + poison-type-dependent buffs — resource/condition-gated, no baseline number",
  },

  // ── Sanctified Rogue ───────────────────────────────────────────────────
  "rogue:sanctified-rogue:divine-purpose:4": {
    archetypeId: "rogue:sanctified-rogue",
    name: "Divine Purpose",
    level: 4,
    bucket: "numeric",
    note: "unconditional flat sacred bonus on Fortitude and Will — extracted",
  },
  "rogue:sanctified-rogue:divine-epiphany:8": {
    archetypeId: "rogue:sanctified-rogue",
    name: "Divine Epiphany",
    level: 8,
    bucket: "subsystem",
    note: "an augury-equivalent spell-like ability — resource-gated",
  },

  // ── Sapper ─────────────────────────────────────────────────────────────
  "rogue:sapper:destructive-dismantle:1": {
    archetypeId: "rogue:sapper",
    name: "Destructive Dismantle",
    level: 1,
    bucket: "subsystem",
    note: "a once-daily object-damage ability with prep time — not a PC-facing bonus",
  },
  "rogue:sapper:sapping:2": {
    archetypeId: "rogue:sapper",
    name: "Sapping",
    level: 2,
    bucket: "situational",
    note: "+4 Perception/Disable Device (find/disarm traps) and +4 aid-another-for-Strength — both scoped to specific uses",
  },
  "rogue:sapper:fence:4": {
    archetypeId: "rogue:sapper",
    name: "Fence",
    level: 4,
    bucket: "subsystem",
    note: "a downtime gold-generation mechanic — no Change-shaped number",
  },

  // ── Scout ──────────────────────────────────────────────────────────────
  "rogue:scout:scout-s-charge:4": {
    archetypeId: "rogue:scout",
    name: "Scout's Charge",
    level: 4,
    bucket: "situational",
    note: "already covered by the hand-verified table (archetype-effects.ts, issue #7) — not duplicated here per the pipeline's precedence rule",
  },
  "rogue:scout:skirmisher:8": {
    archetypeId: "rogue:scout",
    name: "Skirmisher",
    level: 8,
    bucket: "situational",
    note: "same shape as Scout's Charge (sneak attack as if flat-footed on a specific action) — action-scoped, not modeled; noted here since only Scout's Charge is in the hand-verified table",
  },

  // ── Scroll Scoundrel ───────────────────────────────────────────────────
  "rogue:scroll-scoundrel:fast-talker:2": {
    archetypeId: "rogue:scroll-scoundrel",
    name: "Fast Talker",
    level: 2,
    bucket: "subsystem",
    note: "reduces an unlikely-Bluff penalty by 5 (no target for a scoped penalty reduction) + grants +3 competence on one specific Diplomacy use (scoped, dropped)",
  },
  "rogue:scroll-scoundrel:adaptive-learning:3": {
    archetypeId: "rogue:scroll-scoundrel",
    name: "Adaptive Learning",
    level: 3,
    bucket: "situational",
    note: "+1/3-level save bonus scoped to abilities/spells already saved against in the past minute — no matching target",
  },
  "rogue:scroll-scoundrel:pay-it-back:4": {
    archetypeId: "rogue:scroll-scoundrel",
    name: "Pay it Back",
    level: 4,
    bucket: "situational",
    note: "attack/damage bonus conditional on the target having attacked him last round — matches Cad's Payback precedent in the fighter hand-verified table",
  },
  "rogue:scroll-scoundrel:elusive-gambit:6": {
    archetypeId: "rogue:scroll-scoundrel",
    name: "Elusive Gambit",
    level: 6,
    bucket: "subsystem",
    note: "conditional flat-footed rider off a missed attack of opportunity — action/condition-scoped, no flat number",
  },
  "rogue:scroll-scoundrel:spot-weakness:10": {
    archetypeId: "rogue:scroll-scoundrel",
    name: "Spot Weakness",
    level: 10,
    bucket: "subsystem",
    note: "DR/hardness-bypass amount on the next hit — a per-attack activated ability, not an always-on Change",
  },

  // ── Sczarni Swindler ───────────────────────────────────────────────────
  "rogue:sczarni-swindler:let-fate-decide:1": {
    archetypeId: "rogue:sczarni-swindler",
    name: "Let Fate Decide",
    level: 1,
    bucket: "subsystem",
    note: "a random-selection action-declaration mechanic with a conditional luck bonus whose TARGET varies per use (attack/skill/ability/save) — a fixed-target Change can't express this",
  },
  "rogue:sczarni-swindler:quicker-than-the-eye:2": {
    archetypeId: "rogue:sczarni-swindler",
    name: "Quicker Than the Eye",
    level: 2,
    bucket: "subsystem",
    note: "reduces an OPPONENT's Perception DC + a Sleight-of-Hand action-economy penalty — not a bonus to the swindler's own checks",
  },
  "rogue:sczarni-swindler:poker-face:3": {
    archetypeId: "rogue:sczarni-swindler",
    name: "Poker Face",
    level: 3,
    bucket: "numeric",
    note: "unconditional bonus on Bluff/Profession (gambler)/Sense Motive — extracted (the non-humanoid-feint rider is dropped)",
  },
  "rogue:sczarni-swindler:no-fool:4": {
    archetypeId: "rogue:sczarni-swindler",
    name: "No Fool",
    level: 4,
    bucket: "numeric",
    note: "unconditional, capped Will save bonus — extracted",
  },
  "rogue:sczarni-swindler:cheat-fate:8": {
    archetypeId: "rogue:sczarni-swindler",
    name: "Cheat Fate",
    level: 8,
    bucket: "subsystem",
    note: "a once/day (scaling) reroll — not a flat bonus",
  },

  // ── Seeker of the Lost ─────────────────────────────────────────────────
  "rogue:seeker-of-the-lost:arcana-breaker:2": {
    archetypeId: "rogue:seeker-of-the-lost",
    name: "Arcana Breaker",
    level: 2,
    bucket: "situational",
    note:
      "+1/3-level Perception/Disable Device bonus scoped to MAGICAL traps specifically — narrower than the whole skill. Data note: the feature id's own level suffix (2) doesn't match its prose " +
      "('At 3rd level...') — issue #47 fixed the actual gating level to 3 via `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL` in `packages/data-pipeline/src/supplements.ts` (id/uuid intentionally left as-is; see that map's doc comment). This bucket's classification is unaffected either way (no Change extracted).",
  },
  "rogue:seeker-of-the-lost:underwater-striker:4": {
    archetypeId: "rogue:seeker-of-the-lost",
    name: "Underwater Striker",
    level: 4,
    bucket: "subsystem",
    note: "removes underwater sneak-attack damage halving + ignores construct hardness on sneak attack — both condition-scoped rule changes, no flat number",
  },
  "rogue:seeker-of-the-lost:wary-disarm:8": {
    archetypeId: "rogue:seeker-of-the-lost",
    name: "Wary Disarm",
    level: 8,
    bucket: "subsystem",
    note: "raises the trap-triggering failure threshold on Disable Device — no target for a scoped threshold change",
  },

  // ── Shadow Scion ───────────────────────────────────────────────────────
  "rogue:shadow-scion:shadow-dweller:1": {
    archetypeId: "rogue:shadow-scion",
    name: "Shadow Dweller",
    level: 1,
    bucket: "situational",
    note: "the Stealth bonus is scoped to dim light/darkness (no lighting roll data); the darkvision-range grant has no safely-extractable target",
  },
  "rogue:shadow-scion:shadow-strike:2": {
    archetypeId: "rogue:shadow-scion",
    name: "Shadow Strike",
    level: 2,
    bucket: "subsystem",
    note: "grants Shadow Strike (or Blind-Fight for the unchained rogue) as a bonus feat",
  },
  "rogue:shadow-scion:shadow-step:8": {
    archetypeId: "rogue:shadow-scion",
    name: "Shadow Step",
    level: 8,
    bucket: "subsystem",
    note: "a per-day Shadow-Plane teleport-equivalent movement ability — resource-gated",
  },
  "rogue:shadow-scion:shadow-speaker:14": {
    archetypeId: "rogue:shadow-scion",
    name: "Shadow Speaker",
    level: 14,
    bucket: "subsystem",
    note: "a commune-with-nature-equivalent spell-like ability — resource-gated",
  },
  "rogue:shadow-scion:shadow-master:20": {
    archetypeId: "rogue:shadow-scion",
    name: "Shadow Master",
    level: 20,
    bucket: "situational",
    note: "DR 10/cold iron + a luck save bonus, but BOTH are gated on being in an area of dim light — a lighting condition the engine has no roll data for",
  },

  // ── Shadow Walker ──────────────────────────────────────────────────────
  "rogue:shadow-walker:expanded-sight:1": {
    archetypeId: "rogue:shadow-walker",
    name: "Expanded Sight",
    level: 1,
    bucket: "subsystem",
    note: "darkvision range grant — no safely-extractable target (see Shadow Dweller's note above)",
  },
  "rogue:shadow-walker:illumination-control:3": {
    archetypeId: "rogue:shadow-walker",
    name: "Illumination Control",
    level: 3,
    bucket: "subsystem",
    note: "a point pool spent on light-related spell-like abilities — resource-gated",
  },
  "rogue:shadow-walker:favored-illumination:4": {
    archetypeId: "rogue:shadow-walker",
    name: "Favored Illumination",
    level: 4,
    bucket: "situational",
    note: "+2(+) initiative/Acrobatics/Perception/Sleight of Hand bonus scoped to a player-chosen illumination level being currently active — a lighting condition the engine has no roll data for",
  },

  // ── Sharper ────────────────────────────────────────────────────────────
  "rogue:sharper:scam-artist:1": {
    archetypeId: "rogue:sharper",
    name: "Scam Artist",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) bonus on all Bluff and Sleight of Hand checks — extracted",
  },
  "rogue:sharper:sticky-fingers:2": {
    archetypeId: "rogue:sharper",
    name: "Sticky Fingers",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved/Greater/Quick Steal as bonus feats across levels",
  },
  "rogue:sharper:lucky-save:3": {
    archetypeId: "rogue:sharper",
    name: "Lucky Save",
    level: 3,
    bucket: "numeric",
    note: "unconditional luck bonus on ALL saving throws — extracted",
  },
  "rogue:sharper:audacious-overconfidence:4": {
    archetypeId: "rogue:sharper",
    name: "Audacious Overconfidence",
    level: 4,
    bucket: "subsystem",
    note: "spends a self-inflicted lucky-save reduction to reroll a failed roll — a resource-trade action, not a flat number",
  },

  // ── Skulking Slayer ────────────────────────────────────────────────────
  "rogue:skulking-slayer:pass-for-human:1": {
    archetypeId: "rogue:skulking-slayer",
    name: "Pass for Human",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Disguise bonus scoped to concealing half-orc heritage specifically — not general Disguise",
  },
  "rogue:skulking-slayer:underhanded-maneuvers:1": {
    archetypeId: "rogue:skulking-slayer",
    name: "Underhanded Maneuvers",
    level: 1,
    bucket: "situational",
    note: "a combat-maneuver-check bonus (equal to sneak attack dice) scoped to the dirty trick/steal maneuvers specifically",
  },
  "rogue:skulking-slayer:weapon-and-armor-proficiency:1": {
    archetypeId: "rogue:skulking-slayer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "rogue:skulking-slayer:bonus-feats:2": {
    archetypeId: "rogue:skulking-slayer",
    name: "Bonus Feats",
    level: 2,
    bucket: "subsystem",
    note: "lets a specific feat be taken in place of a rogue/advanced talent — talent-list substitution, out of scope",
  },
  "rogue:skulking-slayer:bold-strike:3": {
    archetypeId: "rogue:skulking-slayer",
    name: "Bold Strike",
    level: 3,
    bucket: "subsystem",
    note: "upsizes sneak attack die TYPE (d8) on a charging two-handed sneak attack — no engine target for sneak attack die size. Partially replaces Trap Sense, which carries no vendored number to double-count against either way.",
  },
  "rogue:skulking-slayer:shifty:6": {
    archetypeId: "rogue:skulking-slayer",
    name: "Shifty",
    level: 6,
    bucket: "situational",
    note: "+1/2-level Bluff bonus scoped to feinting specifically — not general Bluff",
  },
  "rogue:skulking-slayer:unexpected-charge:9": {
    archetypeId: "rogue:skulking-slayer",
    name: "Unexpected Charge",
    level: 9,
    bucket: "subsystem",
    note: "lets a feint be made as a swift action before a charge — an action-economy change, no number",
  },

  // ── Sly Saboteur ───────────────────────────────────────────────────────
  "rogue:sly-saboteur:scamper:3": {
    archetypeId: "rogue:sly-saboteur",
    name: "Scamper",
    level: 3,
    bucket: "subsystem",
    note: "difficult-terrain movement-rate rule (light/no-armor-gated) — no Change-shaped target for terrain movement rate, same posture as Dawnflower Dervish's Desert Stride (fighter hand-verified table)",
  },
  "rogue:sly-saboteur:catastrophic-failure:4": {
    archetypeId: "rogue:sly-saboteur",
    name: "Catastrophic Failure",
    level: 4,
    bucket: "subsystem",
    note: "a rigged-trap damage rider tied to sneak-attack-dice value — the damage is dealt to whoever triggers the device, not the saboteur's own sheet",
  },
  "rogue:sly-saboteur:disable-magic-device:8": {
    archetypeId: "rogue:sly-saboteur",
    name: "Disable Magic Device",
    level: 8,
    bucket: "subsystem",
    note: "extends Disable Device to suppress/counter magic item effects — an action capability, no flat number",
  },

  // ── Smuggler ───────────────────────────────────────────────────────────
  "rogue:smuggler:conceal-item:1": {
    archetypeId: "rogue:smuggler",
    name: "Conceal Item",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) Sleight of Hand bonus — extracted",
  },
  "rogue:smuggler:distraction:2": {
    archetypeId: "rogue:smuggler",
    name: "Distraction",
    level: 2,
    bucket: "subsystem",
    note: "an opposed Bluff-vs-Perception check to force a re-roll on a searcher — not a bonus to the smuggler's own checks",
  },
  "rogue:smuggler:bribery:3": {
    archetypeId: "rogue:smuggler",
    name: "Bribery",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Diplomacy bonus scoped to bribing customs officials specifically — not general Diplomacy",
  },

  // ── Snare Setter ───────────────────────────────────────────────────────
  "rogue:snare-setter:trapper:1": {
    archetypeId: "rogue:snare-setter",
    name: "Trapper",
    level: 1,
    bucket: "subsystem",
    note: "grants a ranger-trap-equivalent feat/subsystem — out of scope (ranger traps aren't modeled in this engine)",
  },
  "rogue:snare-setter:trapsmithing:1": {
    archetypeId: "rogue:snare-setter",
    name: "Trapsmithing",
    level: 1,
    bucket: "numeric",
    note: "the Craft (traps) portion is unconditional across that subskill — extracted (same posture as Craft (alchemy) elsewhere in this pipeline). The Perception-to-detect-traps portion is scoped and dropped.",
  },
  "rogue:snare-setter:deadly-traps:3": {
    archetypeId: "rogue:snare-setter",
    name: "Deadly Traps",
    level: 3,
    bucket: "subsystem",
    note: "adds scaling bonus damage to a TRAP's own damage roll, not the character's — no PC-facing number",
  },
  "rogue:snare-setter:sneak-attack:5": {
    archetypeId: "rogue:snare-setter",
    name: "Sneak Attack",
    level: 5,
    bucket: "blocked",
    note: BLOCKED_SNEAK_ATTACK_REPRINT,
  },
  "rogue:snare-setter:master-snare-setter:20": {
    archetypeId: "rogue:snare-setter",
    name: "Master Snare Setter",
    level: 20,
    bucket: "subsystem",
    note: "attaches a master-strike-equivalent rider to a trap — no PC-facing number",
  },

  // ── Sniper ─────────────────────────────────────────────────────────────
  "rogue:sniper:accuracy:1": {
    archetypeId: "rogue:sniper",
    name: "Accuracy",
    level: 1,
    bucket: "subsystem",
    note: "halves range-increment penalties for bow/crossbow attacks — no engine target for range increments (same gap as Hawkeye's bow-range half, hand-verified table)",
  },
  "rogue:sniper:deadly-range:3": {
    archetypeId: "rogue:sniper",
    name: "Deadly Range",
    level: 3,
    bucket: "subsystem",
    note: "extends the RANGE at which sneak attack can apply — no engine target for sneak-attack range (same range-modeling gap as Accuracy above)",
  },

  // ── Snoop ──────────────────────────────────────────────────────────────
  "rogue:snoop:inspiration:1": {
    archetypeId: "rogue:snoop",
    name: "Inspiration",
    level: 1,
    bucket: "subsystem",
    note: "an investigator-inspiration-equivalent resource pool usable only on skill checks — activated/resource-gated, no baseline number",
  },
  "rogue:snoop:investigator-talents:2": {
    archetypeId: "rogue:snoop",
    name: "Investigator Talents",
    level: 2,
    bucket: "subsystem",
    note: "substitutes investigator talents for rogue talents — talent-list change, out of scope",
  },
  "rogue:snoop:uncanny-snoop:4": {
    archetypeId: "rogue:snoop",
    name: "Uncanny Snoop",
    level: 4,
    bucket: "situational",
    note: "+2/+4 Intimidate/Bluff/Diplomacy/Sense Motive bonuses all scoped to interrogation-flavored uses specifically — not general skill bonuses",
  },
  "rogue:snoop:master-of-whispers:8": {
    archetypeId: "rogue:snoop",
    name: "Master of Whispers",
    level: 8,
    bucket: "subsystem",
    note: "grants an advanced rogue talent — talent-list, out of scope",
  },

  // ── Survivalist ────────────────────────────────────────────────────────
  "rogue:survivalist:hardy:1": {
    archetypeId: "rogue:survivalist",
    name: "Hardy",
    level: 1,
    bucket: "subsystem",
    note: "extends how long the character can go without food/water before ill effects — no Change-shaped target for consumption thresholds",
  },
  "rogue:survivalist:endure-elements:3": {
    archetypeId: "rogue:survivalist",
    name: "Endure Elements",
    level: 3,
    bucket: "subsystem",
    note: "an endure-elements-equivalent spell-like ability — resource-gated",
  },

  // ── Swamp Poisoner ─────────────────────────────────────────────────────
  "rogue:swamp-poisoner:mucous-membrane:1": {
    archetypeId: "rogue:swamp-poisoner",
    name: "Mucous Membrane",
    level: 1,
    bucket: "numeric",
    note: "the Escape Artist portion is unconditional — extracted. The CMD-vs-grapple portion is scoped to one maneuver and dropped.",
  },
  "rogue:swamp-poisoner:mark-the-vein:2": {
    archetypeId: "rogue:swamp-poisoner",
    name: "Mark the Vein",
    level: 2,
    bucket: "subsystem",
    note: "denies a POISONED TARGET's Dex bonus to AC against this character's attacks — a target-facing debuff, not a bonus to the swamp poisoner's own sheet",
  },
  "rogue:swamp-poisoner:poison-the-well:3": {
    archetypeId: "rogue:swamp-poisoner",
    name: "Poison the Well",
    level: 3,
    bucket: "subsystem",
    note: "a ground-trap creation ability + an extra racial-poison use — no PC-facing flat number",
  },

  // ── Swashbuckler ───────────────────────────────────────────────────────
  "rogue:swashbuckler:martial-training:1": {
    archetypeId: "rogue:swashbuckler",
    name: "Martial Training",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonus martial-weapon proficiency + lets combat trick be taken twice — proficiency/talent grant, no flat number",
  },
  "rogue:swashbuckler:daring:3": {
    archetypeId: "rogue:swashbuckler",
    name: "Daring",
    level: 3,
    bucket: "numeric",
    note: "the Acrobatics portion is unconditional and scaling — extracted. The fear-save portion is scoped to one save category with no matching target.",
  },

  // ── Swordmaster ────────────────────────────────────────────────────────
  "rogue:swordmaster:trance:3": {
    archetypeId: "rogue:swordmaster",
    name: "Trance",
    level: 3,
    bucket: "subsystem",
    note: "grants combat-style-feat-equivalent benefits while in an activated, resource-gated (rounds/day) trance — same 'no generic activated-stance mechanism' gap as ki/grit/panache",
  },

  // ── Sylvan Trickster ───────────────────────────────────────────────────
  "rogue:sylvan-trickster:wild-empathy:1": {
    archetypeId: "rogue:sylvan-trickster",
    name: "Wild Empathy",
    level: 1,
    bucket: "subsystem",
    note: "a druid-wild-empathy-equivalent ability-check mechanic for influencing animals — not a flat bonus to the character's own sheet",
  },
  "rogue:sylvan-trickster:fey-tricks:2": {
    archetypeId: "rogue:sylvan-trickster",
    name: "Fey Tricks",
    level: 2,
    bucket: "subsystem",
    note: "lets witch hexes be taken in place of rogue talents — talent-list substitution, out of scope",
  },
  "rogue:sylvan-trickster:resist-nature-s-lure:4": {
    archetypeId: "rogue:sylvan-trickster",
    name: "Resist Nature's Lure",
    level: 4,
    bucket: "situational",
    note: "a real +4 save bonus (per the druid ability of the same name) but scoped to fey spell-like abilities specifically — no matching target",
  },
  "rogue:sylvan-trickster:fey-resistance:8": {
    archetypeId: "rogue:sylvan-trickster",
    name: "Fey Resistance",
    level: 8,
    bucket: "numeric",
    note: "unconditional, capped DR/cold iron — extracted",
  },

  // ── Thug ───────────────────────────────────────────────────────────────
  "rogue:thug:frightening:1": {
    archetypeId: "rogue:thug",
    name: "Frightening",
    level: 1,
    bucket: "subsystem",
    note: "extends the duration of a condition (shaken/frightened) imposed on a TARGET via Intimidate — not a bonus to the thug's own sheet",
  },
  "rogue:thug:brutal-beating:3": {
    archetypeId: "rogue:thug",
    name: "Brutal Beating",
    level: 3,
    bucket: "subsystem",
    note: "forgoes sneak attack dice for a conditional sickened rider on the target — a resource-trade action, not an always-on Change",
  },

  // ── Tidal Trickster ────────────────────────────────────────────────────
  "rogue:tidal-trickster:wisdom-of-the-waves:1": {
    archetypeId: "rogue:tidal-trickster",
    name: "Wisdom of the Waves",
    level: 1,
    bucket: "numeric",
    note: "the Swim (racial) and Bluff portions are unconditional — extracted. The swim-speed grant and the underwater-Will-save rider have no matching target/are scoped, and are dropped.",
  },
  "rogue:tidal-trickster:liquid-disruption:4": {
    archetypeId: "rogue:tidal-trickster",
    name: "Liquid Disruption",
    level: 4,
    bucket: "subsystem",
    note: "lets sneak attack/crits apply to creature types normally immune to precision damage — a targeting-rule change, not a flat number",
  },
  "rogue:tidal-trickster:tidal-distortion:8": {
    archetypeId: "rogue:tidal-trickster",
    name: "Tidal Distortion",
    level: 8,
    bucket: "subsystem",
    note: "a give-up-an-attack-for-movement-plus-Bluff maneuver underwater — no flat bonus",
  },

  // ── Toxic Talon ────────────────────────────────────────────────────────
  "rogue:toxic-talon:weapon-and-armor-proficiency:1": {
    archetypeId: "rogue:toxic-talon",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },
  "rogue:toxic-talon:poison-adept:3": {
    archetypeId: "rogue:toxic-talon",
    name: "Poison Adept",
    level: 3,
    bucket: "subsystem",
    note: "removes a self-poisoning risk the engine never modeled + lets poison be applied as a move action — no penalty to remove, and an action-economy change",
  },
  "rogue:toxic-talon:catalyst:4": {
    archetypeId: "rogue:toxic-talon",
    name: "Catalyst",
    level: 4,
    bucket: "subsystem",
    note: "raises the save DC of a POISON (the item/effect), not a bonus to the toxic talon's own sheet",
  },
  "rogue:toxic-talon:split-toxin:8": {
    archetypeId: "rogue:toxic-talon",
    name: "Split Toxin",
    level: 8,
    bucket: "subsystem",
    note: "lets one dose of poison envenom two pieces of ammunition — a resource-economy change, no flat number",
  },

  // ── Trapsmith ──────────────────────────────────────────────────────────
  "rogue:trapsmith:careful-disarm:4": {
    archetypeId: "rogue:trapsmith",
    name: "Careful Disarm",
    level: 4,
    bucket: "subsystem",
    note: "trap-triggering-avoidance mechanic referencing the unmodeled Trap Sense bonus — same posture as Burglar's Careful Disarm",
  },
  "rogue:trapsmith:trap-master:8": {
    archetypeId: "rogue:trapsmith",
    name: "Trap Master",
    level: 8,
    bucket: "subsystem",
    note: "bypasses a trap on a lesser margin of success + can modify which creatures a magic trap allows through — action-capability changes, no flat number",
  },

  // ── Underground Chemist ────────────────────────────────────────────────
  "rogue:underground-chemist:chemical-weapons:2": {
    archetypeId: "rogue:underground-chemist",
    name: "Chemical Weapons",
    level: 2,
    bucket: "numeric",
    note: "the Craft (alchemy) portion is unconditional — extracted. The Int-mod-to-splash-damage portion has no target (splash-weapon damage isn't a modeled category).",
  },
  "rogue:underground-chemist:precise-splash-weapons:4": {
    archetypeId: "rogue:underground-chemist",
    name: "Precise Splash Weapons",
    level: 4,
    bucket: "subsystem",
    note: "lets sneak attack apply to splash weapons under specific conditions — action/condition-scoped, no flat number",
  },
  "rogue:underground-chemist:discovery:10": {
    archetypeId: "rogue:underground-chemist",
    name: "Discovery",
    level: 10,
    bucket: "subsystem",
    note: "lets an alchemist discovery be taken in place of a rogue talent — talent-list substitution, out of scope",
  },

  // ── Vexing Dodger ──────────────────────────────────────────────────────
  "rogue:vexing-dodger:limb-climber:1": {
    archetypeId: "rogue:vexing-dodger",
    name: "Limb-Climber",
    level: 1,
    bucket: "subsystem",
    note: "a climb-a-larger-creature mechanic + an attack-roll penalty imposed on the CLIMBED CREATURE — not a bonus to the vexing dodger's own sheet",
  },
  "rogue:vexing-dodger:improved-dirty-trick:2": {
    archetypeId: "rogue:vexing-dodger",
    name: "Improved Dirty Trick",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a bonus feat",
  },
  "rogue:vexing-dodger:underfoot-agility:3": {
    archetypeId: "rogue:vexing-dodger",
    name: "Underfoot Agility",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Acrobatics/Climb/Escape Artist bonus scoped to attempts against creatures at least one size larger — not general use of those skills",
  },
  "rogue:vexing-dodger:underfoot-trickster:4": {
    archetypeId: "rogue:vexing-dodger",
    name: "Underfoot Trickster",
    level: 4,
    bucket: "subsystem",
    note: "a movement-through-larger-creatures permission + a sneak-attack-for-dirty-trick trade — no flat number",
  },
  "rogue:vexing-dodger:distracting-climber:8": {
    archetypeId: "rogue:vexing-dodger",
    name: "Distracting Climber",
    level: 8,
    bucket: "situational",
    note: "a combat-maneuver-check bonus (equal to sneak attack dice) scoped to the dirty trick maneuver specifically, while climbing a creature",
  },

  // ── Waylayer ───────────────────────────────────────────────────────────
  "rogue:waylayer:staggering-reflexes:1": {
    archetypeId: "rogue:waylayer",
    name: "Staggering Reflexes",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) initiative bonus that only applies IF acting in a surprise round — narrower than a general initiative bonus (which would over-apply to ordinary combat)",
  },
  "rogue:waylayer:ambuscading-sneak-attack:4": {
    archetypeId: "rogue:waylayer",
    name: "Ambuscading Sneak Attack",
    level: 4,
    bucket: "subsystem",
    note: "upsizes sneak attack die TYPE (d8) during a surprise-round sneak attack — no engine target for sneak attack die size",
  },
  "rogue:waylayer:danger-awareness:8": {
    archetypeId: "rogue:waylayer",
    name: "Danger Awareness",
    level: 8,
    bucket: "subsystem",
    note: "removes the 'unaware combatant' penalty state in a surprise round — no engine-modeled penalty exists to remove",
  },
  "rogue:waylayer:exceptional-reflexes:12": {
    archetypeId: "rogue:waylayer",
    name: "Exceptional Reflexes",
    level: 12,
    bucket: "subsystem",
    note: "grants movement before acting in a surprise round — an action-economy change, no flat number",
  },
  "rogue:waylayer:masterful-reflexes:20": {
    archetypeId: "rogue:waylayer",
    name: "Masterful Reflexes",
    level: 20,
    bucket: "subsystem",
    note: "forces every initiative roll to a natural 20 — a die-roll override, not an additive Change (no target expresses 'roll is always maximum')",
  },
};

/**
 * Rogue's machine-extracted `Change`-shaped effects (issue #45). 23 entries —
 * every one is either a clean unconditional bonus, an `@armor.type`-gated
 * bonus (same precedent as Savage Barbarian/River Rat's own Swamper here),
 * or a partial extraction of a compound ability where only one component
 * clears the honesty bar (the rest noted in `detail`, per this pipeline's
 * established posture). None of these ride a paired-swap suppression that
 * matters numerically — see this file's header note: every rogue base
 * feature these replace (Trapfinding/Trap Sense/Uncanny Dodge/Evasion)
 * carries an empty vendored `changes[]` and no hand-authored number, so
 * there is nothing to double-count regardless of whether the swap is
 * cleanly paired (levels 3/4/8/10/20) or left ambiguous (levels 1/2).
 */
export const ROGUE_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  "rogue:acrobat:expert-acrobat:1": {
    changes: [
      c("if(eq(@armor.type,0),2,0)", "skill.acr", "competence"),
      c("if(eq(@armor.type,0),2,0)", "skill.fly", "competence"),
    ],
    detail: () =>
      "+2 competence Acrobatics/Fly (unarmored only; no-ACP-in-light-armor half not modeled)",
    confidence: "medium",
    provenance:
      "At 1st level, an acrobat does not suffer any armor check penalties on Acrobatics, Climb, " +
      "Fly, Sleight of Hand, or Stealth skill checks while wearing light armor. When she is not " +
      "wearing armor, she gains a +2 competency bonus on Acrobatics and Fly skill checks. This " +
      "ability replaces trapfinding.",
  },
  "rogue:discretion-specialist:fast-talker:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.dip"),
      c("max(1, floor(@class.unlevel / 2))", "skill.int"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Bluff/Diplomacy/Intimidate`,
    confidence: "high",
    provenance:
      "A discretion specialist adds half her rogue level (minimum +1) as a bonus on Bluff, " +
      "Diplomacy, and Intimidate checks.",
  },
  "rogue:escapologist:elusive:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.dev"),
      c("max(1, floor(@class.unlevel / 2))", "skill.esc"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device/Escape Artist`,
    confidence: "high",
    provenance:
      "An escapologist adds 1/2 her rogue level (minimum +1) as a bonus on all Disable Device " +
      "and Escape Artist checks. This ability replaces trapfinding, but counts as trapfinding " +
      "for the purposes of prerequisites and abilities that require trapfinding.",
  },
  "rogue:filcher:rummage:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.apr")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Appraise`,
    confidence: "high",
    provenance:
      "At 3rd level, a filcher learns how to assess the value of items at the quickest glance... " +
      "She gains a +1 bonus on Appraise checks and an additional +1 bonus every three levels " +
      "thereafter... This ability replaces trap sense +1, +2, +3, +4, +5, and +6.",
  },
  "rogue:kintargo-rebel:sophisticated-stealth:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.kno")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Knowledge (nobility)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a Kintargo rebel gains a +1 bonus on Knowledge (nobility) checks. In " +
      "addition, she gains a +1 bonus on Bluff checks to convey a secret message and on Sense " +
      "Motive checks to discern secret messages. These bonuses increase by 1 every 3 rogue " +
      "levels thereafter. This ability replaces trap sense.",
  },
  "rogue:kitsune-trickster:kitsune-s-guile:1": {
    changes: [
      c("@abilities.int.mod", "skill.blf"),
      c("@abilities.int.mod", "skill.dip"),
      c("@abilities.int.mod", "skill.dis"),
      c("@abilities.int.mod", "skill.sen"),
    ],
    detail: () => "+Int modifier Bluff/Diplomacy/Disguise/Sense Motive",
    confidence: "high",
    provenance:
      "At 1st level, a trickster relies on her intellect as much as her personality. She adds " +
      "her Intelligence modifier on Bluff, Diplomacy, Disguise, and Sense Motive checks. This " +
      "ability replaces trapfinding.",
  },
  "rogue:master-of-disguise:consummate-actor:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dis")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Disguise (Bluff-to-stay-in-character half not modeled)`,
    confidence: "medium",
    provenance:
      "A master of disguise adds half her rogue level (minimum 1) on all Disguise checks and on " +
      "Bluff checks to stay in character while using Disguise.",
  },
  "rogue:needler:adroit-poisoner:2": {
    changes: [c("if(gte(@class.unlevel,8),4,2)", "skill.slt")],
    detail: (level) => `+${level >= 8 ? 4 : 2} Sleight of Hand (poison-draw rider not modeled)`,
    confidence: "medium",
    provenance:
      "At 2nd level, a needler gains a +2 bonus on Sleight of Hand checks. This bonus increases " +
      "to +4 when the needler uses Sleight of Hand to draw a hidden weapon that is coated in " +
      "poison. At 8th level, these bonuses increase to +4 and +6, respectively.",
  },
  "rogue:okeno-liberator:bond-breaker:1": {
    changes: [c("floor(@class.unlevel / 2)", "skill.esc")],
    detail: (level) => `+${Math.floor(level / 2)} Escape Artist`,
    confidence: "high",
    provenance:
      "An Okeno liberator adds 1/2 her class level to Escape Artist checks, and never takes a " +
      "penalty on Disable Device checks when using improvised tools to open locks. This ability " +
      "replaces trapfinding.",
  },
  "rogue:rake:rake-s-smile:3": {
    changes: [
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.blf", "morale"),
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.dip", "morale"),
    ],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} morale Bluff/Diplomacy`,
    confidence: "high",
    provenance:
      "At 3rd level, a rake gains a +1 morale bonus on Bluff and Diplomacy checks. This bonus " +
      "increases by +1 for every 3 levels beyond 3rd. This ability replaces trap sense.",
  },
  "rogue:river-rat:swamper:1": {
    changes: [c("if(lte(@armor.type,1), max(1, floor(@class.unlevel / 2)), 0)", "skill.swm")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Swim (light/no armor only; light-load condition not checked)`,
    confidence: "medium",
    provenance:
      "At 1st level, a river rat gains a bonus equal to half her rogue level on Swim checks " +
      "(minimum +1)... All of these abilities apply only when she is wearing light or no armor " +
      "and carrying no more than a light load.",
  },
  "rogue:sanctified-rogue:divine-purpose:4": {
    changes: [c("1", "fort", "sacred"), c("1", "will", "sacred")],
    detail: () => "+1 sacred Fortitude/Will",
    confidence: "high",
    provenance:
      "At 4th level, the favor of a deity or religious institution grants a special blessing on " +
      "a sanctified rogue, shoring up some of her weaknesses. She gains a +1 sacred bonus on " +
      "Fortitude and Will saving throws. This ability replaces uncanny dodge.",
  },
  "rogue:sczarni-swindler:no-fool:4": {
    changes: [c("min(5, 1 + floor((@class.unlevel - 4) / 4))", "will")],
    detail: (level) => `+${Math.min(5, 1 + Math.floor((level - 4) / 4))} Will`,
    confidence: "high",
    provenance:
      "At 4th level, the Sczarni swindler gains a +1 bonus on Will saving throws. This bonus " +
      "increases by 1 for every 4 levels beyond 4th (to a maximum of +5 at 20th level). This " +
      "ability replaces uncanny dodge.",
  },
  "rogue:sczarni-swindler:poker-face:3": {
    changes: [
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.blf"),
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.pro.gambler"),
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.sen"),
    ],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 3)} Bluff/Profession (gambler)/Sense Motive`,
    confidence: "high",
    provenance:
      "At 3rd level, the Sczarni swindler gains a +1 bonus on Bluff, Profession (gambler), and " +
      "Sense Motive checks. This bonus increases by 1 for every 3 levels beyond 3rd... This " +
      "ability replaces trap sense.",
  },
  "rogue:sharper:lucky-save:3": {
    changes: [
      c("if(gte(@class.unlevel,15),3,if(gte(@class.unlevel,9),2,1))", "allSavingThrows", "luck"),
    ],
    detail: (level) => `+${level >= 15 ? 3 : level >= 9 ? 2 : 1} luck (all saving throws)`,
    confidence: "high",
    provenance:
      "At 3rd level... She gains a +1 luck bonus on all saving throws. This bonus increases to " +
      "+2 at 9th level and to +3 at 15th level.",
  },
  "rogue:sharper:scam-artist:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.slt"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Bluff/Sleight of Hand`,
    confidence: "high",
    provenance:
      "A sharper gains a bonus equal to half her rogue level (minimum +1) on all Bluff and " +
      "Sleight of Hand checks.",
  },
  "rogue:smuggler:conceal-item:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.slt")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Sleight of Hand`,
    confidence: "high",
    provenance:
      "A smuggler adds 1/2 her level on Sleight of Hand checks (minimum +1)... This ability " +
      "replaces trapfinding.",
  },
  "rogue:snare-setter:trapsmithing:1": {
    changes: [c("floor(@class.unlevel / 2)", "skill.crf.traps")],
    detail: (level) =>
      `+${Math.floor(level / 2)} Craft (traps) (Perception-vs-traps half not modeled)`,
    confidence: "medium",
    provenance:
      "A snare setter gains a bonus on Perception skill checks to detect traps and on Craft " +
      "(traps) checks equal to 1/2 his snare setter level.",
  },
  "rogue:swamp-poisoner:mucous-membrane:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.esc")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Escape Artist (grapple-CMD half not modeled)`,
    confidence: "medium",
    provenance:
      "A swamp poisoner gains a bonus equal to half his class level on Escape Artist checks and " +
      "to his CMD when resisting grapple attempts (minimum 1).",
  },
  "rogue:swashbuckler:daring:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.acr", "morale")],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 3)} morale Acrobatics (fear-save half not modeled)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a swashbuckler gains a +1 morale bonus on Acrobatics checks and saving " +
      "throws against fear. This bonus increases by +1 for every 3 levels beyond 3rd. This " +
      "ability replaces trap sense.",
  },
  "rogue:sylvan-trickster:fey-resistance:8": {
    changes: [c("min(10, 2 + 2 * floor((@class.unlevel - 8) / 3))", "dr.cold-iron")],
    detail: (level) => `DR ${Math.min(10, 2 + 2 * Math.floor((level - 8) / 3))}/cold iron`,
    confidence: "high",
    provenance:
      "At 8th level, a sylvan trickster gains DR 2/cold iron. At 11th level and every 3 levels " +
      "thereafter, this damage reduction increases by 2 (to a maximum of DR 10/cold iron at " +
      "20th level).",
  },
  "rogue:tidal-trickster:wisdom-of-the-waves:1": {
    changes: [
      c("4 + floor(@class.unlevel / 2)", "skill.swm", "racial"),
      c("floor(@class.unlevel / 2)", "skill.blf"),
    ],
    detail: (level) =>
      `+${4 + Math.floor(level / 2)} racial Swim / +${Math.floor(level / 2)} Bluff (swim-speed grant + underwater-Will-save rider not modeled)`,
    confidence: "medium",
    provenance:
      "A tidal trickster gains a swim speed... Instead of the +8 bonus granted by a swim speed, " +
      "she gains a racial bonus on Swim checks equal to 4 + half her rogue level (if she has a " +
      "racial swim speed, she uses the better bonus). She gains a bonus on Bluff checks equal to " +
      "half her rogue level.",
  },
  "rogue:underground-chemist:chemical-weapons:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.crf.alchemy")],
    detail: (level) =>
      `+${Math.floor(level / 2)} Craft (alchemy) (Int-to-splash-damage half not modeled)`,
    confidence: "medium",
    provenance:
      "At 2nd level, an underground chemist is able to retrieve an alchemical item as if drawing " +
      "a weapon. She adds her Intelligence modifier to damage dealt with splash weapons, " +
      "including any splash damage. She adds 1/2 her level to Craft (alchemy) checks. This " +
      "ability replaces evasion.",
  },
};
